"use client";

import { useState, useEffect } from "react";
import { BIOME_COLORS } from "@/lib/constants";
import {
  getCampDay,
  getCurrentSlot,
  parseScheduleTime,
  getActivityForSlot,
  FRIDAY,
} from "@/lib/schedule";
import type { ScheduleSlot } from "@/lib/schedule";

export default function ScheduleNow() {
  const [slot, setSlot] = useState<ScheduleSlot | null>(null);
  const [isCampDay, setIsCampDay] = useState(true);

  useEffect(() => {
    function update() {
      const now = new Date();
      const day = getCampDay(now);
      setIsCampDay(day !== null);
      if (day) {
        setSlot(getCurrentSlot(now));
      } else {
        // Preview Friday schedule when not a camp day
        setSlot({
          current: null,
          next: null,
          dayLabel: "Friday",
          schedule: FRIDAY,
        });
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

              {/* Activity rotation grid */}
              {activities && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(activities).map(([biome, activity]) => {
                    const colors = BIOME_COLORS[biome];
                    return (
                      <span
                        key={biome}
                        className={`text-xs font-medium px-2 py-1 rounded-lg ${colors?.bg || "bg-slate-100"} ${colors?.text || "text-slate-700"}`}
                      >
                        {biome}: {activity}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* UP NEXT */}
            {slot.next && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                  Next
                </span>
                <span className="text-xs text-slate-500 font-medium">{slot.next.time}</span>
                <span className="text-sm font-semibold text-slate-700">{slot.next.event}</span>
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
