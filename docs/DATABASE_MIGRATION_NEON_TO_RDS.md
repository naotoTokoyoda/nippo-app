# Neon から Amazon RDS for PostgreSQL 移行ドキュメント

## 📋 プロジェクト概要

### 移行の目的
- **輸出管理対応**: データの完全国内保管（ap-northeast-1: 東京リージョン）
- **企業利用対応**: エンタープライズレベルのセキュリティ・可用性確保
- **コンプライアンス**: 製鉄業における機微技術データの適切な管理

### 現行システム
```
データベース: Neon PostgreSQL（海外データセンター）
制限事項: 
- 5分間のアイドル自動停止
- 無料プランの容量制限
- 輸出管理規制への対応困難
```

### 移行後システム
```
データベース: Amazon RDS for PostgreSQL
リージョン: ap-northeast-1（東京）
特徴:
- 24時間安定稼働
- エンタープライズセキュリティ
- 完全国内データ保管
```

## 🏗️ 移行アーキテクチャ

### 現行構成
```
Next.js App (Vercel) → Neon PostgreSQL (海外DC)
                    ↓
                Prisma ORM
```

### 移行後構成
```
Next.js App → API Gateway → Lambda Functions → RDS Proxy → RDS PostgreSQL
                                                              ↓
VPC (Private Subnet) ← Secrets Manager ← CloudWatch
```

## 📊 技術仕様

### Amazon RDS for PostgreSQL
```yaml
インスタンスクラス: db.t4g.micro
エンジンバージョン: PostgreSQL 15.4
ストレージタイプ: gp3
初期容量: 20GB（自動拡張設定）
Multi-AZ: 将来対応（初期はSingle-AZ）
バックアップ保持期間: 7日間
Point-in-Time Recovery: 有効
Performance Insights: 有効
```

### ネットワーク・セキュリティ
```yaml
VPC設定:
  - Public Subnet × 2（AZ-a, AZ-c）
  - Private Subnet × 2（AZ-a, AZ-c）
  
Security Groups:
  - RDS: Lambda/RDS Proxyからの5432ポートのみ許可
  - RDS Proxy: Lambdaからの5432ポートのみ許可
  
暗号化:
  - 保存時: KMS暗号化
  - 通信時: SSL/TLS必須
  
認証情報管理:
  - AWS Secrets Manager
  - 自動ローテーション設定
```

## 🚀 移行計画

### Phase 1: インフラ準備（1週間）
```
□ AWS CDK/Terraformスクリプト作成
□ VPC・サブネット・セキュリティグループ作成
□ RDS PostgreSQLインスタンス作成
□ RDS Proxy設定
□ Secrets Manager設定
□ CloudWatch監視設定
```

### Phase 2: データ移行（2-3日）
```
□ Neonからデータエクスポート
  - pg_dump --verbose --no-owner --no-privileges
□ RDSへデータインポート
  - psql -h <rds-endpoint> -U <username> -d <database> -f dump.sql
□ データ整合性確認
□ インデックス・制約確認
□ パフォーマンステスト
```

### Phase 3: アプリケーション設定変更（1日）
```
□ DATABASE_URL環境変数更新
□ Prisma設定調整
□ 接続プール設定最適化
□ SSL証明書設定
□ 動作確認テスト
```

### Phase 4: 本格運用開始（1日）
```
□ 本番環境切り替え
□ 監視・アラート確認
□ バックアップ動作確認
□ 運用手順書最終確認
```

## 💾 データ移行手順

### 1. Neonからのデータエクスポート
```bash
# 1. Neon接続情報取得
NEON_CONNECTION_STRING="postgresql://username:password@host/database"

# 2. 全データエクスポート
pg_dump $NEON_CONNECTION_STRING \
  --verbose \
  --no-owner \
  --no-privileges \
  --format=plain \
  --file=neon_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. スキーマのみエクスポート（確認用）
pg_dump $NEON_CONNECTION_STRING \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=neon_schema.sql
```

### 2. RDSへのデータインポート
```bash
# 1. RDS接続情報設定
RDS_ENDPOINT="your-rds-instance.ap-northeast-1.rds.amazonaws.com"
RDS_USERNAME="postgres"
RDS_DATABASE="nippo_app"

# 2. データベース作成
createdb -h $RDS_ENDPOINT -U $RDS_USERNAME $RDS_DATABASE

# 3. データインポート
psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d $RDS_DATABASE -f neon_backup.sql

# 4. 接続テスト
psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d $RDS_DATABASE -c "SELECT version();"
```

### 3. データ整合性確認
```sql
-- レコード数確認
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserted_rows,
  n_tup_upd as updated_rows,
  n_tup_del as deleted_rows
FROM pg_stat_user_tables;

-- 主要テーブルの件数確認
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'work_orders', COUNT(*) FROM work_orders
UNION ALL
SELECT 'reports', COUNT(*) FROM reports
UNION ALL
SELECT 'report_items', COUNT(*) FROM report_items
UNION ALL
SELECT 'adjustments', COUNT(*) FROM adjustments;
```

## ⚙️ アプリケーション設定変更

### 1. 環境変数更新
```bash
# .env.production
DATABASE_URL="postgresql://username:password@your-rds-proxy-endpoint:5432/nippo_app?sslmode=require"

# Prisma設定確認
npx prisma db pull
npx prisma generate
```

### 2. Prisma設定最適化
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  // RDS最適化設定
  binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. 接続プール設定
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## 📊 監視・運用

### CloudWatch監視項目
```yaml
RDS監視:
  - DatabaseConnections（接続数）
  - CPUUtilization（CPU使用率）
  - FreeableMemory（空きメモリ）
  - FreeStorageSpace（空きストレージ）
  - ReadLatency/WriteLatency（レイテンシ）

アラート設定:
  - CPU使用率 > 80%
  - 接続数 > 80%（最大接続数の80%）
  - 空きストレージ < 2GB
  - レイテンシ > 1秒
```

### バックアップ戦略
```yaml
自動バックアップ:
  - 毎日午前3時に実行
  - 保持期間: 7日間
  - Point-in-Time Recovery: 5分間隔

手動スナップショット:
  - 重要な変更前に実行
  - 長期保存用（月次）
  - 本番リリース前必須
```

## 💰 コスト見積もり

### 月額料金（概算）
```
RDS PostgreSQL (db.t4g.micro):
- インスタンス料金: ~¥3,000
- ストレージ料金(20GB): ~¥300
- バックアップストレージ: ~¥200

RDS Proxy:
- 利用料金: ~¥1,000

その他:
- CloudWatch: ~¥500
- Secrets Manager: ~¥500

合計: 約¥5,500/月
```

### Neonとの比較
```
Neon Free: ¥0（制限あり）
Neon Pro: ¥2,500/月
AWS RDS: ¥5,500/月

差額: +¥3,000/月
メリット: 企業対応・コンプライアンス・安定性
```

## ⚠️ リスクと対策

### 移行リスク
```
データ損失リスク:
対策: 移行前の完全バックアップ、段階的移行

ダウンタイム:
対策: メンテナンス時間での実施、Blue-Green移行

パフォーマンス劣化:
対策: 移行前後の性能測定、インデックス最適化

接続エラー:
対策: 接続プール設定、リトライロジック実装
```

### 運用リスク
```
コスト増加:
対策: CloudWatch Cost Explorer監視、適切なインスタンスサイジング

セキュリティ:
対策: Security Group最小権限、定期的なセキュリティ監査

障害対応:
対策: 運用手順書整備、24時間監視体制
```

## 📝 移行チェックリスト

### 移行前確認
```
□ 現行データの完全バックアップ
□ 移行先環境の動作確認
□ 関係者への事前通知
□ ロールバック手順の確認
□ 移行時間の調整
```

### 移行中確認
```
□ データエクスポートの完了
□ データインポートの成功
□ データ整合性の確認
□ アプリケーション動作確認
□ パフォーマンステスト
```

### 移行後確認
```
□ 全機能の動作確認
□ 監視アラートの動作確認
□ バックアップの動作確認
□ ユーザー受け入れテスト
□ 運用手順書の更新
```

## 🔐 セキュリティ・コンプライアンス

### 輸出管理対応
```yaml
データ所在地:
  - 完全国内保管（東京リージョン）
  - 海外への自動レプリケーション無し
  - バックアップも国内のみ

アクセス制御:
  - VPC Private Subnet配置
  - Security Group最小権限
  - IAMロールベース認証

監査ログ:
  - 全データアクセスの記録
  - 変更履歴の完全追跡
  - 定期的な監査レポート
```

### 企業セキュリティ基準
```yaml
暗号化:
  - 保存時: AES-256暗号化
  - 通信時: TLS 1.3
  - バックアップ: 暗号化必須

認証・認可:
  - 多要素認証（MFA）必須
  - 最小権限の原則
  - 定期的なアクセス権見直し

インシデント対応:
  - 24時間監視体制
  - 緊急時連絡網整備
  - インシデント対応手順書
```

## 📞 緊急時連絡先・エスカレーション

### 技術担当
```
システム管理者: [連絡先]
データベース管理者: [連絡先]
アプリケーション開発者: [連絡先]
```

### AWS サポート
```
Business Support以上推奨
24時間技術サポート利用可能
```

## 📚 関連ドキュメント

- [集計機能要件定義](./AGGREGATION_REQUIREMENTS.md)
- [作業時間計算仕様](./WORK_TIME_CALCULATION.md)
- [プロジェクト開発ルール](../.cursorrules)

---

**本ドキュメントは移行プロジェクトの成功を目的として作成されました。実施前に必ず関係者での最終確認を行ってください。**

**作成日**: 2025年8月29日  
**最終更新**: 2025年8月29日  
**バージョン**: 1.0.0
