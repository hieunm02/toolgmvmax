const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      advertiser: true
    }
  });

  console.log("=== Campaign Records ===");
  for (const c of campaigns) {
    console.log(`ID: ${c.campaignId} | Name: ${c.name} | Status: ${c.status} | Objective: ${c.objectiveType} | ShoppingAdsType: ${c.shoppingAdsType}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
