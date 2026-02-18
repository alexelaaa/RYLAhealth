"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";

interface CabinCamper {
  id: number;
  firstName: string;
  lastName: string;
  gender: string | null;
}

interface Cabin {
  name: string;
  count: number;
  campers: CabinCamper[];
}

export default function CabinsPage() {
  return (
    <AppShell>
      <CabinsContent />
    </AppShell>
  );
}

function CabinsContent() {
  const { campWeekend } = useCamp();
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const params = campWeekend ? `?weekend=${encodeURIComponent(campWeekend)}` : "";
    fetch(`/api/cabins${params}`)
      .then((r) => r.json())
      .then((data) => {
        setCabins(data.cabins || []);
        setExpanded(new Set());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend]);

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Cabins</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : cabins.length === 0 ? (
        <div className="bg-white rounded-xl p-6 border border-slate-100 text-center text-sm text-slate-400">
          No cabin assignments yet
        </div>
      ) : (
        <div className="space-y-2">
          {cabins.map((cabin) => {
            const isExpanded = expanded.has(cabin.name);
            return (
              <div key={cabin.name} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleExpand(cabin.name)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">Cabin {cabin.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {cabin.count}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-2">
                    <div className="divide-y divide-slate-50">
                      {cabin.campers.map((c) => (
                        <Link
                          key={c.id}
                          href={`/campers/${c.id}`}
                          className="block py-2 hover:bg-slate-50 -mx-4 px-4 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-700">
                              {c.firstName} {c.lastName}
                            </span>
                            {c.gender && (
                              <span className="text-xs text-slate-400">{c.gender}</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
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
