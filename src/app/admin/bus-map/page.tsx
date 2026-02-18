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

function BusMapContent() {
  useCamp();
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const fetchBuses = useCallback(async () => {
    try {
      const res = await fetch("/api/bus-waypoints/latest");
      if (res.ok) {
        const data = await res.json();
        setBuses(data);
        setLastRefresh(new Date().toLocaleTimeString());
      }
    } catch {
      // Silently fail — will retry
    } finally {
      setLoading(false);
    }
  }, []);

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
              <div className="w-full h-full bg-slate-50 flex items-center justify-center">
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
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(bus.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
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
                  return (
                    <div
                      key={bus.bus_id}
                      className="bg-slate-50 rounded-xl p-3 border border-slate-100"
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
                {neverReportedBuses.map((bus) => (
                  <div
                    key={bus.id}
                    className="bg-white rounded-xl p-3 border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-slate-200 rounded-full" />
                      <span className="text-sm text-slate-400">{bus.label}</span>
                      <span className="text-xs text-slate-300">No data</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
