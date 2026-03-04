"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

const adminTools = [
  {
    href: "/admin/movements",
    title: "Camp Movements",
    description: "Reassign cabins, groups, and mark no-shows",
    color: "bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300",
    iconColor: "text-blue-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    href: "/admin/upload",
    title: "Data Upload",
    description: "Import camper CSV data and group info",
    color: "bg-green-50 text-green-700 border-green-100 hover:border-green-300",
    iconColor: "text-green-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    title: "Users & PINs",
    description: "Manage staff accounts and roles",
    color: "bg-purple-50 text-purple-700 border-purple-100 hover:border-purple-300",
    iconColor: "text-purple-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/schools",
    title: "School Cleanup",
    description: "Merge duplicate school names",
    color: "bg-amber-50 text-amber-700 border-amber-100 hover:border-amber-300",
    iconColor: "text-amber-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/admin/bus-map",
    title: "Bus Map",
    description: "Live bus tracking and status",
    color: "bg-indigo-50 text-indigo-700 border-indigo-100 hover:border-indigo-300",
    iconColor: "text-indigo-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    href: "/checkin",
    title: "Bus Check-In",
    description: "Check in campers as they arrive",
    color: "bg-teal-50 text-teal-700 border-teal-100 hover:border-teal-300",
    iconColor: "text-teal-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/export",
    title: "Export Data",
    description: "Export campers, logs, and reports",
    color: "bg-slate-100 text-slate-700 border-slate-300 hover:border-slate-300",
    iconColor: "text-slate-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/campers/new",
    title: "Add Camper",
    description: "Manually add a new camper",
    color: "bg-rose-50 text-rose-700 border-rose-100 hover:border-rose-300",
    iconColor: "text-rose-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  return (
    <AppShell>
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-xl font-bold text-slate-900">Admin Tools</h1>

        <div className="grid grid-cols-2 gap-3">
          {adminTools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="block">
              <div className={`rounded-xl p-4 border transition-colors h-full ${tool.color}`}>
                <div className={`mb-2 ${tool.iconColor}`}>
                  {tool.icon}
                </div>
                <p className="text-sm font-semibold">{tool.title}</p>
                <p className="text-xs mt-1 opacity-70">{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
