"use client";

import Link from "next/link";
import type { Camper } from "@/types";
import { isNonEmpty } from "@/lib/medical-filters";

export default function CamperCard({ camper }: { camper: Camper }) {
  const hasAlerts =
    isNonEmpty(camper.allergies) ||
    isNonEmpty(camper.currentMedications) ||
    isNonEmpty(camper.medicalConditions);

  return (
    <Link href={`/campers/${camper.id}`}>
      <div className="bg-white rounded-xl p-4 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all active:scale-[0.98]">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">
                {camper.lastName}, {camper.firstName}
              </h3>
              {hasAlerts && (
                <span className="flex-shrink-0 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs" title="Has medical alerts">
                  !
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 truncate mt-0.5">
              {camper.school || "No school listed"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {camper.campWeekend}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                {camper.role}
              </span>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
