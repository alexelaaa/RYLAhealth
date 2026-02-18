"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { CAMP_WEEKENDS } from "@/lib/constants";
import type { Camper } from "@/types";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h2 className="font-semibold text-sm text-slate-700">{title}</h2>
      </div>
      <div className="px-4 py-3 space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

export default function CamperEditPage() {
  return (
    <AppShell>
      <CamperEditContent />
    </AppShell>
  );
}

function CamperEditContent() {
  const params = useParams();
  const router = useRouter();
  const { session } = useCamp();
  const id = params.id as string;

  const [camper, setCamper] = useState<Camper | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/campers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCamper(data.camper);
        const c = data.camper as Camper;
        setForm({
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          birthDate: c.birthDate || "",
          gender: c.gender || "",
          email: c.email || "",
          cellPhone: c.cellPhone || "",
          addressStreet: c.addressStreet || "",
          addressCity: c.addressCity || "",
          addressState: c.addressState || "",
          addressZip: c.addressZip || "",
          school: c.school || "",
          gradeLevel: c.gradeLevel || "",
          guardianFirstName: c.guardianFirstName || "",
          guardianLastName: c.guardianLastName || "",
          guardianEmail: c.guardianEmail || "",
          guardianPhone: c.guardianPhone || "",
          emergencyFirstName: c.emergencyFirstName || "",
          emergencyLastName: c.emergencyLastName || "",
          emergencyRelationship: c.emergencyRelationship || "",
          emergencyPhone: c.emergencyPhone || "",
          campWeekend: c.campWeekend || "",
          role: c.role || "",
          dietaryRestrictions: c.dietaryRestrictions || "",
          allergies: c.allergies || "",
          currentMedications: c.currentMedications || "",
          medicalConditions: c.medicalConditions || "",
          recentInjuries: c.recentInjuries || "",
          physicalLimitations: c.physicalLimitations || "",
          lastTetanusShot: c.lastTetanusShot || "",
          otherMedicalNeeds: c.otherMedicalNeeds || "",
          largeGroup: c.largeGroup || "",
          smallGroup: c.smallGroup || "",
          cabinNumber: c.cabinNumber || "",
          busNumber: c.busNumber || "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Redirect non-admins
  if (session && session.role !== "admin") {
    router.push(`/campers/${id}`);
    return null;
  }

  const updateField = (field: string) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!camper) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/campers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      router.push(`/campers/${id}`);
    } catch {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
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

  const weekendChanged = form.campWeekend !== camper.campWeekend;

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/campers/${id}`} className="text-blue-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">
          Edit: {camper.firstName} {camper.lastName}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {weekendChanged && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          Warning: You are changing this camper&apos;s weekend assignment.
        </div>
      )}

      {/* Medical */}
      <FormSection title="Medical Information">
        <FormField label="Allergies" value={form.allergies} onChange={updateField("allergies")} type="textarea" />
        <FormField label="Current Medications" value={form.currentMedications} onChange={updateField("currentMedications")} type="textarea" />
        <FormField label="Medical Conditions" value={form.medicalConditions} onChange={updateField("medicalConditions")} type="textarea" />
        <FormField label="Recent Injuries/Surgeries" value={form.recentInjuries} onChange={updateField("recentInjuries")} type="textarea" />
        <FormField label="Physical Limitations" value={form.physicalLimitations} onChange={updateField("physicalLimitations")} type="textarea" />
        <FormField label="Last Tetanus Shot" value={form.lastTetanusShot} onChange={updateField("lastTetanusShot")} />
        <FormField label="Other Medical Needs" value={form.otherMedicalNeeds} onChange={updateField("otherMedicalNeeds")} type="textarea" />
        <FormField label="Dietary Restrictions" value={form.dietaryRestrictions} onChange={updateField("dietaryRestrictions")} type="textarea" />
      </FormSection>

      {/* Personal */}
      <FormSection title="Personal Information">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={form.firstName} onChange={updateField("firstName")} />
          <FormField label="Last Name" value={form.lastName} onChange={updateField("lastName")} />
        </div>
        <FormField label="Date of Birth" value={form.birthDate} onChange={updateField("birthDate")} />
        <FormField label="Gender" value={form.gender} onChange={updateField("gender")} />
        <FormField label="Email" value={form.email} onChange={updateField("email")} type="email" />
        <FormField label="Phone" value={form.cellPhone} onChange={updateField("cellPhone")} type="tel" />
        <FormField label="School" value={form.school} onChange={updateField("school")} />
        <FormField label="Grade Level" value={form.gradeLevel} onChange={updateField("gradeLevel")} />
        <FormField label="Street" value={form.addressStreet} onChange={updateField("addressStreet")} />
        <div className="grid grid-cols-3 gap-3">
          <FormField label="City" value={form.addressCity} onChange={updateField("addressCity")} />
          <FormField label="State" value={form.addressState} onChange={updateField("addressState")} />
          <FormField label="Zip" value={form.addressZip} onChange={updateField("addressZip")} />
        </div>
      </FormSection>

      {/* Guardian */}
      <FormSection title="Guardian">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={form.guardianFirstName} onChange={updateField("guardianFirstName")} />
          <FormField label="Last Name" value={form.guardianLastName} onChange={updateField("guardianLastName")} />
        </div>
        <FormField label="Email" value={form.guardianEmail} onChange={updateField("guardianEmail")} type="email" />
        <FormField label="Phone" value={form.guardianPhone} onChange={updateField("guardianPhone")} type="tel" />
      </FormSection>

      {/* Emergency Contact */}
      <FormSection title="Emergency Contact">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={form.emergencyFirstName} onChange={updateField("emergencyFirstName")} />
          <FormField label="Last Name" value={form.emergencyLastName} onChange={updateField("emergencyLastName")} />
        </div>
        <FormField label="Relationship" value={form.emergencyRelationship} onChange={updateField("emergencyRelationship")} />
        <FormField label="Phone" value={form.emergencyPhone} onChange={updateField("emergencyPhone")} type="tel" />
      </FormSection>

      {/* Camp Assignment */}
      <FormSection title="Camp Assignment">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Weekend</label>
          <select
            value={form.campWeekend}
            onChange={(e) => updateField("campWeekend")(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CAMP_WEEKENDS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => updateField("role")(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Camper">Camper</option>
            <option value="Alternate">Alternate</option>
          </select>
        </div>
        <FormField label="Large Group" value={form.largeGroup} onChange={updateField("largeGroup")} />
        <FormField label="Small Group" value={form.smallGroup} onChange={updateField("smallGroup")} />
        <FormField label="Cabin Number" value={form.cabinNumber} onChange={updateField("cabinNumber")} />
        <FormField label="Bus Number" value={form.busNumber} onChange={updateField("busNumber")} />
      </FormSection>

      {/* Floating save button */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-30">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:bg-blue-700 transition-colors shadow-lg"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
