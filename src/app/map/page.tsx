"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";

export default function MapPage() {
  const [zoom, setZoom] = useState(1);

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
              onClick={() => setZoom(1)}
              className="text-xs text-blue-600 hover:underline ml-1"
            >
              Reset
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-500">Idyllwild Pines Camp — pinch to zoom on mobile</p>

        <div className="bg-white rounded-xl border border-slate-200 overflow-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.2s" }}>
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
