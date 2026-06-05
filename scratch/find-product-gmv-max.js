const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    where: {
      objectiveType: "OUTFLOW_GMV_MAX",
      shoppingAdsType: "PRODUCT"
    },
    include: { advertiser: true }
  });
  console.log(campaigns.map(c => ({
    campaignId: c.campaignId,
    name: c.name,
    status: c.status,
    advertiserName: c.advertiser.name,
    advertiserId: c.advertiser.advertiserId
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
