"use client";

import { useState } from "react";

export function BrandLogo({ domain, name }: { domain: string, name: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <span className="text-black font-black text-4xl bg-gradient-to-tr from-[#00ff9d] to-[#00b8ff] w-full h-full flex items-center justify-center">
        {name.charAt(0)}
      </span>
    );
  }

  return (
    <img 
      src={`https://logo.clearbit.com/${domain}`} 
      alt={name}
      className="w-16 h-16 object-contain z-10"
      onError={() => setError(true)}
    />
  );
}
