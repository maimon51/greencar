import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { searchLicensePlate } from "./actions";
import { cleanBrandName } from "@/lib/brandUtils";
import { BrandLogo } from "@/components/BrandLogo";
import { QuickSearch } from "@/components/QuickSearch";

export const revalidate = 3600; 

export default async function Home() {
  // Fetch all models to compute popular brands, popular models, and populate QuickSearch
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

  const groupedBrands = new Map<string, { id: number, name: string, uniqueModels: Set<string>, allModels: any[] }>();
  
  for (const model of allModels) {
    const { name: cleanName } = cleanBrandName(model.manufacturer.name, model.manufacturer.country);
    const displayName = model.commercialName || model.name;
    
    if (!groupedBrands.has(cleanName)) {
      groupedBrands.set(cleanName, { 
        id: model.manufacturer.id, 
        name: cleanName, 
        uniqueModels: new Set([displayName]),
        allModels: [model]
      });
    } else {
      const brandObj = groupedBrands.get(cleanName)!;
      brandObj.uniqueModels.add(displayName);
      brandObj.allModels.push(model);
    }
  }

  // 1. Prepare Brands for Popular Brands Grid
  const manufacturers = Array.from(groupedBrands.values())
    .map(brand => {
       const activeCount = brand.allModels.reduce((acc, m) => acc + m.trims.reduce((accT: number, t: any) => accT + (t.activeCount || 0), 0), 0);
       return { id: brand.id, name: brand.name, count: brand.uniqueModels.size, activeCount };
    })
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, 12);

  // 2. Prepare Data for QuickSearch (Dropdowns)
  const quickSearchData = Array.from(groupedBrands.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(brand => {
      // Deduplicate models by commercialName so we don't have 10 "Forester" entries
      const uniqueModelMap = new Map<string, number>();
      brand.allModels.forEach(m => {
        const displayName = m.commercialName || m.name;
        if (!uniqueModelMap.has(displayName)) {
          uniqueModelMap.set(displayName, m.id);
        }
      });
      const deduplicatedModels = Array.from(uniqueModelMap.entries())
        .map(([name, id]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: brand.id,
        name: brand.name,
        models: deduplicatedModels
      };
    });

  // 3. Prepare Popular Models (Highest active count)
  const uniqueModelsGlobalMap = new Map<string, any>();
  for (const model of allModels) {
    const displayName = model.commercialName || model.name;
    const { name: cleanBrand } = cleanBrandName(model.manufacturer.name, model.manufacturer.country);
    const globalKey = `${cleanBrand}-${displayName}`;
    
    const activeCountSum = model.trims.reduce((acc, trim) => acc + (trim.activeCount || 0), 0);
    
    if (!uniqueModelsGlobalMap.has(globalKey)) {
      uniqueModelsGlobalMap.set(globalKey, {
        id: model.id,
        brandId: model.manufacturer.id,
        brandName: cleanBrand,
        modelName: displayName,
        imageUrl: model.imageUrl,
        totalActiveCount: activeCountSum
      });
    } else {
      uniqueModelsGlobalMap.get(globalKey).totalActiveCount += activeCountSum;
      // Prefer models that actually have images
      if (!uniqueModelsGlobalMap.get(globalKey).imageUrl && model.imageUrl) {
        uniqueModelsGlobalMap.get(globalKey).imageUrl = model.imageUrl;
      }
    }
  }

  const popularModels = Array.from(uniqueModelsGlobalMap.values())
    .sort((a, b) => b.totalActiveCount - a.totalActiveCount)
    .slice(0, 8); // Top 8 most popular models

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-8 md:p-16 text-center mb-16 border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00ff9d]/10 to-transparent pointer-events-none" />
        
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight drop-shadow-xl text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 relative z-10">
          מאגר הרכבים <br className="hidden md:block"/> הגדול בישראל
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 relative z-10">
          מפרט טכני מלא, רמות גימור, ודירוגי בטיחות לכל רכב שעלה על הכביש בישראל.
        </p>

        {/* Quick Search Dropdowns */}
        <QuickSearch brands={quickSearchData} />
        
        <div className="my-8 flex items-center justify-center gap-4 text-gray-500 relative z-10">
          <div className="h-px w-16 bg-white/10"></div>
          <span>או חפש לפי לוחית רישוי</span>
          <div className="h-px w-16 bg-white/10"></div>
        </div>
        
        {/* Search Mockup (Plate) */}
        <form action={searchLicensePlate} className="max-w-2xl mx-auto flex gap-4 relative z-10">
          <input 
            type="text"
            name="plate" 
            required
            placeholder="הכנס מספר רישוי..." 
            className="flex-1 bg-white/10 border border-white/20 rounded-full px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff9d] focus:ring-1 focus:ring-[#00ff9d] transition-all"
            style={{ direction: 'ltr', textAlign: 'right' }}
          />
          <button type="submit" className="bg-gradient-to-r from-[#00ff9d] to-[#00b8ff] text-black font-bold px-8 py-4 rounded-full hover:shadow-[0_0_30px_var(--color-primary-glow)] transition-all hover:scale-105">
            חפש
          </button>
        </form>
      </div>

      {/* Popular Models Grid */}
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <span className="w-2 h-8 rounded-full bg-[#00ff9d]"></span>
        דגמים נבחרים
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {popularModels.map((pm) => (
          <Link 
            key={pm.id} 
            href={`/cars/${pm.brandId}/${pm.id}`}
            className="glass-panel rounded-2xl overflow-hidden hover:scale-105 transition-transform group border border-white/10"
          >
            <div className="h-40 bg-white/5 relative flex items-center justify-center p-4">
              {pm.imageUrl ? (
                <img src={pm.imageUrl} alt={pm.modelName} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <span className="text-gray-600 text-sm">אין תמונה</span>
              )}
            </div>
            <div className="p-4 border-t border-white/10">
              <h3 className="font-bold text-lg group-hover:text-[#00ff9d] transition-colors">{pm.brandName} {pm.modelName}</h3>
              <p className="text-sm text-gray-400">{pm.totalActiveCount.toLocaleString()} רכבים בכביש</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Brands Grid */}
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <span className="w-2 h-8 rounded-full bg-white"></span>
        יצרנים פופולריים
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {manufacturers.map((brand) => (
            <Link 
              key={brand.id} 
              href={`/brands/${brand.id}`}
              className="glass-panel p-6 rounded-2xl hover:scale-105 transition-transform flex flex-col items-center justify-center text-center group"
            >
              <div className="mb-4">
                <BrandLogo name={brand.name} domain={`${brand.name.toLowerCase().replace(/\s+/g, '')}.com`} />
              </div>
              <h3 className="font-bold group-hover:text-[#00ff9d] transition-colors">{brand.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{brand.activeCount.toLocaleString()} רכבים בכביש</p>
            </Link>
          ))}
      </div>
      
      {/* Official Green Car Marketing CTA */}
      <div className="mt-24 p-1 rounded-3xl bg-gradient-to-r from-[#00ff9d] to-[#00b8ff]">
        <div className="bg-black/90 backdrop-blur-xl rounded-[23px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute opacity-10 right-0 top-0 pointer-events-none">
            <img src="https://www.green-car.co.il/sites/default/files/ua.png" alt="Green Car Background" className="w-64 h-auto" />
          </div>
          
          <div className="z-10 flex-1">
            <div className="flex items-center gap-4 mb-4">
              <img src="https://www.green-car.co.il/sites/default/files/ua.png" alt="גרינקאר" className="h-12 bg-white/10 p-2 rounded-lg" />
              <h3 className="text-3xl font-bold">מחפשים רכב לרכישה?</h3>
            </div>
            <p className="text-gray-300 text-lg mb-4">
              בואו לראות את המלאי המעודכן שלנו בסוכנות הרכב <span className="text-[#00ff9d] font-bold">גרינקאר</span>. אנו מציעים רכבים שמורים באחריות מקיפה, אפשרויות טרייד-אין ותנאי מימון מעולים.
            </p>
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">📍 הרצל 28, ראשון לציון</span>
              <span className="flex items-center gap-2">📞 חייגו אלינו: <span className="text-white font-bold text-lg">*8523</span></span>
            </div>
          </div>
          
          <div className="z-10 mt-6 md:mt-0 flex flex-col gap-4">
            <a 
              href="https://www.green-car.co.il/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-[#00ff9d] text-black px-8 py-4 rounded-full font-bold text-center hover:scale-105 hover:shadow-[0_0_20px_rgba(0,255,157,0.4)] transition-all"
            >
              למלאי הרכבים הזמין
            </a>
            <a 
              href="tel:*8523" 
              className="border border-white/20 hover:bg-white/5 text-white px-8 py-4 rounded-full font-bold text-center transition-all"
            >
              חייגו עכשיו: *8523
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
