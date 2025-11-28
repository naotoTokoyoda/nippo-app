-- DropIndex
DROP INDEX IF EXISTS "labor_rates_labor_name_effective_from_idx";
DROP INDEX IF EXISTS "labor_rates_effective_from_idx";
DROP INDEX IF EXISTS "machine_rates_machine_id_effective_from_idx";
DROP INDEX IF EXISTS "machine_rates_effective_from_idx";
DROP INDEX IF EXISTS "expense_markup_settings_category_effective_from_idx";

-- DropIndex (unique constraint for machine_rates)
ALTER TABLE "machine_rates" DROP CONSTRAINT IF EXISTS "machine_rates_machine_id_effective_from_key";

-- AlterTable: LaborRate - effectiveFrom/effectiveTo を削除
ALTER TABLE "labor_rates" DROP COLUMN IF EXISTS "effective_from";
ALTER TABLE "labor_rates" DROP COLUMN IF EXISTS "effective_to";

-- AlterTable: MachineRate - effectiveFrom/effectiveTo を削除
ALTER TABLE "machine_rates" DROP COLUMN IF EXISTS "effective_from";
ALTER TABLE "machine_rates" DROP COLUMN IF EXISTS "effective_to";

-- AlterTable: ExpenseMarkupSetting - effectiveFrom/effectiveTo を削除
ALTER TABLE "expense_markup_settings" DROP COLUMN IF EXISTS "effective_from";
ALTER TABLE "expense_markup_settings" DROP COLUMN IF EXISTS "effective_to";

-- CreateIndex: laborName に unique 制約を追加
CREATE UNIQUE INDEX "labor_rates_labor_name_key" ON "labor_rates"("labor_name");

-- CreateIndex: machineId に unique 制約を追加
CREATE UNIQUE INDEX "machine_rates_machine_id_key" ON "machine_rates"("machine_id");

-- CreateIndex: category に unique 制約を追加
CREATE UNIQUE INDEX "expense_markup_settings_category_key" ON "expense_markup_settings"("category");

-- CreateIndex: 新しいインデックス
CREATE INDEX "labor_rates_labor_name_idx" ON "labor_rates"("labor_name");
CREATE INDEX "machine_rates_machine_id_idx" ON "machine_rates"("machine_id");
CREATE INDEX "expense_markup_settings_category_idx" ON "expense_markup_settings"("category");

