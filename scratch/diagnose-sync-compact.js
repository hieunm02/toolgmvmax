const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function run() {
  const camps = await p.campaign.findMany({
    where: { OR: [{ name: { contains: "Còn lại" } }, { name: { contains: "29/5" } }] },
    include: { advertiser: { include: { shop: true } }, reports: { orderBy: { date: "asc" } } }
  });
  console.log(`Found ${camps.length} campaigns in DB.`);
  for (const c of camps) {
    console.log(`\nID: ${c.campaignId} | "${c.name}" | Shop: "${c.advertiser.shop.name}"`);
    console.log("Local DB Reports:", c.reports.map(r => `${r.date.toISOString().slice(0,10)} spend:${r.spend} gmv:${r.gmv}`));
    
    const { accessToken: token, advertiserId: advId } = c.advertiser;
    const dates = ["2026-05-29", "2026-06-07", "2026-06-08"];
    
    for (const d of dates) {
      try {
        const dim = JSON.stringify(["campaign_id"]);
        const met = JSON.stringify(["spend", "value_per_complete_payment", "complete_payment"]);
        const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?advertiser_id=${advId}&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=${encodeURIComponent(dim)}&metrics=${encodeURIComponent(met)}&start_date=${d}&end_date=${d}`;
        const res = await fetch(url, { headers: { "Access-Token": token } }).then(r=>r.json());
        const match = res.data?.list?.find(i => i.dimensions?.campaign_id === c.campaignId);
        if (match) console.log(`Basic ${d}: spend:${match.metrics.spend} gmv:${match.metrics.value_per_complete_payment}`);
      } catch (e) { console.error(e.message); }
    }
    
    try {
      const storeRes = await fetch(`https://business-api.tiktok.com/open_api/v1.3/gmv_max/store/list/?advertiser_id=${advId}`, { headers: { "Access-Token": token } }).then(r=>r.json());
      if (storeRes.code === 0 && storeRes.data?.store_list) {
        for (const store of storeRes.data.store_list) {
          const storeId = store.store_id;
          console.log(`Store ID: ${storeId} Name: ${store.store_name}`);
          for (const d of dates) {
            const dim = JSON.stringify(["campaign_id"]);
            const met = JSON.stringify(["roi", "orders", "cost", "gross_revenue"]);
            const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id=${advId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(dim)}&metrics=${encodeURIComponent(met)}&start_date=${d}&end_date=${d}&page_size=100`;
            const res = await fetch(url, { headers: { "Access-Token": token } }).then(r=>r.json());
            if (res.code === 0 && res.data?.list) {
              const match = res.data.list.find(i => i.dimensions?.campaign_id === c.campaignId);
              if (match) console.log(`  GMVMax Store ${storeId} on ${d}: cost:${match.metrics.cost} rev:${match.metrics.gross_revenue}`);
              
              const active = res.data.list.filter(i => Number(i.metrics.cost) > 0);
              if (active.length > 0) {
                console.log(`  Active GMV Max campaigns on ${d}:`, active.map(i => `${i.dimensions.campaign_id} cost:${i.metrics.cost} rev:${i.metrics.gross_revenue}`));
              }
            }
          }
        }
      }
    } catch (e) { console.error(e.message); }
  }
}
run().catch(console.error).finally(()=>p.$disconnect());
