# Vercel デプロイメント設定

このプロジェクトは Vercel を使用して Dev、Staging、Production 環境に分けてデプロイされます。

## 環境構成

### 1. Development (開発環境)
- **ブランチ**: `develop`
- **URL**: `https://nippo-app-dev.vercel.app`
- **環境変数**: `NEXT_PUBLIC_ENV=development`

### 2. Staging (ステージング環境)
- **ブランチ**: `staging`
- **URL**: `https://nippo-app-staging.vercel.app`
- **環境変数**: `NEXT_PUBLIC_ENV=staging`

### 3. Production (本番環境)
- **ブランチ**: `main`
- **URL**: `https://nippo-app.vercel.app`
- **環境変数**: `NEXT_PUBLIC_ENV=production`

## デプロイメント手順

### 1. Vercel プロジェクトの作成

1. [Vercel](https://vercel.com) にログイン
2. "New Project" をクリック
3. GitHub リポジトリを選択
4. プロジェクト名を設定:
   - Production: `nippo-app`
   - Staging: `nippo-app-staging`
   - Development: `nippo-app-dev`

### 2. 環境変数の設定

各環境で以下の環境変数を設定:

```bash
NEXT_PUBLIC_ENV=development  # または staging, production
```

### 3. ブランチ設定

各プロジェクトで以下のブランチ設定を行う:

#### Production プロジェクト
- **Production Branch**: `main`
- **Preview Branches**: なし

#### Staging プロジェクト
- **Production Branch**: `staging`
- **Preview Branches**: `develop`

#### Development プロジェクト
- **Production Branch**: `develop`
- **Preview Branches**: すべてのブランチ

### 4. 自動デプロイメントの設定

#### Git Flow ワークフロー

```bash
# 開発開始
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 開発完了後
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# プルリクエストを作成して develop にマージ
# → Development 環境に自動デプロイ

# ステージング環境へのデプロイ
git checkout staging
git merge develop
git push origin staging
# → Staging 環境に自動デプロイ

# 本番環境へのデプロイ
git checkout main
git merge staging
git push origin main
# → Production 環境に自動デプロイ
```

## 環境別の確認方法

アプリケーションの右上に環境バッジが表示されます:
- **STAGING**: 黄色のバッジ
- **PRODUCTION**: 赤色のバッジ
- **Development**: バッジなし（ローカル開発時）

## トラブルシューティング

### デプロイメントが失敗する場合

1. **ビルドエラーの確認**
   ```bash
   npm run build
   ```

2. **環境変数の確認**
   - Vercel ダッシュボードで環境変数が正しく設定されているか確認

3. **ブランチ設定の確認**
   - 各プロジェクトで正しいブランチが設定されているか確認

### 環境変数の変更

環境変数を変更した場合は、Vercel ダッシュボードで再デプロイが必要です。

## 注意事項

- Staging 環境は本番環境のテスト用です
- Production 環境へのデプロイは慎重に行ってください
- 環境変数は各環境で個別に管理されます 