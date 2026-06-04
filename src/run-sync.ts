import { runCronSync } from "./cron-worker";

console.log("Triggering single run of SyncEngine to populate initial database metrics...");
runCronSync()
  .then(() => {
    console.log("Initial Sync completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Initial Sync failed:", err);
    process.exit(1);
  });
