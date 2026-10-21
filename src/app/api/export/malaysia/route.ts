import { NextResponse } from "next/server";
import { runExportMalaysiaOctober } from "../../../../export-malaysia-october";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Cho phép chạy tối đa 5 phút để lấy đủ 21 ngày

export async function GET() {
  try {
    const { csvContent } = await runExportMalaysiaOctober();

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="malaysia_october_report.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
