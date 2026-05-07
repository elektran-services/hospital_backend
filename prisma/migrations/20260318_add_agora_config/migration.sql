-- CreateTable AgoraConfig
CREATE TABLE "agora_config" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agora_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agora_config_appId_key" ON "agora_config"("appId");
