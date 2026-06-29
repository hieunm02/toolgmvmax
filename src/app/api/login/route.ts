import { NextResponse } from "next/server";
import { createSessionToken } from "../../../lib/auth";
import { prisma } from "../../../lib/db";

const bcrypt = require("bcryptjs");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

// ── Brute-force protection ──────────────────────────────────────
// Track failed login attempts per IP address
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil: number }>();

const MAX_ATTEMPTS = 5;        // Max failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000;  // 15 minutes lockout
const ATTEMPT_WINDOW = 15 * 60 * 1000;    // 15-minute sliding window

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function cleanupOldEntries() {
  const now = Date.now();
  const toDelete: string[] = [];
  loginAttempts.forEach((data, ip) => {
    if (now - data.lastAttempt > ATTEMPT_WINDOW && now > data.lockedUntil) {
      toDelete.push(ip);
    }
  });
  toDelete.forEach((ip) => loginAttempts.delete(ip));
}
// ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const now = Date.now();

    // Cleanup stale entries periodically
    if (loginAttempts.size > 100) cleanupOldEntries();

    // Check if IP is currently locked out
    const ipData = loginAttempts.get(clientIp);
    if (ipData && now < ipData.lockedUntil) {
      const remainingSeconds = Math.ceil((ipData.lockedUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${remainingMinutes} phút.`,
        },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    // ── Authentication: Check database first, then fallback to env vars ──
    let isAuthenticated = false;

    // Priority 1: Check if admin user exists in database (password was changed via UI)
    try {
      const dbUser = await prisma.user.findFirst({
        where: { email: "admin@system" },
      });

      if (dbUser) {
        // Verify against database hash
        isAuthenticated = username === "admin" && (await bcrypt.compare(password, dbUser.passwordHash));
      }
    } catch (dbError) {
      // Database might not be available — fall through to env check
      console.error("DB auth check failed, falling back to env:", dbError);
    }

    // Priority 2: Fallback to environment variables (initial setup)
    if (!isAuthenticated && !isAuthenticated) {
      isAuthenticated = username === ADMIN_USERNAME && password === ADMIN_PASSWORD && ADMIN_PASSWORD !== "";
    }

    if (isAuthenticated) {
      // Successful login — clear failed attempts for this IP
      loginAttempts.delete(clientIp);

      const token = await createSessionToken(username);

      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: "auth_token",
        value: token,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    }

    // Failed login — record attempt
    const existing = loginAttempts.get(clientIp);
    if (existing && now - existing.lastAttempt < ATTEMPT_WINDOW) {
      existing.count += 1;
      existing.lastAttempt = now;
      if (existing.count >= MAX_ATTEMPTS) {
        existing.lockedUntil = now + LOCKOUT_DURATION;
        return NextResponse.json(
          {
            success: false,
            error: `Quá nhiều lần đăng nhập sai. Tài khoản bị khóa 15 phút.`,
          },
          { status: 429 }
        );
      }
    } else {
      loginAttempts.set(clientIp, { count: 1, lastAttempt: now, lockedUntil: 0 });
    }

    const attemptsLeft = MAX_ATTEMPTS - (loginAttempts.get(clientIp)?.count || 0);
    return NextResponse.json(
      {
        success: false,
        error: `Tên đăng nhập hoặc mật khẩu không đúng. Còn ${attemptsLeft} lần thử.`,
      },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
