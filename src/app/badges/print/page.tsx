"use client";

import { useEffect, useState } from "react";
import { BIOME_COLORS } from "@/lib/constants";

interface Camper {
  id: number;
  firstName: string;
  lastName: string;
  largeGroup: string | null;
  smallGroup: string | null;
  cabinName: string | null;
  meetingLocation?: string | null;
}

function Badge({ camper, logo, firstNameSize }: { camper: Camper; logo: string | null; firstNameSize: number }) {
  const colors = BIOME_COLORS[camper.largeGroup || ""] || BIOME_COLORS.Arctic;

  return (
    <div
      className="badge-cell"
      style={{
        width: "4in",
        height: "3in",
        overflow: "hidden",
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.15in",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        gap: "4px",
      }}
    >
      {logo && (
        <img src={logo} alt="" style={{ maxHeight: "0.55in", maxWidth: "1.4in", objectFit: "contain" }} />
      )}
      <div style={{ fontSize: `${firstNameSize}px`, fontWeight: 800, color: colors.hex, lineHeight: 1.1, textAlign: "center" }}>
        {camper.firstName}
      </div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
        {camper.lastName}
      </div>
      <div style={{ marginTop: "4px", textAlign: "center", lineHeight: 1.7 }}>
        <div style={{ fontSize: "17px" }}>
          <span style={{ fontWeight: 700, color: colors.hex }}>{camper.smallGroup || "—"}</span>
        </div>
        <div style={{ fontSize: "12px" }}>
          <span style={{ fontWeight: 600, color: "#64748b" }}>{camper.largeGroup || "—"}</span>
        </div>
        <div style={{ fontSize: "15px" }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Discussion Meeting Location: </span>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{camper.meetingLocation || "—"}</span>
        </div>
        <div style={{ fontSize: "15px" }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>Sleeping Cabin: </span>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{camper.cabinName || "—"}</span>
        </div>
      </div>
    </div>
  );
}

export default function PrintBadgesPage() {
  const [campers, setCampers] = useState<Camper[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [firstNameSize, setFirstNameSize] = useState(28);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem("badge-campers");
    const savedLogo = sessionStorage.getItem("badge-logo");
    const savedSize = sessionStorage.getItem("badge-font-size");

    if (data) setCampers(JSON.parse(data));
    if (savedLogo) setLogo(savedLogo);
    if (savedSize) setFirstNameSize(Number(savedSize));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && campers.length > 0) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [ready, campers]);

  if (!ready) return null;

  if (campers.length === 0) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No campers selected. Go back and select campers first.</div>;
  }

  // Split into pages of 6 (Avery 5392: 2 cols x 3 rows)
  const pages: Camper[][] = [];
  for (let i = 0; i < campers.length; i += 6) {
    pages.push(campers.slice(i, i + 6));
  }

  return (
    <div className="print-badges">
      {/* Screen-only header */}
      <div className="no-print" style={{ padding: "1rem", textAlign: "center", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
          {campers.length} badge{campers.length !== 1 ? "s" : ""} on {pages.length} page{pages.length !== 1 ? "s" : ""} (6 per page).
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
            width: "8.5in",
            height: "11in",
            padding: "1in 0.25in",
            display: "grid",
            gridTemplateColumns: "4in 4in",
            gridTemplateRows: "repeat(3, 3in)",
            gap: "0in",
            justifyContent: "center",
            alignContent: "start",
            pageBreakAfter: "always",
            boxSizing: "border-box",
            margin: "0 auto",
          }}
        >
          {page.map((camper) => (
            <Badge key={camper.id} camper={camper} logo={logo} firstNameSize={firstNameSize} />
          ))}
        </div>
      ))}
    </div>
  );
}
