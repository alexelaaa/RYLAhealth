"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useCamp } from "@/lib/camp-context";
import { CAMP_WEEKENDS } from "@/lib/constants";

export default function NewStaffPage() {
  return (
    <AppShell>
      <NewStaffContent />
    </AppShell>
  );
}

function NewStaffContent() {
  const router = useRouter();
  const { session } = useCamp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    staffType: "alumni" as "alumni" | "adult",
    staffRole: "",
    phone: "",
    email: "",
    campWeekend: "",
    notes: "",
  });

  if (session?.role !== "admin") {
    return (
      <div className="p-4 text-center py-20 text-slate-400">
        Admin access required.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/camp-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create staff member.");
        setSaving(false);
        return;
      }

      router.push("/staff");
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  };

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-blue-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-900">Add Staff Member</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Staff Type */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set("staffType", "alumni")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              form.staffType === "alumni"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Alumni
          </button>
          <button
            type="button"
            onClick={() => set("staffType", "adult")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              form.staffType === "adult"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Adult
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <input
            type="text"
            value={form.staffRole}
            onChange={(e) => set("staffRole", e.target.value)}
            placeholder="e.g. DGL, Camp Director, Nurse..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Weekend</label>
          <select
            value={form.campWeekend}
            onChange={(e) => set("campWeekend", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Both Weekends</option>
            {CAMP_WEEKENDS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {saving ? "Saving..." : "Add Staff Member"}
        </button>
      </form>
    </div>
  );
}
