const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    where: {
      campaignId: { in: ["1867032259313681", "1867031457296977"] }
    }
  });
  console.log("Campaigns info from DB:", JSON.stringify(campaigns, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
