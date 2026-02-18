"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CamperSelect from "@/components/logs/CamperSelect";
import { MEDICAL_LOG_TYPES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

interface RecentLog {
  id: number;
  camperFirstName: string;
  camperLastName: string;
  timestamp: string;
  type: string;
  medication: string | null;
  notes: string | null;
  loggedBy: string;
}

export default function MedicalLogPageWrapper() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppShell>
    }>
      <MedicalLogPage />
    </Suspense>
  );
}

function MedicalLogPage() {
  const searchParams = useSearchParams();
  const initialCamperId = searchParams.get("camperId") || undefined;

  const [camperId, setCamperId] = useState<number | null>(null);
  const [, setCamperName] = useState("");
  const [timestamp, setTimestamp] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [type, setType] = useState("medication_admin");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [treatment, setTreatment] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);

  useEffect(() => {
    fetch("/api/medical-logs?limit=10")
      .then((r) => r.json())
      .then(setRecentLogs)
      .catch(() => {});
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camperId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/medical-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camperId,
          timestamp: new Date(timestamp).toISOString(),
          type,
          medication: medication || null,
          dosage: dosage || null,
          treatment: treatment || null,
          notes: notes || null,
          clientId: uuid(),
        }),
      });

      if (res.ok) {
        setSuccess(true);
        // Reset form (keep camper selected)
        setMedication("");
        setDosage("");
        setTreatment("");
        setNotes("");
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

  const logTypeLabels: Record<string, string> = {
    medication_admin: "Medication",
    first_aid: "First Aid",
    injury: "Injury",
    illness: "Illness",
    other: "Other",
  };

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Medical Log</h1>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-4 text-sm">
            Log saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <CamperSelect
            value={camperId}
            onChange={(id, name) => {
              setCamperId(id || null);
              setCamperName(name);
            }}
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {MEDICAL_LOG_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    type === t.value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === "medication_admin" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Medication
                </label>
                <input
                  type="text"
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  placeholder="e.g., Ibuprofen"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dosage
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g., 200mg"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {(type === "first_aid" || type === "injury") && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Treatment
              </label>
              <input
                type="text"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="e.g., Applied bandage, ice pack"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional details..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!camperId || submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:bg-blue-700 transition-colors"
          >
            {submitting ? "Saving..." : "Save Medical Log"}
          </button>
        </form>

        {/* Recent logs */}
        {recentLogs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Logs</h2>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {logTypeLabels[log.type] || log.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {log.camperFirstName} {log.camperLastName}
                  </p>
                  {log.medication && (
                    <p className="text-xs text-slate-500">{log.medication}</p>
                  )}
                  {log.notes && (
                    <p className="text-xs text-slate-500 mt-1">{log.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
