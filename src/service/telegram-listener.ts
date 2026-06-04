import { TelegramReportService } from "./telegram-report";
import { logger } from "../lib/logger";

export class TelegramListenerService {
  private static isRunning = false;
  private static offset = 0;
  private static abortController: AbortController | null = null;

  static async startListener() {
    if (this.isRunning) {
      logger.info("Telegram command listener is already running.");
      return;
    }
    this.isRunning = true;
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === "your_telegram_bot_token" || token.includes("TELEGRAM_BOT_TOKEN")) {
      logger.warn("Telegram Bot Token is not configured. Listener not started.");
      this.isRunning = false;
      return;
    }

    logger.info("Starting Telegram command listener...");
    this.abortController = new AbortController();

    // Clear old updates on startup: get the latest update_id
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=-1&limit=1&timeout=0`;
      const res = await fetch(url, { signal: this.abortController.signal });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.result && json.result.length > 0) {
          this.offset = json.result[0].update_id + 1;
          logger.info(`Cleared old Telegram updates. Next offset: ${this.offset}`);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        logger.error("Failed to clear old Telegram updates", err);
      }
    }

    // Polling loop
    const poll = async () => {
      while (this.isRunning) {
        try {
          const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${this.offset}&timeout=30`;
          const res = await fetch(url, { signal: this.abortController?.signal });
          
          if (!res.ok) {
            // Wait 5 seconds before retrying on API error
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
          }
          
          const json = await res.json();
          if (json.ok && json.result) {
            for (const update of json.result) {
              this.offset = update.update_id + 1;
              
              if (update.message && update.message.text) {
                const text = update.message.text.trim().toLowerCase();
                const chatId = update.message.chat.id.toString();

                const commands = ["/report", "/baocao", "baocao", "báo cáo", "report"];
                if (commands.includes(text)) {
                  logger.info(`Received trigger command '${text}' from chat ${chatId}`);
                  
                  // Send processing feedback reply
                  await this.sendReply(token, chatId, "🔄 Đang tổng hợp dữ liệu và xuất báo cáo, vui lòng đợi...");

                  // Trigger report to the requesting chat ID
                  const reportRes = await TelegramReportService.sendDailyReport(chatId);
                  
                  if (!reportRes.success) {
                    await this.sendReply(token, chatId, `❌ Không thể gửi báo cáo: ${reportRes.message}`);
                  }
                }
              }
            }
          }
        } catch (error: any) {
          if (error.name === "AbortError" || !this.isRunning) {
            break;
          }
          logger.error("Error in Telegram listener poll loop:", error);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        // Add a tiny delay between polling cycles
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    };

    poll();
  }

  static stopListener() {
    logger.info("Stopping Telegram command listener...");
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private static async sendReply(token: string, chatId: string, text: string) {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      });
    } catch (err) {
      logger.error("Failed to send reply to Telegram chat", err);
    }
  }
}
