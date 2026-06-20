const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const ms = await prisma.manufacturer.findMany({take:10});
  console.log("Manufacturers:", ms.map(m=>m.name));
  
  // Also check brand 1 models
  const brand = await prisma.manufacturer.findUnique({
    where: { id: ms[0].id },
    include: {
      models: {
        include: { _count: { select: { trims: true } } }
      }
    }
  });
  console.log("Brand:", brand.name);
  if (brand.models.length > 0) {
    const model = brand.models[0];
    console.log("Model name:", model.name, "type:", typeof model.name);
    console.log("Commercial:", model.commercialName, "type:", typeof model.commercialName);
    console.log("Count trims:", model._count.trims);
  }
}
run().catch(console.error).finally(()=>prisma.$disconnect());
