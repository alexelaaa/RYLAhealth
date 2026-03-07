"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { useDebounce } from "@/hooks/useDebounce";

interface MedCheckinCamper {
  id: number;
  firstName: string;
  lastName: string;
  campWeekend: string;
  currentMedications: string;
  checkedInAt: string | null;
  checkedInBy: string | null;
  notes: string | null;
  checkedOutAt: string | null;
  checkedOutBy: string | null;
  checkoutNotes: string | null;
}

type Tab = "checkin" | "checkout";

export default function MedicationCheckinPage() {
  return (
    <AppShell>
      <MedicationCheckinContent />
    </AppShell>
  );
}

function MedicationCheckinContent() {
  const { campWeekend, session } = useCamp();
  const [campers, setCampers] = useState<MedCheckinCamper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("checkin");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notesMap, setNotesMap] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 200);

  const isAllowed = session?.role === "nurse" || session?.role === "admin";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const weekendParam = campWeekend
        ? `?weekend=${encodeURIComponent(campWeekend)}`
        : "";
      const res = await fetch(`/api/medication-checkins${weekendParam}`);
      const data = await res.json();
      setCampers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [campWeekend]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (
    camperId: number,
    action: "checkin" | "checkout"
  ) => {
    setSavingId(camperId);
    try {
      const res = await fetch("/api/medication-checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camperId,
          action,
          notes: notesMap[camperId] || undefined,
          checkedBy: session?.label || session?.role || "nurse",
        }),
      });
      if (res.ok) {
        await fetchData();
        setExpandedId(null);
        setNotesMap((prev) => {
          const next = { ...prev };
          delete next[camperId];
          return next;
        });
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

  // Split into categories based on tab
  const notCheckedIn = filtered.filter((c) => !c.checkedInAt);
  const checkedIn = filtered.filter((c) => c.checkedInAt && !c.checkedOutAt);
  const checkedOut = filtered.filter((c) => c.checkedOutAt);

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
        <h1 className="text-xl font-bold text-slate-900">Med Check-In/Out</h1>
        <span className="text-xs text-slate-400">
          {filtered.length} campers{campWeekend ? ` · ${campWeekend}` : ""}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-yellow-50 rounded-xl p-2.5 border border-yellow-100 text-center">
          <p className="text-lg font-bold text-yellow-600">{notCheckedIn.length}</p>
          <p className="text-[10px] text-yellow-500">Pending</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2.5 border border-green-100 text-center">
          <p className="text-lg font-bold text-green-600">{checkedIn.length}</p>
          <p className="text-[10px] text-green-500">Checked In</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2.5 border border-green-200 text-center">
          <p className="text-lg font-bold text-green-700">{checkedOut.length}</p>
          <p className="text-[10px] text-green-600">Returned</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 -mx-4 px-4">
        <button
          onClick={() => setTab("checkin")}
          className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "checkin"
              ? "border-green-700 text-green-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Check In ({notCheckedIn.length + checkedIn.length})
        </button>
        <button
          onClick={() => setTab("checkout")}
          className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "checkout"
              ? "border-green-700 text-green-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Check Out ({checkedIn.length + checkedOut.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
        </div>
      ) : tab === "checkin" ? (
        <CheckinTab
          notCheckedIn={notCheckedIn}
          checkedIn={checkedIn}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          notesMap={notesMap}
          setNotesMap={setNotesMap}
          savingId={savingId}
          onAction={handleAction}
        />
      ) : (
        <CheckoutTab
          checkedIn={checkedIn}
          checkedOut={checkedOut}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          notesMap={notesMap}
          setNotesMap={setNotesMap}
          savingId={savingId}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

function CheckinTab({
  notCheckedIn,
  checkedIn,
  expandedId,
  setExpandedId,
  notesMap,
  setNotesMap,
  savingId,
  onAction,
}: {
  notCheckedIn: MedCheckinCamper[];
  checkedIn: MedCheckinCamper[];
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  notesMap: Record<number, string>;
  setNotesMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  savingId: number | null;
  onAction: (camperId: number, action: "checkin" | "checkout") => void;
}) {
  return (
    <div className="space-y-4">
      {notCheckedIn.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Not Yet Received ({notCheckedIn.length})
          </h2>
          {notCheckedIn.map((c) => (
            <CamperRow
              key={c.id}
              camper={c}
              expanded={expandedId === c.id}
              onToggle={() =>
                setExpandedId(expandedId === c.id ? null : c.id)
              }
              notes={notesMap[c.id] || ""}
              onNotesChange={(val) =>
                setNotesMap((prev) => ({ ...prev, [c.id]: val }))
              }
              saving={savingId === c.id}
              actionLabel="Check In Meds"
              actionColor="bg-green-600 hover:bg-green-700"
              onAction={() => onAction(c.id, "checkin")}
              statusBadge={null}
            />
          ))}
        </div>
      )}

      {checkedIn.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Already Received ({checkedIn.length})
          </h2>
          {checkedIn.map((c) => (
            <CamperRow
              key={c.id}
              camper={c}
              expanded={expandedId === c.id}
              onToggle={() =>
                setExpandedId(expandedId === c.id ? null : c.id)
              }
              notes={notesMap[c.id] || ""}
              onNotesChange={(val) =>
                setNotesMap((prev) => ({ ...prev, [c.id]: val }))
              }
              saving={savingId === c.id}
              actionLabel={null}
              actionColor=""
              onAction={() => {}}
              statusBadge={
                <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  Received
                </span>
              }
            />
          ))}
        </div>
      )}

      {notCheckedIn.length === 0 && checkedIn.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No campers with medications found.
        </div>
      )}
    </div>
  );
}

function CheckoutTab({
  checkedIn,
  checkedOut,
  expandedId,
  setExpandedId,
  notesMap,
  setNotesMap,
  savingId,
  onAction,
}: {
  checkedIn: MedCheckinCamper[];
  checkedOut: MedCheckinCamper[];
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  notesMap: Record<number, string>;
  setNotesMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  savingId: number | null;
  onAction: (camperId: number, action: "checkin" | "checkout") => void;
}) {
  return (
    <div className="space-y-4">
      {checkedIn.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Ready to Return ({checkedIn.length})
          </h2>
          {checkedIn.map((c) => (
            <CamperRow
              key={c.id}
              camper={c}
              expanded={expandedId === c.id}
              onToggle={() =>
                setExpandedId(expandedId === c.id ? null : c.id)
              }
              notes={notesMap[c.id] || ""}
              onNotesChange={(val) =>
                setNotesMap((prev) => ({ ...prev, [c.id]: val }))
              }
              saving={savingId === c.id}
              actionLabel="Return Meds"
              actionColor="bg-green-700 hover:bg-green-800"
              onAction={() => onAction(c.id, "checkout")}
              statusBadge={
                <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  Received
                </span>
              }
            />
          ))}
        </div>
      )}

      {checkedOut.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Already Returned ({checkedOut.length})
          </h2>
          {checkedOut.map((c) => (
            <CamperRow
              key={c.id}
              camper={c}
              expanded={expandedId === c.id}
              onToggle={() =>
                setExpandedId(expandedId === c.id ? null : c.id)
              }
              notes={notesMap[c.id] || ""}
              onNotesChange={(val) =>
                setNotesMap((prev) => ({ ...prev, [c.id]: val }))
              }
              saving={savingId === c.id}
              actionLabel={null}
              actionColor=""
              onAction={() => {}}
              statusBadge={
                <span className="text-[10px] font-medium bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                  Returned
                </span>
              }
            />
          ))}
        </div>
      )}

      {checkedIn.length === 0 && checkedOut.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No medications have been checked in yet.
        </div>
      )}
    </div>
  );
}

function CamperRow({
  camper,
  expanded,
  onToggle,
  notes,
  onNotesChange,
  saving,
  actionLabel,
  actionColor,
  onAction,
  statusBadge,
}: {
  camper: MedCheckinCamper;
  expanded: boolean;
  onToggle: () => void;
  notes: string;
  onNotesChange: (val: string) => void;
  saving: boolean;
  actionLabel: string | null;
  actionColor: string;
  onAction: () => void;
  statusBadge: React.ReactNode;
}) {
  const checkinNotes = camper.notes;
  const checkoutNotes = camper.checkoutNotes;
  const checkedInTime = camper.checkedInAt
    ? new Date(camper.checkedInAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const checkedOutTime = camper.checkedOutAt
    ? new Date(camper.checkedOutAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900">
              {camper.lastName}, {camper.firstName}
            </span>
            {statusBadge}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
            {camper.currentMedications}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Full medication text */}
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
            {camper.currentMedications}
          </p>

          {/* Existing check-in info */}
          {checkedInTime && (
            <p className="text-xs text-slate-500">
              Received: {checkedInTime}
              {camper.checkedInBy ? ` by ${camper.checkedInBy}` : ""}
              {checkinNotes ? ` — ${checkinNotes}` : ""}
            </p>
          )}
          {checkedOutTime && (
            <p className="text-xs text-slate-500">
              Returned: {checkedOutTime}
              {camper.checkedOutBy ? ` by ${camper.checkedOutBy}` : ""}
              {checkoutNotes ? ` — ${checkoutNotes}` : ""}
            </p>
          )}

          {/* Action area */}
          {actionLabel && (
            <div className="space-y-2 pt-1">
              <input
                type="text"
                placeholder="Notes (e.g. 2 inhalers, 1 EpiPen)..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                disabled={saving}
                className={`w-full text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 ${actionColor}`}
              >
                {saving ? "Saving..." : actionLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
