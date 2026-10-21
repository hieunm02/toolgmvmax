import { prisma } from "./lib/db";
import { TikTokApiService } from "./lib/tiktok";
import * as fs from "fs";
import * as path from "path";

export async function runExportMalaysiaOctober(): Promise<{
  csvContent: string;
  rows: any[];
  summary: any;
}> {
  console.log("=== BẮT ĐẦU KÉO DỮ LIỆU TỪ TIKTOK API CHO SHOP MALAYSIA (01/10 - 21/10) ===");

  // 1. Tìm shop Malaysia và các tài khoản quảng cáo liên kết
  const shop = await prisma.shop.findFirst({
    where: {
      OR: [
        { name: { contains: "Malaysia", mode: "insensitive" } },
        { tiktokShopId: { contains: "MALAYSIA", mode: "insensitive" } },
      ],
    },
    include: {
      advertisers: {
        where: { status: "ACTIVE" },
      },
    },
  });

  if (!shop || shop.advertisers.length === 0) {
    throw new Error("Không tìm thấy Shop Malaysia hoặc không có tài khoản quảng cáo ACTIVE.");
  }

  console.log(`- Shop: ${shop.name} (ID: ${shop.id})`);
  console.log(`- Số tài khoản quảng cáo: ${shop.advertisers.length}`);
  shop.advertisers.forEach((a) => console.log(`  + [${a.advertiserId}] ${a.name}`));

  // 2. Kênh in-house
  const inhouseChannelsRaw = (shop as any)?.inhouseChannels || "";
  const inhouseList = inhouseChannelsRaw
    .split(/[,;\n]/)
    .map((s: string) => s.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  console.log(`- Danh sách kênh In-house cấu hình: [${inhouseList.join(", ")}]`);

  // 3. Danh sách ngày từ 01/10/2026 đến 21/10/2026
  const dates: string[] = [];
  for (let d = 1; d <= 21; d++) {
    const dayStr = d.toString().padStart(2, "0");
    dates.push(`2026-10-${dayStr}`);
  }

  const rows: any[] = [];

  let grandTotalLiveSpend = 0;
  let grandTotalLiveGmv = 0;
  let grandTotalLiveOrders = 0;

  let grandTotalInhouseSpend = 0;
  let grandTotalInhouseGmv = 0;
  let grandTotalInhouseOrders = 0;

  let grandTotalAffiliateSpend = 0;
  let grandTotalAffiliateGmv = 0;
  let grandTotalAffiliateOrders = 0;

  let grandTotalCardSpend = 0;
  let grandTotalCardGmv = 0;
  let grandTotalCardOrders = 0;

  let grandTotalSpend = 0;
  let grandTotalGmv = 0;
  let grandTotalOrders = 0;

  for (const date of dates) {
    console.log(`\n>>> Đang quét ngày: ${date} trực tiếp từ TikTok Open API...`);

    let dayLiveSpend = 0;
    let dayLiveGmv = 0;
    let dayLiveOrders = 0;

    let dayInhouseSpend = 0;
    let dayInhouseGmv = 0;
    let dayInhouseOrders = 0;

    let dayAffiliateSpend = 0;
    let dayAffiliateGmv = 0;
    let dayAffiliateOrders = 0;

    let dayProductCampSpend = 0;
    let dayProductCampGmv = 0;
    let dayProductCampOrders = 0;

    for (const advertiser of shop.advertisers) {
      try {
        const token = advertiser.accessToken;

        // A. Lấy báo cáo cấp độ chiến dịch (Campaign Performance)
        const campaigns = await TikTokApiService.getCampaignPerformance(token, advertiser.advertiserId, date);

        for (const camp of campaigns) {
          if (camp.shoppingAdsType === "LIVE") {
            dayLiveSpend += camp.spend;
            dayLiveGmv += camp.gmv;
            dayLiveOrders += camp.orders;
          } else {
            dayProductCampSpend += camp.spend;
            dayProductCampGmv += camp.gmv;
            dayProductCampOrders += camp.orders;
          }
        }

        // B. Lấy các chiến dịch Product có phát sinh chi phí hoặc đơn hàng
        const activeProductCampIds = campaigns
          .filter((c) => (c.spend > 0 || c.gmv > 0 || c.orders > 0) && c.shoppingAdsType !== "LIVE")
          .map((c) => c.campaignId);

        // C. Lấy báo cáo Video Creatives trực tiếp từ API cho các chiến dịch đó
        if (activeProductCampIds.length > 0) {
          const creatives = await TikTokApiService.getCreativePerformance(
            token,
            advertiser.advertiserId,
            date,
            activeProductCampIds
          );

          for (const cr of creatives) {
            const author = (cr.authorUsername || "").toLowerCase().replace(/^@/, "");
            const nameLower = (cr.name || "").toLowerCase();
            const videoUrlLower = (cr.videoUrl || "").toLowerCase();

            let isInhouse = cr.channelType === "INHOUSE";
            if (!isInhouse && inhouseList.length > 0) {
              isInhouse =
                Boolean(author && inhouseList.includes(author)) ||
                inhouseList.some(
                  (ch: string) =>
                    nameLower.includes(ch) ||
                    videoUrlLower.includes(`/@${ch}`) ||
                    videoUrlLower.includes(`/${ch}`)
                );
            }

            if (isInhouse) {
              dayInhouseSpend += cr.spend;
              dayInhouseGmv += cr.gmv;
              dayInhouseOrders += cr.orders;
            } else {
              dayAffiliateSpend += cr.spend;
              dayAffiliateGmv += cr.gmv;
              dayAffiliateOrders += cr.orders;
            }
          }
        }
      } catch (advErr: any) {
        console.error(`  ! Lỗi quét tài khoản ${advertiser.advertiserId} ngày ${date}:`, advErr.message);
      }
    }

    // D. Tính phần Thẻ sản phẩm (Shopping Tab / Showcase / Thẻ sản phẩm không video)
    const dayTotalVideoSpend = dayInhouseSpend + dayAffiliateSpend;
    const dayTotalVideoGmv = dayInhouseGmv + dayAffiliateGmv;
    const dayTotalVideoOrders = dayInhouseOrders + dayAffiliateOrders;

    const dayCardSpend = Math.max(0, dayProductCampSpend - dayTotalVideoSpend);
    const dayCardGmv = Math.max(0, dayProductCampGmv - dayTotalVideoGmv);
    const dayCardOrders = Math.max(0, dayProductCampOrders - dayTotalVideoOrders);

    // E. Tổng ngày
    const totalDaySpend = dayLiveSpend + dayInhouseSpend + dayAffiliateSpend + dayCardSpend;
    const totalDayGmv = dayLiveGmv + dayInhouseGmv + dayAffiliateGmv + dayCardGmv;
    const totalDayOrders = dayLiveOrders + dayInhouseOrders + dayAffiliateOrders + dayCardOrders;

    const liveRoi = dayLiveSpend > 0 ? dayLiveGmv / dayLiveSpend : 0;
    const inhouseRoi = dayInhouseSpend > 0 ? dayInhouseGmv / dayInhouseSpend : 0;
    const affiliateRoi = dayAffiliateSpend > 0 ? dayAffiliateGmv / dayAffiliateSpend : 0;
    const cardRoi = dayCardSpend > 0 ? dayCardGmv / dayCardSpend : 0;
    const totalRoi = totalDaySpend > 0 ? totalDayGmv / totalDaySpend : 0;

    const rowObj = {
      date,
      liveSpend: Number(dayLiveSpend.toFixed(2)),
      liveGmv: Number(dayLiveGmv.toFixed(2)),
      liveOrders: dayLiveOrders,
      liveRoi: Number(liveRoi.toFixed(2)),

      inhouseSpend: Number(dayInhouseSpend.toFixed(2)),
      inhouseGmv: Number(dayInhouseGmv.toFixed(2)),
      inhouseOrders: dayInhouseOrders,
      inhouseRoi: Number(inhouseRoi.toFixed(2)),

      affiliateSpend: Number(dayAffiliateSpend.toFixed(2)),
      affiliateGmv: Number(dayAffiliateGmv.toFixed(2)),
      affiliateOrders: dayAffiliateOrders,
      affiliateRoi: Number(affiliateRoi.toFixed(2)),

      cardSpend: Number(dayCardSpend.toFixed(2)),
      cardGmv: Number(dayCardGmv.toFixed(2)),
      cardOrders: dayCardOrders,
      cardRoi: Number(cardRoi.toFixed(2)),

      totalSpend: Number(totalDaySpend.toFixed(2)),
      totalGmv: Number(totalDayGmv.toFixed(2)),
      totalOrders: totalDayOrders,
      totalRoi: Number(totalRoi.toFixed(2)),
    };

    rows.push(rowObj);

    grandTotalLiveSpend += dayLiveSpend;
    grandTotalLiveGmv += dayLiveGmv;
    grandTotalLiveOrders += dayLiveOrders;

    grandTotalInhouseSpend += dayInhouseSpend;
    grandTotalInhouseGmv += dayInhouseGmv;
    grandTotalInhouseOrders += dayInhouseOrders;

    grandTotalAffiliateSpend += dayAffiliateSpend;
    grandTotalAffiliateGmv += dayAffiliateGmv;
    grandTotalAffiliateOrders += dayAffiliateOrders;

    grandTotalCardSpend += dayCardSpend;
    grandTotalCardGmv += dayCardGmv;
    grandTotalCardOrders += dayCardOrders;

    grandTotalSpend += totalDaySpend;
    grandTotalGmv += totalDayGmv;
    grandTotalOrders += totalDayOrders;

    console.log(
      `  -> Ngày ${date}: Tổng GMV $${totalDayGmv.toFixed(2)} | LIVE $${dayLiveGmv.toFixed(2)} | In-house $${dayInhouseGmv.toFixed(2)} | Aff $${dayAffiliateGmv.toFixed(2)} | Thẻ SP $${dayCardGmv.toFixed(2)}`
    );

    // Nghỉ 300ms giữa mỗi ngày để bảo vệ rate limit API
    await new Promise((r) => setTimeout(r, 300));
  }

  // 4. Tạo nội dung CSV (kèm BOM UTF-8 để mở trực tiếp trong Excel không bị lỗi font)
  const header = [
    "Ngày",
    "Chi phí LIVE ($)",
    "GMV LIVE ($)",
    "Đơn LIVE",
    "ROI LIVE",
    "Chi phí In-house ($)",
    "GMV In-house ($)",
    "Đơn In-house",
    "ROI In-house",
    "Chi phí Affiliate ($)",
    "GMV Affiliate ($)",
    "Đơn Affiliate",
    "ROI Affiliate",
    "Chi phí Thẻ SP ($)",
    "GMV Thẻ SP ($)",
    "Đơn Thẻ SP",
    "ROI Thẻ SP",
    "Tổng Chi phí ($)",
    "Tổng GMV ($)",
    "Tổng Đơn",
    "Tổng ROI",
  ].join(",");

  const csvLines = rows.map((r) =>
    [
      r.date,
      r.liveSpend,
      r.liveGmv,
      r.liveOrders,
      r.liveRoi,
      r.inhouseSpend,
      r.inhouseGmv,
      r.inhouseOrders,
      r.inhouseRoi,
      r.affiliateSpend,
      r.affiliateGmv,
      r.affiliateOrders,
      r.affiliateRoi,
      r.cardSpend,
      r.cardGmv,
      r.cardOrders,
      r.cardRoi,
      r.totalSpend,
      r.totalGmv,
      r.totalOrders,
      r.totalRoi,
    ].join(",")
  );

  const grandLiveRoi = grandTotalLiveSpend > 0 ? grandTotalLiveGmv / grandTotalLiveSpend : 0;
  const grandInhouseRoi = grandTotalInhouseSpend > 0 ? grandTotalInhouseGmv / grandTotalInhouseSpend : 0;
  const grandAffiliateRoi = grandTotalAffiliateSpend > 0 ? grandTotalAffiliateGmv / grandTotalAffiliateSpend : 0;
  const grandCardRoi = grandTotalCardSpend > 0 ? grandTotalCardGmv / grandTotalCardSpend : 0;
  const grandTotalRoi = grandTotalSpend > 0 ? grandTotalGmv / grandTotalSpend : 0;

  const totalLine = [
    "TỔNG CỘNG (01/10 - 21/10)",
    grandTotalLiveSpend.toFixed(2),
    grandTotalLiveGmv.toFixed(2),
    grandTotalLiveOrders,
    grandLiveRoi.toFixed(2),
    grandTotalInhouseSpend.toFixed(2),
    grandTotalInhouseGmv.toFixed(2),
    grandTotalInhouseOrders,
    grandInhouseRoi.toFixed(2),
    grandTotalAffiliateSpend.toFixed(2),
    grandTotalAffiliateGmv.toFixed(2),
    grandTotalAffiliateOrders,
    grandAffiliateRoi.toFixed(2),
    grandTotalCardSpend.toFixed(2),
    grandTotalCardGmv.toFixed(2),
    grandTotalCardOrders,
    grandCardRoi.toFixed(2),
    grandTotalSpend.toFixed(2),
    grandTotalGmv.toFixed(2),
    grandTotalOrders,
    grandTotalRoi.toFixed(2),
  ].join(",");

  const csvContent = "\uFEFF" + [header, ...csvLines, totalLine].join("\r\n");

  // Tự động lưu ra file trên thư mục gốc của project
  try {
    const outputPath = path.resolve(process.cwd(), "malaysia_october_report.csv");
    fs.writeFileSync(outputPath, csvContent, "utf8");
    console.log(`[EXPORT] Đã lưu file tại: ${outputPath}`);
  } catch (writeErr: any) {
    console.warn("[EXPORT] Không thể ghi file ra đĩa:", writeErr.message);
  }

  const summary = {
    live: { spend: grandTotalLiveSpend, gmv: grandTotalLiveGmv, orders: grandTotalLiveOrders, roi: grandLiveRoi },
    inhouse: { spend: grandTotalInhouseSpend, gmv: grandTotalInhouseGmv, orders: grandTotalInhouseOrders, roi: grandInhouseRoi },
    affiliate: { spend: grandTotalAffiliateSpend, gmv: grandTotalAffiliateGmv, orders: grandTotalAffiliateOrders, roi: grandAffiliateRoi },
    card: { spend: grandTotalCardSpend, gmv: grandTotalCardGmv, orders: grandTotalCardOrders, roi: grandCardRoi },
    total: { spend: grandTotalSpend, gmv: grandTotalGmv, orders: grandTotalOrders, roi: grandTotalRoi },
  };

  return { csvContent, rows, summary };
}

// Chạy trực tiếp qua node/npx nếu file được gọi từ CLI
if (require.main === module) {
  runExportMalaysiaOctober()
    .then(({ csvContent, summary }) => {
      const outputPath = path.resolve(process.cwd(), "malaysia_october_report.csv");
      fs.writeFileSync(outputPath, csvContent, "utf8");
      console.log(`\n======================================================`);
      console.log(` ĐÃ XUẤT THÀNH CÔNG RA FILE: ${outputPath}`);
      console.log(`======================================================`);
      console.log(`TỔNG KẾT TỪ 01/10 ĐẾN 21/10:`);
      console.log(`- LIVE:         GMV $${summary.live.gmv.toFixed(2)} | Chi phí $${summary.live.spend.toFixed(2)} | Đơn ${summary.live.orders} | ROI ${summary.live.roi.toFixed(2)}x`);
      console.log(`- IN-HOUSE:     GMV $${summary.inhouse.gmv.toFixed(2)} | Chi phí $${summary.inhouse.spend.toFixed(2)} | Đơn ${summary.inhouse.orders} | ROI ${summary.inhouse.roi.toFixed(2)}x`);
      console.log(`- AFFILIATE:    GMV $${summary.affiliate.gmv.toFixed(2)} | Chi phí $${summary.affiliate.spend.toFixed(2)} | Đơn ${summary.affiliate.orders} | ROI ${summary.affiliate.roi.toFixed(2)}x`);
      console.log(`- THẺ SẢN PHẨM: GMV $${summary.card.gmv.toFixed(2)} | Chi phí $${summary.card.spend.toFixed(2)} | Đơn ${summary.card.orders} | ROI ${summary.card.roi.toFixed(2)}x`);
      console.log(`- TỔNG CỘNG:    GMV $${summary.total.gmv.toFixed(2)} | Chi phí $${summary.total.spend.toFixed(2)} | Đơn ${summary.total.orders} | ROI ${summary.total.roi.toFixed(2)}x`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Lỗi khi xuất dữ liệu:", err);
      process.exit(1);
    });
}
