"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { useDebounce } from "@/hooks/useDebounce";
import { MEDICATION_SCHEDULES } from "@/lib/constants";

interface MedCamper {
  id: number;
  firstName: string;
  lastName: string;
  campWeekend: string;
  value: string;
  hasTimed?: boolean;
  isManualOverride?: boolean;
  medicationSchedule?: string[];
}

const scheduleColors: Record<string, string> = {
  morning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  afternoon: "bg-blue-100 text-blue-800 border-blue-200",
  evening: "bg-purple-100 text-purple-800 border-purple-200",
  bedtime: "bg-indigo-100 text-indigo-800 border-indigo-200",
  with_meals: "bg-green-100 text-green-800 border-green-200",
  as_needed: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function MedicationsPage() {
  return (
    <AppShell>
      <MedicationsContent />
    </AppShell>
  );
}

function MedicationsContent() {
  const { campWeekend, session } = useCamp();
  const [campers, setCampers] = useState<MedCamper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 200);

  const isAllowed = session?.role === "nurse" || session?.role === "admin";

  const fetchMedCampers = useCallback(async () => {
    setLoading(true);
    try {
      const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
      const res = await fetch(`/api/alerts${weekendParam}`);
      const data = await res.json();
      setCampers(data.medications || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [campWeekend]);

  useEffect(() => {
    fetchMedCampers();
  }, [fetchMedCampers]);

  const toggleSchedule = async (camperId: number, value: string) => {
    const camper = campers.find((c) => c.id === camperId);
    if (!camper) return;

    setSavingId(camperId);
    const current = camper.medicationSchedule || [];
    const newSchedule = current.includes(value)
      ? current.filter((s) => s !== value)
      : [...current, value];

    // Auto-enable timedMedicationOverride when toggling any schedule on
    const body: Record<string, unknown> = { medicationSchedule: newSchedule };
    if (newSchedule.length > 0) {
      body.timedMedicationOverride = 1;
    }

    try {
      const res = await fetch(`/api/campers/${camperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        // Update local state
        setCampers((prev) =>
          prev.map((c) =>
            c.id === camperId
              ? {
                  ...c,
                  medicationSchedule: newSchedule.length > 0 ? newSchedule : undefined,
                  hasTimed: newSchedule.length > 0 || c.hasTimed,
                }
              : c
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  };

  const filtered = campers.filter((c) => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term)
    );
  });

  if (!isAllowed) {
    return (
      <div className="p-4 text-center py-20 text-slate-400">
        Nurse or Admin access required.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Med Schedules</h1>
        <span className="text-xs text-slate-400">
          {filtered.length} campers{campWeekend ? ` · ${campWeekend}` : ""}
        </span>
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
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          No campers with medications found.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((camper) => {
            const isExpanded = expandedId === camper.id;
            const isSaving = savingId === camper.id;
            const schedule = camper.medicationSchedule || [];

            return (
              <div
                key={camper.id}
                className="bg-white rounded-xl border border-slate-100 overflow-hidden"
              >
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/campers/${camper.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {camper.lastName}, {camper.firstName}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {camper.value}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : camper.id)}
                    className="text-xs text-blue-600 font-medium shrink-0"
                  >
                    {isExpanded ? "Less" : "More"}
                  </button>
                </div>

                {/* Expanded medication text */}
                {isExpanded && (
                  <div className="px-4 pb-2">
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                      {camper.value}
                    </p>
                  </div>
                )}

                {/* Schedule pills */}
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {MEDICATION_SCHEDULES.map((s) => {
                    const active = schedule.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        onClick={() => toggleSchedule(camper.id, s.value)}
                        disabled={isSaving}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                          active
                            ? scheduleColors[s.value]
                            : "bg-white text-slate-400 border-slate-200"
                        }`}
                      >
                        {s.label}
                      </button>
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
