import { AlertRepository } from "../repository/alert";
import { ShopRepository } from "../repository/shop";
import { CampaignRepository } from "../repository/campaign";
import { ProductRepository } from "../repository/product";
import { sendTelegramAlert } from "../lib/telegram";
import { logger } from "../lib/logger";
import { prisma } from "../lib/db";
import { CampaignRelaunchService } from "./relaunch";
import { TikTokApiService } from "../lib/tiktok";

import { getVietnamDate, getVietnamYesterdayDate } from "../lib/date-utils";

export class AlertEngineService {
  // Evaluates performance alert rules for a specific shop
  static async evaluateShopAlerts(shopId: string): Promise<void> {
    const shop = await ShopRepository.findById(shopId);
    if (!shop) {
      logger.warn(`Shop with id ${shopId} not found. Skipping alerts evaluation.`);
      return;
    }

    logger.info(`Evaluating alert rules for shop: ${shop.name}`);

    const unresolvedAlerts = await AlertRepository.listUnresolvedAlertsByShop(shop.id);

    const today = getVietnamDate();
    const yesterday = getVietnamYesterdayDate();

    // 1. Get Campaign stats for today and yesterday
    const todayCampaigns = await CampaignRepository.getCampaignsWithStats({
      shopId: shop.id,
      startDate: today,
      endDate: today,
    });

    const yesterdayCampaigns = await CampaignRepository.getCampaignsWithStats({
      shopId: shop.id,
      startDate: yesterday,
      endDate: yesterday,
    });

    // Calculate aggregated metrics for ROI/GMV comparison
    let todaySpend = 0;
    let todayGMV = 0;
    let todayOrders = 0;

    let yesterdaySpend = 0;
    let yesterdayGMV = 0;

    for (const c of todayCampaigns) {
      for (const r of c.reports) {
        todaySpend += r.spend;
        todayGMV += r.gmv;
        todayOrders += r.orders;
      }
    }

    for (const c of yesterdayCampaigns) {
      for (const r of c.reports) {
        yesterdaySpend += r.spend;
        yesterdayGMV += r.gmv;
      }
    }

    // Rule 1 (ROI_DROP) and Rule 2 (GMV_DROP) have been disabled completely at user request
    // to avoid redundant notifications and morning false alarms.
    /*
    const todayROI = todaySpend > 0 ? todayGMV / todaySpend : 0;
    const yesterdayROI = yesterdaySpend > 0 ? yesterdayGMV / yesterdaySpend : 0;

    // Rule 1: ROI drops more than 20%
    if (yesterdayROI > 0) {
      const roiChange = (todayROI - yesterdayROI) / yesterdayROI;
      if (roiChange < -0.2) {
        const dropPercent = Math.abs(roiChange * 100).toFixed(1);
        const message = `Shop ROI dropped by ${dropPercent}% compared to yesterday. Yesterday: ${yesterdayROI.toFixed(2)}, Today: ${todayROI.toFixed(2)}.`;
        
        await this.triggerAlert(shop.id, shop.name, "ROI_DROP", message, "ROI_CHANGE < -20%", roiChange);
      }
    }

    // Rule 2: GMV drops more than 30%
    if (yesterdayGMV > 0) {
      const gmvChange = (todayGMV - yesterdayGMV) / yesterdayGMV;
      if (gmvChange < -0.3) {
        const dropPercent = Math.abs(gmvChange * 100).toFixed(1);
        const message = `Shop GMV dropped by ${dropPercent}% compared to yesterday. Yesterday: $${yesterdayGMV.toFixed(2)}, Today: $${todayGMV.toFixed(2)}.`;
        
        await this.triggerAlert(shop.id, shop.name, "GMV_DROP", message, "GMV_CHANGE < -30%", gmvChange);
      }
    }
    */

    // Rule 3 (Spend exceeds threshold without orders) has been disabled to avoid redundant alerts.
    // Since Rule 5 (Auto-relaunch) automatically handles campaigns with high spend and low/zero ROI (0 orders),
    // Rule 3 is redundant and creates duplicate Telegram notifications.
    /*
    const isVND = (shop.autoRelaunchMinSpend ?? 200000) > 1000;
    const spendThreshold = isVND ? (shop.autoRelaunchMinSpend ?? 200000) : 100.0;
    for (const campaign of todayCampaigns) {
      const campSpend = campaign.reports.reduce((sum, r) => sum + r.spend, 0);
      const campOrders = campaign.reports.reduce((sum, r) => sum + r.orders, 0);

      if (campSpend > spendThreshold && campOrders === 0) {
        const formattedSpend = isVND 
          ? `${campSpend.toLocaleString('vi-VN')}đ` 
          : `$${campSpend.toFixed(2)}`;
        const formattedThreshold = isVND
          ? `${spendThreshold.toLocaleString('vi-VN')}đ`
          : `$${spendThreshold}`;

        const message = `Campaign "${campaign.name}" (${campaign.campaignId}) spent ${formattedSpend} with 0 orders.`;
        
        await this.triggerAlert(shop.id, shop.name, "SPEND_NO_ORDERS", message, `SPEND > ${formattedThreshold} AND ORDERS == 0`, campSpend);
      }
    }
    */

    // Rule 5: Automatic pause and relaunch for active campaigns with ROI < shop.autoRelaunchRoiThreshold and Spend >= shop.autoRelaunchMinSpend (with < shop.autoRelaunchMaxOrders orders)
    const roiThreshold = shop.autoRelaunchRoiThreshold ?? 3.0;
    const minSpend = shop.autoRelaunchMinSpend ?? 200000.0;
    const maxOrders = shop.autoRelaunchMaxOrders ?? 20;

    for (const campaign of todayCampaigns) {
      if (campaign.status !== "CAMPAIGN_STATUS_ENABLE") continue;

      const campSpend = campaign.reports.reduce((sum, r) => sum + r.spend, 0);
      const campGmv = campaign.reports.reduce((sum, r) => sum + r.gmv, 0);
      const campRoi = campSpend > 0 ? campGmv / campSpend : 0;
      const campOrders = campaign.reports.reduce((sum, r) => sum + r.orders, 0);

      if (campSpend >= minSpend && campRoi < roiThreshold) {
        if (campOrders >= maxOrders) continue; // Safety guard: ignore if campaign has >= maxOrders orders today

        logger.info(`Auto-relaunching campaign ${campaign.campaignId} due to low ROI (${campRoi.toFixed(2)}x, threshold: ${roiThreshold.toFixed(1)}x), spend (${campSpend.toLocaleString('vi-VN')}đ, threshold: ${minSpend.toLocaleString('vi-VN')}đ) and orders (${campOrders}, threshold: < ${maxOrders})`);

        const relaunchResult = await CampaignRelaunchService.relaunchCampaign(campaign.campaignId);

        if (relaunchResult.success) {
          const message = `Tự động tạm dừng chiến dịch "${campaign.name}" (${campaign.campaignId}) và khởi tạo chiến dịch mới tương tự V2 (${relaunchResult.newCampaignId}) do ROI thấp: ${campRoi.toFixed(2)}x (Mức cấu hình: < ${roiThreshold.toFixed(1)}x, Chi tiêu: ${campSpend.toLocaleString('vi-VN')}đ, Đơn hàng: ${campOrders}). [CAMPAIGN_ID:${campaign.campaignId}]`;
          
          await this.triggerAlert(shop.id, shop.name, "LOW_ROI_AUTO_RELAUNCHED", message, `ROI < ${roiThreshold.toFixed(1)} AND SPEND >= ${minSpend} AND ORDERS < ${maxOrders}`, campRoi);
        } else {
          logger.error(`Failed to auto-relaunch campaign ${campaign.campaignId}: ${relaunchResult.error}`);
        }
      }
    }

    // Rule 4: Product stock warning
    const products = await ProductRepository.getProductsWithStats({ shopId: shop.id });
    for (const product of products) {
      if (product.stock <= 5) {
        const message = `Product "${product.name}" (SKU: ${product.sku || "N/A"}) is low in stock: ${product.stock} items remaining.`;
        
        await this.triggerAlert(shop.id, shop.name, "LOW_STOCK", message, "STOCK <= 5", product.stock);
      }
    }

    // Rule 6 (Low spend in 30 minutes warning) was disabled at user request.
    // Spend speed reports are now triggered manually via the Telegram /tocdo command.


    // Rule 7: Automatic budget increase when budget is almost exhausted and ROI > 3
    for (const campaign of todayCampaigns) {
      if (campaign.status !== "CAMPAIGN_STATUS_ENABLE") continue;
      if (campaign.budgetMode !== "BUDGET_MODE_DAY") continue;

      const campSpend = campaign.reports.reduce((sum, r) => sum + r.spend, 0);
      const campGmv = campaign.reports.reduce((sum, r) => sum + r.gmv, 0);
      const campRoi = campSpend > 0 ? campGmv / campSpend : 0;
      const campBudget = campaign.budget;

      // Budget is almost exhausted: spend >= 85% of budget
      if (campSpend >= 0.85 * campBudget && campRoi > 3.0) {
        // Rate-limit check: only once per 30 minutes
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const recentIncreaseExists = await prisma.alert.findFirst({
          where: {
            shopId: shop.id,
            type: "BUDGET_AUTO_INCREASED",
            createdAt: { gte: thirtyMinutesAgo },
            message: { contains: `[CAMPAIGN_ID:${campaign.campaignId}]` },
          },
        });

        if (!recentIncreaseExists) {
          const newBudget = campBudget + 500000;
          logger.info(`Auto-increasing budget for campaign ${campaign.campaignId} by 500k to ${newBudget} due to exhaustion and ROI > 3 (${campRoi.toFixed(2)}x)`);

          try {
            const { accessToken, advertiserId } = campaign.advertiser;
            await TikTokApiService.updateCampaignBudget(
              accessToken,
              advertiserId,
              campaign.campaignId,
              newBudget,
              campaign.objectiveType
            );

            // Update budget in local database
            await prisma.campaign.update({
              where: { campaignId: campaign.campaignId },
              data: { budget: newBudget }
            });

            const message = `Tự động tăng ngân sách chiến dịch "${campaign.name}" (${campaign.campaignId}) thêm 500.000đ (Ngân sách mới: ${newBudget.toLocaleString('vi-VN')}đ) do ngân sách cũ gần hết (${campSpend.toLocaleString('vi-VN')}đ / ${campBudget.toLocaleString('vi-VN')}đ) và ROI đạt: ${campRoi.toFixed(2)}x. [CAMPAIGN_ID:${campaign.campaignId}]`;

            await this.triggerAlert(
              shop.id,
              shop.name,
              "BUDGET_AUTO_INCREASED",
              message,
              "ACTIVE_BUDGET_EXHAUSTED >= 85% AND ROI > 3.0",
              campRoi
            );
          } catch (e: any) {
            logger.error(`Failed to auto-increase budget for campaign ${campaign.campaignId}: ${e.message}`);
          }
        }
      }
    }
  }

  private static async triggerAlert(
    shopId: string,
    shopName: string,
    type: string,
    message: string,
    rule: string,
    value: number
  ): Promise<void> {
    logger.warn(`Alert triggered for ${shopName}: ${message}`);
    
    // Save to Database
    await AlertRepository.createAlert({
      shopId,
      type,
      message,
      rule,
      triggerValue: value,
    });

    // Send to Telegram
    await sendTelegramAlert({
      type,
      message,
      shopName,
      rule,
      value,
    });
  }
}
export default AlertEngineService;
