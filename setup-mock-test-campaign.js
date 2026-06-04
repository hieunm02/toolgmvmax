const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== SETTING UP SAFE MOCK TEST CAMPAIGN ===");

  // Find shop 'Mụn'
  const shop = await prisma.shop.findFirst({
    where: { name: "Mụn" }
  });

  if (!shop) {
    console.error("Shop 'Mụn' not found!");
    process.exit(1);
  }

  // Create mock advertiser
  const advertiser = await prisma.advertiser.upsert({
    where: { advertiserId: "ADV_TEST" },
    update: { status: "ACTIVE", shopId: shop.id },
    create: {
      advertiserId: "ADV_TEST",
      name: "Test Mock Ads Account",
      status: "ACTIVE",
      accessToken: "mock_access_token_test",
      refreshToken: "mock_refresh_token_test",
      tokenExpiresAt: new Date(Date.now() + 86400 * 1000 * 30),
      shopId: shop.id
    }
  });

  console.log(`Created mock advertiser: ${advertiser.name} (${advertiser.advertiserId})`);

  // Create mock campaign
  const campaign = await prisma.campaign.upsert({
    where: { campaignId: "CAMP_TEST" },
    update: { status: "CAMPAIGN_STATUS_ENABLE", name: "Test Low-ROI Campaign", advertiserId: advertiser.id },
    create: {
      campaignId: "CAMP_TEST",
      name: "Test Low-ROI Campaign",
      status: "CAMPAIGN_STATUS_ENABLE",
      objectiveType: "OUTFLOW_GMV_MAX",
      budget: 500000,
      budgetMode: "BUDGET_MODE_DAY",
      advertiserId: advertiser.id
    }
  });

  console.log(`Created mock campaign: ${campaign.name} (${campaign.campaignId})`);

  // Create low ROI report for today
  const todayStr = new Date().toISOString().split("T")[0];
  const date = new Date(todayStr);

  const report = await prisma.campaignReport.upsert({
    where: {
      campaignId_date: {
        campaignId: campaign.id,
        date
      }
    },
    update: {
      spend: 250000,
      gmv: 100000,
      roi: 0.4,
      orders: 2,
      impressions: 10000,
      clicks: 500,
      ctr: 0.05,
      conversionRate: 0.004
    },
    create: {
      campaignId: campaign.id,
      date,
      spend: 250000,
      gmv: 100000,
      roi: 0.4,
      orders: 2,
      impressions: 10000,
      clicks: 500,
      ctr: 0.05,
      conversionRate: 0.004
    }
  });

  console.log(`Upserted low-ROI report: spend=${report.spend}, gmv=${report.gmv}, roi=${report.roi}`);

  // Run AlertEngine
  const { AlertEngineService } = require("./src/service/alert-engine");
  await AlertEngineService.evaluateShopAlerts(shop.id);

  // Find the created alert
  const alert = await prisma.alert.findFirst({
    where: {
      shopId: shop.id,
      type: "LOW_ROI_RELAUNCH_RECOMMENDATION",
      status: "UNRESOLVED",
      message: { contains: "CAMP_TEST" }
    }
  });

  if (alert) {
    console.log(`\nLOW_ROI alert created successfully!`);
    console.log(`- Alert ID: ${alert.id}`);
    console.log(`- Campaign ID: CAMP_TEST`);
    console.log(`- Message: ${alert.message}`);
  } else {
    console.log("Failed to find the alert.");
  }

  console.log("\n=== SAFE MOCK SETUP COMPLETED ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
