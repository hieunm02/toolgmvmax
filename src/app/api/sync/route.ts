import { NextResponse } from "next/server";
import { SyncService } from "../../../service/sync";
import { getVietnamDateString } from "../../../lib/date-utils";

export async function POST() {
  try {
    const today = getVietnamDateString();

    // Calculate yesterday in Asia/Ho_Chi_Minh
    const now = new Date();
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yPad = (n: number) => n.toString().padStart(2, "0");
    const yesterday = `${yesterdayDate.getFullYear()}-${yPad(yesterdayDate.getMonth() + 1)}-${yPad(yesterdayDate.getDate())}`;

    // Sync yesterday first so yesterday's historical report & creatives are always up to date
    try {
      await SyncService.syncAllAccounts(yesterday);
    } catch (yErr) {
      console.warn("Error syncing yesterday during manual sync:", yErr);
    }

    // Sync today (real-time)
    const result = await SyncService.syncAllAccounts(today);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
