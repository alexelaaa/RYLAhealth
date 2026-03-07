"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";

interface CabinSummary {
  dglName: string;
  dglCabin: string;
  smallGroup: string;
  totalCampers: number;
  arrivalPresent: number;
  fridayPresent: number;
  saturdayPresent: number;
  arrivalComplete: boolean;
  fridayComplete: boolean;
  saturdayComplete: boolean;
  campers: {
    id: number;
    firstName: string;
    lastName: string;
    arrival: boolean;
    friday: boolean;
    saturday: boolean;
  }[];
}

type Night = "arrival" | "friday" | "saturday";

function CabinCheckinsDashboard() {
  const { campWeekend } = useCamp();
  const [cabins, setCabins] = useState<CabinSummary[]>([]);
  const [night, setNight] = useState<Night>("arrival");
  const [expandedCabin, setExpandedCabin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
      const res = await fetch(`/api/cabin-checkins/summary${params}`);
      const data = await res.json();
      setCabins(data.cabins || []);
    } catch {
      // Network error
    }
    setLoading(false);
  }, [campWeekend]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const getPresent = (cabin: CabinSummary) => {
    if (night === "arrival") return cabin.arrivalPresent;
    if (night === "friday") return cabin.fridayPresent;
    return cabin.saturdayPresent;
  };

  const getComplete = (cabin: CabinSummary) => {
    if (night === "arrival") return cabin.arrivalComplete;
    if (night === "friday") return cabin.fridayComplete;
    return cabin.saturdayComplete;
  };

  const getStatus = (cabin: CabinSummary) => {
    if (getComplete(cabin)) return "complete";
    if (getPresent(cabin) > 0) return "in-progress";
    return "not-started";
  };

  const completeCabins = cabins.filter((c) => getStatus(c) === "complete").length;
  const totalCabins = cabins.length;

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold text-slate-900">Cabin Check-Ins</h1>

      {/* Check-in type toggle */}
      <div className="flex rounded-xl overflow-hidden bg-white shadow-sm">
        {(["arrival", "friday", "saturday"] as Night[]).map((n) => (
          <button
            key={n}
            onClick={() => setNight(n)}
            className={`flex-1 py-3 text-center font-semibold transition-colors ${
              night === n
                ? "bg-green-700 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {n === "arrival" ? "Arrival" : n === "friday" ? "Friday" : "Saturday"}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm text-center">
        <span className="text-2xl font-bold text-slate-900">{completeCabins}</span>
        <span className="text-lg text-slate-400">/{totalCabins}</span>
        <p className="text-sm text-slate-500">cabins complete</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cabins.map((cabin) => {
            const status = getStatus(cabin);
            const present = getPresent(cabin);
            const total = cabin.totalCampers;
            const pct = total > 0 ? (present / total) * 100 : 0;
            const isExpanded = expandedCabin === cabin.dglCabin;

            const statusColors = {
              complete: "border-green-300 bg-green-50",
              "in-progress": "border-yellow-300 bg-yellow-50",
              "not-started": "border-slate-200 bg-white",
            };

            const barColors = {
              complete: "bg-green-500",
              "in-progress": "bg-yellow-500",
              "not-started": "bg-slate-300",
            };

            return (
              <div
                key={cabin.dglCabin}
                className={`rounded-xl border-2 p-3 cursor-pointer transition-all ${statusColors[status]}`}
                onClick={() => setExpandedCabin(isExpanded ? null : cabin.dglCabin)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{cabin.dglCabin}</p>
                    <p className="text-xs text-slate-500">{cabin.dglName}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {present}/{total}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColors[status]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Expanded camper list */}
                {isExpanded && cabin.campers.length > 0 && (
                  <div className="mt-3 space-y-1 border-t pt-2">
                    {cabin.campers.map((c) => {
                      const camperPresent = night === "arrival" ? c.arrival : night === "friday" ? c.friday : c.saturday;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <span className="text-slate-700">
                            {c.lastName}, {c.firstName}
                          </span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                              camperPresent
                                ? "bg-green-500 text-white"
                                : "bg-slate-200 text-slate-400"
                            }`}
                          >
                            {camperPresent ? "✓" : ""}
                          </span>
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

      {!loading && cabins.length === 0 && (
        <div className="text-center text-slate-400 py-12">
          No cabin data found. Make sure group info has been uploaded.
        </div>
      )}
    </div>
  );
}

export default function CabinCheckinsPage() {
  return (
    <AppShell>
      <CabinCheckinsDashboard />
    </AppShell>
  );
}
