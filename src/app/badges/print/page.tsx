"use client";

import { useEffect, useState } from "react";
import { BIOME_COLORS } from "@/lib/constants";

type BadgeType = "camper" | "dgl" | "staff";

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

interface Sizes { firstName: number; lastName: number; smallGroup: number; largeGroup: number; info: number; }

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
      {logo && <img src={logo} alt="" style={{ maxHeight: "0.55in", maxWidth: "1.4in", objectFit: "contain" }} />}
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
      {logo && <img src={logo} alt="" style={{ maxHeight: "0.55in", maxWidth: "1.4in", objectFit: "contain" }} />}
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
  const roleLabel = staff.staffType === "alumni" ? "ALUMNI STAFF" : "ADULT STAFF";

  return (
    <div
      className="badge-cell"
      style={{
        width: "4in", height: "3in", overflow: "hidden", backgroundColor: "white",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0.15in", boxSizing: "border-box", pageBreakInside: "avoid", gap: "6px",
      }}
    >
      {logo && <img src={logo} alt="" style={{ maxHeight: "0.55in", maxWidth: "1.4in", objectFit: "contain" }} />}
      <div style={{ fontSize: `${sizes.info}px`, fontWeight: 700, color: "#64748b", textAlign: "center", letterSpacing: "0.1em" }}>
        {roleLabel}
      </div>
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
  );
}

export default function PrintBadgesPage() {
  const [data, setData] = useState<unknown[]>([]);
  const [badgeType, setBadgeType] = useState<BadgeType>("camper");
  const [logo, setLogo] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Sizes>({ firstName: 28, lastName: 20, smallGroup: 17, largeGroup: 14, info: 15 });
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
