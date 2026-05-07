const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function main() {
  try {
    const users = await db.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        hospitalId: true,
        branchId: true,
      },
    });

    console.log('Users in database:');
    console.log(JSON.stringify(users, null, 2));

    if (users.length === 0) {
      console.log('\nNo users found. Please seed test data first.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
