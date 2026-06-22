import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export const dynamic = "force-dynamic";

// Helper to parse product name and SKU from campaign name
function parseProductFromCampaignName(name: string): { productName: string; sku: string } {
  // 1. Check for underscore-separated brand/product name (typical format: objective_type_product_timestamp)
  const parts = name.split('_');
  if (parts.length >= 3) {
    const candidate = parts[2].trim();
    // Ensure it's not a pure number/date stamp
    if (candidate.length > 1 && !/^\d+$/.test(candidate)) {
      return {
        productName: candidate,
        sku: candidate.toUpperCase().replace(/[^A-Z0-9]/g, '-')
      };
    }
  }
  
  // 2. Check for dash-separated formatting
  const dashParts = name.split('-');
  if (dashParts.length >= 2) {
    const candidate = dashParts[1].trim();
    if (candidate.length > 1 && !/^\d+$/.test(candidate)) {
      return {
        productName: candidate,
        sku: candidate.toUpperCase().replace(/[^A-Z0-9]/g, '-')
      };
    }
  }

  // 3. Fallback: Clean typical campaign prefix buzzwords
  let clean = name
    .replace(/LIVE/gi, '')
    .replace(/GMV/gi, '')
    .replace(/Max/gi, '')
    .replace(/Gross/gi, '')
    .replace(/revenue/gi, '')
    .replace(/Campaign/gi, '')
    .replace(/Auto/gi, '')
    .replace(/Test/gi, '')
    .replace(/ALL/gi, '')
    .replace(/SP/gi, '')
    .trim();

  // Remove trailing timestamps or single letters
  clean = clean.replace(/_\d+$/g, '').replace(/\b\d+\b/g, '').trim();

  // If nothing left, use the original name
  if (clean.length < 2) {
    clean = name;
  }

  return {
    productName: clean,
    sku: clean.toUpperCase().replace(/[^A-Z0-9]/g, '-')
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId") || undefined;
    const startDateStr = searchParams.get("startDate") || undefined;
    const endDateStr = searchParams.get("endDate") || undefined;

    // Filter reports by date if provided
    let reportFilter: any = {};
    if (startDateStr && endDateStr) {
      reportFilter = {
        date: {
          gte: new Date(startDateStr),
          lte: new Date(endDateStr)
        }
      };
    }

    // 1. Fetch campaigns under the shop
    const campaigns = await prisma.campaign.findMany({
      where: shopId ? { advertiser: { shopId } } : {},
      include: {
        reports: {
          where: reportFilter
        },
        advertiser: {
          include: {
            shop: true
          }
        }
      }
    });

    // 2. Fetch database products to cross-reference stock and catalog images
    const dbProducts = await prisma.product.findMany({
      where: shopId ? { shopId } : {},
      include: { shop: true }
    });

    // Fuzzy matching database product catalog helper
    const findMatchingDbProduct = (parsedName: string) => {
      const lowerParsed = parsedName.toLowerCase();
      // Try exact or sub-string matching
      let match = dbProducts.find(
        (dp) =>
          dp.name.toLowerCase().includes(lowerParsed) ||
          lowerParsed.includes(dp.name.toLowerCase())
      );
      if (match) return match;

      // Try matching by split words
      const parsedWords = lowerParsed.split(/[\s-_]+/);
      for (const word of parsedWords) {
        if (word.length > 3) {
          match = dbProducts.find((dp) => dp.name.toLowerCase().includes(word));
          if (match) return match;
        }
      }
      return null;
    };

    // 3. Process and group campaign statistics by product families
    const productMap = new Map<string, {
      id: string;
      productId: string;
      name: string;
      imageUrl: string | null;
      sku: string;
      stock: number;
      shopName: string;
      spend: number;
      gmv: number;
      roi: number;
      orders: number;
    }>();

    for (const campaign of campaigns) {
      const { productName, sku } = parseProductFromCampaignName(campaign.name);
      const shopName = campaign.advertiser?.shop?.name || "Shop";
      
      let spend = 0;
      let gmv = 0;
      let orders = 0;
      campaign.reports.forEach((r) => {
        spend += r.spend;
        gmv += r.gmv;
        orders += r.orders;
      });

      // Skip campaigns that haven't spent anything or made orders to keep report clean
      if (spend === 0 && orders === 0) continue;

      const mapKey = `${shopName}_${productName}`.toLowerCase();
      
      if (productMap.has(mapKey)) {
        const existing = productMap.get(mapKey)!;
        existing.spend += spend;
        existing.gmv += gmv;
        existing.orders += orders;
        existing.roi = existing.spend > 0 ? existing.gmv / existing.spend : 0;
      } else {
        const dbMatch = findMatchingDbProduct(productName);
        
        productMap.set(mapKey, {
          id: dbMatch?.id || `parsed-${mapKey}`,
          productId: dbMatch?.productId || `PD-${sku.substring(0, 10)}`,
          name: dbMatch?.name || productName,
          imageUrl: dbMatch?.imageUrl || null,
          sku: dbMatch?.sku || sku,
          stock: dbMatch ? dbMatch.stock : 50, // default to 50 to avoid false alerts
          shopName,
          spend,
          gmv,
          roi: spend > 0 ? gmv / spend : 0,
          orders,
        });
      }
    }

    const list = Array.from(productMap.values());

    // Sort list by GMV descending as ranking default
    const topProducts = [...list].sort((a, b) => b.gmv - a.gmv);
    const worstProducts = [...list].sort((a, b) => a.roi - b.roi);

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
