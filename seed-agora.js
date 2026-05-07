// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config();
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const AGORA_APP_ID = process.env.AGORA_APP_ID;

  if (!AGORA_APP_ID) {
    console.error("❌ AGORA_APP_ID not found in environment variables (.env.local)");
    process.exit(1);
  }

  try {
    // Check if Agora config already exists
    const existing = await prisma.agoraConfig.findUnique({
      where: { appId: AGORA_APP_ID },
    });

    if (existing) {
      console.log("✅ Agora config already seeded");
      console.log(`   ID: ${existing.id}`);
      console.log(`   App ID: ${existing.appId}`);
      return;
    }

    // Insert Agora App ID
    const agoraConfig = await prisma.agoraConfig.create({
      data: {
        appId: AGORA_APP_ID,
      },
    });

    console.log("✅ Agora config seeded successfully");
    console.log(`   ID: ${agoraConfig.id}`);
    console.log(`   App ID: ${agoraConfig.appId}`);
  } catch (error) {
    console.error("❌ Error seeding Agora config:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
