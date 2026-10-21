import { NextResponse } from "next/server";
import { SyncService } from "../../../service/sync";
import { getVietnamDateString } from "../../../lib/date-utils";

export async function POST(req: Request) {
  try {
    let customDate: string | undefined;
    try {
      const body = await req.json();
      if (body?.date) {
        customDate = String(body.date).trim();
      }
    } catch (e) {
      // Body not provided or not JSON
    }

    const targetDate = customDate || getVietnamDateString();

    // Calculate yesterday in Asia/Ho_Chi_Minh
    const now = new Date();
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yPad = (n: number) => n.toString().padStart(2, "0");
    const yesterday = `${yesterdayDate.getFullYear()}-${yPad(yesterdayDate.getMonth() + 1)}-${yPad(yesterdayDate.getDate())}`;

    // Sync target date synchronously so UI responds immediately
    const result = await SyncService.syncAllAccounts(targetDate);

    // If target date is today, also refresh yesterday in the background asynchronously
    if (!customDate || customDate === getVietnamDateString()) {
      SyncService.syncAllAccounts(yesterday).catch((yErr) => {
        console.warn("Background yesterday sync error:", yErr?.message || yErr);
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
