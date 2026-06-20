import { prisma } from "@/lib/prisma";
import { cleanBrandName } from "@/lib/brandUtils";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

export const revalidate = 3600;

export default async function InsightsPage() {
  // Query total active cars in Israel
  const totalActiveQuery = await prisma.trimLevel.aggregate({
    _sum: { activeCount: true }
  });
  const totalActive = totalActiveQuery._sum.activeCount || 0;

  // Query models with their trims
  const allModels = await prisma.carModel.findMany({
    select: {
      id: true,
      name: true,
      commercialName: true,
      imageUrl: true,
      trims: { select: { activeCount: true } },
      manufacturer: { select: { id: true, name: true, country: true } }
    }
  });

  const manufacturerStats = new Map<string, { id: number, name: string, activeCount: number }>();
  const modelStats = new Map<string, { id: number, brandId: number, name: string, activeCount: number, imageUrl: string | null }>();

  for (const model of allModels) {
    const activeCount = model.trims.reduce((acc, trim) => acc + (trim.activeCount || 0), 0);
    if (activeCount === 0) continue;

    const { name: cleanBrand } = cleanBrandName(model.manufacturer.name, model.manufacturer.country);
    
    // Group by Manufacturer
    if (!manufacturerStats.has(cleanBrand)) {
      manufacturerStats.set(cleanBrand, { id: model.manufacturer.id, name: cleanBrand, activeCount });
    } else {
      manufacturerStats.get(cleanBrand)!.activeCount += activeCount;
    }

    // Group by Model (commercialName)
    const displayName = model.commercialName || model.name;
    const modelKey = `${cleanBrand}-${displayName}`;
    
    if (!modelStats.has(modelKey)) {
      modelStats.set(modelKey, {
        id: model.id,
        brandId: model.manufacturer.id,
        name: `${cleanBrand} ${displayName}`,
        activeCount,
        imageUrl: model.imageUrl
      });
    } else {
      modelStats.get(modelKey)!.activeCount += activeCount;
      if (!modelStats.get(modelKey)!.imageUrl && model.imageUrl) {
        modelStats.get(modelKey)!.imageUrl = model.imageUrl;
      }
    }
  }

  const topManufacturers = Array.from(manufacturerStats.values())
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, 20);

  const topModels = Array.from(modelStats.values())
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, 20);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-black mb-4">תמונת מצב - שוק הרכב הישראלי</h1>
        <p className="text-xl text-gray-400">נתונים בזמן אמת ממשרד התחבורה</p>
      </div>

      <div className="glass-panel p-8 md:p-12 rounded-3xl mb-16 flex flex-col md:flex-row items-center justify-between border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/20 to-transparent blur-3xl rounded-full pointer-events-none" />
        <div>
          <h2 className="text-2xl text-gray-400 mb-2">סך הכל רכבים פעילים בכביש</h2>
          <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#00ff9d]">
            {totalActive.toLocaleString()}
          </div>
        </div>
        <div className="mt-8 md:mt-0 text-center md:text-left bg-white/5 p-6 rounded-2xl border border-white/10">
          <p className="text-lg font-bold text-white mb-2">עובדת בונוס 💡</p>
          <p className="text-gray-400 max-w-xs">
            זהו מספר הרכבים העדכני בעלי רישיון פעיל שנעים על כבישי ישראל כיום. הנתונים מתעדכנים באופן שוטף.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Top Manufacturers */}
        <div>
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <span className="w-2 h-8 rounded-full bg-[#00ff9d]"></span>
            20 היצרנים המובילים
          </h2>
          <div className="flex flex-col gap-4">
            {topManufacturers.map((brand, idx) => (
              <Link 
                key={brand.id}
                href={`/brands/${brand.id}`}
                className="glass-panel p-4 rounded-xl flex items-center justify-between hover:scale-[1.02] transition-transform border border-white/5 hover:border-[#00ff9d]/30 group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${idx < 3 ? 'bg-gradient-to-br from-[#00ff9d] to-blue-500 text-black' : 'bg-white/10 text-gray-400'}`}>
                    {idx + 1}
                  </div>
                  <div className="w-12 h-12 bg-white flex items-center justify-center rounded-lg p-1">
                    <BrandLogo name={brand.name} domain={`${brand.name.toLowerCase().replace(/\s+/g, '')}.com`} />
                  </div>
                  <span className="font-bold text-lg group-hover:text-[#00ff9d] transition-colors">{brand.name}</span>
                </div>
                <div className="text-right">
                  <span className="block font-black text-xl">{brand.activeCount.toLocaleString()}</span>
                  <span className="text-xs text-gray-500">רכבים</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Models */}
        <div>
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <span className="w-2 h-8 rounded-full bg-blue-500"></span>
            20 הדגמים הפופולריים ביותר
          </h2>
          <div className="flex flex-col gap-4">
            {topModels.map((model, idx) => (
              <Link 
                key={model.id}
                href={`/cars/${model.brandId}/${model.id}`}
                className="glass-panel p-4 rounded-xl flex items-center justify-between hover:scale-[1.02] transition-transform border border-white/5 hover:border-blue-500/30 group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${idx < 3 ? 'bg-gradient-to-br from-blue-500 to-[#00ff9d] text-black' : 'bg-white/10 text-gray-400'}`}>
                    {idx + 1}
                  </div>
                  {model.imageUrl ? (
                    <div className="w-16 h-12 flex items-center justify-center rounded overflow-hidden bg-white/5">
                      <img src={model.imageUrl} alt={model.name} className="max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-12 bg-white/5 rounded" />
                  )}
                  <span className="font-bold text-lg group-hover:text-blue-400 transition-colors">{model.name}</span>
                </div>
                <div className="text-right">
                  <span className="block font-black text-xl">{model.activeCount.toLocaleString()}</span>
                  <span className="text-xs text-gray-500">רכבים</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
