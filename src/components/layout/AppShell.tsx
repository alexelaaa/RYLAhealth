"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";
import { CampContext } from "@/lib/camp-context";
import { CAMP_WEEKENDS } from "@/lib/constants";
import { isBusRider } from "@/lib/bus-utils";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { SessionData } from "@/types";
import PullToRefresh from "@/components/PullToRefresh";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [campWeekend, setCampWeekendLocal] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isOnline = useOnlineStatus();

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  // Alumni gets a simplified shell with their own nav
  if (session?.role === "alumni") {
    const alumniNav = [
      { href: "/schedule", label: "Schedule" },
      { href: "/groups", label: "Groups" },
      { href: "/map", label: "Map" },
    ];
    return (
      <CampContext.Provider value={{ campWeekend, setCampWeekend, session }}>
        <div className="min-h-screen bg-slate-200">
          <header className="bg-green-800 text-white sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 h-14">
              <Image src="/ryla-logo.png" alt="RYLA District 5330" width={120} height={40} className="h-9 w-auto bg-white/90 rounded px-1.5 py-0.5" />
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-700 px-2 py-1 rounded-full capitalize">
                  Alumni
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-green-300 hover:text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>
          <OfflineBanner />
          <main className="pb-safe max-w-4xl mx-auto">
            <PullToRefresh>{children}</PullToRefresh>
          </main>
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-300 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] transform-gpu">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
              {alumniNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                      isActive ? "text-green-700" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <a
                href="http://ryla5330.org/wp-content/uploads/2026/03/RYLA-Packet-2026.docx.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center flex-1 py-1 transition-colors text-slate-400 hover:text-slate-600"
              >
                <span className="text-sm font-medium">Packet</span>
              </a>
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </nav>
        </div>
      </CampContext.Provider>
    );
  }

  // DGL gets a simplified shell — no bottom nav, just a back link
  if (session?.role === "dgl") {
    return (
      <CampContext.Provider value={{ campWeekend, setCampWeekend, session }}>
        <div className="min-h-screen bg-slate-200">
          <header className="bg-green-800 text-white sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 h-14">
              <Link href="/cabin-checkin" className="flex items-center gap-1 text-green-300 hover:text-white text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Check-In
              </Link>
              <Image src="/ryla-logo.png" alt="RYLA District 5330" width={120} height={40} className="h-9 w-auto bg-white/90 rounded px-1.5 py-0.5" />
            </div>
          </header>
          <OfflineBanner />
          <main className="pb-safe max-w-4xl mx-auto">
            <PullToRefresh>{children}</PullToRefresh>
          </main>
        </div>
      </CampContext.Provider>
    );
  }

  return (
    <CampContext.Provider value={{ campWeekend, setCampWeekend, session }}>
      <div className="min-h-screen bg-slate-200">
        {/* Top bar */}
        <header className="bg-green-800 text-white sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 h-14">
            <Image src="/ryla-logo.png" alt="RYLA District 5330" width={120} height={40} className="h-9 w-auto bg-white/90 rounded px-1.5 py-0.5" />
            <div className="flex items-center gap-2">
              <select
                value={campWeekend}
                onChange={(e) => setCampWeekend(e.target.value)}
                className="bg-green-700 text-white text-xs rounded-lg px-2 py-1 border border-green-600 focus:outline-none focus:ring-1 focus:ring-green-400"
              >
                <option value="">All Weekends</option>
                {CAMP_WEEKENDS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isOnline ? "bg-green-500/20 text-green-200" : "bg-yellow-500/20 text-yellow-200"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
                {isOnline ? "Live" : "Offline"}
              </span>
              {session && (
                <span className="text-xs bg-green-700 px-2 py-1 rounded-full capitalize">
                  {session.role}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-xs text-green-300 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <OfflineBanner />

        {/* Main content */}
        <main className="pb-safe max-w-4xl mx-auto">
          <PullToRefresh>{children}</PullToRefresh>
        </main>

        {session?.role !== "bussing" && <BottomNav />}
      </div>
    </CampContext.Provider>
  );
}
