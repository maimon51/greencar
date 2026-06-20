import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { cleanBrandName } from "@/lib/brandUtils";

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const brandId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(brandId)) return notFound();

  const brand = await prisma.manufacturer.findUnique({
    where: { id: brandId },
    include: {
      models: {
        include: { _count: { select: { trims: true } } }
      }
    }
  });

  if (!brand) return notFound();

  // Group models by their displayed name
  const modelsGrouped = brand.models.reduce((acc, model) => {
    const displayName = model.commercialName || model.name;
    if (!acc[displayName]) {
      acc[displayName] = { ...model, displayName, totalTrims: 0, modelCodes: [] };
    }
    acc[displayName].totalTrims += model._count.trims;
    acc[displayName].modelCodes.push(model.name);
    return acc;
  }, {} as Record<string, any>);
  const uniqueModels = Object.values(modelsGrouped).sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Clean brand name and get proper English domain
  const { name: cleanName, domain } = cleanBrandName(brand.name, brand.country);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Brand Header */}
      <div className="mb-12 flex items-center gap-6">
        <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center shadow-[0_0_20px_var(--color-primary-glow)] border border-white/10 overflow-hidden relative">
          <BrandLogo domain={domain} name={cleanName} />
        </div>
        <div>
          <h1 className="text-4xl md:text-5xl font-black">{cleanName}</h1>
          <p className="text-gray-400 text-lg mt-2">{brand.country ? `ארץ ייצור: ${brand.country}` : 'דגמי יצרן'}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <span className="w-2 h-6 rounded-full bg-[#00ff9d]"></span>
        דגמי {cleanName}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uniqueModels.map((model) => (
          <Link
            key={model.id}
            href={`/cars/${brand.id}/${model.id}`}
            className="glass-panel p-6 rounded-2xl hover:border-[#00ff9d]/50 hover:bg-white/10 transition-all group"
          >
            <h3 className="text-2xl font-bold group-hover:text-[#00ff9d] transition-colors">{model.displayName}</h3>
            {model.modelCodes.length > 0 && (
              <p className="text-gray-400 mt-1 text-xs">קודי דגם: {model.modelCodes.join(', ')}</p>
            )}
            <div className="mt-6 flex justify-between items-center text-sm">
              <span className="bg-black/50 px-3 py-1 rounded-full text-gray-300">
                {model.totalTrims} רמות גימור
              </span>
              <span className="text-[#00ff9d] opacity-0 group-hover:opacity-100 transition-opacity">
                צפה במפרט ←
              </span>
            </div>
          </Link>
        ))}
      </div>
      
      {brand.models.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          לא נמצאו דגמים ליצרן זה במסד הנתונים.
        </div>
      )}
    </div>
  );
}
