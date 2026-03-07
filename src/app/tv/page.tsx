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

function findDetailedEvent(nowMinutes: number, detailed: DetailedEvent[]): DetailedEvent | null {
  const times = detailedTo24h(detailed);
  for (let i = 0; i < detailed.length; i++) {
    const eventMin = times[i];
    if (!eventMin) continue;
    const nextMin = i + 1 < detailed.length ? times[i + 1] : Infinity;
    if (nowMinutes >= eventMin && nowMinutes < (nextMin || Infinity)) {
      return detailed[i];
    }
  }
  return null;
}

function findNextDetailedEvent(nowMinutes: number, detailed: DetailedEvent[]): DetailedEvent | null {
  const times = detailedTo24h(detailed);
  for (let i = 0; i < detailed.length; i++) {
    const eventMin = times[i];
    if (!eventMin) continue;
    const nextMin = i + 1 < detailed.length ? times[i + 1] : Infinity;
    if (nowMinutes >= eventMin && nowMinutes < (nextMin || Infinity)) {
      return i + 1 < detailed.length ? detailed[i + 1] : null;
    }
  }
  return null;
}

export default function TVDisplayPage() {
  const [currentDetailed, setCurrentDetailed] = useState<DetailedEvent | null>(null);
  const [nextDetailed, setNextDetailed] = useState<DetailedEvent | null>(null);
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
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const current = findDetailedEvent(nowMinutes, detailed);
        setCurrentDetailed(current);
        setNextDetailed(findNextDetailedEvent(nowMinutes, detailed));
        setActivities(current ? getActivityForSlot(current.title) : null);
      } else {
        setCurrentDetailed(null);
        setNextDetailed(null);
        setActivities(null);
      }
    }
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      {/* Clock */}
      <div className="text-6xl font-bold text-slate-400 mb-8 tabular-nums">
        {clock}
      </div>

      {!isCampDay ? (
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">RYLA Camp</h1>
          <p className="text-2xl text-slate-400">No events scheduled right now</p>
        </div>
      ) : !currentDetailed ? (
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">RYLA Camp</h1>
          <p className="text-2xl text-slate-400">Events starting soon...</p>
        </div>
      ) : (
        <div className="w-full max-w-5xl space-y-6">
          {/* Current Event */}
          <div className="bg-blue-600/20 border-2 border-blue-500/40 rounded-3xl p-8">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm font-bold uppercase tracking-widest text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full">
                Now
              </span>
              <span className="text-2xl text-blue-300 font-medium">{currentDetailed.time}</span>
            </div>
            <h2 className="text-5xl font-bold">{currentDetailed.title}</h2>
            {currentDetailed.location && (
              <p className="text-2xl text-blue-300 font-medium mt-2">{currentDetailed.location}</p>
            )}
            {currentDetailed.note && (
              <p className="text-lg text-blue-400 italic mt-1">{currentDetailed.note}</p>
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
                      className="text-lg font-semibold px-4 py-2 rounded-xl"
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
          {nextDetailed && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl px-8 py-6 flex items-center gap-6">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-500 bg-slate-700/50 px-3 py-1 rounded-full">
                Next
              </span>
              <span className="text-xl text-slate-400 font-medium">{nextDetailed.time}</span>
              <span className="text-3xl font-bold">{nextDetailed.title}</span>
              {nextDetailed.location && (
                <span className="text-xl text-slate-400">{nextDetailed.location}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* RYLA logo */}
      <div className="absolute bottom-8">
        <Image
          src="/ryla logo.jpg"
          alt="RYLA"
          width={200}
          height={100}
          className="opacity-50 brightness-200"
          priority
        />
      </div>
    </div>
  );
}
