"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { BUSES, BUS_TRACKER_INTERVAL_MS } from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

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

const STORAGE_KEY_BUS = "ryla-bus-tracker-bus";
const STORAGE_KEY_QUEUE = "ryla-bus-tracker-queue";

export default function BusTrackerPage() {
  return (
    <AppShell>
      <BusTrackerContent />
    </AppShell>
  );
}

function BusTrackerContent() {
  const [selectedBus, setSelectedBus] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_BUS) || "";
    }
    return "";
  });
  const [tracking, setTracking] = useState(false);
  const [waypointCount, setWaypointCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const bufferRef = useRef<WaypointData[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track online status
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Persist bus selection
  useEffect(() => {
    if (selectedBus) {
      localStorage.setItem(STORAGE_KEY_BUS, selectedBus);
    }
  }, [selectedBus]);

  // Load queued count
  useEffect(() => {
    const queued = loadQueue();
    setQueuedCount(queued.length);
  }, []);

  // Flush when coming back online
  useEffect(() => {
    if (online) {
      flushWaypoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

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
    setQueuedCount(queue.length);
  }

  const flushWaypoints = useCallback(async () => {
    // Grab buffer + any queued offline waypoints
    const toSend = [...loadQueue(), ...bufferRef.current];
    bufferRef.current = [];
    saveQueue([]);

    if (toSend.length === 0) return;

    if (!navigator.onLine) {
      // Can't send, put everything back in queue
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
        // Failed — re-queue
        saveQueue(toSend);
      }
    } catch {
      // Network error — re-queue
      saveQueue(toSend);
    } finally {
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTracking() {
    if (!selectedBus) {
      setError("Please select a bus first");
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    setError(null);
    setTracking(true);
    setWaypointCount(0);

    const busInfo = BUSES.find((b) => b.id === selectedBus);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const wp: WaypointData = {
          busId: selectedBus,
          busLabel: busInfo?.label || selectedBus,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
          clientId: uuidv4(),
          timestamp: new Date().toISOString(),
        };

        bufferRef.current.push(wp);
        setWaypointCount((c) => c + 1);
        setLastAccuracy(position.coords.accuracy ?? null);
        setLastPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        setError(`GPS Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    // Flush buffer every interval
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

    // Final flush
    flushWaypoints();
    setTracking(false);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Bus GPS Tracker</h1>

      {tracking && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-yellow-800">
            Keep this page open while tracking. GPS will stop if you navigate away.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Bus selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Select Bus
        </label>
        <select
          value={selectedBus}
          onChange={(e) => setSelectedBus(e.target.value)}
          disabled={tracking}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="">Choose a bus...</option>
          {BUSES.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.label}
            </option>
          ))}
        </select>
      </div>

      {/* Start/Stop button */}
      <button
        onClick={tracking ? stopTracking : startTracking}
        disabled={!selectedBus && !tracking}
        className={`w-full py-4 rounded-xl text-lg font-semibold transition-colors ${
          tracking
            ? "bg-red-500 text-white hover:bg-red-600 active:bg-red-700"
            : "bg-green-500 text-white hover:bg-green-600 active:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400"
        }`}
      >
        {tracking ? "Stop Tracking" : "Start Tracking"}
      </button>

      {/* Status panel */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-500">Status</span>
          <span className={`text-sm font-medium ${tracking ? "text-green-600" : "text-slate-400"}`}>
            {tracking ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Tracking
              </span>
            ) : (
              "Stopped"
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-500">Waypoints</span>
          <span className="text-sm font-medium text-slate-900">{waypointCount}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-500">Last Sync</span>
          <span className="text-sm font-medium text-slate-900">
            {syncing ? "Syncing..." : lastSync || "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-500">GPS Accuracy</span>
          <span className="text-sm font-medium text-slate-900">
            {lastAccuracy != null ? `±${Math.round(lastAccuracy)}m` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-500">Position</span>
          <span className="text-sm font-medium text-slate-900 font-mono">
            {lastPosition
              ? `${lastPosition.lat.toFixed(5)}, ${lastPosition.lng.toFixed(5)}`
              : "—"}
          </span>
        </div>
        {queuedCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-500">Queued (offline)</span>
            <span className="text-sm font-medium text-amber-600">{queuedCount}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-500">Network</span>
          <span className={`text-sm font-medium ${online ? "text-green-600" : "text-red-600"}`}>
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}
