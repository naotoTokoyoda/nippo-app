# データベース移行ガイド

このフォルダには、将来的なデータベース移行を想定したテストデータとヘルパー関数が含まれています。

## ファイル構成

- `testData.ts` - テストデータとヘルパー関数
- `README.md` - このドキュメント

## データ構造

### 1. 作業者データ (WORKER_DATA)
将来的には `users` テーブルに移行
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 客先データ (CUSTOMER_DATA)
将来的には `customers` テーブルに移行
```sql
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. 機械種類データ (MACHINE_DATA)
将来的には `machines` テーブルに移行
```sql
CREATE TABLE machines (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. 工番データ (WORK_ORDER_DATA)
将来的には `work_orders` テーブルに移行
```sql
CREATE TABLE work_orders (
  id VARCHAR(36) PRIMARY KEY,
  front_number VARCHAR(10) NOT NULL,
  back_number VARCHAR(10) NOT NULL,
  description TEXT,
  customer_id VARCHAR(36) REFERENCES customers(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. 日報データ (SAMPLE_REPORTS)
将来的には `reports` と `report_items` テーブルに移行
```sql
CREATE TABLE reports (
  id VARCHAR(36) PRIMARY KEY,
  date DATE NOT NULL,
  worker_id VARCHAR(36) REFERENCES users(id),
  submitted_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_items (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) REFERENCES reports(id),
  customer_id VARCHAR(36) REFERENCES customers(id),
  work_order_id VARCHAR(36) REFERENCES work_orders(id),
  machine_id VARCHAR(36) REFERENCES machines(id),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 移行手順

### 1. データベース準備
1. 上記のテーブル構造でデータベースを作成
2. インデックスを適切に設定

### 2. データ移行
1. `dataHelpers.convertToDatabaseFormat()` を使用してデータを変換
2. バッチ処理でデータを挿入
3. 外部キー制約を確認

### 3. アプリケーション更新
1. データアクセス層を実装（Repository パターン推奨）
2. コンテキストをデータベース接続に変更
3. エラーハンドリングを追加

## ヘルパー関数

### `dataHelpers.getWorkerId(name: string)`
作業者名からIDを取得

### `dataHelpers.getCustomerId(name: string)`
客先名からIDを取得

### `dataHelpers.getMachineId(name: string)`
機械種類名からIDを取得

### `dataHelpers.getWorkOrderId(frontNumber: string, backNumber: string)`
工番から工番IDを取得

### `dataHelpers.convertToDatabaseFormat(report: DailyReportData)`
日報データをデータベース形式に変換

## 注意事項

- 現在のデータはローカルストレージに保存されています
- 本番環境では適切な認証・認可を実装してください
- データベース移行時はバックアップを必ず取得してください
- パフォーマンスを考慮してインデックスを適切に設定してください
- 部署情報は必要に応じて後から追加可能です 