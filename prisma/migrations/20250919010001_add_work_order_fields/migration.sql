-- AlterTable
ALTER TABLE "public"."report_items" ADD COLUMN     "activity" VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."work_orders" ADD COLUMN     "handling" VARCHAR(100),
ADD COLUMN     "project_name" VARCHAR(200),
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'aggregating',
ADD COLUMN     "term" VARCHAR(50);

-- CreateTable
CREATE TABLE "public"."rates" (
    "id" TEXT NOT NULL,
    "activity" VARCHAR(20) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "cost_rate" INTEGER NOT NULL,
    "bill_rate" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."adjustments" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" VARCHAR(200) NOT NULL,
    "memo" VARCHAR(500),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."materials" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."aggregation_summaries" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "work_number" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "project_name" VARCHAR(200) NOT NULL,
    "total_hours" DECIMAL(10,2) NOT NULL,
    "cost_total" INTEGER NOT NULL,
    "bill_total" INTEGER NOT NULL,
    "material_total" INTEGER NOT NULL,
    "adjustment_total" INTEGER NOT NULL,
    "final_amount" INTEGER NOT NULL,
    "activity_breakdown" JSONB NOT NULL,
    "material_breakdown" JSONB NOT NULL,
    "aggregated_at" TIMESTAMP(3) NOT NULL,
    "aggregated_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "memo" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aggregation_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rates_activity_effective_from_idx" ON "public"."rates"("activity", "effective_from");

-- CreateIndex
CREATE INDEX "rates_effective_from_idx" ON "public"."rates"("effective_from");

-- CreateIndex
CREATE INDEX "adjustments_work_order_id_idx" ON "public"."adjustments"("work_order_id");

-- CreateIndex
CREATE INDEX "adjustments_created_by_idx" ON "public"."adjustments"("created_by");

-- CreateIndex
CREATE INDEX "materials_work_order_id_idx" ON "public"."materials"("work_order_id");

-- CreateIndex
CREATE INDEX "aggregation_summaries_work_order_id_idx" ON "public"."aggregation_summaries"("work_order_id");

-- CreateIndex
CREATE INDEX "aggregation_summaries_work_number_idx" ON "public"."aggregation_summaries"("work_number");

-- CreateIndex
CREATE INDEX "aggregation_summaries_customer_name_idx" ON "public"."aggregation_summaries"("customer_name");

-- CreateIndex
CREATE INDEX "aggregation_summaries_aggregated_at_idx" ON "public"."aggregation_summaries"("aggregated_at");

-- CreateIndex
CREATE INDEX "aggregation_summaries_aggregated_by_idx" ON "public"."aggregation_summaries"("aggregated_by");

-- CreateIndex
CREATE INDEX "report_items_activity_idx" ON "public"."report_items"("activity");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "public"."work_orders"("status");

-- CreateIndex
CREATE INDEX "work_orders_term_idx" ON "public"."work_orders"("term");

-- AddForeignKey
ALTER TABLE "public"."adjustments" ADD CONSTRAINT "adjustments_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."adjustments" ADD CONSTRAINT "adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."materials" ADD CONSTRAINT "materials_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."aggregation_summaries" ADD CONSTRAINT "aggregation_summaries_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."aggregation_summaries" ADD CONSTRAINT "aggregation_summaries_aggregated_by_fkey" FOREIGN KEY ("aggregated_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
