"use client";

import { useState, useEffect, useCallback } from "react";
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
import { BIOME_COLORS, CAMP_WEEKENDS } from "@/lib/constants";
import { cacheGet, cacheSet } from "@/lib/offline-cache";

type DayTab = "friday" | "saturday" | "sunday" | "activities";

interface SmallGroupInfo {
  name: string;
  meetingLocation: string | null;
  dglName: string | null;
  largeGroup: string | null;
  count: number;
}

function ActivityBreakdown({ activityNum }: { activityNum: number }) {
  const actIdx = activityNum - 1;
  return (
    <div className="mt-2 bg-blue-50 rounded-lg p-3 space-y-1.5">
      <div className="text-xs font-bold text-blue-800 mb-2">Activity {activityNum} — Where each group goes:</div>
      {Object.entries(ACTIVITY_ROTATIONS).map(([group, acts]) => {
        const act = acts[actIdx];
        const colors = BIOME_COLORS[group] || { hex: "#475569", hexLight: "#f1f5f9", hexBorder: "#e2e8f0" };
        return (
          <div key={group} className="flex items-center gap-2">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 w-20 text-center"
              style={{ backgroundColor: colors.hexLight, color: colors.hex, border: `1px solid ${colors.hexBorder}` }}
            >
              {group}
            </span>
            <span className="text-xs font-semibold text-slate-800">{ACTIVITY_FULL_NAMES[act] || act}</span>
            <span className="text-[10px] text-slate-500">— {ACTIVITY_LOCATIONS[act] || ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function DiscussionBreakdown({ groups }: { groups: SmallGroupInfo[] }) {
  if (groups.length === 0) {
    return (
      <div className="mt-2 bg-blue-50 rounded-lg p-3">
        <div className="text-xs text-slate-500 italic">Loading group data...</div>
      </div>
    );
  }

  // Group small groups by large group
  const byLargeGroup = new Map<string, SmallGroupInfo[]>();
  for (const g of groups) {
    const lg = g.largeGroup || "Unknown";
    if (!byLargeGroup.has(lg)) byLargeGroup.set(lg, []);
    byLargeGroup.get(lg)!.push(g);
  }

  return (
    <div className="mt-2 bg-blue-50 rounded-lg p-3 space-y-3">
      <div className="text-xs font-bold text-blue-800">Discussion Groups — Meeting Locations:</div>
      {Array.from(byLargeGroup.entries()).map(([lg, sgs]) => {
        const colors = BIOME_COLORS[lg] || { hex: "#475569", hexLight: "#f1f5f9", hexBorder: "#e2e8f0" };
        return (
          <div key={lg}>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: colors.hexLight, color: colors.hex, border: `1px solid ${colors.hexBorder}` }}
            >
              {lg}
            </span>
            <div className="mt-1 space-y-0.5 ml-1">
              {sgs.map((sg) => (
                <div key={sg.name} className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-800">{sg.name}</span>
                  {sg.dglName && <span className="text-slate-400">({sg.dglName})</span>}
                  <span className="text-slate-500">— {sg.meetingLocation || "TBD"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventRow({ event, groups }: { event: DetailedEvent; groups: SmallGroupInfo[] }) {
  const [expanded, setExpanded] = useState(false);

  // Determine if this is an expandable row
  const activityMatch = event.title.match(/^Activity\s+(\d+)$/);
  const isDiscussion = event.title.startsWith("Discussion Group");
  const isSmallGroupMeet = event.title.includes("Small Group Meet");
  const isExpandable = activityMatch || isDiscussion || isSmallGroupMeet;

  return (
    <div className={`border-b border-slate-100 last:border-0 ${event.bold ? "bg-blue-50/50" : ""}`}>
      <div
        className={`flex gap-3 py-2.5 ${isExpandable ? "cursor-pointer active:bg-slate-50" : ""}`}
        onClick={isExpandable ? () => setExpanded(!expanded) : undefined}
      >
        <div className="w-24 flex-shrink-0 text-xs font-bold text-slate-500 pt-0.5">
          {event.time}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${event.bold ? "font-bold text-blue-900" : "font-semibold text-slate-900"}`}>
            {event.title}
            {isExpandable && (
              <span className="ml-1.5 text-blue-500 text-xs">{expanded ? "▲" : "▼"}</span>
            )}
          </div>
          {event.location && (
            <div className="text-xs text-slate-500">{event.location}</div>
          )}
          {event.note && (
            <div className="text-xs text-slate-400 italic">{event.note}</div>
          )}
        </div>
      </div>
      {expanded && activityMatch && (
        <div className="px-2 pb-3">
          <ActivityBreakdown activityNum={parseInt(activityMatch[1])} />
        </div>
      )}
      {expanded && (isDiscussion || isSmallGroupMeet) && (
        <div className="px-2 pb-3">
          <DiscussionBreakdown groups={groups} />
        </div>
      )}
    </div>
  );
}

function DaySchedule({ events, groups }: { events: DetailedEvent[]; groups: SmallGroupInfo[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-4">
        {events.map((event, i) => (
          <EventRow key={i} event={event} groups={groups} />
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
            const colors = BIOME_COLORS[group] || { hex: "#475569", hexLight: "#f1f5f9", hexBorder: "#e2e8f0" };
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
  const [groups, setGroups] = useState<SmallGroupInfo[]>([]);
  const [weekend] = useState(CAMP_WEEKENDS[0]);

  const fetchGroups = useCallback(async () => {
    const cacheKey = `schedule-groups-${weekend}`;
    try {
      const [smallRes, overviewRes] = await Promise.all([
        fetch(`/api/groups?${new URLSearchParams({ weekend, type: "small" })}`),
        fetch(`/api/groups?${new URLSearchParams({ weekend, type: "overview" })}`),
      ]);
      const smallData = await smallRes.json();
      const overviewData = await overviewRes.json();

      // Build large group lookup from overview
      const lgMap = new Map<string, string>();
      if (overviewData.largeGroups) {
        for (const lg of overviewData.largeGroups) {
          for (const sg of lg.smallGroups) {
            lgMap.set(sg.name, lg.name);
          }
        }
      }

      const result: SmallGroupInfo[] = (smallData.groups || []).map((g: { name: string; meetingLocation?: string; dglName?: string; count?: number }) => ({
        name: g.name,
        meetingLocation: g.meetingLocation || null,
        dglName: g.dglName || null,
        largeGroup: lgMap.get(g.name) || null,
        count: g.count || 0,
      }));

      setGroups(result);
      cacheSet(cacheKey, result);
    } catch {
      // Offline — try cached groups
      const cached = await cacheGet<SmallGroupInfo[]>(cacheKey);
      if (cached) setGroups(cached);
    }
  }, [weekend]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

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
        {tab === "friday" && <DaySchedule events={FRIDAY_DETAILED} groups={groups} />}
        {tab === "saturday" && <DaySchedule events={SATURDAY_DETAILED} groups={groups} />}
        {tab === "sunday" && <DaySchedule events={SUNDAY_DETAILED} groups={groups} />}
        {tab === "activities" && <ActivityRotations />}
      </div>
    </AppShell>
  );
}
