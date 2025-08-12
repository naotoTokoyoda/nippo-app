# デプロイメントガイド

## データベース戦略

### 開発〜社内検証環境
- **データベース**: Neon Free
- **ORM**: Prisma
- **理由**: マイグレーション練習しやすい、コストゼロに近い

### 小規模本番環境
- **データベース**: Vercel Postgres Hobby/Pro
- **ORM**: Prisma
- **理由**: Vercelと一体で運用が最短、障害対応もシンプル

### 本番成長時
- **オプション1**: Vercel Postgres Pro継続
- **オプション2**: Supabase移行（RLSやストレージも活用）

## 環境別設定

### 1. 開発環境（Neon Free）

```bash
# .env.local
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
NODE_ENV=development
```

### 2. ステージング環境（Neon Free）

```bash
# Vercel Environment Variables
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
NODE_ENV=staging
```

### 3. 本番環境（Vercel Postgres）

```bash
# Vercel Environment Variables
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
NODE_ENV=production
```

## 実務チェックリスト

### ✅ 環境設定
- [ ] `DATABASE_URL` を環境別に分ける（VercelのEnvで dev/stg/prod）
- [ ] 各環境で適切な `NODE_ENV` を設定

### ✅ データベース管理
- [ ] `prisma migrate` でバージョン管理
- [ ] リリース前は `db push` でもOK
- [ ] 週1バックアップ確認（プロバイダ機能＋スナップショット）

### ✅ アプリケーション設定
- [ ] 長期的には集計系を別スキーマ/別DBに分離できる設計
- [ ] APIは Prisma 統一でOK（ベンダーロック回避＆型安全）

## セットアップ手順

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

### 2. 本番環境セットアップ

```bash
# マイグレーション実行
npm run db:migrate

# シードデータを挿入
npm run db:seed
```

## データ移行手順

### 1. 既存データの移行

```bash
# ローカルストレージからデータベースへの移行
# ブラウザのコンソールで実行
import { migrateLocalStorageData } from '@/lib/migration'
await migrateLocalStorageData()
```

### 2. Neon → Vercel Postgres移行

1. Vercel Postgresで新しいデータベースを作成
2. 環境変数の `DATABASE_URL` を更新
3. マイグレーションを実行
4. データの整合性を確認

## バックアップ戦略

### 自動バックアップ
- Neon: 自動バックアップ（7日間）
- Vercel Postgres: 自動バックアップ（7日間）

### 手動バックアップ
```bash
# データベースダンプ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 復元
psql $DATABASE_URL < backup_20241201.sql
```

## 監視とアラート

### 監視項目
- データベース接続状況
- クエリパフォーマンス
- ディスク使用量
- 接続数

### アラート設定
- 接続エラー
- ディスク使用量80%以上
- レスポンス時間3秒以上

## トラブルシューティング

### よくある問題

1. **接続エラー**
   - 環境変数の確認
   - ファイアウォール設定
   - SSL設定

2. **マイグレーションエラー**
   - スキーマの競合確認
   - データの整合性チェック

3. **パフォーマンス問題**
   - インデックスの確認
   - クエリの最適化
   - 接続プールの設定

## 推奨設定

### 迷ったら
**「Neon（開発用）＋ Vercel Postgres（本番）」** が、導入スピード・運用しやすさ・コストのバランス最強です。

### 長期的な設計
- 集計系を別スキーマ/別DBに分離
- 読み取り専用レプリカの活用
- キャッシュ戦略の検討 