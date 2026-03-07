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

/**
 * Convert detailed schedule times to 24-hour minutes.
 * Detailed schedule uses 12-hour format without AM/PM.
 * Events are chronological, so when raw time drops we crossed noon.
 */
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

export default function ScheduleNow() {
  const [currentDetailed, setCurrentDetailed] = useState<DetailedEvent | null>(null);
  const [nextDetailed, setNextDetailed] = useState<DetailedEvent | null>(null);
  const [isCampDay, setIsCampDay] = useState(true);
  const [activities, setActivities] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
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
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!isCampDay) return null;
  if (!currentDetailed) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
      {/* Current event */}
      <div className="bg-green-50 border-b border-green-300 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-200 px-1.5 py-0.5 rounded">
            Now
          </span>
          <span className="text-xs text-green-600 font-medium">{currentDetailed.time}</span>
        </div>
        <p className="text-base font-bold text-slate-900">{currentDetailed.title}</p>
        {currentDetailed.location && (
          <p className="text-sm text-green-800 font-medium mt-0.5">{currentDetailed.location}</p>
        )}
        {currentDetailed.note && (
          <p className="text-xs text-green-600 italic mt-0.5">{currentDetailed.note}</p>
        )}

        {/* Activity rotation grid */}
        {activities && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(activities).map(([biome, activity]) => {
              const colors = BIOME_COLORS[biome];
              const location = ACTIVITY_LOCATIONS[activity];
              return (
                <span
                  key={biome}
                  className={`text-xs font-medium px-2 py-1 rounded-lg ${colors?.bg || "bg-slate-100"} ${colors?.text || "text-slate-700"}`}
                >
                  {biome}: {activity}{location ? ` — ${location}` : ""}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Next event */}
      {nextDetailed && (
        <div className="px-4 py-2.5 flex items-start gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
            Next
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">{nextDetailed.time}</span>
              <span className="text-sm font-semibold text-slate-700">{nextDetailed.title}</span>
            </div>
            {nextDetailed.location && (
              <p className="text-xs text-slate-500">{nextDetailed.location}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
