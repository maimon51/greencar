'use client';

import { useState } from 'react';

export function TrimYearSelector({ trims }: { trims: any[] }) {
  // Extract unique years and sort descending
  const years = Array.from(new Set(trims.map(t => t.year))).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState<number>(years[0] || 0);

  if (trims.length === 0) {
    return <div className="text-gray-500 text-center py-10">לא נמצאו רמות גימור לדגם זה.</div>;
  }

  // Filter trims by the selected year
  const activeTrims = trims.filter(t => t.year === selectedYear);

  return (
    <div>
      {/* Year Tabs */}
      <div className="flex flex-wrap gap-2 pb-4 mb-6" style={{ direction: 'rtl' }}>
        {years.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-6 py-2 rounded-full font-bold transition-all ${
              selectedYear === year 
                ? 'bg-[#00ff9d] text-black shadow-[0_0_15px_rgba(0,255,157,0.4)]' 
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Trims Grid for Selected Year */}
      <div className="space-y-6">
        {activeTrims.map((trim, idx) => (
          <div key={trim.id || idx} className="glass-panel rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-white/10">
              <div>
                <h3 className="text-2xl font-bold text-[#00ff9d]">{trim.name}</h3>
                <p className="text-gray-400">שנת ייצור: {trim.year}</p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
                {trim.msrp && (
                  <div className="flex items-center gap-2 bg-[#00ff9d]/10 text-[#00ff9d] px-4 py-2 rounded-full border border-[#00ff9d]/20">
                    <span className="text-sm">מחיר רשמי (MSRP):</span>
                    <span className="font-bold">₪{trim.msrp.toLocaleString()}</span>
                  </div>
                )}
                {trim.activeCount > 0 && (
                  <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20">
                    <span className="text-sm">רכבים פעילים בכביש:</span>
                    <span className="font-bold">{trim.activeCount.toLocaleString()}</span>
                  </div>
                )}
                {trim.safetyScore && (
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <span className="text-sm text-gray-400">ציון בטיחות:</span>
                    <span className="font-bold text-white">{trim.safetyScore} / 8</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
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
              <div>
                <p className="text-sm text-gray-500 mb-1">מדד ירוק</p>
                <p className={`font-medium text-lg flex items-center gap-2 ${trim.greenIndex && trim.greenIndex <= 4 ? 'text-green-400' : trim.greenIndex && trim.greenIndex >= 12 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {trim.greenIndex ? `${trim.greenIndex} / 15` : 'לא ידוע'}
                  {trim.greenIndex && trim.greenIndex <= 4 && '🌱'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">פליטת CO2</p>
                <p className="font-medium text-lg">{trim.co2Wltp ? `${trim.co2Wltp} g/km` : 'לא ידוע'}</p>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-3">מערכות בטיחות מתקדמות</p>
              <div className="flex flex-wrap gap-2">
                <Badge active={trim.adaptiveCruise} label="בקרת שיוט אדפטיבית" />
                <Badge active={trim.laneDeparture} label="סטייה מנתיב" />
                <Badge active={trim.blindSpot} label="שטח מת" />
                <Badge active={trim.autoBrake} label="בלימת חירום" />
                <Badge active={trim.pedestrianId} label="זיהוי הולכי רגל" />
                {!trim.adaptiveCruise && !trim.laneDeparture && !trim.blindSpot && !trim.autoBrake && !trim.pedestrianId && (
                  <span className="text-gray-500 text-sm">אין נתונים על מערכות מתקדמות</span>
                )}
              </div>
            </div>
          </div>
        ))}
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
