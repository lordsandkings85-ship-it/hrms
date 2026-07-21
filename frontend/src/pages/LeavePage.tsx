import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CalendarDays, Check, X, PlusCircle, AlertCircle, Clock, Trash2, 
  Calendar, FileText, CheckCircle2, XCircle, Users, Sun, CheckSquare, Download, Save
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { leaveApi, employeesApi, organizationApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { DataTable, Column } from '../components/ui/DataTable';
import { PageHeader } from '../components/ui/PageHeader';

type TabKey = 'dashboard' | 'requests' | 'balances' | 'policies' | 'holidays' | 'reports' | 'apply';

const SUB_TO_TAB: Record<string, TabKey> = {
  dashboard: 'dashboard',
  requests: 'requests',
  balances: 'balances',
  policies: 'policies',
  holidays: 'holidays',
  reports: 'reports',
  apply: 'apply',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  dashboard: 'dashboard',
  requests: 'requests',
  balances: 'balances',
  policies: 'policies',
  holidays: 'holidays',
  reports: 'reports',
  apply: 'apply',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function exportRowsToCsv(rows: Record<string, any>[], filename: string) {
  if (!rows || rows.length === 0) { alert('No data to export.'); return; }
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function LeavePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();

  const roleNameLower = user?.role?.name?.toLowerCase() || '';
  const isAdmin = !!user?.isSuperAdmin || !!user?.role?.isSystem || roleNameLower.includes('admin') || roleNameLower === 'hr' || roleNameLower === 'human resources';
  const myEmpId = user?.employee?.id || '';

  const initialTab = sub ? SUB_TO_TAB[sub] || (isAdmin ? 'dashboard' : 'apply') : (isAdmin ? 'dashboard' : 'apply');
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (sub && SUB_TO_TAB[sub]) {
      setTab(SUB_TO_TAB[sub]);
    }
  }, [sub]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/leave/${TAB_TO_SUB[t]}`);
    setSelectedIds([]);
  };

  const [selectedEmp, setSelectedEmp] = useState(myEmpId);
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceDept, setBalanceDept] = useState('');
  const [balanceLeaveType, setBalanceLeaveType] = useState('');
  const [reportDept, setReportDept] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  
  // Policies State
  const [accrualRate, setAccrualRate] = useState('1.5');
  const [carryForwardLimit, setCarryForwardLimit] = useState('10');
  const [encashmentAllowed, setEncashmentAllowed] = useState(true);

  // Sync selectedEmp with user structure data if non-admin
  useEffect(() => {
    if (!isAdmin && myEmpId) setSelectedEmp(myEmpId);
  }, [isAdmin, myEmpId]);

  // Form State
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePaid, setNewTypePaid] = useState(true);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');

  // Fetching
  const { data: employees } = useQuery({ queryKey: ['employees-list-all'], queryFn: () => employeesApi.list({ page: 1 }), enabled: !!isAdmin });
  const { data: leaveTypes } = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.listTypes() });
  const { data: pendingRequests, isLoading: isLoadingPending } = useQuery({ queryKey: ['leave-pending'], queryFn: () => leaveApi.listPending(), enabled: !!isAdmin });
  const { data: myLeaveHistory, isLoading: isLoadingHistory } = useQuery({ queryKey: ['leave-history', myEmpId], queryFn: () => leaveApi.listForEmployee(myEmpId), enabled: !isAdmin && !!myEmpId });
  const { data: selectedEmpHistory, isLoading: isLoadingSelectedEmpHistory } = useQuery({ queryKey: ['leave-history', selectedEmp], queryFn: () => leaveApi.listForEmployee(selectedEmp), enabled: isAdmin && !!selectedEmp });
  const { data: balances } = useQuery({ queryKey: ['leave-balances', selectedEmp], queryFn: () => leaveApi.balances(selectedEmp), enabled: !!selectedEmp });
  const { data: holidays } = useQuery({ queryKey: ['holidays-list'], queryFn: () => leaveApi.listHolidays() });
  const { data: analytics } = useQuery({ queryKey: ['leave-analytics'], queryFn: () => leaveApi.analytics(), enabled: !!isAdmin });
  const { data: policies } = useQuery({ queryKey: ['leave-policies'], queryFn: () => leaveApi.getPolicies(), enabled: !!isAdmin });
  const { data: departments } = useQuery({ queryKey: ['org-departments'], queryFn: () => organizationApi.listDepartments(), enabled: !!isAdmin });
  const { data: balancesOverview, isLoading: isLoadingBalancesOverview } = useQuery({
    queryKey: ['leave-balances-overview', balanceSearch, balanceDept, balanceLeaveType],
    queryFn: () => leaveApi.balancesOverview({ departmentId: balanceDept || undefined, leaveTypeId: balanceLeaveType || undefined, search: balanceSearch || undefined }),
    enabled: !!isAdmin,
  });
  const { data: allLeaveRequests, isLoading: isLoadingAllRequests } = useQuery({
    queryKey: ['leave-all', reportDept, reportStatus],
    queryFn: () => leaveApi.listAll({ departmentId: reportDept || undefined, status: reportStatus || undefined }),
    enabled: !!isAdmin && tab === 'reports',
  });

  useEffect(() => {
    if (policies) {
      setAccrualRate(policies.accrualRate || '1.5');
      setCarryForwardLimit(policies.carryForwardLimit || '10');
      setEncashmentAllowed(policies.encashmentAllowed ?? true);
    }
  }, [policies]);

  // Mutations
  const applyLeaveMutation = useMutation({
    mutationFn: leaveApi.apply,
    onSuccess: () => {
      alert('Leave applied successfully!');
      setReason(''); setStartDate(''); setEndDate(''); setIsHalfDay(false);
      queryClient.invalidateQueries({ queryKey: ['leave-pending'] });
      queryClient.invalidateQueries({ queryKey: ['leave-history', myEmpId] });
      if (selectedEmp) queryClient.invalidateQueries({ queryKey: ['leave-balances', selectedEmp] });
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: leaveApi.createType,
    onSuccess: () => {
      alert('Leave type created!'); setNewTypeName('');
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: leaveApi.createHoliday,
    onSuccess: () => {
      alert('Holiday added!'); setHolidayName(''); setHolidayDate('');
      queryClient.invalidateQueries({ queryKey: ['holidays-list'] });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: leaveApi.deleteHoliday,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays-list'] }); },
  });

  const approveMutation = useMutation({
    mutationFn: leaveApi.approve,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-pending'] }); queryClient.invalidateQueries({ queryKey: ['leave-analytics'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: leaveApi.reject,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-pending'] }); queryClient.invalidateQueries({ queryKey: ['leave-analytics'] }); },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: leaveApi.bulkApprove,
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['leave-pending'] }); 
      queryClient.invalidateQueries({ queryKey: ['leave-analytics'] });
      setSelectedIds([]);
      alert('Selected requests approved.');
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: leaveApi.bulkReject,
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['leave-pending'] }); 
      queryClient.invalidateQueries({ queryKey: ['leave-analytics'] });
      setSelectedIds([]);
      alert('Selected requests rejected.');
    },
  });

  const updatePoliciesMutation = useMutation({
    mutationFn: leaveApi.setPolicies,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
      alert('Leave policies updated successfully!');
    }
  });

  // Handlers
  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !leaveTypeId) return alert('Please fill required fields.');
    applyLeaveMutation.mutate({ employeeId: selectedEmp, leaveTypeId, startDate, endDate, isHalfDay, reason });
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName) return;
    createTypeMutation.mutate({ name: newTypeName, paid: newTypePaid });
  };

  const handleCreateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName || !holidayDate) return;
    createHolidayMutation.mutate({ name: holidayName, date: holidayDate });
  };

  const handleSavePolicies = () => {
    updatePoliciesMutation.mutate({
      accrualRate,
      carryForwardLimit,
      encashmentAllowed
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds((pendingRequests || []).map((r: any) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const columns: Column<any>[] = [
    {
      header: <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === pendingRequests?.length} />,
      key: 'id-checkbox',
      render: (row: any) => <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} />
    },
    {
      header: 'Employee',
      key: 'employee',
      render: (row: any) => (
        <div>
          <div className="font-bold text-ink">{row.employee?.firstName} {row.employee?.lastName}</div>
          <div className="text-[10px] font-mono text-muted">{row.employee?.employeeCode}</div>
        </div>
      ),
    },
    {
      header: 'Department',
      key: 'department',
      render: (row: any) => <div className="text-sm">{row.employee?.department?.name || '-'}</div>,
    },
    {
      header: 'Reporting Manager',
      key: 'manager',
      render: (row: any) => (
        <div className="text-sm text-muted">
          {row.employee?.manager ? `${row.employee.manager.firstName} ${row.employee.manager.lastName}` : '-'}
        </div>
      ),
    },
    {
      header: 'Leave Type',
      key: 'leaveType',
      render: (row: any) => <div className="text-sm">{row.leaveType?.name}</div>,
    },
    {
      header: 'Dates / Duration',
      key: 'startDate',
      render: (row: any) => (
        <div className="text-sm text-muted whitespace-nowrap">
          {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
          <span className="ml-2 text-xs bg-paper px-1.5 py-0.5 rounded border border-line">{row.duration ?? '-'} day(s)</span>
          {row.isHalfDay && <span className="ml-2 text-xs bg-paper px-1.5 py-0.5 rounded border border-line">Half Day</span>}
        </div>
      ),
    },
    {
      header: 'Reason',
      key: 'reason',
      render: (row: any) => <div className="text-sm max-w-[200px] truncate" title={row.reason}>{row.reason || '-'}</div>,
    },
    {
      header: 'Actions',
      key: 'id',
      render: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => { if (confirm('Approve this request?')) approveMutation.mutate(row.id); }}
            className="p-2 bg-success/10 text-success hover:bg-success hover:text-white rounded-full transition-all shadow-sm"
            title="Approve"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => { if (confirm('Reject this request?')) rejectMutation.mutate(row.id); }}
            className="p-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-full transition-all shadow-sm"
            title="Reject"
          >
            <X size={16} />
          </button>
          <button
            onClick={() => { setSelectedEmp(row.employeeId); handleTabChange('balances'); }}
            className="p-2 bg-action-primary/10 text-action-primary hover:bg-action-primary hover:text-white rounded-full transition-all shadow-sm"
            title="View History"
          >
            <FileText size={16} />
          </button>
        </div>
      ),
    },
  ];

  const employeeColumns: Column<any>[] = [
    { header: 'Leave Type', key: 'leaveType', render: (row: any) => <div className="font-bold">{row.leaveType?.name}</div> },
    { header: 'Dates', key: 'startDate', render: (row: any) => <div className="text-sm whitespace-nowrap">{new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}</div> },
    { header: 'Reason', key: 'reason', render: (row: any) => <div className="text-sm truncate max-w-[150px]">{row.reason || '-'}</div> },
    { header: 'Status', key: 'status', render: (row: any) => (
        <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm ${
          row.status === 'approved' ? 'bg-success/15 text-success' :
          row.status === 'rejected' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'
        }`}>{row.status}</span>
      )
    },
  ];

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp" style={{ animationDelay: '0.05s' }}>
        <PageHeader
          title="Leave Management"
          subtitle="Enterprise Leave & Attendance Workflows"
          icon={Calendar}
        />
      </div>

      {/* Tabs */}
      <div className="tab-container animate-slideUp" style={{ animationDelay: '0.1s' }}>
        {isAdmin && (
          <button onClick={() => handleTabChange('dashboard')} className={`tab-pill ${tab === 'dashboard' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>Dashboard</button>
        )}
        {!isAdmin && (
          <button onClick={() => handleTabChange('apply')} className={`tab-pill ${tab === 'apply' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>Apply Leave</button>
        )}
        <button onClick={() => handleTabChange('balances')} className={`tab-pill ${tab === 'balances' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>Balances & History</button>
        {isAdmin && (
          <>
            <button onClick={() => handleTabChange('requests')} className={`tab-pill ${tab === 'requests' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>Leave Requests</button>
            <button onClick={() => handleTabChange('policies')} className={`tab-pill ${tab === 'policies' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>Policies</button>
            <button onClick={() => handleTabChange('holidays')} className={`tab-pill ${tab === 'holidays' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>Holidays</button>
            <button onClick={() => handleTabChange('reports')} className={`tab-pill ${tab === 'reports' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>Reports</button>
          </>
        )}
      </div>

      <div className="animate-fade">

        {/* === HR Dashboard === */}
        {tab === 'dashboard' && isAdmin && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="section-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-action-primary/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start mb-3">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Emp</div>
                  <div className="p-2 bg-action-primary/10 rounded-lg text-action-primary"><Users size={16} /></div>
                </div>
                <div className="text-3xl font-black text-text-primary tracking-tight">{analytics.summary.totalEmployees}</div>
              </div>
              <div className="section-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start mb-3">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">On Leave</div>
                  <div className="p-2 bg-warning/10 rounded-lg text-warning"><Sun size={16} /></div>
                </div>
                <div className="text-3xl font-black text-text-primary tracking-tight">{analytics.summary.onLeaveToday}</div>
              </div>
              <div className="section-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start mb-3">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pending</div>
                  <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-600"><Clock size={16} /></div>
                </div>
                <div className="text-3xl font-black text-text-primary tracking-tight">{analytics.summary.pendingRequests}</div>
              </div>
              <div className="section-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Approved</div>
                  <div className="p-2 bg-success/10 rounded-lg text-success"><CheckCircle2 size={16} /></div>
                </div>
                <div>
                  <div className="text-3xl font-black text-text-primary tracking-tight">{analytics.summary.approvedThisMonth}</div>
                  <div className="text-[10px] text-text-muted mt-1 font-medium">This Month</div>
                </div>
              </div>
              <div className="section-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-danger/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Rejected</div>
                  <div className="p-2 bg-danger/10 rounded-lg text-danger"><XCircle size={16} /></div>
                </div>
                <div>
                  <div className="text-3xl font-black text-text-primary tracking-tight">{analytics.summary.rejectedThisMonth}</div>
                  <div className="text-[10px] text-text-muted mt-1 font-medium">This Month</div>
                </div>
              </div>
              <div className="section-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-action-primary/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Balance Alerts</div>
                  <div className="p-2 bg-action-primary/10 rounded-lg text-action-primary"><AlertCircle size={16} /></div>
                </div>
                <div>
                  <div className="text-3xl font-black text-text-primary tracking-tight">{analytics.summary.leaveBalanceAlerts ?? 0}</div>
                  <div className="text-[10px] text-text-muted mt-1 font-medium">≤2 days remaining</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="section-card p-6 h-[350px]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-6">Leave Trend (6 Months)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.charts.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.2)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(128,128,128,0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="section-card p-6 h-[350px]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-6">Leave Type Distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.charts.typeDistribution} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {analytics.charts.typeDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* === Requests & Approval === */}
        {tab === 'requests' && isAdmin && (
          <div className="section-card overflow-hidden">
            <div className="px-6 py-4 border-b border-line mb-2 flex justify-between items-center bg-paper/20">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Pending Approvals</h3>
              {selectedIds.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={() => bulkApproveMutation.mutate(selectedIds)} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2">
                    <CheckSquare size={14} /> Bulk Approve ({selectedIds.length})
                  </button>
                  <button onClick={() => bulkRejectMutation.mutate(selectedIds)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2 text-rust border-rust/30 hover:bg-rust/5">
                    <XCircle size={14} /> Bulk Reject
                  </button>
                </div>
              )}
            </div>
            
            <DataTable
              columns={columns}
              data={pendingRequests || []}
              keyField="id"
              loading={isLoadingPending}
              emptyTitle="All clear!"
              emptyMessage="No pending leave requests to process."
              searchable={true}
              searchPlaceholder="Search requests..."
              pageSize={10}
            />
          </div>
        )}

        {/* === Apply Leave (Employee Only) === */}
        {tab === 'apply' && !isAdmin && (
          <div className="max-w-2xl">
            <div className="section-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                <CalendarDays className="text-ledger" size={18} /> Leave Application
              </h2>

              <form onSubmit={handleApply} className="space-y-5">
                <div>
                  <label className="input-label">Leave Type</label>
                  <select
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select leave type...</option>
                    {leaveTypes?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} {t.paid ? '(Paid)' : '(Unpaid)'}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="input-label">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-line bg-surface-hover/50">
                  <div>
                    <div className="text-sm font-bold text-text-primary">Half Day Application</div>
                    <div className="text-[10px] font-semibold text-text-muted mt-0.5">Apply for a partial day off</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isHalfDay}
                    onClick={() => setIsHalfDay(!isHalfDay)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary focus:ring-offset-2 ${isHalfDay ? 'bg-action-primary' : 'bg-border-strong'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHalfDay ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="input-label">Reason (Optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Provide a brief reason for your leave..."
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={applyLeaveMutation.isPending}
                    className="w-full btn-primary py-3 text-sm flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                  >
                    {applyLeaveMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* === Balances === */}
        {tab === 'balances' && (
          <div className="space-y-6">
            {isAdmin && (
              <>
                <div className="section-card p-4 flex flex-col md:flex-row gap-4 md:items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Search Employee</label>
                    <input
                      type="text"
                      placeholder="Name or employee ID..."
                      value={balanceSearch}
                      onChange={(e) => setBalanceSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Department</label>
                    <select value={balanceDept} onChange={(e) => setBalanceDept(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors">
                      <option value="">All Departments</option>
                      {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Leave Type</label>
                    <select value={balanceLeaveType} onChange={(e) => setBalanceLeaveType(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors">
                      <option value="">All Types</option>
                      {leaveTypes?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="section-card overflow-x-auto">
                  <div className="px-6 py-4 border-b border-line bg-paper/20">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Employee Leave Balances</h3>
                  </div>
                  {isLoadingBalancesOverview ? (
                    <div className="p-6 text-center text-sm text-muted">Loading balances...</div>
                  ) : !balancesOverview || balancesOverview.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted">No employees match the current filters.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                          <th className="px-4 py-2">Employee</th>
                          <th className="px-4 py-2">Department</th>
                          {leaveTypes?.map((t: any) => <th key={t.id} className="px-4 py-2 text-right">{t.name}</th>)}
                          <th className="px-4 py-2 text-right">Total Used</th>
                          <th className="px-4 py-2 text-right">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {balancesOverview.map((row: any) => {
                          const totalUsed = row.balances.reduce((s: number, b: any) => s + b.used, 0);
                          const totalRemaining = row.balances.reduce((s: number, b: any) => s + b.remaining, 0);
                          return (
                            <tr key={row.employeeId} className="hover:bg-paper/40 cursor-pointer" onClick={() => setSelectedEmp(row.employeeId)}>
                              <td className="px-4 py-2">
                                <div className="font-bold text-ink">{row.name}</div>
                                <div className="text-[10px] font-mono text-muted">{row.employeeCode}</div>
                              </td>
                              <td className="px-4 py-2 text-muted">{row.department}</td>
                              {leaveTypes?.map((t: any) => {
                                const b = row.balances.find((x: any) => x.leaveType === t.name);
                                return <td key={t.id} className="px-4 py-2 text-right">{b ? `${b.remaining}/${b.allotted}` : '-'}</td>;
                              })}
                              <td className="px-4 py-2 text-right font-semibold">{totalUsed}</td>
                              <td className="px-4 py-2 text-right font-semibold text-ledger">{totalRemaining}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {selectedEmp && (
              <div className="section-card overflow-hidden">
                <div className="px-6 py-4 border-b border-line mb-2 bg-paper/20 flex justify-between items-center">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{isAdmin ? 'Employee Leave History' : 'My Leave History'}</h3>
                  {isAdmin && <button onClick={() => setSelectedEmp('')} className="text-xs text-muted hover:text-ink">Clear selection</button>}
                </div>
                <DataTable
                  columns={employeeColumns}
                  data={(isAdmin ? selectedEmpHistory : myLeaveHistory) || []}
                  keyField="id"
                  loading={isAdmin ? isLoadingSelectedEmpHistory : isLoadingHistory}
                  emptyTitle="No history"
                  emptyMessage="No leave requests found for this employee."
                />
              </div>
            )}

            {!isAdmin && !selectedEmp && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Leave Balances</h3>
                  {!balances || balances.length === 0 ? (
                    <div className="section-card p-6 flex flex-col items-center justify-center text-center text-muted">
                      <CalendarDays size={32} className="mb-3 opacity-20" />
                      <div className="text-sm font-medium">No leave balances found for current year.</div>
                    </div>
                  ) : (
                    balances.map((b: any) => {
                      const remaining = Math.max(0, b.allotted - b.used);
                      const percent = b.allotted > 0 ? (b.used / b.allotted) * 100 : 0;
                      return (
                        <div key={b.id} className="section-card p-5 hover:shadow-lg transition-shadow border-t-4" style={{ borderTopColor: 'var(--action-primary)' }}>
                          <div className="flex justify-between items-end mb-5">
                            <div>
                              <div className="text-sm font-black text-text-primary uppercase tracking-wide">{b.leaveType.name}</div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-1">{b.year} Quota</div>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-black text-action-primary leading-none">{remaining}</div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-1">Remaining</div>
                            </div>
                          </div>
                          
                          <div className="w-full bg-surface-active rounded-full h-2 mb-3 overflow-hidden shadow-inner">
                            <div className="bg-gradient-to-r from-action-primary/80 to-action-primary h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(percent, 100)}%` }}></div>
                          </div>
                          
                          <div className="flex justify-between text-xs text-text-muted font-bold">
                            <span>{b.used} Used</span>
                            <span>{b.allotted} Total</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === Policies (Admin Only) === */}
        {tab === 'policies' && isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="section-card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                  <CheckSquare className="text-ledger" size={18} /> Global Leave Policies
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Monthly Accrual Rate (Days)</label>
                    <input type="number" step="0.1" value={accrualRate} onChange={(e) => setAccrualRate(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors" />
                    <p className="text-[10px] text-muted mt-1">Leaves earned per month worked.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Max Carry Forward Limit</label>
                    <input type="number" value={carryForwardLimit} onChange={(e) => setCarryForwardLimit(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors" />
                    <p className="text-[10px] text-muted mt-1">Maximum unused leaves carried over to next year.</p>
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <input type="checkbox" id="encashment" checked={encashmentAllowed} onChange={(e) => setEncashmentAllowed(e.target.checked)} className="rounded border-line text-ledger focus:ring-ledger bg-paper/50" />
                    <label htmlFor="encashment" className="text-sm font-medium text-ink">Allow Leave Encashment</label>
                  </div>
                  <button onClick={handleSavePolicies} disabled={updatePoliciesMutation.isPending} className="btn-primary py-2 px-4 text-sm mt-2 flex items-center gap-2">
                    <Save size={16} /> Save Policies
                  </button>
                </div>
              </div>

              <div className="section-card p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                  <PlusCircle className="text-ledger" size={18} /> Manage Leave Types
                </h2>
                <form onSubmit={handleCreateType} className="flex gap-4 items-end mb-6">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">New Type Name</label>
                    <input type="text" placeholder="e.g. Sick Leave, Vacation" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Type</label>
                    <select value={newTypePaid ? 'paid' : 'unpaid'} onChange={(e) => setNewTypePaid(e.target.value === 'paid')} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors min-w-[100px]">
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary py-2.5 px-4 text-sm">Add</button>
                </form>

                <div className="grid grid-cols-2 gap-4">
                  {leaveTypes?.map((t: any) => (
                    <div key={t.id} className="border border-line rounded-lg p-3 text-center bg-paper/20 shadow-sm">
                      <div className="text-sm font-bold text-ink">{t.name}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mt-1">{t.paid ? 'Paid' : 'Unpaid'} Leave</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === Holidays (Admin) === */}
        {tab === 'holidays' && isAdmin && (
          <div className="max-w-3xl">
            <div className="section-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                <Calendar className="text-ledger" size={18} /> Manage Company Holidays
              </h2>
              <form onSubmit={handleCreateHoliday} className="flex gap-4 items-end mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Holiday Name</label>
                  <input type="text" placeholder="e.g. Christmas, Independence Day" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Date</label>
                  <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors" required />
                </div>
                <button type="submit" disabled={createHolidayMutation.isPending} className="btn-primary py-2.5 px-6 text-sm font-bold">Add Holiday</button>
              </form>

              <div className="divide-y divide-line border border-line rounded-md">
                {(!holidays || holidays.length === 0) && (
                  <div className="p-4 text-sm font-medium text-muted text-center bg-paper/20">No upcoming holidays configured.</div>
                )}
                {holidays?.map((h: any) => (
                  <div key={h.id} className="p-4 flex items-center justify-between hover:bg-paper/40 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-ink">{h.name}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted font-mono mt-1">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                    <button onClick={() => { if (confirm(`Delete ${h.name}?`)) deleteHolidayMutation.mutate(h.id); }} className="p-1.5 rounded text-rust hover:bg-rust/10" title="Delete Holiday"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === Reports === */}
        {tab === 'reports' && isAdmin && (
          <div className="max-w-5xl space-y-6">
            <div className="section-card p-4 flex flex-col md:flex-row gap-4 md:items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Department</label>
                <select value={reportDept} onChange={(e) => setReportDept(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors">
                  <option value="">All Departments</option>
                  {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Status</label>
                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="text-xs text-muted pb-2">{isLoadingAllRequests ? 'Loading…' : `${allLeaveRequests?.length || 0} records`}</div>
            </div>

            <div className="section-card p-6">
              <h3 className="text-sm font-bold text-ink mb-1">Leave Report</h3>
              <p className="text-xs text-muted mb-4">All leave requests matching the filters above, with employee, department, dates and status.</p>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => exportRowsToCsv(
                  (allLeaveRequests || []).map((r: any) => ({
                    Employee: `${r.employee?.firstName} ${r.employee?.lastName}`,
                    EmployeeID: r.employee?.employeeCode,
                    Department: r.employee?.department?.name || '-',
                    LeaveType: r.leaveType?.name,
                    From: new Date(r.startDate).toLocaleDateString(),
                    To: new Date(r.endDate).toLocaleDateString(),
                    Status: r.status,
                    Reason: r.reason || '',
                  })),
                  'leave-report.csv'
                )}
              >
                <Download size={16} /> Export Leave Report (CSV)
              </button>
            </div>

            <div className="section-card p-6">
              <h3 className="text-sm font-bold text-ink mb-1">Leave Balance Report</h3>
              <p className="text-xs text-muted mb-4">Current-year allotted, used and remaining balances for every employee (uses the filters on the Balances tab).</p>
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => exportRowsToCsv(
                  (balancesOverview || []).flatMap((row: any) =>
                    row.balances.map((b: any) => ({
                      Employee: row.name,
                      EmployeeID: row.employeeCode,
                      Department: row.department,
                      LeaveType: b.leaveType,
                      Allotted: b.allotted,
                      Used: b.used,
                      Remaining: b.remaining,
                    }))
                  ),
                  'leave-balance-report.csv'
                )}
              >
                <Download size={16} /> Export Balance Report (CSV)
              </button>
            </div>

            <div className="section-card p-6">
              <h3 className="text-sm font-bold text-ink mb-1">Department Leave Summary</h3>
              <p className="text-xs text-muted mb-4">Count of leave requests grouped by department for the filtered records.</p>
              {(() => {
                const byDept: Record<string, number> = {};
                (allLeaveRequests || []).forEach((r: any) => {
                  const d = r.employee?.department?.name || 'Unassigned';
                  byDept[d] = (byDept[d] || 0) + 1;
                });
                const rows = Object.entries(byDept);
                if (rows.length === 0) return <p className="text-xs text-muted">No data for the current filters.</p>;
                return (
                  <div className="space-y-2">
                    {rows.map(([dept, count]) => (
                      <div key={dept} className="flex justify-between text-sm border-b border-line pb-1">
                        <span>{dept}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
