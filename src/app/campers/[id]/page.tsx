"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import type { Camper, MedicalLog, BehavioralIncident, CamperEdit } from "@/types";
import { MEDICATION_SCHEDULES } from "@/lib/constants";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || value.trim() === "") return null;
  return (
    <div className="py-2 border-b border-slate-50 last:border-0">
      <dt className="text-xs text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5">{value}</dd>
    </div>
  );
}

function Section({ title, children, className, headerRight }: {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100 overflow-hidden ${className || ""}`}>
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-slate-700">{title}</h2>
        {headerRight}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

const logTypeLabels: Record<string, string> = {
  medication_admin: "Medication Admin",
  first_aid: "First Aid",
  injury: "Injury",
  illness: "Illness",
  other: "Other",
};

const severityColors: Record<string, string> = {
  low: "bg-yellow-100 text-yellow-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
};

const fieldLabels: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  birthDate: "Date of Birth",
  gender: "Gender",
  email: "Email",
  cellPhone: "Phone",
  school: "School",
  gradeLevel: "Grade Level",
  campWeekend: "Weekend",
  role: "Role",
  allergies: "Allergies",
  currentMedications: "Medications",
  medicalConditions: "Medical Conditions",
  dietaryRestrictions: "Dietary Restrictions",
  largeGroup: "Large Group",
  smallGroup: "Small Group",
  cabinNumber: "Cabin Number",
  busNumber: "Bus Number",
  timedMedicationOverride: "Timed Med Override",
  medicationSchedule: "Medication Schedule",
};

const scheduleColors: Record<string, string> = {
  morning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  afternoon: "bg-blue-100 text-blue-800 border-blue-200",
  evening: "bg-purple-100 text-purple-800 border-purple-200",
  bedtime: "bg-indigo-100 text-indigo-800 border-indigo-200",
  with_meals: "bg-green-100 text-green-800 border-green-200",
  as_needed: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function CamperDetailPage() {
  return (
    <AppShell>
      <CamperDetailContent />
    </AppShell>
  );
}

function CamperDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { session } = useCamp();
  const id = params.id as string;
  const [camper, setCamper] = useState<Camper | null>(null);
  const [medicalLogs, setMedicalLogs] = useState<MedicalLog[]>([]);
  const [behavioralIncidents, setBehavioralIncidents] = useState<BehavioralIncident[]>([]);
  const [edits, setEdits] = useState<CamperEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingOverride, setTogglingOverride] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    fetch(`/api/campers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCamper(data.camper);
        setMedicalLogs(data.medicalLogs || []);
        setBehavioralIncidents(data.behavioralIncidents || []);
        setEdits(data.camperEdits || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const toggleTimedOverride = async () => {
    if (!camper) return;
    setTogglingOverride(true);
    try {
      const res = await fetch(`/api/campers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timedMedicationOverride: camper.timedMedicationOverride ? 0 : 1,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCamper(data.camper);
        // Refresh edits
        const detailRes = await fetch(`/api/campers/${id}`);
        const detailData = await detailRes.json();
        setEdits(detailData.camperEdits || []);
      }
    } catch {
      // ignore
    } finally {
      setTogglingOverride(false);
    }
  };

  const currentSchedule: string[] = (() => {
    if (!camper?.medicationSchedule) return [];
    try { return JSON.parse(camper.medicationSchedule); } catch { return []; }
  })();

  const toggleScheduleLabel = async (value: string) => {
    if (!camper) return;
    setSavingSchedule(true);
    const newSchedule = currentSchedule.includes(value)
      ? currentSchedule.filter((s) => s !== value)
      : [...currentSchedule, value];
    try {
      const res = await fetch(`/api/campers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationSchedule: newSchedule }),
      });
      if (res.ok) {
        const data = await res.json();
        setCamper(data.camper);
      }
    } catch {
      // ignore
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!camper) {
    return (
      <div className="text-center py-20 text-slate-400">Camper not found</div>
    );
  }

  const isAdmin = session?.role === "admin";
  const isNurseOrAdmin = session?.role === "nurse" || session?.role === "admin";
  const hasMedical =
    camper.allergies || camper.currentMedications || camper.medicalConditions;

  // Merge all activity into a single timeline
  const timeline = [
    ...medicalLogs.map((l) => ({
      id: `med-${l.id}`,
      timestamp: l.timestamp,
      kind: "medical" as const,
      data: l,
    })),
    ...behavioralIncidents.map((b) => ({
      id: `beh-${b.id}`,
      timestamp: b.timestamp,
      kind: "behavioral" as const,
      data: b,
    })),
    ...edits.map((e) => ({
      id: `edit-${e.id}`,
      timestamp: e.changedAt,
      kind: "edit" as const,
      data: e,
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-blue-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">
            {camper.firstName} {camper.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {camper.campWeekend}
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
              {camper.role}
            </span>
          </div>
        </div>
        {isAdmin && (
          <Link
            href={`/campers/${id}/edit`}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Edit
          </Link>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Link
          href={`/logs/medical?camperId=${camper.id}`}
          className="flex-1 bg-red-50 text-red-700 rounded-xl py-3 text-center text-sm font-medium hover:bg-red-100 transition-colors"
        >
          + Medical Log
        </Link>
        <Link
          href={`/logs/behavioral?camperId=${camper.id}`}
          className="flex-1 bg-orange-50 text-orange-700 rounded-xl py-3 text-center text-sm font-medium hover:bg-orange-100 transition-colors"
        >
          + Incident
        </Link>
      </div>

      {/* Camp Assignment */}
      {(camper.largeGroup || camper.smallGroup || camper.cabinNumber || camper.busNumber) && (
        <Section title="Camp Assignment">
          <InfoRow label="Large Group" value={camper.largeGroup} />
          <InfoRow label="Small Group" value={camper.smallGroup} />
          <InfoRow label="Cabin Number" value={camper.cabinNumber} />
          <InfoRow label="Bus Number" value={camper.busNumber} />
        </Section>
      )}

      {/* Medical info - highlighted */}
      {hasMedical && (
        <Section
          title="Medical Information"
          className="border-red-200 bg-red-50/30"
          headerRight={
            isNurseOrAdmin ? (
              <button
                onClick={toggleTimedOverride}
                disabled={togglingOverride}
                className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                  camper.timedMedicationOverride
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                }`}
              >
                {togglingOverride ? "..." : camper.timedMedicationOverride ? "Timed: ON" : "Timed: OFF"}
              </button>
            ) : undefined
          }
        >
          <InfoRow label="Allergies" value={camper.allergies} />
          <InfoRow label="Current Medications" value={camper.currentMedications} />
          {/* Medication schedule pills */}
          {camper.timedMedicationOverride ? (
            <div className="py-2 border-b border-slate-50">
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Medication Schedule</dt>
              <div className="flex flex-wrap gap-1.5">
                {MEDICATION_SCHEDULES.map((s) => {
                  const active = currentSchedule.includes(s.value);
                  return isNurseOrAdmin ? (
                    <button
                      key={s.value}
                      onClick={() => toggleScheduleLabel(s.value)}
                      disabled={savingSchedule}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        active
                          ? scheduleColors[s.value]
                          : "bg-white text-slate-400 border-slate-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ) : (
                    active && (
                      <span
                        key={s.value}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium ${scheduleColors[s.value]}`}
                      >
                        {s.label}
                      </span>
                    )
                  );
                })}
              </div>
              {currentSchedule.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {currentSchedule.map((s) => MEDICATION_SCHEDULES.find((ms) => ms.value === s)?.timeRange).filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          ) : currentSchedule.length > 0 ? (
            <div className="py-2 border-b border-slate-50">
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Medication Schedule</dt>
              <div className="flex flex-wrap gap-1.5">
                {currentSchedule.map((s) => (
                  <span key={s} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${scheduleColors[s]}`}>
                    {MEDICATION_SCHEDULES.find((ms) => ms.value === s)?.label || s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <InfoRow label="Medical Conditions" value={camper.medicalConditions} />
          <InfoRow label="Recent Injuries/Surgeries" value={camper.recentInjuries} />
          <InfoRow label="Physical Limitations" value={camper.physicalLimitations} />
          <InfoRow label="Last Tetanus Shot" value={camper.lastTetanusShot} />
          <InfoRow label="Other Medical Needs" value={camper.otherMedicalNeeds} />
          <InfoRow label="Dietary Restrictions" value={camper.dietaryRestrictions} />
        </Section>
      )}

      {/* Permissions */}
      <Section title="Permissions">
        <InfoRow label="First Aid Permission" value={camper.firstAidPermission} />
        <InfoRow label="OTC Medication Permission" value={camper.otcMedicationPermission} />
      </Section>

      {/* Insurance */}
      <Section title="Insurance">
        <InfoRow label="Has Insurance" value={camper.hasInsurance} />
        <InfoRow label="Provider" value={camper.insuranceProvider} />
        <InfoRow label="Policy Number" value={camper.policyNumber} />
        <InfoRow label="Insured Name" value={camper.insuredFirstName && camper.insuredLastName ? `${camper.insuredFirstName} ${camper.insuredLastName}` : null} />
        <InfoRow label="Insurance Phone" value={camper.insurancePhone} />
      </Section>

      {/* Personal info */}
      <Section title="Personal Information">
        <InfoRow label="Date of Birth" value={camper.birthDate} />
        <InfoRow label="Gender" value={camper.gender} />
        <InfoRow label="Email" value={camper.email} />
        <InfoRow label="Phone" value={camper.cellPhone} />
        <InfoRow label="School" value={camper.school} />
        <InfoRow label="Grade" value={camper.gradeLevel} />
        <InfoRow label="Address" value={[camper.addressStreet, camper.addressCity, camper.addressState, camper.addressZip].filter(Boolean).join(", ")} />
      </Section>

      {/* Guardian */}
      <Section title="Guardian">
        <InfoRow label="Name" value={camper.guardianFirstName && camper.guardianLastName ? `${camper.guardianFirstName} ${camper.guardianLastName}` : null} />
        <InfoRow label="Email" value={camper.guardianEmail} />
        <InfoRow label="Phone" value={camper.guardianPhone} />
      </Section>

      {/* Emergency Contact */}
      <Section title="Emergency Contact">
        <InfoRow label="Name" value={camper.emergencyFirstName && camper.emergencyLastName ? `${camper.emergencyFirstName} ${camper.emergencyLastName}` : null} />
        <InfoRow label="Relationship" value={camper.emergencyRelationship} />
        <InfoRow label="Phone" value={camper.emergencyPhone} />
      </Section>

      {/* Activity Trail */}
      <Section title={`Activity Trail (${timeline.length})`}>
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No activity recorded yet</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {timeline.map((entry) => (
              <div key={entry.id} className="py-3">
                {entry.kind === "medical" ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {logTypeLabels[(entry.data as MedicalLog).type] || (entry.data as MedicalLog).type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    {(entry.data as MedicalLog).medication && (
                      <p className="text-sm text-slate-700">
                        {(entry.data as MedicalLog).medication} — {(entry.data as MedicalLog).dosage}
                      </p>
                    )}
                    {(entry.data as MedicalLog).notes && (
                      <p className="text-sm text-slate-500 mt-1">{(entry.data as MedicalLog).notes}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">by {(entry.data as MedicalLog).loggedBy}</p>
                  </div>
                ) : entry.kind === "behavioral" ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[(entry.data as BehavioralIncident).severity] || "bg-slate-100"}`}>
                        {(entry.data as BehavioralIncident).severity}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{(entry.data as BehavioralIncident).description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Staff: {(entry.data as BehavioralIncident).staffName} | by {(entry.data as BehavioralIncident).loggedBy}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Edit
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">
                        {fieldLabels[(entry.data as CamperEdit).fieldName] || (entry.data as CamperEdit).fieldName}
                      </span>
                      {" changed"}
                      {(entry.data as CamperEdit).oldValue && (
                        <> from <span className="text-slate-500 line-through">{(entry.data as CamperEdit).oldValue}</span></>
                      )}
                      {(entry.data as CamperEdit).newValue && (
                        <> to <span className="font-medium">{(entry.data as CamperEdit).newValue}</span></>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">by {(entry.data as CamperEdit).changedBy}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
