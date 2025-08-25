-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."machines" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_orders" (
    "id" TEXT NOT NULL,
    "front_number" VARCHAR(10) NOT NULL,
    "back_number" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reports" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "worker_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_items" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "work_status" VARCHAR(20) DEFAULT 'normal',
    "work_description" VARCHAR(200),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_name_idx" ON "public"."users"("name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "public"."customers"("code");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "public"."customers"("name");

-- CreateIndex
CREATE INDEX "machines_category_idx" ON "public"."machines"("category");

-- CreateIndex
CREATE INDEX "work_orders_front_number_idx" ON "public"."work_orders"("front_number");

-- CreateIndex
CREATE INDEX "work_orders_back_number_idx" ON "public"."work_orders"("back_number");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_front_number_back_number_key" ON "public"."work_orders"("front_number", "back_number");

-- CreateIndex
CREATE INDEX "reports_date_idx" ON "public"."reports"("date");

-- CreateIndex
CREATE INDEX "reports_worker_id_idx" ON "public"."reports"("worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_date_worker_id_key" ON "public"."reports"("date", "worker_id");

-- CreateIndex
CREATE INDEX "report_items_report_id_idx" ON "public"."report_items"("report_id");

-- CreateIndex
CREATE INDEX "report_items_customer_id_idx" ON "public"."report_items"("customer_id");

-- CreateIndex
CREATE INDEX "report_items_work_order_id_idx" ON "public"."report_items"("work_order_id");

-- CreateIndex
CREATE INDEX "report_items_machine_id_idx" ON "public"."report_items"("machine_id");

-- AddForeignKey
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_items" ADD CONSTRAINT "report_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_items" ADD CONSTRAINT "report_items_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_items" ADD CONSTRAINT "report_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_items" ADD CONSTRAINT "report_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
