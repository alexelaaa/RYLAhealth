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

interface ReportData {
  totals: { total: number; male: number; female: number };
  largeGroups: CountRow[];
  smallGroups: CountRow[];
  cabins: CountRow[];
  buses: CountRow[];
  busStops: CountRow[];
  dglCabins: DGLCabinRow[];
}

type Tab = "groups" | "cabins" | "buses";

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
        <div className="bg-white rounded-xl p-6 border border-slate-100 text-center text-sm text-slate-400">
          Failed to load report data
        </div>
      ) : tab === "groups" ? (
        <GroupsReport data={data} />
      ) : tab === "cabins" ? (
        <CabinsReport data={data} />
      ) : (
        <BusesReport data={data} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const bg = color === "blue" ? "bg-blue-50" : color === "pink" ? "bg-pink-50" : "bg-slate-50";
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
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide w-16">Total</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide w-12">M</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide w-12">F</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 font-medium text-slate-900">{r.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.total}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-blue-600">{r.male}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-pink-600">{r.female}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
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
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Sleeping Cabin</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">DGL</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Small Group</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Gender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.smallGroup} className="hover:bg-slate-50 transition-colors">
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
              <tr className="bg-slate-50 border-t border-slate-200">
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
