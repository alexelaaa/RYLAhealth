"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import type { Camper } from "@/types";

interface CamperSelectProps {
  value: number | null;
  onChange: (camperId: number, camperName: string) => void;
  initialCamperId?: string;
}

export default function CamperSelect({ value, onChange, initialCamperId }: CamperSelectProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Camper[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const ref = useRef<HTMLDivElement>(null);

  // Load initial camper if provided
  useEffect(() => {
    if (initialCamperId && !value) {
      fetch(`/api/campers/${initialCamperId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.camper) {
            onChange(data.camper.id, `${data.camper.firstName} ${data.camper.lastName}`);
            setSelectedName(`${data.camper.firstName} ${data.camper.lastName}`);
          }
        })
        .catch(() => {});
    }
  }, [initialCamperId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      fetch(`/api/campers?search=${encodeURIComponent(debouncedSearch)}&limit=10`)
        .then((r) => r.json())
        .then((data) => setResults(data.campers))
        .catch(() => {});
    } else {
      setResults([]);
    }
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCamper = (camper: Camper) => {
    const name = `${camper.firstName} ${camper.lastName}`;
    setSelectedName(name);
    setSearch("");
    setIsOpen(false);
    onChange(camper.id, name);
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Camper
      </label>
      {value && selectedName ? (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-blue-900 flex-1">{selectedName}</span>
          <button
            onClick={() => {
              onChange(0 as unknown as number, "");
              setSelectedName("");
            }}
            className="text-blue-400 hover:text-blue-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Search for a camper..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isOpen && results.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
              {results.map((camper) => (
                <button
                  key={camper.id}
                  onClick={() => selectCamper(camper)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
                >
                  <div className="text-sm font-medium text-slate-900">
                    {camper.lastName}, {camper.firstName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {camper.school} — {camper.campWeekend}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
