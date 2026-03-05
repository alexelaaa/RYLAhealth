"use client";

import React, { useEffect, useState } from "react";
import { BIOME_COLORS } from "@/lib/constants";

type BadgeType = "camper" | "dgl" | "staff" | "schedule";

interface Camper {
  id: number;
  firstName: string;
  lastName: string;
  largeGroup: string | null;
  smallGroup: string | null;
  cabinName: string | null;
  busNumber: string | null;
  meetingLocation?: string | null;
}

interface DGL {
  id: string;
  firstName: string;
  lastName: string;
  smallGroup: string;
  largeGroup: string | null;
  cabin: string | null;
  meetingLocation: string | null;
}

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  staffType: string;
  staffRole: string | null;
}

interface Sizes { firstName: number; lastName: number; smallGroup: number; largeGroup: number; info: number; logoHeight: number; }

function CamperBadge({ camper, logo, sizes }: { camper: Camper; logo: string | null; sizes: Sizes }) {
  const colors = BIOME_COLORS[camper.largeGroup || ""] || BIOME_COLORS.Arctic;

  return (
    <div
      className="badge-cell"
      style={{
        width: "4in", height: "3in", overflow: "hidden", backgroundColor: "white",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0.15in", boxSizing: "border-box", pageBreakInside: "avoid", gap: "4px",
      }}
    >
      {logo && <img src={logo} alt="" style={{ maxHeight: `${sizes.logoHeight}px`, maxWidth: "2in", objectFit: "contain" }} />}
      <div style={{ fontSize: `${sizes.firstName}px`, fontWeight: 800, color: colors.hex, lineHeight: 1.1, textAlign: "center", textShadow: "1px 1px 2px rgba(0,0,0,0.15)" }}>
        {camper.firstName}
      </div>
      <div style={{ fontSize: `${sizes.lastName}px`, fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
        {camper.lastName}
      </div>
      <div style={{ marginTop: "4px", textAlign: "center", lineHeight: 1.7 }}>
        <div style={{ fontSize: `${sizes.smallGroup}px` }}>
          <span style={{ fontWeight: 700, color: colors.hex }}>{camper.smallGroup || "—"}</span>
        </div>
        <div style={{ fontSize: `${sizes.largeGroup}px` }}>
          <span style={{ fontWeight: 600, color: "#64748b" }}>{camper.largeGroup || "—"}</span>
        </div>
        <div style={{ fontSize: `${sizes.info}px` }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Discussion Meeting Location: </span>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{camper.meetingLocation || "—"}</span>
        </div>
        <div style={{ fontSize: `${sizes.info}px` }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Sleeping Cabin: </span>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{camper.cabinName || "—"}</span>
        </div>
        {camper.busNumber && (
          <div style={{ fontSize: `${sizes.info}px` }}>
            <span style={{ color: "#94a3b8", fontWeight: 600 }}>Bus: </span>
            <span style={{ fontWeight: 700, color: "#1e293b" }}>{camper.busNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DGLBadge({ dgl, logo, sizes }: { dgl: DGL; logo: string | null; sizes: Sizes }) {
  const colors = BIOME_COLORS[dgl.largeGroup || ""] || BIOME_COLORS.Arctic;

  return (
    <div
      className="badge-cell"
      style={{
        width: "4in", height: "3in", overflow: "hidden", backgroundColor: "white",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0.15in", boxSizing: "border-box", pageBreakInside: "avoid", gap: "4px",
      }}
    >
      {logo && <img src={logo} alt="" style={{ maxHeight: `${sizes.logoHeight}px`, maxWidth: "2in", objectFit: "contain" }} />}
      <div style={{ fontSize: `${sizes.info}px`, fontWeight: 700, color: "#64748b", textAlign: "center", letterSpacing: "0.1em" }}>
        DISCUSSION GROUP LEADER
      </div>
      <div style={{ fontSize: `${sizes.firstName}px`, fontWeight: 800, color: colors.hex, lineHeight: 1.1, textAlign: "center", textShadow: "1px 1px 2px rgba(0,0,0,0.15)" }}>
        {dgl.firstName}
      </div>
      <div style={{ fontSize: `${sizes.lastName}px`, fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
        {dgl.lastName}
      </div>
      <div style={{ marginTop: "4px", textAlign: "center", lineHeight: 1.7 }}>
        <div style={{ fontSize: `${sizes.smallGroup}px` }}>
          <span style={{ fontWeight: 700, color: colors.hex }}>{dgl.smallGroup}</span>
        </div>
        <div style={{ fontSize: `${sizes.largeGroup}px` }}>
          <span style={{ fontWeight: 600, color: "#64748b" }}>{dgl.largeGroup || "—"}</span>
        </div>
        <div style={{ fontSize: `${sizes.info}px` }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Discussion Meeting Location: </span>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{dgl.meetingLocation || "—"}</span>
        </div>
        <div style={{ fontSize: `${sizes.info}px` }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Sleeping Cabin: </span>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{dgl.cabin || "—"}</span>
        </div>
      </div>
    </div>
  );
}

function StaffBadge({ staff, logo, sizes }: { staff: StaffMember; logo: string | null; sizes: Sizes }) {
  const barLabel = staff.staffType === "alumni" ? "ALUMNI" : "STAFF";

  return (
    <div
      className="badge-cell"
      style={{
        width: "4in", height: "3in", overflow: "hidden", backgroundColor: "white",
        display: "flex", flexDirection: "column", alignItems: "center",
        boxSizing: "border-box", pageBreakInside: "avoid", position: "relative",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", padding: "0.15in" }}>
        {logo && <img src={logo} alt="" style={{ maxHeight: `${sizes.logoHeight}px`, maxWidth: "2in", objectFit: "contain" }} />}
        <div style={{ fontSize: `${sizes.firstName}px`, fontWeight: 800, color: "#1e293b", lineHeight: 1.1, textAlign: "center", textShadow: "1px 1px 2px rgba(0,0,0,0.10)" }}>
          {staff.firstName}
        </div>
        <div style={{ fontSize: `${sizes.lastName}px`, fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
          {staff.lastName}
        </div>
        {staff.staffRole && (
          <div style={{ fontSize: `${sizes.smallGroup}px`, fontWeight: 600, color: "#475569", textAlign: "center" }}>
            {staff.staffRole}
          </div>
        )}
      </div>
      <div style={{
        width: "100%", backgroundColor: "#000", color: "#fff",
        textAlign: "center", fontWeight: 800, fontSize: "18px",
        letterSpacing: "0.15em", padding: "6px 0",
      }}>
        {barLabel}
      </div>
    </div>
  );
}

const FRIDAY = [
  ["9:00a", "Buses Arrive"],
  ["11:15a", "Ice Breakers"],
  ["12:15p", "Camp Photo"],
  ["12:25p", "Lunch"],
  ["1:35p", "Welcome"],
  ["2:15p", "Discussion 1"],
  ["3:10p", "Activity 1"],
  ["4:05p", "Speaker – Max"],
  ["5:05p", "Discussion 2"],
  ["6:00p", "Dinner"],
  ["7:10p", "Cabin Time"],
  ["7:40p", "Speaker – Jackie"],
  ["8:25p", "Culture Walk"],
  ["9:50p", "Discussion 3"],
  ["10:30p", "Alumni Intros"],
  ["12:00a", "Lights Out"],
];

const SATURDAY = [
  ["6:30a", "Free Time"],
  ["8:00a", "Breakfast"],
  ["9:00a", "Speaker – Max"],
  ["10:00a", "Discussion 4"],
  ["10:55a", "Activity 2"],
  ["11:50a", "Speaker – Jackie"],
  ["12:50p", "Lunch"],
  ["2:00p", "Speaker – Mike"],
  ["3:00p", "Discussion 5"],
  ["4:25p", "Activity 3"],
  ["5:20p", "Dinner"],
  ["6:30p", "Talent Show"],
  ["8:00p", "Carnival"],
  ["11:30p", "Lights Out"],
];

const SUNDAY = [
  ["6:30a", "Free Time / Pack"],
  ["8:00a", "Breakfast"],
  ["9:00a", "Camp Activity"],
  ["10:45a", "Activity 4"],
  ["11:40a", "Discussion 6"],
  ["12:35p", "Lunch"],
  ["1:45p", "Activity 5"],
  ["2:40p", "Discussion 7"],
  ["3:35p", "Closing Session"],
  ["5:15p", "Load Buses"],
  ["6:00p", "Depart!"],
];

const MARCH_ACTIVITIES: Record<string, string[]> = {
  Jungle:     ["XC Ski", "Spag Twr", "Boardwalk", "Egg Drop", "Capture"],
  Marine:     ["Capture", "XC Ski", "Spag Twr", "Boardwalk", "Egg Drop"],
  Arctic:     ["Egg Drop", "Capture", "XC Ski", "Spag Twr", "Boardwalk"],
  Desert:     ["Boardwalk", "Egg Drop", "Capture", "XC Ski", "Spag Twr"],
  Grasslands: ["Spag Twr", "Boardwalk", "Egg Drop", "Capture", "XC Ski"],
};

function ScheduleBadge() {
  const colStyle: React.CSSProperties = { flex: 1, paddingRight: "3px" };
  const headerStyle: React.CSSProperties = { fontWeight: 800, fontSize: "8.5px", marginBottom: "2px", letterSpacing: "0.05em" };
  const rowStyle: React.CSSProperties = { display: "flex", fontSize: "7px", lineHeight: 1.4 };
  const timeStyle: React.CSSProperties = { width: "34px", fontWeight: 700, flexShrink: 0, color: "#334155" };
  const eventStyle: React.CSSProperties = { color: "#475569" };

  const renderDay = (title: string, events: string[][]) => (
    <div style={colStyle}>
      <div style={headerStyle}>{title}</div>
      {events.map(([time, event], i) => (
        <div key={i} style={rowStyle}>
          <span style={timeStyle}>{time}</span>
          <span style={eventStyle}>{event}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="badge-cell"
      style={{
        width: "4in", height: "3in", overflow: "hidden", backgroundColor: "white",
        display: "flex", flexDirection: "column",
        padding: "0.1in 0.12in", boxSizing: "border-box", pageBreakInside: "avoid",
      }}
    >
      <div style={{ textAlign: "center", fontWeight: 900, fontSize: "10px", letterSpacing: "0.1em", marginBottom: "3px" }}>
        RYLA 2026 SCHEDULE
      </div>
      <div style={{ display: "flex", gap: "5px", flex: 1 }}>
        {renderDay("FRIDAY", FRIDAY)}
        <div style={{ width: "1px", backgroundColor: "#cbd5e1", flexShrink: 0 }} />
        {renderDay("SATURDAY", SATURDAY)}
        <div style={{ width: "1px", backgroundColor: "#cbd5e1", flexShrink: 0 }} />
        {renderDay("SUNDAY", SUNDAY)}
      </div>
      <div style={{ borderTop: "1px solid #cbd5e1", marginTop: "3px", paddingTop: "2px" }}>
        <div style={{ fontWeight: 800, fontSize: "7.5px", marginBottom: "1px", letterSpacing: "0.05em" }}>MARCH ACTIVITIES</div>
        <div style={{ display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)", fontSize: "6px", lineHeight: 1.4 }}>
          <div style={{ fontWeight: 700 }}></div>
          {["Act 1", "Act 2", "Act 3", "Act 4", "Act 5"].map(h => (
            <div key={h} style={{ fontWeight: 700, textAlign: "center", color: "#334155" }}>{h}</div>
          ))}
          {Object.entries(MARCH_ACTIVITIES).map(([group, acts]) => (
            <React.Fragment key={group}>
              <div style={{ fontWeight: 700, color: "#334155" }}>{group}</div>
              {acts.map((a, i) => (
                <div key={i} style={{ textAlign: "center", color: "#475569" }}>{a}</div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PrintBadgesPage() {
  const [data, setData] = useState<unknown[]>([]);
  const [badgeType, setBadgeType] = useState<BadgeType>("camper");
  const [logo, setLogo] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Sizes>({ firstName: 28, lastName: 20, smallGroup: 17, largeGroup: 14, info: 15, logoHeight: 55 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("badge-campers");
    const savedLogo = sessionStorage.getItem("badge-logo");
    const savedSizes = sessionStorage.getItem("badge-sizes");
    const savedType = sessionStorage.getItem("badge-type") as BadgeType | null;

    if (raw) setData(JSON.parse(raw));
    if (savedLogo) setLogo(savedLogo);
    if (savedSizes) setSizes(JSON.parse(savedSizes));
    if (savedType) setBadgeType(savedType);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && data.length > 0) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [ready, data]);

  if (!ready) return null;

  if (badgeType === "schedule") {
    const count = data.length > 0 ? (data[0] as { count?: number }).count || 6 : 6;
    const scheduleItems = Array.from({ length: count }, (_, i) => i);
    const pages: number[][] = [];
    for (let i = 0; i < scheduleItems.length; i += 6) {
      pages.push(scheduleItems.slice(i, i + 6));
    }
    return (
      <div className="print-badges">
        <div className="no-print" style={{ padding: "1rem", textAlign: "center", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            {count} schedule card{count !== 1 ? "s" : ""} on {pages.length} page{pages.length !== 1 ? "s" : ""}.
          </p>
          <button
            onClick={() => window.print()}
            style={{ marginTop: "0.5rem", padding: "0.5rem 1.5rem", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
          >
            Print
          </button>
        </div>
        {pages.map((page, pageIdx) => (
          <div
            key={pageIdx}
            className="badge-page"
            style={{
              width: "8.5in", height: "11in", padding: "1in 0.25in",
              display: "grid", gridTemplateColumns: "4in 4in", gridTemplateRows: "repeat(3, 3in)",
              gap: "0in", justifyContent: "center", alignContent: "start",
              pageBreakAfter: "always", boxSizing: "border-box", margin: "0 auto",
            }}
          >
            {page.map((_, i) => <ScheduleBadge key={pageIdx * 6 + i} />)}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No badges to print. Go back and select items first.</div>;
  }

  // Split into pages of 6 (Avery 5392: 2 cols x 3 rows)
  const pages: unknown[][] = [];
  for (let i = 0; i < data.length; i += 6) {
    pages.push(data.slice(i, i + 6));
  }

  const renderBadge = (item: unknown, idx: number) => {
    if (badgeType === "dgl") return <DGLBadge key={idx} dgl={item as DGL} logo={logo} sizes={sizes} />;
    if (badgeType === "staff") return <StaffBadge key={idx} staff={item as StaffMember} logo={logo} sizes={sizes} />;
    return <CamperBadge key={idx} camper={item as Camper} logo={logo} sizes={sizes} />;
  };

  return (
    <div className="print-badges">
      <div className="no-print" style={{ padding: "1rem", textAlign: "center", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
          {data.length} {badgeType} badge{data.length !== 1 ? "s" : ""} on {pages.length} page{pages.length !== 1 ? "s" : ""} (6 per page).
          Press Cmd+P / Ctrl+P to print. Set margins to &quot;None&quot; for best results.
        </p>
        <button
          onClick={() => window.print()}
          style={{ marginTop: "0.5rem", padding: "0.5rem 1.5rem", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
        >
          Print
        </button>
      </div>

      {pages.map((page, pageIdx) => (
        <div
          key={pageIdx}
          className="badge-page"
          style={{
            width: "8.5in", height: "11in", padding: "1in 0.25in",
            display: "grid", gridTemplateColumns: "4in 4in", gridTemplateRows: "repeat(3, 3in)",
            gap: "0in", justifyContent: "center", alignContent: "start",
            pageBreakAfter: "always", boxSizing: "border-box", margin: "0 auto",
          }}
        >
          {page.map((item, i) => renderBadge(item, pageIdx * 6 + i))}
        </div>
      ))}
    </div>
  );
}
