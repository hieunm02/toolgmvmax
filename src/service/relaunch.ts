import { prisma } from "../lib/db";
import { TikTokApiService } from "../lib/tiktok";
import { CampaignRepository } from "../repository/campaign";
import { AlertRepository } from "../repository/alert";
import { logger } from "../lib/logger";

import { getVietnamDateString } from "../lib/date-utils";

export class CampaignRelaunchService {
  static async relaunchCampaign(
    campaignId: string,
    alertId?: string,
    customBudget?: number,
    customRoasBid?: number,
    force?: boolean
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

      // Real-time verification: check if this GMV Max campaign is already disabled or renamed on TikTok
      if (oldCampaign.objectiveType === "OUTFLOW_GMV_MAX") {
        try {
          const infoUrl = `${TikTokApiService.getBaseUrl()}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${campaignId}`;
          const infoRes = await fetch(infoUrl, {
            headers: { "Access-Token": accessToken },
            signal: AbortSignal.timeout(8000),
          });
          const infoData = await infoRes.json();
          if (infoData.code === 0 && infoData.data) {
            const config = infoData.data;

            // Sync current name from TikTok if changed
            if (config.campaign_name && config.campaign_name !== oldCampaign.name) {
              await prisma.campaign.update({
                where: { campaignId },
                data: { name: config.campaign_name },
              });
              oldCampaign.name = config.campaign_name;
            }

            // Guard: If campaign was already manually disabled on TikTok Ads Manager and this is auto-relaunch (!force)
            if (config.operation_status === "DISABLE" && !force) {
              logger.warn(`Campaign ${campaignId} (${oldCampaign.name}) is already DISABLED on TikTok Ads Manager. Skipping auto-relaunch.`);
              await prisma.campaign.update({
                where: { campaignId },
                data: { status: "CAMPAIGN_STATUS_DISABLE" },
              });
              return {
                success: false,
                error: `Chiến dịch "${oldCampaign.name}" đã được tắt trên TikTok Ads Manager từ trước. Đã đồng bộ trạng thái tắt.`,
              };
            }
          }
        } catch (checkErr) {
          logger.warn(`Could not verify TikTok real-time campaign status: ${checkErr}`);
        }
      }

      // Check safety rules: less than 20 orders today (unless forced by manual user action)
      const todayStr = getVietnamDateString();
      const reportToday = await prisma.campaignReport.findFirst({
        where: {
          campaignId: oldCampaign.id,
          date: new Date(todayStr),
        },
      });

      const ordersToday = reportToday ? reportToday.orders : 0;
      if (!force && ordersToday >= 20) {
        logger.warn(`Relaunch blocked by safety rule: Campaign ${campaignId} has ${ordersToday} orders today.`);
        return {
          success: false,
          error: `Chiến dịch này đã đạt ${ordersToday} đơn hàng hôm nay. Quy tắc bảo vệ: Không được phép tắt chiến dịch đạt từ 20 đơn hàng trở lên.`
        };
      }

      // 2. Pause the old campaign on TikTok Ads
      let oldCampaignWasPaused = false;
      try {
        logger.info(`Pausing old campaign ${campaignId} via TikTok API`);
        await TikTokApiService.pauseCampaign(accessToken, advertiserId, campaignId);
        oldCampaignWasPaused = true;

        // Update old campaign status in database
        await prisma.campaign.update({
          where: { campaignId },
          data: { status: "CAMPAIGN_STATUS_DISABLE" },
        });

        // Wait 5 seconds
        logger.info("Waiting 5 seconds for TikTok Ads to release identity/store...");
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // 3. Clone and create new campaign with auto-retry
        logger.info(`Cloning campaign ${campaignId} configuration to create new campaign`);
        let clonedCampaign: { campaignId: string; name: string } | null = null;
        let lastCloneError: any = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            clonedCampaign = await TikTokApiService.cloneCampaign(accessToken, advertiserId, {
              campaignId: oldCampaign.campaignId,
              name: oldCampaign.name,
              objectiveType: oldCampaign.objectiveType,
              budget: customBudget !== undefined ? customBudget : oldCampaign.budget,
              budgetMode: oldCampaign.budgetMode,
              shoppingAdsType: oldCampaign.shoppingAdsType,
              roasBid: customRoasBid,
            });
            if (clonedCampaign && clonedCampaign.campaignId) {
              break;
            }
          } catch (cloneErr: any) {
            lastCloneError = cloneErr;
            logger.warn(`Attempt ${attempt}/2 to clone campaign ${campaignId} failed: ${cloneErr.message}`);
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          }
        }

        if (!clonedCampaign || !clonedCampaign.campaignId) {
          throw lastCloneError || new Error("Failed to clone campaign after retries");
        }

        // 4. Save new campaign in database
        const newCampRecord = await CampaignRepository.upsertCampaign({
          campaignId: clonedCampaign.campaignId,
          name: clonedCampaign.name,
          status: "CAMPAIGN_STATUS_ENABLE",
          objectiveType: oldCampaign.objectiveType,
          budget: customBudget !== undefined ? customBudget : oldCampaign.budget,
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
      } catch (innerErr: any) {
        // SAFETY ROLLBACK: If we paused the old campaign but failed to create the new one,
        // IMMEDIATELY re-enable the old campaign so advertising delivery never stays stopped!
        if (oldCampaignWasPaused) {
          logger.warn(`ROLLBACK TRIGGERED: Re-enabling old campaign ${campaignId} (${oldCampaign.name}) on TikTok to prevent delivery blackout!`);
          try {
            await TikTokApiService.updateCampaignStatus(accessToken, advertiserId, campaignId, "ENABLE");
            await prisma.campaign.update({
              where: { campaignId },
              data: { status: "CAMPAIGN_STATUS_ENABLE" },
            });
            logger.info(`Rollback successfully completed: Campaign ${campaignId} is back ONLINE.`);
          } catch (rollbackErr: any) {
            logger.error(`FATAL: Could not re-enable old campaign ${campaignId} during rollback: ${rollbackErr.message}`, rollbackErr);
          }
        }
        throw innerErr;
      }
    } catch (e: any) {
      logger.error("Relaunch service failed", e);
      return { success: false, error: e.message };
    }
  }
}
export default CampaignRelaunchService;
