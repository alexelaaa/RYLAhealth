"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppShell from "@/components/layout/AppShell";

interface Ticket {
  id: number;
  cabin: string;
  dgl_name: string;
  category: string;
  description: string;
  urgency: string;
  status: string;
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

const STAFF_NAMES = [
  "Mike Norkin",
  "Jennifer Smith",
  "Jamie Webber",
  "Chris Webber",
  "Alex Ela",
  "Craig Davis",
  "Larry Rice",
  "Michele Munoz",
  "Matthew Smith",
  "Danielle Morse",
];

export default function TicketsPage() {
  return (
    <AppShell>
      <TicketsContent />
    </AppShell>
  );
}

function TicketsContent() {
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const prevCountRef = useRef(0);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, TicketMessage[]>>({});
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [sendingReply, setSendingReply] = useState<number | null>(null);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/help-tickets?status=${tab}`);
      if (res.ok) {
        const data = await res.json();
        // Play alert sound if new tickets appeared in live mode
        if (liveMode && tab === "open" && data.length > prevCountRef.current && prevCountRef.current > 0) {
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1zd3qIjo2Jg3x1bWJYUUpGREVISk5TWF5kaW90eX6DiIyPkZKSkI2KhoJ9eHNuaWRfWlVRTUtJSElLTlFVWV5jaGxweHyBhYiLjY+QkZGQj42KhoJ9eHRvaWRfW1dTUE5MSktMTlBTVlpfZGluc3h9gYWIi42Oj5CRkI+NioaCfnl0b2pkX1tXU1BOTE1MTU5QU1daXmNoa3B1en+DhoqMjo+QkJCPjYuHg395dG9qZWBcWFRRTk1MTExNT1JVWFxhZmtwd3t/g4eKjI6PkJCQj42Lh4N/eXRvamVgXFhUUU5NTExMTU9SVVhcYA==");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch { /* ignore */ }
        }
        prevCountRef.current = data.length;
        setTickets(data);
      }
    } catch { /* ignore */ }
    if (!silent) setLoading(false);
  }, [tab, liveMode]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Auto-refresh: 15s in live mode, 30s normally (open tab only)
  useEffect(() => {
    if (tab !== "open") return;
    const interval = setInterval(() => fetchTickets(true), liveMode ? 15000 : 30000);
    return () => clearInterval(interval);
  }, [tab, liveMode, fetchTickets]);

  const handleResolve = async (id: number) => {
    try {
      const res = await fetch("/api/help-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "resolved", note: resolveNote }),
      });
      if (res.ok) {
        setResolving(null);
        setResolveNote("");
        fetchTickets();
      }
    } catch { /* ignore */ }
  };

  const handleReopen = async (id: number) => {
    try {
      const res = await fetch("/api/help-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "open" }),
      });
      if (res.ok) fetchTickets();
    } catch { /* ignore */ }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      const res = await fetch("/api/help-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "acknowledged" }),
      });
      if (res.ok) fetchTickets(true);
    } catch { /* ignore */ }
  };

  const handleAssign = async (id: number, assignedTo: string) => {
    try {
      const res = await fetch("/api/help-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, assignedTo }),
      });
      if (res.ok) fetchTickets(true);
    } catch { /* ignore */ }
  };

  const fetchMessages = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/help-tickets/messages?ticketId=${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => ({ ...prev, [ticketId]: data }));
      }
    } catch { /* ignore */ }
  };

  const toggleMessages = (ticketId: number) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(ticketId);
      fetchMessages(ticketId);
    }
  };

  const sendReply = async (ticketId: number) => {
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
        fetchMessages(ticketId);
        fetchTickets(true);
      }
    } catch { /* ignore */ }
    setSendingReply(null);
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Help Tickets</h1>
        <button
          onClick={() => setLiveMode(!liveMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            liveMode
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {liveMode && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          {liveMode ? "Live" : "Live Feed"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden bg-white border border-slate-300">
        <button
          onClick={() => setTab("open")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === "open"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Open{tab === "open" && tickets.length > 0 ? ` (${tickets.length})` : ""}
        </button>
        <button
          onClick={() => setTab("resolved")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === "resolved"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Resolved
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-slate-300 text-center text-sm text-slate-400">
          {tab === "open" ? "No open tickets" : "No resolved tickets yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`bg-white rounded-xl border overflow-hidden ${
                ticket.urgency === "urgent" && ticket.status === "open"
                  ? "border-red-300 ring-1 ring-red-200"
                  : "border-slate-300"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        ticket.category === "Medical" ? "bg-red-100 text-red-700" :
                        ticket.category === "Behavioral" ? "bg-orange-100 text-orange-700" :
                        ticket.category === "Forgot Item" ? "bg-blue-100 text-blue-700" :
                        ticket.category === "Maintenance" ? "bg-yellow-100 text-yellow-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {ticket.category}
                      </span>
                      {ticket.urgency === "urgent" && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          URGENT
                        </span>
                      )}
                      {ticket.status === "acknowledged" && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-900 mt-2">{ticket.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span className="font-medium">{ticket.dgl_name}</span>
                      {ticket.cabin && (
                        <>
                          <span>·</span>
                          <span>{ticket.cabin}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{new Date(ticket.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Messages thread */}
                <div className="mt-2">
                  <button
                    onClick={() => toggleMessages(ticket.id)}
                    className="text-xs text-blue-600 font-medium hover:text-blue-700"
                  >
                    {expandedTicket === ticket.id ? "Hide Messages" : "Messages"}
                    {messages[ticket.id]?.length ? ` (${messages[ticket.id].length})` : ""}
                  </button>

                  {expandedTicket === ticket.id && (
                    <div className="mt-2 space-y-2">
                      {(messages[ticket.id] || []).length === 0 && (
                        <p className="text-xs text-slate-400 italic">No messages yet</p>
                      )}
                      {(messages[ticket.id] || []).map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg px-3 py-2 text-xs ${
                            msg.sender_role === "dgl"
                              ? "bg-slate-50 border border-slate-200 ml-0 mr-8"
                              : "bg-blue-50 border border-blue-200 ml-8 mr-0"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-slate-700">{msg.sender_name}</span>
                            <span className="text-slate-400">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-slate-600">{msg.message}</p>
                        </div>
                      ))}

                      {/* Reply input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText[ticket.id] || ""}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") sendReply(ticket.id); }}
                          placeholder="Reply to DGL..."
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => sendReply(ticket.id)}
                          disabled={sendingReply === ticket.id || !replyText[ticket.id]?.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Acknowledge button for new/unacknowledged tickets */}
                {ticket.status === "open" && !ticket.assigned_to && (
                  <button
                    onClick={() => handleAcknowledge(ticket.id)}
                    className="mt-2 w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    Acknowledge
                  </button>
                )}

                {/* Assign */}
                {(ticket.status === "open" || ticket.status === "acknowledged") && (
                  <div className="mt-2">
                    <select
                      value={ticket.assigned_to || ""}
                      onChange={(e) => handleAssign(ticket.id, e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        ticket.assigned_to
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      <option value="">Unassigned</option>
                      {STAFF_NAMES.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Assigned badge on resolved */}
                {ticket.status === "resolved" && ticket.assigned_to && (
                  <p className="text-xs text-slate-500 mt-2">Assigned to {ticket.assigned_to}</p>
                )}

                {/* Resolved info */}
                {ticket.status === "resolved" && (
                  <div className="mt-3 bg-green-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-green-700">
                      Resolved by {ticket.resolved_by} · {ticket.resolved_at && new Date(ticket.resolved_at).toLocaleTimeString()}
                    </p>
                    {ticket.resolved_note && (
                      <p className="text-xs text-green-600 mt-0.5">{ticket.resolved_note}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {(ticket.status === "open" || ticket.status === "acknowledged") && (
                  <div className="mt-3">
                    {resolving === ticket.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          placeholder="Add a note (optional)..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolve(ticket.id)}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => { setResolving(null); setResolveNote(""); }}
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResolving(ticket.id)}
                        className="w-full py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors border border-green-200"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                )}

                {ticket.status === "resolved" && (
                  <button
                    onClick={() => handleReopen(ticket.id)}
                    className="mt-2 w-full py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    Reopen
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
