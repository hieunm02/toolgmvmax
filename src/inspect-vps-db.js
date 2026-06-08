const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.campaignReport.findMany({
  where: { 
    date: { gte: new Date("2026-06-07") }, 
    campaign: { advertiser: { advertiserId: "7562821854005297153" } } 
  },
  include: { campaign: true }
}).then(function(reports) {
  console.log("Found " + reports.length + " reports in VPS DB.");
  reports.forEach(function(r) {
    console.log("  - Campaign: \"" + r.campaign.name + "\" | Date: " + r.date.toISOString().split("T")[0] + " | Spend: " + r.spend + " | GMV: " + r.gmv + " | Orders: " + r.orders);
  });
}).catch(console.error).finally(function(){return prisma["$disconnect"]();});
