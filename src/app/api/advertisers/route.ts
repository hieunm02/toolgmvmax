import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { TikTokApiService } from "../../../lib/tiktok";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId") || undefined;
    const all = searchParams.get("all") === "true";

    const whereClause: any = {};
    if (shopId) {
      whereClause.shopId = shopId;
    }
    if (!all) {
      whereClause.status = "ACTIVE";
    }

    const advertisers = await prisma.advertiser.findMany({
      where: whereClause,
      select: {
        id: true,
        advertiserId: true,
        name: true,
        status: true,
        shopId: true,
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json({ success: true, data: advertisers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { advertiserId, advertiserIds, status, shopId } = body;

    if (status === undefined && shopId === undefined) {
      return NextResponse.json({ success: false, error: "Missing status or shopId to update" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (shopId !== undefined && shopId !== "") dataToUpdate.shopId = shopId;

    if (advertiserIds && Array.isArray(advertiserIds)) {
      const updated = await prisma.advertiser.updateMany({
        where: {
          advertiserId: {
            in: advertiserIds,
          },
        },
        data: dataToUpdate,
      });
      return NextResponse.json({ success: true, data: { count: updated.count } });
    }

    if (!advertiserId) {
      return NextResponse.json({ success: false, error: "Missing advertiserId or advertiserIds" }, { status: 400 });
    }

    const updated = await prisma.advertiser.update({
      where: { advertiserId },
      data: dataToUpdate,
      select: {
        id: true,
        advertiserId: true,
        name: true,
        status: true,
        shopId: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { authCode, shopId } = body;

    if (!authCode) {
      return NextResponse.json({ success: false, error: "Missing authCode" }, { status: 400 });
    }

    // Default to first active shop if shopId is not specified
    let targetShopId = shopId;
    if (!targetShopId) {
      const firstShop = await prisma.shop.findFirst({
        where: { status: "ACTIVE" }
      });
      if (!firstShop) {
        return NextResponse.json({ success: false, error: "Please register a Shop first on the web interface" }, { status: 400 });
      }
      targetShopId = firstShop.id;
    } else {
      const shopExists = await prisma.shop.findUnique({
        where: { id: targetShopId }
      });
      if (!shopExists) {
        return NextResponse.json({ success: false, error: "Selected Shop not found" }, { status: 400 });
      }
    }

    // Exchange auth code for tokens
    const tokens = await TikTokApiService.getAccessToken(authCode);

    // Retrieve advertising accounts list connected to the token
    const advertiserList = await TikTokApiService.getAdvertiserAccounts(tokens.accessToken);
    if (advertiserList.length === 0) {
      return NextResponse.json({ success: false, error: "No advertiser accounts found connected to this authorization token" }, { status: 400 });
    }

    const linkedAccounts = [];
    for (const adv of advertiserList) {
      const dbAdv = await prisma.advertiser.upsert({
        where: { advertiserId: adv.advertiserId },
        update: {
          name: adv.name,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          shopId: targetShopId,
          status: "ACTIVE"
        },
        create: {
          advertiserId: adv.advertiserId,
          name: adv.name,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          shopId: targetShopId,
          status: "ACTIVE"
        }
      });
      linkedAccounts.push({ advertiserId: dbAdv.advertiserId, name: dbAdv.name });
    }

    return NextResponse.json({ success: true, data: { linkedAccounts } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to link ad accounts" }, { status: 500 });
  }
}

