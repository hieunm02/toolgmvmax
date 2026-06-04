import { SyncService } from "./service/sync";
import { TelegramListenerService } from "./service/telegram-listener";
import { logger } from "./lib/logger";

// Standard 5-minute Cron Job simulation
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function runCronSync() {
  logger.info("Executing scheduled 5-minute synchronization task...");
  try {
    const result = await SyncService.syncAllAccounts();
    logger.info("Synchronization completed.", result);
  } catch (error) {
    logger.error("Synchronization scheduler encountered an unhandled exception", error);
  }
}

// Main scheduler thread execution
function startScheduler() {
  logger.info("Starting background cron sync scheduler daemon. Tick interval: 5 Minutes.");
  
  // Start Telegram Command Listener
  TelegramListenerService.startListener();

  // Run immediately on boot
  runCronSync();

  // Run on interval
  const timer = setInterval(() => {
    runCronSync();
  }, SYNC_INTERVAL_MS);

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Stopping background scheduler daemon.");
    TelegramListenerService.stopListener();
    clearInterval(timer);
    process.exit(0);
  });
  
  process.on("SIGINT", () => {
    logger.info("SIGINT received. Stopping background scheduler daemon.");
    TelegramListenerService.stopListener();
    clearInterval(timer);
    process.exit(0);
  });
}

// Check if running as a standalone node process
if (require.main === module) {
  startScheduler();
}

export { startScheduler, runCronSync };
