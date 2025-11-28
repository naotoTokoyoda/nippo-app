-- AlterTable: Add machine_id column to rates table
ALTER TABLE "public"."rates" ADD COLUMN "machine_id" TEXT;

-- CreateIndex: Add index on machine_id
CREATE INDEX "rates_machine_id_idx" ON "public"."rates"("machine_id");

-- AddForeignKey: Add foreign key constraint to machines table
ALTER TABLE "public"."rates" ADD CONSTRAINT "rates_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

