"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";

interface DglInfo {
  id: number;
  name: string;
  cabin: string | null;
  smallGroup: string;
  campWeekend: string | null;
  hasPin: boolean;
  label: string;
}

interface GeneratedPin {
  name: string;
  cabin: string | null;
  pin: string;
  label: string;
}

function DglPinsManager() {
  const [dgls, setDgls] = useState<DglInfo[]>([]);
  const [generatedPins, setGeneratedPins] = useState<GeneratedPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPins, setShowPins] = useState(false);

  const fetchDgls = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dgl-pins");
      const data = await res.json();
      setDgls(data.dgls || []);
    } catch {
      // Network error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDgls();
  }, [fetchDgls]);

  const generateAll = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/dgl-pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setGeneratedPins(data.generated || []);
      setShowPins(true);
      await fetchDgls();
    } catch {
      // Network error
    }
    setGenerating(false);
  };

  const regenerateOne = async (dglId: number) => {
    try {
      const res = await fetch("/api/admin/dgl-pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dglId }),
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
      await fetchDgls();
    } catch {
      // Network error
    }
  };

  const deletePin = async (label: string) => {
    try {
      await fetch("/api/admin/dgl-pins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      setGeneratedPins((prev) => prev.filter((p) => p.label !== label));
      await fetchDgls();
    } catch {
      // Network error
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">DGL PINs</h1>
        <button
          onClick={generateAll}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
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
                  <p className="text-xs text-slate-500">{p.cabin}</p>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">DGL</th>
                <th className="px-4 py-3 font-medium text-slate-600">Cabin</th>
                <th className="px-4 py-3 font-medium text-slate-600">Group</th>
                <th className="px-4 py-3 font-medium text-slate-600">PIN</th>
                <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dgls.map((dgl) => {
                const genPin = generatedPins.find((p) => p.label === dgl.label);
                return (
                  <tr key={dgl.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {dgl.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{dgl.cabin || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {dgl.smallGroup}
                    </td>
                    <td className="px-4 py-3">
                      {genPin ? (
                        <span className="font-mono font-bold text-green-700">
                          {genPin.pin}
                        </span>
                      ) : dgl.hasPin ? (
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
                          onClick={() => regenerateOne(dgl.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {dgl.hasPin ? "Regenerate" : "Generate"}
                        </button>
                        {dgl.hasPin && (
                          <button
                            onClick={() => deletePin(dgl.label)}
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

          {dgls.length === 0 && (
            <div className="text-center text-slate-400 py-12">
              No DGLs found. Upload group info first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DglPinsPage() {
  return (
    <AppShell>
      <DglPinsManager />
    </AppShell>
  );
}
