-- Add estimate_amount and final_decision_amount to work_orders table
ALTER TABLE "work_orders" ADD COLUMN "estimate_amount" INTEGER;
ALTER TABLE "work_orders" ADD COLUMN "final_decision_amount" INTEGER;

