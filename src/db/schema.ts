import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const campers = sqliteTable(
  "campers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uniqueRegistrationId: text("unique_registration_id").unique().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    birthDate: text("birth_date"),
    gender: text("gender"),
    email: text("email"),
    cellPhone: text("cell_phone"),
    addressStreet: text("address_street"),
    addressCity: text("address_city"),
    addressState: text("address_state"),
    addressZip: text("address_zip"),
    school: text("school"),
    gradeLevel: text("grade_level"),
    // Guardian
    guardianFirstName: text("guardian_first_name"),
    guardianLastName: text("guardian_last_name"),
    guardianEmail: text("guardian_email"),
    guardianPhone: text("guardian_phone"),
    // Emergency Contact
    emergencyFirstName: text("emergency_first_name"),
    emergencyLastName: text("emergency_last_name"),
    emergencyRelationship: text("emergency_relationship"),
    emergencyPhone: text("emergency_phone"),
    // Rotary
    rotaryClubConfirmed: text("rotary_club_confirmed"),
    sponsoringRotaryClub: text("sponsoring_rotary_club"),
    sponsoringClubCode: text("sponsoring_club_code"),
    // Camp
    campWeekend: text("camp_weekend").notNull(),
    campDateFlexibility: text("camp_date_flexibility"),
    role: text("role").notNull(),
    hasRelativeAttending: text("has_relative_attending"),
    relativeFirstName: text("relative_first_name"),
    relativeLastName: text("relative_last_name"),
    relativeRole: text("relative_role"),
    // Camp Assignment
    largeGroup: text("large_group"),
    smallGroup: text("small_group"),
    cabinNumber: text("cabin_number"),
    busNumber: text("bus_number"),
    timedMedicationOverride: integer("timed_medication_override").default(0),
    medicationSchedule: text("medication_schedule"),
    // Medical
    dietaryRestrictions: text("dietary_restrictions"),
    allergies: text("allergies"),
    currentMedications: text("current_medications"),
    medicalConditions: text("medical_conditions"),
    recentInjuries: text("recent_injuries"),
    physicalLimitations: text("physical_limitations"),
    lastTetanusShot: text("last_tetanus_shot"),
    otherMedicalNeeds: text("other_medical_needs"),
    // Insurance
    hasInsurance: text("has_insurance"),
    insuranceProvider: text("insurance_provider"),
    policyNumber: text("policy_number"),
    insuredFirstName: text("insured_first_name"),
    insuredLastName: text("insured_last_name"),
    insurancePhone: text("insurance_phone"),
    // Permissions
    firstAidPermission: text("first_aid_permission"),
    otcMedicationPermission: text("otc_medication_permission"),
    waiverAgreement: text("waiver_agreement"),
    codeOfEthics: text("code_of_ethics"),
    // Meta
    registrationTime: text("registration_time"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_campers_weekend").on(table.campWeekend),
    index("idx_campers_last_name").on(table.lastName),
    index("idx_campers_role").on(table.role),
    index("idx_campers_unique_id").on(table.uniqueRegistrationId),
  ]
);

export const medicalLogs = sqliteTable("medical_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  camperId: integer("camper_id")
    .notNull()
    .references(() => campers.id),
  timestamp: text("timestamp").notNull(),
  type: text("type", {
    enum: ["medication_admin", "first_aid", "injury", "illness", "other"],
  }).notNull(),
  medication: text("medication"),
  dosage: text("dosage"),
  treatment: text("treatment"),
  notes: text("notes"),
  loggedBy: text("logged_by").notNull(),
  clientId: text("client_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const behavioralIncidents = sqliteTable("behavioral_incidents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  camperId: integer("camper_id")
    .notNull()
    .references(() => campers.id),
  timestamp: text("timestamp").notNull(),
  staffName: text("staff_name").notNull(),
  description: text("description").notNull(),
  severity: text("severity", {
    enum: ["low", "medium", "high"],
  }).notNull(),
  loggedBy: text("logged_by").notNull(),
  clientId: text("client_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const staffPins = sqliteTable("staff_pins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  role: text("role", { enum: ["nurse", "staff", "admin"] }).notNull(),
});

export const camperEdits = sqliteTable("camper_edits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  camperId: integer("camper_id")
    .notNull()
    .references(() => campers.id),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: text("changed_by").notNull(),
  changedAt: text("changed_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const checkIns = sqliteTable("check_ins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  camperId: integer("camper_id")
    .notNull()
    .unique()
    .references(() => campers.id),
  checkedInAt: text("checked_in_at").notNull(),
  checkedInBy: text("checked_in_by").notNull(),
  notes: text("notes"),
});

export const busWaypoints = sqliteTable(
  "bus_waypoints",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    busId: text("bus_id").notNull(),
    busLabel: text("bus_label").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    accuracy: real("accuracy"),
    heading: real("heading"),
    speed: real("speed"),
    trackedBy: text("tracked_by").notNull(),
    campWeekend: text("camp_weekend"),
    clientId: text("client_id"),
    timestamp: text("timestamp").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_waypoints_bus_id").on(table.busId),
    index("idx_waypoints_camp_weekend").on(table.campWeekend),
    index("idx_waypoints_client_id").on(table.clientId),
    index("idx_waypoints_timestamp").on(table.timestamp),
  ]
);

export const campStaff = sqliteTable(
  "camp_staff",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    staffType: text("staff_type", { enum: ["alumni", "adult"] }).notNull(),
    staffRole: text("staff_role"),
    phone: text("phone"),
    email: text("email"),
    campWeekend: text("camp_weekend"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_camp_staff_type").on(table.staffType),
    index("idx_camp_staff_weekend").on(table.campWeekend),
  ]
);

// Type exports
export type Camper = typeof campers.$inferSelect;
export type NewCamper = typeof campers.$inferInsert;
export type MedicalLog = typeof medicalLogs.$inferSelect;
export type NewMedicalLog = typeof medicalLogs.$inferInsert;
export type BehavioralIncident = typeof behavioralIncidents.$inferSelect;
export type NewBehavioralIncident = typeof behavioralIncidents.$inferInsert;
export type StaffPin = typeof staffPins.$inferSelect;
export type CamperEdit = typeof camperEdits.$inferSelect;
export type NewCamperEdit = typeof camperEdits.$inferInsert;
export type CheckIn = typeof checkIns.$inferSelect;
export type NewCheckIn = typeof checkIns.$inferInsert;
export type BusWaypoint = typeof busWaypoints.$inferSelect;
export type NewBusWaypoint = typeof busWaypoints.$inferInsert;
export type CampStaff = typeof campStaff.$inferSelect;
export type NewCampStaff = typeof campStaff.$inferInsert;
