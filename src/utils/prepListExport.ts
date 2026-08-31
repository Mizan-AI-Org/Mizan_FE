/**
 * Export Prep List to PDF or Excel.
 */
import { format } from "date-fns";

type PrepItem = {
  ingredient?: string;
  menu_item?: string;
  needed?: number;
  forecast_portions?: number;
  unit?: string;
  in_stock?: number;
  gap?: number;
};

export async function exportPrepListToPDF(
  items: PrepItem[],
  targetDate: string,
  dayOfWeek: string,
  title: string = "Prep List"
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;

  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 14);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  doc.line(margin, 17, margin + 40, 17);
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.text(`${targetDate} (${dayOfWeek})`, margin, 23);

  const headers = ["Item", "Qty Needed", "Unit", "In Stock", "Short"];
  const rows = items.map((item) => {
    const name = item.ingredient ?? item.menu_item ?? "-";
    const qty = item.needed ?? item.forecast_portions ?? 0;
    const unit = item.unit ?? "portions";
    const inStock = item.in_stock != null ? String(item.in_stock) : "-";
    const gap = (item as { gap?: number }).gap;
    const short = gap != null && gap > 0 ? String(gap) : "-";
    return [name, String(qty), unit, inStock, short];
  });

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4, textColor: [30, 41, 59] },
    headStyles: {
      fillColor: [180, 83, 9],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 5,
    },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    theme: "grid",
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.2,
  });

  doc.save(`prep-list-${targetDate}.pdf`);
}

export async function exportPrepListToExcel(
  items: PrepItem[],
  targetDate: string,
  dayOfWeek: string,
  sheetName: string = "Prep List"
): Promise<void> {
  const ExcelJS = await import("exceljs");

  const headers = ["Item", "Qty Needed", "Unit", "In Stock", "Short"];
  const rows = items.map((item) => {
    const name = item.ingredient ?? item.menu_item ?? "-";
    const qty = item.needed ?? item.forecast_portions ?? 0;
    const unit = item.unit ?? "portions";
    const inStock = item.in_stock ?? "";
    const gap = (item as { gap?: number }).gap;
    const short = gap != null && gap > 0 ? gap : "";
    return [name, qty, unit, inStock, short];
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(["Prep List", targetDate, dayOfWeek]);
  ws.addRow([]);
  ws.addRow(headers);
  rows.forEach((row) => ws.addRow(row));
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 10;
  await wb.xlsx.writeFile(`prep-list-${targetDate}.xlsx`);
}
