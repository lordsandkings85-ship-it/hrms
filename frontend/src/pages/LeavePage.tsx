import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CalendarDays, Check, X, PlusCircle, AlertCircle, Clock, Trash2, 
  Calendar, FileText, CheckCircle2, XCircle, Users, Sun, CheckSquare, Download, Save
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { leaveApi, employeesApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { DataTable, Column } from '../components/ui/DataTable';

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
  const { data: balances } = useQuery({ queryKey: ['leave-balances', selectedEmp], queryFn: () => leaveApi.balances(selectedEmp), enabled: !!selectedEmp });
  const { data: holidays } = useQuery({ queryKey: ['holidays-list'], queryFn: () => leaveApi.listHolidays() });
  const { data: analytics } = useQuery({ queryKey: ['leave-analytics'], queryFn: () => leaveApi.analytics(), enabled: !!isAdmin });
  const { data: policies } = useQuery({ queryKey: ['leave-policies'], queryFn: () => leaveApi.getPolicies(), enabled: !!isAdmin });

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
        </div>
      ),
    },
    {
      header: 'Leave Type',
      key: 'leaveType',
      render: (row: any) => <div className="text-sm">{row.leaveType?.name}</div>,
    },
    {
      header: 'Dates',
      key: 'startDate',
      render: (row: any) => (
        <div className="text-sm text-muted whitespace-nowrap">
          {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
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
            className="p-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded transition-colors"
            title="Approve"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => { if (confirm('Reject this request?')) rejectMutation.mutate(row.id); }}
            className="p-1.5 bg-rust/10 text-rust hover:bg-rust/20 rounded transition-colors"
            title="Reject"
          >
            <X size={16} />
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
        <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
          row.status === 'approved' ? 'bg-green-500/10 text-green-600' :
          row.status === 'rejected' ? 'bg-rust/10 text-rust' : 'bg-yellow-500/10 text-yellow-600'
        }`}>{row.status}</span>
      )
    },
  ];

  return (
    <div className="page-container max-w-7xl space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink mb-1">Leave Management</h1>
          <p className="text-sm text-muted font-medium">Enterprise Leave & Attendance Workflows</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 overflow-x-auto">
        {isAdmin && (
          <button onClick={() => handleTabChange('dashboard')} className={`tab ${tab === 'dashboard' ? 'tab-active' : 'tab-inactive'}`}>Dashboard</button>
        )}
        {!isAdmin && (
          <button onClick={() => handleTabChange('apply')} className={`tab ${tab === 'apply' ? 'tab-active' : 'tab-inactive'}`}>Apply Leave</button>
        )}
        <button onClick={() => handleTabChange('balances')} className={`tab ${tab === 'balances' ? 'tab-active' : 'tab-inactive'}`}>Balances & History</button>
        
        {isAdmin && (
          <>
            <button onClick={() => handleTabChange('requests')} className={`tab ${tab === 'requests' ? 'tab-active' : 'tab-inactive'}`}>Leave Requests</button>
            <button onClick={() => handleTabChange('policies')} className={`tab ${tab === 'policies' ? 'tab-active' : 'tab-inactive'}`}>Policies</button>
            <button onClick={() => handleTabChange('holidays')} className={`tab ${tab === 'holidays' ? 'tab-active' : 'tab-inactive'}`}>Holidays</button>
            <button onClick={() => handleTabChange('reports')} className={`tab ${tab === 'reports' ? 'tab-active' : 'tab-inactive'}`}>Reports</button>
          </>
        )}
      </div>

      <div className="animate-fade">

        {/* === HR Dashboard === */}
        {tab === 'dashboard' && isAdmin && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="section-card p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider">Total Emp</div>
                  <Users size={16} className="text-ledger" />
                </div>
                <div className="text-2xl font-black text-ink">{analytics.summary.totalEmployees}</div>
              </div>
              <div className="section-card p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider">On Leave</div>
                  <Sun size={16} className="text-rust" />
                </div>
                <div className="text-2xl font-black text-ink">{analytics.summary.onLeaveToday}</div>
              </div>
              <div className="section-card p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider">Pending</div>
                  <Clock size={16} className="text-yellow-500" />
                </div>
                <div className="text-2xl font-black text-ink">{analytics.summary.pendingRequests}</div>
              </div>
              <div className="section-card p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider">Approved</div>
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>
                <div className="text-2xl font-black text-ink">{analytics.summary.approvedThisMonth}</div>
                <div className="text-[10px] text-muted">This Month</div>
              </div>
              <div className="section-card p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider">Rejected</div>
                  <XCircle size={16} className="text-rust" />
                </div>
                <div className="text-2xl font-black text-ink">{analytics.summary.rejectedThisMonth}</div>
                <div className="text-[10px] text-muted">This Month</div>
              </div>
              <div className="section-card p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider">Holidays</div>
                  <Calendar size={16} className="text-ledger" />
                </div>
                <div className="text-2xl font-black text-ink">{analytics.summary.upcomingHolidays.length}</div>
                <div className="text-[10px] text-muted">Upcoming</div>
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

              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Leave Type</label>
                  <select
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} {t.paid ? '(Paid)' : '(Unpaid)'}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="halfDay"
                    checked={isHalfDay}
                    onChange={(e) => setIsHalfDay(e.target.checked)}
                    className="rounded border-line text-ledger focus:ring-ledger bg-paper/50"
                  />
                  <label htmlFor="halfDay" className="text-sm font-medium text-ink">Apply for Half Day</label>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Reason (Optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                    rows={3}
                    placeholder="Provide a brief reason for your leave..."
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={applyLeaveMutation.isPending}
                    className="w-full btn-primary py-2.5 text-sm font-bold"
                  >
                    Submit Leave Request
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
              <div className="section-card p-6 flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">View Employee Balances</label>
                  <select
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    className="w-full md:w-1/3 px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                  >
                    <option value="">Select Employee</option>
                    {employees?.items?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedEmp ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Leave Balances</h3>
                  {!balances || balances.length === 0 ? (
                    <div className="section-card p-6 text-center text-muted text-sm">No leave balances found for current year.</div>
                  ) : (
                    balances.map((b: any) => {
                      const remaining = Math.max(0, b.allotted - b.used);
                      const percent = b.allotted > 0 ? (b.used / b.allotted) * 100 : 0;
                      return (
                        <div key={b.id} className="section-card p-5 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <div className="text-sm font-bold text-ink">{b.leaveType.name}</div>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mt-0.5">{b.year} Quota</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-black text-ledger">{remaining}</div>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Remaining</div>
                            </div>
                          </div>
                          
                          <div className="w-full bg-paper rounded-full h-1.5 mb-2 overflow-hidden border border-line">
                            <div className="bg-ledger h-1.5 rounded-full" style={{ width: `${Math.min(percent, 100)}%` }}></div>
                          </div>
                          
                          <div className="flex justify-between text-xs text-muted font-medium">
                            <span>{b.used} Used</span>
                            <span>{b.allotted} Total</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="lg:col-span-2">
                  {!isAdmin && (
                    <div className="section-card overflow-hidden">
                      <div className="px-6 py-4 border-b border-line mb-2 bg-paper/20">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">My Leave History</h3>
                      </div>
                      <DataTable
                        columns={employeeColumns}
                        data={myLeaveHistory || []}
                        keyField="id"
                        loading={isLoadingHistory}
                        emptyTitle="No history"
                        emptyMessage="You haven't applied for any leaves yet."
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              isAdmin && <div className="text-center text-muted p-10 section-card">Select an employee to view their balances.</div>
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
          <div className="max-w-4xl">
            <div className="section-card p-6 flex flex-col justify-center items-center text-center h-48">
              <FileText size={32} className="text-muted/30 mb-2" />
              <h3 className="text-sm font-bold text-ink">Leave Reports Engine</h3>
              <p className="text-xs text-muted max-w-md mb-4">Generate detailed historical leave analytics and export to CSV for compliance and audit purposes.</p>
              <button className="btn-primary flex items-center gap-2"><Download size={16} /> Generate Report CSV</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
