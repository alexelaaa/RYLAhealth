"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";

interface Announcement {
  id: number;
  title: string;
  body: string;
  priority: string;
  posted_by: string;
  active: number;
  created_at: string;
}

export default function AnnouncementsPage() {
  return (
    <AppShell>
      <AnnouncementsContent />
    </AppShell>
  );
}

function AnnouncementsContent() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setMsg("");
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), priority }),
      });
      if (res.ok) {
        setTitle("");
        setBody("");
        setPriority("normal");
        setMsg("Announcement posted & notifications sent!");
        fetchAnnouncements();
        setTimeout(() => setMsg(""), 3000);
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMsg(err.error || "Failed to post");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: number, currentlyActive: number) => {
    try {
      await fetch("/api/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !currentlyActive }),
      });
      fetchAnnouncements();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch("/api/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchAnnouncements();
    } catch { /* ignore */ }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold text-slate-900">Announcements</h1>

      {/* New announcement form */}
      <div className="bg-white rounded-xl border border-slate-300 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Post New Announcement</p>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        {/* Priority toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Priority</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button
              onClick={() => setPriority("normal")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                priority === "normal"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-500"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setPriority("urgent")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                priority === "urgent"
                  ? "bg-red-600 text-white"
                  : "bg-white text-slate-500"
              }`}
            >
              Urgent
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !body.trim()}
          className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {submitting ? "Posting..." : "Post & Notify Everyone"}
        </button>

        {msg && (
          <p className={`text-sm text-center ${msg.includes("posted") ? "text-green-600" : "text-red-600"}`}>
            {msg}
          </p>
        )}
      </div>

      {/* Existing announcements */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-slate-300 text-center text-sm text-slate-400">
          No announcements yet
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border overflow-hidden ${
                !a.active ? "opacity-50" : ""
              } ${
                a.priority === "urgent" ? "border-red-300" : "border-slate-300"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.priority === "urgent" && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          URGENT
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        a.active ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100"
                      }`}>
                        {a.active ? "ACTIVE" : "HIDDEN"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1">{a.title}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{a.body}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {a.posted_by} &middot; {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => toggleActive(a.id, a.active)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                      a.active
                        ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    }`}
                  >
                    {a.active ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors border border-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
