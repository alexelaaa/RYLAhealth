"use client";

import { useState, useEffect, useMemo } from "react";
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
  const [saving, setSaving] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [namePreview, setNamePreview] = useState<{ id: number; field: string; oldValue: string; newValue: string }[] | null>(null);
  const [nameCount, setNameCount] = useState(0);
  const [namePreviewing, setNamePreviewing] = useState(false);
  const [nameApplying, setNameApplying] = useState(false);

  const fetchSchools = () => {
    setLoading(true);
    const params = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    fetch(`/api/admin/schools${params}`)
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.schools || []);
        setEditedNames({});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchools();
  }, [campWeekend]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a flat list of all unique school names with their suggested corrections
  const allSchools = useMemo(() => {
    const result: { original: string; suggested: string; count: number; groupCanonical: string; hasVariants: boolean }[] = [];
    for (const group of groups) {
      for (const variant of group.variants) {
        result.push({
          original: variant.name,
          suggested: group.canonical,
          count: variant.count,
          groupCanonical: group.canonical,
          hasVariants: group.variants.length > 1,
        });
      }
    }
    return result.sort((a, b) => a.original.localeCompare(b.original));
  }, [groups]);

  const filteredSchools = useMemo(() => {
    if (!search) return allSchools;
    const q = search.toLowerCase();
    return allSchools.filter(
      (s) =>
        s.original.toLowerCase().includes(q) ||
        (editedNames[s.original] || s.suggested).toLowerCase().includes(q)
    );
  }, [allSchools, search, editedNames]);

  // Count how many schools have pending changes
  const pendingChanges = useMemo(() => {
    return allSchools.filter((s) => {
      const target = editedNames[s.original] ?? s.suggested;
      return target !== s.original;
    });
  }, [allSchools, editedNames]);

  if (session && session.role !== "admin") {
    return (
      <div className="p-4 text-center py-20 text-slate-400">
        Admin access required
      </div>
    );
  }

  const handleMergeGroup = async (group: SchoolGroup) => {
    const targetName = editedNames[group.variants[0]?.name] || group.canonical;
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

  const handleSaveAll = async () => {
    if (pendingChanges.length === 0) return;

    const mappings = pendingChanges.map((s) => ({
      from: s.original,
      to: editedNames[s.original] ?? s.suggested,
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/admin/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(`Updated ${data.totalAffected} camper records across ${mappings.length} schools`);
        fetchSchools();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAllSuggestions = () => {
    // Clear all manual edits so suggestions take effect
    setEditedNames({});
  };

  const handleResetAll = () => {
    // Set all edited names back to their original values (no changes)
    const reset: Record<string, string> = {};
    for (const s of allSchools) {
      reset[s.original] = s.original;
    }
    setEditedNames(reset);
  };

  const handlePreviewNames = async () => {
    setNamePreviewing(true);
    try {
      const res = await fetch("/api/admin/cleanup-names");
      const data = await res.json();
      setNamePreview(data.preview || []);
      setNameCount(data.totalChanges || 0);
    } catch {
      setMessage("Failed to preview name changes");
    } finally {
      setNamePreviewing(false);
    }
  };

  const handleApplyNames = async () => {
    setNameApplying(true);
    try {
      const res = await fetch("/api/admin/cleanup-names", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMessage(`Fixed casing on ${data.totalChanges} names`);
        setNamePreview(null);
        setNameCount(0);
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage("Failed to apply name changes");
    } finally {
      setNameApplying(false);
    }
  };

  const multiVariantGroups = groups.filter((g) => g.variants.length > 1);

  return (
    <div className="p-4 space-y-4 pb-32">
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
            {allSchools.length} unique school names &middot; {pendingChanges.length} pending changes
          </p>

          {/* Search */}
          <input
            type="text"
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleAcceptAllSuggestions}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Accept All Suggestions
            </button>
            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Reset All
            </button>
          </div>

          {/* Name casing cleanup */}
          <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Fix Name Casing</h2>
              <p className="text-xs text-slate-400 mt-0.5">Proper-case all camper first &amp; last names (handles hyphens, O&apos;Brien, McDonald, etc.)</p>
            </div>
            <div className="px-4 py-3">
              {namePreview === null ? (
                <button
                  onClick={handlePreviewNames}
                  disabled={namePreviewing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40"
                >
                  {namePreviewing ? "Checking..." : "Preview Name Changes"}
                </button>
              ) : nameCount === 0 ? (
                <p className="text-sm text-green-700">All names are already properly cased.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">{nameCount} name changes found:</p>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {namePreview.map((c, i) => (
                      <div key={i} className="px-3 py-1.5 text-sm flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-16 shrink-0">{c.field === "first_name" ? "First" : "Last"}</span>
                        <span className="text-red-600 line-through">{c.oldValue}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="text-green-700 font-medium">{c.newValue}</span>
                      </div>
                    ))}
                    {nameCount > namePreview.length && (
                      <div className="px-3 py-1.5 text-xs text-slate-400">
                        ...and {nameCount - namePreview.length} more
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApplyNames}
                      disabled={nameApplying}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40"
                    >
                      {nameApplying ? "Applying..." : `Apply ${nameCount} Changes`}
                    </button>
                    <button
                      onClick={() => { setNamePreview(null); setNameCount(0); }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Merge groups section (multi-variant) */}
          {multiVariantGroups.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">
                Variant Groups ({multiVariantGroups.length})
              </h2>
              <div className="space-y-3">
                {multiVariantGroups.map((group) => {
                  const isMerging = merging === group.canonical;
                  return (
                    <div key={group.canonical} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                            {group.variants.length} variants
                          </span>
                          <span className="text-xs text-slate-400">
                            {group.variants.reduce((s, v) => s + v.count, 0)} campers
                          </span>
                        </div>
                        <div className="text-sm font-medium text-slate-800">
                          Suggested: {group.canonical}
                        </div>
                      </div>
                      <div className="px-4 py-2 space-y-1">
                        {group.variants.map((v) => (
                          <div key={v.name} className="flex items-center justify-between text-sm py-1">
                            <span className="text-slate-700">{v.name}</span>
                            <span className="text-xs text-slate-400">{v.count}</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3 border-t border-slate-200">
                        <button
                          onClick={() => handleMergeGroup(group)}
                          disabled={isMerging}
                          className="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-40"
                        >
                          {isMerging ? "Merging..." : `Merge into "${group.canonical}"`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All schools - editable list */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">
              All Schools ({filteredSchools.length})
            </h2>
            <div className="bg-white rounded-xl border border-slate-300 divide-y divide-slate-100">
              {filteredSchools.map((school) => {
                const currentValue = editedNames[school.original] ?? school.suggested;
                const hasChange = currentValue !== school.original;
                return (
                  <div key={school.original} className="px-4 py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 truncate max-w-[70%]">
                        {school.original}
                      </span>
                      <span className="text-xs text-slate-400">{school.count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) =>
                          setEditedNames((prev) => ({
                            ...prev,
                            [school.original]: e.target.value,
                          }))
                        }
                        className={`flex-1 px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          hasChange
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white"
                        }`}
                      />
                      {hasChange && (
                        <button
                          onClick={() =>
                            setEditedNames((prev) => ({
                              ...prev,
                              [school.original]: school.original,
                            }))
                          }
                          className="text-xs text-slate-400 hover:text-slate-600"
                          title="Reset to original"
                        >
                          undo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Sticky save bar */}
      {pendingChanges.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {saving ? "Saving..." : `Save All Changes (${pendingChanges.length} schools)`}
          </button>
        </div>
      )}
    </div>
  );
}
