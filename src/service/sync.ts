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
  static async syncAllAccounts(customDate?: string): Promise<{ success: boolean; syncedAccounts: number; errors: any[] }> {
    logger.info(`Starting global TikTok Ads data synchronization... Target Date: ${customDate || "today"}`);
    const advertisers = await ShopRepository.getAllAdvertisers();
    let syncedAccountsCount = 0;
    const errors: any[] = [];

    const todayStr = customDate || getVietnamDateString();

    for (const advertiser of advertisers) {
      try {
        logger.info(`Syncing advertiser: ${advertiser.name} (${advertiser.advertiserId})`);
        
        let token = advertiser.accessToken;
        
        // Auto-refresh token if close to expiry (within 15 minutes) and has a valid real refresh token
        const fifteenMinutes = 15 * 60 * 1000;
        const hasValidRefreshToken = Boolean(
          advertiser.refreshToken &&
          !advertiser.refreshToken.toLowerCase().includes("sandbox") &&
          !advertiser.refreshToken.toLowerCase().includes("fallback")
        );

        if (advertiser.tokenExpiresAt && (new Date(advertiser.tokenExpiresAt).getTime() - Date.now() < fifteenMinutes)) {
          if (hasValidRefreshToken) {
            try {
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
            } catch (refreshErr: any) {
              logger.warn(`Could not refresh token for advertiser ${advertiser.advertiserId}, attempting with current accessToken: ${refreshErr.message}`);
            }
          } else {
            logger.info(`Advertiser ${advertiser.advertiserId} is using a long-lived/manual token without refresh_token. Proceeding with current accessToken.`);
          }
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
            roasBid: camp.roasBid,
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

          // Save intra-day 30-minute spend snapshot (only for current day sync and active spenders)
          if ((!customDate || customDate === getVietnamDateString()) && camp.spend > 0) {
            await prisma.campaignSpendSnapshot.create({
              data: {
                campaignId: campaignRecord.id,
                spend: camp.spend,
                gmv: camp.gmv,
                timestamp: new Date(),
              },
            });
          }
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

        // 3. Sync Creative Performance (Only scan active product campaigns that generated spend/orders on target date)
        const activeProductCampaignIds = campaignDataList
          .filter(
            (c) =>
              (c.spend > 0 || c.gmv > 0 || c.orders > 0) &&
              c.shoppingAdsType !== "LIVE"
          )
          .map((c) => c.campaignId);

        // Check shop's inhouseChannels to automatically classify video channelType
        const shop = advertiser.shopId ? await ShopRepository.findById(advertiser.shopId) : null;
        const inhouseChannelsRaw = (shop as any)?.inhouseChannels || "";
        const inhouseList = inhouseChannelsRaw
          .split(/[,;\n]/)
          .map((s: string) => s.trim().toLowerCase().replace(/^@/, ""))
          .filter(Boolean);

        const creativeDataList = await TikTokApiService.getCreativePerformance(
          token,
          advertiser.advertiserId,
          todayStr,
          activeProductCampaignIds
        );
        for (const creative of creativeDataList) {
          const author = (creative.authorUsername || "").toLowerCase().replace(/^@/, "");
          const nameLower = (creative.name || "").toLowerCase();
          const videoUrlLower = (creative.videoUrl || "").toLowerCase();

          let channelType = creative.channelType;
          if (!channelType) {
            const isInhouse = inhouseList.length > 0 && (
              (author && inhouseList.includes(author)) ||
              inhouseList.some((ch: string) => nameLower.includes(ch) || videoUrlLower.includes(`/@${ch}`) || videoUrlLower.includes(`/${ch}`))
            );
            channelType = isInhouse ? "INHOUSE" : "AFFILIATE";
          }

          const creativeRecord = await CreativeRepository.upsertCreative({
            videoId: creative.videoId,
            name: creative.name,
            videoUrl: creative.videoUrl,
            advertiserId: advertiser.id,
            authorUsername: creative.authorUsername || null,
            authorName: creative.authorName || null,
            channelType: channelType || "AFFILIATE",
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

        // If sync succeeded with current token, extend tokenExpiresAt so we don't repeat refresh checks
        if (!hasValidRefreshToken && (!advertiser.tokenExpiresAt || new Date(advertiser.tokenExpiresAt).getTime() - Date.now() < fifteenMinutes)) {
          await ShopRepository.upsertAdvertiser({
            advertiserId: advertiser.advertiserId,
            name: advertiser.name,
            accessToken: token,
            refreshToken: advertiser.refreshToken,
            tokenExpiresAt: new Date(Date.now() + 365 * 86400 * 1000), // Extend 1 year
            shopId: advertiser.shopId,
          });
        }

      } catch (error: any) {
        logger.error(`Failed to sync advertiser account ${advertiser.advertiserId}`, error);
        errors.push({
          advertiserId: advertiser.advertiserId,
          message: error.message,
        });
      }
    }

    // Trigger alert engine evaluation ONCE per unique shop (only for live today's sync, skip for historical syncs)
    if (!customDate || customDate === getVietnamDateString()) {
      const uniqueShopIds = Array.from(new Set(advertisers.map((a) => a.shopId).filter(Boolean)));
      for (const shopId of uniqueShopIds) {
        try {
          await AlertEngineService.evaluateShopAlerts(shopId);
        } catch (alertError: any) {
          logger.error(`Alert engine failed for shop ${shopId}`, alertError);
        }
      }

      // Record latest successful sync timestamp in Redis / memory
      try {
        const { redis } = await import("../lib/redis");
        if (redis) {
          await redis.set("last_sync_timestamp", new Date().toISOString());
        }
      } catch (rErr) {}
    }

    return {
      success: errors.length === 0,
      syncedAccounts: syncedAccountsCount,
      errors,
    };
  }
}
export default SyncService;
