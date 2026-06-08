const { SyncService } = require("../src/service/sync");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const todayStr = new Date().toISOString().split("T")[0];
  console.log(`=== Running Manual Sync for Today (${todayStr}) ===`);
  
  try {
    const result = await SyncService.syncAllAccounts(todayStr);
    console.log("Sync Completed. Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Sync failed with error:", err);
  }

  console.log("\n=== Checking Database Record for Campaign 'Còn lại 29/5' (ID: 1866445093034017) ===");
  const camp = await prisma.campaign.findFirst({
    where: { campaignId: "1866445093034017" },
    include: {
      reports: {
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 1))
          }
        }
      }
    }
  });

  if (!camp) {
    console.log("Campaign not found.");
  } else {
    console.log(`Campaign Name: "${camp.name}" | Status: ${camp.status}`);
    console.log(`Reports found for today/yesterday:`);
    camp.reports.forEach(r => {
      console.log(`  Date: ${r.date.toISOString().split('T')[0]} | Spend: ${r.spend} | GMV: ${r.gmv} | Orders: ${r.orders}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
