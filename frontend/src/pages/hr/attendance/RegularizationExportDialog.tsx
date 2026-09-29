import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import {
  attendanceApi,
  companiesApi,
  employeesApi,
  organizationApi,
  type Employee,
} from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { downloadCsv, downloadXlsxMultiSheet, type ExcelColumn } from '../../../utils/excelExport';
import { fmtDate, fmtDateTime, fmtTime12 } from '../../../utils/formatDate';

interface ReportFilters {
  from: string;
  to: string;
  status: string;
  type: string;
  departmentId: string;
  designationId: string;
  branchId: string;
  companyId: string;
  employeeId: string;
}

const EMPTY_FILTERS: ReportFilters = {
  from: '',
  to: '',
  status: 'all',
  type: 'all',
  departmentId: 'all',
  designationId: 'all',
  branchId: 'all',
  companyId: 'all',
  employeeId: 'all',
};

const OPTION_CLS =
  'w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors';

export default function RegularizationExportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);

  const groupWide = useMemo(() => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const roleName = (user.role?.name || '').toLowerCase();
    return !!(user.role?.isSystem || /super admin|admin|group|hr admin/.test(roleName));
  }, [user]);

  const selectedCompanyId = filters.companyId !== 'all' ? filters.companyId : null;
  const companyForEmployee = groupWide ? selectedCompanyId : null;
  const showEmployeeFilter = !groupWide || !!companyForEmployee;

  const { data: companies } = useQuery({
    queryKey: ['regularization-export-companies'],
    queryFn: () => companiesApi.list(),
    enabled: open && groupWide,
  });

  const { data: departments } = useQuery({
    queryKey: ['regularization-export-departments'],
    queryFn: () => organizationApi.listDepartments(),
    enabled: open,
  });

  const { data: designations } = useQuery({
    queryKey: ['regularization-export-designations'],
    queryFn: () => organizationApi.listDesignations(),
    enabled: open,
  });

  const { data: branches } = useQuery({
    queryKey: ['regularization-export-branches'],
    queryFn: () => organizationApi.listBranches(),
    enabled: open,
  });

  const { data: employees } = useQuery({
    queryKey: ['regularization-export-employees', companyForEmployee ?? 'current'],
    queryFn: () =>
      companyForEmployee
        ? companiesApi.getEmployees(companyForEmployee)
        : employeesApi.list({ pageSize: 1000 }).then((r) => r.items),
    enabled: open && showEmployeeFilter,
  });

  const params = useMemo(() => {
    const out: {
      from?: string;
      to?: string;
      status?: string;
      type?: string;
      departmentId?: string;
      designationId?: string;
      branchId?: string;
      companyId?: string;
      employeeId?: string;
    } = {};
    if (filters.from) out.from = filters.from;
    if (filters.to) out.to = filters.to;
    if (filters.status !== 'all') out.status = filters.status;
    if (filters.type !== 'all') out.type = filters.type;
    if (filters.departmentId !== 'all') out.departmentId = filters.departmentId;
    if (filters.designationId !== 'all') out.designationId = filters.designationId;
    if (filters.branchId !== 'all') out.branchId = filters.branchId;
    if (filters.companyId !== 'all') out.companyId = filters.companyId;
    if (filters.employeeId !== 'all') out.employeeId = filters.employeeId;
    return out;
  }, [filters]);

  const paramsKey = JSON.stringify(params);

  const preview = useQuery({
    queryKey: ['regularization-export-preview', paramsKey],
    queryFn: async () => {
      const [rows, summary] = await Promise.all([
        attendanceApi.regularizationReport(params),
        attendanceApi.regularizationSummary(params),
      ]);
      return { rows, summary };
    },
    enabled: open,
  });

  const set = (key: keyof ReportFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  const detailColumns: ExcelColumn[] = [
    { header: 'Employee ID', key: 'employee.id', width: 34 },
    { header: 'Employee Code', key: 'employee.employeeCode', width: 16 },
    { header: 'Employee Name', key: 'employee.name', width: 26 },
    { header: 'Company', key: 'employee.companyName', width: 24 },
    { header: 'Department', key: 'employee.department', width: 18 },
    { header: 'Designation', key: 'employee.designation', width: 18 },
    { header: 'Branch', key: 'employee.branch', width: 18 },
    { header: 'Works Date', key: 'log.date', width: 14 },
    { header: 'Actual Login Time (Before Regularization)', key: 'original.checkIn', width: 22 },
    { header: 'Actual Logout Time (Before Regularization)', key: 'original.checkOut', width: 22 },
    { header: 'Punch Source', key: 'original.source', width: 30 },
    { header: 'Regularized Login Time (Requested)', key: 'requestedCheckIn', width: 20 },
    { header: 'Regularized Logout Time (Requested)', key: 'requestedCheckOut', width: 20 },
    { header: 'Reason', key: 'reason', width: 40 },
    { header: 'Type', key: 'typeLabel', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Requested At', key: 'requestedAt', width: 24 },
    { header: 'Approved/Rejected By', key: 'approval.approverName', width: 22 },
    { header: 'Approved/Rejected At', key: 'approval.resolvedAt', width: 24 },
    { header: 'Resolution Note', key: 'resolutionNote', width: 32 },
  ];

  const PUNCH_SOURCE_LABEL: Record<string, string> = {
    pre_correction: 'Recorded before correction',
    current_punch: 'Raw punch (not yet corrected)',
    preserved_full_day: 'Raw punch (kept, full-day)',
    not_retained: 'Not retained',
  };

  const mapDetails = (rows: any[]) =>
    rows.map((r) => {
      const emp = r.employee ?? {};
      const log = r.attendanceLog ?? {};
      const orig = r.originalPunch ?? {};
      const notRetained = orig.source === 'not_retained';
      return {
        'employee.id': emp.id ?? '',
        'employee.employeeCode': emp.employeeCode ?? '',
        'employee.name': `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        'employee.companyName': emp.company?.displayName || emp.company?.name || '',
        'employee.department': emp.department?.name ?? '',
        'employee.designation': emp.designation?.title ?? '',
        'employee.branch': emp.branch?.name ?? '',
        'log.date': log.date ? fmtDate(log.date) : '',
        'original.checkIn': notRetained
          ? 'Not Retained'
          : orig.checkIn ? fmtTime12(orig.checkIn) : 'Not Recorded',
        'original.checkOut': notRetained
          ? 'Not Retained'
          : orig.checkOut ? fmtTime12(orig.checkOut) : 'Not Recorded',
        'original.source': PUNCH_SOURCE_LABEL[orig.source] ?? orig.source ?? '',
        requestedCheckIn: r.requestedCheckIn ? fmtTime12(r.requestedCheckIn) : 'Not Requested',
        requestedCheckOut: r.requestedCheckOut ? fmtTime12(r.requestedCheckOut) : 'Not Requested',
        reason: r.reason ?? '',
        typeLabel: r.type === 'full_day' ? 'Full-Day' : 'Time Change',
        status: r.status ?? '',
        requestedAt: r.requestedAt ? fmtDateTime(r.requestedAt) : '',
        'approval.approverName': r.approval?.approverName ?? '',
        'approval.resolvedAt': r.approval?.resolvedAt ? fmtDateTime(r.approval.resolvedAt) : '',
        resolutionNote: r.resolutionNote ?? '',
      };
    });

  const summaryColumns: ExcelColumn[] = [
    { header: 'Employee ID', key: 'employeeId', width: 34 },
    { header: 'Employee Code', key: 'employeeCode', width: 16 },
    { header: 'Employee Name', key: 'name', width: 26 },
    { header: 'Company', key: 'companyName', width: 24 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Total Regularizations', key: 'total', width: 20, type: 'number' },
    { header: 'Approved', key: 'approved', width: 12, type: 'number' },
    { header: 'Pending', key: 'pending', width: 12, type: 'number' },
    { header: 'Rejected', key: 'rejected', width: 12, type: 'number' },
    { header: 'Cancelled', key: 'cancelled', width: 12, type: 'number' },
  ];

  const companyLabel = groupWide
    ? selectedCompanyId
      ? companies?.find((c) => c.id === selectedCompanyId)?.name || 'SelectedCompany'
      : 'All-Companies'
    : user?.company?.name || 'Company';

  const baseName = [
    'Attendance_Regularization_Report',
    companyLabel.replace(/[^\w-]+/g, '_'),
    filters.from || 'AllDates',
    filters.to || 'ToDate',
    new Date().toISOString().slice(0, 10),
  ].join('_');

  const doExport = async (kind: 'xlsx' | 'csv') => {
    if (!preview.data) return;
    setExporting(kind);
    try {
      const { rows, summary } = preview.data;
      if (kind === 'xlsx') {
        await downloadXlsxMultiSheet({
          filename: `${baseName}.xlsx`,
          sheets: [
            {
              name: 'Regularization Details',
              columns: detailColumns,
              rows: mapDetails(rows),
              footnote:
                'Actual Login/Logout = the punch the employee actually recorded, i.e. the time before regularization; it is never '
                + 'overwritten by the regularized time. Punch Source explains its origin: "Raw punch (not yet corrected)" for pending/rejected '
                + 'requests, "Raw punch (kept, full-day)" for approved full-day requests, "Recorded before correction" when the pre-correction '
                + 'punch was captured at approval, and "Not Retained" for time-corrections approved before that capture existed — approving a '
                + 'time correction overwrites the stored punch and those originals were never archived. '
                + 'Regularized Login/Logout = the times requested on the correction ("Not Requested" when the request left that punch unchanged).',
            },
            {
              name: 'Employee Summary',
              columns: summaryColumns,
              rows: summary?.employees ?? [],
              totalsRow: true,
            },
          ],
        });
      } else if (kind === 'csv') {
        downloadCsv({
          filename: `${baseName}.csv`,
          columns: detailColumns,
          rows: mapDetails(rows),
        });
      }
    } finally {
      setExporting(null);
    }
  };

  const totals = preview.data?.summary?.totals;
  const summaryCards = [
    { label: 'Total Requests', value: totals?.total ?? 0, icon: Clock, cls: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { label: 'Employees With Regularization', value: preview.data?.summary?.employees?.length ?? 0, icon: Users, cls: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Approved', value: totals?.approved ?? 0, icon: CheckCircle2, cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Pending', value: totals?.pending ?? 0, icon: Clock, cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { label: 'Rejected', value: totals?.rejected ?? 0, icon: XCircle, cls: 'text-red-500 bg-red-500/10 border-red-500/20' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Export Attendance Regularization" size="xl">
      <div className="space-y-5">
        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Date From</span>
            <input type="date" value={filters.from} onChange={set('from')} className={OPTION_CLS} />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Date To</span>
            <input type="date" value={filters.to} onChange={set('to')} className={OPTION_CLS} />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Status</span>
            <select value={filters.status} onChange={set('status')} className={OPTION_CLS}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Type</span>
            <select value={filters.type} onChange={set('type')} className={OPTION_CLS}>
              <option value="all">All Types</option>
              <option value="regularization">Time Change</option>
              <option value="full_day">Full-Day</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Department</span>
            <select value={filters.departmentId} onChange={set('departmentId')} className={OPTION_CLS}>
              <option value="all">All Departments</option>
              {(departments ?? []).map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Designation</span>
            <select value={filters.designationId} onChange={set('designationId')} className={OPTION_CLS}>
              <option value="all">All Designations</option>
              {(designations ?? []).map((d: any) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Branch</span>
            <select value={filters.branchId} onChange={set('branchId')} className={OPTION_CLS}>
              <option value="all">All Branches</option>
              {(branches ?? []).map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          {groupWide && (
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Company</span>
              <select value={filters.companyId} onChange={set('companyId')} className={OPTION_CLS}>
                <option value="all">All Companies</option>
                {(companies ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}
          {showEmployeeFilter && (
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Employee</span>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <select value={filters.employeeId} onChange={set('employeeId')} className={`${OPTION_CLS} pl-8`}>
                  <option value="all">All Employees</option>
                  {(employees ?? []).map((e: Employee | any) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName || ''} {e.employeeCode ? `(${e.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          )}
        </div>

        {/* Reset */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw size={12} /> Reset filters
          </button>
          <span className="text-[11px] text-[var(--text-muted)]">
            {preview.data?.rows?.length ?? 0} record(s) match the current filters
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {summaryCards.map((card) => (
            <div key={card.label} className={`rounded-2xl border p-3 flex flex-col gap-1.5 ${card.cls}`}>
              <card.icon size={15} />
              <div className="text-lg font-bold leading-none">{card.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-alt)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Details Preview</span>
            <span className="text-[10px] text-[var(--text-muted)]">First {Math.min(preview.data?.rows?.length ?? 0, 25)} of {preview.data?.rows?.length ?? 0}</span>
          </div>
          <div className="max-h-64 overflow-auto">
            {preview.isLoading ? (
              <div className="flex items-center justify-center gap-2 h-24 text-xs text-[var(--text-muted)]">
                <Loader2 size={14} className="animate-spin" /> Loading preview...
              </div>
            ) : preview.isError ? (
              <div className="flex items-center gap-2 h-24 justify-center text-xs text-red-500">
                <AlertTriangle size={14} /> {(preview.error as any)?.message || 'Failed to load preview'}
              </div>
            ) : (preview.data?.rows?.length ?? 0) === 0 ? (
              <div className="h-24 flex items-center justify-center text-xs text-[var(--text-muted)]">No records match the selected filters.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[var(--surface)]">
                  <tr className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="px-3 py-2 font-bold">Employee</th>
                    <th className="px-3 py-2 font-bold">Date</th>
                    <th className="px-3 py-2 font-bold">Actual In (Before)</th>
                    <th className="px-3 py-2 font-bold">Actual Out (Before)</th>
                    <th className="px-3 py-2 font-bold">Regularized In</th>
                    <th className="px-3 py-2 font-bold">Regularized Out</th>
                    <th className="px-3 py-2 font-bold">Type</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.data?.rows ?? []).slice(0, 25).map((r: any) => {
                    const orig = r.originalPunch ?? {};
                    const notRetained = orig.source === 'not_retained';
                    return (
                    <tr key={r.id} className="border-t border-[var(--border)] text-[11px] text-[var(--text-primary)]">
                      <td className="px-3 py-2">
                        {r.employee?.firstName} {r.employee?.lastName}
                        <div className="text-[9px] text-[var(--text-muted)]">{r.employee?.employeeCode}</div>
                      </td>
                      <td className="px-3 py-2">{r.attendanceLog?.date ? fmtDate(r.attendanceLog.date) : '—'}</td>
                      <td className="px-3 py-2">{notRetained ? 'Not Retained' : orig.checkIn ? fmtTime12(orig.checkIn) : 'Not Recorded'}</td>
                      <td className="px-3 py-2">{notRetained ? 'Not Retained' : orig.checkOut ? fmtTime12(orig.checkOut) : 'Not Recorded'}</td>
                      <td className="px-3 py-2">{r.requestedCheckIn ? fmtTime12(r.requestedCheckIn) : 'Not Requested'}</td>
                      <td className="px-3 py-2">{r.requestedCheckOut ? fmtTime12(r.requestedCheckOut) : 'Not Requested'}</td>
                      <td className="px-3 py-2">{r.type === 'full_day' ? 'Full-Day' : 'Time Change'}</td>
                      <td className="px-3 py-2 capitalize">{r.status}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)] transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => doExport('csv')}
            disabled={!preview.data || !!exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-alt)] transition-colors disabled:opacity-50"
          >
            {exporting === 'csv' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} className="text-emerald-500" />}
            Export CSV
          </button>
          <button
            onClick={() => doExport('xlsx')}
            disabled={!preview.data || !!exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {exporting === 'xlsx' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            Export Excel
          </button>
        </div>

        <p className="flex items-start gap-1.5 text-[10px] text-[var(--text-muted)]">
          <FileDown size={11} className="mt-0.5 shrink-0" />
          Excel exports two tabs: <strong>Regularization Details</strong> (full report) and <strong>Employee Summary</strong> (per-employee
          counts). CSV exports the Details columns. Actual time is the punch before regularization and is never overwritten by the
          regularized time; the Punch Source column states where each actual came from.
        </p>
      </div>
    </Modal>
  );
}