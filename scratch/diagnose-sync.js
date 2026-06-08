const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Querying database for campaigns matching 'Còn lại' or '29/5' ===");
  
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { name: { contains: "Còn lại" } },
        { name: { contains: "29/5" } }
      ]
    },
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

  console.log(`Found ${campaigns.length} campaigns in local DB.`);

  for (const campaign of campaigns) {
    console.log("\n==================================================");
    console.log(`Campaign ID: ${campaign.campaignId}`);
    console.log(`Campaign Name: "${campaign.name}"`);
    console.log(`Objective: ${campaign.objectiveType} | Status: ${campaign.status}`);
    console.log(`Shop: "${campaign.advertiser.shop.name}" | Advertiser: "${campaign.advertiser.name}" (${campaign.advertiser.advertiserId})`);
    
    console.log("\n--- Local Campaign Reports ---");
    if (campaign.reports.length === 0) {
      console.log("No reports found in local DB.");
    } else {
      campaign.reports.forEach(r => {
        console.log(`  Date: ${r.date.toISOString().split('T')[0]} | Spend: ${r.spend} | GMV: ${r.gmv} | Orders: ${r.orders}`);
      });
    }

    const { accessToken, advertiserId } = campaign.advertiser;
    // We will query for late May and early June dates
    const dates = ["2026-05-28", "2026-05-29", "2026-05-30", "2026-06-06", "2026-06-07", "2026-06-08"];

    // 1. Fetch metadata as GMV Max campaign
    console.log("\n--- TikTok API: GMV Max Info ---");
    try {
      const url = `https://business-api.tiktok.com/open_api/v1.3/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${campaign.campaignId}`;
      const response = await fetch(url, { headers: { "Access-Token": accessToken } });
      const data = await response.json();
      console.log(`GMV Max Info Code: ${data.code}, Message: ${data.message}`);
      if (data.code === 0) {
        console.log("GMV Max Info Data:", JSON.stringify(data.data, null, 2));
      }
    } catch (e) {
      console.error("Error fetching GMV Max info:", e.message);
    }

    // 2. Fetch metadata as standard campaign
    console.log("\n--- TikTok API: Standard Campaign Metadata ---");
    try {
      const url = `https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}&campaign_ids=${JSON.stringify([campaign.campaignId])}`;
      const response = await fetch(url, { headers: { "Access-Token": accessToken } });
      const data = await response.json();
      console.log(`Standard Campaign Code: ${data.code}, Message: ${data.message}`);
      if (data.code === 0 && data.data && data.data.list) {
        console.log("Standard Campaign Data:", JSON.stringify(data.data.list, null, 2));
      }
    } catch (e) {
      console.error("Error fetching standard campaign:", e.message);
    }

    // 3. Fetch Integrated Reports (Auction campaign level)
    console.log("\n--- TikTok API: Integrated Basic Reports (Standard Campaign Level) ---");
    for (const d of dates) {
      try {
        const dimensions = JSON.stringify(["campaign_id"]);
        const metrics = JSON.stringify(["spend", "impressions", "clicks", "complete_payment", "value_per_complete_payment"]);
        const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=${encodeURIComponent(dimensions)}&metrics=${encodeURIComponent(metrics)}&start_date=${d}&end_date=${d}`;
        const response = await fetch(url, { headers: { "Access-Token": accessToken } });
        const data = await response.json();
        if (data.code === 0 && data.data && data.data.list && data.data.list.length > 0) {
          const match = data.data.list.find(item => item.dimensions?.campaign_id === campaign.campaignId);
          if (match) {
            console.log(`  [Match] Date: ${d} | Spend: ${match.metrics.spend} | GMV: ${match.metrics.value_per_complete_payment} | Orders: ${match.metrics.complete_payment}`);
          } else {
            console.log(`  Date: ${d} | Campaign not in basic report (list length: ${data.data.list.length})`);
          }
        } else {
          console.log(`  Date: ${d} | Code: ${data.code} | No data in list.`);
        }
      } catch (e) {
        console.error(`Error fetching integrated report for ${d}:`, e.message);
      }
    }

    // 4. Fetch GMV Max Reports
    console.log("\n--- TikTok API: GMV Max Store List and Store Reports ---");
    try {
      const storeListUrl = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/store/list/?advertiser_id=${advertiserId}`;
      const storeListResponse = await fetch(storeListUrl, { headers: { "Access-Token": accessToken } });
      const storeListData = await storeListResponse.json();
      console.log(`Store List Code: ${storeListData.code}, Message: ${storeListData.message}`);
      
      if (storeListData.code === 0 && storeListData.data && storeListData.data.store_list) {
        console.log(`Found ${storeListData.data.store_list.length} stores under this advertiser:`);
        storeListData.data.store_list.forEach(store => {
          console.log(`  - Store ID: ${store.store_id} | Name: ${store.store_name}`);
          console.log(`    Exclusive Advertiser Info:`, JSON.stringify(store.exclusive_authorized_advertiser_info));
        });

        // Let's query GMV Max reports for each store to see if our campaign shows up
        for (const store of storeListData.data.store_list) {
          const storeId = store.store_id;
          console.log(`\n  Querying GMV Max reports for Store ${storeId} ("${store.store_name}")...`);
          
          for (const d of dates) {
            try {
              const dimensions = JSON.stringify(["campaign_id"]);
              const metrics = JSON.stringify(["roi", "orders", "cost", "gross_revenue"]);
              // We'll fetch with a page size of 100
              const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(dimensions)}&metrics=${encodeURIComponent(metrics)}&start_date=${d}&end_date=${d}&page_size=100`;
              
              const response = await fetch(url, { headers: { "Access-Token": accessToken } });
              const data = await response.json();
              
              if (data.code === 0 && data.data) {
                const total = data.data.page_info?.total_number || 0;
                const list = data.data.list || [];
                console.log(`    Date: ${d} | Total records on page: ${list.length} (Total matching in API: ${total})`);
                
                const match = list.find(item => item.dimensions?.campaign_id === campaign.campaignId);
                if (match) {
                  console.log(`      [MATCH] Campaign ID: ${campaign.campaignId} | Spend: ${match.metrics.cost} | GMV: ${match.metrics.gross_revenue} | Orders: ${match.metrics.orders}`);
                }
                
                // Print any campaigns that had non-zero spend on this date to understand
                const activeCamps = list.filter(item => Number(item.metrics.cost) > 0 || Number(item.metrics.gross_revenue) > 0);
                if (activeCamps.length > 0) {
                  console.log(`      Active GMV Max campaigns on ${d}:`);
                  activeCamps.forEach(ac => {
                    console.log(`        - ID: ${ac.dimensions.campaign_id} | Spend: ${ac.metrics.cost} | GMV: ${ac.metrics.gross_revenue} | Orders: ${ac.metrics.orders}`);
                  });
                }
              } else {
                console.log(`    Date: ${d} | Code: ${data.code} | Msg: ${data.message}`);
              }
            } catch (e) {
              console.error(`    Error fetching GMV Max report for Store ${storeId} on ${d}:`, e.message);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching store list/GMV Max reports:", e.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
