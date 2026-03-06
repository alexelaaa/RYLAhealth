"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";

export default function MapPage() {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  return (
    <AppShell>
      <div className="p-4 space-y-3 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Camp Map</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold"
            >
              -
            </button>
            <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold"
            >
              +
            </button>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 ml-1"
              title="Rotate"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => { setZoom(1); setRotation(0); }}
              className="text-xs text-blue-600 hover:underline ml-1"
            >
              Reset
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-500">Idyllwild Pines Camp — pinch to zoom on mobile</p>

        <div className="bg-white rounded-xl border border-slate-200 overflow-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
          <div style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "center center", transition: "transform 0.3s" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/camp-map.png"
              alt="Idyllwild Pines Camp Map"
              className="w-full"
              style={{ minWidth: "600px" }}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
