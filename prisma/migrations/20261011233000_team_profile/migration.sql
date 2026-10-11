-- CreateTable
CREATE TABLE "TeamProfile" (
    "category" "AthleteCategory" NOT NULL,
    "name" TEXT,
    "coverPath" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TeamProfile_pkey" PRIMARY KEY ("category")
);
