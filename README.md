# 日報アプリ (Nippo App)

作業日報の入力・管理・集計を行うWebアプリケーションです。Next.js 15 + App Router + Prisma + PostgreSQLで構築されています。

## 🏗️ アーキテクチャ

### データベース構成

#### 開発環境
- **データベース**: [Neon](https://neon.tech/) Free Tier
- **理由**: 
  - マイグレーション練習に最適
  - 月190時間CPU時間、10プロジェクト、3GBストレージの無料枠
  - 開発コストゼロで迅速なプロトタイピングが可能

#### 本番環境  
- **データベース**: AWS RDS PostgreSQL
- **理由**:
  - **輸出管理対応**: 日本国内でのデータ保持・処理が必要な業務要件に対応
  - **安定性**: 本格的な本番運用に適した高可用性とパフォーマンス
  - **セキュリティ**: エンタープライズグレードのセキュリティ機能
  - **AWS エコシステム**: 他のAWSサービスとの統合が容易

### 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **ORM**: Prisma
- **スタイリング**: Tailwind CSS
- **デプロイ**: Vercel
- **メール**: Resend

## 🚀 セットアップ

### 1. リポジトリのクローン

```bash
git clone [repository-url]
cd nippo-app
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local` ファイルを作成し、以下を設定：

```bash
# 開発環境用（Neon）
DATABASE_URL="postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
NODE_ENV=development

# その他の設定
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
FEEDBACK_RECIPIENT_EMAIL=feedback@yourdomain.com
```

### 4. データベースのセットアップ

```bash
# Prismaクライアント生成
npx prisma generate

# データベースにスキーマを適用
npx prisma db push

# シードデータの投入
npm run db:seed
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## 📋 主な機能

- **日報入力**: 作業時間、作業内容、工番などの入力
- **データ管理**: 顧客、機械、工番の管理
- **集計機能**: 期間別、工番別の作業時間・コスト集計
- **レポート出力**: 集計結果の表示・エクスポート
- **フィードバック機能**: ユーザーからの要望・バグ報告

## 🛠️ 開発ルール

本プロジェクトでは以下のルールに従って開発を行います：

- **ブランチ戦略**: `develop` ブランチから機能ブランチを作成し、完了後は `develop` にマージ
- **コミット制限**: 1回のコミット/プッシュは500行以内
- **命名規則**: ブランチ名は英語、ケバブケース使用
- **技術原則**: Next.js 15 + App Router、Server Components 優先

詳細は [開発ルール](./.cursorrules) を参照してください。

## 📚 ドキュメント

- [デプロイメントガイド](./DEPLOYMENT.md) - 環境構築とデプロイ手順
- [AWS設定ガイド](./aws-setup/) - AWS RDS本番環境の構築手順
- [集計機能要件](./docs/AGGREGATION_REQUIREMENTS.md) - 集計機能の詳細仕様
- [作業時間計算仕様](./docs/WORK_TIME_CALCULATION.md) - 時間計算ロジック

## 🔧 利用可能なスクリプト

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# リンター実行
npm run lint

# 型チェック
npm run type-check

# データベース関連
npm run db:generate    # Prismaクライアント生成
npm run db:push       # スキーマをDBに適用
npm run db:seed       # シードデータ投入
npm run db:studio     # Prisma Studio起動

# テスト
npm test
npm run test:coverage # カバレッジ付きテスト
```

## 🚀 デプロイメント

### 開発環境
- **ホスティング**: Vercel
- **データベース**: Neon Free Tier
- **URL**: [開発環境URL]

### 本番環境
- **ホスティング**: Vercel
- **データベース**: AWS RDS PostgreSQL
- **URL**: [本番環境URL]

詳細なデプロイ手順は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

## 🤝 コントリビューション

1. `develop` ブランチから機能ブランチを作成
2. 機能実装・テスト
3. `develop` ブランチにマージリクエスト
4. レビュー後マージ

## 📄 ライセンス

[ライセンス情報をここに記載]

## 📞 サポート

質問や問題がある場合は、以下の方法でお問い合わせください：

- GitHub Issues
- アプリ内フィードバック機能
