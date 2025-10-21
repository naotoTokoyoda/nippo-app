-- CreateTable
CREATE TABLE "work_order_activity_memos" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "activity" VARCHAR(20) NOT NULL,
    "memo" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_activity_memos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_order_activity_memos_work_order_id_idx" ON "work_order_activity_memos"("work_order_id");

-- CreateIndex
CREATE INDEX "work_order_activity_memos_activity_idx" ON "work_order_activity_memos"("activity");

-- CreateIndex
CREATE UNIQUE INDEX "work_order_activity_memos_work_order_id_activity_key" ON "work_order_activity_memos"("work_order_id", "activity");

-- AddForeignKey
ALTER TABLE "work_order_activity_memos" ADD CONSTRAINT "work_order_activity_memos_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

