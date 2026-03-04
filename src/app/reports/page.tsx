"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";

interface CountRow {
  name: string;
  total: number;
  male: number;
  female: number;
}

interface DGLCabinRow {
  cabin: string;
  dglName: string;
  smallGroup: string;
  largeGroup: string;
  gender: string;
}

interface InsuranceCamper {
  id: number;
  firstName: string;
  lastName: string;
  school: string | null;
  campWeekend: string;
  hasInsurance: string | null;
  insuranceProvider: string | null;
  policyNumber: string | null;
  guardianFirstName: string | null;
  guardianLastName: string | null;
  guardianPhone: string | null;
}

interface ReportData {
  totals: { total: number; male: number; female: number };
  largeGroups: CountRow[];
  smallGroups: CountRow[];
  cabins: CountRow[];
  buses: CountRow[];
  busStops: CountRow[];
  dglCabins: DGLCabinRow[];
  insuranceAudit: {
    missing: InsuranceCamper[];
    totalCampers: number;
    missingCount: number;
  };
}

type Tab = "groups" | "cabins" | "buses" | "insurance";

export default function ReportsPage() {
  return (
    <AppShell>
      <ReportsContent />
    </AppShell>
  );
}

function ReportsContent() {
  const { campWeekend } = useCamp();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("groups");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (campWeekend) params.set("weekend", campWeekend);

    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "groups", label: "Groups" },
    { key: "cabins", label: "Cabins" },
    { key: "buses", label: "Buses" },
    { key: "insurance", label: "Insurance" },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-blue-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Reports</h1>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Total" value={data.totals.total} />
          <SummaryCard label="Male" value={data.totals.male} color="blue" />
          <SummaryCard label="Female" value={data.totals.female} color="pink" />
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-slate-200 -mx-4 px-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !data ? (
        <div className="bg-white rounded-xl p-6 border border-slate-300 text-center text-sm text-slate-400">
          Failed to load report data
        </div>
      ) : tab === "groups" ? (
        <GroupsReport data={data} />
      ) : tab === "cabins" ? (
        <CabinsReport data={data} />
      ) : tab === "buses" ? (
        <BusesReport data={data} />
      ) : (
        <InsuranceReport audit={data.insuranceAudit} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const bg = color === "blue" ? "bg-blue-50" : color === "pink" ? "bg-pink-50" : "bg-slate-100";
  const text = color === "blue" ? "text-blue-700" : color === "pink" ? "text-pink-700" : "text-slate-900";

  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className={`text-2xl font-bold ${text}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function CountTable({ rows, label }: { rows: CountRow[]; label: string }) {
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide w-16">Total</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide w-12">M</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide w-12">F</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-slate-100 transition-colors">
                <td className="px-3 py-2.5 font-medium text-slate-900">{r.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.total}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-blue-600">{r.male}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-pink-600">{r.female}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t border-slate-200 font-semibold">
              <td className="px-3 py-2.5 text-slate-700">Total</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{grandTotal}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">{rows.reduce((s, r) => s + r.male, 0)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-pink-700">{rows.reduce((s, r) => s + r.female, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function GroupsReport({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <CountTable rows={data.largeGroups} label="Large Group" />
      <CountTable rows={data.smallGroups} label="Small Group" />
    </div>
  );
}

function CabinsReport({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <CountTable rows={data.cabins} label="Camper Cabin" />
      {data.dglCabins.length > 0 && <DGLCabinTable rows={data.dglCabins} />}
    </div>
  );
}

function DGLCabinTable({ rows }: { rows: DGLCabinRow[] }) {
  // Group DGLs by cabin for count summary
  const cabinMap = new Map<string, DGLCabinRow[]>();
  for (const r of rows) {
    if (!cabinMap.has(r.cabin)) cabinMap.set(r.cabin, []);
    cabinMap.get(r.cabin)!.push(r);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">DGL Sleeping Cabins</h3>
      <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Sleeping Cabin</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">DGL</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Small Group</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Gender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.smallGroup} className="hover:bg-slate-100 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded font-medium">
                      {r.cabin}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{r.dglName}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.smallGroup}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.gender}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t border-slate-200">
                <td className="px-3 py-2.5 font-semibold text-slate-700" colSpan={4}>
                  {rows.length} DGLs across {cabinMap.size} cabins
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function BusesReport({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <CountTable rows={data.buses} label="Bus" />
      <CountTable rows={data.busStops} label="Bus Stop" />
    </div>
  );
}

function InsuranceReport({ audit }: { audit: ReportData["insuranceAudit"] }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ hasInsurance: "", insuranceProvider: "", policyNumber: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const startEdit = (c: InsuranceCamper) => {
    setEditingId(c.id);
    setForm({
      hasInsurance: c.hasInsurance || "",
      insuranceProvider: c.insuranceProvider || "",
      policyNumber: c.policyNumber || "",
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved((prev) => new Set(prev).add(editingId));
        setEditingId(null);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const covered = audit.totalCampers - audit.missingCount;
  const pct = audit.totalCampers > 0 ? Math.round((covered / audit.totalCampers) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-300 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Insurance Coverage</span>
          <span className="text-sm font-bold text-slate-900">{covered} / {audit.totalCampers}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-green-600 font-medium">{pct}% covered</span>
          <span className="text-red-600 font-medium">{audit.missingCount} missing or incomplete</span>
        </div>
      </div>

      {/* Missing list */}
      {audit.missing.length === 0 ? (
        <div className="bg-green-50 rounded-xl p-6 border border-green-200 text-center text-sm text-green-700">
          All campers have insurance information on file.
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-700">
            Missing / Incomplete Insurance ({audit.missingCount})
          </h3>
          {audit.missing.map((c) => {
            const isEditing = editingId === c.id;
            const wasSaved = saved.has(c.id);

            return (
              <div key={c.id} className={`rounded-xl border overflow-hidden ${
                wasSaved ? "bg-green-50 border-green-200" : "bg-white border-slate-300"
              }`}>
                <button
                  onClick={() => isEditing ? setEditingId(null) : startEdit(c)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {c.lastName}, {c.firstName}
                        {wasSaved && <span className="text-green-600 ml-2 text-xs">Updated</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {c.school && <span className="text-xs text-slate-500">{c.school}</span>}
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c.campWeekend}</span>
                        {!c.hasInsurance || c.hasInsurance.toLowerCase() === "no" ? (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">No insurance</span>
                        ) : !c.insuranceProvider ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">No provider</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">No policy #</span>
                        )}
                      </div>
                      {c.guardianPhone && (
                        <a
                          href={`tel:${c.guardianPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 underline mt-0.5 inline-block"
                        >
                          {c.guardianFirstName} {c.guardianLastName}: {c.guardianPhone}
                        </a>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isEditing ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isEditing && (
                  <div className="border-t border-slate-200 px-4 py-3 space-y-3 bg-slate-50">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Has Insurance?</label>
                      <select
                        value={form.hasInsurance}
                        onChange={(e) => setForm({ ...form, hasInsurance: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Unknown</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Insurance Provider</label>
                      <input
                        type="text"
                        value={form.insuranceProvider}
                        onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })}
                        placeholder="e.g. Blue Cross, Kaiser..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Policy Number</label>
                      <input
                        type="text"
                        value={form.policyNumber}
                        onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
                        placeholder="Policy / Member ID"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                    >
                      {saving ? "Saving..." : "Save Insurance Info"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
