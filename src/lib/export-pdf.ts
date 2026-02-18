import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string
) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 28,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
}
