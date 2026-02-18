"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { downloadCSV } from "@/lib/export-csv";
import { downloadPDF } from "@/lib/export-pdf";
import type { Camper } from "@/types";

export default function ExportPage() {
  const [loading, setLoading] = useState("");
  const [camperSearch, setCamperSearch] = useState("");
  const [selectedCamper, setSelectedCamper] = useState<Camper | null>(null);
  const [searchResults, setSearchResults] = useState<Camper[]>([]);

  const searchCampers = async (query: string) => {
    setCamperSearch(query);
    if (query.length >= 2) {
      const res = await fetch(`/api/campers?search=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setSearchResults(data.campers);
    } else {
      setSearchResults([]);
    }
  };

  const exportAllCampers = async (format: "csv" | "pdf") => {
    setLoading(`campers-${format}`);
    try {
      const res = await fetch("/api/campers?limit=0");
      const data = await res.json();
      const campers = data.campers as Camper[];

      if (format === "csv") {
        downloadCSV(
          campers.map((c) => ({
            "First Name": c.firstName,
            "Last Name": c.lastName,
            School: c.school,
            Weekend: c.campWeekend,
            Role: c.role,
            Gender: c.gender,
            Email: c.email,
            Phone: c.cellPhone,
            Allergies: c.allergies,
            Medications: c.currentMedications,
            "Medical Conditions": c.medicalConditions,
            "Guardian Name": `${c.guardianFirstName} ${c.guardianLastName}`,
            "Guardian Phone": c.guardianPhone,
            "Emergency Contact": `${c.emergencyFirstName} ${c.emergencyLastName}`,
            "Emergency Phone": c.emergencyPhone,
          })),
          `ryla-campers-${new Date().toISOString().split("T")[0]}.csv`
        );
      } else {
        downloadPDF(
          "RYLA Camper Directory",
          ["Name", "School", "Weekend", "Role", "Allergies", "Medications", "Guardian", "Emergency"],
          campers.map((c) => [
            `${c.lastName}, ${c.firstName}`,
            c.school || "",
            c.campWeekend,
            c.role,
            c.allergies || "",
            c.currentMedications || "",
            `${c.guardianFirstName} ${c.guardianLastName} ${c.guardianPhone || ""}`,
            `${c.emergencyFirstName} ${c.emergencyLastName} ${c.emergencyPhone || ""}`,
          ]),
          `ryla-campers-${new Date().toISOString().split("T")[0]}.pdf`
        );
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading("");
    }
  };

  const exportAllLogs = async (format: "csv" | "pdf") => {
    setLoading(`logs-${format}`);
    try {
      const [medRes, behRes] = await Promise.all([
        fetch("/api/medical-logs?limit=9999"),
        fetch("/api/behavioral-incidents?limit=9999"),
      ]);
      const medLogs = await medRes.json();
      const behLogs = await behRes.json();

      const allLogs = [
        ...medLogs.map((l: Record<string, string>) => ({
          Type: "Medical",
          Camper: `${l.camperFirstName} ${l.camperLastName}`,
          Timestamp: new Date(l.timestamp).toLocaleString(),
          Category: l.type,
          Details: [l.medication, l.dosage, l.treatment, l.notes].filter(Boolean).join(" | "),
          "Logged By": l.loggedBy,
        })),
        ...behLogs.map((b: Record<string, string>) => ({
          Type: "Behavioral",
          Camper: `${b.camperFirstName} ${b.camperLastName}`,
          Timestamp: new Date(b.timestamp).toLocaleString(),
          Category: b.severity,
          Details: b.description,
          "Logged By": b.loggedBy,
        })),
      ];

      if (format === "csv") {
        downloadCSV(allLogs, `ryla-all-logs-${new Date().toISOString().split("T")[0]}.csv`);
      } else {
        downloadPDF(
          "RYLA All Logs",
          ["Type", "Camper", "Timestamp", "Category", "Details", "Logged By"],
          allLogs.map((l) => [l.Type, l.Camper, l.Timestamp, l.Category, l.Details, l["Logged By"]]),
          `ryla-all-logs-${new Date().toISOString().split("T")[0]}.pdf`
        );
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading("");
    }
  };

  const exportSingleCamper = async (format: "csv" | "pdf") => {
    if (!selectedCamper) return;
    setLoading(`single-${format}`);
    try {
      const res = await fetch(`/api/campers/${selectedCamper.id}`);
      const data = await res.json();
      const c = data.camper as Camper;
      const medLogs = data.medicalLogs || [];
      const behLogs = data.behavioralIncidents || [];

      if (format === "csv") {
        const rows = [
          { Section: "Personal", Field: "Name", Value: `${c.firstName} ${c.lastName}` },
          { Section: "Personal", Field: "School", Value: c.school || "" },
          { Section: "Personal", Field: "Weekend", Value: c.campWeekend },
          { Section: "Medical", Field: "Allergies", Value: c.allergies || "" },
          { Section: "Medical", Field: "Medications", Value: c.currentMedications || "" },
          { Section: "Medical", Field: "Conditions", Value: c.medicalConditions || "" },
          { Section: "Guardian", Field: "Name", Value: `${c.guardianFirstName} ${c.guardianLastName}` },
          { Section: "Guardian", Field: "Phone", Value: c.guardianPhone || "" },
          { Section: "Emergency", Field: "Name", Value: `${c.emergencyFirstName} ${c.emergencyLastName}` },
          { Section: "Emergency", Field: "Phone", Value: c.emergencyPhone || "" },
          ...medLogs.map((l: Record<string, string>) => ({
            Section: "Medical Log",
            Field: l.type,
            Value: `${new Date(l.timestamp).toLocaleString()} - ${[l.medication, l.dosage, l.notes].filter(Boolean).join(" | ")}`,
          })),
          ...behLogs.map((b: Record<string, string>) => ({
            Section: "Behavioral",
            Field: b.severity,
            Value: `${new Date(b.timestamp).toLocaleString()} - ${b.description}`,
          })),
        ];
        downloadCSV(rows, `ryla-${c.lastName}-${c.firstName}-${new Date().toISOString().split("T")[0]}.csv`);
      } else {
        // Build PDF with sections
        const allRows: (string | number)[][] = [];
        allRows.push(["Personal", "Name", `${c.firstName} ${c.lastName}`]);
        allRows.push(["Personal", "School", c.school || "N/A"]);
        allRows.push(["Personal", "Weekend", c.campWeekend]);
        allRows.push(["Medical", "Allergies", c.allergies || "None"]);
        allRows.push(["Medical", "Medications", c.currentMedications || "None"]);
        allRows.push(["Medical", "Conditions", c.medicalConditions || "None"]);
        allRows.push(["Guardian", "Name", `${c.guardianFirstName} ${c.guardianLastName}`]);
        allRows.push(["Guardian", "Phone", c.guardianPhone || "N/A"]);
        allRows.push(["Emergency", "Name", `${c.emergencyFirstName} ${c.emergencyLastName}`]);
        allRows.push(["Emergency", "Phone", c.emergencyPhone || "N/A"]);

        medLogs.forEach((l: Record<string, string>) => {
          allRows.push([
            "Medical Log",
            l.type,
            `${new Date(l.timestamp).toLocaleString()} - ${[l.medication, l.dosage, l.notes].filter(Boolean).join(" | ")}`,
          ]);
        });

        behLogs.forEach((b: Record<string, string>) => {
          allRows.push([
            "Behavioral",
            b.severity,
            `${new Date(b.timestamp).toLocaleString()} - ${b.description}`,
          ]);
        });

        downloadPDF(
          `${c.firstName} ${c.lastName} — Full Record`,
          ["Section", "Field", "Value"],
          allRows,
          `ryla-${c.lastName}-${c.firstName}-${new Date().toISOString().split("T")[0]}.pdf`
        );
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading("");
    }
  };

  return (
    <AppShell>
      <div className="p-4 space-y-6">
        <h1 className="text-xl font-bold text-slate-900">Export Data</h1>

        {/* All Campers */}
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <h2 className="font-semibold text-sm text-slate-700 mb-3">All Campers</h2>
          <p className="text-xs text-slate-500 mb-3">Export directory with camper info, medical alerts, and contacts.</p>
          <div className="flex gap-2">
            <button
              onClick={() => exportAllCampers("csv")}
              disabled={!!loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {loading === "campers-csv" ? "Exporting..." : "CSV"}
            </button>
            <button
              onClick={() => exportAllCampers("pdf")}
              disabled={!!loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {loading === "campers-pdf" ? "Exporting..." : "PDF"}
            </button>
          </div>
        </div>

        {/* All Logs */}
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <h2 className="font-semibold text-sm text-slate-700 mb-3">All Logs</h2>
          <p className="text-xs text-slate-500 mb-3">Export all medical logs and behavioral incidents.</p>
          <div className="flex gap-2">
            <button
              onClick={() => exportAllLogs("csv")}
              disabled={!!loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {loading === "logs-csv" ? "Exporting..." : "CSV"}
            </button>
            <button
              onClick={() => exportAllLogs("pdf")}
              disabled={!!loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {loading === "logs-pdf" ? "Exporting..." : "PDF"}
            </button>
          </div>
        </div>

        {/* Single Camper */}
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <h2 className="font-semibold text-sm text-slate-700 mb-3">Single Camper Full Record</h2>
          <p className="text-xs text-slate-500 mb-3">Export complete record for one camper including all logs.</p>

          {selectedCamper ? (
            <div className="mb-3">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-blue-900 flex-1">
                  {selectedCamper.firstName} {selectedCamper.lastName}
                </span>
                <button onClick={() => setSelectedCamper(null)} className="text-blue-400 hover:text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-3 relative">
              <input
                type="text"
                placeholder="Search for a camper..."
                value={camperSearch}
                onChange={(e) => searchCampers(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCamper(c);
                        setCamperSearch("");
                        setSearchResults([]);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm border-b border-slate-50"
                    >
                      {c.lastName}, {c.firstName} — {c.school}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => exportSingleCamper("csv")}
              disabled={!selectedCamper || !!loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {loading === "single-csv" ? "Exporting..." : "CSV"}
            </button>
            <button
              onClick={() => exportSingleCamper("pdf")}
              disabled={!selectedCamper || !!loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {loading === "single-pdf" ? "Exporting..." : "PDF"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
