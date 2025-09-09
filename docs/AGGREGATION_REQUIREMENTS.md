# 集計機能 要件定義書

最終更新: 2024年12月

## 📋 概要

日報アプリに集計機能を追加し、Jootoの「集計中」リストにある工番の工数集計・単価計算・請求書作成を行う。

## 🎯 基本方針

- **段階的実装**: モック運用 → API連携
- **集計対象**: Jootoの「集計中」リストの工番のみ
- **ワークフロー**: 集計中（編集可能） → 集計済み（編集ロック）

---

## 🔍 Activity自動判定ロジック

### 判定基準と単価
| Activity | 判定条件 | 原価単価 | 請求単価 |
|----------|----------|----------|----------|
| TRAINEE1 | 作業者名がカタカナ | 11,000円 | 11,000円 |
| INSPECTION | 作業内容に「検品」が含まれる | 11,000円 | 11,000円 |
| M_1052 | 機械名「MILLAC 1052 VII」（完全一致） | 13,000円 | 13,000円 |
| M_SHOMEN | 機械名「正面盤 : Chubu LF 500」（完全一致） | 13,000円 | 13,000円 |
| M_12SHAKU | 機械名「12尺 : 汎用旋盤」（完全一致） | 13,000円 | 13,000円 |
| NORMAL | 上記以外 | 11,000円 | 11,000円 |

### 期区分自動判定
```javascript
// 工番パターンによる期区分判定
if (frontNumber === "5927" && backNumber.includes("J")) {
  return "59期-JFE";
} else if (frontNumber === "5927") {
  return "59期";
} else if (frontNumber === "6028") {
  return "60期"; // 8月以降
}

// 工番の意味
// 59: 市原事業所が59年目
// 27: 千葉事業所が27年目
// 決算期: 7月（8月から新年度）
```

---

## 🖥️ 画面構成

### A. ホーム画面拡張
- ナビゲーションに「集計」メニューを追加

### B. 集計一覧画面 (`/aggregation`)

**表示対象**: `status = "aggregating"`の工番のみ

**フィルタ機能**:
- 期区分（59期 / 59期-JFE / 溶射 等）
- 顧客名
- 検索（工番・案件名）
- 並び替え

**表示項目**:
| 工番 | 顧客 | 案件名 | 累計時間 | 最終更新 | ステータス | アクション |
|------|------|--------|----------|----------|------------|------------|
| 5927-12120 | ○○会社 | △△案件 | 120.5h | 2024/01/15 | 集計中 | 詳細 |

**機能**:
- 行クリックで詳細画面へ遷移
- 手動登録ボタン（Jooto API代替）
- **Jootoと同期ボタン**（Phase 3で実装）
  - 「集計中」リストから新しい工番を取得
  - 管理者権限のみ実行可能
  - 実行結果の表示（成功・失敗・取得件数等）

### C. 工番手動登録画面 (`/aggregation/register`)

**入力項目**:
- 工番（前番）: 例）5927
- 工番（後番）: 例）12120
- 扱い: 任意入力（期区分とは別の分類）
- 作業名称: 案件名
- 数量: 集計に影響しない参考値

### D. 集計詳細画面 (`/aggregation/[workOrderId]`)

**区分別集計表**:
| 区分 | 時間 | 原価単価 | 原価 | 請求単価 | 請求小計 | 調整 |
|------|------|----------|------|----------|----------|------|
| 通常 | 80.5h | 11,000円 | 885,500円 | 11,000円 | 885,500円 | 0円 |
| 1号実習生 | 40.0h | 11,000円 | 440,000円 | 9,000円 | 360,000円 | -80,000円 |
| 1052 | 20.0h | 13,000円 | 260,000円 | 13,000円 | 260,000円 | 0円 |

**下部集計**:
- 原価小計: 1,585,500円
- 請求小計: 1,505,500円  
- 調整計: -80,000円
- **最終請求額: 1,505,500円**

**機能**:
- 請求単価の個別編集（備考付き）
- 調整の追加・編集・履歴表示
- CSV出力
- PDF出力（既存様式準拠）
- **単価確定ボタン** → `status = "aggregated"`に変更

**調整機能**:
- 実習生の時間調整
- 見積もりとの差異調整
- その他の価格調整（理由・備考必須）

---

## 🗄️ データベース設計

### 既存テーブル拡張

**WorkOrder（追加項目）**:
```sql
term         String?     -- 期区分（59期/59期-JFE等）
status       String      @default("aggregating") -- aggregating/aggregated  
project_name String?     -- 作業名称（案件名）
handling     String?     -- 扱い
quantity     Int?        -- 数量
```

**ReportItem（追加項目）**:
```sql
activity String? -- 自動判定されたActivity（NORMAL/TRAINEE1/INSPECTION/M_1052/M_SHOMEN/M_12SHAKU）
```

### 新規テーブル

**Rate（単価履歴管理）**:
```sql
id             String   @id @default(cuid())
activity       String   -- Activity種別
effective_from DateTime -- 適用開始日
effective_to   DateTime? -- 適用終了日（NULLは現在有効）
cost_rate      Int      -- 原価単価
bill_rate      Int      -- 請求単価
created_at     DateTime @default(now())
updated_at     DateTime @updatedAt

@@index([activity, effective_from])
```

**Adjustment（調整履歴）**:
```sql
id            String   @id @default(cuid())
work_order_id String   -- 対象工番
type          String   -- 調整種別（price_adjustment/time_adjustment等）
amount        Int      -- 調整金額
reason        String   -- 調整理由
memo          String?  -- 詳細メモ
created_by    String   -- 作業者ID
created_at    DateTime @default(now())

@@index([work_order_id])
```

**Invoice/InvoiceLine（確定時スナップショット）**:
```sql
-- 将来の拡張用（Phase 2で実装）
```

---

## 🔄 ワークフロー

### 1. 集計開始
- **Phase 1-2**: 手動登録で工番追加
- **Phase 3**: Jooto「集計中」リスト手動同期 → 集計一覧に表示
  - 集計一覧画面の「Jootoと同期」ボタンで実行
  - 新しい工番を自動でWorkOrderテーブルに追加

### 2. 集計作業
- 詳細画面で区分別時間・単価確認
- 必要に応じて請求単価調整
- 調整理由・備考入力

### 3. 確定処理
- 単価確定ボタン → `status = "aggregated"`
- 集計一覧から非表示
- 編集ロック
- （将来）Jooto「集計済み」リストに移動

### 4. 出力
- CSV: 区分別明細
- PDF: 既存様式準拠
- 監査ログ: 変更履歴

---

## 🚀 実装計画

### Phase 1（UI優先・ダミーデータ）
1. ✅ 要件定義書作成
2. データベーススキーマ拡張
3. 集計一覧画面作成
4. 手動登録画面作成
5. 集計詳細画面作成（基本表示）

### Phase 2（機能実装）
6. Activity自動判定ロジック実装
7. 単価計算・調整機能
8. CSV/PDF出力機能
9. ステータス管理

### Phase 3（API連携）
10. Jooto API接続
11. 手動同期機能（集計一覧画面にボタン設置）
12. エラーハンドリング・再試行機能

---

## 📝 技術仕様

### フロントエンド
- Next.js 15 + App Router
- Server Components優先
- Tailwind CSS
- TypeScript + Zod

### バックエンド
- Prisma ORM
- PostgreSQL（Neon）
- Server Actions
- Route Handlers

### 権限管理
- 作業者: 日報入力のみ
- 班長・管理者: 集計・調整・単価確定
- 承認済み日報のみ集計対象

---

## 🔗 関連資料

- [プロジェクト開発ルール](./.cursorrules)
- [デプロイメントガイド](./DEPLOYMENT.md)
- [作業時間計算仕様](./WORK_TIME_CALCULATION.md)

---

*このドキュメントは開発進行に合わせて随時更新されます。*
