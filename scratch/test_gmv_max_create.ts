const accessToken = "52c72d1ba28cd0fdfac514774d8b3a6822249f60";
const advertiserId = "7562821854005297153";
const baseUrl = "https://business-api.tiktok.com/open_api/v1.3";
const campaignId = "1866952438159889";

function formatDateTime(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function run() {
  console.log("Fetching old campaign GMV Max info...");
  const getUrl = `${baseUrl}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${campaignId}`;
  const getRes = await fetch(getUrl, {
    headers: { "Access-Token": accessToken }
  });
  const getData: any = await getRes.json();
  
  if (getData.code !== 0) {
    console.error("Failed to fetch old campaign GMV Max info:", getData);
    return;
  }
  
  const oldConfig = getData.data;
  console.log("Successfully fetched old campaign config.");

  const now = new Date();
  const startTime = new Date(now.getTime() + 60000);
  const formattedStartTime = formatDateTime(startTime);

  // Generate a unique numeric request_id as a string containing only digits (int64)
  const requestId = String(Date.now()) + String(Math.floor(Math.random() * 1000));

  // Build creation payload
  const payload = {
    advertiser_id: advertiserId,
    request_id: requestId, // Pass numeric request_id
    campaign_name: `TEST LIVE GMV Max Clone - ${new Date().getTime()}`,
    shopping_ads_type: oldConfig.shopping_ads_type,
    store_id: oldConfig.store_id,
    store_authorized_bc_id: oldConfig.store_authorized_bc_id,
    identity_list: oldConfig.identity_list,
    placements: oldConfig.placements,
    location_ids: oldConfig.location_ids,
    age_groups: oldConfig.age_groups,
    budget: oldConfig.budget,
    schedule_type: oldConfig.schedule_type,
    schedule_start_time: formattedStartTime,
    optimization_goal: oldConfig.optimization_goal,
    deep_bid_type: oldConfig.deep_bid_type,
    roas_bid: oldConfig.roas_bid,
    roi_protection_enabled: oldConfig.roi_protection_enabled,
    product_video_specific_type: oldConfig.product_video_specific_type,
    operation_status: "DISABLE"
  };

  console.log("Creation Payload with numeric request_id:", JSON.stringify(payload, null, 2));

  console.log("Calling campaign/gmv_max/create/...");
  const createUrl = `${baseUrl}/campaign/gmv_max/create/`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": accessToken
    },
    body: JSON.stringify(payload)
  });
  const createData = await createRes.json();
  console.log("API Response:", JSON.stringify(createData, null, 2));
}

run();
