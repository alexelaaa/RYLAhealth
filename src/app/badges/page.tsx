"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { CAMP_WEEKENDS, LARGE_GROUPS, BIOME_COLORS } from "@/lib/constants";

interface Camper {
  id: number;
  firstName: string;
  lastName: string;
  largeGroup: string | null;
  smallGroup: string | null;
  cabinName: string | null;
  campWeekend: string | null;
  meetingLocation?: string | null;
}

function BadgePreview({ camper, logo, firstNameSize }: { camper: Camper | null; logo: string | null; firstNameSize: number }) {
  const c = camper || { firstName: "Jane", lastName: "Doe", largeGroup: "Arctic", smallGroup: "Polar Bears", cabinName: "Cabin 7", meetingLocation: "Lodge A" } as Camper;
  const colors = BIOME_COLORS[c.largeGroup || ""] || BIOME_COLORS.Arctic;

  return (
    <div
      className="rounded-lg overflow-hidden bg-white border border-slate-200"
      style={{ width: "4in", height: "3in" }}
    >
      <div className="flex flex-col items-center justify-center h-full p-3 gap-1">
        {logo && (
          <img src={logo} alt="Logo" className="object-contain" style={{ maxHeight: "0.55in", maxWidth: "1.5in" }} />
        )}
        <div className="font-extrabold text-center leading-tight" style={{ fontSize: `${firstNameSize}px`, color: colors.hex }}>
          {c.firstName}
        </div>
        <div className="text-gray-800 text-center font-bold" style={{ fontSize: "20px" }}>
          {c.lastName}
        </div>
        <div className="w-full mt-1 space-y-0.5 text-center" style={{ fontSize: "15px" }}>
          <div>
            <span className="font-bold" style={{ color: colors.hex }}>{c.largeGroup || "—"} / {c.smallGroup || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Discussion Meeting Location: </span>
            <span className="font-bold text-slate-800">{c.meetingLocation || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">Sleeping Cabin: </span>
            <span className="font-bold text-slate-800">{c.cabinName || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgesContent() {
  const searchParams = useSearchParams();
  const [campers, setCampers] = useState<Camper[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [weekend, setWeekend] = useState(searchParams.get("weekend") || CAMP_WEEKENDS[0]);
  const [groupFilter, setGroupFilter] = useState("");
  const [search, setSearch] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [firstNameSize, setFirstNameSize] = useState(28);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("badge-logo");
    if (saved) setLogo(saved);
    const savedSize = localStorage.getItem("badge-font-size");
    if (savedSize) setFirstNameSize(Number(savedSize));
  }, []);

  const fetchCampers = useCallback(async () => {
    setLoading(true);
    try {
      const [camperRes, groupRes] = await Promise.all([
        fetch(`/api/campers?${new URLSearchParams({ weekend, limit: "500", sortBy: "lastName", sortOrder: "asc" })}`),
        fetch(`/api/groups?${new URLSearchParams({ weekend, type: "small" })}`),
      ]);
      const camperData = await camperRes.json();
      const groupData = await groupRes.json();

      // Build meeting location lookup from small groups
      const meetingMap = new Map<string, string>();
      if (groupData.groups) {
        for (const g of groupData.groups) {
          if (g.name && g.meetingLocation) {
            meetingMap.set(g.name, g.meetingLocation);
          }
        }
      }

      // Merge meeting locations into campers
      const enriched = (camperData.campers || []).map((c: Camper) => ({
        ...c,
        meetingLocation: c.smallGroup ? meetingMap.get(c.smallGroup) || null : null,
      }));
      setCampers(enriched);
    } catch {
      setCampers([]);
    } finally {
      setLoading(false);
    }
  }, [weekend]);

  useEffect(() => { fetchCampers(); }, [fetchCampers]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogo(result);
      localStorage.setItem("badge-logo", result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogo(null);
    localStorage.removeItem("badge-logo");
  };

  const handleFontSizeChange = (size: number) => {
    setFirstNameSize(size);
    localStorage.setItem("badge-font-size", String(size));
  };

  const filtered = campers.filter(c => {
    if (groupFilter && c.largeGroup !== groupFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      if (!name.includes(term)) return false;
    }
    return true;
  });

  const toggleAll = () => {
    const filteredIds = new Set(filtered.map(c => c.id));
    const allSelected = filtered.every(c => selected.has(c.id));
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(Array.from(prev));
        filteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const toggleCamper = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openPrint = () => {
    const selectedCampers = campers.filter(c => selected.has(c.id));
    sessionStorage.setItem("badge-campers", JSON.stringify(selectedCampers));
    sessionStorage.setItem("badge-logo", logo || "");
    sessionStorage.setItem("badge-font-size", String(firstNameSize));
    window.open("/badges/print", "_blank");
  };

  const previewCamper = campers.find(c => selected.has(c.id)) || campers[0] || null;

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold text-slate-900">Name Badges</h1>

      {/* Template Designer */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="font-semibold text-slate-700">Badge Designer</h2>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Controls */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Logo</label>
              {logo ? (
                <div className="flex items-center gap-2">
                  <img src={logo} alt="Logo" className="h-8 object-contain" />
                  <button onClick={removeLogo} className="text-xs text-red-600 hover:underline">Remove</button>
                </div>
              ) : (
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                First Name Size: {firstNameSize}px
              </label>
              <input
                type="range" min={18} max={42} value={firstNameSize}
                onChange={e => handleFontSizeChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="flex-shrink-0">
            <p className="text-xs text-slate-500 mb-1">Preview (actual size)</p>
            <BadgePreview camper={previewCamper} logo={logo} firstNameSize={firstNameSize} />
          </div>
        </div>
      </div>

      {/* Filters & Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <input
          type="search"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={weekend}
            onChange={e => { setWeekend(e.target.value); setSelected(new Set()); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
          >
            {CAMP_WEEKENDS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>

          <select
            value={groupFilter}
            onChange={e => { setGroupFilter(e.target.value); setSelected(new Set()); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
          >
            <option value="">All Groups</option>
            {LARGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <button
            onClick={toggleAll}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            {selected.size === filtered.length && filtered.length > 0 ? "Deselect All" : "Select All"}
          </button>

          <span className="text-sm text-slate-500 ml-auto">
            {selected.size} selected
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading campers...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No campers found</div>
        ) : (
          <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-lg">
            {filtered.map(c => {
              const colors = BIOME_COLORS[c.largeGroup || ""];
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleCamper(c.id)}
                    className="rounded"
                  />
                  <span className="flex-1 text-sm">
                    <span className="font-medium">{c.lastName}, {c.firstName}</span>
                  </span>
                  {colors && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: colors.hexLight, color: colors.hex, border: `1px solid ${colors.hexBorder}` }}
                    >
                      {c.largeGroup}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{c.cabinName || "—"}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Print Button */}
      <button
        onClick={openPrint}
        disabled={selected.size === 0}
        className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        Print {selected.size} Badge{selected.size !== 1 ? "s" : ""}
      </button>
    </div>
  );
}

export default function BadgesPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-4 text-center text-slate-400">Loading...</div>}>
        <BadgesContent />
      </Suspense>
    </AppShell>
  );
}
