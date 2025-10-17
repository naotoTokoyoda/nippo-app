-- Add memo column to rates table
ALTER TABLE "public"."rates" ADD COLUMN "memo" VARCHAR(50);

-- Add memo column to materials table
ALTER TABLE "public"."materials" ADD COLUMN "memo" VARCHAR(50);
