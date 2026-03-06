"use client";

import { useState, useEffect, useCallback } from "react";

interface Announcement {
  id: number;
  title: string;
  body: string;
  priority: string;
  posted_by: string;
  created_at: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 60_000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`rounded-xl border p-3 ${
            a.priority === "urgent"
              ? "bg-red-50 border-red-300"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {a.priority === "urgent" && (
                  <span className="text-[10px] font-bold uppercase text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                    Urgent
                  </span>
                )}
                <span className={`text-sm font-bold ${a.priority === "urgent" ? "text-red-900" : "text-amber-900"}`}>
                  {a.title}
                </span>
              </div>
              <p className={`text-sm mt-1 ${a.priority === "urgent" ? "text-red-800" : "text-amber-800"}`}>
                {a.body}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {a.posted_by} &middot; {new Date(a.created_at).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
              className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
