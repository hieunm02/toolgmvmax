const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Inspecting Shop 'Sẹo' Advertiser 7562821854005297153 ===");
  
  const adv = await prisma.advertiser.findUnique({
    where: { advertiserId: "7562821854005297153" }
  });

  if (!adv) {
    console.error("Advertiser 7562821854005297153 not found.");
    return;
  }

  const token = adv.accessToken;
  const targetCampaignId = "1866445093034017";

  console.log("1. Fetching Store List from TikTok API...");
  try {
    const url = "https://business-api.tiktok.com/open_api/v1.3/gmv_max/store/list/?advertiser_id=" + adv.advertiserId;
    const response = await fetch(url, { headers: { "Access-Token": token } });
    const storeListData = await response.json();
    console.log("Store List Code: " + storeListData.code + ", Message: " + storeListData.message);
    
    if (storeListData.code === 0 && storeListData.data && storeListData.data.store_list) {
      console.log("Found " + storeListData.data.store_list.length + " stores:");
      
      for (const store of storeListData.data.store_list) {
        const storeId = store.store_id;
        console.log("\n* Store ID: " + storeId + ' | Name: "' + store.store_name + '"');
        console.log("  Exclusive Advertiser Info:", JSON.stringify(store.exclusive_authorized_advertiser_info));
        
        // Query 30-day discovery report
        const startDiscoveryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const todayStr = "2026-06-08";
        const dimensions = JSON.stringify(["campaign_id"]);
        const metrics = JSON.stringify(["roi", "orders", "cost", "gross_revenue"]);
        
        console.log("  Querying GMV Max reports for Store " + storeId + " from " + startDiscoveryDate + " to " + todayStr + "...");
        
        let page = 1;
        let totalPage = 1;
        
        do {
          const discoveryUrl = "https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id=" + adv.advertiserId + "&store_ids=" + encodeURIComponent(JSON.stringify([storeId])) + "&dimensions=" + encodeURIComponent(dimensions) + "&metrics=" + encodeURIComponent(metrics) + "&start_date=" + startDiscoveryDate + "&end_date=" + todayStr + "&page_size=100&page=" + page;
          const discoveryResponse = await fetch(discoveryUrl, { headers: { "Access-Token": token } });
          const discoveryData = await discoveryResponse.json();
          
          if (discoveryData.code === 0 && discoveryData.data && discoveryData.data.list) {
            console.log("    Page " + page + " total records: " + discoveryData.data.list.length);
            
            const match = discoveryData.data.list.find(function(i) { return i.dimensions && i.dimensions.campaign_id === targetCampaignId; });
            if (match) {
              console.log("    >>> [FOUND MATCH IN DISCOVERY REPORT!]");
              console.log("        Campaign: " + targetCampaignId + " | Spend: " + match.metrics.cost + " | GMV: " + match.metrics.gross_revenue);
            }
            
            // Print active campaigns today (June 8)
            const todayReportUrl = "https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id=" + adv.advertiserId + "&store_ids=" + encodeURIComponent(JSON.stringify([storeId])) + "&dimensions=" + encodeURIComponent(dimensions) + "&metrics=" + encodeURIComponent(metrics) + "&start_date=" + todayStr + "&end_date=" + todayStr + "&page_size=100";
            const todayResponse = await fetch(todayReportUrl, { headers: { "Access-Token": token } });
            const todayData = await todayResponse.json();
            if (todayData.code === 0 && todayData.data && todayData.data.list) {
              const active = todayData.data.list.filter(function(i) { return Number(i.metrics.cost) > 0 || (i.dimensions && i.dimensions.campaign_id === targetCampaignId); });
              console.log("    Active GMV Max campaigns today (" + todayStr + "):");
              active.forEach(function(a) {
                console.log("      - ID: " + a.dimensions.campaign_id + " | Spend: " + a.metrics.cost + " | GMV: " + a.metrics.gross_revenue);
              });
            } else {
              console.log("    Failed to fetch today reports: Code " + todayData.code + ", Msg: " + todayData.message);
            }
            
            totalPage = discoveryData.data.page_info && discoveryData.data.page_info.total_page ? discoveryData.data.page_info.total_page : 1;
            page++;
          } else {
            console.log("    Failed to fetch discovery report: Code " + discoveryData.code + ", Msg: " + discoveryData.message);
            break;
          }
        } while (page <= totalPage);
      }
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main().catch(console.error).finally(function() { return prisma["\x24disconnect"](); });
