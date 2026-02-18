"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";
import { CampContext } from "@/lib/camp-context";
import { CAMP_WEEKENDS } from "@/lib/constants";
import { isBusRider } from "@/lib/bus-utils";
import type { SessionData } from "@/types";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [campWeekend, setCampWeekendLocal] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.isLoggedIn) {
          router.push("/login");
        } else if (isBusRider(data.label)) {
          router.push("/bus-rider");
        } else {
          setSession(data);
          setCampWeekendLocal(data.campWeekend || "");
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const setCampWeekend = async (weekend: string) => {
    setCampWeekendLocal(weekend);
    await fetch("/api/auth/weekend", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campWeekend: weekend }),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <CampContext.Provider value={{ campWeekend, setCampWeekend, session }}>
      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <header className="bg-blue-700 text-white sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-lg font-bold">RYLA Camp</h1>
            <div className="flex items-center gap-2">
              <select
                value={campWeekend}
                onChange={(e) => setCampWeekend(e.target.value)}
                className="bg-blue-600 text-white text-xs rounded-lg px-2 py-1 border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">All Weekends</option>
                {CAMP_WEEKENDS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              {session && (
                <span className="text-xs bg-blue-600 px-2 py-1 rounded-full capitalize">
                  {session.role}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-xs text-blue-200 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <OfflineBanner />

        {/* Main content */}
        <main className="pb-safe max-w-4xl mx-auto">
          {children}
        </main>

        <BottomNav />
      </div>
    </CampContext.Provider>
  );
}
