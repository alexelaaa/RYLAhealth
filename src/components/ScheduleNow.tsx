"use client";

import { useState, useEffect } from "react";
import { BIOME_COLORS } from "@/lib/constants";
import {
  getCampDay,
  getCurrentSlot,
  getDetailedSchedule,
  parseScheduleTime,
  getActivityForSlot,
  ACTIVITY_LOCATIONS,
  FRIDAY,
} from "@/lib/schedule";
import type { ScheduleSlot, DetailedEvent } from "@/lib/schedule";

function parseDetailedTime(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function findDetailedEvent(nowMinutes: number, detailed: DetailedEvent[]): DetailedEvent | null {
  for (let i = 0; i < detailed.length; i++) {
    const eventMin = parseDetailedTime(detailed[i].time);
    if (eventMin === null) continue;
    const nextMin = i + 1 < detailed.length ? parseDetailedTime(detailed[i + 1].time) : Infinity;
    if (nowMinutes >= eventMin && nowMinutes < (nextMin ?? Infinity)) {
      return detailed[i];
    }
  }
  return null;
}

function findNextDetailedEvent(nowMinutes: number, detailed: DetailedEvent[]): DetailedEvent | null {
  for (let i = 0; i < detailed.length; i++) {
    const eventMin = parseDetailedTime(detailed[i].time);
    if (eventMin === null) continue;
    const nextMin = i + 1 < detailed.length ? parseDetailedTime(detailed[i + 1].time) : Infinity;
    if (nowMinutes >= eventMin && nowMinutes < (nextMin ?? Infinity)) {
      return i + 1 < detailed.length ? detailed[i + 1] : null;
    }
  }
  return null;
}

export default function ScheduleNow() {
  const [slot, setSlot] = useState<ScheduleSlot | null>(null);
  const [isCampDay, setIsCampDay] = useState(true);
  const [currentDetailed, setCurrentDetailed] = useState<DetailedEvent | null>(null);
  const [nextDetailed, setNextDetailed] = useState<DetailedEvent | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
      const day = getCampDay(now);
      setIsCampDay(day !== null);
      if (day) {
        setSlot(getCurrentSlot(now));
        const detailed = getDetailedSchedule(day);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        setCurrentDetailed(findDetailedEvent(nowMinutes, detailed));
        setNextDetailed(findNextDetailedEvent(nowMinutes, detailed));
      } else {
        setSlot({
          current: null,
          next: null,
          dayLabel: "Friday",
          schedule: FRIDAY,
        });
        setCurrentDetailed(null);
        setNextDetailed(null);
      }
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!slot) return null;

  const activities = slot.current ? getActivityForSlot(slot.current.event) : null;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">Schedule</h2>
        <span className="text-xs font-medium text-slate-500">{slot.dayLabel}</span>
      </div>

      <div className="p-4 space-y-3">
        {!isCampDay ? (
          <div className="text-center py-2">
            <p className="text-sm text-slate-500">No camp scheduled today</p>
            <p className="text-xs text-slate-400 mt-1">Friday schedule preview:</p>
          </div>
        ) : slot.current ? (
          <>
            {/* NOW card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                  Now
                </span>
                <span className="text-xs text-blue-500 font-medium">{slot.current.time}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{slot.current.event}</p>
              {currentDetailed?.location && (
                <p className="text-sm text-blue-700 font-medium">{currentDetailed.location}</p>
              )}
              {currentDetailed?.note && (
                <p className="text-xs text-blue-500 italic mt-0.5">{currentDetailed.note}</p>
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

            {/* UP NEXT */}
            {slot.next && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                    Next
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{slot.next.time}</span>
                  <span className="text-sm font-semibold text-slate-700">{slot.next.event}</span>
                </div>
                {nextDetailed?.location && (
                  <p className="text-xs text-slate-500 mt-1 ml-[52px]">{nextDetailed.location}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-slate-500">Before first event</p>
          </div>
        )}

        {/* Timeline */}
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {slot.schedule.map(([time, event], i) => {
            let entryMinutes = parseScheduleTime(time);
            if (entryMinutes === 0 && i > 0) entryMinutes = 24 * 60;
            const nextEntry = i + 1 < slot.schedule.length ? slot.schedule[i + 1] : null;
            let nextMinutes = nextEntry ? parseScheduleTime(nextEntry[0]) : Infinity;
            if (nextMinutes === 0 && i + 1 > 0) nextMinutes = 24 * 60;

            const isCurrent = isCampDay && nowMinutes >= entryMinutes && nowMinutes < nextMinutes;
            const isPast = isCampDay && nowMinutes >= nextMinutes;

            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors ${
                  isCurrent
                    ? "bg-blue-50 font-semibold text-blue-900"
                    : isPast
                      ? "text-slate-300"
                      : "text-slate-600"
                }`}
              >
                <span className="w-12 shrink-0 font-mono">{time}</span>
                <span>{event}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
