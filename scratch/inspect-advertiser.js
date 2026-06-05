const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const advertiserId = "7536957336980766728";
  const adv = await prisma.advertiser.findUnique({
    where: { advertiserId }
  });
  if (!adv) {
    console.error("Advertiser not found in DB!");
    return;
  }

  const baseUrl = "https://business-api.tiktok.com/open_api/v1.3";
  const url = `${baseUrl}/advertiser/info/?advertiser_ids=${encodeURIComponent(JSON.stringify([advertiserId]))}`;
  console.log("Fetching advertiser info from url:", url);

  const response = await fetch(url, {
    headers: { "Access-Token": adv.accessToken }
  });
  const data = await response.json();
  console.log("Response data:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
