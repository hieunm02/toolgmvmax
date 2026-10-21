"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/export-malaysia-october.ts
var export_malaysia_october_exports = {};
__export(export_malaysia_october_exports, {
  runExportMalaysiaOctober: () => runExportMalaysiaOctober
});
module.exports = __toCommonJS(export_malaysia_october_exports);

// src/lib/db.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = prisma;

// src/lib/logger.ts
var Logger = class {
  formatMessage(level, message, context) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${ctxString}`;
  }
  info(message, context) {
    console.log(this.formatMessage("info", message, context));
  }
  warn(message, context) {
    console.warn(this.formatMessage("warn", message, context));
  }
  error(message, error, context) {
    const combinedContext = {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack
    };
    console.error(this.formatMessage("error", message, combinedContext));
  }
  debug(message, context) {
    if (process.env.NODE_ENV !== "production") {
      console.log(this.formatMessage("debug", message, context));
    }
  }
};
var logger = new Logger();

// src/lib/tiktok.ts
var TikTokApiService = class {
  static getBaseUrl() {
    return process.env.USE_SANDBOX_API === "true" ? "https://sandbox-ads.tiktok.com/open_api/v1.3" : "https://business-api.tiktok.com/open_api/v1.3";
  }
  // Exchanges auth code for access token and refresh token
  static async getAccessToken(authCode) {
    if (process.env.MOCK_TIKTOK_API === "true" || !process.env.TIKTOK_CLIENT_ID) {
      logger.info("Using mock token exchange code");
      return {
        accessToken: `mock_access_${Math.random().toString(36).substring(7)}`,
        refreshToken: `mock_refresh_${Math.random().toString(36).substring(7)}`,
        expiresIn: 86400
      };
    }
    try {
      const response = await fetch(`${this.getBaseUrl()}/oauth2/access_token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.TIKTOK_CLIENT_ID,
          secret: process.env.TIKTOK_CLIENT_SECRET,
          auth_code: authCode
        })
      });
      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to exchange TikTok auth code");
      }
      return {
        accessToken: resData.data.access_token,
        refreshToken: resData.data.refresh_token || "sandbox_refresh_token_fallback",
        expiresIn: resData.data.expires_in || 86400 * 30
      };
    } catch (error) {
      logger.error("TikTok getAccessToken failed", error);
      throw error;
    }
  }
  // Refreshes the TikTok access token
  static async refreshAccessToken(refreshToken) {
    if (process.env.MOCK_TIKTOK_API === "true" || !process.env.TIKTOK_CLIENT_ID) {
      logger.info("Using mock refresh token");
      return {
        accessToken: `mock_access_refreshed_${Math.random().toString(36).substring(7)}`,
        refreshToken,
        expiresIn: 86400
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
          refresh_token: refreshToken
        })
      });
      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to refresh TikTok access token");
      }
      return {
        accessToken: resData.data.access_token,
        refreshToken: resData.data.refresh_token || "sandbox_refresh_token_fallback",
        expiresIn: resData.data.expires_in || 86400 * 30
      };
    } catch (error) {
      logger.error("TikTok refreshAccessToken failed", error);
      throw error;
    }
  }
  // Fetches advertiser accounts connected to the token
  static async getAdvertiserAccounts(accessToken) {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      return [
        { advertiserId: "ADV1001", name: "Alpha TikTok Shop Ads Store" },
        { advertiserId: "ADV1002", name: "Beta GMV Max Brand Page" }
      ];
    }
    try {
      const url = `${this.getBaseUrl()}/oauth2/advertiser/get/?app_id=${process.env.TIKTOK_CLIENT_ID}&secret=${process.env.TIKTOK_CLIENT_SECRET}`;
      const response = await fetch(url, {
        headers: {
          "Access-Token": accessToken
        }
      });
      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to get advertiser accounts");
      }
      return resData.data.list.map((adv) => ({
        advertiserId: adv.advertiser_id,
        name: adv.advertiser_name
      }));
    } catch (error) {
      logger.error("TikTok getAdvertiserAccounts failed", error);
      throw error;
    }
  }
  // Sync campaigns list & performance metrics
  static async getCampaignPerformance(accessToken, advertiserId, date) {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      logger.info("Generating mock campaign stats", { advertiserId, date });
      return [
        {
          campaignId: "CAMP101",
          name: "GMV Max - Spring Apparel Boost",
          status: "CAMPAIGN_STATUS_ENABLE",
          objectiveType: "OUTFLOW_GMV_MAX",
          budget: 500,
          budgetMode: "BUDGET_MODE_DAY",
          spend: 420.5,
          gmv: 1250,
          orders: 48,
          impressions: 25e3,
          clicks: 1250
        },
        {
          campaignId: "CAMP102",
          name: "GMV Max - Smart Gadgets Clearance",
          status: "CAMPAIGN_STATUS_ENABLE",
          objectiveType: "OUTFLOW_GMV_MAX",
          budget: 1e3,
          budgetMode: "BUDGET_MODE_DAY",
          spend: 850,
          gmv: 3400,
          orders: 110,
          impressions: 54e3,
          clicks: 3100
        },
        {
          campaignId: "CAMP103",
          name: "GMV Max - Summer Accessories Retargeting",
          status: "CAMPAIGN_STATUS_DISABLE",
          objectiveType: "OUTFLOW_GMV_MAX",
          budget: 0,
          budgetMode: "BUDGET_MODE_INFINITE",
          spend: 0,
          gmv: 0,
          orders: 0,
          impressions: 0,
          clicks: 0
        }
      ];
    }
    try {
      const metaUrl = `${this.getBaseUrl()}/campaign/get/?advertiser_id=${advertiserId}`;
      const metaResponse = await fetch(metaUrl, {
        headers: { "Access-Token": accessToken }
      });
      const metaData = await metaResponse.json();
      if (metaData.code !== 0) {
        throw new Error(metaData.message || "Failed to fetch TikTok campaigns metadata");
      }
      const campaignList = metaData.data?.list || [];
      const dimensions = JSON.stringify(["campaign_id"]);
      const metrics = JSON.stringify(["spend", "impressions", "clicks", "complete_payment", "value_per_complete_payment"]);
      const reportUrl = `${this.getBaseUrl()}/report/integrated/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=${encodeURIComponent(dimensions)}&metrics=${encodeURIComponent(metrics)}&start_date=${date}&end_date=${date}`;
      const reportResponse = await fetch(reportUrl, {
        headers: { "Access-Token": accessToken }
      });
      const reportData = await reportResponse.json();
      const metricsMap = /* @__PURE__ */ new Map();
      if (reportData.code === 0 && reportData.data && reportData.data.list) {
        for (const item of reportData.data.list) {
          const cid = item.dimensions?.campaign_id;
          if (cid) {
            metricsMap.set(cid, item.metrics);
          }
        }
      }
      const standardCampaigns = campaignList.map((camp) => {
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
          roasBid: Number(camp.roas_bid || 0)
        };
      });
      const gmvMaxCampaigns = [];
      try {
        const storeListUrl = `${this.getBaseUrl()}/gmv_max/store/list/?advertiser_id=${advertiserId}`;
        const storeListResponse = await fetch(storeListUrl, {
          headers: { "Access-Token": accessToken }
        });
        const storeListData = await storeListResponse.json();
        if (storeListData.code === 0 && storeListData.data && storeListData.data.store_list) {
          const storeIds = storeListData.data.store_list.map((s) => s.store_id);
          const uniqueStoreIds = Array.from(new Set(storeIds));
          for (const storeId of uniqueStoreIds) {
            const dimensions2 = ["campaign_id"];
            const metrics2 = ["roi", "orders", "cost", "gross_revenue"];
            const reportDimensions = JSON.stringify(dimensions2);
            const reportMetrics = JSON.stringify(metrics2);
            const todayGmvMetricsMap = /* @__PURE__ */ new Map();
            let todayPage = 1;
            let todayTotalPage = 1;
            do {
              try {
                const todayReportUrl = `${this.getBaseUrl()}/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(reportDimensions)}&metrics=${encodeURIComponent(reportMetrics)}&start_date=${date}&end_date=${date}&page_size=100&page=${todayPage}`;
                const todayReportResponse = await fetch(todayReportUrl, {
                  headers: { "Access-Token": accessToken }
                });
                const todayReportData = await todayReportResponse.json();
                if (todayReportData.code === 0 && todayReportData.data && todayReportData.data.list) {
                  for (const item of todayReportData.data.list) {
                    const cid = item.dimensions?.campaign_id;
                    const cost = Number(item.metrics?.cost || 0);
                    const grossRevenue = Number(item.metrics?.gross_revenue || 0);
                    const orders = Number(item.metrics?.orders || 0);
                    if (cid && (cost > 0 || grossRevenue > 0 || orders > 0)) {
                      todayGmvMetricsMap.set(cid, item.metrics);
                    }
                  }
                  todayTotalPage = todayReportData.data.page_info?.total_page || 1;
                  todayPage++;
                } else {
                  logger.warn(`GMV Max today report query empty or completed on page ${todayPage}`);
                  break;
                }
              } catch (todayReportErr) {
                logger.error(`Error fetching GMV Max today report page ${todayPage}`, todayReportErr);
                break;
              }
            } while (todayPage <= todayTotalPage);
            const activeGmvCampaignIds = Array.from(todayGmvMetricsMap.keys());
            const dbCampaignMap = /* @__PURE__ */ new Map();
            try {
              const existingDbCampaigns = await prisma.campaign.findMany({
                where: { advertiser: { advertiserId } },
                select: {
                  campaignId: true,
                  name: true,
                  status: true,
                  budget: true,
                  budgetMode: true,
                  shoppingAdsType: true,
                  roasBid: true
                }
              });
              for (const c of existingDbCampaigns) {
                dbCampaignMap.set(c.campaignId, c);
              }
            } catch (dbErr) {
              logger.warn("Could not load existing campaigns from DB", dbErr);
            }
            const idsNeedingInfo = [];
            for (const cid of activeGmvCampaignIds) {
              const stats = todayGmvMetricsMap.get(cid) || {};
              const existsInDb = dbCampaignMap.has(cid);
              if (existsInDb) {
                const existing = dbCampaignMap.get(cid);
                gmvMaxCampaigns.push({
                  campaignId: cid,
                  name: existing.name || `GMV Max Campaign ${cid}`,
                  status: existing.status || "CAMPAIGN_STATUS_ENABLE",
                  objectiveType: "OUTFLOW_GMV_MAX",
                  budget: Number(existing.budget || 0),
                  budgetMode: existing.budgetMode || "BUDGET_MODE_DAY",
                  spend: Number(stats.cost || 0),
                  gmv: Number(stats.gross_revenue || 0),
                  orders: Number(stats.orders || 0),
                  impressions: 0,
                  clicks: 0,
                  shoppingAdsType: existing.shoppingAdsType || "PRODUCT",
                  roasBid: Number(existing.roasBid || 0)
                });
              } else {
                idsNeedingInfo.push(cid);
              }
            }
            const CHUNK_SIZE = 10;
            for (let i = 0; i < idsNeedingInfo.length; i += CHUNK_SIZE) {
              const chunk = idsNeedingInfo.slice(i, i + CHUNK_SIZE);
              const chunkResults = await Promise.all(
                chunk.map(async (cid) => {
                  try {
                    const infoUrl = `${this.getBaseUrl()}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${cid}`;
                    const infoResponse = await fetch(infoUrl, {
                      headers: { "Access-Token": accessToken }
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
                        roasBid: Number(info.roas_bid || 0)
                      };
                    }
                  } catch (e) {
                    logger.error(`Error fetching metadata for GMV Max campaign ${cid}`, e);
                  }
                  return null;
                })
              );
              for (const camp of chunkResults) {
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
  static async getProductPerformance(accessToken, advertiserId, date) {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      return [
        {
          productId: "PROD201",
          name: "Casual Unisex Hoodie - Oversized",
          imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2",
          sku: "HOOD-UNISEX-OVR-L",
          stock: 45,
          spend: 180,
          gmv: 620,
          orders: 22
        },
        {
          productId: "PROD202",
          name: "Premium Wireless Earbuds Active ANC",
          imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df",
          sku: "EARB-ANC-BLK",
          stock: 3,
          // Low stock for alerts
          spend: 340.5,
          gmv: 1100,
          orders: 35
        },
        {
          productId: "PROD203",
          name: "Minimalist Leather Card Holder",
          imageUrl: "https://images.unsplash.com/photo-1627124718515-2fcf67f3bd18",
          sku: "CARD-MNS-LTH",
          stock: 120,
          spend: 50,
          gmv: 45,
          // Low ROI for alerts
          orders: 3
        }
      ];
    }
    logger.warn("TikTok getProductPerformance is deprecated in v1.3. Returning empty dataset.", { advertiserId });
    return [];
  }
  // Sync creatives list & performance metrics
  // Sync creatives list & performance metrics
  static async getCreativePerformance(accessToken, advertiserId, date, targetCampaignIds) {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      return [
        {
          videoId: "VID301",
          name: "Unboxing Hoodies Trend - TikTok Viral",
          videoUrl: "https://www.tiktok.com/@tiktok/video/7106351052672322862",
          spend: 150,
          gmv: 780,
          orders: 28,
          impressions: 12e3,
          clicks: 650
        },
        {
          videoId: "VID302",
          name: "ANC Earbuds Gym Test & Water Resistance",
          videoUrl: "https://www.tiktok.com/@tiktok/video/7097241270275329326",
          spend: 210,
          gmv: 440,
          orders: 14,
          impressions: 18e3,
          clicks: 410
        },
        {
          videoId: "VID303",
          name: "Leather Wallet Minimal Aesthetic ASMR",
          videoUrl: "https://www.tiktok.com/@tiktok/video/7109252352220450094",
          spend: 90,
          gmv: 10,
          // Low conversion/ROI creative
          orders: 1,
          impressions: 6e3,
          clicks: 120
        }
      ];
    }
    try {
      const creativeMap = /* @__PURE__ */ new Map();
      let activeCampIds = targetCampaignIds && targetCampaignIds.length > 0 ? [...targetCampaignIds] : [];
      if (activeCampIds.length === 0) {
        try {
          const dbSpending = await prisma.campaignReport.findMany({
            where: {
              date: new Date(date),
              OR: [
                { spend: { gt: 0 } },
                { gmv: { gt: 0 } },
                { orders: { gt: 0 } }
              ],
              campaign: {
                advertiser: { advertiserId },
                shoppingAdsType: { not: "LIVE" }
              }
            },
            select: { campaign: { select: { campaignId: true } } }
          });
          activeCampIds = Array.from(new Set(dbSpending.map((r) => r.campaign.campaignId)));
        } catch (dbErr) {
          logger.warn("Could not query active spending campaigns from DB", dbErr);
        }
      }
      try {
        const storeListUrl = `${this.getBaseUrl()}/gmv_max/store/list/?advertiser_id=${advertiserId}`;
        const storeRes = await fetch(storeListUrl, { headers: { "Access-Token": accessToken } });
        const storeData = await storeRes.json();
        let storeIds = [];
        if (storeData.code === 0 && storeData.data?.store_list) {
          storeIds = Array.from(new Set(storeData.data.store_list.map((s) => s.store_id).filter(Boolean)));
        }
        if (storeIds.length > 0) {
          for (const storeId of storeIds) {
            if (activeCampIds.length === 0) {
              try {
                const campUrl = `${this.getBaseUrl()}/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(JSON.stringify(["campaign_id"]))}&metrics=${encodeURIComponent(JSON.stringify(["cost", "gross_revenue", "orders"]))}&start_date=${date}&end_date=${date}&page_size=100`;
                const campRes = await fetch(campUrl, { headers: { "Access-Token": accessToken } });
                const campData = await campRes.json();
                if (campData.code === 0 && campData.data?.list) {
                  activeCampIds = campData.data.list.filter((item) => Number(item.metrics?.cost || 0) > 0 || Number(item.metrics?.gross_revenue || 0) > 0 || Number(item.metrics?.orders || 0) > 0).map((item) => item.dimensions?.campaign_id).filter(Boolean);
                }
              } catch (e) {
              }
            }
            activeCampIds = Array.from(new Set(activeCampIds));
            logger.info(`Scanning creatives for ${activeCampIds.length} active spending product campaigns (Store: ${storeId}) on ${date}`);
            for (const cid of activeCampIds) {
              let foundCreativesForCampaign = false;
              let cPage = 1;
              let cTotalPage = 1;
              do {
                try {
                  const creativeFilters = JSON.stringify({
                    campaign_ids: [String(cid)]
                  });
                  const directUrl = `${this.getBaseUrl()}/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(JSON.stringify(["item_id"]))}&filtering=${encodeURIComponent(creativeFilters)}&metrics=${encodeURIComponent(JSON.stringify(["roi", "orders", "cost", "gross_revenue"]))}&start_date=${date}&end_date=${date}&page_size=100&page=${cPage}`;
                  const directRes = await fetch(directUrl, { headers: { "Access-Token": accessToken } });
                  const directData = await directRes.json();
                  if (directData.code === 0 && directData.data?.list && directData.data.list.length > 0) {
                    foundCreativesForCampaign = true;
                    for (const item of directData.data.list) {
                      const vid = item.dimensions?.item_id;
                      if (vid && String(vid) !== "-1") {
                        const cost = Number(item.metrics?.cost || item.metrics?.spend || 0);
                        const gmv = Number(item.metrics?.gross_revenue || item.metrics?.value_per_complete_payment || 0);
                        const orders = Number(item.metrics?.orders || item.metrics?.complete_payment || 0);
                        if (cost > 0 || gmv > 0 || orders > 0) {
                          const existing = creativeMap.get(String(vid));
                          if (existing) {
                            existing.spend += cost;
                            existing.gmv += gmv;
                            existing.orders += orders;
                          } else {
                            creativeMap.set(String(vid), {
                              videoId: String(vid),
                              name: `Post ${vid}`,
                              spend: cost,
                              gmv,
                              orders,
                              clicks: 0,
                              impressions: 0
                            });
                          }
                        }
                      }
                    }
                    cTotalPage = directData.data.page_info?.total_page || 1;
                    cPage++;
                  } else {
                    break;
                  }
                } catch (cErr) {
                  break;
                }
              } while (cPage <= cTotalPage);
              if (!foundCreativesForCampaign) {
                try {
                  const itemGroupFilters = JSON.stringify({ campaign_ids: [String(cid)] });
                  const itemGroupUrl = `${this.getBaseUrl()}/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(JSON.stringify(["item_group_id"]))}&filtering=${encodeURIComponent(itemGroupFilters)}&metrics=${encodeURIComponent(JSON.stringify(["cost", "gross_revenue", "orders", "roi"]))}&start_date=${date}&end_date=${date}&page_size=100`;
                  const itemGroupRes = await fetch(itemGroupUrl, { headers: { "Access-Token": accessToken } });
                  const itemGroupData = await itemGroupRes.json();
                  let itemGroupIds = [];
                  if (itemGroupData.code === 0 && itemGroupData.data?.list) {
                    itemGroupIds = itemGroupData.data.list.map((item) => item.dimensions?.item_group_id).filter(Boolean);
                  }
                  for (const igid of itemGroupIds) {
                    let igPage = 1;
                    let igTotalPage = 1;
                    do {
                      try {
                        const igFilters = JSON.stringify({
                          campaign_ids: [String(cid)],
                          item_group_ids: [String(igid)]
                        });
                        const igUrl = `${this.getBaseUrl()}/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeId]))}&dimensions=${encodeURIComponent(JSON.stringify(["item_id"]))}&filtering=${encodeURIComponent(igFilters)}&metrics=${encodeURIComponent(JSON.stringify(["roi", "orders", "cost", "gross_revenue"]))}&start_date=${date}&end_date=${date}&page_size=100&page=${igPage}`;
                        const igRes = await fetch(igUrl, { headers: { "Access-Token": accessToken } });
                        const igData = await igRes.json();
                        if (igData.code === 0 && igData.data?.list) {
                          for (const item of igData.data.list) {
                            const vid = item.dimensions?.item_id;
                            if (vid && String(vid) !== "-1") {
                              const cost = Number(item.metrics?.cost || item.metrics?.spend || 0);
                              const gmv = Number(item.metrics?.gross_revenue || item.metrics?.value_per_complete_payment || 0);
                              const orders = Number(item.metrics?.orders || item.metrics?.complete_payment || 0);
                              if (cost > 0 || gmv > 0 || orders > 0) {
                                const existing = creativeMap.get(String(vid));
                                if (existing) {
                                  existing.spend += cost;
                                  existing.gmv += gmv;
                                  existing.orders += orders;
                                } else {
                                  creativeMap.set(String(vid), {
                                    videoId: String(vid),
                                    name: `Post ${vid}`,
                                    spend: cost,
                                    gmv,
                                    orders,
                                    clicks: 0,
                                    impressions: 0
                                  });
                                }
                              }
                            }
                          }
                          igTotalPage = igData.data.page_info?.total_page || 1;
                          igPage++;
                        } else {
                          break;
                        }
                      } catch (igErr) {
                        break;
                      }
                    } while (igPage <= igTotalPage);
                  }
                } catch (igErr) {
                }
              }
            }
          }
        }
      } catch (gmvErr) {
        logger.warn(`GMV Max creative report query failed: ${gmvErr.message}`);
      }
      try {
        let adPage = 1;
        let adTotalPage = 1;
        const validAds = [];
        do {
          const adReportUrl = `${this.getBaseUrl()}/report/integrated/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=AUCTION_AD&dimensions=${encodeURIComponent(JSON.stringify(["ad_id"]))}&metrics=${encodeURIComponent(JSON.stringify(["spend", "impressions", "clicks", "complete_payment", "value_per_complete_payment"]))}&start_date=${date}&end_date=${date}&page_size=100&page=${adPage}`;
          const adReportRes = await fetch(adReportUrl, { headers: { "Access-Token": accessToken } });
          const adReportData = await adReportRes.json();
          if (adReportData.code === 0 && adReportData.data?.list) {
            const spending = adReportData.data.list.filter(
              (item) => Number(item.metrics?.spend || 0) > 0 || Number(item.metrics?.value_per_complete_payment || 0) > 0 || Number(item.metrics?.complete_payment || 0) > 0
            );
            validAds.push(...spending);
            adTotalPage = adReportData.data.page_info?.total_page || 1;
            adPage++;
          } else {
            break;
          }
        } while (adPage <= adTotalPage);
        if (validAds.length > 0) {
          const adIds = validAds.map((item) => item.dimensions?.ad_id).filter(Boolean);
          const adMap = /* @__PURE__ */ new Map();
          for (let i = 0; i < adIds.length; i += 100) {
            const chunk = adIds.slice(i, i + 100);
            try {
              const adInfoUrl = `${this.getBaseUrl()}/ad/get/?advertiser_id=${advertiserId}&filtering=${encodeURIComponent(JSON.stringify({ ad_ids: chunk }))}`;
              const adInfoRes = await fetch(adInfoUrl, { headers: { "Access-Token": accessToken } });
              const adInfoData = await adInfoRes.json();
              if (adInfoData.code === 0 && adInfoData.data?.list) {
                for (const ad of adInfoData.data.list) {
                  adMap.set(ad.ad_id, ad);
                }
              }
            } catch (e) {
            }
          }
          for (const item of validAds) {
            const adId = item.dimensions?.ad_id;
            const adMeta = adMap.get(adId);
            const vid = adMeta?.video_id || adMeta?.tiktok_item_id || adId;
            if (vid) {
              const cost = Number(item.metrics?.spend || 0);
              const gmv = Number(item.metrics?.value_per_complete_payment || 0);
              const orders = Number(item.metrics?.complete_payment || 0);
              const clicks = Number(item.metrics?.clicks || 0);
              const impressions = Number(item.metrics?.impressions || 0);
              const existing = creativeMap.get(String(vid));
              if (existing) {
                existing.spend += cost;
                existing.gmv += gmv;
                existing.orders += orders;
                existing.clicks += clicks;
                existing.impressions += impressions;
              } else {
                creativeMap.set(String(vid), {
                  videoId: String(vid),
                  name: adMeta?.ad_name || `Ad ${adId}`,
                  spend: cost,
                  gmv,
                  orders,
                  clicks,
                  impressions
                });
              }
            }
          }
        }
      } catch (adErr) {
        logger.warn("Standard ad report query failed", adErr);
      }
      const videoNamesMap = /* @__PURE__ */ new Map();
      try {
        let libPage = 1;
        let libTotalPage = 1;
        do {
          const libraryUrl = `${this.getBaseUrl()}/file/video/ad/search/?advertiser_id=${advertiserId}&page_size=100&page=${libPage}`;
          const libraryRes = await fetch(libraryUrl, { headers: { "Access-Token": accessToken } });
          const libraryData = await libraryRes.json();
          if (libraryData.code === 0 && libraryData.data?.list) {
            for (const video of libraryData.data.list) {
              const vid = String(video.video_id);
              const url = video.preview_url || video.video_url;
              const urlMatch = url?.match(/@([^/?]+)/);
              const author = urlMatch ? urlMatch[1] : video.author_username || video.identity_name || void 0;
              const authType = String(video.authorization_type || video.identity_type || "").toLowerCase();
              const channelType = authType.includes("official") || authType.includes("shop") ? "INHOUSE" : authType.includes("affiliate") ? "AFFILIATE" : void 0;
              const metaObj = {
                name: video.video_name || `Video ${vid}`,
                url,
                authorUsername: author,
                authorName: video.author_name,
                channelType
              };
              videoNamesMap.set(vid, metaObj);
              if (video.item_id)
                videoNamesMap.set(String(video.item_id), metaObj);
              if (video.tiktok_item_id)
                videoNamesMap.set(String(video.tiktok_item_id), metaObj);
              if (video.post_id)
                videoNamesMap.set(String(video.post_id), metaObj);
            }
            libTotalPage = libraryData.data.page_info?.total_page || 1;
            libPage++;
          } else {
            break;
          }
        } while (libPage <= libTotalPage && libPage <= 5);
      } catch (metaErr) {
        logger.warn("Failed to fetch video library metadata", metaErr);
      }
      const result = Array.from(creativeMap.values()).map((c) => {
        const meta = videoNamesMap.get(c.videoId);
        const videoUrl = meta?.url || c.videoUrl || `https://www.tiktok.com/play/${c.videoId}`;
        const urlMatch = videoUrl?.match(/@([^/?]+)/);
        const authorUsername = meta?.authorUsername || c.authorUsername || (urlMatch ? urlMatch[1] : void 0);
        return {
          ...c,
          name: meta?.name || c.name || `Video ${c.videoId}`,
          videoUrl,
          authorUsername,
          authorName: meta?.authorName || c.authorName,
          channelType: meta?.channelType || c.channelType
        };
      });
      return result;
    } catch (error) {
      logger.error("TikTok getCreativePerformance failed with error", error, { advertiserId });
      return [];
    }
  }
  // Pauses a campaign on TikTok Ads
  static async pauseCampaign(accessToken, advertiserId, campaignId) {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      logger.info("Mock pausing campaign", { advertiserId, campaignId });
      return true;
    }
    try {
      const response = await fetch(`${this.getBaseUrl()}/campaign/status/update/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken
        },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          campaign_ids: [campaignId],
          operation_status: "DISABLE"
        })
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
  // Updates a campaign status (ENABLE/DISABLE) on TikTok Ads
  static async updateCampaignStatus(accessToken, advertiserId, campaignId, status) {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      logger.info(`Mock setting campaign status to ${status}`, { advertiserId, campaignId });
      return true;
    }
    try {
      const response = await fetch(`${this.getBaseUrl()}/campaign/status/update/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken
        },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          campaign_ids: [campaignId],
          operation_status: status
        })
      });
      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || `Failed to update campaign status to ${status}`);
      }
      return true;
    } catch (error) {
      logger.error(`TikTok updateCampaignStatus to ${status} failed`, error, { campaignId });
      throw error;
    }
  }
  // Updates campaign ROAS bid (Target ROI) on TikTok Ads
  static async updateCampaignRoas(accessToken, advertiserId, campaignId, roasBid) {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      logger.info("Mock updating campaign ROAS bid", { advertiserId, campaignId, roasBid });
      return true;
    }
    try {
      const response = await fetch(`${this.getBaseUrl()}/campaign/gmv_max/update/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken
        },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          campaign_id: campaignId,
          roas_bid: roasBid
        })
      });
      const resData = await response.json();
      if (resData.code !== 0) {
        throw new Error(resData.message || "Failed to update campaign ROAS bid");
      }
      return true;
    } catch (error) {
      logger.error("TikTok updateCampaignRoas failed", error, { campaignId });
      throw error;
    }
  }
  // Clones a campaign on TikTok Ads
  static async cloneCampaign(accessToken, advertiserId, oldCampaign) {
    let newName = "";
    const match = oldCampaign.name.match(/\s+(\d+)$/);
    if (match && parseInt(match[1], 10) < 1e3) {
      const num = parseInt(match[1], 10);
      const base = oldCampaign.name.substring(0, oldCampaign.name.lastIndexOf(match[0]));
      newName = `${base} ${num + 1}`;
    } else {
      newName = `${oldCampaign.name} 1`;
    }
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      const newCampaignId = `186${Math.floor(1e12 + Math.random() * 9e12)}`;
      logger.info("Mock cloning campaign", { advertiserId, oldCampaign: oldCampaign.name, newCampaignId, newName });
      return {
        campaignId: newCampaignId,
        name: newName
      };
    }
    try {
      if (oldCampaign.objectiveType === "OUTFLOW_GMV_MAX" && oldCampaign.campaignId) {
        logger.info(`Relaunching GMV Max campaign ${oldCampaign.campaignId} via campaign/gmv_max/create/`);
        const infoUrl = `${this.getBaseUrl()}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${oldCampaign.campaignId}`;
        const infoResponse = await fetch(infoUrl, {
          headers: { "Access-Token": accessToken }
        });
        const infoData = await infoResponse.json();
        if (infoData.code !== 0) {
          throw new Error(`Failed to fetch GMV Max campaign config: ${infoData.message || "Unknown error"}`);
        }
        const oldConfig = infoData.data;
        const now = /* @__PURE__ */ new Date();
        const startTime = now;
        const pad = (n) => n.toString().padStart(2, "0");
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
            hourCycle: "h23"
          });
          const parts = formatter.formatToParts(startTime);
          const getVal = (type) => parts.find((p) => p.type === type)?.value || "00";
          formattedStartTime = `${getVal("year")}-${getVal("month")}-${getVal("day")} ${getVal("hour")}:${getVal("minute")}:${getVal("second")}`;
        } catch (e) {
          logger.error("Failed to format start time in UTC", e);
          formattedStartTime = `${startTime.getUTCFullYear()}-${pad(startTime.getUTCMonth() + 1)}-${pad(startTime.getUTCDate())} ${pad(startTime.getUTCHours())}:${pad(startTime.getUTCMinutes())}:${pad(startTime.getUTCSeconds())}`;
        }
        const requestId = String(Date.now()) + String(Math.floor(Math.random() * 1e3));
        const payload = {
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
          roas_bid: oldCampaign.roasBid !== void 0 ? oldCampaign.roasBid : oldConfig.roas_bid,
          roi_protection_enabled: oldConfig.roi_protection_enabled,
          product_video_specific_type: oldConfig.product_video_specific_type,
          operation_status: "ENABLE"
        };
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
            "Access-Token": accessToken
          },
          body: JSON.stringify(payload)
        });
        const resData = await response.json();
        if (resData.code !== 0) {
          throw new Error(resData.message || "Failed to create GMV Max campaign");
        }
        const newCampaignId = resData.data.campaign_id;
        logger.info("Successfully created GMV Max campaign on TikTok", { advertiserId, newCampaignId, newName });
        return {
          campaignId: newCampaignId,
          name: newName
        };
      } else {
        const apiObjectiveType = oldCampaign.objectiveType === "OUTFLOW_GMV_MAX" ? "PRODUCT_SALES" : oldCampaign.objectiveType;
        const payload = {
          advertiser_id: advertiserId,
          campaign_name: newName,
          objective_type: apiObjectiveType,
          budget_mode: oldCampaign.budgetMode
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
            "Access-Token": accessToken
          },
          body: JSON.stringify(payload)
        });
        const resData = await response.json();
        if (resData.code !== 0) {
          throw new Error(resData.message || "Failed to clone campaign");
        }
        const newCampaignId = resData.data.campaign_id;
        logger.info("Successfully cloned campaign on TikTok", { advertiserId, newCampaignId, newName });
        return {
          campaignId: newCampaignId,
          name: newName
        };
      }
    } catch (error) {
      logger.error("TikTok cloneCampaign failed", error);
      throw error;
    }
  }
  // Updates campaign budget on TikTok Ads
  static async updateCampaignBudget(accessToken, advertiserId, campaignId, newBudget, objectiveType) {
    if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
      logger.info("Mock updating campaign budget", { advertiserId, campaignId, newBudget });
      return true;
    }
    try {
      const isGmvMax = objectiveType === "OUTFLOW_GMV_MAX";
      const url = isGmvMax ? `${this.getBaseUrl()}/campaign/gmv_max/update/` : `${this.getBaseUrl()}/campaign/update/`;
      const payload = {
        advertiser_id: advertiserId,
        campaign_id: campaignId,
        budget: newBudget
      };
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken
        },
        body: JSON.stringify(payload)
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
};

// src/export-malaysia-october.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
async function runExportMalaysiaOctober() {
  console.log("=== B\u1EAET \u0110\u1EA6U K\xC9O D\u1EEE LI\u1EC6U T\u1EEA TIKTOK API CHO SHOP MALAYSIA (01/10 - 21/10) ===");
  const shop = await prisma.shop.findFirst({
    where: {
      OR: [
        { name: { contains: "Malaysia", mode: "insensitive" } },
        { tiktokShopId: { contains: "MALAYSIA", mode: "insensitive" } }
      ]
    },
    include: {
      advertisers: {
        where: { status: "ACTIVE" }
      }
    }
  });
  if (!shop || shop.advertisers.length === 0) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y Shop Malaysia ho\u1EB7c kh\xF4ng c\xF3 t\xE0i kho\u1EA3n qu\u1EA3ng c\xE1o ACTIVE.");
  }
  console.log(`- Shop: ${shop.name} (ID: ${shop.id})`);
  console.log(`- S\u1ED1 t\xE0i kho\u1EA3n qu\u1EA3ng c\xE1o: ${shop.advertisers.length}`);
  shop.advertisers.forEach((a) => console.log(`  + [${a.advertiserId}] ${a.name}`));
  const inhouseChannelsRaw = shop?.inhouseChannels || "";
  const inhouseList = inhouseChannelsRaw.split(/[,;\n]/).map((s) => s.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  console.log(`- Danh s\xE1ch k\xEAnh In-house c\u1EA5u h\xECnh: [${inhouseList.join(", ")}]`);
  const dates = [];
  for (let d = 1; d <= 21; d++) {
    const dayStr = d.toString().padStart(2, "0");
    dates.push(`2026-10-${dayStr}`);
  }
  const rows = [];
  let grandTotalLiveSpend = 0;
  let grandTotalLiveGmv = 0;
  let grandTotalLiveOrders = 0;
  let grandTotalInhouseSpend = 0;
  let grandTotalInhouseGmv = 0;
  let grandTotalInhouseOrders = 0;
  let grandTotalAffiliateSpend = 0;
  let grandTotalAffiliateGmv = 0;
  let grandTotalAffiliateOrders = 0;
  let grandTotalCardSpend = 0;
  let grandTotalCardGmv = 0;
  let grandTotalCardOrders = 0;
  let grandTotalSpend = 0;
  let grandTotalGmv = 0;
  let grandTotalOrders = 0;
  for (const date of dates) {
    console.log(`
>>> \u0110ang qu\xE9t ng\xE0y: ${date} tr\u1EF1c ti\u1EBFp t\u1EEB TikTok Open API...`);
    let dayLiveSpend = 0;
    let dayLiveGmv = 0;
    let dayLiveOrders = 0;
    let dayInhouseSpend = 0;
    let dayInhouseGmv = 0;
    let dayInhouseOrders = 0;
    let dayAffiliateSpend = 0;
    let dayAffiliateGmv = 0;
    let dayAffiliateOrders = 0;
    let dayProductCampSpend = 0;
    let dayProductCampGmv = 0;
    let dayProductCampOrders = 0;
    for (const advertiser of shop.advertisers) {
      try {
        const token = advertiser.accessToken;
        const campaigns = await TikTokApiService.getCampaignPerformance(token, advertiser.advertiserId, date);
        for (const camp of campaigns) {
          if (camp.shoppingAdsType === "LIVE") {
            dayLiveSpend += camp.spend;
            dayLiveGmv += camp.gmv;
            dayLiveOrders += camp.orders;
          } else {
            dayProductCampSpend += camp.spend;
            dayProductCampGmv += camp.gmv;
            dayProductCampOrders += camp.orders;
          }
        }
        const activeProductCampIds = campaigns.filter((c) => (c.spend > 0 || c.gmv > 0 || c.orders > 0) && c.shoppingAdsType !== "LIVE").map((c) => c.campaignId);
        if (activeProductCampIds.length > 0) {
          const creatives = await TikTokApiService.getCreativePerformance(
            token,
            advertiser.advertiserId,
            date,
            activeProductCampIds
          );
          for (const cr of creatives) {
            const author = (cr.authorUsername || "").toLowerCase().replace(/^@/, "");
            const nameLower = (cr.name || "").toLowerCase();
            const videoUrlLower = (cr.videoUrl || "").toLowerCase();
            let isInhouse = cr.channelType === "INHOUSE";
            if (!isInhouse && inhouseList.length > 0) {
              isInhouse = Boolean(author && inhouseList.includes(author)) || inhouseList.some(
                (ch) => nameLower.includes(ch) || videoUrlLower.includes(`/@${ch}`) || videoUrlLower.includes(`/${ch}`)
              );
            }
            if (isInhouse) {
              dayInhouseSpend += cr.spend;
              dayInhouseGmv += cr.gmv;
              dayInhouseOrders += cr.orders;
            } else {
              dayAffiliateSpend += cr.spend;
              dayAffiliateGmv += cr.gmv;
              dayAffiliateOrders += cr.orders;
            }
          }
        }
      } catch (advErr) {
        console.error(`  ! L\u1ED7i qu\xE9t t\xE0i kho\u1EA3n ${advertiser.advertiserId} ng\xE0y ${date}:`, advErr.message);
      }
    }
    const dayTotalVideoSpend = dayInhouseSpend + dayAffiliateSpend;
    const dayTotalVideoGmv = dayInhouseGmv + dayAffiliateGmv;
    const dayTotalVideoOrders = dayInhouseOrders + dayAffiliateOrders;
    const dayCardSpend = Math.max(0, dayProductCampSpend - dayTotalVideoSpend);
    const dayCardGmv = Math.max(0, dayProductCampGmv - dayTotalVideoGmv);
    const dayCardOrders = Math.max(0, dayProductCampOrders - dayTotalVideoOrders);
    const totalDaySpend = dayLiveSpend + dayInhouseSpend + dayAffiliateSpend + dayCardSpend;
    const totalDayGmv = dayLiveGmv + dayInhouseGmv + dayAffiliateGmv + dayCardGmv;
    const totalDayOrders = dayLiveOrders + dayInhouseOrders + dayAffiliateOrders + dayCardOrders;
    const liveRoi = dayLiveSpend > 0 ? dayLiveGmv / dayLiveSpend : 0;
    const inhouseRoi = dayInhouseSpend > 0 ? dayInhouseGmv / dayInhouseSpend : 0;
    const affiliateRoi = dayAffiliateSpend > 0 ? dayAffiliateGmv / dayAffiliateSpend : 0;
    const cardRoi = dayCardSpend > 0 ? dayCardGmv / dayCardSpend : 0;
    const totalRoi = totalDaySpend > 0 ? totalDayGmv / totalDaySpend : 0;
    const rowObj = {
      date,
      liveSpend: Number(dayLiveSpend.toFixed(2)),
      liveGmv: Number(dayLiveGmv.toFixed(2)),
      liveOrders: dayLiveOrders,
      liveRoi: Number(liveRoi.toFixed(2)),
      inhouseSpend: Number(dayInhouseSpend.toFixed(2)),
      inhouseGmv: Number(dayInhouseGmv.toFixed(2)),
      inhouseOrders: dayInhouseOrders,
      inhouseRoi: Number(inhouseRoi.toFixed(2)),
      affiliateSpend: Number(dayAffiliateSpend.toFixed(2)),
      affiliateGmv: Number(dayAffiliateGmv.toFixed(2)),
      affiliateOrders: dayAffiliateOrders,
      affiliateRoi: Number(affiliateRoi.toFixed(2)),
      cardSpend: Number(dayCardSpend.toFixed(2)),
      cardGmv: Number(dayCardGmv.toFixed(2)),
      cardOrders: dayCardOrders,
      cardRoi: Number(cardRoi.toFixed(2)),
      totalSpend: Number(totalDaySpend.toFixed(2)),
      totalGmv: Number(totalDayGmv.toFixed(2)),
      totalOrders: totalDayOrders,
      totalRoi: Number(totalRoi.toFixed(2))
    };
    rows.push(rowObj);
    grandTotalLiveSpend += dayLiveSpend;
    grandTotalLiveGmv += dayLiveGmv;
    grandTotalLiveOrders += dayLiveOrders;
    grandTotalInhouseSpend += dayInhouseSpend;
    grandTotalInhouseGmv += dayInhouseGmv;
    grandTotalInhouseOrders += dayInhouseOrders;
    grandTotalAffiliateSpend += dayAffiliateSpend;
    grandTotalAffiliateGmv += dayAffiliateGmv;
    grandTotalAffiliateOrders += dayAffiliateOrders;
    grandTotalCardSpend += dayCardSpend;
    grandTotalCardGmv += dayCardGmv;
    grandTotalCardOrders += dayCardOrders;
    grandTotalSpend += totalDaySpend;
    grandTotalGmv += totalDayGmv;
    grandTotalOrders += totalDayOrders;
    console.log(
      `  -> Ng\xE0y ${date}: T\u1ED5ng GMV $${totalDayGmv.toFixed(2)} | LIVE $${dayLiveGmv.toFixed(2)} | In-house $${dayInhouseGmv.toFixed(2)} | Aff $${dayAffiliateGmv.toFixed(2)} | Th\u1EBB SP $${dayCardGmv.toFixed(2)}`
    );
    await new Promise((r) => setTimeout(r, 300));
  }
  const header = [
    "Ng\xE0y",
    "Chi ph\xED LIVE ($)",
    "GMV LIVE ($)",
    "\u0110\u01A1n LIVE",
    "ROI LIVE",
    "Chi ph\xED In-house ($)",
    "GMV In-house ($)",
    "\u0110\u01A1n In-house",
    "ROI In-house",
    "Chi ph\xED Affiliate ($)",
    "GMV Affiliate ($)",
    "\u0110\u01A1n Affiliate",
    "ROI Affiliate",
    "Chi ph\xED Th\u1EBB SP ($)",
    "GMV Th\u1EBB SP ($)",
    "\u0110\u01A1n Th\u1EBB SP",
    "ROI Th\u1EBB SP",
    "T\u1ED5ng Chi ph\xED ($)",
    "T\u1ED5ng GMV ($)",
    "T\u1ED5ng \u0110\u01A1n",
    "T\u1ED5ng ROI"
  ].join(",");
  const csvLines = rows.map(
    (r) => [
      r.date,
      r.liveSpend,
      r.liveGmv,
      r.liveOrders,
      r.liveRoi,
      r.inhouseSpend,
      r.inhouseGmv,
      r.inhouseOrders,
      r.inhouseRoi,
      r.affiliateSpend,
      r.affiliateGmv,
      r.affiliateOrders,
      r.affiliateRoi,
      r.cardSpend,
      r.cardGmv,
      r.cardOrders,
      r.cardRoi,
      r.totalSpend,
      r.totalGmv,
      r.totalOrders,
      r.totalRoi
    ].join(",")
  );
  const grandLiveRoi = grandTotalLiveSpend > 0 ? grandTotalLiveGmv / grandTotalLiveSpend : 0;
  const grandInhouseRoi = grandTotalInhouseSpend > 0 ? grandTotalInhouseGmv / grandTotalInhouseSpend : 0;
  const grandAffiliateRoi = grandTotalAffiliateSpend > 0 ? grandTotalAffiliateGmv / grandTotalAffiliateSpend : 0;
  const grandCardRoi = grandTotalCardSpend > 0 ? grandTotalCardGmv / grandTotalCardSpend : 0;
  const grandTotalRoi = grandTotalSpend > 0 ? grandTotalGmv / grandTotalSpend : 0;
  const totalLine = [
    "T\u1ED4NG C\u1ED8NG (01/10 - 21/10)",
    grandTotalLiveSpend.toFixed(2),
    grandTotalLiveGmv.toFixed(2),
    grandTotalLiveOrders,
    grandLiveRoi.toFixed(2),
    grandTotalInhouseSpend.toFixed(2),
    grandTotalInhouseGmv.toFixed(2),
    grandTotalInhouseOrders,
    grandInhouseRoi.toFixed(2),
    grandTotalAffiliateSpend.toFixed(2),
    grandTotalAffiliateGmv.toFixed(2),
    grandTotalAffiliateOrders,
    grandAffiliateRoi.toFixed(2),
    grandTotalCardSpend.toFixed(2),
    grandTotalCardGmv.toFixed(2),
    grandTotalCardOrders,
    grandCardRoi.toFixed(2),
    grandTotalSpend.toFixed(2),
    grandTotalGmv.toFixed(2),
    grandTotalOrders,
    grandTotalRoi.toFixed(2)
  ].join(",");
  const csvContent = "\uFEFF" + [header, ...csvLines, totalLine].join("\r\n");
  try {
    const outputPath = path.resolve(process.cwd(), "malaysia_october_report.csv");
    fs.writeFileSync(outputPath, csvContent, "utf8");
    console.log(`[EXPORT] \u0110\xE3 l\u01B0u file t\u1EA1i: ${outputPath}`);
  } catch (writeErr) {
    console.warn("[EXPORT] Kh\xF4ng th\u1EC3 ghi file ra \u0111\u0129a:", writeErr.message);
  }
  const summary = {
    live: { spend: grandTotalLiveSpend, gmv: grandTotalLiveGmv, orders: grandTotalLiveOrders, roi: grandLiveRoi },
    inhouse: { spend: grandTotalInhouseSpend, gmv: grandTotalInhouseGmv, orders: grandTotalInhouseOrders, roi: grandInhouseRoi },
    affiliate: { spend: grandTotalAffiliateSpend, gmv: grandTotalAffiliateGmv, orders: grandTotalAffiliateOrders, roi: grandAffiliateRoi },
    card: { spend: grandTotalCardSpend, gmv: grandTotalCardGmv, orders: grandTotalCardOrders, roi: grandCardRoi },
    total: { spend: grandTotalSpend, gmv: grandTotalGmv, orders: grandTotalOrders, roi: grandTotalRoi }
  };
  return { csvContent, rows, summary };
}
if (require.main === module) {
  runExportMalaysiaOctober().then(({ csvContent, summary }) => {
    const outputPath = path.resolve(process.cwd(), "malaysia_october_report.csv");
    fs.writeFileSync(outputPath, csvContent, "utf8");
    console.log(`
======================================================`);
    console.log(` \u0110\xC3 XU\u1EA4T TH\xC0NH C\xD4NG RA FILE: ${outputPath}`);
    console.log(`======================================================`);
    console.log(`T\u1ED4NG K\u1EBET T\u1EEA 01/10 \u0110\u1EBEN 21/10:`);
    console.log(`- LIVE:         GMV $${summary.live.gmv.toFixed(2)} | Chi ph\xED $${summary.live.spend.toFixed(2)} | \u0110\u01A1n ${summary.live.orders} | ROI ${summary.live.roi.toFixed(2)}x`);
    console.log(`- IN-HOUSE:     GMV $${summary.inhouse.gmv.toFixed(2)} | Chi ph\xED $${summary.inhouse.spend.toFixed(2)} | \u0110\u01A1n ${summary.inhouse.orders} | ROI ${summary.inhouse.roi.toFixed(2)}x`);
    console.log(`- AFFILIATE:    GMV $${summary.affiliate.gmv.toFixed(2)} | Chi ph\xED $${summary.affiliate.spend.toFixed(2)} | \u0110\u01A1n ${summary.affiliate.orders} | ROI ${summary.affiliate.roi.toFixed(2)}x`);
    console.log(`- TH\u1EBA S\u1EA2N PH\u1EA8M: GMV $${summary.card.gmv.toFixed(2)} | Chi ph\xED $${summary.card.spend.toFixed(2)} | \u0110\u01A1n ${summary.card.orders} | ROI ${summary.card.roi.toFixed(2)}x`);
    console.log(`- T\u1ED4NG C\u1ED8NG:    GMV $${summary.total.gmv.toFixed(2)} | Chi ph\xED $${summary.total.spend.toFixed(2)} | \u0110\u01A1n ${summary.total.orders} | ROI ${summary.total.roi.toFixed(2)}x`);
    process.exit(0);
  }).catch((err) => {
    console.error("L\u1ED7i khi xu\u1EA5t d\u1EEF li\u1EC7u:", err);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runExportMalaysiaOctober
});
