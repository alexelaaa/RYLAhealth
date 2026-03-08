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
  guardian_phone: string | null;
  cell_phone: string | null;
  bus_stop: string | null;
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
  const [mode, setMode] = useState<"choose" | "arrival" | "departure">("choose");

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
      <div className="min-h-screen flex items-center justify-center bg-slate-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  if (!session) return null;

  const busNumber = extractBusNumber(session.label);

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Minimal header */}
      <header className="bg-green-800 text-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            {mode !== "choose" && (
              <button onClick={() => setMode("choose")} className="text-green-300 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-bold">{session.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            {mode !== "choose" && (
              <span className="text-xs bg-green-700 px-2 py-0.5 rounded-full">
                {mode === "arrival" ? "Arrival" : "Departure"}
              </span>
            )}
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
              className="text-xs text-green-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {mode === "choose" ? (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">What are you doing?</h2>
              <p className="text-slate-500 mt-1">Select your check-in mode</p>
            </div>

            {/* GPS notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">GPS Tracking Will Be Enabled</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    When you select a mode, your phone&apos;s location will be shared so camp admin can track your bus in real time. Please keep this page open and allow location access when prompted.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setMode("arrival")}
                className="w-full bg-green-600 text-white rounded-2xl p-6 text-left hover:bg-green-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <svg className="w-10 h-10 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <div>
                    <p className="text-xl font-bold">Arrival Check-In</p>
                    <p className="text-green-200 text-sm mt-1">Picking up campers and heading to camp</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setMode("departure")}
                className="w-full bg-purple-600 text-white rounded-2xl p-6 text-left hover:bg-purple-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <svg className="w-10 h-10 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <div>
                    <p className="text-xl font-bold">Departure Check-Out</p>
                    <p className="text-purple-200 text-sm mt-1">Loading campers onto the bus to go home</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : mode === "arrival" ? (
          <BusRiderContent
            session={session}
            busNumber={busNumber || "1"}
          />
        ) : (
          <BusDepartureContent
            session={session}
            busNumber={busNumber || "1"}
          />
        )}
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
  // All campers for this bus
  const [allCampers, setAllCampers] = useState<Camper[]>([]);
  const [checkedIn, setCheckedIn] = useState<Set<number>>(new Set());
  const [checkInLoading, setCheckInLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Search filter (filters the pre-loaded list, not an API call)
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 150);

  // Bus complete state
  const [busComplete, setBusComplete] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);

  // GPS tracker state
  const [tracking, setTracking] = useState(false);
  const [waypointCount, setWaypointCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const bufferRef = useRef<WaypointData[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const busId = `bus-${busNumber}`;
  const busLabel = BUSES.find((b) => b.id === busId)?.label || `Bus ${busNumber}`;
  const weekendParam = session.campWeekend ? `weekend=${encodeURIComponent(session.campWeekend)}` : "";

  // Fetch all campers for this bus + check-ins
  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setCheckInLoading(true);
    try {
      const [campersRes, checkInsRes] = await Promise.all([
        fetch(`/api/campers?busNumber=${busNumber}${weekendParam ? `&${weekendParam}` : ""}&limit=500&sortBy=lastName&sortOrder=asc`),
        fetch(`/api/check-ins${weekendParam ? `?${weekendParam}` : ""}`),
      ]);
      const campersData = await campersRes.json();
      const checkInsData = await checkInsRes.json();

      setAllCampers(campersData.campers || []);

      // Only track check-ins for our bus
      const busCheckIns = checkInsData.filter(
        (c: CheckedInCamper) => c.bus_number === busNumber
      );
      setCheckedIn(new Set(busCheckIns.map((c: CheckedInCamper) => c.camper_id)));
    } catch {
      // ignore
    } finally {
      setCheckInLoading(false);
    }
  }, [busNumber, weekendParam]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Auto-poll every 2 minutes for new campers / check-in changes (no loading flash)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch bus complete status
  useEffect(() => {
    fetch(`/api/bus-status?bus=${busNumber}`)
      .then((r) => r.json())
      .then((data) => setBusComplete(!!data.complete))
      .catch(() => {});
  }, [busNumber]);

  const toggleComplete = async () => {
    setCompleteLoading(true);
    try {
      const res = await fetch("/api/bus-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busNumber, complete: !busComplete }),
      });
      if (res.ok) {
        setBusComplete(!busComplete);
      }
    } catch {
      // ignore
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleCheckIn = async (camperId: number) => {
    setActionLoading(camperId);
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
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

  const handleUndo = async (camperId: number) => {
    setActionLoading(camperId);
    try {
      const res = await fetch(`/api/check-ins/${camperId}`, { method: "DELETE" });
      if (res.ok) await fetchData();
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

  // Wake lock to keep screen on while tracking
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Wake lock not supported or denied
    }
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && tracking) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [tracking]);

  // Auto-start GPS tracking + wake lock
  useEffect(() => {
    startTracking();
    requestWakeLock();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter campers by search (client-side)
  const filteredCampers = debouncedSearch.length >= 1
    ? allCampers.filter((c) => {
        const term = debouncedSearch.toLowerCase();
        return (
          c.firstName.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term)
        );
      })
    : allCampers;

  // Group campers by bus stop
  const groupedByStop = new Map<string, Camper[]>();
  for (const c of filteredCampers) {
    const stop = c.busStop || "No Stop Assigned";
    if (!groupedByStop.has(stop)) groupedByStop.set(stop, []);
    groupedByStop.get(stop)!.push(c);
  }
  // Sort stops naturally
  const sortedStops = Array.from(groupedByStop.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const checkedInCount = checkedIn.size;
  const totalCampers = allCampers.length;
  const progressPct = totalCampers > 0 ? Math.round((checkedInCount / totalCampers) * 100) : 0;
  const notCheckedIn = allCampers.filter((c) => !checkedIn.has(c.id));

  return (
    <div className="p-4 space-y-4">
      {/* GPS Status bar */}
      <div className={`rounded-xl px-4 py-3 border ${tracking ? "bg-green-50 border-green-200" : "bg-slate-200 border-slate-200"}`}>
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
            {syncing && <span className="text-xs text-green-600">Syncing...</span>}
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

      {/* Registrar contact banner */}
      <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-200">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Problem?</span> Student not on the list or other issues — contact the registrar, Jamie Webber:
        </p>
        <div className="flex gap-3 mt-2">
          <a href="tel:9097090765" className="flex-1 text-center text-sm font-bold bg-amber-200 text-amber-900 rounded-lg py-2 hover:bg-amber-300 transition-colors">
            Call (909) 709-0765
          </a>
          <a href="sms:9097090765" className="flex-1 text-center text-sm font-bold bg-amber-200 text-amber-900 rounded-lg py-2 hover:bg-amber-300 transition-colors">
            Text (909) 709-0765
          </a>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl p-4 border border-slate-300">
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
        <p className="text-xs text-slate-500 mt-1 text-right">
          {progressPct}% checked in · {notCheckedIn.length} remaining
        </p>
        <button
          onClick={toggleComplete}
          disabled={completeLoading}
          className={`w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${
            busComplete
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          {completeLoading ? "..." : busComplete ? "Check-In Complete — Tap to Reopen" : "Mark Check-In Complete"}
        </button>
      </div>

      {/* Search filter */}
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
          placeholder="Filter by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
      </div>

      {checkInLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : totalCampers === 0 ? (
        <div className="bg-white rounded-xl p-6 border border-slate-300 text-center text-sm text-slate-400">
          No campers assigned to {busLabel}.
        </div>
      ) : (
        /* Camper list grouped by bus stop */
        <div className="space-y-4">
          {sortedStops.map((stop) => {
            const campers = groupedByStop.get(stop)!;
            const stopChecked = campers.filter((c) => checkedIn.has(c.id)).length;
            return (
              <div key={stop} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Stop {stop}
                  </span>
                  <span className="text-xs text-slate-500">
                    {stopChecked}/{campers.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {campers.map((camper) => {
                    const isCheckedIn = checkedIn.has(camper.id);
                    const isLoading = actionLoading === camper.id;
                    return (
                      <div
                        key={camper.id}
                        className={`px-4 py-3 flex items-center justify-between gap-3 ${
                          isCheckedIn ? "bg-green-50" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isCheckedIn ? "text-green-800" : "text-slate-900"}`}>
                            {camper.lastName}, {camper.firstName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {camper.school && (
                              <span className="text-xs text-slate-500">{camper.school}</span>
                            )}
                            {camper.pickupTime && (
                              <span className="text-xs text-slate-400">Pickup: {camper.pickupTime}</span>
                            )}
                          </div>
                          {(camper.guardianPhone || camper.cellPhone) && (
                            <div className="flex items-center gap-2 mt-0.5">
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
                        {isCheckedIn ? (
                          <button
                            onClick={() => handleUndo(camper.id)}
                            disabled={isLoading}
                            className="px-3 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-300 transition-colors disabled:opacity-40 shrink-0"
                          >
                            {isLoading ? "..." : "Undo"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(camper.id)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-40 shrink-0"
                          >
                            {isLoading ? "..." : "CHECK IN"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BusDepartureContent({
  session,
  busNumber,
}: {
  session: SessionData;
  busNumber: string;
}) {
  const [allCampers, setAllCampers] = useState<Camper[]>([]);
  const [checkedOut, setCheckedOut] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 150);

  // GPS tracker state
  const [tracking, setTracking] = useState(false);
  const [waypointCount, setWaypointCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const bufferRef = useRef<WaypointData[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const busId = `bus-${busNumber}`;
  const busLabel = BUSES.find((b) => b.id === busId)?.label || `Bus ${busNumber}`;
  const weekendParam = session.campWeekend ? `weekend=${encodeURIComponent(session.campWeekend)}` : "";

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [campersRes, departureRes] = await Promise.all([
        fetch(`/api/campers?busNumber=${busNumber}${weekendParam ? `&${weekendParam}` : ""}&limit=500&sortBy=lastName&sortOrder=asc`),
        fetch(`/api/departure-checkins${weekendParam ? `?${weekendParam}` : ""}`),
      ]);
      const campersData = await campersRes.json();
      const departureData = await departureRes.json();

      const active = (campersData.campers || []).filter(
        (c: Camper) => !c.noShow && !c.sentHome
      );
      setAllCampers(active);
      setCheckedOut(new Set(
        departureData
          .filter((d: { bus_number: string | null }) => d.bus_number === busNumber)
          .map((d: { camper_id: number }) => d.camper_id)
      ));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [busNumber, weekendParam]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCheckOut = async (camperId: number) => {
    setActionLoading(camperId);
    try {
      const res = await fetch("/api/departure-checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId, campWeekend: session.campWeekend }),
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

  // GPS tracking functions
  const DEP_STORAGE_KEY = "ryla-bus-departure-queue";

  function loadDepQueue(): WaypointData[] {
    try {
      const raw = localStorage.getItem(DEP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveDepQueue(queue: WaypointData[]) {
    localStorage.setItem(DEP_STORAGE_KEY, JSON.stringify(queue));
  }

  const flushWaypoints = useCallback(async () => {
    const toSend = [...loadDepQueue(), ...bufferRef.current];
    bufferRef.current = [];
    saveDepQueue([]);

    if (toSend.length === 0) return;
    if (!navigator.onLine) {
      saveDepQueue(toSend);
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
        saveDepQueue(toSend);
      }
    } catch {
      saveDepQueue(toSend);
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

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Wake lock not supported or denied
    }
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && tracking) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [tracking]);

  // Auto-start GPS tracking + wake lock
  useEffect(() => {
    startTracking();
    requestWakeLock();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = debouncedSearch.length >= 1
    ? allCampers.filter((c) => {
        const term = debouncedSearch.toLowerCase();
        return c.firstName.toLowerCase().includes(term) || c.lastName.toLowerCase().includes(term);
      })
    : allCampers;

  // Group by bus stop
  const groupedByStop = new Map<string, Camper[]>();
  for (const c of filtered) {
    const stop = c.busStop || "No Stop Assigned";
    if (!groupedByStop.has(stop)) groupedByStop.set(stop, []);
    groupedByStop.get(stop)!.push(c);
  }
  const sortedStops = Array.from(groupedByStop.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const checkedOutCount = allCampers.filter((c) => checkedOut.has(c.id)).length;
  const totalCampers = allCampers.length;
  const progressPct = totalCampers > 0 ? Math.round((checkedOutCount / totalCampers) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* GPS Status bar */}
      <div className={`rounded-xl px-4 py-3 border ${tracking ? "bg-purple-50 border-purple-200" : "bg-slate-200 border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tracking ? (
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            ) : (
              <span className="w-2 h-2 bg-slate-300 rounded-full" />
            )}
            <span className="text-sm font-medium text-slate-700">
              GPS {tracking ? "Active" : "Stopped"}
            </span>
            {waypointCount > 0 && (
              <span className="text-xs text-slate-400">({waypointCount} pts)</span>
            )}
            {syncing && <span className="text-xs text-purple-600">Syncing...</span>}
            {lastSync && !syncing && (
              <span className="text-xs text-slate-400">Synced {lastSync}</span>
            )}
          </div>
          <button
            onClick={tracking ? stopTracking : startTracking}
            className={`text-xs font-medium px-3 py-1 rounded-lg ${
              tracking
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
          >
            {tracking ? "Stop" : "Start"}
          </button>
        </div>
        {gpsError && <p className="text-xs text-red-600 mt-1">{gpsError}</p>}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl p-4 border border-slate-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">{busLabel} Departure</span>
          <span className="text-sm font-bold text-purple-600">{checkedOutCount} / {totalCampers}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4">
          <div
            className="bg-purple-500 h-4 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1 text-right">
          {checkedOutCount} on bus · {totalCampers - checkedOutCount} remaining
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
          placeholder="Filter by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      ) : totalCampers === 0 ? (
        <div className="bg-white rounded-xl p-6 border border-slate-300 text-center text-sm text-slate-400">
          No campers assigned to {busLabel}.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedStops.map((stop) => {
            const campers = groupedByStop.get(stop)!;
            const stopChecked = campers.filter((c) => checkedOut.has(c.id)).length;
            return (
              <div key={stop} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Stop {stop}</span>
                  <span className="text-xs text-slate-500">{stopChecked}/{campers.length}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {campers.map((camper) => {
                    const isOut = checkedOut.has(camper.id);
                    const isLoading = actionLoading === camper.id;
                    return (
                      <div
                        key={camper.id}
                        className={`px-4 py-3 flex items-center justify-between gap-3 ${isOut ? "bg-purple-50" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isOut ? "text-purple-800" : "text-slate-900"}`}>
                            {camper.lastName}, {camper.firstName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {camper.school && (
                              <span className="text-xs text-slate-500">{camper.school}</span>
                            )}
                            {camper.dropoffTime && (
                              <span className="text-xs text-slate-400">Drop-off: {camper.dropoffTime}</span>
                            )}
                          </div>
                          {camper.guardianPhone && (
                            <a href={`tel:${camper.guardianPhone}`} className="text-xs text-purple-700 underline mt-0.5 block">
                              Parent: {camper.guardianPhone}
                            </a>
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
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors disabled:opacity-40 shrink-0"
                          >
                            {isLoading ? "..." : "ON BUS"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
