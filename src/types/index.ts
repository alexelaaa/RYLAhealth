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
  CampStaff,
  NewCampStaff,
  SmallGroupInfo,
  NewSmallGroupInfo,
  CabinCheckin,
  NewCabinCheckin,
} from "@/db/schema";

export type UserRole = "nurse" | "staff" | "admin" | "bussing" | "dgl" | "alumni";

export type SessionData = {
  isLoggedIn: boolean;
  role: UserRole;
  label: string;
  campWeekend?: string;
  dglCabin?: string;
  dglSmallGroup?: string;
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
