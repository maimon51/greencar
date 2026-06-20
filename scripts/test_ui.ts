import { prisma } from '../src/lib/prisma';
async function run() {
  const brand = await prisma.manufacturer.findFirst({
    include: { models: { include: { _count: { select: { trims: true } } } } }
  });
  console.log("Brand:", brand.name);
  const modelsGrouped = brand.models.reduce((acc, model) => {
    const displayName = model.commercialName || model.name;
    if (!acc[displayName]) {
      acc[displayName] = { ...model, displayName, totalTrims: 0, modelCodes: [] };
    }
    acc[displayName].totalTrims += model._count.trims;
    acc[displayName].modelCodes.push(model.name);
    return acc;
  }, {});
  console.log("Unique:", Object.keys(modelsGrouped).length);
}
run().catch(console.error).finally(()=>prisma.$disconnect());
