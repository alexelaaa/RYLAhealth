"use client";

import { useState, useEffect } from "react";
import { BIOME_COLORS } from "@/lib/constants";
import {
  getCampDay,
  getDetailedSchedule,
  getActivityForSlot,
  ACTIVITY_LOCATIONS,
} from "@/lib/schedule";
import type { DetailedEvent } from "@/lib/schedule";

function parseDetailedTime(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function detailedTo24h(detailed: DetailedEvent[]): number[] {
  const result: number[] = [];
  let pmOffset = 0;
  for (let i = 0; i < detailed.length; i++) {
    const raw = parseDetailedTime(detailed[i].time);
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

function findCurrentIndex(nowMinutes: number, detailed: DetailedEvent[]): number {
  const times = detailedTo24h(detailed);
  for (let i = 0; i < detailed.length; i++) {
    const eventMin = times[i];
    if (!eventMin) continue;
    const nextMin = i + 1 < detailed.length ? times[i + 1] : Infinity;
    if (nowMinutes >= eventMin && nowMinutes < (nextMin || Infinity)) {
      return i;
    }
  }
  return -1;
}

export default function TVDisplayPage() {
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [schedule, setSchedule] = useState<DetailedEvent[]>([]);
  const [isCampDay, setIsCampDay] = useState(true);
  const [activities, setActivities] = useState<Record<string, string> | null>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      setClock(
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
      const day = getCampDay(now);
      setIsCampDay(day !== null);
      if (day) {
        const detailed = getDetailedSchedule(day);
        setSchedule(detailed);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const idx = findCurrentIndex(nowMinutes, detailed);
        setCurrentIdx(idx);
        setActivities(idx >= 0 ? getActivityForSlot(detailed[idx].title) : null);
      } else {
        setSchedule([]);
        setCurrentIdx(-1);
        setActivities(null);
      }
    }
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  const current = currentIdx >= 0 ? schedule[currentIdx] : null;
  const upcoming = currentIdx >= 0 ? schedule.slice(currentIdx + 1) : [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* Left side: Now + Next */}
      <div className="flex-1 flex flex-col justify-center p-12">
        {/* Clock */}
        <div className="text-7xl font-bold text-slate-300 mb-10 tabular-nums">
          {clock}
        </div>

        {!isCampDay ? (
          <div>
            <h1 className="text-6xl font-bold mb-4">RYLA Camp</h1>
            <p className="text-3xl text-slate-400">No events scheduled right now</p>
          </div>
        ) : !current ? (
          <div>
            <h1 className="text-6xl font-bold mb-4">RYLA Camp</h1>
            <p className="text-3xl text-slate-400">Events starting soon...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Current Event */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-10">
              <div className="flex items-center gap-5 mb-4">
                <span className="text-base font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-4 py-1.5 rounded-full">
                  Now
                </span>
                <span className="text-3xl text-blue-500 font-medium">{current.time}</span>
              </div>
              <h2 className="text-6xl font-bold text-slate-900">{current.title}</h2>
              {current.location && (
                <p className="text-3xl text-blue-600 font-medium mt-3">{current.location}</p>
              )}
              {current.note && (
                <p className="text-xl text-blue-500 italic mt-2">{current.note}</p>
              )}

              {/* Activity rotation */}
              {activities && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {Object.entries(activities).map(([biome, activity]) => {
                    const colors = BIOME_COLORS[biome];
                    const location = ACTIVITY_LOCATIONS[activity];
                    return (
                      <span
                        key={biome}
                        className="text-xl font-semibold px-4 py-2.5 rounded-xl"
                        style={{
                          backgroundColor: colors?.hexLight || "#f1f5f9",
                          color: colors?.hex || "#475569",
                          border: `2px solid ${colors?.hexBorder || "#e2e8f0"}`,
                        }}
                      >
                        {biome}: {activity}{location ? ` — ${location}` : ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Next Event */}
            {upcoming.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl px-10 py-7 flex items-center gap-6">
                <span className="text-base font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-4 py-1.5 rounded-full">
                  Next
                </span>
                <span className="text-2xl text-slate-400 font-medium">{upcoming[0].time}</span>
                <span className="text-4xl font-bold">{upcoming[0].title}</span>
                {upcoming[0].location && (
                  <span className="text-2xl text-slate-400">{upcoming[0].location}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: Rest of day schedule (scrolling ticker) */}
      {isCampDay && upcoming.length > 1 && (
        <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col">
          <div className="px-8 py-6 border-b border-slate-200">
            <h3 className="text-2xl font-bold text-slate-700">Up Next</h3>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-tv-scroll absolute w-full">
              {/* Double the list for seamless looping */}
              {[...upcoming.slice(1), ...upcoming.slice(1)].map((evt, i) => (
                <div
                  key={i}
                  className="px-8 py-5 border-b border-slate-100"
                >
                  <p className="text-lg text-slate-400 font-medium">{evt.time}</p>
                  <p className="text-2xl font-bold text-slate-800">{evt.title}</p>
                  {evt.location && (
                    <p className="text-lg text-slate-500">{evt.location}</p>
                  )}
                  {evt.note && (
                    <p className="text-base text-slate-400 italic">{evt.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSS animation for scrolling */}
      <style jsx>{`
        @keyframes tv-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-tv-scroll {
          animation: tv-scroll ${Math.max(upcoming.length * 5, 20)}s linear infinite;
        }
      `}</style>
    </div>
  );
}
