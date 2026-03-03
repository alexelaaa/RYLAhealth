"use client";

import { useState, useRef } from "react";
import AppShell from "@/components/layout/AppShell";

interface PreviewResult {
  preview: boolean;
  totalParsed: number;
  newCount: number;
  updateCount: number;
}

interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  total: number;
}

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setPreview(data);
    } catch {
      setError("Failed to preview file");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("confirm", "true");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResult(data);
      setPreview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Failed to import file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 space-y-6">
        <h1 className="text-xl font-bold text-slate-900">Admin Upload</h1>
        <p className="text-sm text-slate-500">
          Upload a CSV file (exported from Google Sheets) to add or update camper registrations.
          Includes cabin assignments, group assignments, and bus stop details.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
            Import complete: {result.inserted} new records, {result.updated} updated.
            Total: {result.total} records processed.
          </div>
        )}

        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select CSV File (.csv)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPreview(null);
              setResult(null);
              setError("");
            }}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {file && !preview && (
          <button
            onClick={handlePreview}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {loading ? "Analyzing..." : "Preview Changes"}
          </button>
        )}

        {preview && (
          <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-3">
            <h2 className="font-semibold text-sm text-slate-700">Preview</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{preview.totalParsed}</p>
                <p className="text-xs text-slate-500">Total Records</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{preview.newCount}</p>
                <p className="text-xs text-green-600">New</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{preview.updateCount}</p>
                <p className="text-xs text-blue-600">Updated</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40"
              >
                {loading ? "Importing..." : "Confirm Import"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
