export type {
  Camper,
  NewCamper,
  MedicalLog,
  NewMedicalLog,
  BehavioralIncident,
  NewBehavioralIncident,
  StaffPin,
  CamperEdit,
  NewCamperEdit,
  CheckIn,
  NewCheckIn,
  BusWaypoint,
  NewBusWaypoint,
} from "@/db/schema";

export type UserRole = "nurse" | "staff" | "admin";

export type SessionData = {
  isLoggedIn: boolean;
  role: UserRole;
  label: string;
  campWeekend?: string;
};

export type MedicalLogType =
  | "medication_admin"
  | "first_aid"
  | "injury"
  | "illness"
  | "other";

export type Severity = "low" | "medium" | "high";

export type ExportScope = "all_campers" | "all_logs" | "single_camper";
export type ExportFormat = "csv" | "pdf";
