"use client";

import { useState, useEffect } from "react";

export function BrandLogo({ domain, name }: { domain: string; name: string }) {
  // 0: try local, 1: try clearbit, 2: fallback text
  const [errorLevel, setErrorLevel] = useState(0);

  // If name changes, reset error level
  useEffect(() => {
    setErrorLevel(0);
  }, [name, domain]);

  if (errorLevel >= 2) {
    return (
      <span className="text-4xl font-black text-gray-300 group-hover:text-[#00ff9d] transition-colors">
        {name.charAt(0)}
      </span>
    );
  }

  const cleanFilename = name.toLowerCase().replace(/\s+/g, '_');
  const imgSrc = errorLevel === 0 
    ? `/logos/${cleanFilename}.png` 
    : `https://logo.clearbit.com/${domain}`;

  return (
    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:shadow-[0_0_20px_var(--color-primary-glow)] transition-all">
      <img
        src={imgSrc}
        alt={`${name} logo`}
        className="w-full h-full object-contain"
        onError={() => setErrorLevel(prev => prev + 1)}
      />
    </div>
  );
}
