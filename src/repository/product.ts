import { prisma } from "../lib/db";
import { Product, ProductReport } from "@prisma/client";

export interface ProductFilter {
  shopId?: string;
  productId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class ProductRepository {
  static async upsertProduct(data: {
    productId: string;
    name: string;
    imageUrl?: string;
    sku?: string;
    stock?: number;
    shopId: string;
  }): Promise<Product> {
    return prisma.product.upsert({
      where: { productId: data.productId },
      update: {
        name: data.name,
        imageUrl: data.imageUrl,
        sku: data.sku,
        stock: data.stock ?? 0,
      },
      create: {
        productId: data.productId,
        name: data.name,
        imageUrl: data.imageUrl,
        sku: data.sku,
        stock: data.stock ?? 0,
        shopId: data.shopId,
      },
    });
  }

  static async upsertProductReport(data: {
    productId: string;
    date: Date;
    spend: number;
    gmv: number;
    roi: number;
    orders: number;
  }): Promise<ProductReport> {
    return prisma.productReport.upsert({
      where: {
        productId_date: {
          productId: data.productId,
          date: data.date,
        },
      },
      update: {
        spend: data.spend,
        gmv: data.gmv,
        roi: data.roi,
        orders: data.orders,
      },
      create: {
        productId: data.productId,
        date: data.date,
        spend: data.spend,
        gmv: data.gmv,
        roi: data.roi,
        orders: data.orders,
      },
    });
  }

  static async getProductsWithStats(filters: ProductFilter) {
    const whereClause: any = {};
    if (filters.productId) {
      whereClause.productId = filters.productId;
    }
    if (filters.shopId) {
      whereClause.shopId = filters.shopId;
    }

    const reportWhereClause: any = {};
    if (filters.startDate && filters.endDate) {
      reportWhereClause.date = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return prisma.product.findMany({
      where: whereClause,
      include: {
        shop: true,
        reports: {
          where: reportWhereClause,
        },
      },
    });
  }
}
