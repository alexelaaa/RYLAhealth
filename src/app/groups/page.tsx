"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";

interface GroupCamper {
  id: number;
  firstName: string;
  lastName: string;
}

interface Group {
  name: string;
  count: number;
  smallGroups?: string[];
  campers: GroupCamper[];
}

export default function GroupsPage() {
  return (
    <AppShell>
      <GroupsContent />
    </AppShell>
  );
}

function GroupsContent() {
  const { campWeekend } = useCamp();
  const [tab, setTab] = useState<"large" | "small">("large");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (campWeekend) params.set("weekend", campWeekend);
    params.set("type", tab);

    fetch(`/api/groups?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.groups || []);
        setExpanded(new Set());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campWeekend, tab]);

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
      <h1 className="text-xl font-bold text-slate-900">Groups</h1>

      {/* Tab switcher */}
      <div className="flex border-b border-slate-200 -mx-4 px-4">
        <button
          onClick={() => setTab("large")}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "large"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Large Groups
        </button>
        <button
          onClick={() => setTab("small")}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "small"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Small Groups
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl p-6 border border-slate-100 text-center text-sm text-slate-400">
          No group assignments yet
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isExpanded = expanded.has(group.name);
            return (
              <div key={group.name} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleExpand(group.name)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">{group.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {group.count}
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
                    {tab === "large" && group.smallGroups && group.smallGroups.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-slate-50">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Small Groups</p>
                        <div className="flex flex-wrap gap-1">
                          {group.smallGroups.map((sg) => (
                            <span key={sg} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {sg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="divide-y divide-slate-50">
                      {group.campers.map((c) => (
                        <Link
                          key={c.id}
                          href={`/campers/${c.id}`}
                          className="block py-2 hover:bg-slate-50 -mx-4 px-4 transition-colors"
                        >
                          <span className="text-sm text-slate-700">
                            {c.firstName} {c.lastName}
                          </span>
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
