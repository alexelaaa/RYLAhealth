"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { useDebounce } from "@/hooks/useDebounce";
import type { CampStaff } from "@/types";

type StaffTab = "alumni" | "adult";

export default function StaffPage() {
  return (
    <AppShell>
      <StaffContent />
    </AppShell>
  );
}

function StaffContent() {
  const { campWeekend, session } = useCamp();
  const [tab, setTab] = useState<StaffTab>("alumni");
  const [staff, setStaff] = useState<CampStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);

  const isAdmin = session?.role === "admin";

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: tab });
      if (campWeekend) params.set("weekend", campWeekend);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/camp-staff?${params}`);
      const data = await res.json();
      setStaff(data.staff || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tab, campWeekend, debouncedSearch]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this staff member?")) return;
    try {
      await fetch(`/api/camp-staff/${id}`, { method: "DELETE" });
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Camp Staff</h1>
        {isAdmin && (
          <Link
            href="/staff/new"
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Add Staff
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("alumni")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "alumni"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Alumni
        </button>
        <button
          onClick={() => setTab("adult")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "adult"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Adults
        </button>
      </div>

      {/* Search */}
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
          placeholder="Search by name or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          No {tab === "alumni" ? "alumni" : "adult staff"} found.
          {isAdmin && " Tap + Add Staff to create one."}
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl p-4 border border-slate-100"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {s.firstName} {s.lastName}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {s.staffRole && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {s.staffRole}
                      </span>
                    )}
                    {s.campWeekend && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {s.campWeekend}
                      </span>
                    )}
                  </div>
                  {(s.phone || s.email) && (
                    <div className="flex items-center gap-3 mt-1.5">
                      {s.phone && (
                        <a href={`tel:${s.phone}`} className="text-xs text-blue-600">
                          {s.phone}
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`} className="text-xs text-blue-600 truncate">
                          {s.email}
                        </a>
                      )}
                    </div>
                  )}
                  {s.notes && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.notes}</p>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs text-slate-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
