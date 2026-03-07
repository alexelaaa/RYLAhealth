"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { useDebounce } from "@/hooks/useDebounce";
import { cacheGet, cacheSet } from "@/lib/offline-cache";
import type { Camper } from "@/types";

interface CheckedInCamper {
  camper_id: number;
  first_name: string;
  last_name: string;
  checked_in_at: string;
  checked_in_by: string;
  camp_arrived_at: string | null;
  camp_arrived_by: string | null;
  bus_number: string | null;
  cabin_number: string | null;
  cabin_name: string | null;
  guardian_phone: string | null;
  cell_phone: string | null;
  bus_stop: string | null;
}

export default function CheckInPage() {
  return (
    <AppShell>
      <CheckInContent />
    </AppShell>
  );
}

function CheckInContent() {
  const { campWeekend, session } = useCamp();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Camper[]>([]);
  const [checkedInMap, setCheckedInMap] = useState<Map<number, CheckedInCamper>>(new Map());
  const [checkedInList, setCheckedInList] = useState<CheckedInCamper[]>([]);
  const [totalCampers, setTotalCampers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 200);

  const fetchCheckIns = useCallback(async () => {
    setLoading(true);
    const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    const cacheKey = `checkin-data-${campWeekend || "all"}`;
    try {
      const [checkInsRes, campersRes] = await Promise.all([
        fetch(`/api/check-ins${weekendParam}`),
        fetch(`/api/campers?${campWeekend ? `weekend=${encodeURIComponent(campWeekend)}&` : ""}limit=0`),
      ]);
      const checkInsData: CheckedInCamper[] = await checkInsRes.json();
      const campersData = await campersRes.json();

      setCheckedInList(checkInsData);
      const map = new Map<number, CheckedInCamper>();
      for (const ci of checkInsData) {
        map.set(ci.camper_id, ci);
      }
      setCheckedInMap(map);
      setTotalCampers(campersData.total);
      // Cache for offline
      cacheSet(cacheKey, { checkIns: checkInsData, total: campersData.total });
    } catch {
      // Offline — try cached data
      const cached = await cacheGet<{ checkIns: CheckedInCamper[]; total: number }>(cacheKey);
      if (cached) {
        setCheckedInList(cached.checkIns);
        const map = new Map<number, CheckedInCamper>();
        for (const ci of cached.checkIns) map.set(ci.camper_id, ci);
        setCheckedInMap(map);
        setTotalCampers(cached.total);
      }
    } finally {
      setLoading(false);
    }
  }, [campWeekend]);

  const fetchLockState = useCallback(async () => {
    if (!campWeekend) { setLocked(false); return; }
    try {
      const res = await fetch(`/api/check-ins/lock?weekend=${encodeURIComponent(campWeekend)}`);
      const data = await res.json();
      setLocked(data.locked);
    } catch {
      // ignore
    }
  }, [campWeekend]);

  const toggleLock = async () => {
    if (!campWeekend) return;
    setLockLoading(true);
    try {
      const res = await fetch("/api/check-ins/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekend: campWeekend }),
      });
      const data = await res.json();
      setLocked(data.locked);
    } catch {
      // ignore
    } finally {
      setLockLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckIns();
    fetchLockState();
    const interval = setInterval(() => { fetchCheckIns(); fetchLockState(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchCheckIns, fetchLockState]);

  // Search for campers
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      const params = new URLSearchParams({ search: debouncedSearch });
      if (campWeekend) params.set("weekend", campWeekend);
      params.set("limit", "20");

      fetch(`/api/campers?${params}`)
        .then((r) => r.json())
        .then((data) => setSearchResults(data.campers))
        .catch(() => {});
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, campWeekend]);

  const isLocked = locked && session?.role !== "admin";

  // Check in (create record — for walk-ins or bus riders not yet checked in)
  const handleCheckIn = async (camperId: number) => {
    if (isLocked) return;
    setActionLoading(camperId);
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId }),
      });
      if (res.ok) {
        await fetchCheckIns();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  // Confirm camp arrival (PATCH)
  const handleConfirmArrival = async (camperId: number) => {
    if (isLocked) return;
    setActionLoading(camperId);
    try {
      const res = await fetch("/api/check-ins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId }),
      });
      if (res.ok) {
        await fetchCheckIns();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  // Undo (delete entire check-in record)
  const handleUndo = async (camperId: number) => {
    if (isLocked) return;
    setActionLoading(camperId);
    try {
      const res = await fetch(`/api/check-ins/${camperId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCheckIns();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const onBusCount = checkedInList.length;
  const arrivedCount = checkedInList.filter((ci) => ci.camp_arrived_at).length;
  const awaitingArrival = checkedInList.filter((ci) => !ci.camp_arrived_at).sort((a, b) => a.last_name.localeCompare(b.last_name));
  const arrived = checkedInList.filter((ci) => ci.camp_arrived_at).sort((a, b) => a.last_name.localeCompare(b.last_name));
  const progressPct = onBusCount > 0 ? Math.round((arrivedCount / onBusCount) * 100) : 0;

  const getStatus = (camperId: number): "not_checked_in" | "on_bus" | "arrived" => {
    const ci = checkedInMap.get(camperId);
    if (!ci) return "not_checked_in";
    if (ci.camp_arrived_at) return "arrived";
    return "on_bus";
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Camp Arrival</h1>
        {session?.role === "admin" && campWeekend && (
          <button
            onClick={toggleLock}
            disabled={lockLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              locked
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {locked ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              )}
            </svg>
            {lockLoading ? "..." : locked ? "Unlock" : "Lock"}
          </button>
        )}
      </div>

      {locked && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Check-in is locked. {session?.role === "admin" ? "Tap unlock to re-enable." : "Contact an admin to unlock."}
        </div>
      )}

      {!campWeekend && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          Select a weekend from the top bar to filter campers.
        </div>
      )}

      {/* Progress */}
      <div className="bg-white rounded-xl p-4 border border-slate-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Arrivals</span>
          <span className="text-sm font-bold text-green-600">{arrivedCount} / {onBusCount} on bus</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4">
          <div
            className="bg-green-500 h-4 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 text-right">
          {arrivedCount} arrived · {onBusCount - arrivedCount} awaiting · {totalCampers - onBusCount} not on bus
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
          autoFocus
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((camper) => {
            const status = getStatus(camper.id);
            const isLoading = actionLoading === camper.id;

            return (
              <div
                key={camper.id}
                className={`rounded-xl p-4 border transition-colors ${
                  status === "arrived"
                    ? "bg-green-50 border-green-200"
                    : status === "on_bus"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-white border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {camper.lastName}, {camper.firstName}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {camper.busNumber && (
                        <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                          Bus {camper.busNumber}
                        </span>
                      )}
                      {(camper.cabinName || camper.cabinNumber) && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {camper.cabinName || `Cabin ${camper.cabinNumber}`}
                        </span>
                      )}
                      {camper.busStop && (
                        <span className="text-xs text-slate-400">{camper.busStop}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {camper.school && (
                        <span className="text-xs text-slate-500">{camper.school}</span>
                      )}
                      {camper.smallGroup && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {camper.smallGroup}
                        </span>
                      )}
                    </div>
                    {(camper.guardianPhone || camper.cellPhone) && (
                      <div className="flex items-center gap-2 mt-1">
                        {camper.guardianPhone && (
                          <a
                            href={`tel:${camper.guardianPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-green-700 underline"
                          >
                            Parent: {camper.guardianPhone}
                          </a>
                        )}
                        {camper.cellPhone && (
                          <a
                            href={`tel:${camper.cellPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-green-700 underline"
                          >
                            Camper: {camper.cellPhone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  {status === "arrived" ? (
                    <button
                      onClick={() => handleUndo(camper.id)}
                      disabled={isLoading || isLocked}
                      className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-300 transition-colors disabled:opacity-40"
                    >
                      {isLoading ? "..." : "Undo"}
                    </button>
                  ) : status === "on_bus" ? (
                    <button
                      onClick={() => handleConfirmArrival(camper.id)}
                      disabled={isLoading || isLocked}
                      className="px-4 py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors disabled:opacity-40"
                    >
                      {isLoading ? "..." : "CONFIRM ARRIVAL"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckIn(camper.id)}
                      disabled={isLoading || isLocked}
                      className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-40"
                    >
                      {isLoading ? "..." : "CHECK IN"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No search active: show Awaiting Arrival + Arrived */}
      {searchResults.length === 0 && !search && !loading && (
        <>
          {/* Awaiting Arrival */}
          <div>
            <h2 className="text-sm font-semibold text-yellow-700 mb-2">
              Awaiting Arrival ({awaitingArrival.length})
            </h2>
            {awaitingArrival.length === 0 ? (
              <div className="bg-white rounded-xl p-4 border border-slate-300 text-center text-sm text-slate-400">
                No campers awaiting arrival.
              </div>
            ) : (
              <div className="space-y-2">
                {awaitingArrival.map((ci) => (
                  <div
                    key={ci.camper_id}
                    className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {ci.last_name}, {ci.first_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {ci.bus_number && (
                          <span className="text-xs text-green-700">Bus {ci.bus_number}</span>
                        )}
                        {ci.bus_stop && (
                          <span className="text-xs text-slate-500">{ci.bus_stop}</span>
                        )}
                        <span className="text-xs text-slate-400">
                          on bus {new Date(ci.checked_in_at).toLocaleTimeString()}
                        </span>
                        <span className="text-xs text-slate-400">by {ci.checked_in_by}</span>
                      </div>
                      {(ci.guardian_phone || ci.cell_phone) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {ci.guardian_phone && (
                            <a href={`tel:${ci.guardian_phone}`} className="text-xs text-green-700 underline">
                              Parent: {ci.guardian_phone}
                            </a>
                          )}
                          {ci.cell_phone && (
                            <a href={`tel:${ci.cell_phone}`} className="text-xs text-green-700 underline">
                              Camper: {ci.cell_phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleConfirmArrival(ci.camper_id)}
                      disabled={actionLoading === ci.camper_id || isLocked}
                      className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition-colors disabled:opacity-40 shrink-0"
                    >
                      {actionLoading === ci.camper_id ? "..." : "ARRIVED"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Arrived */}
          <div>
            <h2 className="text-sm font-semibold text-green-700 mb-2">
              Arrived ({arrived.length})
            </h2>
            {arrived.length === 0 ? (
              <div className="bg-white rounded-xl p-4 border border-slate-300 text-center text-sm text-slate-400">
                No arrivals yet. Confirm camper arrivals above or search to check in walk-ins.
              </div>
            ) : (
              <div className="space-y-2">
                {arrived.slice(0, 20).map((ci) => (
                  <div
                    key={ci.camper_id}
                    className="bg-green-50 rounded-xl p-3 border border-green-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {ci.last_name}, {ci.first_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {ci.bus_number && (
                          <span className="text-xs text-green-700">Bus {ci.bus_number}</span>
                        )}
                        {ci.bus_stop && (
                          <span className="text-xs text-slate-500">{ci.bus_stop}</span>
                        )}
                        <span className="text-xs text-slate-400">
                          arrived {new Date(ci.camp_arrived_at!).toLocaleTimeString()}
                        </span>
                        <span className="text-xs text-slate-400">by {ci.camp_arrived_by}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUndo(ci.camper_id)}
                      disabled={actionLoading === ci.camper_id || isLocked}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors"
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      )}
    </div>
  );
}
