const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.advertiser.findUnique({
  where: { advertiserId: "7562821854005297153" }
}).then(console.log).finally(function(){return prisma["\x24disconnect"]();});
