import { NextResponse } from "next/server";
import { AlertRepository } from "../../../repository/alert";

export async function GET() {
  try {
    const alerts = await AlertRepository.getAllAlerts(50);
    return NextResponse.json({ success: true, data: alerts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { alertId } = await request.json();
    if (!alertId) {
      return NextResponse.json({ success: false, error: "Missing alertId" }, { status: 400 });
    }
    const resolved = await AlertRepository.resolveAlert(alertId);
    return NextResponse.json({ success: true, data: resolved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
