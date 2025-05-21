-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averagePrepTime" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyMetric" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourlyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMetric" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averagePrepTime" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebSocketConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "clientInfo" JSONB,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebSocketConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_restaurantId_date_key" ON "DailyMetric"("restaurantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyMetric_restaurantId_date_hour_key" ON "HourlyMetric"("restaurantId", "date", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMetric_restaurantId_menuItemId_date_key" ON "ItemMetric"("restaurantId", "menuItemId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WebSocketConnection_connectionId_key" ON "WebSocketConnection"("connectionId");

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyMetric" ADD CONSTRAINT "HourlyMetric_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMetric" ADD CONSTRAINT "ItemMetric_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMetric" ADD CONSTRAINT "ItemMetric_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportConfig" ADD CONSTRAINT "ReportConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSocketConnection" ADD CONSTRAINT "WebSocketConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
