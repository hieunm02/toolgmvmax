import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ success: true, data: shops });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      tiktokShopId,
      autoRelaunchRoiThreshold,
      autoRelaunchMinSpend,
      autoRelaunchMaxOrders,
      autoRelaunchVideoEnabled,
      autoRelaunchVideoRoi,
      autoRelaunchVideoMinSpend,
      autoRelaunchVideoMaxOrders,
      autoRelaunchLiveEnabled,
      autoRelaunchLiveRoi,
      autoRelaunchLiveMinSpend,
      autoRelaunchLiveMaxOrders,
      inhouseChannels,
    } = body;

    if (!name || !tiktokShopId) {
      return NextResponse.json({ success: false, error: "Missing name or tiktokShopId" }, { status: 400 });
    }

    // Check if shop with tiktokShopId already exists
    const existing = await prisma.shop.findUnique({
      where: { tiktokShopId },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "Shop with this TikTok Shop ID already exists" }, { status: 400 });
    }

    const shop = await prisma.shop.create({
      data: {
        name,
        tiktokShopId,
        autoRelaunchRoiThreshold: autoRelaunchRoiThreshold !== undefined ? parseFloat(autoRelaunchRoiThreshold) : 3.0,
        autoRelaunchMinSpend: autoRelaunchMinSpend !== undefined ? parseFloat(autoRelaunchMinSpend) : 200000.0,
        autoRelaunchMaxOrders: autoRelaunchMaxOrders !== undefined ? parseInt(autoRelaunchMaxOrders) : 20,
        autoRelaunchVideoEnabled: autoRelaunchVideoEnabled !== undefined ? Boolean(autoRelaunchVideoEnabled) : true,
        autoRelaunchVideoRoi: autoRelaunchVideoRoi !== undefined ? parseFloat(autoRelaunchVideoRoi) : (autoRelaunchRoiThreshold !== undefined ? parseFloat(autoRelaunchRoiThreshold) : 3.0),
        autoRelaunchVideoMinSpend: autoRelaunchVideoMinSpend !== undefined ? parseFloat(autoRelaunchVideoMinSpend) : (autoRelaunchMinSpend !== undefined ? parseFloat(autoRelaunchMinSpend) : 200000.0),
        autoRelaunchVideoMaxOrders: autoRelaunchVideoMaxOrders !== undefined ? parseInt(autoRelaunchVideoMaxOrders) : (autoRelaunchMaxOrders !== undefined ? parseInt(autoRelaunchMaxOrders) : 20),
        autoRelaunchLiveEnabled: autoRelaunchLiveEnabled !== undefined ? Boolean(autoRelaunchLiveEnabled) : true,
        autoRelaunchLiveRoi: autoRelaunchLiveRoi !== undefined ? parseFloat(autoRelaunchLiveRoi) : (autoRelaunchRoiThreshold !== undefined ? parseFloat(autoRelaunchRoiThreshold) : 3.0),
        autoRelaunchLiveMinSpend: autoRelaunchLiveMinSpend !== undefined ? parseFloat(autoRelaunchLiveMinSpend) : (autoRelaunchMinSpend !== undefined ? parseFloat(autoRelaunchMinSpend) : 200000.0),
        autoRelaunchLiveMaxOrders: autoRelaunchLiveMaxOrders !== undefined ? parseInt(autoRelaunchLiveMaxOrders) : (autoRelaunchMaxOrders !== undefined ? parseInt(autoRelaunchMaxOrders) : 20),
        inhouseChannels: inhouseChannels !== undefined && inhouseChannels !== null ? String(inhouseChannels).trim() : null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, data: shop });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      tiktokShopId,
      autoRelaunchRoiThreshold,
      autoRelaunchMinSpend,
      autoRelaunchMaxOrders,
      autoRelaunchVideoEnabled,
      autoRelaunchVideoRoi,
      autoRelaunchVideoMinSpend,
      autoRelaunchVideoMaxOrders,
      autoRelaunchLiveEnabled,
      autoRelaunchLiveRoi,
      autoRelaunchLiveMinSpend,
      autoRelaunchLiveMaxOrders,
      inhouseChannels,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing shop id" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (tiktokShopId !== undefined) dataToUpdate.tiktokShopId = tiktokShopId;
    if (autoRelaunchRoiThreshold !== undefined) {
      dataToUpdate.autoRelaunchRoiThreshold = parseFloat(autoRelaunchRoiThreshold);
    }
    if (autoRelaunchMinSpend !== undefined) {
      dataToUpdate.autoRelaunchMinSpend = parseFloat(autoRelaunchMinSpend);
    }
    if (autoRelaunchMaxOrders !== undefined) {
      dataToUpdate.autoRelaunchMaxOrders = parseInt(autoRelaunchMaxOrders);
    }

    // Video settings
    if (autoRelaunchVideoEnabled !== undefined) {
      dataToUpdate.autoRelaunchVideoEnabled = Boolean(autoRelaunchVideoEnabled);
    }
    if (autoRelaunchVideoRoi !== undefined) {
      dataToUpdate.autoRelaunchVideoRoi = parseFloat(autoRelaunchVideoRoi);
    }
    if (autoRelaunchVideoMinSpend !== undefined) {
      dataToUpdate.autoRelaunchVideoMinSpend = parseFloat(autoRelaunchVideoMinSpend);
    }
    if (autoRelaunchVideoMaxOrders !== undefined) {
      dataToUpdate.autoRelaunchVideoMaxOrders = parseInt(autoRelaunchVideoMaxOrders);
    }

    // Live settings
    if (autoRelaunchLiveEnabled !== undefined) {
      dataToUpdate.autoRelaunchLiveEnabled = Boolean(autoRelaunchLiveEnabled);
    }
    if (autoRelaunchLiveRoi !== undefined) {
      dataToUpdate.autoRelaunchLiveRoi = parseFloat(autoRelaunchLiveRoi);
    }
    if (autoRelaunchLiveMinSpend !== undefined) {
      dataToUpdate.autoRelaunchLiveMinSpend = parseFloat(autoRelaunchLiveMinSpend);
    }
    if (autoRelaunchLiveMaxOrders !== undefined) {
      dataToUpdate.autoRelaunchLiveMaxOrders = parseInt(autoRelaunchLiveMaxOrders);
    }
    if (inhouseChannels !== undefined) {
      dataToUpdate.inhouseChannels = inhouseChannels && String(inhouseChannels).trim() ? String(inhouseChannels).trim() : null;
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: dataToUpdate,
    });

    // If inhouseChannels was updated, re-evaluate existing creatives immediately
    if (inhouseChannels !== undefined) {
      try {
        const inhouseList = (inhouseChannels || "")
          .split(/[,;\n]/)
          .map((s: string) => s.trim().toLowerCase().replace(/^@/, ""))
          .filter(Boolean);

        const creatives = await prisma.creative.findMany({
          where: { advertiser: { shopId: id } },
        });

        for (const cr of creatives) {
          const author = (cr.authorUsername || "").toLowerCase().replace(/^@/, "");
          const nameLower = (cr.name || "").toLowerCase();
          const videoUrlLower = (cr.videoUrl || "").toLowerCase();

          const isInhouse = inhouseList.length > 0 && (
            (author && inhouseList.some((ch: string) => author === ch || author.includes(ch) || ch.includes(author))) ||
            inhouseList.some((ch: string) => nameLower.includes(ch) || videoUrlLower.includes(`/@${ch}`) || videoUrlLower.includes(`/${ch}`))
          );

          const newChannel = isInhouse ? "INHOUSE" : "AFFILIATE";
          if (cr.channelType !== newChannel) {
            await prisma.creative.update({
              where: { id: cr.id },
              data: { channelType: newChannel },
            });
          }
        }
      } catch (err) {
        console.error("Error re-evaluating existing creatives for shop:", err);
      }
    }

    return NextResponse.json({ success: true, data: shop });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing shop id" }, { status: 400 });
    }

    await prisma.shop.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Shop deleted successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
