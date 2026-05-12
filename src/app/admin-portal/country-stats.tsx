
"use client";

import React, { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// A high-quality, lightweight topojson that includes ISO codes
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type CountryData = {
  code: string; // This is ISO Alpha-2 (e.g., "US", "PK")
  name: string;
  count: number;
};

// Map ISO-Numeric to ISO-Alpha-2 for the world-atlas countries-110m.json
// This ensures perfect mapping between your DB data and the map
const numericToAlpha2: Record<string, string> = {
  "840": "US", "586": "PK", "356": "IN", "826": "GB", "124": "CA", "036": "AU", "276": "DE", "250": "FR", "380": "IT", "724": "ES", "392": "JP", "156": "CN", "076": "BR", "484": "MX", "643": "RU", "710": "ZA", "554": "NZ", "702": "SG", "458": "MY", "764": "TH", "608": "PH", "360": "ID", "784": "AE", "682": "SA", "818": "EG", "792": "TR", "528": "NL", "752": "SE", "578": "NO", "208": "DK", "246": "FI", "756": "CH", "040": "AT", "056": "BE", "372": "IE", "620": "PT", "300": "GR", "616": "PL", "203": "CZ", "703": "SK", "348": "HU", "642": "RO", "100": "BG", "191": "HR", "705": "SI", "233": "EE", "428": "LV", "440": "LT", "804": "UA", "398": "KZ", "860": "UZ", "031": "AZ", "268": "GE", "051": "AM", "368": "IQ", "414": "KW", "634": "QA", "048": "BH", "512": "OM", "400": "JO", "422": "LB", "376": "IL", "116": "KH", "704": "VN", "410": "KR", "408": "KP", "158": "TW", "496": "MN", "144": "LK", "050": "BD", "524": "NP", "064": "BT", "462": "MV", "231": "ET", "404": "KE", "566": "NG", "288": "GH", "120": "CM", "180": "CD", "178": "CG", "266": "GA", "121": "CI", "666": "ST", "132": "CV", "624": "GW", "626": "TL", "242": "FJ", "548": "VU", "090": "SB", "598": "UY", "032": "AR", "152": "CL", "068": "BO", "604": "PE", "170": "CO", "218": "EC", "862": "VE", "591": "PY", "320": "GT", "340": "HN", "222": "SV", "558": "NI", "188": "CR", "590": "PA", "136": "KY", "044": "BS", "418": "LA", "104": "MM", "004": "AF",
};

export function CountryStats({ countries }: { countries: CountryData[] }) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = countries.reduce((acc, c) => acc + c.count, 0);
    const max = countries.length > 0 ? Math.max(...countries.map((c) => c.count)) : 0;
    const countryMap = new Map<string, number>();
    countries.forEach((c) => countryMap.set(c.code.toUpperCase(), c.count));
    return { total, max, countryMap };
  }, [countries]);

  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, stats.max === 0 ? 1 : stats.max])
      .range(["#f1f5f9", "#2563eb"]); // slate-100 to blue-600
  }, [stats.max]);

  return (
    <Card className="lg:col-span-5 border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-xl">Users by Country</CardTitle>
            </div>
            <CardDescription>
              Geographic distribution of your {stats.total} total signups.
            </CardDescription>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm">
             <div className="flex flex-col items-center px-3 border-r">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Total Signups</span>
                <span className="text-lg font-black text-blue-600">{stats.total}</span>
             </div>
             <div className="flex flex-col items-center px-3">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Countries</span>
                <span className="text-lg font-black text-slate-700 dark:text-slate-200">{countries.length}</span>
             </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative min-h-[400px] flex items-center justify-center">
            <TooltipProvider delayDuration={0}>
              <ComposableMap
                projectionConfig={{
                  rotate: [-10, 0, 0],
                  scale: 160,
                }}
                className="w-full h-full"
              >
                <Sphere id="sphere" stroke="#cbd5e1" strokeWidth={0.3} fill="transparent" />
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const isoAlpha2 = numericToAlpha2[geo.id] || "";
                      const count = stats.countryMap.get(isoAlpha2) || 0;
                      const isHovered = hoveredCountry === geo.properties.name;

                      return (
                        <Tooltip key={geo.rsmKey}>
                          <TooltipTrigger asChild>
                            <Geography
                              geography={geo}
                              fill={count > 0 ? colorScale(count) : "#f8fafc"}
                              stroke={isHovered ? "#1e40af" : "#e2e8f0"}
                              strokeWidth={isHovered ? 1 : 0.5}
                              style={{
                                default: { outline: "none", transition: "all 250ms" },
                                hover: { fill: "#1d4ed8", outline: "none", cursor: "pointer" },
                                pressed: { outline: "none" },
                              }}
                              onMouseEnter={() => setHoveredCountry(geo.properties.name)}
                              onMouseLeave={() => setHoveredCountry(null)}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 text-white border-none shadow-2xl p-3 rounded-xl">
                            <div className="flex flex-col items-center gap-1">
                               <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{geo.properties.name}</span>
                               <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3 text-blue-400" />
                                  <span className="text-lg font-black">{count}</span>
                                  <span className="text-xs text-slate-300">Users</span>
                               </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </TooltipProvider>

            {/* Simple Legend */}
            <div className="absolute bottom-4 left-6 flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2 px-3 rounded-full border text-[10px] font-bold uppercase tracking-tighter text-slate-500 shadow-sm">
                <span>0</span>
                <div className="w-24 h-1.5 rounded-full bg-gradient-to-r from-slate-100 to-blue-600" />
                <span>{stats.max}</span>
            </div>
          </div>

          <div className="xl:col-span-1">
            <Card className="h-full border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Ranking by Signups</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {countries.length > 0 ? (
                                countries.map((country, index) => (
                                    <div
                                        key={country.code}
                                        className={`flex items-center gap-4 p-4 transition-all ${
                                            hoveredCountry === country.name ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                                        }`}
                                    >
                                        <span className="text-xs font-black text-slate-300 w-4">{index + 1}</span>
                                        <img
                                            src={`https://flag.vercel.app/s/${country.code}.svg`}
                                            alt={`${country.name} flag`}
                                            className="h-4 w-6 rounded-sm object-cover shadow-sm ring-1 ring-slate-200"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate text-slate-700 dark:text-slate-200">{country.name}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-black text-blue-600">{country.count}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {((country.count / stats.total) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-3">
                                    <Globe className="h-10 w-10 opacity-10" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No data yet</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
