"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { BUSES, BUS_MAP_REFRESH_MS, BUS_ACTIVE_THRESHOLD_MIN, CAMP_LOCATION } from "@/lib/constants";
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

function BusMapContent() {
  const { campWeekend } = useCamp();
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [busStats, setBusStats] = useState<Map<string, BusStat>>(new Map());
  const [busComplete, setBusComplete] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [departureStats, setDepartureStats] = useState<Map<string, { checked: number; total: number }>>(new Map());

  const fetchBuses = useCallback(async () => {
    const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    try {
      const [busRes, statsRes, departureRes, ...completeResults] = await Promise.all([
        fetch("/api/bus-waypoints/latest"),
        fetch(`/api/admin/bus-stats${weekendParam}`),
        fetch(`/api/departure-checkins${weekendParam}`),
        ...["1","2","3","4","5","6"].map(n => fetch(`/api/bus-status?bus=${n}`)),
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
        for (const [busNum, stat] of statsMap) {
          depStats.set(busNum, { checked: depByBus.get(busNum) || 0, total: stat.assigned });
        }
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
                  const distMiles = haversineDistanceMiles(
                    bus.latitude, bus.longitude,
                    CAMP_LOCATION.latitude, CAMP_LOCATION.longitude
                  );
                  const eta = bus.speed != null ? estimateEtaMinutes(distMiles, bus.speed) : null;
                  const busNum = bus.bus_id.replace("bus-", "");
                  const stat = busStats.get(busNum);
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
                          {busComplete.has(busNum) && (
                            <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">Complete</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(bus.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {stat && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-medium text-green-700">{stat.checkedIn} on bus</span>
                          <span className="text-xs font-medium text-red-600">{stat.assigned - stat.checkedIn} absent</span>
                          <span className="text-xs text-slate-400">{stat.assigned} assigned</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Tracked by {bus.tracked_by}
                        {bus.speed != null && ` · ${Math.round(msToMph(bus.speed))} mph`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {distMiles.toFixed(1)} mi to camp · ETA {formatEta(eta)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {inactiveBuses.length > 0 && (
              <div className="space-y-2">
                {inactiveBuses.map((bus) => {
                  const distMiles = haversineDistanceMiles(
                    bus.latitude, bus.longitude,
                    CAMP_LOCATION.latitude, CAMP_LOCATION.longitude
                  );
                  const busNum = bus.bus_id.replace("bus-", "");
                  const stat = busStats.get(busNum);
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
                      {stat && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-medium text-slate-600">{stat.checkedIn} on bus</span>
                          <span className="text-xs font-medium text-red-500">{stat.assigned - stat.checkedIn} absent</span>
                          <span className="text-xs text-slate-400">{stat.assigned} assigned</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Tracked by {bus.tracked_by} · Inactive · {distMiles.toFixed(1)} mi to camp
                      </p>
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
                      {stat && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-medium text-slate-500">{stat.checkedIn} on bus</span>
                          <span className="text-xs font-medium text-red-500">{stat.assigned - stat.checkedIn} absent</span>
                          <span className="text-xs text-slate-400">{stat.assigned} assigned</span>
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
