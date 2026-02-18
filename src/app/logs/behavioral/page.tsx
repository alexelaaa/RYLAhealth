"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CamperSelect from "@/components/logs/CamperSelect";
import { SEVERITY_LEVELS } from "@/lib/constants";
import { v4 as uuid } from "uuid";

interface RecentIncident {
  id: number;
  camperFirstName: string;
  camperLastName: string;
  timestamp: string;
  staffName: string;
  description: string;
  severity: string;
  loggedBy: string;
}

export default function BehavioralIncidentPageWrapper() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppShell>
    }>
      <BehavioralIncidentPage />
    </Suspense>
  );
}

function BehavioralIncidentPage() {
  const searchParams = useSearchParams();
  const initialCamperId = searchParams.get("camperId") || undefined;

  const [camperId, setCamperId] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [staffName, setStaffName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("low");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([]);

  useEffect(() => {
    fetch("/api/behavioral-incidents?limit=10")
      .then((r) => r.json())
      .then(setRecentIncidents)
      .catch(() => {});
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camperId || !staffName || !description) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/behavioral-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camperId,
          timestamp: new Date(timestamp).toISOString(),
          staffName,
          description,
          severity,
          clientId: uuid(),
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setDescription("");
        setSeverity("low");
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setTimestamp(now.toISOString().slice(0, 16));
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to submit:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const severityColors: Record<string, string> = {
    low: "bg-yellow-100 text-yellow-800",
    medium: "bg-orange-100 text-orange-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Behavioral Incident</h1>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-4 text-sm">
            Incident saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <CamperSelect
            value={camperId}
            onChange={(id) => setCamperId(id || null)}
            initialCamperId={initialCamperId}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Timestamp
            </label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Staff Name
            </label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Name of reporting staff"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Severity
            </label>
            <div className="flex gap-2">
              {SEVERITY_LEVELS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    severity === s.value
                      ? s.value === "low"
                        ? "bg-yellow-500 text-white ring-2 ring-yellow-300"
                        : s.value === "medium"
                        ? "bg-orange-500 text-white ring-2 ring-orange-300"
                        : "bg-red-500 text-white ring-2 ring-red-300"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the incident..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!camperId || !staffName || !description || submitting}
            className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:bg-orange-700 transition-colors"
          >
            {submitting ? "Saving..." : "Save Incident Report"}
          </button>
        </form>

        {/* Recent incidents */}
        {recentIncidents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Incidents</h2>
            <div className="space-y-2">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[incident.severity] || "bg-slate-100"}`}>
                      {incident.severity}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(incident.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {incident.camperFirstName} {incident.camperLastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{incident.description}</p>
                  <p className="text-xs text-slate-400 mt-1">Staff: {incident.staffName}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
