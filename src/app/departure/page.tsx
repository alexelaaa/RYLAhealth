"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { useDebounce } from "@/hooks/useDebounce";
import type { Camper } from "@/types";

interface DepartureRecord {
  camper_id: number;
  checked_by: string;
  checked_at: string;
  first_name: string;
  last_name: string;
  bus_number: string | null;
  bus_stop: string | null;
}

export default function DeparturePage() {
  return (
    <AppShell>
      <DepartureContent />
    </AppShell>
  );
}

function DepartureContent() {
  const { campWeekend, session } = useCamp();
  const [campers, setCampers] = useState<Camper[]>([]);
  const [checkedOut, setCheckedOut] = useState<Set<number>>(new Set());
  const [departureList, setDepartureList] = useState<DepartureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [expandedBus, setExpandedBus] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 200);

  const fetchData = useCallback(async () => {
    const weekendParam = campWeekend ? `weekend=${encodeURIComponent(campWeekend)}` : "";
    try {
      const [campersRes, departureRes] = await Promise.all([
        fetch(`/api/campers?${weekendParam}&limit=500&sortBy=lastName&sortOrder=asc`),
        fetch(`/api/departure-checkins${weekendParam ? `?${weekendParam}` : ""}`),
      ]);
      const campersData = await campersRes.json();
      const departureData: DepartureRecord[] = await departureRes.json();

      // Filter out no-shows and sent-home
      const activeCampers = (campersData.campers || []).filter(
        (c: Camper) => !c.noShow && !c.sentHome
      );
      setCampers(activeCampers);
      setDepartureList(departureData);
      setCheckedOut(new Set(departureData.map((d) => d.camper_id)));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [campWeekend]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCheckOut = async (camperId: number) => {
    setActionLoading(camperId);
    try {
      const res = await fetch("/api/departure-checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId, campWeekend }),
      });
      if (res.ok) await fetchData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndo = async (camperId: number) => {
    setActionLoading(camperId);
    try {
      const res = await fetch("/api/departure-checkins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId }),
      });
      if (res.ok) await fetchData();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  // Filter by search
  const filtered = debouncedSearch.length >= 2
    ? campers.filter((c) => {
        const term = debouncedSearch.toLowerCase();
        return c.firstName.toLowerCase().includes(term) || c.lastName.toLowerCase().includes(term);
      })
    : campers;

  // Group by bus number
  const busCampers = new Map<string, Camper[]>();
  for (const c of filtered) {
    const bus = c.busNumber || "No Bus";
    if (!busCampers.has(bus)) busCampers.set(bus, []);
    busCampers.get(bus)!.push(c);
  }
  const sortedBuses = Array.from(busCampers.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const totalCampers = campers.filter((c) => c.busNumber).length;
  const totalCheckedOut = campers.filter((c) => c.busNumber && checkedOut.has(c.id)).length;
  const progressPct = totalCampers > 0 ? Math.round((totalCheckedOut / totalCampers) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Departure Check-Out</h1>

      {!campWeekend && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          Select a weekend from the top bar to filter campers.
        </div>
      )}

      {/* Overall progress */}
      <div className="bg-white rounded-xl p-4 border border-slate-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Departure Progress</span>
          <span className="text-sm font-bold text-green-600">{totalCheckedOut} / {totalCampers}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4">
          <div
            className="bg-green-500 h-4 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 text-right">
          {totalCheckedOut} on bus · {totalCampers - totalCheckedOut} remaining
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          placeholder="Search camper by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBuses.map((busNum) => {
            const busList = busCampers.get(busNum)!;
            const busChecked = busList.filter((c) => checkedOut.has(c.id)).length;
            const isExpanded = expandedBus === busNum || debouncedSearch.length >= 2;
            const allDone = busChecked === busList.length;

            return (
              <div key={busNum} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                <button
                  onClick={() => setExpandedBus(expandedBus === busNum ? null : busNum)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${allDone ? "text-green-700" : "text-slate-800"}`}>
                      Bus {busNum}
                    </span>
                    {allDone && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Complete
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${allDone ? "text-green-600" : "text-slate-500"}`}>
                      {busChecked}/{busList.length}
                    </span>
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
                  <div className="divide-y divide-slate-100">
                    {/* Per-bus progress bar */}
                    <div className="px-4 py-2 bg-slate-50">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${busList.length > 0 ? Math.round((busChecked / busList.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                    {busList.map((camper) => {
                      const isOut = checkedOut.has(camper.id);
                      const isLoading = actionLoading === camper.id;
                      return (
                        <div
                          key={camper.id}
                          className={`px-4 py-3 flex items-center justify-between gap-3 ${isOut ? "bg-green-50" : ""}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isOut ? "text-green-800" : "text-slate-900"}`}>
                              {camper.lastName}, {camper.firstName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {camper.busStop && (
                                <span className="text-xs text-slate-500">Stop: {camper.busStop}</span>
                              )}
                              {camper.dropoffTime && (
                                <span className="text-xs text-slate-400">Drop-off: {camper.dropoffTime}</span>
                              )}
                              {camper.cabinName && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                  {camper.cabinName}
                                </span>
                              )}
                              {camper.smallGroup && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                  {camper.smallGroup}
                                </span>
                              )}
                            </div>
                            {(camper.guardianPhone || camper.cellPhone) && (
                              <div className="flex items-center gap-2 mt-0.5">
                                {camper.guardianPhone && (
                                  <a href={`tel:${camper.guardianPhone}`} className="text-xs text-green-700 underline">
                                    Parent: {camper.guardianPhone}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          {isOut ? (
                            <button
                              onClick={() => handleUndo(camper.id)}
                              disabled={isLoading}
                              className="px-3 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-300 transition-colors disabled:opacity-40 shrink-0"
                            >
                              {isLoading ? "..." : "Undo"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCheckOut(camper.id)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-40 shrink-0"
                            >
                              {isLoading ? "..." : "ON BUS"}
                            </button>
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
      )}
    </div>
  );
}
