import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cleanBrandName } from "@/lib/brandUtils";

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
  const allRecalls = siblingModels.flatMap(m => m.recalls);
  
  // Get unique model codes
  const modelCodes = siblingModels.map(m => m.name).join(', ');
  
  const cleanName = cleanBrandName(carModel.manufacturer.name, carModel.manufacturer.country);

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

      {/* Trims / Versions */}
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <span className="w-2 h-6 rounded-full bg-[#00ff9d]"></span>
        מפרטים ורמות גימור
      </h2>

      <div className="space-y-6">
        {allTrims.map((trim) => (
          <div key={trim.id} className="glass-panel rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-white/10">
              <div>
                <h3 className="text-2xl font-bold text-[#00ff9d]">{trim.name}</h3>
                <p className="text-gray-400">שנת ייצור: {trim.year}</p>
              </div>
              {trim.safetyScore && (
                <div className="mt-4 md:mt-0 flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                  <span className="text-sm text-gray-400">ציון בטיחות:</span>
                  <span className="font-bold">{trim.safetyScore} / 8</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Specs block */}
              <div>
                <p className="text-sm text-gray-500 mb-1">מנוע</p>
                <p className="font-medium text-lg">{trim.engineSize ? `${trim.engineSize} סמ"ק` : 'לא ידוע'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">כוח סוס</p>
                <p className="font-medium text-lg">{trim.horsepower ? `${trim.horsepower} כ"ס` : 'לא ידוע'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">דלק</p>
                <p className="font-medium text-lg">{trim.fuelType || 'לא ידוע'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">תיבת הילוכים</p>
                <p className="font-medium text-lg">{trim.gearbox || 'לא ידוע'}</p>
              </div>
            </div>

            {/* Safety Badges */}
            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-3">מערכות בטיחות מתקדמות</p>
              <div className="flex flex-wrap gap-2">
                <Badge active={trim.adaptiveCruise} label="בקרת שיוט אדפטיבית" />
                <Badge active={trim.laneDeparture} label="סטייה מנתיב" />
                <Badge active={trim.blindSpot} label="שטח מת" />
                <Badge active={trim.autoBrake} label="בלימת חירום" />
                <Badge active={trim.pedestrianId} label="זיהוי הולכי רגל" />
              </div>
            </div>
          </div>
        ))}
        {allTrims.length === 0 && (
          <div className="text-gray-500 text-center py-10">לא נמצאו רמות גימור לדגם זה.</div>
        )}
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

      {/* Marketing CTA for Greencar */}
      <div className="mt-16 p-8 rounded-2xl border border-[#00ff9d]/30 bg-[#00ff9d]/5 text-center">
        <h3 className="text-2xl font-bold mb-4">מעוניינים ב{cleanName} {searchName}?</h3>
        <p className="text-gray-300 mb-6">לסוכנות Greencar יש מבחר רכבים במצב תצוגה. השאירו פרטים ונחזור אליכם.</p>
        <button className="bg-[#00ff9d] text-black font-bold px-8 py-3 rounded-full hover:shadow-[0_0_20px_var(--color-primary-glow)] transition-all hover:scale-105">
          בדוק זמינות במלאי
        </button>
      </div>
    </div>
  );
}

function Badge({ active, label }: { active: boolean, label: string }) {
  if (!active) return null;
  return (
    <span className="bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/20 px-3 py-1 rounded-full text-xs font-medium">
      ✓ {label}
    </span>
  );
}
