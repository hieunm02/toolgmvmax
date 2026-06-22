import { logger } from "./logger";

export interface TikTokCampaignData {
  campaignId: string;
  name: string;
  status: string;
  objectiveType: string;
  budget: number;
  budgetMode: string;
  spend: number;
  gmv: number;
  orders: number;
  impressions: number;
  clicks: number;
  shoppingAdsType?: string;
}

export interface TikTokProductData {
  productId: string;
  name: string;
  imageUrl?: string;
  sku?: string;
  stock: number;
  spend: number;
  gmv: number;
  orders: number;
}

export interface TikTokCreativeData {
  videoId: string;
  name: string;
  videoUrl?: string;
  spend: number;
  gmv: number;
  orders: number;
  impressions: number;
  clicks: number;
}

export class TikTokApiService {
  private static getBaseUrl(): string {
    return process.env.USE_SANDBOX_API === "true"
      ? "https://sandbox-ads.tiktok.com/open_api/v1.3"
      : "https://business-api.tiktok.com/open_api/v1.3";
  }

  // Exchanges auth code for access token and refresh token
  static async getAccessToken(authCode: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    if (process.env.MOCK_TIKTOK_API === "true" || !process.env.TIKTOK_CLIENT_ID) {
      logger.info("Using mock token exchange code");
      return {
        accessToken: `mock_access_${Math.random().toString(36).substring(7)}`,
        refreshToken: `mock_refresh_${Math.random().toString(36).substring(7)}`,
        expiresIn: 86400,
      };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/oauth2/access_token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.TIKTOK_CLIENT_ID,
          secret: process.env.TIKTOK_CLIENT_SECRET,
          auth_code: authCode,
        }),
      });

      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to exchange TikTok auth code");
      }

      return {
        accessToken: resData.data.access_token,
        refreshToken: resData.data.refresh_token || "sandbox_refresh_token_fallback",
        expiresIn: resData.data.expires_in || (86400 * 30),
      };
    } catch (error) {
      logger.error("TikTok getAccessToken failed", error);
      throw error;
    }
  }

  // Refreshes the TikTok access token
  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    if (process.env.MOCK_TIKTOK_API === "true" || !process.env.TIKTOK_CLIENT_ID) {
      logger.info("Using mock refresh token");
      return {
        accessToken: `mock_access_refreshed_${Math.random().toString(36).substring(7)}`,
        refreshToken: refreshToken,
        expiresIn: 86400,
      };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/oauth2/refresh_token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.TIKTOK_CLIENT_ID,
          secret: process.env.TIKTOK_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to refresh TikTok access token");
      }

      return {
        accessToken: resData.data.access_token,
        refreshToken: resData.data.refresh_token || "sandbox_refresh_token_fallback",
        expiresIn: resData.data.expires_in || (86400 * 30),
      };
    } catch (error) {
      logger.error("TikTok refreshAccessToken failed", error);
      throw error;
    }
  }

  // Fetches advertiser accounts connected to the token
  static async getAdvertiserAccounts(accessToken: string): Promise<Array<{ advertiserId: string; name: string }>> {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      return [
        { advertiserId: "ADV1001", name: "Alpha TikTok Shop Ads Store" },
        { advertiserId: "ADV1002", name: "Beta GMV Max Brand Page" },
      ];
    }

    try {
      const url = `${this.getBaseUrl()}/oauth2/advertiser/get/?app_id=${process.env.TIKTOK_CLIENT_ID}&secret=${process.env.TIKTOK_CLIENT_SECRET}`;
      const response = await fetch(url, {
        headers: {
          "Access-Token": accessToken,
        },
      });

      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to get advertiser accounts");
      }

      return resData.data.list.map((adv: any) => ({
        advertiserId: adv.advertiser_id,
        name: adv.advertiser_name,
      }));
    } catch (error) {
      logger.error("TikTok getAdvertiserAccounts failed", error);
      throw error;
    }
  }

  // Sync campaigns list & performance metrics
  static async getCampaignPerformance(
    accessToken: string,
    advertiserId: string,
    date: string // YYYY-MM-DD
  ): Promise<TikTokCampaignData[]> {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      logger.info("Generating mock campaign stats", { advertiserId, date });
      return [
        {
          campaignId: "CAMP101",
          name: "GMV Max - Spring Apparel Boost",
          status: "CAMPAIGN_STATUS_ENABLE",
          objectiveType: "OUTFLOW_GMV_MAX",
          budget: 500.0,
          budgetMode: "BUDGET_MODE_DAY",
          spend: 420.5,
          gmv: 1250.0,
          orders: 48,
          impressions: 25000,
          clicks: 1250,
        },
        {
          campaignId: "CAMP102",
          name: "GMV Max - Smart Gadgets Clearance",
          status: "CAMPAIGN_STATUS_ENABLE",
          objectiveType: "OUTFLOW_GMV_MAX",
          budget: 1000.0,
          budgetMode: "BUDGET_MODE_DAY",
          spend: 850.0,
          gmv: 3400.0,
          orders: 110,
          impressions: 54000,
          clicks: 3100,
        },
        {
          campaignId: "CAMP103",
          name: "GMV Max - Summer Accessories Retargeting",
          status: "CAMPAIGN_STATUS_DISABLE",
          objectiveType: "OUTFLOW_GMV_MAX",
          budget: 0.0,
          budgetMode: "BUDGET_MODE_INFINITE",
          spend: 0.0,
          gmv: 0.0,
          orders: 0,
          impressions: 0,
          clicks: 0,
        },
      ];
    }

    try {
      // 1. Fetch campaigns metadata
      const metaUrl = `${this.getBaseUrl()}/campaign/get/?advertiser_id=${advertiserId}`;
      const metaResponse = await fetch(metaUrl, {
        headers: { "Access-Token": accessToken },
      });
      const metaData = await metaResponse.json();
      if (metaData.code !== 0) {
        throw new Error(metaData.message || "Failed to fetch TikTok campaigns metadata");
      }

      const campaignList = metaData.data?.list || [];

      // 2. Fetch campaign report performance metrics
      const dimensions = JSON.stringify(["campaign_id"]);
      const metrics = JSON.stringify(["spend", "impressions", "clicks", "complete_payment", "value_per_complete_payment"]);
      const reportUrl = `${this.getBaseUrl()}/report/integrated/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=${encodeURIComponent(dimensions)}&metrics=${encodeURIComponent(metrics)}&start_date=${date}&end_date=${date}`;

      const reportResponse = await fetch(reportUrl, {
        headers: { "Access-Token": accessToken },
      });
      const reportData = await reportResponse.json();

      // Map report metrics by campaign_id
      const metricsMap = new Map<string, any>();
      if (reportData.code === 0 && reportData.data && reportData.data.list) {
        for (const item of reportData.data.list) {
          const cid = item.dimensions?.campaign_id;
          if (cid) {
            metricsMap.set(cid, item.metrics);
          }
        }
      }

      // Merge standard metadata and metrics
      const standardCampaigns: TikTokCampaignData[] = campaignList.map((camp: any) => {
        const stats = metricsMap.get(camp.campaign_id) || {};
        return {
          campaignId: camp.campaign_id,
          name: camp.campaign_name || "Unnamed Campaign",
          status: camp.operation_status === "ENABLE" ? "CAMPAIGN_STATUS_ENABLE" : "CAMPAIGN_STATUS_DISABLE",
          objectiveType: camp.objective_type || "WEB_CONVERSIONS",
          budget: Number(camp.budget || 0),
          budgetMode: camp.budget_mode || "BUDGET_MODE_INFINITE",
          spend: Number(stats.spend || 0),
          gmv: Number(stats.value_per_complete_payment || 0),
          orders: Number(stats.complete_payment || 0),
          impressions: Number(stats.impressions || 0),
          clicks: Number(stats.clicks || 0),
          shoppingAdsType: "PRODUCT",
        };
      });

      // 3. Fetch GMV Max campaigns
      const gmvMaxCampaigns: TikTokCampaignData[] = [];
      try {
        const storeListUrl = `${this.getBaseUrl()}/gmv_max/store/list/?advertiser_id=${advertiserId}`;
        const storeListResponse = await fetch(storeListUrl, {
          headers: { "Access-Token": accessToken },
        });
        const storeListData = await storeListResponse.json();

        if (storeListData.code === 0 && storeListData.data && storeListData.data.store_list) {
          const storeIds = storeListData.data.store_list.map((s: any) => s.store_id);
          const uniqueStoreIds = Array.from(new Set(storeIds));

          for (const storeId of uniqueStoreIds) {
            // Compute 30 days ago for discovery report
            const startDiscoveryDate = new Date(new Date(date).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            // Query 30-day discovery report to find campaign IDs with pagination support
            const dimensions = ["campaign_id"];
            const metrics = ["roi", "orders", "cost", "gross_revenue"];
            const discoveryDimensions = JSON.stringify(dimensions);
            const discoveryMetrics = JSON.stringify(metrics);

            let page = 1;
            let totalPage = 1;
            const gmvCampaignIdsList: string[] = [];

            do {
              try {
                const discoveryUrl = `${this.getBaseUrl()}/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(discoveryDimensions)}&metrics=${encodeURIComponent(discoveryMetrics)}&start_date=${startDiscoveryDate}&end_date=${date}&page_size=100&page=${page}`;

                const discoveryResponse = await fetch(discoveryUrl, {
                  headers: { "Access-Token": accessToken },
                });
                const discoveryData = await discoveryResponse.json();

                if (discoveryData.code === 0 && discoveryData.data && discoveryData.data.list) {
                  const ids = discoveryData.data.list.map((item: any) => item.dimensions?.campaign_id).filter(Boolean);
                  gmvCampaignIdsList.push(...ids);
                  totalPage = discoveryData.data.page_info?.total_page || 1;
                  page++;
                } else {
                  logger.warn(`GMV Max discovery query failed or empty on page ${page}`, discoveryData);
                  break;
                }
              } catch (discoveryErr) {
                logger.error(`Error fetching GMV Max discovery page ${page}`, discoveryErr);
                break;
              }
            } while (page <= totalPage);

            const gmvCampaignIds = Array.from(new Set(gmvCampaignIdsList));

            if (gmvCampaignIds.length > 0) {
              // Query today's performance report for this store ID with pagination support
              const todayGmvMetricsMap = new Map<string, any>();
              let todayPage = 1;
              let todayTotalPage = 1;

              do {
                try {
                  const todayReportUrl = `${this.getBaseUrl()}/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(discoveryDimensions)}&metrics=${encodeURIComponent(discoveryMetrics)}&start_date=${date}&end_date=${date}&page_size=100&page=${todayPage}`;

                  const todayReportResponse = await fetch(todayReportUrl, {
                    headers: { "Access-Token": accessToken },
                  });
                  const todayReportData = await todayReportResponse.json();

                  if (todayReportData.code === 0 && todayReportData.data && todayReportData.data.list) {
                    for (const item of todayReportData.data.list) {
                      const cid = item.dimensions?.campaign_id;
                      if (cid) {
                        todayGmvMetricsMap.set(cid, item.metrics);
                      }
                    }
                    todayTotalPage = todayReportData.data.page_info?.total_page || 1;
                    todayPage++;
                  } else {
                    logger.warn(`GMV Max today report query failed or empty on page ${todayPage}`, todayReportData);
                    break;
                  }
                } catch (todayReportErr) {
                  logger.error(`Error fetching GMV Max today report page ${todayPage}`, todayReportErr);
                  break;
                }
              } while (todayPage <= todayTotalPage);

              // Fetch metadata for each campaign in parallel
                const metadataPromises = gmvCampaignIds.map(async (cid: string) => {
                  try {
                    const infoUrl = `${this.getBaseUrl()}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${cid}`;
                    const infoResponse = await fetch(infoUrl, {
                      headers: { "Access-Token": accessToken },
                    });
                    const infoData = await infoResponse.json();
                    if (infoData.code === 0 && infoData.data) {
                      const info = infoData.data;
                      const stats = todayGmvMetricsMap.get(cid) || {};
                      return {
                        campaignId: cid,
                        name: info.campaign_name || `GMV Max Campaign ${cid}`,
                        status: info.operation_status === "ENABLE" ? "CAMPAIGN_STATUS_ENABLE" : "CAMPAIGN_STATUS_DISABLE",
                        objectiveType: "OUTFLOW_GMV_MAX",
                        budget: Number(info.budget || 0),
                        budgetMode: "BUDGET_MODE_DAY",
                        spend: Number(stats.cost || 0),
                        gmv: Number(stats.gross_revenue || 0),
                        orders: Number(stats.orders || 0),
                        impressions: 0,
                        clicks: 0,
                        shoppingAdsType: info.shopping_ads_type || "PRODUCT",
                      };
                    }
                  } catch (e) {
                    logger.error(`Error fetching metadata for GMV Max campaign ${cid}`, e);
                  }
                  return null;
                });

                const metaResults = await Promise.all(metadataPromises);
                for (const camp of metaResults) {
                  if (camp) {
                    gmvMaxCampaigns.push(camp);
                  }
                }
            }
          }
        }
      } catch (err) {
        logger.error("Error fetching GMV Max campaigns and performance reports", err);
      }

      return [...standardCampaigns, ...gmvMaxCampaigns];
    } catch (error) {
      logger.error("TikTok getCampaignPerformance failed", error, { advertiserId });
      throw error;
    }
  }

  // Sync products list & performance metrics
  static async getProductPerformance(
    accessToken: string,
    advertiserId: string,
    date: string
  ): Promise<TikTokProductData[]> {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      return [
        {
          productId: "PROD201",
          name: "Casual Unisex Hoodie - Oversized",
          imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2",
          sku: "HOOD-UNISEX-OVR-L",
          stock: 45,
          spend: 180.0,
          gmv: 620.0,
          orders: 22,
        },
        {
          productId: "PROD202",
          name: "Premium Wireless Earbuds Active ANC",
          imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df",
          sku: "EARB-ANC-BLK",
          stock: 3, // Low stock for alerts
          spend: 340.5,
          gmv: 1100.0,
          orders: 35,
        },
        {
          productId: "PROD203",
          name: "Minimalist Leather Card Holder",
          imageUrl: "https://images.unsplash.com/photo-1627124718515-2fcf67f3bd18",
          sku: "CARD-MNS-LTH",
          stock: 120,
          spend: 50.0,
          gmv: 45.0, // Low ROI for alerts
          orders: 3,
        },
      ];
    }

    // Deprecated in v1.3 - returning empty list to prevent crash
    logger.warn("TikTok getProductPerformance is deprecated in v1.3. Returning empty dataset.", { advertiserId });
    return [];
  }

  // Sync creatives list & performance metrics
  // Sync creatives list & performance metrics
  static async getCreativePerformance(
    accessToken: string,
    advertiserId: string,
    date: string
  ): Promise<TikTokCreativeData[]> {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      return [
        {
          videoId: "VID301",
          name: "Unboxing Hoodies Trend - TikTok Viral",
          videoUrl: "https://www.tiktok.com/@tiktok/video/7106351052672322862",
          spend: 150.0,
          gmv: 780.0,
          orders: 28,
          impressions: 12000,
          clicks: 650,
        },
        {
          videoId: "VID302",
          name: "ANC Earbuds Gym Test & Water Resistance",
          videoUrl: "https://www.tiktok.com/@tiktok/video/7097241270275329326",
          spend: 210.0,
          gmv: 440.0,
          orders: 14,
          impressions: 18000,
          clicks: 410,
        },
        {
          videoId: "VID303",
          name: "Leather Wallet Minimal Aesthetic ASMR",
          videoUrl: "https://www.tiktok.com/@tiktok/video/7109252352220450094",
          spend: 90.0,
          gmv: 10.0, // Low conversion/ROI creative
          orders: 1,
          impressions: 6000,
          clicks: 120,
        },
      ];
    }

    try {
      // 1. Fetch creative reports at AUCTION_AD level using video_id dimension
      const dimensions = JSON.stringify(["video_id"]);
      const metrics = JSON.stringify(["spend", "impressions", "clicks", "complete_payment", "value_per_complete_payment"]);
      const reportUrl = `${this.getBaseUrl()}/report/integrated/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=AUCTION_AD&dimensions=${encodeURIComponent(dimensions)}&metrics=${encodeURIComponent(metrics)}&start_date=${date}&end_date=${date}`;

      const reportResponse = await fetch(reportUrl, {
        headers: { "Access-Token": accessToken },
      });
      const reportData = await reportResponse.json();

      if (reportData.code !== 0) {
        logger.error("TikTok getCreativePerformance reporting failed", reportData.message, { advertiserId });
        return [];
      }

      const reportList = reportData.data?.list || [];
      if (reportList.length === 0) {
        return [];
      }

      // Extract unique video IDs from reports
      const videoIds = reportList.map((item: any) => item.dimensions?.video_id).filter(Boolean);
      
      // 2. Fetch video metadata to resolve Names and URLs from Asset Library
      const videoNamesMap = new Map<string, { name: string; url?: string }>();
      try {
        const libraryUrl = `${this.getBaseUrl()}/file/video/ad/search/?advertiser_id=${advertiserId}&video_ids=${encodeURIComponent(JSON.stringify(videoIds))}`;
        const libraryResponse = await fetch(libraryUrl, {
          headers: { "Access-Token": accessToken },
        });
        const libraryData = await libraryResponse.json();
        
        if (libraryData.code === 0 && libraryData.data && libraryData.data.list) {
          for (const video of libraryData.data.list) {
            if (video.video_id) {
              videoNamesMap.set(video.video_id, {
                name: video.video_name || `Video ${video.video_id}`,
                url: video.preview_url
              });
            }
          }
        }
      } catch (metadataError) {
        logger.warn("Failed to fetch video library metadata. Will use default naming.", metadataError);
      }

      // 3. Construct TikTokCreativeData array
      const creativeStats: TikTokCreativeData[] = reportList.map((item: any) => {
        const vid = item.dimensions?.video_id;
        const meta = videoNamesMap.get(vid);
        return {
          videoId: vid,
          name: meta?.name || `Creative Video ${vid}`,
          videoUrl: meta?.url || `https://www.tiktok.com/play/${vid}`,
          spend: Number(item.metrics?.spend || 0),
          gmv: Number(item.metrics?.value_per_complete_payment || 0),
          orders: Number(item.metrics?.complete_payment || 0),
          impressions: Number(item.metrics?.impressions || 0),
          clicks: Number(item.metrics?.clicks || 0),
        };
      });

      return creativeStats;
    } catch (error) {
      logger.error("TikTok getCreativePerformance failed with error", error, { advertiserId });
      return [];
    }
  }

  // Pauses a campaign on TikTok Ads
  static async pauseCampaign(
    accessToken: string,
    advertiserId: string,
    campaignId: string
  ): Promise<boolean> {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      logger.info("Mock pausing campaign", { advertiserId, campaignId });
      return true;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/campaign/status/update/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          campaign_ids: [campaignId],
          operation_status: "DISABLE",
        }),
      });

      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to pause campaign");
      }
      return true;
    } catch (error) {
      logger.error("TikTok pauseCampaign failed", error, { campaignId });
      throw error;
    }
  }

  // Clones a campaign on TikTok Ads
  static async cloneCampaign(
    accessToken: string,
    advertiserId: string,
    oldCampaign: {
      campaignId?: string;
      name: string;
      objectiveType: string;
      budget: number;
      budgetMode: string;
      shoppingAdsType?: string | null;
    }
  ): Promise<{ campaignId: string; name: string }> {
    let newName = "";
    const match = oldCampaign.name.match(/\s+(\d+)$/);
    if (match && parseInt(match[1], 10) < 1000) {
      const num = parseInt(match[1], 10);
      const base = oldCampaign.name.substring(0, oldCampaign.name.lastIndexOf(match[0]));
      newName = `${base} ${num + 1}`;
    } else {
      newName = `${oldCampaign.name} 1`;
    }

    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      const newCampaignId = `186${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
      logger.info("Mock cloning campaign", { advertiserId, oldCampaign: oldCampaign.name, newCampaignId, newName });
      return {
        campaignId: newCampaignId,
        name: newName,
      };
    }

    try {
      if (oldCampaign.objectiveType === "OUTFLOW_GMV_MAX" && oldCampaign.campaignId) {
        logger.info(`Relaunching GMV Max campaign ${oldCampaign.campaignId} via campaign/gmv_max/create/`);
        
        // 1. Fetch old campaign's GMV Max configuration
        const infoUrl = `${this.getBaseUrl()}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${oldCampaign.campaignId}`;
        const infoResponse = await fetch(infoUrl, {
          headers: { "Access-Token": accessToken },
        });
        const infoData = await infoResponse.json();
        
        if (infoData.code !== 0) {
          throw new Error(`Failed to fetch GMV Max campaign config: ${infoData.message || "Unknown error"}`);
        }
        
        const oldConfig = infoData.data;

        // 2. Format schedule start time in UTC timezone.
        // The TikTok Ads API expects schedule_start_time in UTC. It then converts this value to the ad account's local timezone.
        // To make the campaign start immediately and prevent the frontend Ads Manager UI from displaying a
        // "set the start time at least 5 minutes after submission time" validation error, we set the start time
        // to the exact current time. Once created, the scheduled start time is immediately in the past/current,
        // allowing the campaign to deliver immediately upon approval without any scheduled delay.
        const now = new Date();
        const startTime = now;
        const pad = (n: number) => n.toString().padStart(2, '0');
        
        let formattedStartTime = "";
        try {
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "UTC",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          });
          const parts = formatter.formatToParts(startTime);
          const getVal = (type: string) => parts.find(p => p.type === type)?.value || "00";
          formattedStartTime = `${getVal("year")}-${getVal("month")}-${getVal("day")} ${getVal("hour")}:${getVal("minute")}:${getVal("second")}`;
        } catch (e) {
          logger.error("Failed to format start time in UTC", e);
          formattedStartTime = `${startTime.getUTCFullYear()}-${pad(startTime.getUTCMonth() + 1)}-${pad(startTime.getUTCDate())} ${pad(startTime.getUTCHours())}:${pad(startTime.getUTCMinutes())}:${pad(startTime.getUTCSeconds())}`;
        }

        // 3. Generate a unique numeric request_id as an int64 string
        const requestId = String(Date.now()) + String(Math.floor(Math.random() * 1000));

        // 4. Build creation payload
        const payload: any = {
          advertiser_id: advertiserId,
          request_id: requestId,
          campaign_name: newName,
          shopping_ads_type: oldCampaign.shoppingAdsType || oldConfig.shopping_ads_type || "PRODUCT",
          store_id: oldConfig.store_id,
          store_authorized_bc_id: oldConfig.store_authorized_bc_id,
          identity_list: oldConfig.identity_list,
          placements: oldConfig.placements,
          location_ids: oldConfig.location_ids,
          age_groups: oldConfig.age_groups,
          budget: oldCampaign.budget || oldConfig.budget,
          schedule_type: oldConfig.schedule_type || "SCHEDULE_FROM_NOW",
          schedule_start_time: formattedStartTime,
          optimization_goal: oldConfig.optimization_goal,
          deep_bid_type: oldConfig.deep_bid_type,
          roas_bid: oldConfig.roas_bid,
          roi_protection_enabled: oldConfig.roi_protection_enabled,
          product_video_specific_type: oldConfig.product_video_specific_type,
          operation_status: "ENABLE"
        };

        // Conditionally copy product specific settings (critical for PRODUCT shopping ads type)
        if (oldConfig.product_specific_type) {
          payload.product_specific_type = oldConfig.product_specific_type;
        } else if (payload.shopping_ads_type === "PRODUCT") {
          payload.product_specific_type = "ALL";
        }

        if (oldConfig.item_group_ids && oldConfig.item_group_ids.length > 0) {
          payload.item_group_ids = oldConfig.item_group_ids;
        }

        if (oldConfig.custom_anchor_video_list) {
          payload.custom_anchor_video_list = oldConfig.custom_anchor_video_list;
        }

        if (oldConfig.product_video_list) {
          payload.product_video_list = oldConfig.product_video_list;
        }

        const response = await fetch(`${this.getBaseUrl()}/campaign/gmv_max/create/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Access-Token": accessToken,
          },
          body: JSON.stringify(payload),
        });

        const resData = await response.json();
        if (resData.code !== 0) {
          throw new Error(resData.message || "Failed to create GMV Max campaign");
        }

        const newCampaignId = resData.data.campaign_id;
        logger.info("Successfully created GMV Max campaign on TikTok", { advertiserId, newCampaignId, newName });

        return {
          campaignId: newCampaignId,
          name: newName,
        };
      } else {
        // Fallback: Standard campaign creation
        const apiObjectiveType = oldCampaign.objectiveType === "OUTFLOW_GMV_MAX" ? "PRODUCT_SALES" : oldCampaign.objectiveType;

        const payload: any = {
          advertiser_id: advertiserId,
          campaign_name: newName,
          objective_type: apiObjectiveType,
          budget_mode: oldCampaign.budgetMode,
        };

        if (apiObjectiveType === "PRODUCT_SALES") {
          payload.shopping_ads_type = oldCampaign.shoppingAdsType || "PRODUCT";
        }

        if (oldCampaign.budgetMode !== "BUDGET_MODE_INFINITE" && oldCampaign.budget > 0) {
          payload.budget = oldCampaign.budget;
        }

        const response = await fetch(`${this.getBaseUrl()}/campaign/create/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Access-Token": accessToken,
          },
          body: JSON.stringify(payload),
        });

        const resData = await response.json();
        if (resData.code !== 0) {
          throw new Error(resData.message || "Failed to clone campaign");
        }

        const newCampaignId = resData.data.campaign_id;
        logger.info("Successfully cloned campaign on TikTok", { advertiserId, newCampaignId, newName });

        return {
          campaignId: newCampaignId,
          name: newName,
        };
      }
    } catch (error) {
      logger.error("TikTok cloneCampaign failed", error);
      throw error;
    }
  }

  // Updates campaign budget on TikTok Ads
  static async updateCampaignBudget(
    accessToken: string,
    advertiserId: string,
    campaignId: string,
    newBudget: number,
    objectiveType: string
  ): Promise<boolean> {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      logger.info("Mock updating campaign budget", { advertiserId, campaignId, newBudget });
      return true;
    }

    try {
      const isGmvMax = objectiveType === "OUTFLOW_GMV_MAX";
      const url = isGmvMax
        ? `${this.getBaseUrl()}/campaign/gmv_max/update/`
        : `${this.getBaseUrl()}/campaign/update/`;

      const payload: any = {
        advertiser_id: advertiserId,
        campaign_id: campaignId,
        budget: newBudget
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to update campaign budget");
      }
      return true;
    } catch (error) {
      logger.error("TikTok updateCampaignBudget failed", error, { campaignId });
      throw error;
    }
  }
}
export default TikTokApiService;
