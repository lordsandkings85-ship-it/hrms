import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock3, CalendarDays, PlusCircle, ArrowRight, Sun } from 'lucide-react';
import { shiftsApi, employeesApi } from '../api/client';

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');

  // Shift creation form state
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [shiftType, setShiftType] = useState('fixed');

  // Holiday form state
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  // Fetch shifts
  const { data: shifts, isLoading: isLoadingShifts } = useQuery({
    queryKey: ['shifts-list'],
    queryFn: () => shiftsApi.list(),
  });

  // Fetch holidays
  const { data: holidays } = useQuery({
    queryKey: ['holidays-list'],
    queryFn: () => shiftsApi.listHolidays(),
  });

  // Create Shift Mutation
  const createShiftMutation = useMutation({
    mutationFn: shiftsApi.create,
    onSuccess: () => {
      alert('Shift roster created!');
      setShiftName('');
      queryClient.invalidateQueries({ queryKey: ['shifts-list'] });
    },
  });

  // Assign Shift Mutation
  const assignShiftMutation = useMutation({
    mutationFn: shiftsApi.assign,
    onSuccess: () => {
      alert('Shift assigned successfully!');
      setSelectedEmp('');
      setEffectiveFrom('');
      queryClient.invalidateQueries({ queryKey: ['shifts-list'] });
    },
  });

  // Add Holiday Mutation
  const addHolidayMutation = useMutation({
    mutationFn: shiftsApi.addHoliday,
    onSuccess: () => {
      alert('Holiday registered!');
      setHolidayName('');
      setHolidayDate('');
      queryClient.invalidateQueries({ queryKey: ['holidays-list'] });
    },
  });

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) return;
    createShiftMutation.mutate({
      name: shiftName,
      startTime,
      endTime,
      type: shiftType,
    });
  };

  const handleAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift || !selectedEmp || !effectiveFrom) {
      return alert('Fill in all parameters to assign shift');
    }
    assignShiftMutation.mutate({
      shiftId: selectedShift,
      employeeId: selectedEmp,
      effectiveFrom,
    });
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) return;
    addHolidayMutation.mutate({ name: holidayName, date: holidayDate });
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Shifts &amp; Holidays</h1>
        <p className="text-sm text-muted mt-1">Design rotational shifts, roster employees to rosters, and register annual company holiday lists.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create & Assign Shift */}
        <div className="space-y-8">
          <div className="bg-white border border-line rounded-lg p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <PlusCircle className="text-ledger" size={18} /> Create Shift Plan
            </h2>
            <form onSubmit={handleCreateShift} className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-0.5">Shift Name</label>
                <input type="text" placeholder="e.g. Night Roster" value={shiftName} onChange={(e) => setShiftName(e.target.value)} required className="w-full border border-line px-2 py-1.5 rounded text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-muted mb-0.5">Start Time</label>
                  <input type="text" placeholder="09:00" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full border border-line px-2 py-1 rounded" />
                </div>
                <div>
                  <label className="block text-muted mb-0.5">End Time</label>
                  <input type="text" placeholder="18:00" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="w-full border border-line px-2 py-1 rounded" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">Shift Type</label>
                <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className="w-full border border-line px-2 py-1.5 rounded text-xs">
                  <option value="fixed">Fixed Hour</option>
                  <option value="rotational">Rotational</option>
                  <option value="night">Night shift</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-ledger text-paper rounded py-2 text-xs font-semibold">Save Shift Plan</button>
            </form>
          </div>

          <div className="bg-white border border-line rounded-lg p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock3 className="text-ledger" size={18} /> Assign Employee Shift
            </h2>
            <form onSubmit={handleAssignShift} className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-0.5">Select Shift</label>
                <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} required className="w-full border border-line px-2 py-1.5 rounded text-sm">
                  <option value="">-- Choose Shift --</option>
                  {shifts?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">Select Employee</label>
                <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)} required className="w-full border border-line px-2 py-1.5 rounded text-sm">
                  <option value="">-- Choose Employee --</option>
                  {employees?.items.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">Effective Date</label>
                <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required className="w-full border border-line px-2 py-1 rounded text-xs" />
              </div>
              <button type="submit" className="w-full bg-ink text-paper rounded py-2 text-xs font-semibold">Assign Roster</button>
            </form>
          </div>
        </div>

        {/* Center: Shift list */}
        <div className="bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line bg-paper/20">
            <h3 className="text-sm font-semibold">Shift Roster Plans</h3>
          </div>
          {isLoadingShifts && <div className="p-6 text-sm text-muted">Loading shifts...</div>}
          {!isLoadingShifts && (!shifts || shifts.length === 0) && (
            <div className="p-6 text-sm text-muted">No shifts logged. Add shift configurations on the left.</div>
          )}
          <div className="divide-y divide-line">
            {shifts?.map((s: any) => (
              <div key={s.id} className="p-4 hover:bg-paper/40 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted capitalize mt-0.5">{s.type} Type</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-ledger">{s.startTime} - {s.endTime}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Holidays list */}
        <div className="space-y-6 h-fit">
          <div className="bg-white border border-line rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sun className="text-ledger" size={16} /> Register Holiday
            </h2>
            <form onSubmit={handleAddHoliday} className="space-y-3">
              <div>
                <input type="text" placeholder="e.g. Independence Day" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} required className="w-full border border-line px-2 py-1.5 rounded text-xs" />
              </div>
              <div>
                <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} required className="w-full border border-line px-2 py-1 rounded text-xs" />
              </div>
              <button type="submit" className="w-full bg-ink text-paper rounded py-1 text-xs font-semibold">Register Holiday</button>
            </form>
          </div>

          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-paper/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider">Company Holidays List</h3>
            </div>
            <div className="divide-y divide-line p-2">
              {(!holidays || holidays.length === 0) && (
                <div className="text-xs text-muted text-center py-4">No holidays defined yet.</div>
              )}
              {holidays?.map((h: any) => (
                <div key={h.id} className="p-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-ink">{h.name}</span>
                  <span className="font-mono text-xs text-muted">{new Date(h.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
