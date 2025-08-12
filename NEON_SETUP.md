# Neon セットアップクイックスタートガイド

## 🚀 概要

このガイドでは、[Neon（旧Vercel PostgreSQL）](https://zenn.dev/b13o/articles/tutorial-neon)を使用して日報アプリケーションのデータベースをセットアップします。

> **💡 背景**: Neonは2024年Q4〜2025年Q1にVercel PostgreSQLから独立したサービスです。技術的には同じPostgreSQLエンジンを使用しており、Vercelとの統合も引き続き利用可能です。

## 📋 前提条件

- Vercelアカウント
- GitHubリポジトリがVercelにデプロイ済み
- ローカル開発環境（Node.js、npm）

## 🔧 セットアップ手順

### Step 1: VercelダッシュボードでNeonを接続

1. **Vercelダッシュボードにログイン**
   - https://vercel.com/dashboard

2. **プロジェクトを選択**
   - nippo-appプロジェクトを選択

3. **「Storage」タブに移動**
   - 左サイドバーから「Storage」をクリック

4. **「Connect Database」をクリック**
   - データベース接続画面が表示されます

5. **Neonを選択**
   - 利用可能なデータベースから「Neon」を選択
   - 「Continue」をクリック

6. **接続設定**
   - データベース名を入力（例：`nippo-app-dev`）
   - リージョンを選択（推奨：`N. Virginia (us-east-1)`）
   - 「Connect」をクリック

### Step 2: 環境変数の確認

接続が完了すると、以下の環境変数が自動的に設定されます：

```bash
# Vercelダッシュボードの「Environment Variables」で確認
DATABASE_URL=postgresql://username:password@host:port/database?schema=public
```

### Step 3: ローカル環境の設定

1. **`.env.local`ファイルを作成**
   ```bash
   # プロジェクトルートに.env.localを作成
   touch .env.local
   ```

2. **環境変数を設定**
   ```bash
   # .env.local
   DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
   NODE_ENV=development
   ```

   > **注意**: Vercelダッシュボードの「Environment Variables」から`DATABASE_URL`をコピーしてください。

### Step 4: データベースの初期化

1. **Prismaクライアントを生成**
   ```bash
   npm run db:generate
   ```

2. **スキーマをデータベースにプッシュ**
   ```bash
   npm run db:push
   ```

3. **シードデータを挿入**
   ```bash
   npm run db:seed
   ```

4. **接続をテスト**
   ```bash
   npm run dev
   # http://localhost:3000/database で管理画面を確認
   ```

## 🎯 動作確認

### データベース管理画面の確認

1. アプリケーションを起動
   ```bash
   npm run dev
   ```

2. ブラウザで以下にアクセス
   ```
   http://localhost:3000/database
   ```

3. 以下の項目を確認
   - ✅ データベース接続状態：接続中
   - ✅ 環境情報：development
   - ✅ データ統計：作業者、客先、機械、工番、日報の件数

### APIエンドポイントのテスト

```bash
# ヘルスチェック
curl http://localhost:3000/api/database/health

# 期待されるレスポンス
{
  "success": true,
  "timestamp": "2024-12-01T10:00:00.000Z",
  "environment": {
    "nodeEnv": "development",
    "databaseUrl": "設定済み",
    "isDevelopment": true,
    "isProduction": false
  },
  "database": {
    "connection": {
      "success": true,
      "message": "データベース接続成功"
    },
    "stats": {
      "users": 9,
      "customers": 7,
      "machines": 12,
      "workOrders": 13,
      "reports": 0
    }
  }
}
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. 接続エラー
```
Error: connect ECONNREFUSED
```

**解決方法:**
- 環境変数`DATABASE_URL`が正しく設定されているか確認
- VercelダッシュボードでNeon接続が完了しているか確認
- ファイアウォール設定を確認

#### 2. スキーマエラー
```
Error: relation "users" does not exist
```

**解決方法:**
```bash
# スキーマを再プッシュ
npm run db:push

# または、マイグレーションを実行
npm run db:migrate
```

#### 3. シードエラー
```
Error: duplicate key value violates unique constraint
```

**解決方法:**
```bash
# データベースをリセット（開発環境のみ）
npx prisma db push --force-reset

# シードを再実行
npm run db:seed
```

## 📊 Neonの無料枠について

記事によると、Neonの無料枠は非常に充実しています：

- ✅ **10プロジェクトまで無料**
- ✅ **月190時間のCPU時間**
- ✅ **自動課金なし**（枠を超えると停止）
- ✅ **Supabaseと同等以上の無料枠**

## 🔄 次のステップ

### 1. 本番環境の準備
- Vercel Postgresで本番用データベースを作成
- 環境変数を本番用に設定

### 2. データ移行
- ローカルストレージのデータをデータベースに移行
- 既存データの整合性を確認

### 3. 監視の設定
- データベース接続の監視
- パフォーマンスの監視

## 📚 参考リンク

- [Neon公式ドキュメント](https://neon.tech/docs/introduction)
- [Vercel Marketplace - Neon](https://vercel.com/marketplace/neon)
- [Neon（旧Vercel PostgreSQL）の紹介と導入【Next.js】](https://zenn.dev/b13o/articles/tutorial-neon)
- [Prisma公式ドキュメント](https://www.prisma.io/docs)

## 🎉 完了！

Neonのセットアップが完了したら、以下のコマンドで動作確認を行ってください：

```bash
# 開発サーバー起動
npm run dev

# データベース管理画面にアクセス
# http://localhost:3000/database
```

何か問題が発生した場合は、トラブルシューティングセクションを参照するか、Vercelのサポートに問い合わせてください。
