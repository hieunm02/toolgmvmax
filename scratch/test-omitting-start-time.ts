import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const advertiserId = "7536957336980766728";
  const adv = await prisma.advertiser.findUnique({
    where: { advertiserId }
  });
  if (!adv) {
    console.error("Advertiser not found in DB!");
    return;
  }

  const oldCampaignId = "1867063225710770";
  
  const baseUrl = "https://business-api.tiktok.com/open_api/v1.3";
  const infoUrl = `${baseUrl}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${oldCampaignId}`;
  
  const infoResponse = await fetch(infoUrl, {
    headers: { "Access-Token": adv.accessToken }
  });
  const infoData = await infoResponse.json();
  if (infoData.code !== 0) {
    console.error("Failed to fetch campaign config:", infoData.message);
    return;
  }
  
  const oldConfig = infoData.data;
  const newName = `TEST IMMEDIATE START PAST ${Date.now()}`;
  const requestId = String(Date.now()) + String(Math.floor(Math.random() * 1000));

  // Set schedule_start_time to current UTC time - 10 seconds (in the PAST)
  const now = new Date();
  const startTime = new Date(now.getTime() - 10000); // 10 seconds in the past
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedStartTime = `${startTime.getUTCFullYear()}-${pad(startTime.getUTCMonth() + 1)}-${pad(startTime.getUTCDate())} ${pad(startTime.getUTCHours())}:${pad(startTime.getUTCMinutes())}:${pad(startTime.getUTCSeconds())}`;

  const payload: any = {
    advertiser_id: advertiserId,
    request_id: requestId,
    campaign_name: newName,
    shopping_ads_type: oldConfig.shopping_ads_type || "PRODUCT",
    store_id: oldConfig.store_id,
    store_authorized_bc_id: oldConfig.store_authorized_bc_id,
    identity_list: oldConfig.identity_list,
    placements: oldConfig.placements,
    location_ids: oldConfig.location_ids,
    age_groups: oldConfig.age_groups,
    budget: oldConfig.budget,
    schedule_type: "SCHEDULE_FROM_NOW",
    schedule_start_time: formattedStartTime,
    optimization_goal: oldConfig.optimization_goal,
    deep_bid_type: oldConfig.deep_bid_type,
    roas_bid: oldConfig.roas_bid,
    roi_protection_enabled: oldConfig.roi_protection_enabled,
    product_video_specific_type: oldConfig.product_video_specific_type,
    operation_status: "DISABLE" // Keep disabled for test
  };

  if (oldConfig.product_specific_type) {
    payload.product_specific_type = oldConfig.product_specific_type;
  }
  
  console.log("Sending payload with 10s PAST start time:", formattedStartTime);

  const createUrl = `${baseUrl}/campaign/gmv_max/create/`;
  const response = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": adv.accessToken,
    },
    body: JSON.stringify(payload),
  });

  const resData = await response.json();
  console.log("Response data:", JSON.stringify(resData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
