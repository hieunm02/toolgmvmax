const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const advertiserId = "7646445144476008468";
  const accessToken = "15fc2fae11a15410ed7e0802525001199a22851e";
  const refreshToken = "sandbox_refresh_token_fallback";
  const shopTiktokId = "TS_SHOP_ALPHA";

  console.log("Loading production sandbox credentials directly to database...");

  // Tìm shop hiện có
  const shop = await prisma.shop.findUnique({
    where: { tiktokShopId: shopTiktokId }
  });

  if (!shop) {
    console.error(`Shop matching identifier '${shopTiktokId}' not found. Please run seed script first.`);
    process.exit(1);
  }

  const advertiser = await prisma.advertiser.upsert({
    where: { advertiserId: advertiserId },
    update: {
      accessToken: accessToken,
      refreshToken: refreshToken,
      tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30), // 30 days
    },
    create: {
      advertiserId: advertiserId,
      name: "Tài khoản quảng cáo TikTok Ads Thật (Sandbox)",
      accessToken: accessToken,
      refreshToken: refreshToken,
      tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30),
      shopId: shop.id,
    },
  });

  console.log("----------------------------------------");
  console.log("THÀNH CÔNG! Đã thêm tài khoản nhà quảng cáo:");
  console.log(`- Shop: ${shop.name}`);
  console.log(`- Advertiser ID: ${advertiser.advertiserId}`);
  console.log(`- Token: ${advertiser.accessToken}`);
  console.log("----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
