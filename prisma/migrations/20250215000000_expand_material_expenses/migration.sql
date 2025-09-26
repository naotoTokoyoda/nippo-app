-- Alter the materials table to support cost and billing metadata per expense category
ALTER TABLE "public"."materials"
  ADD COLUMN "category" VARCHAR(50),
  ADD COLUMN "cost_unit_price" INTEGER,
  ADD COLUMN "cost_quantity" INTEGER,
  ADD COLUMN "cost_total" INTEGER,
  ADD COLUMN "bill_unit_price" INTEGER,
  ADD COLUMN "bill_quantity" INTEGER,
  ADD COLUMN "bill_total" INTEGER,
  ADD COLUMN "file_estimate" INTEGER;

-- Backfill the newly added columns using the legacy material data
UPDATE "public"."materials"
SET
  "category" = COALESCE("category", 'materials'),
  "cost_unit_price" = COALESCE("cost_unit_price", "unit_price"),
  "cost_quantity" = COALESCE("cost_quantity", "quantity"),
  "cost_total" = COALESCE("cost_total", "total_amount"),
  "bill_unit_price" = COALESCE("bill_unit_price", "unit_price"),
  "bill_quantity" = COALESCE("bill_quantity", "quantity"),
  "bill_total" = COALESCE("bill_total", "total_amount"),
  "file_estimate" = COALESCE("file_estimate", NULL);

-- Ensure new columns are non-nullable now that the data has been populated
ALTER TABLE "public"."materials"
  ALTER COLUMN "category" SET NOT NULL,
  ALTER COLUMN "cost_unit_price" SET NOT NULL,
  ALTER COLUMN "cost_quantity" SET NOT NULL,
  ALTER COLUMN "cost_total" SET NOT NULL,
  ALTER COLUMN "bill_unit_price" SET NOT NULL,
  ALTER COLUMN "bill_quantity" SET NOT NULL,
  ALTER COLUMN "bill_total" SET NOT NULL;

-- Drop legacy columns that have been replaced by the new structure
ALTER TABLE "public"."materials"
  DROP COLUMN "name",
  DROP COLUMN "unit_price",
  DROP COLUMN "quantity",
  DROP COLUMN "total_amount";
