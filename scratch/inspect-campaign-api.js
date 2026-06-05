const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const campaignId = "1867033595540641";
  const camp = await prisma.campaign.findUnique({
    where: { campaignId },
    include: { advertiser: true }
  });
  if (!camp) {
    console.error("Campaign not found in DB!");
    return;
  }

  const baseUrl = "https://business-api.tiktok.com/open_api/v1.3";
  const url = `${baseUrl}/campaign/gmv_max/info/?advertiser_id=${camp.advertiser.advertiserId}&campaign_id=${campaignId}`;
  console.log("Fetching campaign info from url:", url);

  const response = await fetch(url, {
    headers: { "Access-Token": camp.advertiser.accessToken }
  });
  const data = await response.json();
  console.log("Response data:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
