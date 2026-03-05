"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BIOME_COLORS } from "@/lib/constants";
import {
  FRIDAY_DETAILED, SATURDAY_DETAILED, SUNDAY_DETAILED,
  ACTIVITY_ROTATIONS, ACTIVITY_FULL_NAMES, ACTIVITY_LOCATIONS,
  type DetailedEvent,
} from "@/lib/schedule";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const html2pdf = typeof window !== "undefined" ? require("html2pdf.js") : null;

const PACKET_QR_URL = "http://ryla5330.org/wp-content/uploads/2026/03/RYLA-Packet-2026.docx.pdf";
const APP_QR_URL = "https://ryla.up.railway.app/";

type BadgeType = "camper" | "dgl" | "staff" | "schedule" | "back";

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

function BadgeBack({ showPacketQR, showAppQR }: { showPacketQR: boolean; showAppQR: boolean }) {
  const bothQRs = showPacketQR && showAppQR;

  return (
    <div
      className="badge-cell"
      style={{
        width: "4in", height: "3in", overflow: "hidden", backgroundColor: "white",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxSizing: "border-box", pageBreakInside: "avoid",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: "20px", letterSpacing: "0.12em", color: "#1e293b", marginBottom: bothQRs ? "6px" : "10px" }}>
        RYLA 2026
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: bothQRs ? "32px" : "0" }}>
        {showPacketQR && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <QRCodeSVG value={PACKET_QR_URL} size={bothQRs ? 160 : 200} level="M" />
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>RYLA Packet</div>
          </div>
        )}
        {showAppQR && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <QRCodeSVG value={APP_QR_URL} size={bothQRs ? 160 : 200} level="M" />
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>Camp App</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DayScheduleBadge({ title, events }: { title: string; events: DetailedEvent[] }) {
  // Rotate content 90° so the 4in side becomes height — more room for rows
  const fontSize = events.length > 14 ? "8.5px" : events.length > 11 ? "9.5px" : "10.5px";
  const lineHeight = events.length > 14 ? 1.45 : events.length > 11 ? 1.55 : 1.65;

  return (
    <div
      className="badge-cell"
      style={{
        width: "4in", height: "3in", overflow: "hidden", backgroundColor: "white",
        boxSizing: "border-box", pageBreakInside: "avoid",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Rotated inner container: 3in wide becomes the width, 4in tall becomes the height */}
      <div style={{
        width: "2.8in", height: "3.8in",
        transform: "rotate(90deg)",
        display: "flex", flexDirection: "column",
        padding: "0.05in 0",
      }}>
        <div style={{ textAlign: "center", fontWeight: 900, fontSize: "12px", letterSpacing: "0.1em", marginBottom: "3px", borderBottom: "1.5px solid #1e293b", paddingBottom: "2px" }}>
          RYLA 2026 — {title}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {events.map((event, i) => (
            <div key={i} style={{ display: "flex", fontSize, lineHeight, gap: "3px" }}>
              <span style={{ width: "72px", fontWeight: 700, flexShrink: 0, color: "#334155" }}>{event.time}</span>
              <span style={{ color: "#1e293b", fontWeight: event.bold ? 700 : 400, flex: 1 }}>
                {event.title}
                {event.location && <span style={{ color: "#64748b", fontWeight: 400 }}> — {event.location}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityBadge() {
  return (
    <div
      className="badge-cell"
      style={{
        width: "4in", height: "3in", overflow: "hidden", backgroundColor: "white",
        boxSizing: "border-box", pageBreakInside: "avoid",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Rotated inner container */}
      <div style={{
        width: "2.8in", height: "3.8in",
        transform: "rotate(90deg)",
        display: "flex", flexDirection: "column",
        padding: "0.05in 0",
      }}>
        <div style={{ textAlign: "center", fontWeight: 900, fontSize: "12px", letterSpacing: "0.08em", marginBottom: "6px", borderBottom: "1.5px solid #1e293b", paddingBottom: "3px" }}>
          ACTIVITY ROTATIONS
        </div>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "68px repeat(5, 1fr)", fontSize: "8px", fontWeight: 800, color: "#334155", marginBottom: "3px", textAlign: "center" }}>
          <div style={{ textAlign: "left" }}>Group</div>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n}>Act {n}</div>
          ))}
        </div>
        {/* Group rows */}
        {Object.entries(ACTIVITY_ROTATIONS).map(([group, acts]) => (
          <div key={group} style={{ display: "grid", gridTemplateColumns: "68px repeat(5, 1fr)", fontSize: "7.5px", lineHeight: 1.3, borderTop: "0.5px solid #e2e8f0", paddingTop: "4px", paddingBottom: "4px" }}>
            <div style={{ fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center" }}>{group}</div>
            {acts.map((a, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: "#1e293b" }}>{ACTIVITY_FULL_NAMES[a] || a}</div>
                <div style={{ color: "#64748b", fontSize: "6.5px" }}>({ACTIVITY_LOCATIONS[a] || ""})</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolBar({ label, onDownloadPDF }: { label: string; onDownloadPDF: () => void }) {
  return (
    <div className="no-print" style={{ padding: "1rem", textAlign: "center", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
      <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>{label}</p>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "0.5rem" }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "0.5rem 1.5rem", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
        >
          Print
        </button>
        <button
          onClick={onDownloadPDF}
          style={{ padding: "0.5rem 1.5rem", background: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

export default function PrintBadgesPage() {
  const [data, setData] = useState<unknown[]>([]);
  const [badgeType, setBadgeType] = useState<BadgeType>("camper");
  const [backRole, setBackRole] = useState<"camper" | "dgl" | "staff">("camper");
  const [logo, setLogo] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Sizes>({ firstName: 28, lastName: 20, smallGroup: 17, largeGroup: 14, info: 15, logoHeight: 55 });
  const [ready, setReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const downloadPDF = useCallback(() => {
    if (!contentRef.current || !html2pdf) return;
    const filename = `badges-${badgeType}${badgeType === "back" ? `-${backRole}` : ""}.pdf`;
    html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], before: ".badge-page" },
      })
      .from(contentRef.current)
      .save();
  }, [badgeType, backRole]);

  useEffect(() => {
    const raw = sessionStorage.getItem("badge-campers");
    const savedLogo = sessionStorage.getItem("badge-logo");
    const savedSizes = sessionStorage.getItem("badge-sizes");
    const savedType = sessionStorage.getItem("badge-type") as BadgeType | null;
    const savedBackRole = sessionStorage.getItem("badge-back-role") as "camper" | "dgl" | "staff" | null;

    if (raw) setData(JSON.parse(raw));
    if (savedLogo) setLogo(savedLogo);
    if (savedSizes) setSizes(JSON.parse(savedSizes));
    if (savedType) setBadgeType(savedType);
    if (savedBackRole) setBackRole(savedBackRole);
    setReady(true);
  }, []);

  if (!ready) return null;

  if (badgeType === "back") {
    const count = data.length || 0;
    const showPacketQR = backRole === "camper" || backRole === "dgl";
    const showAppQR = backRole === "dgl" || backRole === "staff";
    const backItems = Array.from({ length: count }, (_, i) => i);
    const pages: number[][] = [];
    for (let i = 0; i < backItems.length; i += 6) {
      pages.push(backItems.slice(i, i + 6));
    }
    const roleLabel = backRole === "camper" ? "camper" : backRole === "dgl" ? "DGL" : "staff";
    return (
      <div className="print-badges">
        <ToolBar
          label={`${count} ${roleLabel} badge back${count !== 1 ? "s" : ""} on ${pages.length} page${pages.length !== 1 ? "s" : ""}.`}
          onDownloadPDF={downloadPDF}
        />
        <div ref={contentRef}>
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
            {page.map((_, i) => (
              <BadgeBack key={pageIdx * 6 + i} showPacketQR={showPacketQR} showAppQR={showAppQR} />
            ))}
          </div>
        ))}
        </div>
      </div>
    );
  }

  if (badgeType === "schedule") {
    const count = data.length > 0 ? (data[0] as { count?: number }).count || 1 : 1;
    const scheduleDay = (data.length > 0 ? (data[0] as { day?: string }).day : null) || "all";

    // Build cards based on selected day
    const allCards: React.ReactNode[] = [];
    for (let s = 0; s < count; s++) {
      if (scheduleDay === "all" || scheduleDay === "friday")
        allCards.push(<DayScheduleBadge key={`fri-${s}`} title="FRIDAY" events={FRIDAY_DETAILED} />);
      if (scheduleDay === "all" || scheduleDay === "saturday")
        allCards.push(<DayScheduleBadge key={`sat-${s}`} title="SATURDAY" events={SATURDAY_DETAILED} />);
      if (scheduleDay === "all" || scheduleDay === "sunday")
        allCards.push(<DayScheduleBadge key={`sun-${s}`} title="SUNDAY" events={SUNDAY_DETAILED} />);
      if (scheduleDay === "all" || scheduleDay === "activities")
        allCards.push(<ActivityBadge key={`act-${s}`} />);
    }
    const totalCards = allCards.length;
    const pages: React.ReactNode[][] = [];
    for (let i = 0; i < allCards.length; i += 6) {
      pages.push(allCards.slice(i, i + 6));
    }
    const dayLabel = scheduleDay === "all" ? "all days" : scheduleDay;
    return (
      <div className="print-badges">
        <ToolBar
          label={`${totalCards} ${dayLabel} card${totalCards !== 1 ? "s" : ""} on ${pages.length} page${pages.length !== 1 ? "s" : ""}.`}
          onDownloadPDF={downloadPDF}
        />
        <div ref={contentRef}>
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
            {page.map((card) => card)}
          </div>
        ))}
        </div>
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
      <ToolBar
        label={`${data.length} ${badgeType} badge${data.length !== 1 ? "s" : ""} on ${pages.length} page${pages.length !== 1 ? "s" : ""} (6 per page). Set margins to "None" for best results.`}
        onDownloadPDF={downloadPDF}
      />
      <div ref={contentRef}>
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
    </div>
  );
}
