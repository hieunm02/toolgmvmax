import { prisma } from "../lib/db";
import { User } from "@prisma/client";

export class UserRepository {
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        shops: true,
      },
    });
  }

  static async create(data: {
    email: string;
    passwordHash: string;
    name?: string;
    role?: string;
  }): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  static async associateShop(userId: string, shopId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        shops: {
          connect: { id: shopId },
        },
      },
    });
  }
}
