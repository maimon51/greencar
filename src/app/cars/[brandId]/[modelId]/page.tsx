import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cleanBrandName } from "@/lib/brandUtils";
import { TrimYearSelector } from "@/components/TrimYearSelector";

export default async function CarModelPage({ params }: { params: Promise<{ brandId: string, modelId: string }> }) {
  const resolvedParams = await params;
  const brandId = parseInt(resolvedParams.brandId, 10);
  const modelId = parseInt(resolvedParams.modelId, 10);

  if (isNaN(brandId) || isNaN(modelId)) return notFound();

  const carModel = await prisma.carModel.findUnique({
    where: { id: modelId },
    include: { manufacturer: true }
  });

  if (!carModel) return notFound();

  const searchName = carModel.commercialName || carModel.name;
  
  // Find all models for this manufacturer that have this same displayed name
  const siblingModels = await prisma.carModel.findMany({
    where: {
      manufacturerId: brandId,
      OR: [
        { commercialName: searchName },
        { name: searchName }
      ]
    },
    include: {
      recalls: true,
      trims: { orderBy: { year: 'desc' } }
    }
  });

  // Combine trims and recalls
  const allTrims = siblingModels.flatMap(m => m.trims).sort((a, b) => b.year - a.year);
  const rawRecalls = siblingModels.flatMap(m => m.recalls);
  const allRecalls = Array.from(new Map(rawRecalls.map(r => [r.description, r])).values());
  
  // Get unique model codes
  const modelCodes = siblingModels.map(m => m.name).join(', ');
  
  const { name: cleanName } = cleanBrandName(carModel.manufacturer.name, carModel.manufacturer.country);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Breadcrumbs */}
      <nav className="flex gap-2 text-sm text-gray-400 mb-8">
        <Link href="/" className="hover:text-white">ראשי</Link>
        <span>/</span>
        <Link href={`/brands/${brandId}`} className="hover:text-white">{cleanName}</Link>
        <span>/</span>
        <span className="text-[#00ff9d]">{searchName}</span>
      </nav>

      {/* Header */}
      <div className="glass-panel p-8 md:p-12 rounded-3xl mb-12 relative overflow-hidden border border-white/10 flex flex-col md:flex-row gap-8 items-center">
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#00ff9d]/10 to-transparent blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex-1 relative z-10">
          <h1 className="text-4xl md:text-6xl font-black mb-2">{cleanName} {searchName}</h1>
          <p className="text-xl text-gray-400 mb-4">קודי דגם: {modelCodes}</p>
          
          {carModel.description && (
            <p className="text-gray-300 leading-relaxed max-w-2xl mt-4">
              {carModel.description}
            </p>
          )}
        </div>

        {carModel.imageUrl && (
          <div className="w-full md:w-1/3 relative z-10 flex justify-center">
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/10 bg-white/5">
              <img src={carModel.imageUrl} alt={carModel.name} className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        )}
      </div>

      {/* Extended Journalistic Specs / extraSpecs */}
      {carModel.extraSpecs && Object.keys(carModel.extraSpecs as object).length > 0 && (
        <div className="mb-12 glass-panel p-8 rounded-3xl">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-[#00ff9d]">
            <span className="w-2 h-6 rounded-full bg-[#00ff9d]"></span>
            מפרט טכני מלא (מורחב)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
            {Object.entries(carModel.extraSpecs as Record<string, string>).map(([key, val]) => (
              <div key={key}>
                <p className="text-sm text-gray-500 mb-1">{key}</p>
                <p className="font-medium text-lg">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reliability & Known Issues */}
      {carModel.reliabilityScore && (
        <div className="mb-12 glass-panel p-8 rounded-3xl border border-[#ff3b3b]/20">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-[#ff3b3b]">
            <span className="w-2 h-6 rounded-full bg-[#ff3b3b]"></span>
            אמינות ותקלות נפוצות
          </h2>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 text-center p-6 bg-white/5 rounded-2xl border border-white/10 w-full md:w-auto">
              <p className="text-sm text-gray-400 mb-2">ציון אמינות משוקלל</p>
              <div className="text-5xl font-black text-white">
                {carModel.reliabilityScore}<span className="text-2xl text-gray-500">/100</span>
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold mb-4">תקלות שדווחו (מבוסס רשת):</h3>
              {carModel.knownIssues && Array.isArray(carModel.knownIssues) && carModel.knownIssues.length > 0 ? (
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  {(carModel.knownIssues as string[]).map((issue, idx) => (
                    <li key={idx} className="marker:text-[#ff3b3b]">{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">לא נמצאו תקלות סדרתיות נפוצות לרכב זה.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trims / Versions via Client Component */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="w-2 h-6 rounded-full bg-[#00ff9d]"></span>
          מפרטים ורמות גימור
        </h2>
        
        <TrimYearSelector trims={allTrims} />
      </div>

      {/* Recalls Section */}
      {allRecalls && allRecalls.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-red-400">
            <span className="w-2 h-6 rounded-full bg-red-500"></span>
            קריאות שירות (Recalls) בטיחותיות
          </h2>
          <div className="space-y-4">
            {allRecalls.map(recall => (
              <div key={recall.id} className="glass-panel p-6 border-r-4 border-red-500 rounded-lg">
                <p className="font-medium text-lg">{recall.description}</p>
                {recall.date && <p className="text-sm text-gray-400 mt-2">פורסם ב: {new Date(recall.date).toLocaleDateString('he-IL')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Marketing CTA for Greencar */}
      <div className="mt-16 p-1 rounded-3xl bg-gradient-to-r from-[#00ff9d]/50 to-transparent">
        <div className="bg-[#05100c] p-8 md:p-12 rounded-[23px] text-center md:text-right flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden">
          <div className="z-10 flex-1">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              מעוניינים ב{cleanName} {searchName}?
            </h3>
            <p className="text-gray-300 mb-6 text-lg">
              לסוכנות הרכב <span className="text-[#00ff9d] font-bold">גרינקאר</span> יש מבחר ענק של רכבים במצב תצוגה, כולל אפשרויות טרייד-אין ומימון נוח. השאירו פרטים ונחזור אליכם, או הגיעו לסניף שלנו!
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">📍 הרצל 28, ראשון לציון</span>
              <span className="flex items-center gap-2">📞 <span className="text-white font-bold text-lg">*8523</span></span>
            </div>
          </div>
          
          <div className="z-10 flex flex-col gap-4 w-full md:w-auto">
            <a 
              href="https://www.green-car.co.il/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-[#00ff9d] text-black font-bold px-10 py-4 rounded-full text-center hover:shadow-[0_0_30px_rgba(0,255,157,0.3)] transition-all hover:scale-105"
            >
              בדוק זמינות במלאי
            </a>
            <img src="https://www.green-car.co.il/sites/default/files/ua.png" alt="גרינקאר" className="h-8 mx-auto mt-2 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
}
