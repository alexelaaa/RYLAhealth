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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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

  const fetchBuses = useCallback(async () => {
    const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    try {
      const [busRes, statsRes, ...completeResults] = await Promise.all([
        fetch("/api/bus-waypoints/latest"),
        fetch(`/api/admin/bus-stats${weekendParam}`),
        ...["1","2","3","4","5","6"].map(n => fetch(`/api/bus-status?bus=${n}`)),
      ]);
      if (busRes.ok) {
        const data = await busRes.json();
        setBuses(data);
        setLastRefresh(new Date().toLocaleTimeString());
      }
      if (statsRes.ok) {
        const stats: BusStat[] = await statsRes.json();
        const map = new Map<string, BusStat>();
        for (const s of stats) map.set(s.busNumber, s);
        setBusStats(map);
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
        </>
      )}
    </div>
  );
}
