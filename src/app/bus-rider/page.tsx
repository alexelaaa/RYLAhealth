"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BUSES, BUS_TRACKER_INTERVAL_MS } from "@/lib/constants";
import { extractBusNumber } from "@/lib/bus-utils";
import { useDebounce } from "@/hooks/useDebounce";
import { v4 as uuidv4 } from "uuid";
import type { SessionData, Camper } from "@/types";

interface CheckedInCamper {
  camper_id: number;
  first_name: string;
  last_name: string;
  checked_in_at: string;
  checked_in_by: string;
  bus_number: string | null;
}

interface WaypointData {
  busId: string;
  busLabel: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  campWeekend?: string;
  clientId: string;
  timestamp: string;
}

const STORAGE_KEY_QUEUE = "ryla-bus-rider-queue";

export default function BusRiderPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.isLoggedIn) {
          router.push("/login");
        } else {
          setSession(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) return null;

  const busNumber = extractBusNumber(session.label);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Minimal header */}
      <header className="bg-blue-700 text-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold">{session.label}</h1>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
            className="text-xs text-blue-200 hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        <BusRiderContent
          session={session}
          busNumber={busNumber || "1"}
        />
      </main>
    </div>
  );
}

function BusRiderContent({
  session,
  busNumber,
}: {
  session: SessionData;
  busNumber: string;
}) {
  // Check-in state
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Camper[]>([]);
  const [checkedIn, setCheckedIn] = useState<Set<number>>(new Set());
  const [checkedInList, setCheckedInList] = useState<CheckedInCamper[]>([]);
  const [totalCampers, setTotalCampers] = useState(0);
  const [checkInLoading, setCheckInLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // GPS tracker state
  const [tracking, setTracking] = useState(false);
  const [waypointCount, setWaypointCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const bufferRef = useRef<WaypointData[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearch = useDebounce(search, 200);

  const busId = `bus-${busNumber}`;
  const busLabel = BUSES.find((b) => b.id === busId)?.label || `Bus ${busNumber}`;
  const weekendParam = session.campWeekend ? `weekend=${encodeURIComponent(session.campWeekend)}` : "";

  // Fetch check-ins for this bus
  const fetchCheckIns = useCallback(async () => {
    setCheckInLoading(true);
    try {
      const [checkInsRes, campersRes] = await Promise.all([
        fetch(`/api/check-ins${weekendParam ? `?${weekendParam}` : ""}`),
        fetch(`/api/campers?busNumber=${busNumber}${weekendParam ? `&${weekendParam}` : ""}&limit=0`),
      ]);
      const checkInsData = await checkInsRes.json();
      const campersData = await campersRes.json();

      // Only show check-ins for our bus
      const busCheckIns = checkInsData.filter(
        (c: CheckedInCamper) => c.bus_number === busNumber
      );
      setCheckedInList(busCheckIns);
      setCheckedIn(new Set(busCheckIns.map((c: CheckedInCamper) => c.camper_id)));
      setTotalCampers(campersData.total);
    } catch {
      // ignore
    } finally {
      setCheckInLoading(false);
    }
  }, [busNumber, weekendParam]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  // Search for campers on this bus
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      const params = new URLSearchParams({
        search: debouncedSearch,
        busNumber,
        limit: "20",
      });
      if (session.campWeekend) params.set("weekend", session.campWeekend);

      fetch(`/api/campers?${params}`)
        .then((r) => r.json())
        .then((data) => setSearchResults(data.campers))
        .catch(() => {});
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, busNumber, session.campWeekend]);

  const handleCheckIn = async (camperId: number) => {
    setActionLoading(camperId);
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId }),
      });
      if (res.ok) await fetchCheckIns();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndo = async (camperId: number) => {
    setActionLoading(camperId);
    try {
      const res = await fetch(`/api/check-ins/${camperId}`, { method: "DELETE" });
      if (res.ok) await fetchCheckIns();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  // GPS tracking functions
  function loadQueue(): WaypointData[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveQueue(queue: WaypointData[]) {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  }

  const flushWaypoints = useCallback(async () => {
    const toSend = [...loadQueue(), ...bufferRef.current];
    bufferRef.current = [];
    saveQueue([]);

    if (toSend.length === 0) return;
    if (!navigator.onLine) {
      saveQueue(toSend);
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch("/api/bus-waypoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waypoints: toSend }),
      });
      if (res.ok) {
        setLastSync(new Date().toLocaleTimeString());
      } else {
        saveQueue(toSend);
      }
    } catch {
      saveQueue(toSend);
    } finally {
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTracking() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported");
      return;
    }
    setGpsError(null);
    setTracking(true);
    setWaypointCount(0);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const wp: WaypointData = {
          busId,
          busLabel,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
          campWeekend: session.campWeekend || undefined,
          clientId: uuidv4(),
          timestamp: new Date().toISOString(),
        };
        bufferRef.current.push(wp);
        setWaypointCount((c) => c + 1);
      },
      (err) => setGpsError(`GPS Error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    flushIntervalRef.current = setInterval(flushWaypoints, BUS_TRACKER_INTERVAL_MS);
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    flushWaypoints();
    setTracking(false);
  }

  // Auto-start GPS tracking
  useEffect(() => {
    startTracking();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkedInCount = checkedIn.size;
  const progressPct = totalCampers > 0 ? Math.round((checkedInCount / totalCampers) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* GPS Status bar */}
      <div className={`rounded-xl px-4 py-3 border ${tracking ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tracking ? (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ) : (
              <span className="w-2 h-2 bg-slate-300 rounded-full" />
            )}
            <span className="text-sm font-medium text-slate-700">
              GPS {tracking ? "Active" : "Stopped"}
            </span>
            {waypointCount > 0 && (
              <span className="text-xs text-slate-400">({waypointCount} pts)</span>
            )}
            {syncing && <span className="text-xs text-blue-500">Syncing...</span>}
            {lastSync && !syncing && (
              <span className="text-xs text-slate-400">Synced {lastSync}</span>
            )}
          </div>
          <button
            onClick={tracking ? stopTracking : startTracking}
            className={`text-xs font-medium px-3 py-1 rounded-lg ${
              tracking
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {tracking ? "Stop" : "Start"}
          </button>
        </div>
        {gpsError && <p className="text-xs text-red-600 mt-1">{gpsError}</p>}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">{busLabel} Check-In</span>
          <span className="text-sm font-bold text-green-600">{checkedInCount} / {totalCampers}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4">
          <div
            className="bg-green-500 h-4 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 text-right">{progressPct}% checked in</p>
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
          className="w-full pl-10 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((camper) => {
            const isCheckedIn = checkedIn.has(camper.id);
            const isLoading = actionLoading === camper.id;
            return (
              <div
                key={camper.id}
                className={`rounded-xl p-4 border transition-colors ${
                  isCheckedIn
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {camper.lastName}, {camper.firstName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {camper.cabinNumber && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          Cabin {camper.cabinNumber}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{camper.school}</span>
                    </div>
                  </div>
                  {isCheckedIn ? (
                    <button
                      onClick={() => handleUndo(camper.id)}
                      disabled={isLoading}
                      className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-300 transition-colors disabled:opacity-40"
                    >
                      {isLoading ? "..." : "Undo"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckIn(camper.id)}
                      disabled={isLoading}
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

      {/* No search: show recent check-ins */}
      {searchResults.length === 0 && !search && !checkInLoading && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Recent Check-Ins ({checkedInCount})
          </h2>
          {checkedInList.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-slate-100 text-center text-sm text-slate-400">
              No check-ins yet. Search for a camper above.
            </div>
          ) : (
            <div className="space-y-2">
              {checkedInList.slice(0, 30).map((ci) => (
                <div
                  key={ci.camper_id}
                  className="bg-green-50 rounded-xl p-3 border border-green-100 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {ci.last_name}, {ci.first_name}
                    </p>
                    <span className="text-xs text-slate-400">
                      {new Date(ci.checked_in_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUndo(ci.camper_id)}
                    disabled={actionLoading === ci.camper_id}
                    className="text-xs text-slate-500 hover:text-red-600 transition-colors"
                  >
                    Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {checkInLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
}
