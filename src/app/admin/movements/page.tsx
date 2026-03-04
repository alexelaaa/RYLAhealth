"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { useDebounce } from "@/hooks/useDebounce";
import type { Camper } from "@/types";

interface EditEntry {
  id: number;
  camperId: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: string;
  camperFirstName: string;
  camperLastName: string;
}

interface Options {
  smallGroups: string[];
  cabinNames: string[];
  groupMapping: Record<string, string>;
}

interface BusStat {
  busNumber: string;
  assigned: number;
  checkedIn: number;
  arrived: number;
}

interface CheckInRecord {
  camper_id: number;
  checked_in_at: string | null;
  camp_arrived_at: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  cabinName: "Cabin",
  cabinNumber: "Cabin #",
  cabinLocation: "Cabin Location",
  smallGroup: "Small Group",
  largeGroup: "Large Group",
  noShow: "No-Show",
};

function formatFieldChange(edit: EditEntry): string {
  const label = FIELD_LABELS[edit.fieldName] || edit.fieldName;
  if (edit.fieldName === "noShow") {
    return edit.newValue === "1" ? "marked as No-Show" : "unmarked as No-Show";
  }
  const from = edit.oldValue || "(none)";
  const to = edit.newValue || "(none)";
  return `${label}: ${from} \u2192 ${to}`;
}

export default function MovementsPage() {
  return (
    <AppShell>
      <MovementsContent />
    </AppShell>
  );
}

function MovementsContent() {
  const { campWeekend } = useCamp();

  // Search & selection
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Camper[]>([]);
  const [selected, setSelected] = useState<Camper | null>(null);
  const debouncedSearch = useDebounce(search, 200);

  // Assignment form
  const [smallGroup, setSmallGroup] = useState("");
  const [largeGroup, setLargeGroup] = useState("");
  const [cabinName, setCabinName] = useState("");
  const [noShow, setNoShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Check-in status for selected camper
  const [checkInStatus, setCheckInStatus] = useState<"not_checked_in" | "on_bus" | "arrived">("not_checked_in");
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Options
  const [options, setOptions] = useState<Options>({ smallGroups: [], cabinNames: [], groupMapping: {} });

  // Bus stats
  const [busStats, setBusStats] = useState<BusStat[]>([]);

  // Feed
  const [tab, setTab] = useState<"changes" | "noshows">("changes");
  const [feed, setFeed] = useState<EditEntry[]>([]);
  const [noShowCampers, setNoShowCampers] = useState<Camper[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Per-camper drill-down
  const [expandedCamper, setExpandedCamper] = useState<number | null>(null);
  const [camperHistory, setCamperHistory] = useState<EditEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load options
  useEffect(() => {
    fetch("/api/options")
      .then((r) => r.json())
      .then((data) => setOptions({
        smallGroups: data.smallGroups || [],
        cabinNames: data.cabinNames || [],
        groupMapping: data.groupMapping || {},
      }))
      .catch(() => {});
  }, []);

  // Search campers
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      const params = new URLSearchParams({ search: debouncedSearch });
      if (campWeekend) params.set("weekend", campWeekend);
      params.set("limit", "15");
      fetch(`/api/campers?${params}`)
        .then((r) => r.json())
        .then((data) => setSearchResults(data.campers || []))
        .catch(() => {});
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, campWeekend]);

  // Load change feed
  const fetchFeed = useCallback(() => {
    setFeedLoading(true);
    fetch("/api/admin/camper-edits?filter=movements&limit=100")
      .then((r) => r.json())
      .then((data) => setFeed(data))
      .catch(() => {})
      .finally(() => setFeedLoading(false));
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Load no-show campers
  const fetchNoShows = useCallback(() => {
    const params = new URLSearchParams();
    if (campWeekend) params.set("weekend", campWeekend);
    params.set("limit", "500");
    fetch(`/api/campers?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const noshows = (data.campers || []).filter((c: Camper) => (c as Camper & { noShow?: number }).noShow === 1);
        setNoShowCampers(noshows);
      })
      .catch(() => {});
  }, [campWeekend]);

  useEffect(() => { fetchNoShows(); }, [fetchNoShows]);

  // Load bus stats
  const fetchBusStats = useCallback(() => {
    const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    fetch(`/api/admin/bus-stats${weekendParam}`)
      .then((r) => r.json())
      .then((data) => setBusStats(data))
      .catch(() => {});
  }, [campWeekend]);

  useEffect(() => { fetchBusStats(); }, [fetchBusStats]);

  // Fetch check-in status for selected camper
  const fetchCheckInStatus = useCallback(async (camperId: number) => {
    try {
      const weekendParam = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
      const res = await fetch(`/api/check-ins${weekendParam}`);
      const data: CheckInRecord[] = await res.json();
      const ci = data.find((r) => r.camper_id === camperId);
      if (!ci) {
        setCheckInStatus("not_checked_in");
      } else if (ci.camp_arrived_at) {
        setCheckInStatus("arrived");
      } else {
        setCheckInStatus("on_bus");
      }
    } catch {
      setCheckInStatus("not_checked_in");
    }
  }, [campWeekend]);

  // Select a camper
  const handleSelect = (camper: Camper) => {
    setSelected(camper);
    setSmallGroup(camper.smallGroup || "");
    setLargeGroup(camper.largeGroup || "");
    setCabinName(camper.cabinName || "");
    setNoShow((camper as Camper & { noShow?: number }).noShow === 1);
    setSearch("");
    setSearchResults([]);
    setSaveMsg("");
    fetchCheckInStatus(camper.id);
  };

  // Auto-cascade large group from small group
  const handleSmallGroupChange = (sg: string) => {
    setSmallGroup(sg);
    if (sg && options.groupMapping[sg]) {
      setLargeGroup(options.groupMapping[sg]);
    } else if (!sg) {
      setLargeGroup("");
    }
  };

  // Check-in actions
  const handleCheckIn = async () => {
    if (!selected) return;
    setCheckInLoading(true);
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId: selected.id }),
      });
      if (res.ok) {
        setCheckInStatus("on_bus");
        fetchBusStats();
      }
    } catch {
      // ignore
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleConfirmArrival = async () => {
    if (!selected) return;
    setCheckInLoading(true);
    try {
      const res = await fetch("/api/check-ins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId: selected.id }),
      });
      if (res.ok) {
        setCheckInStatus("arrived");
        fetchBusStats();
      }
    } catch {
      // ignore
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleUndoCheckIn = async () => {
    if (!selected) return;
    setCheckInLoading(true);
    try {
      const res = await fetch(`/api/check-ins/${selected.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCheckInStatus("not_checked_in");
        fetchBusStats();
      }
    } catch {
      // ignore
    } finally {
      setCheckInLoading(false);
    }
  };

  // Save assignment
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const body: Record<string, string | number> = {};
      if (smallGroup !== (selected.smallGroup || "")) body.smallGroup = smallGroup;
      if (largeGroup !== (selected.largeGroup || "")) body.largeGroup = largeGroup;
      if (cabinName !== (selected.cabinName || "")) body.cabinName = cabinName;
      const currentNoShow = (selected as Camper & { noShow?: number }).noShow === 1;
      if (noShow !== currentNoShow) body.noShow = noShow ? 1 : 0;

      if (Object.keys(body).length === 0) {
        setSaveMsg("No changes to save.");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/campers/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveMsg("Saved!");
        setSelected(null);
        fetchFeed();
        fetchNoShows();
      } else {
        const err = await res.json();
        setSaveMsg(err.error || "Save failed");
      }
    } catch {
      setSaveMsg("Network error");
    } finally {
      setSaving(false);
    }
  };

  // Drill-down into camper history
  const toggleHistory = async (camperId: number) => {
    if (expandedCamper === camperId) {
      setExpandedCamper(null);
      return;
    }
    setExpandedCamper(camperId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/camper-edits?camperId=${camperId}&limit=50`);
      const data = await res.json();
      setCamperHistory(data);
    } catch {
      setCamperHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Unmark no-show
  const handleUnmarkNoShow = async (camper: Camper) => {
    try {
      const res = await fetch(`/api/campers/${camper.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noShow: 0 }),
      });
      if (res.ok) {
        fetchFeed();
        fetchNoShows();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold text-slate-900">Camp Movements</h1>

      {/* Quick Assignment Panel */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-sm text-slate-700">Quick Assignment</h2>
        </div>
        <div className="p-4 space-y-3">
          {/* Search */}
          {!selected && (
            <>
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
                  placeholder="Search camper by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-900">
                          {c.lastName}, {c.firstName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.smallGroup && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              {c.smallGroup}
                            </span>
                          )}
                          {c.cabinName && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              {c.cabinName}
                            </span>
                          )}
                          {(c as Camper & { noShow?: number }).noShow === 1 && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              No-Show
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Selected camper form */}
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {selected.lastName}, {selected.firstName}
                  </p>
                  {selected.school && (
                    <p className="text-xs text-slate-500">{selected.school}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelected(null); setSaveMsg(""); }}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                >
                  Clear
                </button>
              </div>

              {/* Check-in Status & Action */}
              <div className={`rounded-lg p-3 border ${
                checkInStatus === "arrived"
                  ? "bg-green-50 border-green-200"
                  : checkInStatus === "on_bus"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Check-in Status</p>
                    <p className={`text-sm font-semibold ${
                      checkInStatus === "arrived"
                        ? "text-green-700"
                        : checkInStatus === "on_bus"
                        ? "text-yellow-700"
                        : "text-slate-600"
                    }`}>
                      {checkInStatus === "arrived"
                        ? "Arrived at Camp"
                        : checkInStatus === "on_bus"
                        ? "On Bus"
                        : "Not Checked In"}
                    </p>
                  </div>
                  {checkInStatus === "not_checked_in" && (
                    <button
                      onClick={handleCheckIn}
                      disabled={checkInLoading}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-40"
                    >
                      {checkInLoading ? "..." : "Check In"}
                    </button>
                  )}
                  {checkInStatus === "on_bus" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleConfirmArrival}
                        disabled={checkInLoading}
                        className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition-colors disabled:opacity-40"
                      >
                        {checkInLoading ? "..." : "Confirm Arrival"}
                      </button>
                      <button
                        onClick={handleUndoCheckIn}
                        disabled={checkInLoading}
                        className="px-2 py-1.5 text-slate-400 hover:text-red-600 text-xs transition-colors disabled:opacity-40"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                  {checkInStatus === "arrived" && (
                    <button
                      onClick={handleUndoCheckIn}
                      disabled={checkInLoading}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 transition-colors disabled:opacity-40"
                    >
                      {checkInLoading ? "..." : "Undo"}
                    </button>
                  )}
                </div>
              </div>

              {/* Small Group */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Small Group</label>
                <select
                  value={smallGroup}
                  onChange={(e) => handleSmallGroupChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  {options.smallGroups.map((sg) => (
                    <option key={sg} value={sg}>{sg}</option>
                  ))}
                </select>
              </div>

              {/* Large Group (auto-set, read-only display) */}
              {largeGroup && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Large Group (auto)</label>
                  <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
                    {largeGroup}
                  </div>
                </div>
              )}

              {/* Cabin */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cabin</label>
                <select
                  value={cabinName}
                  onChange={(e) => setCabinName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  {options.cabinNames.map((cn) => (
                    <option key={cn} value={cn}>{cn}</option>
                  ))}
                </select>
              </div>

              {/* No-Show Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">No-Show</label>
                <button
                  onClick={() => setNoShow(!noShow)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    noShow ? "bg-red-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      noShow ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              {saveMsg && (
                <div className={`text-sm text-center ${
                  saveMsg === "Saved!" ? "text-green-600" : saveMsg === "No changes to save." ? "text-slate-500" : "text-red-600"
                }`}>
                  {saveMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Groups & Buses */}
      {busStats.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-sm text-slate-700">Buses</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {busStats.map((bus) => (
              <div
                key={bus.busNumber}
                className="rounded-lg border border-slate-200 p-3"
              >
                <p className="text-sm font-semibold text-slate-900 mb-1">Bus {bus.busNumber}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Assigned</span>
                    <span className="text-xs font-medium text-slate-700">{bus.assigned}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-yellow-600">On Bus</span>
                    <span className="text-xs font-medium text-yellow-700">{bus.checkedIn}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600">Arrived</span>
                    <span className="text-xs font-medium text-green-700">{bus.arrived}</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${bus.assigned > 0 ? Math.round((bus.arrived / bus.assigned) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Feed */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setTab("changes")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tab === "changes"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Recent Changes
          </button>
          <button
            onClick={() => setTab("noshows")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tab === "noshows"
                ? "text-red-600 border-b-2 border-red-600 bg-red-50/50"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            No-Shows{noShowCampers.length > 0 && ` (${noShowCampers.length})`}
          </button>
        </div>

        {/* Recent Changes Tab */}
        {tab === "changes" && (
          <div className="divide-y divide-slate-100">
            {feedLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : feed.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No movement changes yet.
              </div>
            ) : (
              feed.map((edit) => (
                <div key={edit.id}>
                  <button
                    onClick={() => toggleHistory(edit.camperId)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">
                          <span className="font-medium text-blue-600">
                            {edit.camperFirstName} {edit.camperLastName}
                          </span>
                          {" \u2014 "}
                          {formatFieldChange(edit)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          by {edit.changedBy} &middot; {new Date(edit.changedAt).toLocaleString()}
                        </p>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-300 mt-1 transition-transform ${
                          expandedCamper === edit.camperId ? "rotate-90" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Drill-down history */}
                  {expandedCamper === edit.camperId && (
                    <div className="bg-slate-50 border-t border-slate-100 px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        All changes for {edit.camperFirstName} {edit.camperLastName}
                      </p>
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        </div>
                      ) : camperHistory.length === 0 ? (
                        <p className="text-xs text-slate-400">No changes recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {camperHistory.map((h) => (
                            <div key={h.id} className="text-xs text-slate-600">
                              <span className="font-medium">{FIELD_LABELS[h.fieldName] || h.fieldName}</span>
                              {": "}
                              {h.fieldName === "noShow"
                                ? (h.newValue === "1" ? "marked No-Show" : "unmarked No-Show")
                                : `${h.oldValue || "(none)"} \u2192 ${h.newValue || "(none)"}`}
                              <span className="text-slate-400 ml-1">
                                &middot; {h.changedBy} &middot; {new Date(h.changedAt).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* No-Shows Tab */}
        {tab === "noshows" && (
          <div className="divide-y divide-slate-100">
            {noShowCampers.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No campers marked as no-show.
              </div>
            ) : (
              noShowCampers.map((c) => (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {c.lastName}, {c.firstName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.cabinName && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {c.cabinName}
                        </span>
                      )}
                      {c.smallGroup && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {c.smallGroup}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnmarkNoShow(c)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
