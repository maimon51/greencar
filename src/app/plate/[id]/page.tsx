import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LicensePlatePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const plate = resolvedParams.id.replace(/[^0-9]/g, "");

  if (!plate) return notFound();

  const vehicle = await prisma.activeVehicle.findUnique({
    where: { licensePlate: plate },
    include: {
      manufacturer: true,
      carModel: true,
    }
  });

  if (!vehicle) return notFound();

  // Format plate nicely
  let formattedPlate = plate;
  if (plate.length === 7) formattedPlate = `${plate.slice(0,2)}-${plate.slice(2,5)}-${plate.slice(5,7)}`;
  else if (plate.length === 8) formattedPlate = `${plate.slice(0,3)}-${plate.slice(3,5)}-${plate.slice(5,8)}`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          ← חזרה לחיפוש
        </Link>
      </div>

      <div className="glass-panel p-8 md:p-12 rounded-3xl border border-[#00ff9d]/30 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#00ff9d]/20 to-transparent blur-2xl rounded-full pointer-events-none" />
        
        <div className="bg-[#ffcc00] text-black font-black text-4xl md:text-5xl py-4 px-10 rounded-lg inline-block shadow-[0_0_20px_rgba(255,204,0,0.3)] mb-8 border-4 border-black">
          IL 🇮🇱 | {formattedPlate}
        </div>

        <h1 className="text-4xl font-bold mb-2">
          {vehicle.manufacturer.name} {vehicle.carModel.commercialName || vehicle.carModel.name}
        </h1>
        {vehicle.trimName && (
          <p className="text-xl text-[#00ff9d] mb-8">{vehicle.trimName}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right mb-10">
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-gray-400 text-sm">שנת ייצור</p>
            <p className="text-xl font-bold">{vehicle.year || 'לא ידוע'}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-gray-400 text-sm">צבע</p>
            <p className="text-xl font-bold">{vehicle.color || 'לא ידוע'}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-gray-400 text-sm">בעלות</p>
            <p className="text-xl font-bold">{vehicle.ownership || 'לא ידוע'}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-gray-400 text-sm">תוקף טסט</p>
            <p className="text-xl font-bold text-red-400">
              {vehicle.testExpiry ? new Date(vehicle.testExpiry).toLocaleDateString('he-IL') : 'לא ידוע'}
            </p>
          </div>
        </div>

        <Link 
          href={`/cars/${vehicle.manufacturerId}/${vehicle.carModelId}`}
          className="bg-white text-black font-bold px-8 py-3 rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105 inline-block"
        >
          לכל המפרטים של דגם זה ←
        </Link>
      </div>
    </div>
  );
}
