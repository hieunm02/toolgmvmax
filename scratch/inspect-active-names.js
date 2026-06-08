const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.advertiser.findUnique({ where: { advertiserId: "7562821854005297153" } }).then(async (adv) => {
  for (const date of ["2026-06-07", "2026-06-08"]) {
    for (let p = 1; p <= 4; p++) {
      const url = "https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id=" + adv.advertiserId + "&store_ids=" + encodeURIComponent(JSON.stringify(["7494706690457110613"])) + "&dimensions=" + encodeURIComponent(JSON.stringify(["campaign_id"])) + "&metrics=" + encodeURIComponent(JSON.stringify(["cost","gross_revenue","orders"])) + "&start_date=" + date + "&end_date=" + date + "&page_size=100&page=" + p;
      const res = await fetch(url, { headers: { "Access-Token": adv.accessToken } }).then(function(r){return r.json();});
      const match = res.data.list.find(function(i){ return i.dimensions && i.dimensions.campaign_id === "1866445093034017"; });
      if (match) console.log("DATE: " + date + " | PAGE " + p + ":", JSON.stringify(match));
    }
  }
}).catch(console.error).finally(function(){return prisma["\x24disconnect"]();});
