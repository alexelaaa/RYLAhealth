"use client";

import { useState, useEffect } from "react";
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
  Marine:     { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    headerBg: "bg-blue-100" },
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

  // Bus stats data
  useEffect(() => {
    if (tab !== "buses") return;
    setLoading(true);
    const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    fetch(`/api/admin/bus-stats${weekendParam}`)
      .then((r) => r.json())
      .then((data) => {
        setBusStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend, tab]);

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
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : tab === "overview" ? (
        <OverviewTab largeGroups={overviewData} />
      ) : tab === "small" ? (
        <SmallGroupsTab groups={smallGroups} />
      ) : tab === "dgls" ? (
        <DGLCabinsTab entries={dglCabins} />
      ) : (
        <BusesTab busStats={busStats} />
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
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
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
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
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
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
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

function BusesTab({ busStats }: { busStats: BusStat[] }) {
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

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-300 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">All Buses</span>
          <span className="text-sm font-bold text-slate-900">{totalAssigned} campers</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-yellow-700 font-medium">On Bus: {totalOnBus}</span>
          <span className="text-green-700 font-medium">Arrived: {totalArrived}</span>
          <span className="text-slate-500">Remaining: {totalAssigned - totalOnBus}</span>
        </div>
        <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${totalAssigned > 0 ? Math.round((totalArrived / totalAssigned) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Per-bus cards */}
      <div className="grid grid-cols-2 gap-3">
        {busStats.map((bus) => {
          const pct = bus.assigned > 0 ? Math.round((bus.arrived / bus.assigned) * 100) : 0;
          return (
            <div key={bus.busNumber} className="bg-white rounded-xl border border-slate-300 p-4">
              <p className="text-sm font-bold text-slate-900 mb-2">Bus {bus.busNumber}</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Assigned</span>
                  <span className="text-xs font-semibold text-slate-800">{bus.assigned}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-yellow-600">On Bus</span>
                  <span className="text-xs font-semibold text-yellow-700">{bus.checkedIn}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-600">Arrived</span>
                  <span className="text-xs font-semibold text-green-700">{bus.arrived}</span>
                </div>
              </div>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-right">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
