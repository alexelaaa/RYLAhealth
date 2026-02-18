"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";

interface SchoolVariant {
  name: string;
  count: number;
}

interface SchoolGroup {
  canonical: string;
  variants: SchoolVariant[];
}

export default function SchoolCleanupPage() {
  return (
    <AppShell>
      <SchoolCleanupContent />
    </AppShell>
  );
}

function SchoolCleanupContent() {
  const { campWeekend, session } = useCamp();
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [editedCanonicals, setEditedCanonicals] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const fetchSchools = () => {
    setLoading(true);
    const params = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    fetch(`/api/admin/schools${params}`)
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.schools || []);
        setEditedCanonicals({});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchools();
  }, [campWeekend]); // eslint-disable-line react-hooks/exhaustive-deps

  if (session && session.role !== "admin") {
    return (
      <div className="p-4 text-center py-20 text-slate-400">
        Admin access required
      </div>
    );
  }

  const handleMerge = async (group: SchoolGroup) => {
    const targetName = editedCanonicals[group.canonical] || group.canonical;
    const mappings = group.variants
      .filter((v) => v.name !== targetName)
      .map((v) => ({ from: v.name, to: targetName }));

    if (mappings.length === 0) return;

    setMerging(group.canonical);
    try {
      const res = await fetch("/api/admin/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(`Merged ${data.totalAffected} camper records into "${targetName}"`);
        fetchSchools();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage("Failed to merge schools");
    } finally {
      setMerging(null);
    }
  };

  const multiVariantGroups = groups.filter((g) => g.variants.length > 1);
  const singleGroups = groups.filter((g) => g.variants.length === 1);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/upload" className="text-blue-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">School Name Cleanup</h1>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.startsWith("Error") ? "bg-red-50 border border-red-200 text-red-800" : "bg-green-50 border border-green-200 text-green-800"}`}>
          {message}
          <button onClick={() => setMessage("")} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {groups.length} unique school names ({multiVariantGroups.length} groups need cleanup)
          </p>

          {/* Groups needing cleanup */}
          {multiVariantGroups.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Needs Cleanup</h2>
              <div className="space-y-3">
                {multiVariantGroups.map((group) => {
                  const targetName = editedCanonicals[group.canonical] || group.canonical;
                  const isMerging = merging === group.canonical;
                  return (
                    <div key={group.canonical} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                            {group.variants.length} variants
                          </span>
                          <span className="text-xs text-slate-400">
                            {group.variants.reduce((s, v) => s + v.count, 0)} campers total
                          </span>
                        </div>
                        <input
                          type="text"
                          value={targetName}
                          onChange={(e) =>
                            setEditedCanonicals((prev) => ({
                              ...prev,
                              [group.canonical]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="px-4 py-2 space-y-1">
                        {group.variants.map((v) => (
                          <div key={v.name} className="flex items-center justify-between text-sm py-1">
                            <span className={`text-slate-700 ${v.name === targetName ? "font-medium" : ""}`}>
                              {v.name}
                            </span>
                            <span className="text-xs text-slate-400">{v.count} campers</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3 border-t border-slate-100">
                        <button
                          onClick={() => handleMerge(group)}
                          disabled={isMerging}
                          className="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-40"
                        >
                          {isMerging ? "Merging..." : `Merge into "${targetName}"`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clean schools */}
          {singleGroups.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">
                Clean ({singleGroups.length})
              </h2>
              <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                {singleGroups.map((group) => (
                  <div key={group.canonical} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-slate-700">{group.variants[0].name}</span>
                    <span className="text-xs text-slate-400">{group.variants[0].count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
