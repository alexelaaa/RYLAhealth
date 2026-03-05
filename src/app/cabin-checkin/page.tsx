"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InstallPrompt from "@/components/InstallPrompt";

interface CamperCheckin {
  id: number;
  firstName: string;
  lastName: string;
  cabinName: string;
  friday: boolean;
  saturday: boolean;
}

type Night = "friday" | "saturday";

const TICKET_CATEGORIES = ["Medical", "Forgot Item", "Behavioral", "Maintenance", "Other"];

interface HelpTicket {
  id: number;
  category: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export default function CabinCheckinPage() {
  const [campers, setCampers] = useState<CamperCheckin[]>([]);
  const [cabin, setCabin] = useState("");
  const [label, setLabel] = useState("");
  const [night, setNight] = useState<Night>("friday");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const router = useRouter();

  // Help ticket state
  const [showHelp, setShowHelp] = useState(false);
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketUrgent, setTicketUrgent] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketMsg, setTicketMsg] = useState("");
  const [myTickets, setMyTickets] = useState<HelpTicket[]>([]);

  const fetchCampers = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionData.isLoggedIn || sessionData.role !== "dgl") {
        router.push("/login");
        return;
      }
      setLabel(sessionData.label);

      const res = await fetch("/api/cabin-checkins");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCampers(data.campers);
      setCabin(data.cabin || "");
    } catch {
      // Network error
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchCampers();
  }, [fetchCampers]);

  // Fetch my tickets
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/help-tickets");
      if (res.ok) {
        const data = await res.json();
        setMyTickets(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const submitTicket = async () => {
    if (!ticketCategory || !ticketDesc.trim()) return;
    setTicketSubmitting(true);
    setTicketMsg("");
    try {
      const res = await fetch("/api/help-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabin,
          category: ticketCategory,
          description: ticketDesc.trim(),
          urgency: ticketUrgent ? "urgent" : "normal",
        }),
      });
      if (res.ok) {
        setTicketMsg("Help request sent!");
        setTicketCategory("");
        setTicketDesc("");
        setTicketUrgent(false);
        fetchTickets();
        setTimeout(() => setTicketMsg(""), 3000);
      } else {
        setTicketMsg("Failed to send");
      }
    } catch {
      setTicketMsg("Network error");
    } finally {
      setTicketSubmitting(false);
    }
  };

  const togglePresent = async (camperId: number) => {
    setToggling(camperId);
    const camper = campers.find((c) => c.id === camperId);
    if (!camper) return;

    const currentPresent = night === "friday" ? camper.friday : camper.saturday;
    const newPresent = !currentPresent;

    // Optimistic update
    setCampers((prev) =>
      prev.map((c) =>
        c.id === camperId ? { ...c, [night]: newPresent } : c
      )
    );

    try {
      await fetch("/api/cabin-checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camperId, night, present: newPresent }),
      });
    } catch {
      // Revert on error
      setCampers((prev) =>
        prev.map((c) =>
          c.id === camperId ? { ...c, [night]: currentPresent } : c
        )
      );
    }
    setToggling(null);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const presentCount = campers.filter((c) => (night === "friday" ? c.friday : c.saturday)).length;
  const totalCount = campers.length;

  // Extract DGL name from label: "DGL: FirstName LastName (Cabin 16C)" → "FirstName LastName"
  const dglName = label.replace(/^DGL:\s*/, "").replace(/\s*\(.*\)$/, "");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-blue-700 text-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div>
            <h1 className="text-lg font-bold">{cabin || "Cabin Check-In"}</h1>
            <p className="text-xs text-blue-200">{dglName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-blue-200 hover:text-white px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <InstallPrompt />

        {/* Quick Links */}
        <div className="flex gap-2">
          <Link
            href="/schedule"
            className="flex-1 bg-green-50 text-green-700 rounded-xl py-3 text-center text-sm font-medium hover:bg-green-100 transition-colors"
          >
            Schedule
          </Link>
          <Link
            href="/map"
            className="flex-1 bg-emerald-50 text-emerald-700 rounded-xl py-3 text-center text-sm font-medium hover:bg-emerald-100 transition-colors"
          >
            Camp Map
          </Link>
          <a
            href="http://ryla5330.org/wp-content/uploads/2026/03/RYLA-Packet-2026.docx.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-violet-50 text-violet-700 rounded-xl py-3 text-center text-sm font-medium hover:bg-violet-100 transition-colors"
          >
            RYLA Packet
          </a>
        </div>

        {/* Help Request */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
            showHelp
              ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {showHelp ? "Close" : "Request Help"}
        </button>

        {showHelp && (
          <div className="bg-white rounded-xl border border-slate-300 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Submit a Help Request</p>

            {/* Category */}
            <div className="flex flex-wrap gap-2">
              {TICKET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTicketCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    ticketCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Description */}
            <textarea
              value={ticketDesc}
              onChange={(e) => setTicketDesc(e.target.value)}
              placeholder="Describe the issue..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            {/* Urgency toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Urgent?</span>
              <button
                onClick={() => setTicketUrgent(!ticketUrgent)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  ticketUrgent ? "bg-red-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    ticketUrgent ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {/* Submit */}
            <button
              onClick={submitTicket}
              disabled={ticketSubmitting || !ticketCategory || !ticketDesc.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {ticketSubmitting ? "Sending..." : "Send Request"}
            </button>

            {ticketMsg && (
              <p className={`text-sm text-center ${ticketMsg === "Help request sent!" ? "text-green-600" : "text-red-600"}`}>
                {ticketMsg}
              </p>
            )}

            {/* My recent tickets */}
            {myTickets.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-2">My Requests</p>
                <div className="space-y-2">
                  {myTickets.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        t.status === "resolved"
                          ? "bg-green-50 border border-green-200"
                          : t.urgency === "urgent"
                          ? "bg-red-50 border border-red-200"
                          : "bg-slate-50 border border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">{t.category}</span>
                        <span className={`font-medium ${t.status === "resolved" ? "text-green-600" : "text-amber-600"}`}>
                          {t.status === "resolved" ? "Resolved" : "Open"}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{t.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Night toggle */}
        <div className="flex rounded-xl overflow-hidden bg-white shadow-sm">
          {(["friday", "saturday"] as Night[]).map((n) => (
            <button
              key={n}
              onClick={() => setNight(n)}
              className={`flex-1 py-3 text-center font-semibold text-lg transition-colors ${
                night === n
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {n === "friday" ? "Friday Night" : "Saturday Night"}
            </button>
          ))}
        </div>

        {/* Summary counter */}
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <span className="text-3xl font-bold text-slate-900">{presentCount}</span>
          <span className="text-xl text-slate-400">/{totalCount}</span>
          <p className="text-sm text-slate-500 mt-1">Present</p>
        </div>

        {/* Camper list */}
        <div className="space-y-2">
          {campers.map((c) => {
            const isPresent = night === "friday" ? c.friday : c.saturday;
            return (
              <button
                key={c.id}
                onClick={() => togglePresent(c.id)}
                disabled={toggling === c.id}
                className={`w-full flex items-center justify-between p-4 rounded-xl shadow-sm transition-all active:scale-[0.98] ${
                  isPresent
                    ? "bg-green-50 border-2 border-green-400"
                    : "bg-white border-2 border-transparent"
                }`}
              >
                <div className="text-left">
                  <p className="text-lg font-semibold text-slate-900">
                    {c.lastName}, {c.firstName}
                  </p>
                  <p className="text-xs text-slate-400">{c.cabinName}</p>
                </div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${
                    isPresent
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {isPresent ? "✓" : ""}
                </div>
              </button>
            );
          })}
        </div>

        {campers.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            No campers found for this cabin.
          </div>
        )}
      </div>
    </div>
  );
}
