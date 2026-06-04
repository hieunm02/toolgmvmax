import { NextResponse } from "next/server";
import { ProductRepository } from "../../../repository/product";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId") || undefined;
    const products = await ProductRepository.getProductsWithStats({ shopId });

    const list = products.map((p) => {
      let spend = 0;
      let gmv = 0;
      let orders = 0;

      p.reports.forEach((r) => {
        spend += r.spend;
        gmv += r.gmv;
        orders += r.orders;
      });

      const roi = spend > 0 ? gmv / spend : 0;

      return {
        id: p.id,
        productId: p.productId,
        name: p.name,
        imageUrl: p.imageUrl,
        sku: p.sku,
        stock: p.stock,
        shopName: p.shop.name,
        spend,
        gmv,
        roi,
        orders,
      };
    });

    // Sort by GMV descending for rankings
    const topProducts = [...list].sort((a, b) => b.gmv - a.gmv);
    const worstProducts = [...list].sort((a, b) => a.roi - b.roi); // Worst by ROI

    return NextResponse.json({
      success: true,
      data: {
        products: list,
        topProducts,
        worstProducts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
