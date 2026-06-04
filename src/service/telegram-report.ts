import { prisma } from "../lib/db";
import { logger } from "../lib/logger";

function chunkMessage(text: string, limit = 4000): string[] {
  if (text.length <= limit) return [text];
  
  const chunks: string[] = [];
  let currentChunk = "";
  
  const lines = text.split("\n");
  for (const line of lines) {
    if ((currentChunk + line + "\n").length > limit) {
      chunks.push(currentChunk.trim());
      currentChunk = line + "\n";
    } else {
      currentChunk += line + "\n";
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

export class TelegramReportService {
  static async sendDailyReport(targetChatId?: string): Promise<{ success: boolean; message: string }> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId || token === "your_telegram_bot_token" || chatId === "your_telegram_chat_id") {
      const msg = "Cấu hình Telegram Bot Token hoặc Chat ID chưa được thiết lập chính xác trong file .env";
      logger.warn(msg);
      return { success: false, message: msg };
    }

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const today = new Date(todayStr);

      // 1. Query all active shops along with their active advertisers and today's campaign performance
      const shops = await prisma.shop.findMany({
        where: { status: "ACTIVE" },
        include: {
          advertisers: {
            where: { status: "ACTIVE" },
            include: {
              campaigns: {
                include: {
                  reports: {
                    where: { date: today }
                  }
                }
              }
            }
          }
        }
      });

      if (shops.length === 0) {
        return { success: false, message: "Không tìm thấy cửa hàng hoạt động nào để xuất báo cáo." };
      }

      // Format Vietnamese time string
      const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dateStr = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

      let reportText = `📊 *BÁO CÁO HIỆU SUẤT GMV MAX* 📊\n`;
      reportText += `📅 *Ngày:* ${dateStr} | 🕒 *Cập nhật:* ${timeStr}\n`;
      reportText += `───────────────────\n\n`;

      let totalSpendAll = 0;
      let totalGmvAll = 0;
      let activeShopsCount = 0;

      for (const shop of shops) {
        let shopSpend = 0;
        let shopGmv = 0;
        const productCampaignLines: string[] = [];
        const liveCampaignLines: string[] = [];

        for (const advertiser of shop.advertisers) {
          for (const campaign of advertiser.campaigns) {
            if (campaign.status !== "CAMPAIGN_STATUS_ENABLE") {
              continue;
            }
            const report = campaign.reports[0]; // Filtered where date = today
            if (report) {
              shopSpend += report.spend;
              shopGmv += report.gmv;

              const cRoi = report.spend > 0 ? (report.gmv / report.spend).toFixed(2) : "0.00";
              const cName = campaign.name;
              
              // Only include campaigns with active spend or results today to avoid spamming the message
              if (report.spend > 0 || report.gmv > 0) {
                const statusEmoji = campaign.status === "CAMPAIGN_STATUS_ENABLE" ? "🟢" : "🔴";
                const shortName = cName.length > 35 ? cName.slice(0, 32) + "..." : cName;
                const line = `  • ${statusEmoji} *${shortName}*: Chi phí: *${report.spend.toLocaleString("vi-VN")}đ* | Doanh thu: *${report.gmv.toLocaleString("vi-VN")}đ* | ROI: *${cRoi}x*`;
                
                if (campaign.shoppingAdsType === "LIVE") {
                  liveCampaignLines.push(line);
                } else {
                  productCampaignLines.push(line);
                }
              }
            }
          }
        }

        // Only count and include shops that have campaigns synced or active
        totalSpendAll += shopSpend;
        totalGmvAll += shopGmv;
        activeShopsCount++;

        const shopRoi = shopSpend > 0 ? (shopGmv / shopSpend).toFixed(2) : "0.00";

        reportText += `🏪 *Shop: ${shop.name}*\n`;
        reportText += `💵 Chi phí: *${shopSpend.toLocaleString("vi-VN")}đ*\n`;
        reportText += `📈 Doanh thu: *${shopGmv.toLocaleString("vi-VN")}đ*\n`;
        reportText += `🎯 ROI: *${shopRoi}x*\n`;
        
        if (productCampaignLines.length > 0) {
          reportText += `📦 *GMV Max Sản Phẩm:*\n${productCampaignLines.join("\n")}\n`;
        }
        if (liveCampaignLines.length > 0) {
          reportText += `🎥 *GMV Max Livestream:*\n${liveCampaignLines.join("\n")}\n`;
        }
        if (productCampaignLines.length === 0 && liveCampaignLines.length === 0) {
          reportText += `📝 Không có chiến dịch nào phát sinh chỉ số hôm nay.\n`;
        }
        reportText += `───────────────────\n\n`;
      }

      const totalRoiAll = totalSpendAll > 0 ? (totalGmvAll / totalSpendAll).toFixed(2) : "0.00";
      
      reportText += `🏁 *TỔNG CỘNG TOÀN BỘ SHOP* 🏁\n`;
      reportText += `💵 Tổng chi: *${totalSpendAll.toLocaleString("vi-VN")}đ*\n`;
      reportText += `🛍️ Tổng Doanh thu: *${totalGmvAll.toLocaleString("vi-VN")}đ*\n`;
      reportText += `🏆 ROI trung bình: *${totalRoiAll}x*`;

      // 2. Post message to Telegram Bot API (Handling chunked messages if too long)
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const chunks = chunkMessage(reportText, 4000);

      for (const chunk of chunks) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
            parse_mode: "Markdown",
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
      }

      logger.info("Telegram performance report sent successfully");
      return { success: true, message: "Gửi báo cáo qua Telegram thành công!" };
    } catch (error: any) {
      const errMsg = `Gửi báo cáo thất bại: ${error.message}`;
      logger.error("Failed to send Telegram report", error);
      return { success: false, message: errMsg };
    }
  }
}
