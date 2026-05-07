const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function main() {
  try {
    const config = await db.agoraConfig.findFirst();
    
    console.log('Agora Config from DB:');
    console.log('  appId:', config?.appId);
    console.log('  appId length:', config?.appId?.length);
    console.log('  appCertificate:', config?.appCertificate);
    console.log('  appCertificate length:', config?.appCertificate?.length);
    console.log('  appCertificate raw:', JSON.stringify(config?.appCertificate));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
