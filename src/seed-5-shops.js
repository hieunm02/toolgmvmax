const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding 5 shops and 5 active advertisers...");

  // Find default user (admin@gmvmax.com)
  let user = await prisma.user.findUnique({
    where: { email: "admin@gmvmax.com" }
  });
  if (!user) {
    console.log("Admin user not found, creating default...");
    user = await prisma.user.create({
      data: {
        email: "admin@gmvmax.com",
        name: "GMV Max Admin",
        passwordHash: "$2a$10$U2e.jP559wM2W79xIq7nI.z8L1f8hQ47Y9aV0iM3D9tJ3c.RkQxTq", // mock hash
        role: "ADMIN"
      }
    });
  }

  // Define 5 shops
  const shopsData = [
    { name: "Alpha Fashion Shop", tiktokShopId: "TS_SHOP_ALPHA" },
    { name: "Beta Electronics Shop", tiktokShopId: "TS_SHOP_BETA" },
    { name: "Gamma Home Decor", tiktokShopId: "TS_SHOP_GAMMA" },
    { name: "Delta Cosmetics", tiktokShopId: "TS_SHOP_DELTA" },
    { name: "Epsilon Foods", tiktokShopId: "TS_SHOP_EPSILON" }
  ];

  const shops = [];
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
    shops.push(s);
    console.log(`- Upserted Shop: ${s.name} (${s.id})`);
  }


  // Keep ZFG | SẸO 10 TỶ | VND 2 as active (it belongs to Alpha Fashion Shop)
  await prisma.advertiser.updateMany({
    where: { advertiserId: "7562821854005297153" },
    data: { status: "ACTIVE" }
  });

  // Setup Advertisers for other shops
  const advertisersData = [
    { advertiserId: "ADV1002", name: "Beta GMV Max Brand Page", shopIndex: 1 },
    { advertiserId: "ADV1003", name: "Gamma Decor Ads Account", shopIndex: 2 },
    { advertiserId: "ADV1004", name: "Delta Cosmetics Ads Account", shopIndex: 3 },
    { advertiserId: "ADV1005", name: "Epsilon Foods Ads Account", shopIndex: 4 }
  ];

  const advertisers = [];
  for (const ad of advertisersData) {
    const targetShop = shops[ad.shopIndex];
    const a = await prisma.advertiser.upsert({
      where: { advertiserId: ad.advertiserId },
      update: { status: "ACTIVE", shopId: targetShop.id },
      create: {
        advertiserId: ad.advertiserId,
        name: ad.name,
        status: "ACTIVE",
        accessToken: `mock_access_token_${ad.advertiserId}`,
        refreshToken: `mock_refresh_token_${ad.advertiserId}`,
        tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30),
        shopId: targetShop.id
      }
    });
    advertisers.push(a);
    console.log(`- Upserted Advertiser: ${a.name} (${a.id}) linked to ${targetShop.name}`);
  }

  // Seed some campaigns and reports for ADV1002, ADV1003, ADV1004, ADV1005
  const campaignConfigs = [
    {
      advertiserId: "ADV1002",
      campaigns: [
        { campaignId: "CAMP_BETA_1", name: "Beta - Smart TV Launch", budget: 15000000 },
        { campaignId: "CAMP_BETA_2", name: "Beta - Wireless Earbuds Sale", budget: 5000000 }
      ]
    },
    {
      advertiserId: "ADV1003",
      campaigns: [
        { campaignId: "CAMP_GAMMA_1", name: "Gamma - Cozy Living Sofa Set", budget: 8000000 },
        { campaignId: "CAMP_GAMMA_2", name: "Gamma - Lighting Decor Offs", budget: 3000000 }
      ]
    },
    {
      advertiserId: "ADV1004",
      campaigns: [
        { campaignId: "CAMP_DELTA_1", name: "Delta - Organic Lipstick Promo", budget: 4000000 },
        { campaignId: "CAMP_DELTA_2", name: "Delta - Night Serum Skincare", budget: 6000000 }
      ]
    },
    {
      advertiserId: "ADV1005",
      campaigns: [
        { campaignId: "CAMP_EPSILON_1", name: "Epsilon - Organic Granola Pack", budget: 2000000 },
        { campaignId: "CAMP_EPSILON_2", name: "Epsilon - Fruit Basket Combo", budget: 2500000 }
      ]
    }
  ];

  const reportDates = ["2026-06-01", "2026-06-02"];

  for (const config of campaignConfigs) {
    const adv = await prisma.advertiser.findUnique({
      where: { advertiserId: config.advertiserId }
    });
    if (!adv) continue;

    for (const cData of config.campaigns) {
      const camp = await prisma.campaign.upsert({
        where: { campaignId: cData.campaignId },
        update: { name: cData.name, budget: cData.budget, status: "CAMPAIGN_STATUS_ENABLE" },
        create: {
          campaignId: cData.campaignId,
          name: cData.name,
          status: "CAMPAIGN_STATUS_ENABLE",
          objectiveType: "OUTFLOW_GMV_MAX",
          budget: cData.budget,
          budgetMode: "BUDGET_MODE_DAY",
          shoppingAdsType: "PRODUCT",
          advertiserId: adv.id
        }
      });
      console.log(`  * Upserted Campaign: ${camp.name}`);

      // Add reports for both dates
      for (const dStr of reportDates) {
        // Generate random performance metrics
        const spend = Math.round(500000 + Math.random() * 1500000); // 500k to 2M VND
        const gmv = Math.round(spend * (1.5 + Math.random() * 2)); // ROI 1.5 to 3.5
        const roi = spend > 0 ? gmv / spend : 0;
        const orders = Math.round(gmv / 150000); // avg price 150k
        const clicks = Math.round(orders * (5 + Math.random() * 10)); // 10% to 20% conversion rate
        const impressions = clicks * 15; // ~6.6% CTR
        const ctr = impressions > 0 ? clicks / impressions : 0;
        const conversionRate = clicks > 0 ? orders / clicks : 0;

        await prisma.campaignReport.upsert({
          where: {
            campaignId_date: {
              campaignId: camp.id,
              date: new Date(dStr)
            }
          },
          update: { spend, gmv, roi, orders, impressions, clicks, ctr, conversionRate },
          create: {
            campaignId: camp.id,
            date: new Date(dStr),
            spend,
            gmv,
            roi,
            orders,
            impressions,
            clicks,
            ctr,
            conversionRate
          }
        });
      }
      console.log(`    - Added reports for ${reportDates.join(", ")}`);
    }
  }

  // Also seed some products for the new shops to make products tab look nice
  const shopProducts = [
    { shopIndex: 1, productId: "PROD_BETA_1", name: "Sony Smart TV UltraHD 55\"", stock: 15, spend: 3000000, gmv: 9000000, orders: 1 },
    { shopIndex: 2, productId: "PROD_GAMMA_1", name: "Luxury Nordic Velvet Sofa 3-Seater", stock: 8, spend: 2000000, gmv: 6500000, orders: 1 },
    { shopIndex: 3, productId: "PROD_DELTA_1", name: "Retinol Anti-Aging Night Serum 30ml", stock: 50, spend: 1500000, gmv: 4500000, orders: 9 },
    { shopIndex: 4, productId: "PROD_EPSILON_1", name: "Premium Keto Granola - Honey & Nuts", stock: 100, spend: 800000, gmv: 2400000, orders: 12 }
  ];

  for (const p of shopProducts) {
    const shop = shops[p.shopIndex];
    const product = await prisma.product.upsert({
      where: { productId: p.productId },
      update: { name: p.name, stock: p.stock },
      create: {
        productId: p.productId,
        name: p.name,
        stock: p.stock,
        shopId: shop.id
      }
    });

    for (const dStr of reportDates) {
      await prisma.productReport.upsert({
        where: {
          productId_date: {
            productId: product.id,
            date: new Date(dStr)
          }
        },
        update: { spend: p.spend / 2, gmv: p.gmv / 2, roi: p.gmv / p.spend, orders: Math.round(p.orders / 2) },
        create: {
          productId: product.id,
          date: new Date(dStr),
          spend: p.spend / 2,
          gmv: p.gmv / 2,
          roi: p.gmv / p.spend,
          orders: Math.round(p.orders / 2)
        }
      });
    }
  }

  // Seed mock creatives and creative reports for all 5 shops
  console.log("\nSeeding mock creatives and creative reports for all shops...");
  const shopCreatives = [
    {
      shopIndex: 0,
      creatives: [
        { videoId: "VID_ALPHA_1", name: "Viral Fashion Trend Review - Summer Dress", spend: 1800000, gmv: 7200000, orders: 48, impressions: 50000, clicks: 3500 },
        { videoId: "VID_ALPHA_2", name: "Mix Match Outfits for College - Alpha Style", spend: 1200000, gmv: 1800000, orders: 12, impressions: 30000, clicks: 1200 }
      ]
    },
    {
      shopIndex: 1,
      creatives: [
        { videoId: "VID_BETA_1", name: "Sony Smart TV unboxing & audio test", spend: 4000000, gmv: 16000000, orders: 10, impressions: 80000, clicks: 4800 },
        { videoId: "VID_BETA_2", name: "Wireless Earbuds active ANC gym test", spend: 1500000, gmv: 4500000, orders: 30, impressions: 45000, clicks: 2250 }
      ]
    },
    {
      shopIndex: 2,
      creatives: [
        { videoId: "VID_GAMMA_1", name: "Aesthetic Room Makeover with Cozy Sofa", spend: 2500000, gmv: 10000000, orders: 8, impressions: 60000, clicks: 3600 },
        { videoId: "VID_GAMMA_2", name: "Lighting Decor ASMR Installation", spend: 800000, gmv: 700000, orders: 5, impressions: 20000, clicks: 600 }
      ]
    },
    {
      shopIndex: 3,
      creatives: [
        { videoId: "VID_DELTA_1", name: "Retinol Skincare Night Routine - Organic Serum", spend: 3000000, gmv: 12000000, orders: 80, impressions: 90000, clicks: 7200 },
        { videoId: "VID_DELTA_2", name: "Lipstick Swatches & Matte Test Delta", spend: 1000000, gmv: 950000, orders: 15, impressions: 35000, clicks: 1050 }
      ]
    },
    {
      shopIndex: 4,
      creatives: [
        { videoId: "VID_EPSILON_1", name: "Keto Granola Honey & Nuts Review Healthy Breakfast", spend: 1200000, gmv: 3600000, orders: 24, impressions: 28000, clicks: 1400 },
        { videoId: "VID_EPSILON_2", name: "Fruit Basket Unboxing Epsilon Fresh", spend: 600000, gmv: 300000, orders: 2, impressions: 15000, clicks: 300 }
      ]
    }
  ];

  for (const sc of shopCreatives) {
    const shop = shops[sc.shopIndex];
    // Find an active advertiser for this shop
    const advertiser = await prisma.advertiser.findFirst({
      where: { shopId: shop.id, status: "ACTIVE" }
    });

    if (!advertiser) {
      console.log(`  ! No active advertiser found for shop ${shop.name}, skipping creative seed for this shop`);
      continue;
    }

    for (const c of sc.creatives) {
      const creative = await prisma.creative.upsert({
        where: { videoId: c.videoId },
        update: { name: c.name, advertiserId: advertiser.id },
        create: {
          videoId: c.videoId,
          name: c.name,
          videoUrl: `https://www.tiktok.com/play/${c.videoId}`,
          advertiserId: advertiser.id
        }
      });
      console.log(`  * Upserted Creative: ${creative.name} for advertiser: ${advertiser.name}`);

      for (const dStr of reportDates) {
        const spend = c.spend / 2;
        const gmv = c.gmv / 2;
        const roi = spend > 0 ? gmv / spend : 0;
        const orders = Math.round(c.orders / 2);
        const impressions = Math.round(c.impressions / 2);
        const clicks = Math.round(c.clicks / 2);
        const ctr = impressions > 0 ? clicks / impressions : 0;

        await prisma.creativeReport.upsert({
          where: {
            videoId_date: {
              videoId: creative.id,
              date: new Date(dStr)
            }
          },
          update: { spend, gmv, roi, orders, impressions, clicks, ctr },
          create: {
            videoId: creative.id,
            date: new Date(dStr),
            spend,
            gmv,
            roi,
            orders,
            impressions,
            clicks,
            ctr
          }
        });
      }
      console.log(`    - Added creative reports for ${reportDates.join(", ")}`);
    }
  }

  console.log("\nDatabase successfully seeded with 5 shops, campaigns, products, and creative report data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

