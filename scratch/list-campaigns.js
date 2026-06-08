const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Listing all campaigns in database ===");
  const campaigns = await prisma.campaign.findMany({
    include: {
      advertiser: {
        include: {
          shop: true
        }
      }
    }
  });

  console.log(`Found ${campaigns.length} campaigns:`);
  for (const c of campaigns) {
    console.log(`- ID: ${c.campaignId} | Name: "${c.name}" | Status: ${c.status} | Shop: "${c.advertiser.shop.name}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
