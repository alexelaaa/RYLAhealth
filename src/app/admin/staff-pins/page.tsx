"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";

interface StaffInfo {
  id: number;
  name: string;
  staffRole: string | null;
  campWeekend: string | null;
  hasPin: boolean;
  label: string;
}

interface GeneratedPin {
  name: string;
  staffRole: string | null;
  pin: string;
  label: string;
}

function StaffPinsManager() {
  const [staff, setStaff] = useState<StaffInfo[]>([]);
  const [generatedPins, setGeneratedPins] = useState<GeneratedPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPins, setShowPins] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff-pins");
      const data = await res.json();
      setStaff(data.staff || []);
    } catch {
      // Network error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const generateAll = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/staff-pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setGeneratedPins(data.generated || []);
      setShowPins(true);
      await fetchStaff();
    } catch {
      // Network error
    }
    setGenerating(false);
  };

  const regenerateOne = async (staffId: number) => {
    try {
      const res = await fetch("/api/admin/staff-pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      const data = await res.json();
      if (data.generated?.length > 0) {
        setGeneratedPins((prev) => {
          const existing = prev.filter(
            (p) => p.label !== data.generated[0].label
          );
          return [...existing, ...data.generated];
        });
        setShowPins(true);
      }
      await fetchStaff();
    } catch {
      // Network error
    }
  };

  const deletePin = async (label: string) => {
    try {
      await fetch("/api/admin/staff-pins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      setGeneratedPins((prev) => prev.filter((p) => p.label !== label));
      await fetchStaff();
    } catch {
      // Network error
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Staff PINs</h1>
        <button
          onClick={generateAll}
          disabled={generating}
          className="px-4 py-2 bg-green-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate All PINs"}
        </button>
      </div>

      {/* Generated PINs display */}
      {showPins && generatedPins.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-green-800">
              Generated PINs ({generatedPins.length})
            </h2>
            <button
              onClick={() => setShowPins(false)}
              className="text-sm text-green-600 hover:text-green-800"
            >
              Hide
            </button>
          </div>
          <div className="space-y-2">
            {generatedPins.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between bg-white rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-sm text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.staffRole || "Staff"}</p>
                </div>
                <span className="font-mono text-lg font-bold text-green-700">
                  {p.pin}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="px-4 py-3 font-medium text-slate-600">Weekend</th>
                <th className="px-4 py-3 font-medium text-slate-600">PIN</th>
                <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const genPin = generatedPins.find((p) => p.label === s.label);
                return (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {s.staffRole || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {s.campWeekend || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {genPin ? (
                        <span className="font-mono font-bold text-green-700">
                          {genPin.pin}
                        </span>
                      ) : s.hasPin ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          Set
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded-full">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => regenerateOne(s.id)}
                          className="text-xs text-green-700 hover:text-green-900"
                        >
                          {s.hasPin ? "Regenerate" : "Generate"}
                        </button>
                        {s.hasPin && (
                          <button
                            onClick={() => deletePin(s.label)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {staff.length === 0 && (
            <div className="text-center text-slate-400 py-12">
              No adult staff found. Upload staff data first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StaffPinsPage() {
  return (
    <AppShell>
      <StaffPinsManager />
    </AppShell>
  );
}
