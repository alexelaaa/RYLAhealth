"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { downloadCSV } from "@/lib/export-csv";
import { downloadPDF } from "@/lib/export-pdf";
import type { MedicalAlertCamper } from "@/lib/medical-filters";
import { MEDICATION_SCHEDULES } from "@/lib/constants";

type TabKey = "allergies" | "medications" | "conditions" | "dietary" | "timedMeds";

const scheduleColors: Record<string, string> = {
  morning: "bg-yellow-100 text-yellow-800",
  afternoon: "bg-blue-100 text-blue-800",
  evening: "bg-purple-100 text-purple-800",
  bedtime: "bg-indigo-100 text-indigo-800",
  with_meals: "bg-green-100 text-green-800",
  as_needed: "bg-slate-100 text-slate-700",
};

interface AlertsData {
  allergies: MedicalAlertCamper[];
  medications: MedicalAlertCamper[];
  conditions: MedicalAlertCamper[];
  dietary: MedicalAlertCamper[];
  timedMedications: MedicalAlertCamper[];
  summary: {
    allergies: number;
    medications: number;
    conditions: number;
    dietary: number;
    timedMedications: number;
    totalFlagged: number;
  };
}

const tabs: { key: TabKey; label: string }[] = [
  { key: "allergies", label: "Allergies" },
  { key: "medications", label: "Medications" },
  { key: "timedMeds", label: "Timed Meds" },
  { key: "conditions", label: "Conditions" },
  { key: "dietary", label: "Dietary" },
];

function AlertsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { campWeekend } = useCamp();
  const initialTab = (searchParams.get("tab") as TabKey) || "allergies";

  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    setLoading(true);
    const params = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    fetch(`/api/alerts${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend]);

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    router.replace(`/alerts?tab=${tab}`, { scroll: false });
  }

  function getDataForTab(tab: TabKey): MedicalAlertCamper[] {
    if (!data) return [];
    if (tab === "timedMeds") return data.timedMedications;
    return data[tab];
  }

  function getCountForTab(tab: TabKey): number {
    if (!data) return 0;
    if (tab === "timedMeds") return data.summary.timedMedications;
    return data.summary[tab];
  }

  function handleExportCSV() {
    if (!data) return;
    const items = getDataForTab(activeTab);
    const columnLabel = activeTab === "allergies" ? "Allergies" :
      activeTab === "medications" ? "Medications" :
      activeTab === "timedMeds" ? "Timed Medications" :
      activeTab === "conditions" ? "Conditions" : "Dietary Restrictions";

    const rows = items.map((c) => ({
      Name: `${c.lastName}, ${c.firstName}`,
      Weekend: c.campWeekend,
      [columnLabel]: c.value,
      ...(activeTab === "allergies" ? { EpiPen: c.hasEpiPen ? "Yes" : "" } : {}),
      ...(activeTab === "medications" || activeTab === "timedMeds" ? { "Timed Schedule": c.hasTimed ? "Yes" : "" } : {}),
      ...(c.isManualOverride ? { "Manual Override": "Yes" } : {}),
    }));
    const weekendLabel = campWeekend || "all";
    downloadCSV(rows, `${activeTab}-alerts-${weekendLabel.replace(/\s+/g, "-")}.csv`);
  }

  function handleExportPDF() {
    if (!data) return;
    const items = getDataForTab(activeTab);
    const columnLabel = activeTab === "allergies" ? "Allergies" :
      activeTab === "medications" ? "Medications" :
      activeTab === "timedMeds" ? "Timed Medications" :
      activeTab === "conditions" ? "Conditions" : "Dietary Restrictions";

    const columns = ["Name", "Weekend", columnLabel];
    if (activeTab === "allergies") columns.push("EpiPen");
    if (activeTab === "medications" || activeTab === "timedMeds") columns.push("Timed");

    const rows = items.map((c) => {
      const row: (string | number)[] = [
        `${c.lastName}, ${c.firstName}`,
        c.campWeekend,
        c.value,
      ];
      if (activeTab === "allergies") row.push(c.hasEpiPen ? "Yes" : "");
      if (activeTab === "medications" || activeTab === "timedMeds") row.push(c.hasTimed ? "Yes" : "");
      return row;
    });

    const weekendLabel = campWeekend || "All Weekends";
    downloadPDF(
      `Medical Alerts — ${columnLabel} (${weekendLabel})`,
      columns,
      rows,
      `${activeTab}-alerts.pdf`
    );
  }

  const currentList = getDataForTab(activeTab);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Medical Alerts</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-2xl font-bold text-red-600">{data.summary.allergies}</p>
              <p className="text-xs text-red-500">Allergies</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-2xl font-bold text-blue-600">{data.summary.medications}</p>
              <p className="text-xs text-blue-500">Medications</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
              <p className="text-2xl font-bold text-purple-600">{data.summary.conditions}</p>
              <p className="text-xs text-purple-500">Conditions</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-2xl font-bold text-green-600">{data.summary.dietary}</p>
              <p className="text-xs text-green-500">Dietary</p>
            </div>
          </div>

          {/* Timed meds + total flagged */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {data.summary.totalFlagged} unique campers flagged
            </p>
            <p className="text-xs text-amber-600 font-medium">
              {data.summary.timedMedications} timed medications
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-slate-200 -mx-4 px-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span className="ml-1 text-xs">
                  ({getCountForTab(tab.key)})
                </span>
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Export PDF
            </button>
          </div>

          {/* Camper list */}
          {currentList.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-slate-100 text-center text-sm text-slate-400">
              No campers flagged in this category.
            </div>
          ) : (
            <div className="space-y-2">
              {currentList.map((camper) => (
                <Link
                  key={`${camper.id}-${activeTab}`}
                  href={`/campers/${camper.id}`}
                  className="block"
                >
                  <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-900">
                            {camper.lastName}, {camper.firstName}
                          </span>
                          {camper.hasEpiPen && (
                            <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
                              EPIPEN
                            </span>
                          )}
                          {camper.hasTimed && (
                            <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                              {camper.isManualOverride ? "TIMED (manual)" : "TIMED"}
                            </span>
                          )}
                          {camper.medicationSchedule && camper.medicationSchedule.map((s) => (
                            <span key={s} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${scheduleColors[s] || "bg-slate-100 text-slate-700"}`}>
                              {MEDICATION_SCHEDULES.find((ms) => ms.value === s)?.label || s}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {camper.value}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 inline-block">
                          {camper.campWeekend}
                        </span>
                      </div>
                      <svg
                        className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-slate-400">Failed to load alerts</div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        }
      >
        <AlertsContent />
      </Suspense>
    </AppShell>
  );
}
