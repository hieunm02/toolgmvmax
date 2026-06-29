import { NextResponse } from "next/server";
import { createSessionToken } from "../../../lib/auth";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2162002";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = await createSessionToken(username);
      
      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: "auth_token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
      
      return response;
    }
    
    return NextResponse.json(
      { success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
