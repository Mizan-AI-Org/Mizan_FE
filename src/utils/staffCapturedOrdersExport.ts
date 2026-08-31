/**
 * Export staff-captured orders to PDF or Excel (by calendar date range).
 */
import type { StaffCapturedOrderRow } from "@/lib/types";

/** Safe filename segment for a date range (inclusive). */
export function staffOrdersExportFileSlug(dateFrom: string, dateTo: string): string {
  return dateFrom === dateTo ? dateFrom : `${dateFrom}_to_${dateTo}`;
}

export async function exportStaffCapturedOrdersPdf(
  rows: StaffCapturedOrderRow[],
  rangeSubtitle: string,
  fileSlug: string,
  title: string,
  headers: string[],
  rowValues: (row: StaffCapturedOrderRow) => string[],
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 12;

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 12);
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.text(rangeSubtitle, margin, 18);

  const body = rows.map((r) => rowValues(r));

  autoTable(doc, {
    head: [headers],
    body,
    startY: 22,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59], overflow: "linebreak" },
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "grid",
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.15,
  });

  doc.save(`orders-${fileSlug}.pdf`);
}

export async function exportStaffCapturedOrdersExcel(
  rows: StaffCapturedOrderRow[],
  rangeSubtitle: string,
  fileSlug: string,
  title: string,
  sheetName: string,
  headers: string[],
  rowValues: (row: StaffCapturedOrderRow) => string[],
): Promise<void> {
  const ExcelJS = await import("exceljs");

  const body = rows.map((r) => rowValues(r));
  const wb = new ExcelJS.Workbook();
  const safeSheet = sheetName.slice(0, 31).replace(/[:\\/?*[\]]/g, "_") || "Orders";
  const ws = wb.addWorksheet(safeSheet);
  ws.addRow([title, rangeSubtitle]);
  ws.addRow([]);
  ws.addRow(headers);
  body.forEach((row) => ws.addRow(row));
  const colWidths = [18, 36, 16, 14, 16, 22, 22, 14, 12, 12, 16];
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  await wb.xlsx.writeFile(`orders-${fileSlug}.xlsx`);
}
