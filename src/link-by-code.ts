import { TikTokApiService } from "./lib/tiktok";
import { prisma } from "./lib/db";

async function main() {
  const authCode = process.argv[2];
  if (!authCode) {
    console.error("Vui lòng cung cấp Auth Code! Ví dụ: npx tsx src/link-by-code.ts <AUTH_CODE>");
    process.exit(1);
  }

  console.log("Đang trao đổi Auth Code lấy Access Token từ TikTok...");
  try {
    const tokens = await TikTokApiService.getAccessToken(authCode);
    console.log("Đổi token thành công!");
    console.log(`- Access Token: ${tokens.accessToken}`);
    console.log(`- Refresh Token: ${tokens.refreshToken}`);
    console.log(`- Hạn dùng: ${new Date(Date.now() + tokens.expiresIn * 1000).toLocaleString()}`);

    const shop = await prisma.shop.findFirst();
    if (!shop) {
      console.error("Không tìm thấy cửa hàng nào trong database. Vui lòng thêm cửa hàng trên giao diện web trước.");
      process.exit(1);
    }

    console.log(`Đang quét danh sách tài khoản quảng cáo liên kết...`);
    const advertiserList = await TikTokApiService.getAdvertiserAccounts(tokens.accessToken);
    console.log(`Tìm thấy ${advertiserList.length} tài khoản quảng cáo.`);

    for (const adv of advertiserList) {
      const dbAdv = await prisma.advertiser.upsert({
        where: { advertiserId: adv.advertiserId },
        update: {
          name: adv.name,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          shopId: shop.id
        },
        create: {
          advertiserId: adv.advertiserId,
          name: adv.name,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          shopId: shop.id,
          status: "ACTIVE"
        }
      });
      console.log(`- Đã thêm/Cập nhật: ${dbAdv.name} (ID: ${dbAdv.advertiserId}) -> ACTIVE`);
    }

    console.log("\nHOÀN THÀNH! Đã lưu toàn bộ thông tin tài khoản và kết nối thành công!");
  } catch (error: any) {
    console.error("Lỗi liên kết tài khoản:", error.message);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
