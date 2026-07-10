-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "aiScore" INTEGER,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "improvedResume" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);
