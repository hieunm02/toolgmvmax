import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { TikTokApiService } from "../../../../lib/tiktok";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Missing campaignId" }, { status: 400 });
    }

    // Find campaign and its advertiser to get accessToken
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId },
      include: {
        advertiser: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }

    const { accessToken, advertiserId } = campaign.advertiser;

    // Fetch real-time GMV Max campaign info from TikTok API
    if (campaign.objectiveType === "OUTFLOW_GMV_MAX") {
      if (process.env.MOCK_TIKTOK_API === "true" || accessToken.startsWith("mock_")) {
        return NextResponse.json({
          success: true,
          data: {
            campaignId,
            budget: campaign.budget,
            roasBid: 3.5, // Mock target ROI
          },
        });
      }

      const infoUrl = `${TikTokApiService["getBaseUrl"]()}/campaign/gmv_max/info/?advertiser_id=${advertiserId}&campaign_id=${campaignId}`;
      const response = await fetch(infoUrl, {
        headers: { "Access-Token": accessToken },
      });
      const resData = await response.json();

      if (resData.code !== 0) {
        return NextResponse.json({ success: false, error: resData.message || "Failed to fetch config" }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: {
          campaignId,
          budget: resData.data?.budget || campaign.budget,
          roasBid: resData.data?.roas_bid || 0.0,
        },
      });
    }

    // Fallback for non GMV Max campaigns
    return NextResponse.json({
      success: true,
      data: {
        campaignId,
        budget: campaign.budget,
        roasBid: 0.0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
