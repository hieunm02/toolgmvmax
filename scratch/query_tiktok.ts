const accessToken = "52c72d1ba28cd0fdfac514774d8b3a6822249f60";
const advertiserId = "7562821854005297153";
const baseUrl = "https://business-api.tiktok.com/open_api/v1.3";

async function queryCampaign(campaignId: string) {
  try {
    const response = await fetch(`${baseUrl}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${campaignId}`, {
      headers: { "Access-Token": accessToken }
    });
    const data = await response.json();
    console.log(`Campaign ${campaignId} GMV Max Info:`, JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error(`Query failed for ${campaignId}:`, err.message);
  }
}

async function run() {
  await queryCampaign("1866956208687410");
}

run();
