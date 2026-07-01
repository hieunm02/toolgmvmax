import { NextResponse } from "next/server";
import { CampaignRelaunchService } from "../../../../service/relaunch";

export async function POST(request: Request) {
  try {
    const { campaignId, alertId, budget, roasBid } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Missing campaignId" }, { status: 400 });
    }

    const result = await CampaignRelaunchService.relaunchCampaign(
      campaignId,
      alertId,
      budget !== undefined ? Number(budget) : undefined,
      roasBid !== undefined ? Number(roasBid) : undefined
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        oldCampaignId: campaignId,
        newCampaignId: result.newCampaignId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
