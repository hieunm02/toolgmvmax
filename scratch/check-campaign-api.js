const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const campaignId = "1866445891854817";
  console.log(`=== Querying database for campaign: ${campaignId} ===`);
  
  const campaign = await prisma.campaign.findUnique({
    where: { campaignId },
    include: {
      advertiser: {
        include: {
          shop: true
        }
      },
      reports: {
        orderBy: { date: "asc" }
      }
    }
  });

  if (!campaign) {
    console.error("Campaign not found in local database.");
    return;
  }

  console.log("Local Campaign Record:");
  console.log(JSON.stringify(campaign, null, 2));

  const { accessToken, advertiserId } = campaign.advertiser;
  const dates = ["2026-06-07", "2026-06-08"];

  // 1. Try to fetch metadata as GMV Max campaign
  console.log("\n=== Checking if GMV Max Campaign ===");
  try {
    const url = `https://business-api.tiktok.com/open_api/v1.3/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${campaignId}`;
    const response = await fetch(url, { headers: { "Access-Token": accessToken } });
    const data = await response.json();
    console.log("GMV Max Info Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error fetching GMV Max info:", e.message);
  }

  // 2. Try to fetch metadata as standard campaign
  console.log("\n=== Checking standard Campaign Metadata ===");
  try {
    const url = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}&campaign_ids=${JSON.stringify([campaignId])}`;
    const response = await fetch(url, { headers: { "Access-Token": accessToken } });
    const data = await response.json();
    console.log("Standard Campaign Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error fetching standard campaign:", e.message);
  }

  // 3. Try to fetch Integrated Reports (Auction campaign level)
  console.log("\n=== Fetching Integrated Auction Reports ===");
  for (const d of dates) {
    try {
      const dimensions = JSON.stringify(["campaign_id"]);
      const metrics = JSON.stringify(["spend", "impressions", "clicks", "complete_payment", "value_per_complete_payment"]);
      const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=${encodeURIComponent(dimensions)}&metrics=${encodeURIComponent(metrics)}&start_date=${d}&end_date=${d}`;
      const response = await fetch(url, { headers: { "Access-Token": accessToken } });
      const data = await response.json();
      console.log(`Integrated Report for ${d}:`);
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Error fetching integrated report for ${d}:`, e.message);
    }
  }

  // 4. Try to fetch GMV Max Reports
  console.log("\n=== Fetching GMV Max Reports ===");
  try {
    const storeListUrl = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/store/list/?advertiser_id=${advertiserId}`;
    const storeListResponse = await fetch(storeListUrl, { headers: { "Access-Token": accessToken } });
    const storeListData = await storeListResponse.json();
    console.log("Store List Response:");
    console.log(JSON.stringify(storeListData, null, 2));

    if (storeListData.code === 0 && storeListData.data && storeListData.data.store_list) {
      const storeIds = storeListData.data.store_list.map((s) => s.store_id);
      console.log("All Store IDs:", storeIds);

      for (const storeId of storeIds) {
        for (const d of dates) {
          try {
            const dimensions = JSON.stringify(["campaign_id"]);
            const metrics = JSON.stringify(["roi", "orders", "cost", "gross_revenue"]);
            const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(JSON.stringify(dimensions))}&metrics=${encodeURIComponent(JSON.stringify(metrics))}&start_date=${d}&end_date=${d}&page_size=100`;
            const response = await fetch(url, { headers: { "Access-Token": accessToken } });
            const data = await response.json();
            console.log(`GMV Max Report for Store ${storeId} on ${d}:`);
            console.log(JSON.stringify(data, null, 2));
          } catch (e) {
            console.error(`Error fetching GMV Max report for Store ${storeId} on ${d}:`, e.message);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error fetching store list/GMV Max reports:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
