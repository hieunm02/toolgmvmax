import { logger } from "./logger";

export interface TelegramAlertPayload {
  type: string;
  message: string;
  shopName: string;
  rule: string;
  value: number;
}

export async function sendTelegramAlert(payload: TelegramAlertPayload): Promise<boolean> {
  if (process.env.DISABLE_TELEGRAM_ALERTS === "true" && payload.type !== "LOW_SPEND_30M" && payload.type !== "LOW_ROI_AUTO_RELAUNCHED") {
    logger.info("Telegram alerts are disabled via environment configuration. Skipping Telegram alert delivery.", {
      type: payload.type,
      shopName: payload.shopName,
    });
    return true;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const alertText = 
`🚨 *GMV Max OS Alert* 🚨
*Shop:* ${payload.shopName}
*Type:* ${payload.type}
*Rule:* ${payload.rule}
*Metric Value:* ${payload.value}
*Detail:* ${payload.message}
*Time:* ${new Date().toISOString()}`;

  if (!token || !chatId) {
    logger.info("Telegram configuration missing. Alert logged to console:", {
      alertText,
      botTokenConfigured: !!token,
      chatIdConfigured: !!chatId,
    });
    return true;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: alertText,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Failed to send Telegram alert", new Error(errorText), { status: response.status });
      return false;
    }

    logger.info("Telegram alert sent successfully", { type: payload.type, shopName: payload.shopName });
    return true;
  } catch (err) {
    logger.error("Telegram bot API connection error", err, { type: payload.type });
    return false;
  }
}
