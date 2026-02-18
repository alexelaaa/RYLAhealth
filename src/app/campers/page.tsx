"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import CamperSearch from "@/components/campers/CamperSearch";
import CamperCard from "@/components/campers/CamperCard";
import { useDebounce } from "@/hooks/useDebounce";
import { useCamp } from "@/lib/camp-context";
import type { Camper } from "@/types";

export default function CampersPage() {
  return (
    <AppShell>
      <CampersContent />
    </AppShell>
  );
}

function CampersContent() {
  const { campWeekend, session } = useCamp();
  const [campers, setCampers] = useState<Camper[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const fetchCampers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (campWeekend) params.set("weekend", campWeekend);
    if (role) params.set("role", role);

    try {
      const res = await fetch(`/api/campers?${params}`);
      const data = await res.json();
      setCampers(data.campers);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch campers:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, campWeekend, role]);

  useEffect(() => {
    fetchCampers();
  }, [fetchCampers]);

  return (
    <>
      <CamperSearch
        search={search}
        onSearchChange={setSearch}
        role={role}
        onRoleChange={setRole}
      />

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-500">
            {loading ? "Loading..." : `${total} camper${total !== 1 ? "s" : ""}`}
          </p>
          {session?.role === "admin" && (
            <Link
              href="/campers/new"
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Camper
            </Link>
          )}
        </div>

        <div className="space-y-2">
          {campers.map((camper) => (
            <CamperCard key={camper.id} camper={camper} />
          ))}
        </div>

        {!loading && campers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p>No campers found</p>
          </div>
        )}
      </div>
    </>
  );
}
