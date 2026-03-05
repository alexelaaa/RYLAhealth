"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { CAMP_WEEKENDS, LARGE_GROUPS, BIOME_COLORS } from "@/lib/constants";

type BadgeType = "camper" | "dgl" | "staff" | "schedule" | "back";

interface Camper {
  id: number;
  firstName: string;
  lastName: string;
  largeGroup: string | null;
  smallGroup: string | null;
  cabinName: string | null;
  campWeekend: string | null;
  busNumber: string | null;
  meetingLocation?: string | null;
}

interface DGL {
  id: string;
  firstName: string;
  lastName: string;
  smallGroup: string;
  largeGroup: string | null;
  cabin: string | null;
  meetingLocation: string | null;
}

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  staffType: string;
  staffRole: string | null;
}

interface Sizes { firstName: number; lastName: number; smallGroup: number; largeGroup: number; info: number; logoHeight: number; lineHeight: number; }

function CamperBadgePreview({ camper, logo, sizes }: { camper: Camper | null; logo: string | null; sizes: Sizes }) {
  const c = camper || { firstName: "Jane", lastName: "Doe", largeGroup: "Arctic", smallGroup: "Polar Bears", cabinName: "Cabin 7", meetingLocation: "Lodge A", busNumber: "3" } as Camper;
  const colors = BIOME_COLORS[c.largeGroup || ""] || BIOME_COLORS.Arctic;

  return (
    <div className="rounded-lg overflow-hidden bg-white border border-slate-200" style={{ width: "4in", height: "3in" }}>
      <div className="flex flex-col items-center justify-center h-full p-3 gap-1">
        {logo && (
          <img src={logo} alt="Logo" className="object-contain" style={{ maxHeight: `${sizes.logoHeight}px`, maxWidth: "2in" }} />
        )}
        <div className="font-extrabold text-center leading-tight" style={{ fontSize: `${sizes.firstName}px`, color: colors.hex, /* no shadow */ }}>
          {c.firstName}
        </div>
        <div className="text-gray-800 text-center font-bold" style={{ fontSize: `${sizes.lastName}px` }}>
          {c.lastName}
        </div>
        <div className="w-full mt-1 text-center" style={{ lineHeight: sizes.lineHeight }}>
          <div>
            <span className="font-bold" style={{ color: colors.hex, fontSize: `${sizes.smallGroup}px` }}>{c.smallGroup || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500" style={{ fontSize: `${sizes.largeGroup}px` }}>{c.largeGroup || "—"}</span>
          </div>
          <div style={{ fontSize: `${sizes.info}px` }}>
            <span className="text-slate-400 font-semibold">Discussion Meeting Location: </span>
            <span className="font-bold text-slate-800">{c.meetingLocation || "—"}</span>
          </div>
          <div style={{ fontSize: `${sizes.info}px` }}>
            <span className="text-slate-400 font-semibold">Sleeping Cabin: </span>
            <span className="font-bold text-slate-800">{c.cabinName || "—"}</span>
          </div>
          {c.busNumber && (
            <div style={{ fontSize: `${sizes.info}px` }}>
              <span className="text-slate-400 font-semibold">Bus: </span>
              <span className="font-bold text-slate-800">{c.busNumber}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DGLBadgePreview({ dgl, logo, sizes }: { dgl: DGL | null; logo: string | null; sizes: Sizes }) {
  const d = dgl || { firstName: "John", lastName: "Smith", smallGroup: "Polar Bears", largeGroup: "Arctic", cabin: "Cabin 16C", meetingLocation: "Lodge A" } as DGL;
  const colors = BIOME_COLORS[d.largeGroup || ""] || BIOME_COLORS.Arctic;

  return (
    <div className="rounded-lg overflow-hidden bg-white border border-slate-200" style={{ width: "4in", height: "3in" }}>
      <div className="flex flex-col items-center justify-center h-full p-3 gap-1">
        {logo && (
          <img src={logo} alt="Logo" className="object-contain" style={{ maxHeight: `${sizes.logoHeight}px`, maxWidth: "2in" }} />
        )}
        <div className="text-center font-bold text-slate-500" style={{ fontSize: `${sizes.info}px`, letterSpacing: "0.1em" }}>
          DISCUSSION GROUP LEADER
        </div>
        <div className="font-extrabold text-center leading-tight" style={{ fontSize: `${sizes.firstName}px`, color: colors.hex, /* no shadow */ }}>
          {d.firstName}
        </div>
        <div className="text-gray-800 text-center font-bold" style={{ fontSize: `${sizes.lastName}px` }}>
          {d.lastName}
        </div>
        <div className="w-full mt-1 text-center" style={{ lineHeight: sizes.lineHeight }}>
          <div>
            <span className="font-bold" style={{ color: colors.hex, fontSize: `${sizes.smallGroup}px` }}>{d.smallGroup}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500" style={{ fontSize: `${sizes.largeGroup}px` }}>{d.largeGroup || "—"}</span>
          </div>
          <div style={{ fontSize: `${sizes.info}px` }}>
            <span className="text-slate-400 font-semibold">Discussion Meeting Location: </span>
            <span className="font-bold text-slate-800">{d.meetingLocation || "—"}</span>
          </div>
          <div style={{ fontSize: `${sizes.info}px` }}>
            <span className="text-slate-400 font-semibold">Sleeping Cabin: </span>
            <span className="font-bold text-slate-800">{d.cabin || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffBadgePreview({ staff, logo, sizes }: { staff: StaffMember | null; logo: string | null; sizes: Sizes }) {
  const s = staff || { firstName: "Alex", lastName: "Johnson", staffType: "alumni", staffRole: "Facilitator" } as StaffMember;
  const barLabel = s.staffType === "alumni" ? "ALUMNI" : "STAFF";

  return (
    <div className="rounded-lg overflow-hidden bg-white border border-slate-200" style={{ width: "4in", height: "3in" }}>
      <div className="flex flex-col items-center h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
          {logo && (
            <img src={logo} alt="Logo" className="object-contain" style={{ maxHeight: `${sizes.logoHeight}px`, maxWidth: "2in" }} />
          )}
          <div className="font-extrabold text-center leading-tight text-slate-900" style={{ fontSize: `${sizes.firstName}px`, /* no shadow */ }}>
            {s.firstName}
          </div>
          <div className="text-gray-800 text-center font-bold" style={{ fontSize: `${sizes.lastName}px` }}>
            {s.lastName}
          </div>
          {s.staffRole && (
            <div className="text-center font-semibold text-slate-600" style={{ fontSize: `${sizes.smallGroup}px` }}>
              {s.staffRole}
            </div>
          )}
        </div>
        <div className="w-full bg-black text-white text-center font-extrabold py-1.5" style={{ fontSize: "18px", letterSpacing: "0.15em" }}>
          {barLabel}
        </div>
      </div>
    </div>
  );
}

function BadgesContent() {
  const searchParams = useSearchParams();
  const [badgeType, setBadgeType] = useState<BadgeType>("camper");
  const [campers, setCampers] = useState<Camper[]>([]);
  const [dgls, setDgls] = useState<DGL[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [weekend, setWeekend] = useState(searchParams.get("weekend") || CAMP_WEEKENDS[0]);
  const [groupFilter, setGroupFilter] = useState("");
  const [search, setSearch] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [sizes, setSizes] = useState({ firstName: 28, lastName: 20, smallGroup: 17, largeGroup: 14, info: 15, logoHeight: 55, lineHeight: 1.7 });
  const [loading, setLoading] = useState(true);
  const [scheduleCount, setScheduleCount] = useState(6);
  const [scheduleDay, setScheduleDay] = useState<"all" | "friday" | "saturday" | "sunday" | "activities">("all");
  const [backRole, setBackRole] = useState<"camper" | "dgl" | "staff">("camper");

  useEffect(() => {
    const saved = localStorage.getItem("badge-logo");
    if (saved) setLogo(saved);
    const savedSizes = localStorage.getItem("badge-sizes");
    if (savedSizes) setSizes(JSON.parse(savedSizes));
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

      const meetingMap = new Map<string, string>();
      if (groupData.groups) {
        for (const g of groupData.groups) {
          if (g.name && g.meetingLocation) {
            meetingMap.set(g.name, g.meetingLocation);
          }
        }
      }

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

  const fetchDGLs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups?${new URLSearchParams({ weekend, type: "small" })}`);
      const data = await res.json();
      const dglList: DGL[] = [];
      if (data.groups) {
        for (const g of data.groups) {
          if (g.dglName) {
            const [firstName, ...rest] = g.dglName.split(" ");
            dglList.push({
              id: `dgl-${g.name}`,
              firstName: firstName || "",
              lastName: rest.join(" ") || "",
              smallGroup: g.name,
              largeGroup: null,
              cabin: g.dglCabin || null,
              meetingLocation: g.meetingLocation || null,
            });
          }
        }
      }
      // Enrich with large group from camper data
      const groupRes = await fetch(`/api/groups?${new URLSearchParams({ weekend, type: "overview" })}`);
      const overviewData = await groupRes.json();
      if (overviewData.largeGroups) {
        for (const lg of overviewData.largeGroups) {
          for (const sg of lg.smallGroups) {
            const dgl = dglList.find(d => d.smallGroup === sg.name);
            if (dgl) dgl.largeGroup = lg.name;
          }
        }
      }
      setDgls(dglList);
    } catch {
      setDgls([]);
    } finally {
      setLoading(false);
    }
  }, [weekend]);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/camp-staff?${new URLSearchParams({ weekend })}`);
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch {
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, [weekend]);

  useEffect(() => {
    setSelected(new Set());
    const activeType = badgeType === "back" ? backRole : badgeType;
    if (activeType === "camper") fetchCampers();
    else if (activeType === "dgl") fetchDGLs();
    else fetchStaff();
  }, [badgeType, backRole, fetchCampers, fetchDGLs, fetchStaff]);

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

  const updateSize = (key: keyof typeof sizes, val: number) => {
    setSizes(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem("badge-sizes", JSON.stringify(next));
      return next;
    });
  };

  // Build generic item list for selection
  type ListItem = { key: string; label: string; sub: string; biome: string | null };
  let items: ListItem[] = [];
  const activeListType = badgeType === "back" ? backRole : badgeType;

  if (activeListType === "camper") {
    items = campers
      .filter(c => {
        if (groupFilter && c.largeGroup !== groupFilter) return false;
        if (search) {
          const term = search.toLowerCase();
          if (!`${c.firstName} ${c.lastName}`.toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .map(c => ({ key: String(c.id), label: `${c.lastName}, ${c.firstName}`, sub: c.cabinName || "—", biome: c.largeGroup }));
  } else if (activeListType === "dgl") {
    items = dgls
      .filter(d => {
        if (groupFilter && d.largeGroup !== groupFilter) return false;
        if (search) {
          const term = search.toLowerCase();
          if (!`${d.firstName} ${d.lastName}`.toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .map(d => ({ key: d.id, label: `${d.lastName}, ${d.firstName}`, sub: d.smallGroup, biome: d.largeGroup }));
  } else {
    items = staffList
      .filter(s => {
        if (search) {
          const term = search.toLowerCase();
          if (!`${s.firstName} ${s.lastName}`.toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .map(s => ({ key: String(s.id), label: `${s.lastName}, ${s.firstName}`, sub: s.staffType === "alumni" ? "Alumni" : "Adult", biome: null }));
  }

  const toggleAll = () => {
    const keys = items.map(i => i.key);
    const allSelected = keys.every(k => selected.has(k));
    if (allSelected) {
      setSelected(prev => { const next = new Set(prev); keys.forEach(k => next.delete(k)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); keys.forEach(k => next.add(k)); return next; });
    }
  };

  const toggle = (key: string) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  const openPrint = () => {
    if (badgeType === "schedule") {
      sessionStorage.setItem("badge-campers", JSON.stringify([{ count: scheduleCount, day: scheduleDay }]));
      sessionStorage.setItem("badge-type", "schedule");
      sessionStorage.setItem("badge-logo", "");
      sessionStorage.setItem("badge-sizes", JSON.stringify(sizes));
      window.open("/badges/print", "_blank");
      return;
    }
    if (badgeType === "back") {
      // Store selected items with their backRole for QR code determination
      let selectedItems: unknown[] = [];
      if (backRole === "camper") {
        selectedItems = campers.filter(c => selected.has(String(c.id)));
      } else if (backRole === "dgl") {
        selectedItems = dgls.filter(d => selected.has(d.id));
      } else {
        selectedItems = staffList.filter(s => selected.has(String(s.id)));
      }
      sessionStorage.setItem("badge-campers", JSON.stringify(selectedItems));
      sessionStorage.setItem("badge-type", "back");
      sessionStorage.setItem("badge-back-role", backRole);
    } else if (badgeType === "camper") {
      const selectedCampers = campers.filter(c => selected.has(String(c.id)));
      sessionStorage.setItem("badge-campers", JSON.stringify(selectedCampers));
      sessionStorage.setItem("badge-type", "camper");
    } else if (badgeType === "dgl") {
      const selectedDGLs = dgls.filter(d => selected.has(d.id));
      sessionStorage.setItem("badge-campers", JSON.stringify(selectedDGLs));
      sessionStorage.setItem("badge-type", "dgl");
    } else {
      const selectedStaff = staffList.filter(s => selected.has(String(s.id)));
      sessionStorage.setItem("badge-campers", JSON.stringify(selectedStaff));
      sessionStorage.setItem("badge-type", "staff");
    }
    sessionStorage.setItem("badge-logo", logo || "");
    sessionStorage.setItem("badge-sizes", JSON.stringify(sizes));
    window.open("/badges/print", "_blank");
  };

  // Preview badge
  const previewBadge = () => {
    if (badgeType === "back") return null;
    if (badgeType === "camper") {
      const c = campers.find(c => selected.has(String(c.id))) || campers[0] || null;
      return <CamperBadgePreview camper={c} logo={logo} sizes={sizes} />;
    } else if (badgeType === "dgl") {
      const d = dgls.find(d => selected.has(d.id)) || dgls[0] || null;
      return <DGLBadgePreview dgl={d} logo={logo} sizes={sizes} />;
    } else {
      const s = staffList.find(s => selected.has(String(s.id))) || staffList[0] || null;
      return <StaffBadgePreview staff={s} logo={logo} sizes={sizes} />;
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold text-slate-900">Name Badges</h1>

      {/* Badge Type Selector */}
      <div className="flex rounded-lg border border-slate-300 overflow-hidden">
        {([
          ["camper", "Camper"],
          ["dgl", "DGL"],
          ["staff", "Staff / Alumni"],
          ["schedule", "Schedule"],
          ["back", "Badge Back"],
        ] as const).map(([type, label]) => (
          <button
            key={type}
            onClick={() => { setBadgeType(type); setSelected(new Set()); setSearch(""); setGroupFilter(""); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${badgeType === type ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {badgeType === "back" ? (
        <>
          {/* Back Role Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h2 className="font-semibold text-slate-700">Badge Back — QR Codes</h2>
            <p className="text-sm text-slate-500">
              Select a role, then pick people. Campers get the packet QR, DGLs get both, staff get the app QR.
            </p>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              {([["camper", "Campers"], ["dgl", "DGLs"], ["staff", "Staff"]] as const).map(([role, label]) => (
                <button
                  key={role}
                  onClick={() => { setBackRole(role); setSelected(new Set()); setSearch(""); setGroupFilter(""); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${backRole === role ? "bg-purple-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              ))}
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

              {backRole !== "staff" && (
                <select
                  value={groupFilter}
                  onChange={e => { setGroupFilter(e.target.value); setSelected(new Set()); }}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
                >
                  <option value="">All Groups</option>
                  {LARGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}

              <button
                onClick={toggleAll}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                {selected.size === items.length && items.length > 0 ? "Deselect All" : "Select All"}
              </button>

              <span className="text-sm text-slate-500 ml-auto">
                {selected.size} selected
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No results found.</div>
            ) : (
              <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-lg">
                {items.map(item => {
                  const colors = item.biome ? BIOME_COLORS[item.biome] : null;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(item.key)}
                        onChange={() => toggle(item.key)}
                        className="rounded"
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{item.label}</span>
                      </span>
                      {colors && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: colors.hexLight, color: colors.hex, border: `1px solid ${colors.hexBorder}` }}
                        >
                          {item.biome}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{item.sub}</span>
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
            className="w-full py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            Print {selected.size} Badge Back{selected.size !== 1 ? "s" : ""}
          </button>
        </>
      ) : badgeType === "schedule" ? (
        <>
          {/* Schedule Preview & Count */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <h2 className="font-semibold text-slate-700">Schedule Cards</h2>
            <p className="text-sm text-slate-500">
              Print one day at a time for double-sided printing, or all days at once. Cards are sideways for maximum detail.
            </p>

            {/* Day Picker */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Which cards to print</label>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                {([
                  ["all", "All"],
                  ["friday", "Fri"],
                  ["saturday", "Sat"],
                  ["sunday", "Sun"],
                  ["activities", "Activities"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setScheduleDay(key)}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${scheduleDay === key ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Number of copies: {scheduleCount}
              </label>
              <input
                type="range" min={1} max={60} value={scheduleCount}
                onChange={e => setScheduleCount(Number(e.target.value))}
                className="w-full h-1.5"
              />
              {(() => {
                const cardsPerCopy = scheduleDay === "all" ? 4 : 1;
                const totalCards = scheduleCount * cardsPerCopy;
                return (
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>1</span>
                    <span>{totalCards} cards on {Math.ceil(totalCards / 6)} page{Math.ceil(totalCards / 6) !== 1 ? "s" : ""}</span>
                    <span>60</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Print Button */}
          <button
            onClick={openPrint}
            className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Print {scheduleCount} {scheduleDay === "all" ? `Set${scheduleCount !== 1 ? "s" : ""}` : `${scheduleDay.charAt(0).toUpperCase() + scheduleDay.slice(1)} Card${scheduleCount !== 1 ? "s" : ""}`}
          </button>
        </>
      ) : (
        <>
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

                {([
                  ["logoHeight", "Logo Height", 20, 100],
                  ["firstName", "First Name", 18, 48],
                  ["lastName", "Last Name", 12, 30],
                  ["smallGroup", "Small Group / Role", 10, 24],
                  ["largeGroup", "Large Group", 8, 20],
                  ["info", "Info Lines", 10, 22],
                ] as const).map(([key, label, min, max]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-500">
                      {label}: {sizes[key]}px
                    </label>
                    <input
                      type="range" min={min} max={max} value={sizes[key]}
                      onChange={e => updateSize(key, Number(e.target.value))}
                      className="w-full h-1.5"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    Line Spacing: {sizes.lineHeight.toFixed(1)}
                  </label>
                  <input
                    type="range" min={10} max={30} step={1} value={Math.round(sizes.lineHeight * 10)}
                    onChange={e => updateSize("lineHeight", Number(e.target.value) / 10)}
                    className="w-full h-1.5"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="flex-shrink-0">
                <p className="text-xs text-slate-500 mb-1">Preview (actual size)</p>
                {previewBadge()}
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

              {activeListType !== "staff" && (
                <select
                  value={groupFilter}
                  onChange={e => { setGroupFilter(e.target.value); setSelected(new Set()); }}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
                >
                  <option value="">All Groups</option>
                  {LARGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}

              <button
                onClick={toggleAll}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                {selected.size === items.length && items.length > 0 ? "Deselect All" : "Select All"}
              </button>

              <span className="text-sm text-slate-500 ml-auto">
                {selected.size} selected
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {badgeType === "staff" ? "No staff found. Add staff in Admin > Staff." : "No results found."}
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-lg">
                {items.map(item => {
                  const colors = item.biome ? BIOME_COLORS[item.biome] : null;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(item.key)}
                        onChange={() => toggle(item.key)}
                        className="rounded"
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{item.label}</span>
                      </span>
                      {colors && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: colors.hexLight, color: colors.hex, border: `1px solid ${colors.hexBorder}` }}
                        >
                          {item.biome}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{item.sub}</span>
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
        </>
      )}
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
