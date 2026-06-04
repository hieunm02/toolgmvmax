const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const advertisers = await prisma.advertiser.findMany({
    include: { shop: true }
  });

  console.log("All Advertisers in DB:");
  for (const a of advertisers) {
    console.log(`- ID: ${a.advertiserId} | Name: ${a.name} | Status: ${a.status} | Shop: ${a.shop?.name || "None"} | Token: ${a.accessToken.substring(0, 10)}...`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
