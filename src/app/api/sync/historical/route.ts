import { NextResponse } from "next/server";
import { SyncService } from "../../../../service/sync";

// POST /api/sync/historical
// Body: { startDate: "2026-07-01", endDate: "2026-08-11" }
// Syncs all advertising accounts for each day in the given date range
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, startDate, endDate } = body;

    // Single day sync
    if (date) {
      console.log(`[Historical Sync] Syncing single date: ${date}`);
      const result = await SyncService.syncAllAccounts(date);
      return NextResponse.json({
        success: result.success,
        data: {
          totalDays: 1,
          successDays: result.success ? 1 : 0,
          failedDays: result.success ? 0 : 1,
          results: [{ date, ...result }],
        },
      });
    }

    // Date range sync
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Missing date or startDate/endDate. Format: YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { success: false, error: "startDate must be before or equal to endDate" },
        { status: 400 }
      );
    }

    // Build list of dates from start to end
    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
      cursor.setDate(cursor.getDate() + 1);
    }

    const results: { date: string; success: boolean; syncedAccounts: number; errors: any[] }[] = [];

    for (const date of dates) {
      console.log(`[Historical Sync] Syncing date: ${date}`);
      const result = await SyncService.syncAllAccounts(date);
      results.push({ date, ...result });
    }

    const totalDays = dates.length;
    const successDays = results.filter((r) => r.success).length;
    const failedDays = results.filter((r) => !r.success);

    return NextResponse.json({
      success: failedDays.length === 0,
      data: {
        totalDays,
        successDays,
        failedDays: failedDays.length,
        results,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
