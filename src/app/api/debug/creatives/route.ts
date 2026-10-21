import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getVietnamDateString } from "../../../../lib/date-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || getVietnamDateString();
    
    // Find first active advertiser
    const advertiser = await prisma.advertiser.findFirst({
      where: { status: "ACTIVE" },
      include: { shop: true },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "No active advertiser found" });
    }

    const baseUrl = process.env.USE_SANDBOX_API === "true"
      ? "https://sandbox-ads.tiktok.com/open_api/v1.3"
      : "https://business-api.tiktok.com/open_api/v1.3";

    const accessToken = advertiser.accessToken;
    const advertiserId = advertiser.advertiserId;

    // 1. Get Stores
    let storesRes: any = null;
    try {
      const storeRes = await fetch(`${baseUrl}/gmv_max/store/list/?advertiser_id=${advertiserId}`, {
        headers: { "Access-Token": accessToken },
      });
      storesRes = await storeRes.json();
    } catch (e: any) {
      storesRes = { error: e.message };
    }

    const storeIds: string[] = storesRes?.data?.store_list?.map((s: any) => s.store_id) || [];

    // 2. Test GMV Max Report with different dimensions
    const gmvReports: any[] = [];
    if (storeIds.length > 0) {
      const testDims = [
        ["campaign_id"],
        ["item_id"],
        ["campaign_id", "item_id"],
        ["creative/item_id"],
        ["main_material_id"],
        ["material_id"],
      ];

      for (const dims of testDims) {
        try {
          const url = `${baseUrl}/gmv_max/report/get/?advertiser_id=${advertiserId}&store_ids=${encodeURIComponent(JSON.stringify([storeIds[0]]))}&dimensions=${encodeURIComponent(JSON.stringify(dims))}&metrics=${encodeURIComponent(JSON.stringify(["roi", "orders", "cost", "gross_revenue"]))}&start_date=${dateParam}&end_date=${dateParam}&page_size=20`;
          const res = await fetch(url, { headers: { "Access-Token": accessToken } });
          const json = await res.json();
          gmvReports.push({
            dims,
            code: json.code,
            message: json.message,
            rows: json.data?.list?.length || 0,
            sample: json.data?.list?.slice(0, 3) || [],
          });
        } catch (e: any) {
          gmvReports.push({ dims, error: e.message });
        }
      }
    }

    // 3. Test Smart+ Material Report Breakdown
    const smartBreakdowns: any[] = [];
    const smartDims = [["material_id"], ["main_material_id"]];
    for (const sDims of smartDims) {
      try {
        const smartMetrics = JSON.stringify(["spend", "impressions", "clicks", "conversions"]);
        const url = `${baseUrl}/smart_plus/material_report/breakdown/?advertiser_id=${advertiserId}&dimensions=${encodeURIComponent(JSON.stringify(sDims))}&metrics=${encodeURIComponent(smartMetrics)}&start_date=${dateParam}&end_date=${dateParam}&page_size=20`;
        const res = await fetch(url, { headers: { "Access-Token": accessToken } });
        const json = await res.json();
        smartBreakdowns.push({
          dims: sDims,
          code: json.code,
          message: json.message,
          rows: json.data?.list?.length || 0,
          sample: json.data?.list?.slice(0, 3) || [],
        });
      } catch (e: any) {
        smartBreakdowns.push({ dims: sDims, error: e.message });
      }
    }

    // 4. Test Video Library
    let libraryRes: any = null;
    try {
      const libUrl = `${baseUrl}/file/video/ad/search/?advertiser_id=${advertiserId}&page_size=10`;
      const res = await fetch(libUrl, { headers: { "Access-Token": accessToken } });
      const json = await res.json();
      libraryRes = {
        code: json.code,
        message: json.message,
        count: json.data?.list?.length || 0,
        sample: json.data?.list?.slice(0, 3)?.map((v: any) => ({
          video_id: v.video_id,
          video_name: v.video_name,
          author_username: v.author_username,
          identity_type: v.identity_type,
          authorization_type: v.authorization_type,
        })) || [],
      };
    } catch (e: any) {
      libraryRes = { error: e.message };
    }

    // 5. Check local DB Creative and CreativeReport counts
    const localCreativesCount = await prisma.creative.count();
    const localCreativeReports = await prisma.creativeReport.findMany({
      where: {
        date: {
          gte: new Date(dateParam),
          lte: new Date(`${dateParam}T23:59:59.999Z`),
        },
      },
      select: {
        spend: true,
        gmv: true,
        orders: true,
        creative: {
          select: {
            videoId: true,
            name: true,
            channelType: true,
          },
        },
      },
    });

    return NextResponse.json({
      advertiser: {
        id: advertiser.id,
        advertiserId: advertiser.advertiserId,
        name: advertiser.name,
        shopName: advertiser.shop?.name,
        inhouseChannels: (advertiser.shop as any)?.inhouseChannels,
      },
      targetDate: dateParam,
      storesRes,
      gmvReports,
      smartBreakdowns,
      libraryRes,
      localDb: {
        totalCreativesInDb: localCreativesCount,
        reportsForTargetDate: localCreativeReports,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
