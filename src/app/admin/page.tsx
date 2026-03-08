"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import ScheduleNow from "@/components/ScheduleNow";
import AnnouncementBanner from "@/components/AnnouncementBanner";

const adminTools = [
  {
    href: "/admin/movements",
    title: "Camp Movements",
    description: "Reassign cabins, groups, and mark no-shows",
    color: "bg-green-50 text-green-800 border-green-200 hover:border-green-400",
    iconColor: "text-green-600",
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
    title: "Camp Arrival",
    description: "Confirm camper arrivals at camp",
    color: "bg-teal-50 text-teal-700 border-teal-100 hover:border-teal-300",
    iconColor: "text-teal-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/inventory",
    title: "Inventory",
    description: "Track camp supplies and swag items",
    color: "bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300",
    iconColor: "text-blue-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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
    href: "/badges",
    title: "Name Badges",
    description: "Print Avery 5392 name badges",
    color: "bg-cyan-50 text-cyan-700 border-cyan-100 hover:border-cyan-300",
    iconColor: "text-cyan-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
      </svg>
    ),
  },
  {
    href: "/admin/cabin-checkins",
    title: "Cabin Check-Ins",
    description: "DGL nightly attendance dashboard",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300",
    iconColor: "text-emerald-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
      </svg>
    ),
  },
  {
    href: "/admin/dgl-pins",
    title: "DGL PINs",
    description: "Generate and manage DGL login PINs",
    color: "bg-orange-50 text-orange-700 border-orange-100 hover:border-orange-300",
    iconColor: "text-orange-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    href: "/admin/staff-pins",
    title: "Staff PINs",
    description: "Generate and manage adult staff login PINs",
    color: "bg-yellow-50 text-yellow-700 border-yellow-100 hover:border-yellow-300",
    iconColor: "text-yellow-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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
  {
    href: "/admin/announcements",
    title: "Announcements",
    description: "Post announcements to all staff",
    color: "bg-pink-50 text-pink-700 border-pink-100 hover:border-pink-300",
    iconColor: "text-pink-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    href: "/admin/tickets",
    title: "Help Tickets",
    description: "DGL help requests and issues",
    color: "bg-red-50 text-red-700 border-red-100 hover:border-red-300",
    iconColor: "text-red-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    href: "/api/admin/backup",
    title: "Backup DB",
    description: "Download a copy of the database",
    color: "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400",
    iconColor: "text-gray-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  return (
    <AppShell>
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-xl font-bold text-slate-900">Admin Tools</h1>

        <ScheduleNow />

        <AnnouncementBanner />

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
