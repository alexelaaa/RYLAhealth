"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import type { MedicalAlertCamper } from "@/lib/medical-filters";

interface Stats {
  totalCampers: number;
  weekendCounts: { campWeekend: string; count: number }[];
  roleCounts: { role: string; count: number }[];
  todayMedicalLogs: number;
  todayBehavioralIncidents: number;
  totalMedicalLogs: number;
  totalBehavioralIncidents: number;
  checkedIn?: number;
  totalForCheckIn?: number;
  largeGroupCount?: number;
  smallGroupCount?: number;
  cabinCount?: number;
  recentActivity: {
    id: number;
    type: string;
    camperId: number;
    camperFirstName: string;
    camperLastName: string;
    logType: string;
    timestamp: string;
    loggedBy: string;
    notes: string | null;
  }[];
}

interface AlertsSummary {
  allergies: number;
  medications: number;
  conditions: number;
  dietary: number;
  timedMedications: number;
  totalFlagged: number;
}

interface AlertsData {
  allergies: MedicalAlertCamper[];
  medications: MedicalAlertCamper[];
  conditions: MedicalAlertCamper[];
  dietary: MedicalAlertCamper[];
  timedMedications: (MedicalAlertCamper & { medicationSchedule?: string[] })[];
  summary: AlertsSummary;
}

const logTypeLabels: Record<string, string> = {
  medication_admin: "Medication",
  first_aid: "First Aid",
  injury: "Injury",
  illness: "Illness",
  other: "Other",
};

const MEDICATION_SCHEDULES: { value: string; label: string; timeRange: string | null; hourStart?: number; hourEnd?: number }[] = [
  { value: "morning", label: "Morning", timeRange: "6:00-10:00 AM", hourStart: 6, hourEnd: 10 },
  { value: "afternoon", label: "Afternoon", timeRange: "12:00-2:00 PM", hourStart: 12, hourEnd: 14 },
  { value: "evening", label: "Evening", timeRange: "4:00-8:00 PM", hourStart: 16, hourEnd: 20 },
  { value: "bedtime", label: "Bedtime", timeRange: "8:00-10:00 PM", hourStart: 20, hourEnd: 22 },
  { value: "with_meals", label: "With Meals", timeRange: "Meals" },
  { value: "as_needed", label: "As Needed", timeRange: null },
];

const scheduleColors: Record<string, string> = {
  morning: "bg-yellow-100 text-yellow-800",
  afternoon: "bg-blue-100 text-blue-800",
  evening: "bg-purple-100 text-purple-800",
  bedtime: "bg-indigo-100 text-indigo-800",
  with_meals: "bg-green-100 text-green-800",
  as_needed: "bg-slate-100 text-slate-700",
};

function getActiveSchedules(): { value: string; label: string }[] {
  const hour = new Date().getHours();
  return MEDICATION_SCHEDULES.filter(
    (s) => s.hourStart !== undefined && s.hourEnd !== undefined && hour >= s.hourStart && hour < s.hourEnd
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { campWeekend, session } = useCamp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    Promise.all([
      fetch(`/api/stats${weekendParam}`).then((r) => r.json()),
      fetch(`/api/alerts${weekendParam}`).then((r) => r.json()),
    ])
      .then(([statsData, alerts]) => {
        setStats(statsData);
        setAlertsData(alerts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend]);

  const activeSchedules = getActiveSchedules();
  const timedMeds = alertsData?.timedMedications || [];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : stats ? (
        <>
          {/* Stats cards — 2x2 grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-2xl font-bold text-blue-600">{stats.totalCampers}</p>
              <p className="text-xs text-blue-500 mt-1">
                {campWeekend ? "Weekend Campers" : "Total Campers"}
              </p>
            </div>
            <Link href="/checkin" className="block">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 h-full">
                <p className="text-2xl font-bold text-green-600">
                  {stats.checkedIn !== undefined && stats.totalForCheckIn
                    ? `${Math.round((stats.checkedIn / stats.totalForCheckIn) * 100)}%`
                    : "—"}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  Checked In{stats.checkedIn !== undefined ? ` (${stats.checkedIn}/${stats.totalForCheckIn})` : ""}
                </p>
              </div>
            </Link>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-2xl font-bold text-red-600">{stats.todayMedicalLogs}</p>
              <p className="text-xs text-red-500 mt-1">Medical Logs Today</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <p className="text-2xl font-bold text-orange-600">{stats.todayBehavioralIncidents}</p>
              <p className="text-xs text-orange-500 mt-1">Incidents Today</p>
            </div>
          </div>

          {/* Medical Overview */}
          {alertsData && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Medical Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/alerts?tab=allergies" className="block">
                  <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-red-200 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-red-600">{alertsData.summary.allergies}</span>
                      <span className="text-xs text-slate-500">Allergies</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {alertsData.allergies.slice(0, 3).map((c) => `${c.firstName} ${c.lastName.charAt(0)}.`).join(", ")}
                    </p>
                  </div>
                </Link>
                <Link href="/alerts?tab=medications" className="block">
                  <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-blue-600">{alertsData.summary.medications}</span>
                      <span className="text-xs text-slate-500">Medications</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {alertsData.medications.slice(0, 3).map((c) => `${c.firstName} ${c.lastName.charAt(0)}.`).join(", ")}
                    </p>
                  </div>
                </Link>
                <Link href="/alerts?tab=conditions" className="block">
                  <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-purple-200 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-purple-600">{alertsData.summary.conditions}</span>
                      <span className="text-xs text-slate-500">Conditions</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {alertsData.conditions.slice(0, 3).map((c) => `${c.firstName} ${c.lastName.charAt(0)}.`).join(", ")}
                    </p>
                  </div>
                </Link>
                <Link href="/alerts?tab=dietary" className="block">
                  <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-green-200 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-green-600">{alertsData.summary.dietary}</span>
                      <span className="text-xs text-slate-500">Dietary</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {alertsData.dietary.slice(0, 3).map((c) => `${c.firstName} ${c.lastName.charAt(0)}.`).join(", ")}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Timed Medications */}
          {timedMeds.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Timed Medications</h2>
                <Link
                  href="/alerts?tab=timedMeds"
                  className="text-xs text-amber-600 font-medium hover:text-amber-700"
                >
                  View All ({timedMeds.length}) →
                </Link>
              </div>

              {/* Time-of-day banner */}
              {activeSchedules.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3">
                  <p className="text-sm font-medium text-amber-800">
                    {activeSchedules.map((s) => `${s.label} medications due`).join(" · ")}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {timedMeds.slice(0, 5).map((med) => (
                  <Link
                    key={med.id}
                    href={`/campers/${med.id}`}
                    className="block"
                  >
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 hover:border-amber-200 transition-colors">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">
                          {med.isManualOverride ? "TIMED (manual)" : "TIMED"}
                        </span>
                        {med.medicationSchedule && med.medicationSchedule.length > 0 && (
                          med.medicationSchedule.map((s) => (
                            <span key={s} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${scheduleColors[s] || "bg-slate-100 text-slate-700"}`}>
                              {MEDICATION_SCHEDULES.find((ms) => ms.value === s)?.label || s}
                            </span>
                          ))
                        )}
                        <span className="text-xs text-amber-400">
                          {med.campWeekend}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {med.firstName} {med.lastName}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {med.value}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Camp Organization */}
          {stats.largeGroupCount !== undefined && (stats.largeGroupCount > 0 || (stats.smallGroupCount || 0) > 0 || (stats.cabinCount || 0) > 0) && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Camp Organization</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/groups" className="block">
                  <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 transition-colors">
                    <svg className="w-5 h-5 text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm font-medium text-slate-900">Groups</p>
                    <p className="text-xs text-slate-400">
                      {stats.largeGroupCount} large, {stats.smallGroupCount || 0} small
                    </p>
                  </div>
                </Link>
                <Link href="/cabins" className="block">
                  <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 transition-colors">
                    <svg className="w-5 h-5 text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <p className="text-sm font-medium text-slate-900">Cabins</p>
                    <p className="text-xs text-slate-400">{stats.cabinCount || 0} assigned</p>
                  </div>
                </Link>
                <Link href="/staff" className="block">
                  <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 transition-colors">
                    <svg className="w-5 h-5 text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-900">Staff</p>
                    <p className="text-xs text-slate-400">Directory</p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/logs/medical"
                className="bg-red-50 text-red-700 rounded-xl py-4 text-center text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Medical Log
              </Link>
              <Link
                href="/logs/behavioral"
                className="bg-orange-50 text-orange-700 rounded-xl py-4 text-center text-sm font-medium hover:bg-orange-100 transition-colors"
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Incident
              </Link>
              <Link
                href="/campers"
                className="bg-blue-50 text-blue-700 rounded-xl py-4 text-center text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Campers
              </Link>
              <Link
                href="/bus-tracker"
                className="bg-teal-50 text-teal-700 rounded-xl py-4 text-center text-sm font-medium hover:bg-teal-100 transition-colors"
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Bus Tracker
              </Link>
              {(session?.role === "nurse" || session?.role === "admin") && (
                <Link
                  href="/medications"
                  className="bg-amber-50 text-amber-700 rounded-xl py-4 text-center text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Med Schedules
                </Link>
              )}
              {session?.role === "admin" && (
                <Link
                  href="/admin/bus-map"
                  className="bg-indigo-50 text-indigo-700 rounded-xl py-4 text-center text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Bus Map
                </Link>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Activity</h2>
            {stats.recentActivity.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-slate-100 text-center text-sm text-slate-400">
                No activity yet. Start logging medical entries or incidents.
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentActivity.map((entry) => (
                  <Link
                    key={`${entry.type}-${entry.id}`}
                    href={`/campers/${entry.camperId}`}
                    className="block"
                  >
                    <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            entry.type === "medical"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {entry.type === "medical"
                            ? logTypeLabels[entry.logType] || entry.logType
                            : `${entry.logType} severity`}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {entry.camperFirstName} {entry.camperLastName}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {entry.notes}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">by {entry.loggedBy}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-slate-400">Failed to load stats</div>
      )}
    </div>
  );
}
