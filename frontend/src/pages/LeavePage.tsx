import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, X, PlusCircle, AlertCircle, Clock, Trash2, Calendar } from 'lucide-react';
import { leaveApi, employeesApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export default function LeavePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const myEmpId = user?.employee?.id || '';

  const [selectedEmp, setSelectedEmp] = useState(myEmpId);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');

  // Sync selectedEmp with user structure data if non-admin
  useEffect(() => {
    if (!isAdmin && myEmpId) setSelectedEmp(myEmpId);
  }, [isAdmin, myEmpId]);

  // Leave Type Form State
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePaid, setNewTypePaid] = useState(true);

  // Holiday Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
    enabled: !!isAdmin,
  });

  // Fetch leave types
  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leaveApi.listTypes(),
  });

  // Fetch pending requests (Admin only)
  const { data: pendingRequests, isLoading: isLoadingPending } = useQuery({
    queryKey: ['leave-pending'],
    queryFn: () => leaveApi.listPending(),
    enabled: !!isAdmin,
  });

  // Fetch my leave history (Employee only)
  const { data: myLeaveHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['leave-history', myEmpId],
    queryFn: () => leaveApi.listForEmployee(myEmpId),
    enabled: !isAdmin && !!myEmpId,
  });

  // Fetch leave balances for selected employee
  const { data: balances } = useQuery({
    queryKey: ['leave-balances', selectedEmp],
    queryFn: () => leaveApi.balances(selectedEmp),
    enabled: !!selectedEmp,
  });

  // Fetch holidays
  const { data: holidays } = useQuery({
    queryKey: ['holidays-list'],
    queryFn: () => leaveApi.listHolidays(),
  });

  // Apply Leave Mutation
  const applyLeaveMutation = useMutation({
    mutationFn: leaveApi.apply,
    onSuccess: () => {
      alert('Leave applied successfully!');
      setReason('');
      setStartDate('');
      setEndDate('');
      setIsHalfDay(false);
      queryClient.invalidateQueries({ queryKey: ['leave-pending'] });
      if (selectedEmp) {
        queryClient.invalidateQueries({ queryKey: ['leave-balances', selectedEmp] });
      }
    },
  });

  // Add Leave Type Mutation
  const createTypeMutation = useMutation({
    mutationFn: leaveApi.createType,
    onSuccess: () => {
      alert('Leave type created!');
      setNewTypeName('');
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    },
  });

  // Add Holiday Mutation
  const createHolidayMutation = useMutation({
    mutationFn: leaveApi.createHoliday,
    onSuccess: () => {
      alert('Holiday added!');
      setHolidayName('');
      setHolidayDate('');
      queryClient.invalidateQueries({ queryKey: ['holidays-list'] });
    },
  });

  // Delete Holiday Mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: leaveApi.deleteHoliday,
    onSuccess: () => {
      alert('Holiday deleted!');
      queryClient.invalidateQueries({ queryKey: ['holidays-list'] });
    },
  });

  // Approve/Reject Mutations
  const approveMutation = useMutation({
    mutationFn: leaveApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-pending'] });
      if (selectedEmp) {
        queryClient.invalidateQueries({ queryKey: ['leave-balances', selectedEmp] });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: leaveApi.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-pending'] });
    },
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !leaveTypeId || !startDate || !endDate) {
      return alert('Please fill in all fields');
    }
    applyLeaveMutation.mutate({
      employeeId: selectedEmp,
      leaveTypeId,
      startDate,
      endDate,
      isHalfDay,
      reason,
    });
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    createTypeMutation.mutate({
      name: newTypeName,
      paid: newTypePaid,
    });
  };

  const handleCreateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) return;
    createHolidayMutation.mutate({
      name: holidayName,
      date: holidayDate,
    });
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Leave Management</h1>
        <p className="text-sm text-muted mt-1">Configure company leave structures, request approvals, and log employee metrics.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Apply Leave and Leave Balance (Employees Only) */}
        {!isAdmin && (
          <div className="space-y-8 lg:col-span-1">
            <div className="bg-white border border-line rounded-lg p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <CalendarDays className="text-ledger" size={18} /> Apply for Leave
            </h2>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1">{isAdmin ? 'Employee context' : 'Employee'}</label>
                {isAdmin ? (
                  <select
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ledger/40"
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees?.items.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 rounded-md border border-line bg-gray-50 text-sm text-muted cursor-not-allowed">
                    {user?.employee?.firstName} {user?.employee?.lastName}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Leave Type</label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ledger/40"
                  required
                >
                  <option value="">-- Select Type --</option>
                  {leaveTypes?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.paid ? 'Paid' : 'Unpaid'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfday"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="rounded border-line text-ledger focus:ring-ledger"
                />
                <label htmlFor="halfday" className="text-xs text-muted">Half-day Request</label>
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm focus:outline-none"
                  placeholder="Medical emergency, vacation, etc."
                />
              </div>

              <button
                type="submit"
                disabled={applyLeaveMutation.isPending}
                className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark"
              >
                Apply Leave
              </button>
            </form>
          </div>

          {/* Leave Balances for Selected Employee */}
          {selectedEmp && (
            <div className="bg-white border border-line rounded-lg p-6">
              <h2 className="text-sm font-semibold mb-4">Leave Balances (Current Year)</h2>
              {balances && balances.length === 0 && (
                <div className="text-xs text-muted">No balances defined yet. Approved leaves will initialize balance registers automatically.</div>
              )}
              <div className="space-y-3">
                {balances?.map((b: any) => (
                  <div key={b.id} className="flex justify-between items-center text-sm border-b border-line pb-2">
                    <div>
                      <div className="font-medium text-ink">{b.leaveType?.name}</div>
                      <div className="text-xs text-muted">{b.leaveType?.paid ? 'Paid' : 'Unpaid'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">{b.used} used</div>
                      <div className="text-xs text-muted">Allotted: {b.allotted}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Right Side: Pending Requests and Settings */}
        <div className={`space-y-8 ${isAdmin ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-line">
              <h3 className="text-sm font-semibold">{isAdmin ? 'Pending Approvals' : 'My Leave History'}</h3>
            </div>
            
            {isAdmin ? (
              <>
                {isLoadingPending && <div className="p-6 text-sm text-muted">Loading pending requests...</div>}
                {!isLoadingPending && (!pendingRequests || pendingRequests.length === 0) && (
                  <div className="p-6 text-sm text-muted">All clear! No pending leave requests.</div>
                )}
                <div className="divide-y divide-line">
                  {pendingRequests?.map((req: any) => (
                    <div key={req.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                      <div>
                        <div className="text-sm font-medium">
                          {req.employee?.firstName} {req.employee?.lastName}
                        </div>
                        <div className="text-xs text-muted mt-1">
                          Type: <span className="font-medium text-ink">{req.leaveType?.name}</span> &bull; Status: <span className="capitalize">{req.status}</span>
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          Dates: <span className="font-mono text-ledger">{new Date(req.startDate).toLocaleDateString()}</span> to <span className="font-mono text-ledger">{new Date(req.endDate).toLocaleDateString()}</span>
                          {req.isHalfDay && <span className="ml-1.5 text-rust font-medium bg-rust/10 px-1 rounded text-[10px]">Half Day</span>}
                        </div>
                        {req.reason && <p className="text-xs text-muted italic mt-1.5">"{req.reason}"</p>}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMutation.mutate(req.id)}
                          className="p-1.5 rounded-full border border-ledger text-ledger hover:bg-ledger/5"
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(req.id)}
                          className="p-1.5 rounded-full border border-rust text-rust hover:bg-rust/5"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {isLoadingHistory && <div className="p-6 text-sm text-muted">Loading leave history...</div>}
                {!isLoadingHistory && (!myLeaveHistory || myLeaveHistory.length === 0) && (
                  <div className="p-6 text-sm text-muted">No leave requests found.</div>
                )}
                <div className="divide-y divide-line">
                  {myLeaveHistory?.map((req: any) => (
                    <div key={req.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                      <div>
                        <div className="text-xs text-muted mb-1">
                          Type: <span className="font-medium text-ink">{req.leaveType?.name}</span> &bull; Status: <span className={`capitalize font-medium ${req.status === 'approved' ? 'text-ledger' : req.status === 'rejected' ? 'text-rust' : 'text-amber-600'}`}>{req.status}</span>
                        </div>
                        <div className="text-xs text-muted">
                          Dates: <span className="font-mono">{new Date(req.startDate).toLocaleDateString()}</span> to <span className="font-mono">{new Date(req.endDate).toLocaleDateString()}</span>
                          {req.isHalfDay && <span className="ml-1.5 text-rust font-medium bg-rust/10 px-1 rounded text-[10px]">Half Day</span>}
                        </div>
                        {req.reason && <p className="text-xs text-muted italic mt-1.5">"{req.reason}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Manage Leave Types */}
          {isAdmin && (
            <div className="bg-white border border-line rounded-lg p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <PlusCircle className="text-ledger" size={18} /> Manage Leave Types
            </h2>
            <form onSubmit={handleCreateType} className="flex gap-4 items-end mb-6">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">New Leave Type Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sick Leave, Vacation"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Type</label>
                <select
                  value={newTypePaid ? 'paid' : 'unpaid'}
                  onChange={(e) => setNewTypePaid(e.target.value === 'paid')}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-ink text-paper rounded-md px-4 py-2 text-sm hover:bg-ink/90"
              >
                Add Type
              </button>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {leaveTypes?.map((t: any) => (
                <div key={t.id} className="border border-line rounded p-3 text-center bg-paper/40">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted mt-0.5">{t.paid ? 'Paid' : 'Unpaid'} Leave</div>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Manage Holidays (Admin) */}
          {isAdmin && (
            <div className="bg-white border border-line rounded-lg p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="text-ledger" size={18} /> Manage Company Holidays
              </h2>
              <form onSubmit={handleCreateHoliday} className="flex gap-4 items-end mb-6">
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-1">Holiday Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Christmas, Independence Day"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Date</label>
                  <input
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={createHolidayMutation.isPending}
                  className="bg-ink text-paper rounded-md px-4 py-2 text-sm hover:bg-ink/90"
                >
                  Add Holiday
                </button>
              </form>

              <div className="divide-y divide-line border border-line rounded-md">
                {(!holidays || holidays.length === 0) && (
                  <div className="p-4 text-xs text-muted text-center bg-paper/40">No upcoming holidays configured.</div>
                )}
                {holidays?.map((h: any) => (
                  <div key={h.id} className="p-3 flex items-center justify-between hover:bg-paper/40">
                    <div>
                      <div className="text-sm font-medium">{h.name}</div>
                      <div className="text-xs text-muted font-mono">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${h.name}?`)) {
                          deleteHolidayMutation.mutate(h.id);
                        }
                      }}
                      className="p-1.5 rounded text-rust hover:bg-rust/10"
                      title="Delete Holiday"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Holidays (Employee) */}
          {!isAdmin && (
            <div className="bg-white border border-line rounded-lg p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="text-ledger" size={18} /> Upcoming Company Holidays
              </h2>
              <p className="text-xs text-muted mb-4">Note: Sundays are automatically counted as non-working days for leave duration calculations.</p>
              
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {(!holidays || holidays.length === 0) && (
                  <div className="text-xs text-muted">No holidays announced yet.</div>
                )}
                {holidays?.map((h: any) => (
                  <div key={h.id} className="border border-line rounded p-4 bg-paper/40 flex items-center gap-4">
                    <div className="bg-ledger/10 text-ledger p-3 rounded-lg text-center min-w-16">
                      <div className="text-xs font-bold uppercase">{new Date(h.date).toLocaleDateString(undefined, { month: 'short' })}</div>
                      <div className="text-xl font-display leading-none mt-0.5">{new Date(h.date).getDate()}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{h.name}</div>
                      <div className="text-xs text-muted">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'long' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
