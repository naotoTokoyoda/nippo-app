# Resend フィードバック機能 セットアップガイド

## 🚀 概要

日報アプリにResendを使用したフィードバック機能を実装しました。
ユーザーはアプリ内でフィードバックを送信でき、React Emailで美しくフォーマットされたメールとして受信できます。

## 📦 インストール済みパッケージ

```bash
npm install resend @react-email/components react-email
```

## ⚙️ 環境変数設定

`.env.local` ファイルに以下の環境変数を追加してください：

```bash
# Resend設定
RESEND_API_KEY=your_resend_api_key_here
FEEDBACK_RECIPIENT_EMAIL=your-email@example.com
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 環境変数の説明

- `RESEND_API_KEY`: ResendのAPIキー（resend.comで取得）
- `FEEDBACK_RECIPIENT_EMAIL`: フィードバックを受信するメールアドレス
- `RESEND_FROM_EMAIL`: 送信者メールアドレス（Resendで認証済みドメイン）

## 🔧 Resendアカウント設定

### 1. アカウント作成
1. [resend.com](https://resend.com) にアクセス
2. GitHubアカウントでサインアップ（推奨）

### 2. APIキー取得
1. ダッシュボードで「API Keys」をクリック
2. 「Create API Key」で新しいキーを作成
3. キーをコピーして `.env.local` に設定

### 3. ドメイン認証（本番環境用）
1. ダッシュボードで「Domains」をクリック
2. ドメインを追加
3. DNS設定でSPF、DKIM、DMARCレコードを追加
4. 認証完了まで待機（通常数分）

## 📁 実装されたファイル

### 型定義
- `src/types/feedback.ts` - フィードバック関連の型定義

### コンポーネント
- `src/components/FeedbackModal.tsx` - フィードバック入力モーダル
- `src/components/FeedbackButton.tsx` - 更新済みフィードバックボタン
- `src/emails/FeedbackEmail.tsx` - React Emailテンプレート

### API
- `src/app/api/feedback/route.ts` - フィードバック送信API

## 🎯 機能一覧

### フィードバックの種類
- 🐛 バグ報告
- ✨ 新機能要望  
- 💡 機能改善提案
- 🎨 UI/UX改善
- 🚀 パフォーマンス改善
- 💬 その他のご意見

### 優先度設定
- 🔴 高（緊急）
- 🟡 中（改善希望）
- 🟢 低（余裕があるとき）

### 自動収集情報
- ブラウザ情報（User-Agent）
- 発生ページURL
- 送信日時
- アプリバージョン

## 📧 メールテンプレート機能

- React Emailによる美しいHTMLメール
- フィードバック種類に応じた件名自動生成
- 技術情報の詳細表示
- 返信先設定（ユーザーメール提供時）

## 🛠️ 開発・テスト

### React Emailプレビュー
```bash
# メールテンプレートのプレビューサーバー起動
npm run email:dev
```

`package.json` に以下のスクリプトを追加してください：
```json
{
  "scripts": {
    "email:dev": "email dev --dir ./src/emails --port 4000"
  }
}
```

### ローカルテスト
1. 環境変数を設定
2. 開発サーバー起動: `npm run dev`
3. 右下のフィードバックボタンをクリック
4. フォームを入力して送信

## 🔒 セキュリティ

- APIキーは環境変数で管理
- CORS設定済み
- バリデーション実装済み
- エラーハンドリング完備

## 📊 Resend無料プラン

- 月3,000通まで無料
- 送信ログ・分析機能
- 高い配信率
- 開発者向けAPI

## 🚀 本番環境デプロイ

### Vercel設定
1. Vercelダッシュボードでプロジェクト選択
2. Settings → Environment Variables
3. 以下の環境変数を追加：
   - `RESEND_API_KEY`
   - `FEEDBACK_RECIPIENT_EMAIL` 
   - `RESEND_FROM_EMAIL`

### ドメイン設定
本番環境では必ずカスタムドメインを認証してください。
`RESEND_FROM_EMAIL` は認証済みドメインのメールアドレスを使用してください。

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. 環境変数が正しく設定されているか
2. ResendのAPIキーが有効か
3. ドメインが認証されているか（本番環境）
4. ブラウザのネットワークタブでエラーを確認

## 🎉 完成！

フィードバック機能の実装が完了しました。
ユーザーからの貴重なフィードバックを効率的に収集できるようになりました！
