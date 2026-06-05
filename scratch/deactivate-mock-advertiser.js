const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const updated = await prisma.advertiser.update({
      where: { advertiserId: "ADV_AUTO_TEST" },
      data: { status: "INACTIVE" },
    });
    console.log(`Successfully deactivated mock advertiser: ${updated.name} (${updated.advertiserId})`);
  } catch (error) {
    console.error("Error deactivating advertiser:", error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
