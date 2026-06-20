"use client";

import availableLogos from "@/lib/availableLogos.json";

export function BrandLogo({ domain, name }: { domain: string; name: string }) {
  const cleanFilename = name.toLowerCase().replace(/\s+/g, '_');
  
  // If we don't have the logo locally, we skip the <img> tag entirely.
  // This prevents the browser from throwing 404 network errors in the console.
  const hasLocalLogo = availableLogos.includes(cleanFilename);

  if (!hasLocalLogo) {
    return (
      <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:border-[#00ff9d]/50 transition-all">
        <span className="text-3xl font-black text-gray-400 group-hover:text-[#00ff9d] transition-colors">
          {name.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:shadow-[0_0_20px_var(--color-primary-glow)] transition-all">
      <img
        src={`/logos/${cleanFilename}.png`}
        alt={`${name} logo`}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
