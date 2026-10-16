import { SyncService } from "./service/sync";
import { TelegramListenerService } from "./service/telegram-listener";
import { logger } from "./lib/logger";

// Run cron sync every 5 minutes to quickly detect low ROI and auto-relaunch
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Lock to prevent overlapping sync runs from stacking up and overloading CPU
let isSyncRunning = false;

async function runCronSync() {
  if (isSyncRunning) {
    logger.warn("Previous sync is still running — skipping this tick to avoid CPU overload.");
    return;
  }

  isSyncRunning = true;
  logger.info("Executing scheduled synchronization task...");
  try {
    const result = await SyncService.syncAllAccounts();
    logger.info("Synchronization completed.", result);
  } catch (error) {
    logger.error("Synchronization scheduler encountered an unhandled exception", error);
  } finally {
    isSyncRunning = false;
  }
}

// Main scheduler thread execution
function startScheduler() {
  logger.info(`Starting background cron sync scheduler daemon. Tick interval: ${SYNC_INTERVAL_MS / 60000} Minutes.`);
  
  // Start Telegram Command Listener
  TelegramListenerService.startListener();

  // Run first sync after a 15s delay to let web server boot up cleanly
  setTimeout(() => {
    runCronSync();
  }, 15000);

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
