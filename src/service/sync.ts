import { ShopRepository } from "../repository/shop";
import { CampaignRepository } from "../repository/campaign";
import { ProductRepository } from "../repository/product";
import { CreativeRepository } from "../repository/creative";
import { TikTokApiService } from "../lib/tiktok";
import { AlertEngineService } from "./alert-engine";
import { logger } from "../lib/logger";
import { prisma } from "../lib/db";

import { getVietnamDateString } from "../lib/date-utils";

export class SyncService {
  // Syncs all linked advertising accounts and their daily report data
  static async syncAllAccounts(): Promise<{ success: boolean; syncedAccounts: number; errors: any[] }> {
    logger.info("Starting global TikTok Ads data synchronization...");
    const advertisers = await ShopRepository.getAllAdvertisers();
    let syncedAccountsCount = 0;
    const errors: any[] = [];

    const todayStr = getVietnamDateString();

    for (const advertiser of advertisers) {
      try {
        logger.info(`Syncing advertiser: ${advertiser.name} (${advertiser.advertiserId})`);
        
        let token = advertiser.accessToken;
        
        // Auto-refresh token if close to expiry (within 15 minutes)
        const fifteenMinutes = 15 * 60 * 1000;
        if (new Date(advertiser.tokenExpiresAt).getTime() - Date.now() < fifteenMinutes) {
          logger.info(`Refreshing token for advertiser: ${advertiser.advertiserId}`);
          const refreshRes = await TikTokApiService.refreshAccessToken(advertiser.refreshToken);
          
          // Update advertiser token details
          await ShopRepository.upsertAdvertiser({
            advertiserId: advertiser.advertiserId,
            name: advertiser.name,
            accessToken: refreshRes.accessToken,
            refreshToken: refreshRes.refreshToken,
            tokenExpiresAt: new Date(Date.now() + refreshRes.expiresIn * 1000),
            shopId: advertiser.shopId,
          });
          
          token = refreshRes.accessToken;
          logger.info(`Token successfully refreshed for: ${advertiser.advertiserId}`);
        }

        // 1. Sync Campaign Performance
        const campaignDataList = await TikTokApiService.getCampaignPerformance(token, advertiser.advertiserId, todayStr);
        for (const camp of campaignDataList) {
          const campaignRecord = await CampaignRepository.upsertCampaign({
            campaignId: camp.campaignId,
            name: camp.name,
            status: camp.status,
            objectiveType: camp.objectiveType,
            budget: camp.budget,
            budgetMode: camp.budgetMode,
            advertiserId: advertiser.id,
            shoppingAdsType: camp.shoppingAdsType,
          });

          const roi = camp.spend > 0 ? camp.gmv / camp.spend : 0;
          const ctr = camp.impressions > 0 ? camp.clicks / camp.impressions : 0;
          const conversionRate = camp.clicks > 0 ? camp.orders / camp.clicks : 0;

          await CampaignRepository.upsertCampaignReport({
            campaignId: campaignRecord.id,
            date: new Date(todayStr),
            spend: camp.spend,
            gmv: camp.gmv,
            roi: roi,
            orders: camp.orders,
            impressions: camp.impressions,
            clicks: camp.clicks,
            ctr: ctr,
            conversionRate: conversionRate,
          });

          // Save intra-day 30-minute spend snapshot
          await prisma.campaignSpendSnapshot.create({
            data: {
              campaignId: campaignRecord.id,
              spend: camp.spend,
              gmv: camp.gmv,
              timestamp: new Date(),
            },
          });
        }

        // 2. Sync Product Performance
        const productDataList = await TikTokApiService.getProductPerformance(token, advertiser.advertiserId, todayStr);
        for (const prod of productDataList) {
          const productRecord = await ProductRepository.upsertProduct({
            productId: prod.productId,
            name: prod.name,
            imageUrl: prod.imageUrl,
            sku: prod.sku,
            stock: prod.stock,
            shopId: advertiser.shopId,
          });

          const roi = prod.spend > 0 ? prod.gmv / prod.spend : 0;

          await ProductRepository.upsertProductReport({
            productId: productRecord.id,
            date: new Date(todayStr),
            spend: prod.spend,
            gmv: prod.gmv,
            roi: roi,
            orders: prod.orders,
          });
        }

        // 3. Sync Creative Performance
        const creativeDataList = await TikTokApiService.getCreativePerformance(token, advertiser.advertiserId, todayStr);
        for (const creative of creativeDataList) {
          const creativeRecord = await CreativeRepository.upsertCreative({
            videoId: creative.videoId,
            name: creative.name,
            videoUrl: creative.videoUrl,
            advertiserId: advertiser.id,
          });

          const roi = creative.spend > 0 ? creative.gmv / creative.spend : 0;
          const ctr = creative.impressions > 0 ? creative.clicks / creative.impressions : 0;

          await CreativeRepository.upsertCreativeReport({
            videoId: creativeRecord.id,
            date: new Date(todayStr),
            spend: creative.spend,
            gmv: creative.gmv,
            roi: roi,
            orders: creative.orders,
            impressions: creative.impressions,
            clicks: creative.clicks,
            ctr: ctr,
          });
        }

        syncedAccountsCount++;
        logger.info(`Successfully finished sync for advertiser: ${advertiser.advertiserId}`);

        // Trigger alert engine evaluation for the shop associated with this advertiser
        try {
          await AlertEngineService.evaluateShopAlerts(advertiser.shopId);
        } catch (alertError: any) {
          logger.error(`Alert engine failed for shop ${advertiser.shopId}`, alertError);
        }

      } catch (error: any) {
        logger.error(`Failed to sync advertiser account ${advertiser.advertiserId}`, error);
        errors.push({
          advertiserId: advertiser.advertiserId,
          message: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      syncedAccounts: syncedAccountsCount,
      errors,
    };
  }
}
export default SyncService;
