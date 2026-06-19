import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { searchLicensePlate } from "./actions";

export const revalidate = 3600; 

export default async function Home() {
  const manufacturers = await prisma.manufacturer.findMany({
    where: { models: { some: {} } },
    include: { _count: { select: { models: true } } },
    orderBy: { models: { _count: 'desc' } },
    take: 12,
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-12 md:p-24 text-center mb-16 border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00ff9d]/10 to-transparent pointer-events-none" />
        
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight drop-shadow-xl text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
          מאגר הרכבים <br className="hidden md:block"/> הגדול בישראל
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          מפרט טכני מלא, רמות גימור, ודירוגי בטיחות לכל רכב שעלה על הכביש בישראל.
        </p>
        
        {/* Search Mockup */}
        <form action={searchLicensePlate} className="max-w-2xl mx-auto flex gap-4">
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

      {/* Brands Grid */}
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <span className="w-2 h-8 rounded-full bg-[#00ff9d]"></span>
        יצרנים פופולריים
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {manufacturers.map((brand) => (
          <Link 
            key={brand.id} 
            href={`/brands/${brand.id}`}
            className="glass-panel p-6 rounded-2xl hover:-translate-y-2 hover:border-[#00ff9d]/50 transition-all group flex flex-col items-center text-center cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-[#00ff9d]/10 transition-colors">
              <span className="text-2xl font-bold text-gray-300 group-hover:text-[#00ff9d]">{brand.name.charAt(0)}</span>
            </div>
            <h3 className="font-bold text-xl mb-1">{brand.name}</h3>
            <span className="text-sm text-gray-500">{brand._count.models} דגמים</span>
          </Link>
        ))}
      </div>
      
      {/* Marketing CTA */}
      <div className="mt-24 p-1 rounded-3xl bg-gradient-to-r from-[#00ff9d] to-[#00b8ff]">
        <div className="bg-black/90 backdrop-blur-xl rounded-[23px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between">
          <div>
            <h3 className="text-3xl font-bold mb-2">מחפשים רכב לרכישה?</h3>
            <p className="text-gray-400">בואו לראות את המלאי המעודכן שלנו ב-Greencar עם רכבים שמורים באחריות.</p>
          </div>
          <button className="mt-6 md:mt-0 bg-white text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform">
            למלאי הרכבים
          </button>
        </div>
      </div>
    </div>
  );
}
