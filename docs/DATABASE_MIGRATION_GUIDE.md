# データベースマイグレーション運用ガイド

このドキュメントは、developブランチとmainブランチ（本番環境）間でデータベーススキーマ変更を安全に適用するための手順を説明します。

## 📋 目次
1. [基本方針](#基本方針)
2. [開発フロー](#開発フロー)
3. [本番デプロイ前のチェックリスト](#本番デプロイ前のチェックリスト)
4. [本番環境へのマイグレーション手順](#本番環境へのマイグレーション手順)
5. [トラブルシューティング](#トラブルシューティング)
6. [ロールバック手順](#ロールバック手順)

---

## 基本方針

### 環境構成
- **開発環境**: developブランチ + 開発用データベース（Neon Free）
- **本番環境**: mainブランチ + 本番データベース（Neon Production）
- **デプロイ**: Vercel（mainブランチへのプッシュで自動デプロイ）

### マイグレーション戦略
- ✅ developブランチで開発・テスト後、mainブランチにマージ
- ✅ Prisma Migrateを使用してマイグレーション管理
- ✅ ビルド時に自動的に`prisma migrate deploy`を実行
- ✅ 破壊的変更は避け、後方互換性を保つ
- ✅ データバックアップを必ず取る

---

## 開発フロー

### Step 1: 開発ブランチでスキーマ変更

```bash
# 1. developブランチから作業ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/add-new-field

# 2. schema.prismaを編集
# （例: 新しいフィールドを追加）

# 3. マイグレーションファイルを生成
npm run db:migrate
# または
npx prisma migrate dev --name add_new_field

# 4. マイグレーションが正常に適用されることを確認
npm run db:studio  # Prisma Studioでデータ確認
```

### Step 2: 動作確認

```bash
# 1. 開発サーバーを起動
npm run dev

# 2. 以下を確認
# ✅ アプリケーションが正常に起動する
# ✅ 新機能が正常に動作する
# ✅ 既存機能に影響がない
# ✅ マイグレーションファイルが生成されている
```

### Step 3: コミット・マージ

```bash
# 1. マイグレーションファイルも含めてコミット
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat: Add new field to database schema"

# 2. developブランチにマージ
git checkout develop
git merge feature/add-new-field
git push origin develop

# 3. 作業ブランチを削除
git branch -d feature/add-new-field
```

---

## 本番デプロイ前のチェックリスト

### ✅ コード確認
- [ ] `prisma/schema.prisma`の変更内容を確認
- [ ] `prisma/migrations/`に新しいマイグレーションファイルが存在
- [ ] マイグレーションファイルのSQLが正しい
- [ ] 破壊的変更がないことを確認（カラム削除、型変更など）

### ✅ 動作確認
- [ ] 開発環境で正常に動作している
- [ ] マイグレーションが正常に適用されている
- [ ] Lintエラーがない（`npm run lint`）
- [ ] 型チェックが通る（`npm run type-check`）

### ✅ ドキュメント確認
- [ ] 必要に応じて`docs/DATABASE_SCHEMA.md`を更新
- [ ] 重要な変更は`CHANGELOG.md`に記載
- [ ] 破壊的変更がある場合は`MIGRATION.md`を作成

### ✅ バックアップ準備
- [ ] 本番データベースのバックアップを取得（推奨）

```bash
# Prisma経由でのデータエクスポート（オプション）
DATABASE_URL="<本番環境のDATABASE_URL>" npx prisma db pull
```

---

## 本番環境へのマイグレーション手順

### 方法A: 自動デプロイ（推奨）

`package.json`の`build`スクリプトに`prisma migrate deploy`が含まれているため、mainブランチへのプッシュ時に自動的にマイグレーションが適用されます。

```bash
# 1. mainブランチに移動
git checkout main
git pull origin main

# 2. developブランチをマージ
git merge develop

# 3. プッシュ（Vercelが自動デプロイ）
git push origin main

# 4. Vercelのデプロイログを確認
# - ビルドログで「prisma migrate deploy」が実行されることを確認
# - マイグレーションが成功したことを確認
```

### 方法B: 手動デプロイ（緊急時）

デプロイ前に手動でマイグレーションを適用する場合：

```bash
# 1. 本番環境のDATABASE_URLを設定
export DATABASE_URL="<本番環境のDATABASE_URL>"

# 2. マイグレーション状態を確認
npx prisma migrate status

# 3. マイグレーションを適用
npx prisma migrate deploy

# 4. 適用結果を確認
npx prisma migrate status
# → "Database schema is up to date!" と表示されればOK

# 5. mainブランチにプッシュ
git push origin main
```

### デプロイ後の確認

```bash
# 1. 本番環境にアクセス
# https://nippo-app.vercel.app

# 2. 以下を確認
# ✅ アプリケーションが正常に起動する
# ✅ 新機能が正常に動作する
# ✅ 既存機能に影響がない
# ✅ エラーログが出ていない

# 3. Vercelのログを確認
# - Function Logsでエラーがないか確認
# - Build Logsでマイグレーションが成功しているか確認
```

---

## トラブルシューティング

### 問題1: マイグレーションが適用されない

**症状**: `The column "xxx" does not exist in the current database.`

**原因**: 本番環境にマイグレーションが適用されていない

**解決方法**:
```bash
# 1. 本番環境のマイグレーション状態を確認
DATABASE_URL="<本番環境URL>" npx prisma migrate status

# 2. 未適用のマイグレーションがある場合は手動適用
DATABASE_URL="<本番環境URL>" npx prisma migrate deploy
```

### 問題2: マイグレーションが失敗した（カラムが既に存在）

**症状**: `ERROR: column "xxx" already exists`

**原因**: マイグレーションが部分的に適用されている

**解決方法**:
```bash
# 1. データベースの実際の構造を確認
DATABASE_URL="<本番環境URL>" npx prisma db pull --print

# 2. カラムが既に存在する場合は「適用済み」としてマーク
DATABASE_URL="<本番環境URL>" npx prisma migrate resolve --applied <migration_name>

# 3. マイグレーション状態を確認
DATABASE_URL="<本番環境URL>" npx prisma migrate status
```

### 問題3: マイグレーションがロールバックされた

**症状**: マイグレーションが失敗してロールバックされた

**原因**: SQLエラーまたはデータ不整合

**解決方法**:
```bash
# 1. エラーの詳細を確認
DATABASE_URL="<本番環境URL>" npx prisma migrate status

# 2. 失敗したマイグレーションをロールバック済みとしてマーク
DATABASE_URL="<本番環境URL>" npx prisma migrate resolve --rolled-back <migration_name>

# 3. マイグレーションファイルを修正
# - migration.sqlを編集して問題を修正

# 4. 再度マイグレーションを適用
DATABASE_URL="<本番環境URL>" npx prisma migrate deploy
```

### 問題4: 本番環境とスキーマが一致しない

**症状**: Prisma Clientのエラーが発生する

**原因**: Prisma Clientが再生成されていない

**解決方法**:
```bash
# Vercelで自動的に実行されるが、ローカルで確認する場合
DATABASE_URL="<本番環境URL>" npx prisma generate
```

---

## ロールバック手順

### ケース1: マイグレーション直後に問題発覚

```bash
# 1. 前のバージョンにロールバック
git checkout main
git revert HEAD
git push origin main

# 2. データベースのロールバック（必要な場合）
# ⚠️ 注意: データ損失の可能性があります
DATABASE_URL="<本番環境URL>" npx prisma migrate resolve --rolled-back <migration_name>
```

### ケース2: データベースが破損した場合

```bash
# 1. バックアップから復元（Neonダッシュボード）
# - Neonコンソールにログイン
# - Branchesタブから復元ポイントを選択
# - "Restore"をクリック

# 2. マイグレーション履歴をリセット
DATABASE_URL="<本番環境URL>" npx prisma migrate resolve --rolled-back <migration_name>

# 3. アプリケーションを前のバージョンにロールバック
git checkout main
git revert <commit-hash>
git push origin main
```

---

## ベストプラクティス

### ✅ DO（推奨）
- ✅ マイグレーションは小さく、段階的に適用する
- ✅ 後方互換性を保つ（新しいカラムはNULL許可またはデフォルト値を設定）
- ✅ 本番デプロイ前に必ずdevelopブランチでテストする
- ✅ 重要なデータ変更前にバックアップを取る
- ✅ マイグレーションファイルは手動編集しない（必要な場合は新しいマイグレーションを作成）
- ✅ `prisma/migrations/`ディレクトリは必ずGitにコミットする

### ❌ DON'T（非推奨）
- ❌ mainブランチで直接マイグレーションを作成しない
- ❌ マイグレーションファイルを削除しない
- ❌ 本番データベースで`prisma db push`を使用しない（開発専用）
- ❌ マイグレーションをスキップしない
- ❌ カラムやテーブルを安易に削除しない
- ❌ 既存のマイグレーションファイルを編集しない

---

## 緊急連絡先・参考資料

### 公式ドキュメント
- [Prisma Migrate - Production](https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production)
- [Neon Documentation](https://neon.tech/docs/introduction)
- [Vercel Deployment](https://vercel.com/docs/deployments/overview)

### プロジェクト内ドキュメント
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - データベーススキーマ詳細
- [DEPLOYMENT.md](../DEPLOYMENT.md) - デプロイメント全般
- [.cursorrules](../.cursorrules) - 開発ルール

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|---------|--------|
| 2025-10-21 | 初版作成 | System |

---

## まとめ

このガイドに従うことで、データベースマイグレーションを安全かつ確実に本番環境に適用できます。

**重要なポイント:**
1. 🔹 常にdevelopブランチで開発・テストする
2. 🔹 マイグレーションファイルは必ずGitにコミットする
3. 🔹 `package.json`の`build`スクリプトに`prisma migrate deploy`が含まれていることを確認
4. 🔹 本番デプロイ前にチェックリストを確認する
5. 🔹 問題が発生した場合は、このガイドのトラブルシューティングを参照する

**質問や問題が発生した場合は、このドキュメントを更新してください！**

