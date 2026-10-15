-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "detectedHex" TEXT NOT NULL,
    "labValues" JSONB NOT NULL,
    "tier" INTEGER NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "remedies" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "ScanRecord" ADD CONSTRAINT "ScanRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
