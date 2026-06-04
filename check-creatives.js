const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const creativesCount = await prisma.creative.count();
  const reportsCount = await prisma.creativeReport.count();
  console.log(`Total creatives in DB: ${creativesCount}`);
  console.log(`Total creative reports in DB: ${reportsCount}`);

  const creatives = await prisma.creative.findMany({
    include: {
      advertiser: {
        include: {
          shop: true
        }
      },
      reports: true
    },
    take: 10
  });

  console.log("\nSample creatives in DB:");
  for (const c of creatives) {
    console.log(`- Creative: ${c.name} (VideoID: ${c.videoId}) under Shop: ${c.advertiser?.shop?.name} [Advertiser Status: ${c.advertiser?.status}]`);
    console.log(`  Reports:`, c.reports.map(r => `${r.date.toISOString().split('T')[0]}: spend=${r.spend}, gmv=${r.gmv}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
