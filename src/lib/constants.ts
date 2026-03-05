export const CAMP_WEEKENDS = ["March 6th-8th", "May 15th-17th"] as const;

export const MEDICAL_LOG_TYPES = [
  { value: "medication_admin", label: "Medication Administration" },
  { value: "first_aid", label: "First Aid" },
  { value: "injury", label: "Injury" },
  { value: "illness", label: "Illness" },
  { value: "other", label: "Other" },
] as const;

export const SEVERITY_LEVELS = [
  { value: "low", label: "Low", color: "bg-yellow-100 text-yellow-800" },
  { value: "medium", label: "Medium", color: "bg-orange-100 text-orange-800" },
  { value: "high", label: "High", color: "bg-red-100 text-red-800" },
] as const;

export const MEDICATION_SCHEDULES = [
  { value: "morning", label: "Morning", timeRange: "6:00-10:00 AM" },
  { value: "afternoon", label: "Afternoon", timeRange: "12:00-2:00 PM" },
  { value: "evening", label: "Evening", timeRange: "4:00-8:00 PM" },
  { value: "bedtime", label: "Bedtime", timeRange: "8:00-10:00 PM" },
  { value: "with_meals", label: "With Meals", timeRange: "Meals" },
  { value: "as_needed", label: "As Needed", timeRange: null },
] as const;

export const ROLES = [
  { value: "nurse", label: "Nurse" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
] as const;

export const BUSES = [
  { id: "bus-1", label: "Bus 1" },
  { id: "bus-2", label: "Bus 2" },
  { id: "bus-3", label: "Bus 3" },
  { id: "bus-4", label: "Bus 4" },
  { id: "bus-5", label: "Bus 5" },
  { id: "bus-6", label: "Bus 6" },
] as const;

export const LARGE_GROUPS = [
  "Arctic",
  "Desert",
  "Grasslands",
  "Jungle",
  "Marine",
] as const;

export const SMALL_GROUPS: Record<string, string[]> = {
  Arctic: ["Arctic Wolves", "Penguins", "Polar Bears", "Reindeer", "Walruses"],
  Desert: ["Camels", "Coyotes", "Lizards", "Scorpions", "Snakes"],
  Grasslands: ["Elephants", "Giraffe", "Lions", "Rhinos", "Tigers"],
  Jungle: ["Capibaras", "Crocodiles", "Frogs", "Macaws", "Monkies"],
  Marine: ["Jellyfish", "Octopi", "Sharks", "Starfish", "Turtles"],
};

export const ALL_SMALL_GROUPS = Object.values(SMALL_GROUPS).flat().sort();

export const CABIN_NAMES = [
  "Cabin 1",
  "Cabin 2",
  "Cabin 3",
  "Cabin 4",
  "Cabin 7",
  "Cabin 16 A1",
  "Cabin 16 A2",
  "Cabin 16 B1",
  "Cabin 16 B2",
  "Cabin 16 C1",
  "Cabin 16 C2",
  "Cabin 17 A1",
  "Cabin 17 A2",
  "Cabin 17 B1",
  "Cabin 17 B2",
  "Cabin 17 C1",
  "Cabin 17 C2",
  "Cabin 18 A1",
  "Cabin 18 A2",
  "Cabin 18 B1",
  "Cabin 18 B2",
  "Cabin 18 C1",
  "Cabin 18 C2",
  "Cabin 19 A1",
  "Cabin 19 A2",
  "Cabin 19 B1",
  "Cabin 19 B2",
  "Cabin 19 C1",
  "Cabin 19 C2",
  "Cabin 21 A",
  "Cabin 21 B",
  "Cabin 22 A1",
  "Cabin 22 A2",
  "Cabin 22 B1",
  "Cabin 22 B2",
  "Cabin 22 C1",
  "Cabin 22 C2",
  "Cabin 23 A1",
  "Cabin 23 A2",
  "Cabin 23 B1",
  "Cabin 23 B2",
] as const;

export const BUS_NUMBERS = ["1", "2", "3", "4", "5"] as const;

export const BUS_TRACKER_INTERVAL_MS = 30_000;
export const BUS_MAP_REFRESH_MS = 15_000;
export const BUS_ACTIVE_THRESHOLD_MIN = 5;

export const CAMP_LOCATION = {
  latitude: 33.7456,
  longitude: -116.7131,
  name: "Idyllwild Pines Camp",
} as const;

export const BIOME_COLORS: Record<string, {
  bg: string; text: string; border: string; headerBg: string;
  hex: string; hexLight: string; hexBorder: string;
}> = {
  Arctic:     { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",    headerBg: "bg-cyan-100",    hex: "#0e7490", hexLight: "#ecfeff", hexBorder: "#a5f3fc" },
  Desert:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   headerBg: "bg-amber-100",   hex: "#b45309", hexLight: "#fffbeb", hexBorder: "#fde68a" },
  Grasslands: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", headerBg: "bg-emerald-100", hex: "#047857", hexLight: "#ecfdf5", hexBorder: "#a7f3d0" },
  Jungle:     { bg: "bg-lime-50",    text: "text-lime-700",    border: "border-lime-200",    headerBg: "bg-lime-100",    hex: "#4d7c0f", hexLight: "#f7fee7", hexBorder: "#bef264" },
  Marine:     { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    headerBg: "bg-blue-100",    hex: "#1d4ed8", hexLight: "#eff6ff", hexBorder: "#bfdbfe" },
};
