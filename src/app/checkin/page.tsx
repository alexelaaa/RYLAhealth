"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { useDebounce } from "@/hooks/useDebounce";
import type { Camper } from "@/types";

interface CheckedInCamper {
  camper_id: number;
  first_name: string;
  last_name: string;
  checked_in_at: string;
  checked_in_by: string;
  bus_number: string | null;
  cabin_number: string | null;
}

export default function CheckInPage() {
  return (
    <AppShell>
      <CheckInContent />
    </AppShell>
  );
}

function CheckInContent() {
  const { campWeekend } = useCamp();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Camper[]>([]);
  const [checkedIn, setCheckedIn] = useState<Set<number>>(new Set());
  const [checkedInList, setCheckedInList] = useState<CheckedInCamper[]>([]);
  const [totalCampers, setTotalCampers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 200);

  const fetchCheckIns = useCallback(async () => {
    setLoading(true);
    const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    try {
      const [checkInsRes, campersRes] = await Promise.all([
        fetch(`/api/check-ins${weekendParam}`),
        fetch(`/api/campers?${campWeekend ? `weekend=${encodeURIComponent(campWeekend)}&` : ""}limit=0`),
      ]);
      const checkInsData = await checkInsRes.json();
      const campersData = await campersRes.json();

      setCheckedInList(checkInsData);
      setCheckedIn(new Set(checkInsData.map((c: CheckedInCamper) => c.camper_id)));
      setTotalCampers(campersData.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [campWeekend]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

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

  const handleCheckIn = async (camperId: number) => {
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

  const handleUndo = async (camperId: number) => {
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

  const checkedInCount = checkedIn.size;
  const progressPct = totalCampers > 0 ? Math.round((checkedInCount / totalCampers) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Bus Check-In</h1>

      {!campWeekend && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          Select a weekend from the top bar to filter campers.
        </div>
      )}

      {/* Progress */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Progress</span>
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
                      {camper.busNumber && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Bus {camper.busNumber}
                        </span>
                      )}
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

      {/* No search active: show recent check-ins */}
      {searchResults.length === 0 && !search && !loading && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Recent Check-Ins ({checkedInCount})
          </h2>
          {checkedInList.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-slate-100 text-center text-sm text-slate-400">
              No check-ins yet. Search for a camper above to check them in.
            </div>
          ) : (
            <div className="space-y-2">
              {checkedInList.slice(0, 20).map((ci) => (
                <div
                  key={ci.camper_id}
                  className="bg-green-50 rounded-xl p-3 border border-green-100 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {ci.last_name}, {ci.first_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {ci.bus_number && (
                        <span className="text-xs text-blue-600">Bus {ci.bus_number}</span>
                      )}
                      <span className="text-xs text-slate-400">
                        {new Date(ci.checked_in_at).toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-slate-400">by {ci.checked_in_by}</span>
                    </div>
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

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
}
