# デプロイメントガイド

このドキュメントは日報アプリのデプロイメント手順と運用方法を説明します。
開発時は `.cursorrules` ファイルに定義された開発ルールに従って作業してください。

## データベース戦略

### 開発〜社内検証環境
- **データベース**: Neon Free（月190時間CPU時間、10プロジェクトまで無料）
- **ORM**: Prisma
- **理由**: マイグレーション練習しやすい、コストゼロに近い、Vercel統合が簡単

### 小規模本番環境
- **データベース**: Neon Free（月190時間CPU時間、10プロジェクトまで無料）
- **ORM**: Prisma
- **理由**: Vercelと統合が簡単、Neonの無料枠を活用

### 本番成長時
- **オプション1**: Neon Pro継続（月190時間CPU時間、10プロジェクトまで無料）

## ローカル環境の設定

### 1. Vercelダッシュボードでの設定

1. **Vercelダッシュボードにログイン**
2. **プロジェクトを選択**
3. **「Storage」タブ > 「Connect Database」を選択**
4. **Neonを選択し、「Continue」 > 「Connect」をクリック**

### 2. 環境変数の設定

```bash
# .env.local
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
NODE_ENV=development
```

### 3. データベースの初期化

```bash
# Prismaクライアント生成
npm run db:generate

# データベースにスキーマをプッシュ
npm run db:push

# シードデータを挿入
npm run db:seed
```

## 開発環境セットアップ

### 1. 開発環境セットアップ

```bash
# Prismaクライアント生成
npm run db:generate

# データベースにスキーマをプッシュ
npm run db:push

# シードデータを挿入
npm run db:seed

# Prisma Studioでデータ確認
npm run db:studio
```


## 参考リンク

### 開発ルール・ガイドライン
- [.cursorrules](./.cursorrules) - 開発ルールとコーディング規約
- [Zenn: Next.js 基本原則](https://zenn.dev/search?q=Next.js+%E5%9F%BA%E6%9C%AC%E5%8E%9F%E5%89%87) - 本プロジェクトのベース

### データベース・インフラ
- [Neon公式ドキュメント](https://neon.tech/docs/introduction)
- [Vercel Marketplace - Neon](https://vercel.com/marketplace/neon)
- [Neon（旧Vercel PostgreSQL）の紹介と導入【Next.js】](https://zenn.dev/b13o/articles/tutorial-neon)

### Next.js 技術資料
- [Next.js 15 公式ドキュメント](https://nextjs.org/docs)
- [App Router ガイド](https://nextjs.org/docs/app)
- [Server Components vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering)
- [Data Fetching and Caching](https://nextjs.org/docs/app/building-your-application/data-fetching)