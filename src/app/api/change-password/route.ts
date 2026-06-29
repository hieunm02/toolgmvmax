import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

const bcrypt = require("bcryptjs");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Mật khẩu mới phải có ít nhất 6 ký tự!" },
        { status: 400 }
      );
    }

    // Check if admin user exists in database
    const dbUser = await prisma.user.findFirst({
      where: { email: "admin@system" },
    });

    // Verify current password
    let isCurrentValid = false;

    if (dbUser) {
      // User exists in DB — verify against stored hash
      isCurrentValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    } else {
      // No DB user yet — verify against env vars
      isCurrentValid = currentPassword === ADMIN_PASSWORD && ADMIN_PASSWORD !== "";
    }

    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, error: "Mật khẩu hiện tại không đúng!" },
        { status: 401 }
      );
    }

    // Hash the new password
    const newHash = await bcrypt.hash(newPassword, 12);

    if (dbUser) {
      // Update existing user
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { passwordHash: newHash },
      });
    } else {
      // Create admin user in DB for the first time
      await prisma.user.create({
        data: {
          email: "admin@system",
          name: "Admin",
          passwordHash: newHash,
          role: "ADMIN",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
