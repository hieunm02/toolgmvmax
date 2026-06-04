import { AlertRepository } from "../repository/alert";
import { ShopRepository } from "../repository/shop";
import { CampaignRepository } from "../repository/campaign";
import { ProductRepository } from "../repository/product";
import { sendTelegramAlert } from "../lib/telegram";
import { logger } from "../lib/logger";
import { prisma } from "../lib/db";
import { CampaignRelaunchService } from "./relaunch";

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

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // 1. Get Campaign stats for today and yesterday
    const todayCampaigns = await CampaignRepository.getCampaignsWithStats({
      shopId: shop.id,
      startDate: new Date(today.toISOString().split("T")[0]),
      endDate: new Date(today.toISOString().split("T")[0]),
    });

    const yesterdayCampaigns = await CampaignRepository.getCampaignsWithStats({
      shopId: shop.id,
      startDate: new Date(yesterday.toISOString().split("T")[0]),
      endDate: new Date(yesterday.toISOString().split("T")[0]),
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

    // Rule 3: Spend exceeds threshold without orders
    const spendThreshold = 100.0; // Configurable threshold ($100)
    for (const campaign of todayCampaigns) {
      const campSpend = campaign.reports.reduce((sum, r) => sum + r.spend, 0);
      const campOrders = campaign.reports.reduce((sum, r) => sum + r.orders, 0);

      if (campSpend > spendThreshold && campOrders === 0) {
        const message = `Campaign "${campaign.name}" (${campaign.campaignId}) spent $${campSpend.toFixed(2)} with 0 orders.`;
        
        await this.triggerAlert(shop.id, shop.name, "SPEND_NO_ORDERS", message, `SPEND > $${spendThreshold} AND ORDERS == 0`, campSpend);
      }
    }

    // Rule 5: Automatic pause and relaunch for active campaigns with ROI < 3.0 and Spend >= 200,000 VND (with < 20 orders)
    for (const campaign of todayCampaigns) {
      if (campaign.status !== "CAMPAIGN_STATUS_ENABLE") continue;

      const campSpend = campaign.reports.reduce((sum, r) => sum + r.spend, 0);
      const campGmv = campaign.reports.reduce((sum, r) => sum + r.gmv, 0);
      const campRoi = campSpend > 0 ? campGmv / campSpend : 0;
      const campOrders = campaign.reports.reduce((sum, r) => sum + r.orders, 0);

      if (campSpend >= 200000 && campRoi < 3.0) {
        if (campOrders >= 20) continue; // Safety guard: ignore if campaign has >= 20 orders today

        logger.info(`Auto-relaunching campaign ${campaign.campaignId} due to low ROI (${campRoi.toFixed(2)}x) and spend (${campSpend.toLocaleString('vi-VN')}đ)`);

        const relaunchResult = await CampaignRelaunchService.relaunchCampaign(campaign.campaignId);

        if (relaunchResult.success) {
          const message = `Tự động tạm dừng chiến dịch "${campaign.name}" (${campaign.campaignId}) và khởi tạo chiến dịch mới tương tự V2 (${relaunchResult.newCampaignId}) do ROI thấp: ${campRoi.toFixed(2)}x (Chi tiêu: ${campSpend.toLocaleString('vi-VN')}đ, Đơn hàng: ${campOrders}). [CAMPAIGN_ID:${campaign.campaignId}]`;
          
          await this.triggerAlert(shop.id, shop.name, "LOW_ROI_AUTO_RELAUNCHED", message, "ROI < 3.0 AND SPEND >= 200000 AND ORDERS < 20", campRoi);
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

    // Rule 6: Low spend in 30 minutes warning (Active campaigns spending < 100,000 VND in the last 30 minutes)
    for (const campaign of todayCampaigns) {
      if (campaign.status !== "CAMPAIGN_STATUS_ENABLE") continue;

      // Skip newly created campaigns (created in the last 30 minutes)
      const campaignAgeMs = Date.now() - new Date(campaign.createdAt).getTime();
      if (campaignAgeMs < 30 * 60 * 1000) continue;

      // Find the latest snapshot for this campaign
      const latestSnap = await prisma.campaignSpendSnapshot.findFirst({
        where: { campaignId: campaign.id },
        orderBy: { timestamp: "desc" },
      });

      if (!latestSnap) continue;

      // Find snapshot from 30 minutes ago
      const targetTime = new Date(latestSnap.timestamp.getTime() - 30 * 60 * 1000);
      const snap30m = await prisma.campaignSpendSnapshot.findFirst({
        where: {
          campaignId: campaign.id,
          timestamp: { lte: targetTime },
        },
        orderBy: { timestamp: "desc" },
      });

      let spend30m = 0;
      if (snap30m) {
        const currDateStr = latestSnap.timestamp.toISOString().split("T")[0];
        const prevDateStr = snap30m.timestamp.toISOString().split("T")[0];

        if (currDateStr === prevDateStr) {
          spend30m = Math.max(0, latestSnap.spend - snap30m.spend);
        } else {
          spend30m = latestSnap.spend;
        }
      } else {
        spend30m = latestSnap.spend;
      }

      if (spend30m < 100000) {
        // Check if we sent a LOW_SPEND_30M alert for this campaign in the last 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentAlertExists = await prisma.alert.findFirst({
          where: {
            shopId: shop.id,
            type: "LOW_SPEND_30M",
            createdAt: { gte: oneHourAgo },
            message: { contains: `[CAMPAIGN_ID:${campaign.campaignId}]` },
          },
        });

        if (!recentAlertExists) {
          const message = `Chiến dịch "${campaign.name}" (${campaign.campaignId}) chi tiêu chậm: chỉ tiêu ${spend30m.toLocaleString('vi-VN')}đ trong 30 phút qua. [CAMPAIGN_ID:${campaign.campaignId}]`;
          
          await this.triggerAlert(
            shop.id,
            shop.name,
            "LOW_SPEND_30M",
            message,
            "ACTIVE_SPEND_30M < 100000",
            spend30m
          );
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
