"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import InstallPrompt from "@/components/InstallPrompt";
import NotificationToggle from "@/components/NotificationToggle";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import PullToRefresh from "@/components/PullToRefresh";
import {
  getCampDay,
  getDetailedSchedule,
  type DetailedEvent,
} from "@/lib/schedule";

interface CamperCheckin {
  id: number;
  firstName: string;
  lastName: string;
  cabinName: string;
  arrival: boolean;
  friday: boolean;
  saturday: boolean;
}

type Night = "arrival" | "friday" | "saturday";

const TICKET_CATEGORIES = ["Medical", "Forgot Item", "Behavioral", "Maintenance", "Other"];

interface HelpTicket {
  id: number;
  category: string;
  description: string;
  urgency: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface GroupCamper {
  id: number;
  firstName: string;
  lastName: string;
}

interface GroupInfo {
  name: string;
  largeGroup: string | null;
  meetingLocation: string | null;
  campers: GroupCamper[];
}

type MainTab = "cabin" | "group";

export default function CabinCheckinPage() {
  const [mainTab, setMainTab] = useState<MainTab>("cabin");
  const [campers, setCampers] = useState<CamperCheckin[]>([]);
  const [cabin, setCabin] = useState("");
  const [label, setLabel] = useState("");
  const [dglSmallGroup, setDglSmallGroup] = useState("");
  const [campWeekend, setCampWeekend] = useState("");
  const [night, setNight] = useState<Night>("arrival");
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
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Record<number, TicketMessage[]>>({});
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [sendingReply, setSendingReply] = useState<number | null>(null);

  // QR slideshow state
  const [qrExpanded, setQrExpanded] = useState(false);

  // Group state
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);

  const fetchCampers = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionData.isLoggedIn || sessionData.role !== "dgl") {
        router.push("/login");
        return;
      }
      setLabel(sessionData.label);
      setDglSmallGroup(sessionData.dglSmallGroup || "");
      setCampWeekend(sessionData.campWeekend || "");

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

  // Auto-refresh tickets every 15s so DGL sees status updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets();
      // Also refresh messages for expanded ticket
      if (expandedTicketId) fetchTicketMessages(expandedTicketId);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchTickets, expandedTicketId]);

  const fetchTicketMessages = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/help-tickets/messages?ticketId=${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setTicketMessages((prev) => ({ ...prev, [ticketId]: data }));
      }
    } catch { /* ignore */ }
  };

  const toggleTicketThread = (ticketId: number) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
    } else {
      setExpandedTicketId(ticketId);
      fetchTicketMessages(ticketId);
    }
  };

  const sendTicketReply = async (ticketId: number) => {
    const text = replyText[ticketId]?.trim();
    if (!text) return;
    setSendingReply(ticketId);
    try {
      const res = await fetch("/api/help-tickets/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message: text }),
      });
      if (res.ok) {
        setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
        fetchTicketMessages(ticketId);
      }
    } catch { /* ignore */ }
    setSendingReply(null);
  };

  // Fetch group info when group tab is selected
  const fetchGroupInfo = useCallback(async () => {
    if (!dglSmallGroup || !campWeekend) return;
    setGroupLoading(true);
    try {
      const [smallRes, overviewRes] = await Promise.all([
        fetch(`/api/groups?${new URLSearchParams({ weekend: campWeekend, type: "small" })}`),
        fetch(`/api/groups?${new URLSearchParams({ weekend: campWeekend, type: "overview" })}`),
      ]);
      const smallData = await smallRes.json();
      const overviewData = await overviewRes.json();

      // Find the DGL's small group
      const myGroup = (smallData.groups || []).find(
        (g: { name: string }) => g.name === dglSmallGroup
      );

      // Find large group from overview
      let largeGroup: string | null = null;
      if (overviewData.largeGroups) {
        for (const lg of overviewData.largeGroups) {
          for (const sg of lg.smallGroups) {
            if (sg.name === dglSmallGroup) {
              largeGroup = lg.name;
              break;
            }
          }
          if (largeGroup) break;
        }
      }

      if (myGroup) {
        setGroupInfo({
          name: myGroup.name,
          largeGroup,
          meetingLocation: myGroup.meetingLocation || null,
          campers: (myGroup.campers || []).sort((a: GroupCamper, b: GroupCamper) =>
            a.lastName.localeCompare(b.lastName)
          ),
        });
      }
    } catch {
      // Network error
    }
    setGroupLoading(false);
  }, [dglSmallGroup, campWeekend]);

  // Fetch group info as soon as we have the small group name (for schedule widget + group tab)
  useEffect(() => {
    if (dglSmallGroup && campWeekend) {
      fetchGroupInfo();
    }
  }, [dglSmallGroup, campWeekend, fetchGroupInfo]);

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
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setTicketMsg(err.error || `Failed (${res.status})`);
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

    const currentPresent = night === "arrival" ? camper.arrival : night === "friday" ? camper.friday : camper.saturday;
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

  const presentCount = campers.filter((c) => night === "arrival" ? c.arrival : night === "friday" ? c.friday : c.saturday).length;
  const totalCount = campers.length;

  // Extract DGL name from label: "DGL: FirstName LastName (Cabin 16C)" -> "FirstName LastName"
  const dglName = label.replace(/^DGL:\s*/, "").replace(/\s*\(.*\)$/, "");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-green-800 text-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div>
            <h1 className="text-lg font-bold">{cabin || "Cabin Check-In"}</h1>
            <p className="text-xs text-green-300">{dglName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-green-300 hover:text-white px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <PullToRefresh>
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <InstallPrompt />
        <NotificationToggle />
        <AnnouncementBanner />

        {/* Photo/Video Upload for end-of-camp slideshow */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setQrExpanded(true)} className="shrink-0">
              <Image
                src="/ryla-qr.png"
                alt="QR code for photo uploads"
                width={80}
                height={80}
                className="rounded-lg"
              />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">End-of-Camp Slideshow</p>
              <p className="text-xs text-slate-500 mt-0.5">Upload photos &amp; videos or share the QR code with your campers</p>
              <div className="flex items-center gap-3 mt-2">
                <a
                  href="https://www.dropbox.com/request/nHtAH5Pg4gykDECtaaBt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                </a>
                <button
                  onClick={() => setQrExpanded(true)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  Show QR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded QR modal */}
        {qrExpanded && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
            onClick={() => setQrExpanded(false)}
          >
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <Image src="/ryla-logo.png" alt="RYLA" width={160} height={80} />
              <Image src="/ryla-qr.png" alt="Scan to upload photos" width={280} height={280} />
              <p className="text-lg font-bold text-slate-800 text-center">Scan to share photos &amp; videos!</p>
              <p className="text-sm text-slate-500 text-center">For the end-of-camp slideshow</p>
              <button
                onClick={() => setQrExpanded(false)}
                className="mt-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

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

        {/* Schedule Now - personalized for DGL */}
        <DGLScheduleNow groupInfo={groupInfo} />

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
                      ? "bg-green-700 text-white"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
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
              className="w-full py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-40"
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
                  {myTickets.slice(0, 10).map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        t.status === "resolved"
                          ? "bg-green-50 border border-green-200"
                          : t.status === "acknowledged"
                          ? "bg-green-50 border border-green-300"
                          : t.urgency === "urgent"
                          ? "bg-red-50 border border-red-200"
                          : "bg-slate-50 border border-slate-200"
                      }`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => toggleTicketThread(t.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">{t.category}</span>
                          <span className={`font-medium ${
                            t.status === "resolved" ? "text-green-600" :
                            t.status === "acknowledged" ? "text-green-700" :
                            "text-amber-600"
                          }`}>
                            {t.status === "resolved" ? "Resolved" : t.status === "acknowledged" ? "Being Handled" : "Open"}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{t.description}</p>
                        {t.status === "acknowledged" && t.assigned_to && (
                          <p className="text-green-700 mt-0.5 font-medium">Assigned to {t.assigned_to}</p>
                        )}
                        <p className="text-green-600 mt-1 font-medium">
                          {expandedTicketId === t.id ? "Hide messages" : "View messages"}
                        </p>
                      </div>

                      {/* Message thread */}
                      {expandedTicketId === t.id && (
                        <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                          {(ticketMessages[t.id] || []).length === 0 && (
                            <p className="text-slate-400 italic">No messages yet</p>
                          )}
                          {(ticketMessages[t.id] || []).map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-lg px-2.5 py-1.5 ${
                                msg.sender_role === "dgl"
                                  ? "bg-white border border-slate-200 mr-6"
                                  : "bg-green-200 border border-green-300 ml-6"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-semibold text-slate-700">
                                  {msg.sender_role === "dgl" ? "You" : msg.sender_name}
                                </span>
                                <span className="text-slate-400">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-slate-600">{msg.message}</p>
                            </div>
                          ))}

                          {/* Reply input (only for non-resolved tickets) */}
                          {t.status !== "resolved" && (
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={replyText[t.id] || ""}
                                onChange={(e) => setReplyText((prev) => ({ ...prev, [t.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") sendTicketReply(t.id); }}
                                placeholder="Reply..."
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-green-600"
                              />
                              <button
                                onClick={() => sendTicketReply(t.id)}
                                disabled={sendingReply === t.id || !replyText[t.id]?.trim()}
                                className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-medium hover:bg-green-800 transition-colors disabled:opacity-40"
                              >
                                Send
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Tab Toggle: Cabin / My Group */}
        {dglSmallGroup && (
          <div className="flex rounded-xl overflow-hidden bg-white border border-slate-300">
            <button
              onClick={() => setMainTab("cabin")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mainTab === "cabin"
                  ? "bg-green-700 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Cabin
            </button>
            <button
              onClick={() => setMainTab("group")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mainTab === "group"
                  ? "bg-green-700 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              My Group
            </button>
          </div>
        )}

        {/* Cabin Tab Content */}
        {mainTab === "cabin" && (
          <>
            {/* Check-in type toggle */}
            <div className="flex rounded-xl overflow-hidden bg-white shadow-sm">
              {(["arrival", "friday", "saturday"] as Night[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setNight(n)}
                  className={`flex-1 py-3 text-center font-semibold transition-colors ${
                    night === n
                      ? "bg-green-700 text-white"
                      : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {n === "arrival" ? "Arrival" : n === "friday" ? "Fri Night" : "Sat Night"}
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
                const isPresent = night === "arrival" ? c.arrival : night === "friday" ? c.friday : c.saturday;
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
          </>
        )}

        {/* Group Tab Content */}
        {mainTab === "group" && (
          <MyGroupSection
            groupInfo={groupInfo}
            loading={groupLoading}
            dglSmallGroup={dglSmallGroup}
          />
        )}
      </div>
      </PullToRefresh>
    </div>
  );
}

// Biome color mapping
const BIOME_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Arctic:     { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200" },
  Desert:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  Grasslands: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Jungle:     { bg: "bg-lime-50",    text: "text-lime-700",    border: "border-lime-200" },
  Marine:     { bg: "bg-green-50",    text: "text-green-800",    border: "border-green-300" },
};

// Activity rotations (same as schedule.ts but inline to avoid server/client import issues)
const ACTIVITY_ROTATIONS: Record<string, string[]> = {
  Jungle:     ["XC Ski", "Spag Twr", "Boardwalk", "Egg Drop", "Capture"],
  Marine:     ["Capture", "XC Ski", "Spag Twr", "Boardwalk", "Egg Drop"],
  Arctic:     ["Egg Drop", "Capture", "XC Ski", "Spag Twr", "Boardwalk"],
  Desert:     ["Boardwalk", "Egg Drop", "Capture", "XC Ski", "Spag Twr"],
  Grasslands: ["Spag Twr", "Boardwalk", "Egg Drop", "Capture", "XC Ski"],
};

const ACTIVITY_FULL_NAMES: Record<string, string> = {
  "XC Ski": "Cross Country Skiing",
  "Spag Twr": "Spaghetti Tower",
  "Boardwalk": "Boardwalk",
  "Egg Drop": "Egg Drop",
  "Capture": "Capture the Flag",
  "Jeopardy": "Jeopardy",
};

const ACTIVITY_LOCATIONS: Record<string, string> = {
  "XC Ski": "Emerson Field",
  "Spag Twr": "Gilboa Hall",
  "Boardwalk": "Basketball Court",
  "Egg Drop": "Schlenz Hall",
  "Capture": "Emerson Field",
  "Jeopardy": "Schlenz Hall",
};

function MyGroupSection({
  groupInfo,
  loading,
  dglSmallGroup,
}: {
  groupInfo: GroupInfo | null;
  loading: boolean;
  dglSmallGroup: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700" />
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-300 text-center text-sm text-slate-400">
        {dglSmallGroup ? `Could not load group "${dglSmallGroup}"` : "No group assigned"}
      </div>
    );
  }

  const biome = groupInfo.largeGroup || "Unknown";
  const colors = BIOME_COLORS[biome] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
  const activities = groupInfo.largeGroup ? ACTIVITY_ROTATIONS[groupInfo.largeGroup] : null;

  return (
    <div className="space-y-3">
      {/* Group header card */}
      <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-bold ${colors.text}`}>{groupInfo.name}</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {biome} &middot; {groupInfo.campers.length} campers
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
            {biome}
          </div>
        </div>

        {groupInfo.meetingLocation && (
          <div className="mt-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-slate-700">
              Meeting Place: <span className="font-bold">{groupInfo.meetingLocation}</span>
            </span>
          </div>
        )}
      </div>

      {/* Activity rotation */}
      {activities && (
        <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-700">Your Activity Rotation</h3>
          </div>
          <div className="p-3 grid grid-cols-5 gap-1">
            {activities.map((act, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] font-bold text-slate-400 mb-1">Act {i + 1}</div>
                <div className={`text-xs font-semibold ${colors.text} leading-tight`}>
                  {ACTIVITY_FULL_NAMES[act] || act}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {ACTIVITY_LOCATIONS[act] || ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camper list */}
      <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-700">
            Group Members ({groupInfo.campers.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {groupInfo.campers.map((c, i) => (
            <div key={c.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {c.lastName}, {c.firstName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function parseDetailedTime(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function detailedTo24h(schedule: DetailedEvent[]): number[] {
  const result: number[] = [];
  let pmOffset = 0;
  for (let i = 0; i < schedule.length; i++) {
    const raw = parseDetailedTime(schedule[i].time);
    if (raw === null) { result.push(0); continue; }
    const adjusted = raw + pmOffset;
    if (i > 0 && adjusted < result[i - 1]) {
      pmOffset += 12 * 60;
      result.push(raw + pmOffset);
    } else {
      result.push(adjusted);
    }
  }
  return result;
}

function DGLScheduleNow({ groupInfo }: { groupInfo: GroupInfo | null }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const day = getCampDay(now);
  const schedule = useMemo(() => (day ? getDetailedSchedule(day) : null), [day]);

  if (!schedule) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const times24h = detailedTo24h(schedule);

  // Find current and next event
  let currentEvent: DetailedEvent | null = null;
  let nextEvent: DetailedEvent | null = null;

  for (let i = 0; i < schedule.length; i++) {
    const eventMin = times24h[i];
    if (!eventMin) continue;
    const nextMin = i + 1 < schedule.length ? times24h[i + 1] : Infinity;
    if (nowMinutes >= eventMin && nowMinutes < (nextMin || Infinity)) {
      currentEvent = schedule[i];
      nextEvent = i + 1 < schedule.length ? schedule[i + 1] : null;
      break;
    }
  }

  if (!currentEvent) return null;

  const biome = groupInfo?.largeGroup || null;
  const meetingLocation = groupInfo?.meetingLocation || null;

  function personalizeEvent(event: DetailedEvent): { title: string; location: string | null } {
    const actMatch = event.title.match(/^Activity\s+(\d+)$/);
    if (actMatch && biome) {
      const actIdx = parseInt(actMatch[1], 10) - 1;
      const activities = ACTIVITY_ROTATIONS[biome];
      if (activities && actIdx < activities.length) {
        const act = activities[actIdx];
        return {
          title: ACTIVITY_FULL_NAMES[act] || act,
          location: ACTIVITY_LOCATIONS[act] || null,
        };
      }
    }

    if (event.title.startsWith("Discussion Group") && meetingLocation) {
      return {
        title: event.title,
        location: meetingLocation,
      };
    }

    if (event.title.includes("Small Group Meet") && meetingLocation) {
      return {
        title: event.title,
        location: meetingLocation,
      };
    }

    return { title: event.title, location: event.location || null };
  }

  const current = personalizeEvent(currentEvent);
  const next = nextEvent ? personalizeEvent(nextEvent) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
      {/* Current event */}
      <div className="bg-green-50 border-b border-green-300 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-200 px-1.5 py-0.5 rounded">
            Now
          </span>
          <span className="text-xs text-green-600 font-medium">{currentEvent.time}</span>
        </div>
        <p className="text-base font-bold text-slate-900">{current.title}</p>
        {current.location && (
          <p className="text-sm text-green-800 font-medium mt-0.5">{current.location}</p>
        )}
      </div>

      {/* Next event */}
      {next && nextEvent && (
        <div className="px-4 py-2.5 flex items-start gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
            Next
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">{nextEvent.time}</span>
              <span className="text-sm font-semibold text-slate-700">{next.title}</span>
            </div>
            {next.location && (
              <p className="text-xs text-slate-500">{next.location}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
