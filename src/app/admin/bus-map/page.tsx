"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { BUSES, BUS_STOPS, BUS_MAP_REFRESH_MS, BUS_ACTIVE_THRESHOLD_MIN, CAMP_LOCATION } from "@/lib/constants";
import { msToMph, haversineDistanceMiles, estimateEtaMinutes, formatEta } from "@/lib/geo-utils";
import type { BusLocation } from "@/components/bus-map/BusMapView";

const BusMapView = dynamic(() => import("@/components/bus-map/BusMapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-slate-100 rounded-xl flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
    </div>
  ),
});

export default function BusMapPage() {
  return (
    <AppShell>
      <BusMapContent />
    </AppShell>
  );
}

function isActive(timestamp: string): boolean {
  const diff = Date.now() - new Date(timestamp).getTime();
  return diff < BUS_ACTIVE_THRESHOLD_MIN * 60 * 1000;
}

interface BusStat {
  busNumber: string;
  assigned: number;
  checkedIn: number;
  arrived: number;
}

/** Get bus stops sorted by return time (earliest drop-off first for departure) */
function getStopsForBus(busNum: string) {
  return BUS_STOPS
    .filter((s) => s.busNumber === busNum)
    .sort((a, b) => a.returnTime.localeCompare(b.returnTime));
}

function BusMapContent() {
  const { campWeekend } = useCamp();
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [busStats, setBusStats] = useState<Map<string, BusStat>>(new Map());
  const [busComplete, setBusComplete] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [departureStats, setDepartureStats] = useState<Map<string, { checked: number; total: number }>>(new Map());
  const [mode, setMode] = useState<"arrival" | "departure">("arrival");

  const fetchBuses = useCallback(async () => {
    const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    try {
      const [busRes, statsRes, departureRes, ...completeResults] = await Promise.all([
        fetch("/api/bus-waypoints/latest"),
        fetch(`/api/admin/bus-stats${weekendParam}`),
        fetch(`/api/departure-checkins${weekendParam}`),
        ...["1","2","3","4","5"].map(n => fetch(`/api/bus-status?bus=${n}`)),
      ]);
      if (busRes.ok) {
        const data = await busRes.json();
        setBuses(data);
        setLastRefresh(new Date().toLocaleTimeString());
      }
      let statsMap = new Map<string, BusStat>();
      if (statsRes.ok) {
        const stats: BusStat[] = await statsRes.json();
        statsMap = new Map<string, BusStat>();
        for (const s of stats) statsMap.set(s.busNumber, s);
        setBusStats(statsMap);
      }
      // Process departure stats
      if (departureRes.ok) {
        const depData = await departureRes.json();
        const depByBus = new Map<string, number>();
        for (const d of depData as { bus_number: string | null }[]) {
          if (d.bus_number) {
            depByBus.set(d.bus_number, (depByBus.get(d.bus_number) || 0) + 1);
          }
        }
        const depStats = new Map<string, { checked: number; total: number }>();
        statsMap.forEach((stat, busNum) => {
          depStats.set(busNum, { checked: depByBus.get(busNum) || 0, total: stat.assigned });
        });
        setDepartureStats(depStats);
      }

      const completeSet = new Set<string>();
      for (let i = 0; i < completeResults.length; i++) {
        try {
          const data = await completeResults[i].json();
          if (data.complete) completeSet.add(String(i + 1));
        } catch { /* ignore */ }
      }
      setBusComplete(completeSet);
    } catch {
      // Silently fail — will retry
    } finally {
      setLoading(false);
    }
  }, [campWeekend]);

  useEffect(() => {
    fetchBuses();
    const interval = setInterval(fetchBuses, BUS_MAP_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchBuses]);

  const activeBuses = buses.filter((b) => isActive(b.timestamp));
  const inactiveBuses = buses.filter((b) => !isActive(b.timestamp));
  const trackingBusIds = new Set(buses.map((b) => b.bus_id));
  const neverReportedBuses = BUSES.filter((b) => !trackingBusIds.has(b.id));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Bus Map</h1>
        {lastRefresh && (
          <span className="text-xs text-slate-400">Updated {lastRefresh}</span>
        )}
      </div>

      {/* Arrival / Departure toggle */}
      <div className="flex rounded-xl overflow-hidden border border-slate-300">
        <button
          onClick={() => setMode("arrival")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === "arrival" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Arrival
        </button>
        <button
          onClick={() => setMode("departure")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === "departure" ? "bg-green-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Departure
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : (
        <>
          {/* Map */}
          <div className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-200">
            {buses.length > 0 ? (
              <BusMapView buses={buses} />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                <p className="text-sm text-slate-400">
                  No bus locations reported yet. Staff must start tracking on their devices.
                </p>
              </div>
            )}
          </div>

          {/* Bus list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Bus Status</h2>

            {activeBuses.length > 0 && (
              <div className="space-y-2">
                {activeBuses.map((bus) => {
                  const busNum = bus.bus_id.replace("bus-", "");
                  const stat = busStats.get(busNum);
                  const dep = departureStats.get(busNum);
                  const stops = getStopsForBus(busNum);
                  const distCamp = haversineDistanceMiles(
                    bus.latitude, bus.longitude,
                    CAMP_LOCATION.latitude, CAMP_LOCATION.longitude
                  );
                  const etaCamp = bus.speed != null ? estimateEtaMinutes(distCamp, bus.speed) : null;
                  return (
                    <div
                      key={bus.bus_id}
                      className="bg-green-50 rounded-xl p-3 border border-green-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium text-slate-900">
                            {bus.bus_label}
                          </span>
                          {mode === "arrival" && busComplete.has(busNum) && (
                            <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">Complete</span>
                          )}
                          {mode === "departure" && dep && dep.checked === dep.total && dep.total > 0 && (
                            <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">All Off</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(bus.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {mode === "arrival" && stat && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-medium text-green-700">{stat.checkedIn} on bus</span>
                          <span className="text-xs font-medium text-red-600">{stat.assigned - stat.checkedIn} absent</span>
                          <span className="text-xs text-slate-400">{stat.assigned} assigned</span>
                        </div>
                      )}
                      {mode === "departure" && dep && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-medium text-green-700">{dep.checked} checked out</span>
                          <span className="text-xs font-medium text-red-600">{dep.total - dep.checked} remaining</span>
                          <span className="text-xs text-slate-400">{dep.total} total</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Tracked by {bus.tracked_by}
                        {bus.speed != null && ` · ${Math.round(msToMph(bus.speed))} mph`}
                      </p>
                      {mode === "arrival" ? (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {distCamp.toFixed(1)} mi to camp · ETA {formatEta(etaCamp)}
                        </p>
                      ) : (
                        <div className="mt-1.5 space-y-1">
                          {stops.map((stop) => {
                            const dist = haversineDistanceMiles(
                              bus.latitude, bus.longitude,
                              stop.latitude, stop.longitude
                            );
                            const eta = bus.speed != null ? estimateEtaMinutes(dist, bus.speed) : null;
                            return (
                              <div key={`${stop.busNumber}${stop.stop || ""}`} className="flex items-center justify-between bg-white/60 rounded-lg px-2 py-1">
                                <span className="text-xs text-slate-700">
                                  {stop.stop ? `Stop ${stop.stop}: ` : ""}{stop.location}
                                  <span className="text-slate-400 ml-1">({stop.name})</span>
                                </span>
                                <span className="text-xs font-medium text-slate-600 whitespace-nowrap ml-2">
                                  {dist.toFixed(1)} mi · {formatEta(eta)}
                                </span>
                              </div>
                            );
                          })}
                          {stops.length > 0 && stops[0].returnTime && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Expected return: {stops.map((s) => `${s.stop ? s.stop + " " : ""}${s.returnTime}`).join(" · ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {inactiveBuses.length > 0 && (
              <div className="space-y-2">
                {inactiveBuses.map((bus) => {
                  const busNum = bus.bus_id.replace("bus-", "");
                  const stat = busStats.get(busNum);
                  const dep = departureStats.get(busNum);
                  const stops = getStopsForBus(busNum);
                  const distCamp = haversineDistanceMiles(
                    bus.latitude, bus.longitude,
                    CAMP_LOCATION.latitude, CAMP_LOCATION.longitude
                  );
                  return (
                    <div
                      key={bus.bus_id}
                      className="bg-slate-100 rounded-xl p-3 border border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-slate-300 rounded-full" />
                          <span className="text-sm font-medium text-slate-500">
                            {bus.bus_label}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Last: {new Date(bus.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {mode === "arrival" && stat && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-medium text-slate-600">{stat.checkedIn} on bus</span>
                          <span className="text-xs font-medium text-red-500">{stat.assigned - stat.checkedIn} absent</span>
                          <span className="text-xs text-slate-400">{stat.assigned} assigned</span>
                        </div>
                      )}
                      {mode === "departure" && dep && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-medium text-slate-600">{dep.checked} checked out</span>
                          <span className="text-xs font-medium text-red-500">{dep.total - dep.checked} remaining</span>
                          <span className="text-xs text-slate-400">{dep.total} total</span>
                        </div>
                      )}
                      {mode === "arrival" ? (
                        <p className="text-xs text-slate-400 mt-1">
                          Tracked by {bus.tracked_by} · Inactive · {distCamp.toFixed(1)} mi to camp
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400 mt-1">
                            Tracked by {bus.tracked_by} · Inactive
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {stops.map((stop) => {
                              const dist = haversineDistanceMiles(
                                bus.latitude, bus.longitude,
                                stop.latitude, stop.longitude
                              );
                              return (
                                <p key={`${stop.busNumber}${stop.stop || ""}`} className="text-xs text-slate-400">
                                  {stop.stop ? `Stop ${stop.stop}: ` : ""}{stop.location} — {dist.toFixed(1)} mi (return {stop.returnTime})
                                </p>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {neverReportedBuses.length > 0 && (
              <div className="space-y-2">
                {neverReportedBuses.map((bus) => {
                  const busNum = bus.id.replace("bus-", "");
                  const stat = busStats.get(busNum);
                  const dep = departureStats.get(busNum);
                  return (
                    <div
                      key={bus.id}
                      className="bg-white rounded-xl p-3 border border-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-slate-200 rounded-full" />
                        <span className="text-sm text-slate-400">{bus.label}</span>
                        <span className="text-xs text-slate-300">No data</span>
                      </div>
                      {mode === "arrival" && stat && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-medium text-slate-500">{stat.checkedIn} on bus</span>
                          <span className="text-xs font-medium text-red-500">{stat.assigned - stat.checkedIn} absent</span>
                          <span className="text-xs text-slate-400">{stat.assigned} assigned</span>
                        </div>
                      )}
                      {mode === "departure" && dep && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-medium text-slate-500">{dep.checked} checked out</span>
                          <span className="text-xs font-medium text-red-500">{dep.total - dep.checked} remaining</span>
                          <span className="text-xs text-slate-400">{dep.total} total</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Departure Progress */}
          {departureStats.size > 0 && (() => {
            const totalChecked = Array.from(departureStats.values()).reduce((s, d) => s + d.checked, 0);
            const totalAssigned = Array.from(departureStats.values()).reduce((s, d) => s + d.total, 0);
            const overallPct = totalAssigned > 0 ? Math.round((totalChecked / totalAssigned) * 100) : 0;
            return (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-700">Departure Progress</h2>
                <div className="bg-white rounded-xl p-4 border border-slate-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Overall</span>
                    <span className="text-sm font-bold text-green-600">{totalChecked} / {totalAssigned}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(departureStats.entries())
                    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                    .map(([busNum, dep]) => {
                      const pct = dep.total > 0 ? Math.round((dep.checked / dep.total) * 100) : 0;
                      const allDone = dep.checked === dep.total && dep.total > 0;
                      return (
                        <div key={busNum} className={`rounded-xl p-3 border ${allDone ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-700">Bus {busNum}</span>
                            <span className={`text-xs font-medium ${allDone ? "text-green-600" : "text-slate-500"}`}>
                              {dep.checked}/{dep.total}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${allDone ? "bg-green-500" : "bg-green-400"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {allDone && (
                            <span className="text-[10px] text-green-600 font-medium mt-1 block">Complete</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
