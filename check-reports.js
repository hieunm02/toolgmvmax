const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.campaignReport.findMany({
    select: {
      date: true,
      campaign: {
        select: {
          name: true,
          advertiser: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: { date: 'desc' },
    take: 10
  });
  console.log("Latest reports in DB:", JSON.stringify(reports, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
