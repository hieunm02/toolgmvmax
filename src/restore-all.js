const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const https = require("https");

const prisma = new PrismaClient();

const token = "eceafc8ce35ab903d9a9b4512039105e5cc42551";

function getAdvertiserInfo(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "business-api.tiktok.com",
      path: `/open_api/v1.3/oauth2/advertiser/get/?app_id=${process.env.TIKTOK_CLIENT_ID}&secret=${process.env.TIKTOK_CLIENT_SECRET}`,
      method: "GET",
      headers: {
        "Access-Token": token
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", (e) => { reject(e); });
    req.end();
  });
}

async function main() {
  console.log("=== Starting Automatic Restore and Re-mapping ===");

  // 1. Create Default Admin User
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
  console.log(`- Admin User: ${user.email}`);

  // 2. Create the 5 Shops
  const shopsData = [
    { name: "Follicas", tiktokShopId: "TS_FOLLICAS" },
    { name: "Lumilab", tiktokShopId: "TS_LUMILAB" },
    { name: "Malaysia", tiktokShopId: "TS_MALAYSIA" },
    { name: "Rạn", tiktokShopId: "TS_RAN" },
    { name: "Sẹo", tiktokShopId: "TS_SEO" }
  ];

  const shopsMap = {};
  for (const sd of shopsData) {
    const s = await prisma.shop.upsert({
      where: { tiktokShopId: sd.tiktokShopId },
      update: { status: "ACTIVE" },
      create: {
        name: sd.name,
        tiktokShopId: sd.tiktokShopId,
        status: "ACTIVE",
        users: { connect: { id: user.id } }
      }
    });
    shopsMap[sd.name] = s;
    console.log(`- Shop Created: ${s.name} (ID: ${s.id})`);
  }

  // 3. Fetch advertiser accounts from TikTok
  const resData = await getAdvertiserInfo(token);
  if (resData.code !== 0) {
    console.error("TikTok API error:", resData.message);
    process.exit(1);
  }

  const advertiserList = resData.data.list || [];
  console.log(`\nFound ${advertiserList.length} advertiser accounts from TikTok.`);

  // 4. Upsert and Map each account to the correct shop
  for (const adv of advertiserList) {
    const nameLower = adv.advertiser_name.toLowerCase();
    let targetShopName = "Sẹo"; // default fallback

    if (nameLower.includes("follica")) {
      targetShopName = "Follicas";
    } else if (nameLower.includes("lumi")) {
      targetShopName = "Lumilab";
    } else if (nameLower.includes("malay") || nameLower.includes("my")) {
      targetShopName = "Malaysia";
    } else if (nameLower.includes("rạn") || nameLower.includes("ran")) {
      targetShopName = "Rạn";
    } else if (nameLower.includes("sẹo") || nameLower.includes("seo")) {
      targetShopName = "Sẹo";
    }

    const shop = shopsMap[targetShopName];
    const dbAdv = await prisma.advertiser.upsert({
      where: { advertiserId: adv.advertiser_id },
      update: {
        name: adv.advertiser_name,
        accessToken: token,
        shopId: shop.id,
        status: "ACTIVE"
      },
      create: {
        advertiserId: adv.advertiser_id,
        name: adv.advertiser_name,
        accessToken: token,
        refreshToken: "sandbox_refresh_token",
        tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30),
        shopId: shop.id,
        status: "ACTIVE"
      }
    });
    console.log(`- Connected Advertiser: "${dbAdv.name}" -> Shop: "${targetShopName}"`);
  }

  console.log("\n=== RESTORE COMPLETE AND SUCCESSFUL! ===");
}

main()
  .catch((e) => { console.error(e); })
  .finally(async () => { await prisma.$disconnect(); });
