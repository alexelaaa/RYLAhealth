"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CamperCheckin {
  id: number;
  firstName: string;
  lastName: string;
  cabinName: string;
  friday: boolean;
  saturday: boolean;
}

type Night = "friday" | "saturday";

export default function CabinCheckinPage() {
  const [campers, setCampers] = useState<CamperCheckin[]>([]);
  const [cabin, setCabin] = useState("");
  const [label, setLabel] = useState("");
  const [night, setNight] = useState<Night>("friday");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const router = useRouter();

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
