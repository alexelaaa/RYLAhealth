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
  deleted: number;
  total: number;
}

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [replaceAll, setReplaceAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Nuke state
  const [nuking, setNuking] = useState(false);
  const [nukeResult, setNukeResult] = useState<Record<string, number> | null>(null);
  const [nukeConfirm, setNukeConfirm] = useState(false);

  // Group Info upload state
  const [groupFile, setGroupFile] = useState<File | null>(null);
  const [groupPreview, setGroupPreview] = useState<{ totalParsed: number } | null>(null);
  const [groupResult, setGroupResult] = useState<{ imported: number } | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState("");
  const groupFileRef = useRef<HTMLInputElement>(null);

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
      if (replaceAll) formData.append("replaceAll", "true");

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
      setReplaceAll(false);
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
            Import complete: {result.deleted > 0 && `${result.deleted} old records cleared. `}
            {result.inserted} new records imported.
            Total: {result.total} records processed.
          </div>
        )}

        <div className="bg-white rounded-xl p-4 border border-slate-300">
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

        {/* Replace all toggle */}
        <label className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={replaceAll}
            onChange={(e) => setReplaceAll(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="text-sm font-medium text-slate-700">Replace all data</span>
            <p className="text-xs text-slate-500">
              Delete all existing campers before importing. Use this to clear out old weekends.
            </p>
          </div>
        </label>

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
          <div className="bg-white rounded-xl p-4 border border-slate-300 space-y-3">
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

            {replaceAll && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 text-xs">
                All existing camper records will be deleted before importing.
              </div>
            )}

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
                className={`flex-1 py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-40 ${
                  replaceAll ? "bg-red-600" : "bg-green-600"
                }`}
              >
                {loading ? "Importing..." : replaceAll ? "Clear & Import" : "Confirm Import"}
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Group Info Upload */}
        <h2 className="text-lg font-bold text-slate-900">Upload Group Info</h2>
        <p className="text-sm text-slate-500">
          Upload the Group Info CSV to set meeting locations and DGL assignments.
          This replaces all existing group info.
        </p>

        {groupError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
            {groupError}
          </div>
        )}

        {groupResult && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
            Group info imported: {groupResult.imported} groups.
          </div>
        )}

        <div className="bg-white rounded-xl p-4 border border-slate-300">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Group Info CSV (.csv)
          </label>
          <input
            ref={groupFileRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setGroupFile(e.target.files?.[0] || null);
              setGroupPreview(null);
              setGroupResult(null);
              setGroupError("");
            }}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {groupFile && !groupPreview && (
          <button
            onClick={async () => {
              setGroupLoading(true);
              setGroupError("");
              setGroupResult(null);
              try {
                const formData = new FormData();
                formData.append("file", groupFile);
                const res = await fetch("/api/admin/upload-groups", {
                  method: "POST",
                  body: formData,
                });
                if (!res.ok) {
                  const data = await res.json();
                  setGroupError(data.error || "Preview failed");
                } else {
                  setGroupPreview(await res.json());
                }
              } catch {
                setGroupError("Failed to preview file");
              } finally {
                setGroupLoading(false);
              }
            }}
            disabled={groupLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {groupLoading ? "Analyzing..." : "Preview Groups"}
          </button>
        )}

        {groupPreview && (
          <div className="bg-white rounded-xl p-4 border border-slate-300 space-y-3">
            <h3 className="font-semibold text-sm text-slate-700">Preview</h3>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{groupPreview.totalParsed}</p>
              <p className="text-xs text-slate-500">Groups Found</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setGroupPreview(null);
                  setGroupFile(null);
                  if (groupFileRef.current) groupFileRef.current.value = "";
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!groupFile) return;
                  setGroupLoading(true);
                  setGroupError("");
                  try {
                    const formData = new FormData();
                    formData.append("file", groupFile);
                    formData.append("confirm", "true");
                    const res = await fetch("/api/admin/upload-groups", {
                      method: "POST",
                      body: formData,
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      setGroupError(data.error || "Import failed");
                    } else {
                      setGroupResult(await res.json());
                      setGroupPreview(null);
                      setGroupFile(null);
                      if (groupFileRef.current) groupFileRef.current.value = "";
                    }
                  } catch {
                    setGroupError("Failed to import file");
                  } finally {
                    setGroupLoading(false);
                  }
                }}
                disabled={groupLoading}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40"
              >
                {groupLoading ? "Importing..." : "Confirm Import"}
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Nuke All Data */}
        <h2 className="text-lg font-bold text-red-700">Delete All Data</h2>
        <p className="text-sm text-slate-500">
          Permanently delete all campers, check-ins, medical logs, behavioral incidents,
          group info, staff, and bus waypoints. This cannot be undone.
        </p>

        {nukeResult && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
            All data deleted: {Object.entries(nukeResult).map(([t, n]) => `${t}: ${n}`).join(", ")}
          </div>
        )}

        {!nukeConfirm ? (
          <button
            onClick={() => setNukeConfirm(true)}
            className="w-full py-3 bg-red-100 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-200 transition-colors"
          >
            Delete All Data...
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-red-800">
              Are you sure? This will delete EVERYTHING from the database.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setNukeConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setNuking(true);
                  try {
                    const res = await fetch("/api/admin/nuke", { method: "POST" });
                    if (res.ok) {
                      const data = await res.json();
                      setNukeResult(data.deleted);
                    } else {
                      setError("Failed to delete data");
                    }
                  } catch {
                    setError("Failed to delete data");
                  } finally {
                    setNuking(false);
                    setNukeConfirm(false);
                  }
                }}
                disabled={nuking}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40"
              >
                {nuking ? "Deleting..." : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
