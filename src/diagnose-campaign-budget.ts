import { prisma } from "./lib/db";
import { getVietnamDateString } from "./lib/date-utils";

async function main() {
  const todayStr = getVietnamDateString();
  console.log(`=== DIAGNOSING BUDGET INCREASE RULE (RULE 7) ===`);
  console.log(`Target Date: ${todayStr}`);

  // Fetch all active daily campaigns with today's reports
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "CAMPAIGN_STATUS_ENABLE",
      budgetMode: "BUDGET_MODE_DAY",
    },
    include: {
      advertiser: true,
      reports: {
        where: {
          date: new Date(todayStr),
        },
      },
    },
  });

  console.log(`Found ${campaigns.length} active daily campaigns in local DB.`);

  for (const campaign of campaigns) {
    const campSpend = campaign.reports.reduce((sum, r) => sum + r.spend, 0);
    const campGmv = campaign.reports.reduce((sum, r) => sum + r.gmv, 0);
    const campRoi = campSpend > 0 ? campGmv / campSpend : 0;
    const campBudget = campaign.budget;
    const isUsd = campBudget < 5000;

    console.log(`\n----------------------------------------`);
    console.log(`Campaign: "${campaign.name}" (${campaign.campaignId})`);
    console.log(`- Budget: ${isUsd ? '$' + campBudget : campBudget.toLocaleString() + 'đ'}`);
    console.log(`- Spend today (DB): ${isUsd ? '$' + campSpend : campSpend.toLocaleString() + 'đ'}`);
    console.log(`- GMV today (DB): ${isUsd ? '$' + campGmv : campGmv.toLocaleString() + 'đ'}`);
    console.log(`- ROI today (DB): ${campRoi.toFixed(2)}x`);

    // Condition 1: Spend >= 85% of budget
    const exhaustionThreshold = 0.85 * campBudget;
    const isExhausted = campSpend >= exhaustionThreshold;
    console.log(`- Condition 1 (Spend >= 85% of budget): ${isExhausted ? '✅ PASS' : '❌ FAIL'} (Spend: ${campSpend} vs Threshold: ${exhaustionThreshold.toFixed(2)})`);

    // Condition 2: ROI > 3.0
    const isRoiGood = campRoi > 3.0;
    console.log(`- Condition 2 (ROI > 3.0): ${isRoiGood ? '✅ PASS' : '❌ FAIL'} (ROI: ${campRoi.toFixed(2)}x vs Threshold: 3.00x)`);

    // Condition 3: Rate limit (last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentIncrease = await prisma.alert.findFirst({
      where: {
        type: "BUDGET_AUTO_INCREASED",
        createdAt: { gte: thirtyMinutesAgo },
        message: { contains: `[CAMPAIGN_ID:${campaign.campaignId}]` },
      },
    });
    console.log(`- Condition 3 (No recent increase in 30m): ${!recentIncrease ? '✅ PASS' : '❌ FAIL'} (${recentIncrease ? 'Increased at ' + recentIncrease.createdAt.toISOString() : 'None'})`);

    if (isExhausted && isRoiGood && !recentIncrease) {
      console.log(`- RESULT: Campaign is eligible for budget increase!`);
    } else {
      console.log(`- RESULT: Not eligible for budget increase.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
