const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all test data (keeping users)...");
  
  await prisma.campaignSpendSnapshot.deleteMany({});
  await prisma.campaignReport.deleteMany({});
  await prisma.productReport.deleteMany({});
  await prisma.creativeReport.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.creative.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.advertiser.deleteMany({});
  await prisma.shop.deleteMany({});
  
  console.log("Database cleared successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
