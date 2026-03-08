import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";
import { cookies } from "next/headers";

const ALLOWED_ROLES = ["nurse", "staff", "admin"];

export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  if (!session.isLoggedIn || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const weekend = searchParams.get("weekend");

  let query = db
    .select()
    .from(inventoryItems)
    .orderBy(desc(inventoryItems.createdAt))
    .$dynamic();

  if (weekend) {
    query = query.where(eq(inventoryItems.campWeekend, weekend)) as typeof query;
  }

  const items = query.all();

  if (format === "csv") {
    const headers = [
      "Item Name",
      "Category",
      "Quantity",
      "Size",
      "Unit",
      "Notes",
      "Entered By",
      "Camp Weekend",
      "Date Added",
    ];
    const rows = items.map((item) => [
      `"${(item.itemName || "").replace(/"/g, '""')}"`,
      `"${(item.category || "").replace(/"/g, '""')}"`,
      item.quantity,
      `"${(item.size || "").replace(/"/g, '""')}"`,
      `"${(item.unit || "").replace(/"/g, '""')}"`,
      `"${(item.notes || "").replace(/"/g, '""')}"`,
      `"${(item.enteredBy || "").replace(/"/g, '""')}"`,
      `"${(item.campWeekend || "").replace(/"/g, '""')}"`,
      `"${(item.createdAt || "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ryla-inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // PDF format - generate a simple HTML-based PDF
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const categories = items.map((i) => i.category).filter((v, i, a) => v && a.indexOf(v) === i);

  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { color: #15803d; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
  .summary { display: flex; gap: 24px; margin-bottom: 24px; }
  .stat { background: #f0fdf4; padding: 12px 20px; border-radius: 8px; }
  .stat-label { font-size: 12px; color: #666; }
  .stat-value { font-size: 24px; font-weight: bold; color: #15803d; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #15803d; color: white; padding: 10px 12px; text-align: left; font-size: 13px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  tr:nth-child(even) { background: #f9fafb; }
  .footer { margin-top: 32px; font-size: 11px; color: #999; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
  <h1>RYLA Camp Inventory</h1>
  <div class="subtitle">${weekend ? `Weekend: ${weekend} | ` : ""}Generated: ${new Date().toLocaleDateString()}</div>

  <div class="summary">
    <div class="stat">
      <div class="stat-label">Total Items</div>
      <div class="stat-value">${items.length}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Quantity</div>
      <div class="stat-value">${totalItems}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Categories</div>
      <div class="stat-value">${categories.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Category</th>
        <th>Qty</th>
        <th>Size</th>
        <th>Unit</th>
        <th>Notes</th>
        <th>Entered By</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item) => `
        <tr>
          <td>${item.itemName}</td>
          <td>${item.category || "-"}</td>
          <td>${item.quantity}</td>
          <td>${item.size || "-"}</td>
          <td>${item.unit || "-"}</td>
          <td>${item.notes || "-"}</td>
          <td>${item.enteredBy}</td>
          <td>${new Date(item.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="footer">RYLA Health App - Inventory Report</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
