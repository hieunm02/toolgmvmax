import { NextResponse } from "next/server";
import { TelegramReportService } from "../../../../service/telegram-report";
import { logger } from "../../../../lib/logger";

export async function POST() {
  try {
    logger.info("Manual Telegram Report API triggered");
    
    const result = await TelegramReportService.sendDailyReport();
    
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }
  } catch (error: any) {
    logger.error("Telegram Report API route failed with error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
