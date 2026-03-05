"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  FRIDAY_DETAILED,
  SATURDAY_DETAILED,
  SUNDAY_DETAILED,
  ACTIVITY_ROTATIONS,
  ACTIVITY_FULL_NAMES,
  ACTIVITY_LOCATIONS,
  type DetailedEvent,
} from "@/lib/schedule";
import { BIOME_COLORS } from "@/lib/constants";

type DayTab = "friday" | "saturday" | "sunday" | "activities";

function EventRow({ event }: { event: DetailedEvent }) {
  return (
    <div className={`flex gap-3 py-2.5 border-b border-slate-100 last:border-0 ${event.bold ? "bg-blue-50/50" : ""}`}>
      <div className="w-24 flex-shrink-0 text-xs font-bold text-slate-500 pt-0.5">
        {event.time}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${event.bold ? "font-bold text-blue-900" : "font-semibold text-slate-900"}`}>
          {event.title}
        </div>
        {event.location && (
          <div className="text-xs text-slate-500">{event.location}</div>
        )}
        {event.note && (
          <div className="text-xs text-slate-400 italic">{event.note}</div>
        )}
      </div>
    </div>
  );
}

function DaySchedule({ events }: { events: DetailedEvent[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      <div className="px-4">
        {events.map((event, i) => (
          <EventRow key={i} event={event} />
        ))}
      </div>
    </div>
  );
}

function ActivityRotations() {
  const groups = Object.entries(ACTIVITY_ROTATIONS);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-700 text-sm">Activity Rotation by Group</h3>
          <p className="text-xs text-slate-500 mt-0.5">Each group rotates through all 5 activities during camp</p>
        </div>
        <div className="divide-y divide-slate-100">
          {groups.map(([group, activities]) => {
            const colors = BIOME_COLORS[group] || { hex: "#475569", hexLight: "#f1f5f9" };
            return (
              <div key={group} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: colors.hexLight, color: colors.hex, border: `1px solid ${colors.hexBorder}` }}
                  >
                    {group}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {activities.map((act, i) => (
                    <div key={i} className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 mb-0.5">Act {i + 1}</div>
                      <div className="text-xs font-semibold text-slate-800">{ACTIVITY_FULL_NAMES[act] || act}</div>
                      <div className="text-[10px] text-slate-500">{ACTIVITY_LOCATIONS[act] || ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-700 text-sm">Activity Locations</h3>
        </div>
        <div className="px-4 py-2 space-y-1.5">
          {Object.entries(ACTIVITY_FULL_NAMES).map(([short, full]) => (
            <div key={short} className="flex justify-between text-sm">
              <span className="font-medium text-slate-800">{full}</span>
              <span className="text-slate-500">{ACTIVITY_LOCATIONS[short]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [tab, setTab] = useState<DayTab>("friday");

  const tabs: { key: DayTab; label: string }[] = [
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
    { key: "activities", label: "Activities" },
  ];

  return (
    <AppShell>
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-xl font-bold text-slate-900">Schedule</h1>

        {/* Day Tabs */}
        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "friday" && <DaySchedule events={FRIDAY_DETAILED} />}
        {tab === "saturday" && <DaySchedule events={SATURDAY_DETAILED} />}
        {tab === "sunday" && <DaySchedule events={SUNDAY_DETAILED} />}
        {tab === "activities" && <ActivityRotations />}
      </div>
    </AppShell>
  );
}
