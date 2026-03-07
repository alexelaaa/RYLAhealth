"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
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
    // Update every second for the clock
    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, []);

  const current = currentIdx >= 0 ? schedule[currentIdx] : null;
  // Only show events after the current one (rest of day, not looping)
  const upcoming = currentIdx >= 0 ? schedule.slice(currentIdx + 1) : [];

  return (
    <div className="h-screen bg-white text-slate-900 flex overflow-hidden">
      {/* Left side */}
      <div className="flex-1 flex flex-col p-10">
        {/* Top row: logo + clock */}
        <div className="flex items-center justify-between mb-6">
          <Image
            src="/rylalogo.jpg"
            alt="RYLA"
            width={180}
            height={90}
            priority
          />
          <div className="text-5xl font-bold text-black tabular-nums font-mono">
            {clock}
          </div>
        </div>

        {/* Current + Next events */}
        <div className="flex-1 flex flex-col justify-center">
          {!isCampDay ? (
            <div>
              <h1 className="text-5xl font-bold mb-4">RYLA Camp</h1>
              <p className="text-2xl text-slate-400">No events scheduled right now</p>
            </div>
          ) : !current ? (
            <div>
              <h1 className="text-5xl font-bold mb-4">RYLA Camp</h1>
              <p className="text-2xl text-slate-400">Events starting soon...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Current Event */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                    Now
                  </span>
                  <span className="text-2xl text-blue-500 font-medium">{current.time}</span>
                </div>
                <h2 className="text-5xl font-bold text-slate-900">{current.title}</h2>
                {current.location && (
                  <p className="text-2xl text-blue-600 font-medium mt-2">{current.location}</p>
                )}
                {current.note && (
                  <p className="text-lg text-blue-500 italic mt-1">{current.note}</p>
                )}

                {/* Activity rotation */}
                {activities && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(activities).map(([biome, activity]) => {
                      const colors = BIOME_COLORS[biome];
                      const location = ACTIVITY_LOCATIONS[activity];
                      return (
                        <span
                          key={biome}
                          className="text-lg font-semibold px-3 py-2 rounded-xl"
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
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-8 py-5 flex items-center gap-5">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400 bg-slate-200 px-3 py-1 rounded-full">
                    Next
                  </span>
                  <span className="text-xl text-slate-400 font-medium">{upcoming[0].time}</span>
                  <span className="text-3xl font-bold text-slate-900">{upcoming[0].title}</span>
                  {upcoming[0].location && (
                    <span className="text-xl text-slate-400">{upcoming[0].location}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* QR code bottom-left — always visible */}
        <div className="flex items-center gap-8 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 mt-4">
          <Image
            src="/ryla-qr.png"
            alt="Scan to upload photos and videos"
            width={280}
            height={280}
            className="shrink-0"
          />
          <div>
            <p className="text-3xl font-bold text-slate-800">Share your photos &amp; videos!</p>
            <p className="text-xl text-slate-500 mt-2">Scan to upload for the end-of-camp slideshow</p>
          </div>
        </div>
      </div>

      {/* Right side: Rest of day schedule */}
      {isCampDay && upcoming.length > 1 && (
        <div className="w-[380px] bg-slate-50 border-l-2 border-slate-200 flex flex-col">
          <div className="px-6 py-4 border-b-2 border-slate-200">
            <h3 className="text-xl font-bold text-slate-600">Rest of Day</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {upcoming.slice(1).map((evt, i) => (
              <div
                key={i}
                className="px-6 py-3.5 border-b border-slate-200"
              >
                <p className="text-base text-slate-400 font-medium">{evt.time}</p>
                <p className="text-xl font-bold text-slate-800">{evt.title}</p>
                {evt.location && (
                  <p className="text-base text-slate-500">{evt.location}</p>
                )}
                {evt.note && (
                  <p className="text-sm text-slate-400 italic">{evt.note}</p>
                )}
              </div>
            ))}
            <div className="px-6 py-6 text-center border-t-2 border-slate-300">
              <p className="text-lg text-slate-400 font-medium">End of Day</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
