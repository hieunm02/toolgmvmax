const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.shop.findMany({
    include: {
      advertisers: {
        include: {
          campaigns: {
            include: {
              reports: {
                select: { date: true }
              }
            }
          }
        }
      }
    }
  });

  for (const s of shops) {
    console.log(`\nShop: ${s.name} (${s.tiktokShopId})`);
    for (const a of s.advertisers) {
      console.log(`  Advertiser: ${a.name} (${a.advertiserId}) [${a.status}]`);
      const dates = new Set();
      for (const c of a.campaigns) {
        for (const r of c.reports) {
          dates.add(r.date.toISOString().split('T')[0]);
        }
      }
      console.log(`    Has report dates:`, Array.from(dates));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
