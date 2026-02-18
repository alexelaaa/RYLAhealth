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

export const BUS_TRACKER_INTERVAL_MS = 30_000;
export const BUS_MAP_REFRESH_MS = 15_000;
export const BUS_ACTIVE_THRESHOLD_MIN = 5;

export const CAMP_LOCATION = {
  latitude: 33.7456,
  longitude: -116.7131,
  name: "Idyllwild Pines Camp",
} as const;
