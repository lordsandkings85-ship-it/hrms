import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../../../../api/client';
import { getServerNow } from '../../../../utils/serverTime';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function currentMonthYear() {
  const now = getServerNow();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function fmtINR(n?: number) {
  return `₹${(n ?? 0).toLocaleString('en-IN')}`;
}

export function useEmployeeList(): any[] {
  const { data } = useQuery({ queryKey: ['employees-list'], queryFn: () => employeesApi.list({}) });
  return useMemo(() => {
    const list = Array.isArray(data) ? data : (data as any)?.items ?? [];
    return list;
  }, [data]);
}

export function EmployeeSelect({ value, onChange, label }: { value: string; onChange: (id: string) => void; label?: string }) {
  const employees = useEmployeeList();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-full"
    >
      <option value="">{label ?? 'Select employee…'}</option>
      {employees.map((e: any) => (
        <option key={e.id} value={e.id}>
          {e.firstName} {e.lastName} ({e.employeeCode || e.employeeId || '—'})
        </option>
      ))}
    </select>
  );
}

export function MonthYearControls({ month, year, onMonth, onYear }: { month: number; year: number; onMonth: (m: number) => void; onYear: (y: number) => void }) {
  return (
    <div className="flex gap-3">
      <select value={month} onChange={(e) => onMonth(Number(e.target.value))} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm">
        {MONTHS.map((n, i) => (
          <option key={n} value={i + 1}>{n}</option>
        ))}
      </select>
      <select value={year} onChange={(e) => onYear(Number(e.target.value))} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm">
        {[year - 1, year, year + 1].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

export function SectionCard({ title, icon: Icon, children, right }: { title: string; icon: React.ElementType; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[var(--border)] flex-wrap gap-3">
        <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Icon size={16} className="text-indigo-500" /> {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}
