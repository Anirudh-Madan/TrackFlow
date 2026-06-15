-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "partNo" TEXT NOT NULL,
    "description" TEXT,
    "qty" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "unit" TEXT NOT NULL DEFAULT 'Pcs.',
    "amount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_partNo_key" ON "Product"("partNo");
