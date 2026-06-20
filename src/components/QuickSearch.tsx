"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuickSearch({ 
  brands 
}: { 
  brands: { id: number, name: string, models: { id: number, name: string }[] }[] 
}) {
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const activeBrand = brands.find(b => b.id.toString() === selectedBrand);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBrand && selectedModel) {
      router.push(`/cars/${selectedBrand}/${selectedModel}`);
    }
  };

  return (
    <div className="bg-black/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl w-full max-w-4xl mx-auto shadow-2xl relative z-20 mt-8 mb-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-5 bg-[#00ff9d] rounded-full"></span>
        חיפוש מהיר לפי דגם
      </h3>
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <select 
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ff9d] appearance-none"
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setSelectedModel(""); // Reset model when brand changes
            }}
          >
            <option value="" className="text-black">בחר יצרן...</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id} className="text-black">{brand.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex-1">
          <select 
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ff9d] appearance-none disabled:opacity-50"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedBrand}
          >
            <option value="" className="text-black">
              {!selectedBrand ? "קודם בחר יצרן" : "בחר דגם..."}
            </option>
            {activeBrand?.models.map(model => (
              <option key={model.id} value={model.id} className="text-black">{model.name}</option>
            ))}
          </select>
        </div>
        
        <button 
          type="submit"
          disabled={!selectedBrand || !selectedModel}
          className="bg-[#00ff9d] text-black font-bold px-8 py-3 rounded-xl hover:shadow-[0_0_15px_rgba(0,255,157,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          חפש דגם
        </button>
      </form>
    </div>
  );
}
