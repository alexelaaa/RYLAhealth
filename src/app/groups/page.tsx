"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";

// --- Types ---

interface OverviewCamper {
  id: number;
  firstName: string;
  lastName: string;
  gender: string | null;
  cabinName: string | null;
}

interface OverviewSmallGroup {
  name: string;
  count: number;
  dglName: string | null;
  dglCabin: string | null;
  dglGender: string | null;
  meetingLocation: string | null;
  campers: OverviewCamper[];
}

interface OverviewLargeGroup {
  name: string;
  count: number;
  smallGroups: OverviewSmallGroup[];
}

interface FlatGroup {
  name: string;
  count: number;
  smallGroups?: string[];
  meetingLocation?: string | null;
  dglName?: string | null;
  dglCabin?: string | null;
  dglGender?: string | null;
  campers: { id: number; firstName: string; lastName: string }[];
}

interface DGLCabinStudent {
  id: number;
  firstName: string;
  lastName: string;
  gender: string | null;
  cabinName: string | null;
  smallGroup: string | null;
}

interface BusStat {
  busNumber: string;
  assigned: number;
  checkedIn: number;
  arrived: number;
}

interface BusCamper {
  id: number;
  firstName: string;
  lastName: string;
  busStop: string | null;
  school: string | null;
  guardianPhone: string | null;
  cellPhone: string | null;
  role: string;
  noShow: boolean;
  checkedIn: boolean;
  arrived: boolean;
}

interface DGLCabinEntry {
  dglName: string | null;
  dglCabin: string | null;
  dglGender: string | null;
  smallGroup: string;
  largeGroup: string | null;
  studentCount: number;
  students: DGLCabinStudent[];
}

// --- Biome colors ---

const biomeColors: Record<string, { bg: string; text: string; border: string; headerBg: string }> = {
  Arctic:     { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",    headerBg: "bg-cyan-100" },
  Desert:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   headerBg: "bg-amber-100" },
  Grasslands: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", headerBg: "bg-emerald-100" },
  Jungle:     { bg: "bg-lime-50",    text: "text-lime-700",    border: "border-lime-200",    headerBg: "bg-lime-100" },
  Marine:     { bg: "bg-green-50",    text: "text-green-800",    border: "border-green-300",    headerBg: "bg-green-200" },
};

const defaultColors = { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", headerBg: "bg-slate-100" };

function getBiomeColors(name: string) {
  return biomeColors[name] || defaultColors;
}

// --- Page ---

export default function GroupsPage() {
  return (
    <AppShell>
      <GroupsContent />
    </AppShell>
  );
}

type Tab = "overview" | "small" | "dgls" | "buses";

function GroupsContent() {
  const { campWeekend } = useCamp();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "overview";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [overviewData, setOverviewData] = useState<OverviewLargeGroup[]>([]);
  const [smallGroups, setSmallGroups] = useState<FlatGroup[]>([]);
  const [dglCabins, setDglCabins] = useState<DGLCabinEntry[]>([]);
  const [busStats, setBusStats] = useState<BusStat[]>([]);
  const [busCampers, setBusCampers] = useState<Record<string, BusCamper[]>>({});
  const [loading, setLoading] = useState(true);

  // Overview data
  useEffect(() => {
    if (tab !== "overview") return;
    setLoading(true);
    const params = new URLSearchParams({ type: "overview" });
    if (campWeekend) params.set("weekend", campWeekend);

    fetch(`/api/groups?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setOverviewData(data.largeGroups || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend, tab]);

  // Small groups data
  useEffect(() => {
    if (tab !== "small") return;
    setLoading(true);
    const params = new URLSearchParams({ type: "small" });
    if (campWeekend) params.set("weekend", campWeekend);

    fetch(`/api/groups?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSmallGroups(data.groups || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend, tab]);

  // DGL cabins data
  useEffect(() => {
    if (tab !== "dgls") return;
    setLoading(true);
    const params = new URLSearchParams({ type: "dgl-cabins" });
    if (campWeekend) params.set("weekend", campWeekend);

    fetch(`/api/groups?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDglCabins(data.dglCabins || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend, tab]);

  // Bus stats data (with auto-refresh)
  const fetchBusData = useCallback((showLoading = false) => {
    const params = new URLSearchParams({ detail: "campers" });
    if (campWeekend) params.set("weekend", campWeekend);
    if (showLoading) setLoading(true);
    fetch(`/api/admin/bus-stats?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setBusStats(data.stats || []);
        setBusCampers(data.campersByBus || {});
        if (showLoading) setLoading(false);
      })
      .catch(() => { if (showLoading) setLoading(false); });
  }, [campWeekend]);

  useEffect(() => {
    if (tab !== "buses") return;
    fetchBusData(true);
    const interval = setInterval(() => fetchBusData(), 30000);
    return () => clearInterval(interval);
  }, [fetchBusData, tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "small", label: "Small Groups" },
    { key: "dgls", label: "DGL Cabins" },
    { key: "buses", label: "Buses" },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Groups</h1>

      {/* Tab switcher */}
      <div className="flex border-b border-slate-200 -mx-4 px-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-green-700 text-green-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : tab === "overview" ? (
        <OverviewTab largeGroups={overviewData} />
      ) : tab === "small" ? (
        <SmallGroupsTab groups={smallGroups} />
      ) : tab === "dgls" ? (
        <DGLCabinsTab entries={dglCabins} />
      ) : (
        <BusesTab busStats={busStats} campersByBus={busCampers} onRefresh={() => fetchBusData()} />
      )}
    </div>
  );
}

// --- Overview Tab ---

function OverviewTab({ largeGroups }: { largeGroups: OverviewLargeGroup[] }) {
  const [expandedLarge, setExpandedLarge] = useState<Set<string>>(
    () => new Set(largeGroups.map((lg) => lg.name))
  );
  const [expandedSmall, setExpandedSmall] = useState<Set<string>>(new Set());

  if (largeGroups.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-300 text-center text-sm text-slate-400">
        No group assignments yet
      </div>
    );
  }

  const toggleLarge = (name: string) => {
    setExpandedLarge((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSmall = (name: string) => {
    setExpandedSmall((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {largeGroups.map((lg) => {
        const colors = getBiomeColors(lg.name);
        const isExpanded = expandedLarge.has(lg.name);

        return (
          <div key={lg.name} className={`rounded-xl border ${colors.border} overflow-hidden`}>
            {/* Large group header */}
            <button
              onClick={() => toggleLarge(lg.name)}
              className={`w-full px-4 py-3 flex items-center justify-between ${colors.headerBg} transition-colors`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${colors.text}`}>{lg.name}</span>
                <span className={`text-xs ${colors.bg} ${colors.text} px-2 py-0.5 rounded-full border ${colors.border}`}>
                  {lg.count} campers
                </span>
                <span className="text-xs text-slate-400">
                  {lg.smallGroups.length} groups
                </span>
              </div>
              <svg
                className={`w-4 h-4 ${colors.text} transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Small groups */}
            {isExpanded && (
              <div className={`${colors.bg} px-3 py-2 space-y-2`}>
                {lg.smallGroups.map((sg) => {
                  const sgExpanded = expandedSmall.has(sg.name);
                  return (
                    <div key={sg.name} className="bg-white rounded-lg border border-slate-300 overflow-hidden">
                      <button
                        onClick={() => toggleSmall(sg.name)}
                        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-slate-900">{sg.name}</span>
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                              {sg.count}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {sg.dglName && (
                              <span className="text-xs text-slate-500">
                                DGL: {sg.dglName}
                              </span>
                            )}
                            {sg.meetingLocation && (
                              <span className="text-xs text-slate-400">
                                · Meeting Location: {sg.meetingLocation}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${sgExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {sgExpanded && (
                        <div className="border-t border-slate-300 px-3 py-1 divide-y divide-slate-50">
                          {sg.campers.map((c) => (
                            <Link
                              key={c.id}
                              href={`/campers/${c.id}`}
                              className="flex items-center justify-between py-2 hover:bg-slate-100 -mx-3 px-3 transition-colors"
                            >
                              <span className="text-sm text-slate-700">
                                {c.firstName} {c.lastName}
                              </span>
                              {c.cabinName && (
                                <span className="text-xs text-slate-400">{c.cabinName}</span>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Small Groups Tab ---

function SmallGroupsTab({ groups }: { groups: FlatGroup[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-300 text-center text-sm text-slate-400">
        No group assignments yet
      </div>
    );
  }

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isExpanded = expanded.has(group.name);
        return (
          <div key={group.name} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
            <button
              onClick={() => toggleExpand(group.name)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-slate-900">{group.name}</span>
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                    {group.count}
                  </span>
                </div>
                {(group.dglName || group.dglCabin || group.meetingLocation) && (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {group.dglName && (
                      <span className="text-xs text-slate-500">DGL: {group.dglName}</span>
                    )}
                    {group.dglCabin && (
                      <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">
                        Sleeps: {group.dglCabin}
                      </span>
                    )}
                    {group.meetingLocation && (
                      <span className="text-xs text-slate-400">Meets: {group.meetingLocation}</span>
                    )}
                  </div>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isExpanded && (
              <div className="border-t border-slate-300 px-4 py-2 divide-y divide-slate-50">
                {group.campers.map((c) => (
                  <Link
                    key={c.id}
                    href={`/campers/${c.id}`}
                    className="block py-2 hover:bg-slate-100 -mx-4 px-4 transition-colors"
                  >
                    <span className="text-sm text-slate-700">
                      {c.firstName} {c.lastName}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- DGL Cabins Tab ---

function DGLCabinsTab({ entries }: { entries: DGLCabinEntry[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-300 text-center text-sm text-slate-400">
        No DGL data available
      </div>
    );
  }

  const toggleExpand = (cabin: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cabin)) next.delete(cabin);
      else next.add(cabin);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {entries.map((d) => {
        const key = `${d.dglCabin}-${d.smallGroup}`;
        const isExpanded = expanded.has(key);

        return (
          <div key={key} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
            <button
              onClick={() => toggleExpand(key)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded font-medium">
                    {d.dglCabin}
                  </span>
                  <span className="font-medium text-sm text-slate-900">{d.dglName}</span>
                  <span className="text-xs text-slate-400">({d.dglGender})</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">Group: {d.smallGroup}</span>
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                    {d.studentCount} student{d.studentCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && d.students.length > 0 && (
              <div className="border-t border-slate-300 px-4 py-1 divide-y divide-slate-50">
                {d.students.map((s) => (
                  <Link
                    key={s.id}
                    href={`/campers/${s.id}`}
                    className="flex items-center justify-between py-2 hover:bg-slate-100 -mx-4 px-4 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">
                        {s.firstName} {s.lastName}
                      </span>
                      {s.smallGroup && (
                        <span className="text-xs text-slate-400">{s.smallGroup}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{s.cabinName}</span>
                  </Link>
                ))}
              </div>
            )}

            {isExpanded && d.students.length === 0 && (
              <div className="border-t border-slate-300 px-4 py-3 text-xs text-slate-400">
                No students assigned to this cabin
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Buses Tab ---

type BusFilter = "not_on_bus" | "on_bus" | "arrived" | "all";

function BusesTab({ busStats, campersByBus, onRefresh }: { busStats: BusStat[]; campersByBus: Record<string, BusCamper[]>; onRefresh: () => void }) {
  const [expandedBus, setExpandedBus] = useState<string | null>(null);
  const [filter, setFilter] = useState<BusFilter>("not_on_bus");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const toggleNoShow = async (camperId: number, currentlyNoShow: boolean) => {
    setActionLoading(camperId);
    try {
      await fetch(`/api/campers/${camperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noShow: currentlyNoShow ? 0 : 1 }),
      });
      onRefresh();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  if (busStats.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-300 text-center text-sm text-slate-400">
        No bus assignments yet
      </div>
    );
  }

  const totalAssigned = busStats.reduce((s, b) => s + b.assigned, 0);
  const totalOnBus = busStats.reduce((s, b) => s + b.checkedIn, 0);
  const totalArrived = busStats.reduce((s, b) => s + b.arrived, 0);
  const totalNotOnBus = totalAssigned - totalOnBus;

  const filterCampers = (campers: BusCamper[]): BusCamper[] => {
    switch (filter) {
      case "not_on_bus": return campers.filter((c) => !c.checkedIn);
      case "on_bus": return campers.filter((c) => c.checkedIn && !c.arrived);
      case "arrived": return campers.filter((c) => c.arrived);
      default: return campers;
    }
  };

  const filterLabels: { key: BusFilter; label: string }[] = [
    { key: "not_on_bus", label: "Not On Bus" },
    { key: "on_bus", label: "On Bus" },
    { key: "arrived", label: "Arrived" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-300 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">All Buses</span>
          <span className="text-sm font-bold text-slate-900">{totalAssigned} campers</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-red-700 font-medium">Not On Bus: {totalNotOnBus}</span>
          <span className="text-yellow-700 font-medium">On Bus: {totalOnBus}</span>
          <span className="text-green-700 font-medium">Arrived: {totalArrived}</span>
        </div>
        <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${totalAssigned > 0 ? Math.round((totalOnBus / totalAssigned) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex rounded-lg overflow-hidden border border-slate-200">
        {filterLabels.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-green-700 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Per-bus cards */}
      <div className="space-y-3">
        {busStats.map((bus) => {
          const isExpanded = expandedBus === bus.busNumber;
          const campers = campersByBus[bus.busNumber] || [];
          const filtered = filterCampers(campers);
          const notOnBus = campers.filter((c) => !c.checkedIn).length;
          const pct = bus.assigned > 0 ? Math.round((bus.checkedIn / bus.assigned) * 100) : 0;

          return (
            <div key={bus.busNumber} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
              <button
                onClick={() => setExpandedBus(isExpanded ? null : bus.busNumber)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">Bus {bus.busNumber}</span>
                  <div className="flex items-center gap-2">
                    {notOnBus > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {notOnBus} missing
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{bus.checkedIn}/{bus.assigned}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-200">
                  {/* Stats row */}
                  <div className="px-4 py-2 bg-slate-50 flex items-center gap-4 text-xs">
                    <span className="text-slate-500">Assigned: <span className="font-semibold text-slate-800">{bus.assigned}</span></span>
                    <span className="text-red-600">Not On Bus: <span className="font-semibold">{notOnBus}</span></span>
                    <span className="text-yellow-600">On Bus: <span className="font-semibold">{bus.checkedIn - bus.arrived}</span></span>
                    <span className="text-green-600">Arrived: <span className="font-semibold">{bus.arrived}</span></span>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-slate-400">
                      No campers match this filter
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filtered.map((c) => (
                        <div
                          key={c.id}
                          className={`flex items-center justify-between px-4 py-2.5 ${
                            c.noShow ? "bg-slate-50 opacity-60" : ""
                          }`}
                        >
                          <Link href={`/campers/${c.id}`} className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${c.noShow ? "line-through text-slate-500" : "text-slate-900"}`}>
                                {c.lastName}, {c.firstName}
                              </span>
                              {c.role === "Alternate" && (
                                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                                  ALT
                                </span>
                              )}
                              {c.noShow && (
                                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                                  NO SHOW
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {c.busStop && (
                                <span className="text-xs text-slate-500">Stop: {c.busStop}</span>
                              )}
                              {c.school && (
                                <span className="text-xs text-slate-400">{c.school}</span>
                              )}
                            </div>
                            {!c.checkedIn && (c.guardianPhone || c.cellPhone) && (
                              <div className="flex items-center gap-2 mt-0.5">
                                {c.guardianPhone && (
                                  <span
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${c.guardianPhone}`; }}
                                    className="text-xs text-green-700 underline cursor-pointer"
                                  >
                                    Parent: {c.guardianPhone}
                                  </span>
                                )}
                                {c.cellPhone && (
                                  <span
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${c.cellPhone}`; }}
                                    className="text-xs text-green-700 underline cursor-pointer"
                                  >
                                    Camper: {c.cellPhone}
                                  </span>
                                )}
                              </div>
                            )}
                          </Link>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {c.arrived ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                Arrived
                              </span>
                            ) : c.checkedIn ? (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                                On Bus
                              </span>
                            ) : !c.noShow ? (
                              <button
                                onClick={() => toggleNoShow(c.id, false)}
                                disabled={actionLoading === c.id}
                                className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
                              >
                                {actionLoading === c.id ? "..." : "No Show"}
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleNoShow(c.id, true)}
                                disabled={actionLoading === c.id}
                                className="text-xs bg-slate-200 text-slate-600 px-2.5 py-1 rounded-lg font-medium hover:bg-slate-300 transition-colors disabled:opacity-40"
                              >
                                {actionLoading === c.id ? "..." : "Undo"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
