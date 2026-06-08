const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Querying Database for 'Còn lại' & '29/5' Campaigns ===");
  
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
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 1)) // Today and yesterday
          }
        }
      }
    }
  });

  console.log(`Found ${campaigns.length} campaigns in DB.`);
  for (const c of campaigns) {
    console.log(`\n- ID: ${c.campaignId} | Name: "${c.name}"`);
    console.log(`  Status: ${c.status} | Objective: ${c.objectiveType}`);
    console.log(`  Advertiser: "${c.advertiser.name}" (${c.advertiser.advertiserId})`);
    console.log(`  Shop in DB: "${c.advertiser.shop.name}"`);
    console.log(`  Today/Yesterday Reports (${c.reports.length}):`);
    c.reports.forEach(r => {
      console.log(`    Date: ${r.date.toISOString().split('T')[0]} | Spend: ${r.spend} | GMV: ${r.gmv}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
