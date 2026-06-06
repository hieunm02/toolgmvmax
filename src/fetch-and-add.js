const { PrismaClient } = require("@prisma/client");
const https = require("https");

const prisma = new PrismaClient();

function getAdvertiserInfo(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "business-api.tiktok.com",
      path: "/open_api/v1.3/advertiser/info/",
      method: "GET",
      headers: {
        "Access-Token": token
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.end();
  });
}

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error("Vui lòng cung cấp Access Token làm đối số! Ví dụ: docker compose exec web node src/fetch-and-add.js <ACCESS_TOKEN>");
    process.exit(1);
  }
  console.log("Calling TikTok API to automatically retrieve Advertiser ID associated with this token...");

  try {
    const resData = await getAdvertiserInfo(token);
    console.log("TikTok API response:", JSON.stringify(resData));

    if (resData.code !== 0) {
      console.error("TikTok API error:", resData.message);
      process.exit(1);
    }

    const advertiserList = resData.data.list || [];
    if (advertiserList.length === 0) {
      console.error("No advertiser accounts found for this token.");
      process.exit(1);
    }

    // Lấy shop đã được cấu hình trong DB để kết nối
    const shop = await prisma.shop.findFirst();
    if (!shop) {
      console.error("No shop registered in database. Run seeding first.");
      process.exit(1);
    }

    console.log(`\nFound ${advertiserList.length} advertiser accounts. Inserting into DB under shop: ${shop.name}...`);

    for (const adv of advertiserList) {
      const dbAdv = await prisma.advertiser.upsert({
        where: { advertiserId: adv.advertiser_id },
        update: {
          name: adv.advertiser_name,
          accessToken: token,
          tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30) // 30 days
        },
        create: {
          advertiserId: adv.advertiser_id,
          name: adv.advertiser_name,
          accessToken: token,
          refreshToken: "sandbox_refresh_token",
          tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30),
          shopId: shop.id
        }
      });
      console.log(`- Inserted: ${dbAdv.name} (ID: ${dbAdv.advertiserId})`);
    }

    console.log("\nDATABASE UPDATE SUCCESSFUL!");
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
