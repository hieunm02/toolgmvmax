const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const allCount = await prisma.advertiser.count();
  const activeCount = await prisma.advertiser.count({ where: { status: "ACTIVE" } });
  const inactiveCount = await prisma.advertiser.count({ where: { status: "INACTIVE" } });
  
  console.log(`Total Advertisers: ${allCount}`);
  console.log(`Active: ${activeCount}`);
  console.log(`Inactive: ${inactiveCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
