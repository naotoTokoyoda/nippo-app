-- 経費率テーブルのリファクタリング
-- 履歴管理を廃止し、シンプルなCRUD管理に変更

-- 1. 既存テーブルを削除（開発環境のため）
DROP TABLE IF EXISTS "expense_markup_settings";

-- 2. 新しい経費率テーブルを作成
CREATE TABLE "expense_rates" (
    "id" TEXT NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "markup_rate" DECIMAL(5,2) NOT NULL,
    "memo" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_rates_pkey" PRIMARY KEY ("id")
);

-- 3. ユニーク制約とインデックスを作成
CREATE UNIQUE INDEX "expense_rates_category_name_key" ON "expense_rates"("category_name");
CREATE INDEX "expense_rates_category_name_idx" ON "expense_rates"("category_name");
CREATE INDEX "expense_rates_is_active_idx" ON "expense_rates"("is_active");

-- 4. 初期データを挿入（4カテゴリ、すべて20%）
INSERT INTO "expense_rates" ("id", "category_name", "markup_rate", "memo", "is_active", "created_at", "updated_at")
VALUES 
    (gen_random_uuid()::text, '材料費', 1.20, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, '外注費', 1.20, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, '配送費', 1.20, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'その他', 1.20, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

