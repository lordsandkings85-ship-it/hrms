import { fmtDate, fmtTime12 } from '../../../utils/formatDate';
import { downloadXlsxMultiSheet, type ExcelColumn } from '../../../utils/excelExport';

/**
 * Excel shape of the Monthly Attendance Report.
 *
 * Kept apart from the page so the same builder backs both the admin "Export Selected"
 * and the employee's own "Export Report" button, guaranteeing an identical file.
 */

export interface MonthlySummaryRow {
  employeeId: string;
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  totalWorkingDays: number;
  paidHolidays?: number;
  present: number;
  late: number;
  /** Lates beyond the monthly allowance: each is a half-day LOP. */
  lateLop?: number;
  /** Monthly late allowance this row was charged against (default 6). */
  maxLateAllowance?: number;
  halfDay: number;
  onLeave: number;
  absent: number;
  holidays?: number;
  totalOvertimeMins?: number;
  reconciles?: boolean;
}

export interface DayPermission {
  date: string;
  fromTime?: string | null;
  toTime?: string | null;
  minutes?: number;
}

export interface PaidHolidayDay {
  /** Local "YYYY-MM-DD" day the holiday falls on. */
  date?: string;
  name?: string;
}

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  half_day: 'Half Day',
  half_day_leave: 'Half-Day Leave',
  on_leave: 'On Leave',
  paid_holiday: 'Paid Holiday',
};

export const SUMMARY_EXPORT_COLUMNS: ExcelColumn[] = [
  { header: 'Employee Name', key: 'employeeName', width: 24 },
  { header: 'Employee Code', key: 'employeeCode', width: 14 },
  { header: 'Department', key: 'department', width: 22 },
  { header: 'Month', key: 'month', width: 14 },
  { header: 'Total Working Days', key: 'totalWorkingDays', width: 18, type: 'number' },
  { header: 'Paid Holidays', key: 'paidHolidays', width: 13, type: 'number' },
  { header: 'Present', key: 'present', width: 11, type: 'number' },
  { header: 'Late', key: 'late', width: 11, type: 'number' },
  { header: 'Late → LOP', key: 'lateLop', width: 12, type: 'number' },
  { header: 'Half Days', key: 'halfDay', width: 12, type: 'number' },
  { header: 'On Leave', key: 'onLeave', width: 11, type: 'number' },
  { header: 'Absent', key: 'absent', width: 11, type: 'number' },
];

export const DAY_DETAIL_COLUMNS: ExcelColumn[] = [
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Day', key: 'day', width: 8 },
  { header: 'Status', key: 'status', width: 26 },
  { header: 'Check In', key: 'checkIn', width: 12 },
  { header: 'Check Out', key: 'checkOut', width: 12 },
  { header: 'Hours', key: 'hours', width: 10 },
  { header: 'Overtime (hrs)', key: 'overtime', width: 14, type: 'number' },
  { header: 'Method', key: 'method', width: 14 },
  { header: 'Permission', key: 'permission', width: 14 },
];

export const SUMMARY_FOOTNOTE =
  'Total Working Days includes configured paid holidays. Paid Holidays are paid working days that need no punch; '
  + 'Half Days counts 0.5 per half day (half-day leave, or an incomplete shift once checked out). On Leave counts whole '
  + 'working days only. Absent is derived as Total Working Days minus the other categories, so the row reconciles to the total. '
  + 'Late → LOP counts the lates beyond the monthly allowance (default 6) — each is a half-day LOP in payroll, but still a worked/late day above.';

export const monthLabel = (month: number, year: number) =>
  `${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}`;

const employeeName = (r: { firstName?: string; lastName?: string }) =>
  `${r.firstName || ''} ${r.lastName || ''}`.trim();

export function fmtDuration(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return '--';
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return '--';
  const mins = Math.round((b - a) / 60000);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/** Shape one backend summary row into the Summary sheet's cell set. */
export const summaryExportRow = (r: MonthlySummaryRow, month: number, year: number) => ({
  employeeName: employeeName(r),
  employeeCode: r.employeeCode || '',
  department: r.department || '',
  month: monthLabel(month, year),
  totalWorkingDays: r.totalWorkingDays,
  paidHolidays: r.paidHolidays ?? r.holidays ?? 0,
  present: r.present,
  late: r.late,
  lateLop: r.lateLop ?? 0,
  halfDay: r.halfDay,
  onLeave: r.onLeave,
  absent: r.absent,
});

/** The backend keys Permission Requests by UTC calendar day ("YYYY-MM-DD"). */
const isoDay = (value: any): string => {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
};

/** Calendar day in the viewer's local timezone; matches paid-holiday keys and is
 *  stable for both UTC-midnight API timestamps and local-midnight Date objects. */
const localDay = (value: any): string => {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Shape one day's punch into the Day Detail sheet's cell set. */
export const dayDetailRow = (log: any, permissions: DayPermission[] = []) => {
  const key = log.date ? fmtDate(log.date) : '';
  // Match on the UTC day, not the locale-formatted label, or no permission ever joins up.
  const perm = permissions.find((p) => p.date === isoDay(log.date)) || log.permission;
  const punched = !!(log.checkIn || log.checkOut);
  let label = STATUS_LABEL[log.status] || log.status || '';
  // An approved permission marks the whole day present; a late beyond the monthly
  // allowance is a half-day LOP but still a worked/late day.
  if (log.permission) label = 'Present / Permission';
  else if (log.status === 'late' && log.lateLop) label = 'Late / Half LOP';
  return {
    date: key,
    day: log.date ? new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short' }) : '',
    status: log.holiday && label === 'Paid Holiday' ? `${label} — ${log.holiday}` : label,
    checkIn: log.checkIn ? fmtTime12(log.checkIn) : '',
    checkOut: log.checkOut ? fmtTime12(log.checkOut) : '',
    hours: fmtDuration(log.checkIn, log.checkOut),
    overtime: log.overtimeMinutes ? Math.round((log.overtimeMinutes / 60) * 10) / 10 : 0,
    // Only a punched day has a clock-in method; leave/absent/holiday days must not claim "WEB".
    method: log.method || (punched ? 'WEB' : ''),
    permission: perm ? `${perm.fromTime ?? ''}${perm.toTime ? `-${perm.toTime}` : ''}` : '',
  };
};

/**
 * Merge paid holidays into a day list: any holiday the employee did not punch on gets
 * an explicit "Paid Holiday" row (with its name). Callers pass the authoritative
 * per-employee paid-holiday dates so worked holidays stay single rows.
 */
export function mergePaidHolidayRows(logs: any[], paidHolidays?: PaidHolidayDay[]): any[] {
  if (!paidHolidays?.length) return logs;
  const presentDays = new Set(logs.map((l) => (l.date ? localDay(l.date) : '')));
  const extra: any[] = [];
  for (const h of paidHolidays) {
    if (!h.date) continue;
    // The holiday list carries raw dates; normalize to UTC day to match logs.
    if (presentDays.has(h.date)) continue;
    extra.push({
      id: `holiday-${h.date}`,
      date: `${h.date}T00:00:00Z`,
      checkIn: null,
      checkOut: null,
      method: 'holiday',
      status: 'paid_holiday',
      overtimeMinutes: 0,
      holiday: h.name || 'Holiday',
    });
  }
  return [...logs, ...extra];
}

/** Sort newest-first; blank/missing dates sink to the bottom. */
const byDateDesc = (logs: any[]) =>
  [...(logs || [])].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

/** The two sheets that make up a single-employee report file. */
export const employeeReportSheets = (opts: {
  summary: MonthlySummaryRow;
  logs: any[];
  permissions?: DayPermission[];
  paidHolidays?: PaidHolidayDay[];
  year: number;
  month: number;
}) => {
  const { summary, logs, permissions = [], paidHolidays, year, month } = opts;
  return [
    {
      name: 'Summary',
      columns: SUMMARY_EXPORT_COLUMNS,
      rows: [summaryExportRow(summary, month, year)],
      footnote: SUMMARY_FOOTNOTE,
    },
    {
      name: 'Day Detail',
      columns: DAY_DETAIL_COLUMNS,
      rows: byDateDesc(mergePaidHolidayRows(logs, paidHolidays)).map((l: any) => dayDetailRow(l, permissions)),
    },
  ];
};

export const employeeReportFilename = (summary: MonthlySummaryRow, month: number, year: number) =>
  `Monthly_Attendance_${(employeeName(summary) || summary.employeeCode || 'Employee').replace(/[^\w-]+/g, '_')}_${month}_${year}.xlsx`;

/** Filename for the all-employees file. */
export const allEmployeesReportFilename = (month: number, year: number) =>
  `Monthly_Attendance_${monthLabel(month, year).replace(/[^\w-]+/g, '_')}.xlsx`;

/**
 * Every matching employee in one sheet, with a live-SUM Total row and the same
 * explanatory footnote the per-employee file carries.
 */
export const exportAllReport = async (opts: {
  summaries: MonthlySummaryRow[];
  year: number;
  month: number;
}) => {
  const { summaries, year, month } = opts;
  await downloadXlsxMultiSheet({
    filename: allEmployeesReportFilename(month, year),
    sheets: [
      {
        name: monthLabel(month, year),
        columns: SUMMARY_EXPORT_COLUMNS,
        rows: summaries.map((r) => summaryExportRow(r, month, year)),
        footnote: SUMMARY_FOOTNOTE,
        totalsRow: summaries.length > 1,
      },
    ],
  });
};

/**
 * Two-sheet file for a single employee: the month summary plus every day's punches.
 * Shared by the admin "Export Selected" button and the employee's own Export button so
 * both produce an identical file.
 */
export const exportEmployeeReport = async (opts: {
  summary: MonthlySummaryRow;
  logs: any[];
  permissions?: DayPermission[];
  paidHolidays?: PaidHolidayDay[];
  year: number;
  month: number;
}) => {
  await downloadXlsxMultiSheet({
    filename: employeeReportFilename(opts.summary, opts.month, opts.year),
    sheets: employeeReportSheets(opts),
  });
};