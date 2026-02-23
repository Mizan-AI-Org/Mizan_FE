/**
 * Export Staff Timesheet (week grid: staff by role × days) to PDF or Excel.
 */
import { format } from "date-fns";
import type { Shift } from "@/types/schedule";

interface StaffMemberForExport {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m || "00"}${ampm}`;
}

function timeRange(start: string, end: string): string {
  return `${formatTime(start)}-${formatTime(end)}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function buildTimesheetMatrix(
  shifts: Shift[],
  staffMembers: StaffMemberForExport[],
  currentDate: Date
): { weekDates: Date[]; staffByRole: { role: string; staff: StaffMemberForExport[] }[]; shiftsByStaffByDate: Record<string, Record<string, Shift[]>> } {
  const weekStart = getWeekStart(currentDate);
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDates.push(d);
  }
  const dateStr = (d: Date) => format(d, "yyyy-MM-dd");

  const shiftsByStaffByDate: Record<string, Record<string, Shift[]>> = {};
  staffMembers.forEach((s) => {
    shiftsByStaffByDate[s.id] = {};
    weekDates.forEach((d) => {
      shiftsByStaffByDate[s.id][dateStr(d)] = [];
    });
  });
  shifts.forEach((shift) => {
    const staffIds = shift.staff_members?.length ? shift.staff_members : [shift.staffId];
    staffIds.forEach((staffId) => {
      if (!staffId) return;
      if (!shiftsByStaffByDate[staffId]) shiftsByStaffByDate[staffId] = {};
      if (!shiftsByStaffByDate[staffId][shift.date]) shiftsByStaffByDate[staffId][shift.date] = [];
      shiftsByStaffByDate[staffId][shift.date].push(shift);
    });
  });

  const byRole: Record<string, StaffMemberForExport[]> = {};
  staffMembers.forEach((s) => {
    const role = (s.role || "STAFF").toUpperCase();
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push(s);
  });
  const order = ["MANAGER", "CHEF", "BARTENDER", "SERVER", "WAITER", "HOST", "CASHIER", "CLEANER", "KITCHEN_PORTER"];
  const staffByRole: { role: string; staff: StaffMemberForExport[] }[] = [];
  const seen = new Set<string>();
  order.forEach((r) => {
    if (byRole[r]) {
      staffByRole.push({ role: r, staff: byRole[r] });
      byRole[r].forEach((s) => seen.add(s.id));
    }
  });
  Object.entries(byRole).forEach(([role, staff]) => {
    if (staff[0] && !seen.has(staff[0].id)) staffByRole.push({ role, staff });
  });

  return { weekDates, staffByRole, shiftsByStaffByDate };
}

function cellText(shifts: Shift[]): string {
  if (!shifts.length) return "—";
  return shifts.map((s) => timeRange(s.start, s.end)).join(", ");
}

export async function exportTimesheetToPDF(
  shifts: Shift[],
  staffMembers: StaffMemberForExport[],
  currentDate: Date,
  title: string = "Staff Timesheet"
): Promise<void> {
  const { weekDates, staffByRole, shiftsByStaffByDate } = buildTimesheetMatrix(shifts, staffMembers, currentDate);
  const dateStr = (d: Date) => format(d, "yyyy-MM-dd");
  const rangeLabel = `${format(weekDates[0], "MMM d")} – ${format(weekDates[6], "MMM d, yyyy")}`;

  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Title block: bold title + accent line + date range
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 14);
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.8);
  doc.line(margin, 17, margin + 50, 17);
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont("helvetica", "normal");
  doc.text(rangeLabel, margin, 23);

  const headers = ["Staff / Role", ...weekDates.map((d) => `${format(d, "EEE")} ${format(d, "d")}`)];
  const rows: string[][] = [];
  const roleRowIndices = new Set<number>();

  staffByRole.forEach(({ role, staff }) => {
    const roleRowIndex = rows.length;
    rows.push([role, "", "", "", "", "", "", ""]);
    roleRowIndices.add(roleRowIndex);
    staff.forEach((member) => {
      const name = `${member.first_name || ""} ${member.last_name || ""}`.trim() || "—";
      const dayCells = weekDates.map((d) => {
        const dayShifts = (shiftsByStaffByDate[member.id] || {})[dateStr(d)] || [];
        return cellText(dayShifts);
      });
      rows.push([name, ...dayCells]);
    });
  });

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    margin: { left: margin, right: margin },
    tableWidth: "auto",
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: {
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "normal" },
      ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i + 1, { cellWidth: 33 }])),
    },
    didParseCell: (data) => {
      if (data.section === "body" && roleRowIndices.has(data.row.index)) {
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.textColor = [30, 41, 59];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
      }
      if (data.section === "head") {
        data.cell.styles.halign = data.column.index === 0 ? "left" : "center";
      }
      if (data.section === "body" && data.column.index > 0 && data.cell.raw && String(data.cell.raw).trim() && String(data.cell.raw) !== "—") {
        data.cell.styles.halign = "center";
      }
    },
    theme: "grid",
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.2,
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.save(`timesheet-${format(weekDates[0], "yyyy-MM-dd")}-${format(weekDates[6], "yyyy-MM-dd")}.pdf`);
}

export async function exportTimesheetToExcel(
  shifts: Shift[],
  staffMembers: StaffMemberForExport[],
  currentDate: Date,
  sheetName: string = "Timesheet"
): Promise<void> {
  const { weekDates, staffByRole, shiftsByStaffByDate } = buildTimesheetMatrix(shifts, staffMembers, currentDate);
  const dateStr = (d: Date) => format(d, "yyyy-MM-dd");

  const XLSX = await import("xlsx");

  const headers = ["Staff / Role", ...weekDates.map((d) => `${format(d, "EEE")} ${format(d, "d")}`)];
  const rows: string[][] = [headers];

  staffByRole.forEach(({ role, staff }) => {
    rows.push([role, "", "", "", "", "", "", ""]);
    staff.forEach((member) => {
      const name = `${member.first_name || ""} ${member.last_name || ""}`.trim() || "—";
      const dayCells = weekDates.map((d) => {
        const dayShifts = (shiftsByStaffByDate[member.id] || {})[dateStr(d)] || [];
        return cellText(dayShifts);
      });
      rows.push([name, ...dayCells]);
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colWidths = [{ wch: 22 }, ...Array(7).fill({ wch: 14 })];
  ws["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `timesheet-${format(weekDates[0], "yyyy-MM-dd")}-${format(weekDates[6], "yyyy-MM-dd")}.xlsx`);
}
