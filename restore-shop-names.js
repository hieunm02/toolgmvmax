const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Restoring custom shop names...");

  const shopNames = [
    { tiktokShopId: "TS_SHOP_ALPHA", name: "Mụn" },
    { tiktokShopId: "TS_SHOP_BETA", name: "Malaysia" },
    { tiktokShopId: "TS_SHOP_GAMMA", name: "Rạn da" },
    { tiktokShopId: "TS_SHOP_DELTA", name: "Follicas" },
    { tiktokShopId: "TS_SHOP_EPSILON", name: "Sẹo" }
  ];

  for (const s of shopNames) {
    const updated = await prisma.shop.updateMany({
      where: { tiktokShopId: s.tiktokShopId },
      data: { name: s.name }
    });
    console.log(`- Restored shop with ID ${s.tiktokShopId} to name: ${s.name} (${updated.count} row(s) updated)`);
  }

  console.log("Shop names successfully restored!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
