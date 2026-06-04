const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding local SQLite database...");

  // 1. Create a default User
  const passwordHash = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@gmvmax.com" },
    update: {},
    create: {
      email: "admin@gmvmax.com",
      name: "GMV Max Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Created user: ${user.email}`);

  // 2. Create Shops
  const shop1 = await prisma.shop.upsert({
    where: { tiktokShopId: "TS_SHOP_ALPHA" },
    update: {},
    create: {
      name: "Alpha Fashion Shop",
      tiktokShopId: "TS_SHOP_ALPHA",
      status: "ACTIVE",
      users: {
        connect: { id: user.id },
      },
    },
  });

  const shop2 = await prisma.shop.upsert({
    where: { tiktokShopId: "TS_SHOP_BETA" },
    update: {},
    create: {
      name: "Beta Electronics Shop",
      tiktokShopId: "TS_SHOP_BETA",
      status: "ACTIVE",
      users: {
        connect: { id: user.id },
      },
    },
  });
  console.log(`Created shops: ${shop1.name}, ${shop2.name}`);

  // 3. Create Advertiser links
  const advertiser1 = await prisma.advertiser.upsert({
    where: { advertiserId: "ADV1001" },
    update: {},
    create: {
      advertiserId: "ADV1001",
      name: "Alpha TikTok Shop Ads Store",
      accessToken: "mock_access_token_1",
      refreshToken: "mock_refresh_token_1",
      tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30), // 30 days
      shopId: shop1.id,
    },
  });

  const advertiser2 = await prisma.advertiser.upsert({
    where: { advertiserId: "ADV1002" },
    update: {},
    create: {
      advertiserId: "ADV1002",
      name: "Beta GMV Max Brand Page",
      accessToken: "mock_access_token_2",
      refreshToken: "mock_refresh_token_2",
      tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30), // 30 days
      shopId: shop2.id,
    },
  });
  console.log(`Created advertiser links: ${advertiser1.name}, ${advertiser2.name}`);

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
