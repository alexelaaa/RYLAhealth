export const FRIDAY: [string, string][] = [
  ["9:00a", "Buses Arrive"],
  ["11:15a", "Ice Breakers"],
  ["12:15p", "Camp Photo"],
  ["12:25p", "Lunch"],
  ["1:35p", "Welcome"],
  ["2:15p", "Discussion 1"],
  ["3:10p", "Activity 1"],
  ["4:05p", "Speaker – Max"],
  ["5:05p", "Discussion 2"],
  ["6:00p", "Dinner"],
  ["7:10p", "Cabin Time"],
  ["7:40p", "Speaker – Jackie"],
  ["8:25p", "Culture Walk"],
  ["9:50p", "Discussion 3"],
  ["10:30p", "Alumni Intros"],
  ["12:00a", "Lights Out"],
];

export const SATURDAY: [string, string][] = [
  ["6:30a", "Free Time"],
  ["8:00a", "Breakfast"],
  ["9:00a", "Speaker – Max"],
  ["10:00a", "Discussion 4"],
  ["10:55a", "Activity 2"],
  ["11:50a", "Speaker – Jackie"],
  ["12:50p", "Lunch"],
  ["2:00p", "Speaker – Mike"],
  ["3:00p", "Discussion 5"],
  ["4:25p", "Activity 3"],
  ["5:20p", "Dinner"],
  ["6:30p", "Talent Show"],
  ["8:00p", "Carnival"],
  ["11:30p", "Lights Out"],
];

export const SUNDAY: [string, string][] = [
  ["6:30a", "Free Time / Pack"],
  ["8:00a", "Breakfast"],
  ["9:00a", "Camp Activity"],
  ["10:45a", "Activity 4"],
  ["11:40a", "Discussion 6"],
  ["12:35p", "Lunch"],
  ["1:45p", "Activity 5"],
  ["2:40p", "Discussion 7"],
  ["3:35p", "Closing Session"],
  ["5:15p", "Load Buses"],
  ["6:00p", "Depart!"],
];

export const ACTIVITY_ROTATIONS: Record<string, string[]> = {
  Jungle:     ["XC Ski", "Spag Twr", "Boardwalk", "Egg Drop", "Capture"],
  Marine:     ["Capture", "XC Ski", "Spag Twr", "Boardwalk", "Egg Drop"],
  Arctic:     ["Egg Drop", "Capture", "XC Ski", "Spag Twr", "Boardwalk"],
  Desert:     ["Boardwalk", "Egg Drop", "Capture", "XC Ski", "Spag Twr"],
  Grasslands: ["Spag Twr", "Boardwalk", "Egg Drop", "Capture", "XC Ski"],
};

/** Parse "9:00a" or "12:25p" → minutes from midnight */
export function parseScheduleTime(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(a|p)$/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm === "a" && hours === 12) hours = 0;
  else if (ampm === "p" && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

export type CampDay = "friday" | "saturday" | "sunday";

export function getCampDay(now: Date): CampDay | null {
  const dow = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  if (dow === 5) return "friday";
  if (dow === 6) return "saturday";
  if (dow === 0) return "sunday";
  return null;
}

export function getDaySchedule(day: CampDay): [string, string][] {
  if (day === "friday") return FRIDAY;
  if (day === "saturday") return SATURDAY;
  return SUNDAY;
}

export interface ScheduleSlot {
  current: { time: string; event: string } | null;
  next: { time: string; event: string } | null;
  dayLabel: string;
  schedule: [string, string][];
}

export function getCurrentSlot(now: Date): ScheduleSlot | null {
  const day = getCampDay(now);
  if (!day) return null;

  const schedule = getDaySchedule(day);
  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Find current slot: last entry whose time <= now
  let currentIdx = -1;
  for (let i = 0; i < schedule.length; i++) {
    let entryMinutes = parseScheduleTime(schedule[i][0]);
    // "12:00a" on Friday = midnight = next day, treat as 24:00
    if (entryMinutes === 0 && i > 0) entryMinutes = 24 * 60;
    if (nowMinutes >= entryMinutes) {
      currentIdx = i;
    }
  }

  const current = currentIdx >= 0
    ? { time: schedule[currentIdx][0], event: schedule[currentIdx][1] }
    : null;
  const next = currentIdx + 1 < schedule.length
    ? { time: schedule[currentIdx + 1][0], event: schedule[currentIdx + 1][1] }
    : null;

  return { current, next, dayLabel, schedule };
}

/**
 * If eventName matches "Activity N", return the biome→activity mapping.
 * Activity numbers are 1-indexed into ACTIVITY_ROTATIONS values.
 */
export function getActivityForSlot(eventName: string): Record<string, string> | null {
  const match = eventName.match(/^Activity\s+(\d+)$/);
  if (!match) return null;
  const actIdx = parseInt(match[1], 10) - 1; // 0-indexed
  const result: Record<string, string> = {};
  for (const [biome, activities] of Object.entries(ACTIVITY_ROTATIONS)) {
    if (actIdx < activities.length) {
      result[biome] = activities[actIdx];
    }
  }
  return result;
}
