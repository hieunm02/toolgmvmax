import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getVietnamDateString } from "../../../lib/date-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId") || undefined;

    if (!shopId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Heuristics-based recommendations (fallback/quick rules)
    const campaigns = await prisma.campaign.findMany({
      where: {
        advertiser: {
          shopId: shopId,
        },
      },
      include: {
        reports: {
          where: {
            date: new Date(getVietnamDateString()),
          },
        },
      },
    });

    const recommendations: Array<{
      id: string;
      campaignId: string;
      campaignName: string;
      action: "SCALE_BUDGET" | "REDUCE_BUDGET" | "REPLACE_CREATIVES" | "ADJUST_ROI_TARGET" | "KEEP_STABLE";
      priority: "HIGH" | "MEDIUM" | "LOW";
      reason: string;
      details: string;
    }> = [];

    campaigns.forEach((c) => {
      let spend = c.reports.reduce((sum, r) => sum + r.spend, 0);
      let gmv = c.reports.reduce((sum, r) => sum + r.gmv, 0);
      let orders = c.reports.reduce((sum, r) => sum + r.orders, 0);
      let impressions = c.reports.reduce((sum, r) => sum + r.impressions, 0);
      let clicks = c.reports.reduce((sum, r) => sum + r.clicks, 0);

      const roi = spend > 0 ? gmv / spend : 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const convRate = clicks > 0 ? orders / clicks : 0;
      const isUsd = c.budget < 5000;

      if (spend > 0) {
        if (roi >= 2.5 && spend >= c.budget * 0.8) {
          recommendations.push({
            id: `rec-${c.campaignId}-scale`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "SCALE_BUDGET",
            priority: "HIGH",
            reason: langText(lang("vi", "en"), `ROI xuất sắc (${roi.toFixed(2)}x) và sắp hết ngân sách.`, `Excellent ROI (${roi.toFixed(2)}x) and near budget limit.`),
            details: isUsd 
              ? `We recommend increasing the daily budget by 30% to $${(c.budget * 1.3).toFixed(2)} to capture more GMV conversions.`
              : `Khuyên nghị tăng ngân sách hàng ngày thêm 30% lên ${(Math.round((c.budget * 1.3) / 1000) * 1000).toLocaleString('vi-VN')}đ để tối ưu doanh thu.`,
          });
        } else if (roi < 1.2 && spend > (isUsd ? 5 : 100000)) {
          recommendations.push({
            id: `rec-${c.campaignId}-reduce`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "REDUCE_BUDGET",
            priority: "HIGH",
            reason: langText(lang("vi", "en"), `ROI kém (${roi.toFixed(2)}x) dưới mức mục tiêu.`, `Suboptimal ROI (${roi.toFixed(2)}x) below target.`),
            details: isUsd
              ? `We recommend reducing the daily budget by 30% to $${(c.budget * 0.7).toFixed(2)} or pausing it to prevent unprofitable spend.`
              : `Khuyến nghị giảm ngân sách ngày xuống 30% hoặc tạm dừng để hạn chế lãng phí ngân sách quảng cáo không ra đơn.`,
          });
        } else if (ctr < 0.015 && spend > (isUsd ? 3 : 50000)) {
          recommendations.push({
            id: `rec-${c.campaignId}-creatives`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "REPLACE_CREATIVES",
            priority: "MEDIUM",
            reason: langText(lang("vi", "en"), `Tỷ lệ click CTR thấp (${(ctr * 100).toFixed(2)}%) - Người xem đã bão hòa với video.`, `Low click-through rate (${(ctr * 100).toFixed(2)}%) indicates ad creative fatigue.`),
            details: langText(lang("vi", "en"), `Đăng tải 2-3 video sáng tạo mới, tối ưu hóa 3 giây đầu tiên của video để thu hút click chuột.`, `Upload 2-3 fresh video creatives targeting Hook Hooks within the first 3 seconds of playtime.`),
          });
        } else if (convRate < 0.01 && clicks > 50) {
          recommendations.push({
            id: `rec-${c.campaignId}-roi-target`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "ADJUST_ROI_TARGET",
            priority: "MEDIUM",
            reason: langText(lang("vi", "en"), `Lượng click lớn (${clicks}) nhưng tỷ lệ mua hàng thấp (${(convRate * 100).toFixed(2)}%).`, `High clicks (${clicks}) but low conversion rate (${(convRate * 100).toFixed(2)}%).`),
            details: langText(lang("vi", "en"), `Điều chỉnh giảm ROI mục tiêu trong cài đặt chiến dịch hoặc tối ưu hóa thông tin mô tả sản phẩm ở gian hàng.`, `Slightly decrease target ROI in campaign settings to expand delivery, or optimize product detail pages.`),
          });
        } else {
          recommendations.push({
            id: `rec-${c.campaignId}-stable`,
            campaignId: c.campaignId,
            campaignName: c.name,
            action: "KEEP_STABLE",
            priority: "LOW",
            reason: langText(lang("vi", "en"), `Chiến dịch hoạt động ổn định.`, `Campaign performs within targeted boundaries.`),
            details: isUsd
              ? `Metrics stable (ROI: ${roi.toFixed(2)}x, Spend: $${spend.toFixed(2)}). Monitor performance.`
              : `Chỉ số ổn định (ROI: ${roi.toFixed(2)}x, Chi tiêu: ${spend.toLocaleString('vi-VN')}đ). Tiếp tục theo dõi.`,
          });
        }
      }
    });

    return NextResponse.json({ success: true, data: recommendations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopId, geminiApiKey } = body;

    if (!shopId) {
      return NextResponse.json({ success: false, error: "Missing shopId" }, { status: 400 });
    }

    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Vui lòng nhập Gemini API Key trong phần cấu hình hoặc thiết lập biến môi trường GEMINI_API_KEY trong file .env trên máy chủ." 
      }, { status: 400 });
    }

    const todayStr = getVietnamDateString();
    
    // Fetch all relevant data for the shop
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        advertisers: {
          include: {
            campaigns: {
              include: {
                reports: {
                  where: {
                    date: new Date(todayStr)
                  }
                }
              }
            },
            creatives: {
              include: {
                reports: {
                  where: {
                    date: new Date(todayStr)
                  }
                }
              }
            }
          }
        },
        products: {
          include: {
            reports: {
              where: {
                date: new Date(todayStr)
              }
            }
          }
        }
      }
    });

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    const campaignsList: any[] = [];
    const creativesList: any[] = [];
    
    shop.advertisers.forEach(adv => {
      adv.campaigns.forEach(c => {
        const spend = c.reports.reduce((sum, r) => sum + r.spend, 0);
        const gmv = c.reports.reduce((sum, r) => sum + r.gmv, 0);
        const orders = c.reports.reduce((sum, r) => sum + r.orders, 0);
        const impressions = c.reports.reduce((sum, r) => sum + r.impressions, 0);
        const clicks = c.reports.reduce((sum, r) => sum + r.clicks, 0);
        const roi = spend > 0 ? gmv / spend : 0;
        
        campaignsList.push({
          campaignId: c.campaignId,
          name: c.name,
          status: c.status,
          objectiveType: c.objectiveType,
          budget: c.budget,
          budgetMode: c.budgetMode,
          spend,
          gmv,
          orders,
          impressions,
          clicks,
          roi
        });
      });

      adv.creatives.forEach(cr => {
        const spend = cr.reports.reduce((sum, r) => sum + r.spend, 0);
        const gmv = cr.reports.reduce((sum, r) => sum + r.gmv, 0);
        const orders = cr.reports.reduce((sum, r) => sum + r.orders, 0);
        const roi = spend > 0 ? gmv / spend : 0;

        if (spend > 0) {
          creativesList.push({
            videoId: cr.videoId,
            name: cr.name,
            spend,
            gmv,
            orders,
            roi
          });
        }
      });
    });

    const productsList = shop.products.map(p => {
      const spend = p.reports.reduce((sum, r) => sum + r.spend, 0);
      const gmv = p.reports.reduce((sum, r) => sum + r.gmv, 0);
      const orders = p.reports.reduce((sum, r) => sum + r.orders, 0);
      const roi = spend > 0 ? gmv / spend : 0;

      return {
        productId: p.productId,
        name: p.name,
        stock: p.stock,
        spend,
        gmv,
        orders,
        roi
      };
    }).filter(p => p.spend > 0 || p.orders > 0);

    const prompt = `Bạn là một chuyên gia cao cấp về tối ưu hóa quảng cáo TikTok Shop Ads và GMV Max.
Dưới đây là dữ liệu báo cáo chi tiết ngày hôm nay (${todayStr}) của cửa hàng "${shop.name}" (ID Shop: ${shop.tiktokShopId}).

Cấu hình tự động của cửa hàng hiện tại:
- Ngưỡng ROI tự động lên lại chiến dịch: < ${shop.autoRelaunchRoiThreshold}x
- Chi tiêu tối thiểu để xét duyệt: >= ${shop.autoRelaunchMinSpend.toLocaleString('vi-VN')}đ (hoặc quy đổi tương ứng với chiến dịch ngoại tệ)
- Ngưỡng số đơn hàng an toàn (không tự động đóng): >= ${shop.autoRelaunchMaxOrders} đơn

DỮ LIỆU CHIẾN DỊCH QUẢNG CÁO:
${JSON.stringify(campaignsList, null, 2)}

DỮ LIỆU SẢN PHẨM:
${JSON.stringify(productsList, null, 2)}

DỮ LIỆU VIDEO MẪU QUẢNG CÁO (CREATIVES):
${JSON.stringify(creativesList, null, 2)}

Nhiệm vụ của bạn:
1. Đánh giá tổng quan sức khỏe tài khoản ngày hôm nay (Tổng chi phí, Tổng GMV, ROI trung bình toàn shop, số đơn hàng và phân tích xu hướng hiệu suất).
2. Phát hiện các vấn đề bất thường:
   - Các chiến dịch đang lãng phí ngân sách (chi tiêu nhiều nhưng ROI cực thấp, hoặc không ra đơn).
   - Các chiến dịch đang cạn kiệt ngân sách (chi tiêu gần hết ngân sách ngày) nhưng có hiệu suất rất tốt cần được đề xuất tăng ngân sách.
   - Các video sáng tạo bị giảm tương tác/ROI kém hoặc video nào đang gánh doanh thu cho shop.
   - Các sản phẩm có nguy cơ hết hàng hoặc bán chậm.
3. Đưa ra giải pháp và hành động cụ thể cho từng vấn đề (ví dụ: khuyên dừng chiến dịch nào, tăng ngân sách chiến dịch nào bao nhiêu %, sửa nội dung video nào...).

Hãy viết báo cáo bằng tiếng Việt, định dạng Markdown chuyên nghiệp, rõ ràng, sử dụng các tiêu đề lớn, gạch đầu dòng, các bảng so sánh và biểu tượng cảm xúc (emoji) trực quan để làm nổi bật. Chú ý nhận diện chiến dịch dùng USD hay VND để định dạng ký hiệu tiền tệ thích hợp ($ hoặc đ) dựa vào mức ngân sách của chiến dịch.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const json = await response.json();
    
    if (json.error) {
      return NextResponse.json({ success: false, error: json.error.message || "Failed to call Gemini API" }, { status: 500 });
    }

    const auditReport = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!auditReport) {
      return NextResponse.json({ success: false, error: "Empty response from Gemini API" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { auditReport } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Simple translation helpers
function langText(lang: "vi" | "en", vi: string, en: string): string {
  return lang === "vi" ? vi : en;
}

function lang(defaultVi: string, defaultEn: string): "vi" | "en" {
  // Safe helper to default to vi
  return "vi";
}
