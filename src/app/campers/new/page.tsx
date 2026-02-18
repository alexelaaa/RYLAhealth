"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { CAMP_WEEKENDS } from "@/lib/constants";

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

function FormField({ label, value, onChange, type = "text", placeholder, required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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
          required={required}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

export default function AddCamperPage() {
  return (
    <AppShell>
      <AddCamperContent />
    </AppShell>
  );
}

function AddCamperContent() {
  const router = useRouter();
  const { session, campWeekend } = useCamp();

  const [form, setForm] = useState<Record<string, string>>({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "",
    email: "",
    cellPhone: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
    school: "",
    gradeLevel: "",
    guardianFirstName: "",
    guardianLastName: "",
    guardianEmail: "",
    guardianPhone: "",
    emergencyFirstName: "",
    emergencyLastName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    campWeekend: campWeekend || CAMP_WEEKENDS[0],
    role: "Camper",
    dietaryRestrictions: "",
    allergies: "",
    currentMedications: "",
    medicalConditions: "",
    recentInjuries: "",
    physicalLimitations: "",
    lastTetanusShot: "",
    otherMedicalNeeds: "",
    largeGroup: "",
    smallGroup: "",
    cabinNumber: "",
    busNumber: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Redirect non-admins
  if (session && session.role !== "admin") {
    router.push("/campers");
    return null;
  }

  const updateField = (field: string) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/campers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add camper");
        return;
      }

      const data = await res.json();
      router.push(`/campers/${data.camper.id}`);
    } catch {
      setError("Failed to add camper");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/campers" className="text-blue-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Add New Camper</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Personal Information */}
      <FormSection title="Personal Information">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={form.firstName} onChange={updateField("firstName")} required />
          <FormField label="Last Name" value={form.lastName} onChange={updateField("lastName")} required />
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

      {/* Medical Information */}
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
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Weekend<span className="text-red-500 ml-0.5">*</span>
          </label>
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
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:bg-blue-700 transition-colors shadow-lg"
          >
            {saving ? "Adding..." : "Add Camper"}
          </button>
        </div>
      </div>
    </div>
  );
}
