import { prisma } from "../lib/db";
import { TikTokApiService } from "../lib/tiktok";
import { CampaignRepository } from "../repository/campaign";
import { AlertRepository } from "../repository/alert";
import { logger } from "../lib/logger";

export class CampaignRelaunchService {
  static async relaunchCampaign(
    campaignId: string,
    alertId?: string
  ): Promise<{ success: boolean; newCampaignId?: string; error?: string }> {
    try {
      logger.info(`Campaign Relaunch Service triggered for campaign ID: ${campaignId}`);

      // 1. Fetch the old campaign details including the advertiser credentials
      const oldCampaign = await prisma.campaign.findUnique({
        where: { campaignId },
        include: {
          advertiser: {
            include: {
              shop: true,
            },
          },
        },
      });

      if (!oldCampaign) {
        return { success: false, error: `Campaign not found with ID ${campaignId}` };
      }

      const { accessToken, advertiserId } = oldCampaign.advertiser;

      // Check safety rules: less than 20 orders today
      const todayStr = new Date().toISOString().split("T")[0];
      const reportToday = await prisma.campaignReport.findFirst({
        where: {
          campaignId: oldCampaign.id,
          date: new Date(todayStr),
        },
      });

      const ordersToday = reportToday ? reportToday.orders : 0;
      if (ordersToday >= 20) {
        logger.warn(`Relaunch blocked by safety rule: Campaign ${campaignId} has ${ordersToday} orders today.`);
        return {
          success: false,
          error: `Chiến dịch này đã đạt ${ordersToday} đơn hàng hôm nay. Quy tắc bảo vệ: Không được phép tắt chiến dịch đạt từ 20 đơn hàng trở lên.`
        };
      }

      // 2. Pause the old campaign on TikTok Ads
      logger.info(`Pausing old campaign ${campaignId} via TikTok API`);
      await TikTokApiService.pauseCampaign(accessToken, advertiserId, campaignId);

      // Update old campaign status in database
      await prisma.campaign.update({
        where: { campaignId },
        data: { status: "CAMPAIGN_STATUS_DISABLE" },
      });

      // Wait 5 seconds
      logger.info("Waiting 5 seconds for TikTok Ads to release identity/store...");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 3. Clone and create new campaign
      logger.info(`Cloning campaign ${campaignId} configuration to create new campaign`);
      const clonedCampaign = await TikTokApiService.cloneCampaign(accessToken, advertiserId, {
        campaignId: oldCampaign.campaignId,
        name: oldCampaign.name,
        objectiveType: oldCampaign.objectiveType,
        budget: oldCampaign.budget,
        budgetMode: oldCampaign.budgetMode,
        shoppingAdsType: oldCampaign.shoppingAdsType,
      });

      // 4. Save new campaign in database
      const newCampRecord = await CampaignRepository.upsertCampaign({
        campaignId: clonedCampaign.campaignId,
        name: clonedCampaign.name,
        status: "CAMPAIGN_STATUS_ENABLE",
        objectiveType: oldCampaign.objectiveType,
        budget: oldCampaign.budget,
        budgetMode: oldCampaign.budgetMode,
        advertiserId: oldCampaign.advertiserId,
        shoppingAdsType: oldCampaign.shoppingAdsType || "PRODUCT",
      });

      // 5. Initialize an empty performance report for today
      await CampaignRepository.upsertCampaignReport({
        campaignId: newCampRecord.id,
        date: new Date(todayStr),
        spend: 0,
        gmv: 0,
        roi: 0,
        orders: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        conversionRate: 0,
      });

      // 6. Resolve related Alerts
      if (alertId) {
        await AlertRepository.resolveAlert(alertId);
      }

      const relatedAlerts = await prisma.alert.findMany({
        where: {
          status: "UNRESOLVED",
          type: "LOW_ROI_RELAUNCH_RECOMMENDATION",
          message: { contains: `[CAMPAIGN_ID:${campaignId}]` },
        },
      });

      for (const a of relatedAlerts) {
        await AlertRepository.resolveAlert(a.id);
      }

      logger.info(`Successfully relaunched campaign ${campaignId} into new campaign ${clonedCampaign.campaignId}`);

      return {
        success: true,
        newCampaignId: clonedCampaign.campaignId,
      };
    } catch (e: any) {
      logger.error("Relaunch service failed", e);
      return { success: false, error: e.message };
    }
  }
}
export default CampaignRelaunchService;
