import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

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
