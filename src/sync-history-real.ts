import { SyncService } from "./service/sync";
import { prisma } from "./lib/db";
import { logger } from "./lib/logger";

async function main() {
  const args = process.argv.slice(2);
  let startDateStr = args[0];
  let endDateStr = args[1];

  // Default to last 14 days if not specified
  if (!startDateStr) {
    const start = new Date();
    start.setDate(start.getDate() - 14);
    startDateStr = start.toISOString().split("T")[0];
  }
  
  if (!endDateStr) {
    const end = new Date();
    endDateStr = end.toISOString().split("T")[0];
  }

  console.log(`=== Starting TikTok Real Historical Data Sync ===`);
  console.log(`Date Range: ${startDateStr} to ${endDateStr}`);

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error("Lỗi: Định dạng ngày không hợp lệ! Vui lòng dùng YYYY-MM-DD. Ví dụ: npx tsx src/sync-history-real.ts 2026-05-25 2026-05-30");
    process.exit(1);
  }

  // Iterate day by day
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    console.log(`\n--------------------------------------------------`);
    console.log(`[SYNCING DATE] ${dateStr}`);
    console.log(`--------------------------------------------------`);
    
    try {
      const result = await SyncService.syncAllAccounts(dateStr);
      console.log(`[SYNC RESULT for ${dateStr}] Success: ${result.success}, Synced: ${result.syncedAccounts} accounts`);
      if (result.errors && result.errors.length > 0) {
        console.warn(`Warnings for ${dateStr}:`, JSON.stringify(result.errors, null, 2));
      }
    } catch (err: any) {
      console.error(`Error syncing data for ${dateStr}:`, err.message);
    }

    current.setDate(current.getDate() + 1);
  }

  console.log("\n=== Real Historical Sync Completed! ===");
}

main()
  .catch((e) => {
    console.error("Fatal error during historical sync:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
