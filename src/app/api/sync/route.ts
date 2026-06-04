import { NextResponse } from "next/server";
import { SyncService } from "../../../service/sync";

export async function POST() {
  try {
    const result = await SyncService.syncAllAccounts();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
