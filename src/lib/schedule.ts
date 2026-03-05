// ── Compact schedule (used by dashboard ScheduleNow widget + badge cards) ──

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

// ── Detailed schedule (used by /schedule page + badge day cards) ──

export interface DetailedEvent {
  time: string;       // e.g. "8:00 – 9:00"
  title: string;      // e.g. "Breakfast"
  location?: string;  // e.g. "Dining Hall"
  note?: string;      // extra info
  bold?: boolean;     // highlight row
}

export const FRIDAY_DETAILED: DetailedEvent[] = [
  { time: "8:00 – 9:00", title: "DGL/Staff Meeting & Breakfast", location: "Dining Hall" },
  { time: "9:00 – 11:00", title: "Buses Arrive & Unpack", location: "Meadow Camp", note: "Music, fruit, drinks, light snacks" },
  { time: "11:15 – 12:15", title: "Ice Breakers", location: "Meadow Camp Field", note: "Max Dutton & Jackie G." },
  { time: "12:15 – 12:20", title: "Camp Photo", location: "Main Amphitheater" },
  { time: "12:25 – 1:25", title: "Lunch", location: "Dining Hall", note: "Eat with your group" },
  { time: "1:35 – 2:05", title: "Welcome, Rules, Introductions", location: "McNeil Hall" },
  { time: "2:15 – 3:00", title: "Discussion Group 1", location: "Meeting Places", note: "Meet and Greet", bold: true },
  { time: "3:10 – 3:55", title: "Activity 1", location: "Activity Areas", bold: true },
  { time: "4:05 – 4:55", title: "Speaker – Max Dutton", location: "McNeil Hall" },
  { time: "5:05 – 5:50", title: "Discussion Group 2", location: "Meeting Places", bold: true },
  { time: "6:00 – 7:00", title: "Dinner", location: "Dining Hall" },
  { time: "7:10 – 7:30", title: "Cabin Time", note: "Meet Cabin Monitor, go over rules" },
  { time: "7:40 – 8:10", title: "Speaker – Jackie G.", location: "McNeil Hall", note: "Culture Walk Intro" },
  { time: "8:25 – 9:45", title: "Culture Walk", location: "Culture Walk Areas" },
  { time: "9:50 – 10:20", title: "Discussion Group 3", location: "Meeting Places", note: "Culture Walk Discussion", bold: true },
  { time: "10:30 – 11:30", title: "Alumni Introductions", location: "McNeil Hall" },
  { time: "12:00", title: "Lights Out" },
];

export const SATURDAY_DETAILED: DetailedEvent[] = [
  { time: "6:30 – 8:00", title: "Free Time", note: "Must stay in Meadow Camp. Talent Show tryouts." },
  { time: "8:00 – 8:50", title: "Breakfast", location: "Dining Hall" },
  { time: "9:00 – 9:50", title: "Speaker – Max Dutton", location: "McNeil Hall" },
  { time: "10:00 – 10:45", title: "Discussion Group 4", location: "Meeting Places", bold: true },
  { time: "10:55 – 11:40", title: "Activity 2", location: "Activity Areas", bold: true },
  { time: "11:50 – 12:40", title: "Speaker – Jackie G.", location: "McNeil Hall" },
  { time: "12:50 – 1:50", title: "Lunch", location: "Dining Hall" },
  { time: "2:00 – 2:50", title: "Speaker – Mike Norkin", location: "McNeil Hall", note: "Emotional First Aid & Who Are You?" },
  { time: "3:00 – 4:15", title: "Discussion Group 5", location: "Meeting Places", note: "Who Are You? Activity", bold: true },
  { time: "4:25 – 5:10", title: "Activity 3", location: "Activity Areas", bold: true },
  { time: "5:20 – 6:20", title: "Dinner", location: "Dining Hall" },
  { time: "6:30 – 8:00", title: "Talent/No Talent Show", location: "McNeil Hall" },
  { time: "8:00 – 10:45", title: "Carnival", location: "Center of Camp", note: "Snacks at Malt Shop. Bonfire, s'mores, fire pits." },
  { time: "11:00", title: "Report to Cabins" },
  { time: "11:30", title: "Lights Out" },
];

export const SUNDAY_DETAILED: DetailedEvent[] = [
  { time: "6:30 – 8:00", title: "Free Time & Pack", note: "Cabins must be cleaned & luggage packed before breakfast" },
  { time: "8:00 – 8:50", title: "Breakfast", location: "Dining Hall" },
  { time: "9:00 – 10:35", title: "Whole Camp Field Activity", location: "Emerson Field", note: "Max, Jackie & Mike" },
  { time: "10:45 – 11:30", title: "Activity 4", location: "Activity Areas", bold: true },
  { time: "11:40 – 12:25", title: "Discussion Group 6", location: "Meeting Places", note: "Letter Writing", bold: true },
  { time: "12:35 – 1:35", title: "Lunch", location: "Dining Hall" },
  { time: "1:45 – 2:30", title: "Activity 5", location: "Activity Areas", bold: true },
  { time: "2:40 – 3:25", title: "Discussion Group 7", location: "Meeting Places", note: "Pictures & goodbyes", bold: true },
  { time: "3:35 – 5:05", title: "Closing Session", location: "McNeil Hall" },
  { time: "5:15", title: "Load Buses / Goodbye" },
  { time: "6:00", title: "All Buses Depart!" },
];

// ── Activity rotations ──

export const ACTIVITY_ROTATIONS: Record<string, string[]> = {
  Jungle:     ["XC Ski", "Spag Twr", "Boardwalk", "Egg Drop", "Capture"],
  Marine:     ["Capture", "XC Ski", "Spag Twr", "Boardwalk", "Egg Drop"],
  Arctic:     ["Egg Drop", "Capture", "XC Ski", "Spag Twr", "Boardwalk"],
  Desert:     ["Boardwalk", "Egg Drop", "Capture", "XC Ski", "Spag Twr"],
  Grasslands: ["Spag Twr", "Boardwalk", "Egg Drop", "Capture", "XC Ski"],
};

export const ACTIVITY_FULL_NAMES: Record<string, string> = {
  "XC Ski": "Cross Country Skiing",
  "Spag Twr": "Spaghetti Tower",
  "Boardwalk": "Boardwalk",
  "Egg Drop": "Egg Drop",
  "Capture": "Capture the Flag",
};

export const ACTIVITY_LOCATIONS: Record<string, string> = {
  "XC Ski": "Emerson Field",
  "Spag Twr": "Gilboa Hall",
  "Boardwalk": "Basketball Court",
  "Egg Drop": "Schlenz Hall",
  "Capture": "Emerson Field",
};

// ── Utility functions ──

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

export function getDetailedSchedule(day: CampDay): DetailedEvent[] {
  if (day === "friday") return FRIDAY_DETAILED;
  if (day === "saturday") return SATURDAY_DETAILED;
  return SUNDAY_DETAILED;
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
