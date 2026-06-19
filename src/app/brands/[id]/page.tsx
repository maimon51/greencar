import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Brand Header */}
      <div className="mb-12 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#00ff9d] to-[#00b8ff] flex items-center justify-center shadow-[0_0_20px_var(--color-primary-glow)]">
          <span className="text-black font-black text-4xl">{brand.name.charAt(0)}</span>
        </div>
        <div>
          <h1 className="text-4xl md:text-5xl font-black">{brand.name}</h1>
          <p className="text-gray-400 text-lg mt-2">{brand.country ? `ארץ ייצור: ${brand.country}` : 'דגמי יצרן'}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <span className="w-2 h-6 rounded-full bg-[#00ff9d]"></span>
        דגמי {brand.name}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brand.models.map((model) => (
          <Link
            key={model.id}
            href={`/cars/${brand.id}/${model.id}`}
            className="glass-panel p-6 rounded-2xl hover:border-[#00ff9d]/50 hover:bg-white/10 transition-all group"
          >
            <h3 className="text-2xl font-bold group-hover:text-[#00ff9d] transition-colors">{model.name}</h3>
            {model.commercialName && model.commercialName !== model.name && (
              <p className="text-gray-400 mt-1">{model.commercialName}</p>
            )}
            <div className="mt-6 flex justify-between items-center text-sm">
              <span className="bg-black/50 px-3 py-1 rounded-full text-gray-300">
                {model._count.trims} רמות גימור
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
