import { TelegramReportService } from "../src/service/telegram-report";

// Mock environment variables to pass validation
process.env.TELEGRAM_BOT_TOKEN = "mock_bot_token";
process.env.TELEGRAM_CHAT_ID = "mock_chat_id";

// Mock the global fetch function
global.fetch = (async (url: string, options: any) => {
  const body = JSON.parse(options.body);
  console.log("\n=== MOCKED TELEGRAM REPORT PREVIEW ===");
  console.log(body.text);
  console.log("=======================================");
  return {
    ok: true,
    json: async () => ({ ok: true }),
    text: async () => "OK"
  } as any;
}) as any;

async function run() {
  await TelegramReportService.sendDailyReport();
}

run();
