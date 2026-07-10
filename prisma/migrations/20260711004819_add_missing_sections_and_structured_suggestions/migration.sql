-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "missingSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "suggestions",
ADD COLUMN     "suggestions" JSONB NOT NULL DEFAULT '[]';
