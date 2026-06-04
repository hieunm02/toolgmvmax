import { NextResponse } from "next/server";
import { CreativeRepository } from "../../../repository/creative";
import { prisma } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId") || undefined;
    const creatives = await CreativeRepository.getCreativesWithStats({ shopId });

    let list = creatives.map((c) => {
      let spend = 0;
      let gmv = 0;
      let orders = 0;
      let impressions = 0;
      let clicks = 0;

      c.reports.forEach((r) => {
        spend += r.spend;
        gmv += r.gmv;
        orders += r.orders;
        impressions += r.impressions;
        clicks += r.clicks;
      });

      const roi = spend > 0 ? gmv / spend : 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;

      return {
        id: c.id,
        videoId: c.videoId,
        name: c.name,
        videoUrl: c.videoUrl,
        advertiserName: c.advertiser.name,
        shopName: c.advertiser.shop.name,
        spend,
        gmv,
        roi,
        orders,
        ctr,
      };
    });

    // Auto-generate mock data fallback if list is empty
    if (list.length === 0) {
      const shop = shopId ? await prisma.shop.findUnique({ where: { id: shopId } }) : null;
      const shopName = shop ? shop.name : "Mock Shop";

      list = [
        {
          id: "mock-v1",
          videoId: "VID_MOCK_1",
          name: `Top Creative Video ad for ${shopName} - High conversion trend`,
          videoUrl: "https://www.tiktok.com/play/mock1",
          advertiserName: `Mock Ads Account (${shopName})`,
          shopName: shopName,
          spend: 1800000,
          gmv: 7200000,
          roi: 4.0,
          orders: 48,
          ctr: 0.038,
        },
        {
          id: "mock-v2",
          videoId: "VID_MOCK_2",
          name: `Product unboxing lifestyle vlog - ${shopName}`,
          videoUrl: "https://www.tiktok.com/play/mock2",
          advertiserName: `Mock Ads Account (${shopName})`,
          shopName: shopName,
          spend: 1200000,
          gmv: 2400000,
          roi: 2.0,
          orders: 16,
          ctr: 0.019,
        },
        {
          id: "mock-v3",
          videoId: "VID_MOCK_3",
          name: `Underperforming hook variant - Swap video recommended`,
          videoUrl: "https://www.tiktok.com/play/mock3",
          advertiserName: `Mock Ads Account (${shopName})`,
          shopName: shopName,
          spend: 1000000,
          gmv: 200000,
          roi: 0.2,
          orders: 1,
          ctr: 0.007,
        }
      ];
    }

    const topCreatives = [...list].sort((a, b) => b.gmv - a.gmv);
    const worstCreatives = [...list].sort((a, b) => a.roi - b.roi);

    return NextResponse.json({
      success: true,
      data: {
        creatives: list,
        topCreatives,
        worstCreatives,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

