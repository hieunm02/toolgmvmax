const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Inspecting Shop 'Sẹo' and its Advertiser connections ===");
  
  const shop = await prisma.shop.findFirst({
    where: { name: "Sẹo" },
    include: {
      advertisers: true
    }
  });

  if (!shop) {
    console.error("Shop 'Sẹo' not found in database.");
    return;
  }

  console.log(`Shop Name: "${shop.name}" | ID: ${shop.id}`);
  console.log(`Linked Advertisers (${shop.advertisers.length}):`);
  
  for (const adv of shop.advertisers) {
    console.log(`\n- Advertiser Name: "${adv.name}" | ID: ${adv.advertiserId} | Status: ${adv.status}`);
    const token = adv.accessToken;
    
    // 1. Get TikTok Store List
    console.log("  Fetching Store List from TikTok API...");
    try {
      const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/store/list/?advertiser_id=${adv.advertiserId}`;
      const response = await fetch(url, { headers: { "Access-Token": token } });
      const storeListData = await response.json();
      console.log(`  Store List Code: ${storeListData.code}, Message: ${storeListData.message}`);
      
      if (storeListData.code === 0 && storeListData.data && storeListData.data.store_list) {
        console.log(`  Found ${storeListData.data.store_list.length} stores:`);
        for (const store of storeListData.data.store_list) {
          console.log(`    * Store ID: ${store.store_id} | Name: ${store.store_name}`);
          console.log(`      Exclusive Advertiser Info:`, JSON.stringify(store.exclusive_authorized_advertiser_info));
          
          // 2. Query 30-day discovery report to find campaign IDs for this store
          const startDiscoveryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          const todayStr = new Date().toISOString().split("T")[0];
          const dimensions = JSON.stringify(["campaign_id"]);
          const metrics = JSON.stringify(["roi", "orders", "cost", "gross_revenue"]);
          
          let page = 1;
          let totalPage = 1;
          console.log(`      Querying discovery reports starting from ${startDiscoveryDate}...`);
          
          do {
            const discoveryUrl = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id=${adv.advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([store.store_id]))}&dimensions=${encodeURIComponent(dimensions)}&metrics=${encodeURIComponent(metrics)}&start_date=${startDiscoveryDate}&end_date=${todayStr}&page_size=100&page=${page}`;
            const discoveryResponse = await fetch(discoveryUrl, { headers: { "Access-Token": token } });
            const discoveryData = await discoveryResponse.json();
            
            if (discoveryData.code === 0 && discoveryData.data && discoveryData.data.list) {
              console.log(`      Page ${page} total records: ${discoveryData.data.list.length}`);
              for (const item of discoveryData.data.list) {
                const cid = item.dimensions?.campaign_id;
                // Fetch info
                try {
                  const infoUrl = `https://business-api.tiktok.com/open_api/v1.3/campaign/gmv_max/info/?advertiser_id=${adv.advertiserId}&campaign_id=${cid}`;
                  const infoResponse = await fetch(infoUrl, { headers: { "Access-Token": token } });
                  const infoData = await infoResponse.json();
                  if (infoData.code === 0 && infoData.data) {
                    const name = infoData.data.campaign_name;
                    console.log(`        - Campaign ID: ${cid} | Name: "${name}" | Status: ${infoData.data.operation_status}`);
                    if (name && name.includes("29/5")) {
                      console.log(`        >>> [FOUND 29/5 MATCH!] ID: ${cid} | Name: "${name}"`);
                    }
                  } else {
                    console.log(`        - Campaign ID: ${cid} (Failed to get metadata: Code ${infoData.code})`);
                  }
                } catch (metaErr) {
                  console.error(`        - Error getting metadata for ${cid}:`, metaErr.message);
                }
              }
              totalPage = discoveryData.data.page_info?.total_page || 1;
              page++;
            } else {
              console.log(`      Failed to fetch discovery report: Code ${discoveryData.code}, Msg: ${discoveryData.message}`);
              break;
            }
          } while (page <= totalPage);
        }
      }
    } catch (e) {
      console.error("  Error querying TikTok API for advertiser:", e.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
