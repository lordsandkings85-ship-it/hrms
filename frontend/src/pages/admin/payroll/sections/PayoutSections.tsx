import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, History, PiggyBank, Plus, Loader2, Trash2 } from 'lucide-react';
import { payrollApiExt, employeesApi } from '../../../../api/client';
import { DataTable, Column } from '../../../../components/ui/DataTable';
import { useToast } from '../../../../components/ui/ToastProvider';
import { MONTHS, currentMonthYear, fmtINR, SectionCard, MonthYearControls, EmployeeSelect, useEmployeeList } from './shared';

const TYPE_LABEL: Record<string, string> = {
  arrear: 'Arrear',
  bonus: 'Bonus',
  incentive: 'Incentive',
  additional: 'Additional',
  other: 'Other',
};

export function PayoutsSection({ type }: { type: 'additional-payout' | 'arrears' | 'bonus' }) {
  const { month: m, year: y } = currentMonthYear();
  const [month, setMonth] = useState(m);
  const [year, setYear] = useState(y);
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const employees = useEmployeeList();

  const payoutType = type === 'additional-payout' ? 'additional' : type;

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-payouts', month, year],
    queryFn: () => payrollApiExt.getPayouts(month, year),
  });

  const filtered = (data ?? []).filter((p: any) => (p.type || 'other') === payoutType);

  const addMutation = useMutation({
    mutationFn: () => payrollApiExt.addPayout({ employeeId, month, year, type: payoutType, amount: Number(amount), notes: notes || undefined }),
    onSuccess: () => {
      success(`${TYPE_LABEL[payoutType] || 'Payout'} added`);
      setAmount(''); setNotes(''); setEmployeeId('');
      queryClient.invalidateQueries({ queryKey: ['payroll-payouts', month, year] });
    },
    onError: (e: any) => error(e.message || 'Failed to add payout'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollApiExt.deletePayout(id),
    onSuccess: () => {
      success('Payout removed');
      queryClient.invalidateQueries({ queryKey: ['payroll-payouts', month, year] });
    },
    onError: (e: any) => error(e.message || 'Failed to delete payout'),
  });

  const title = type === 'additional-payout' ? 'Additional Salary Payout' : type === 'arrears' ? 'Arrears' : 'Bonus';
  const Icon = type === 'additional-payout' ? Wallet : type === 'arrears' ? History : PiggyBank;

  const columns: Column<any>[] = [
    { key: 'employee', header: 'Employee', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.employeeName || r.name || r.employeeId}</span> },
    { key: 'type', header: 'Type', render: (r: any) => <span className="text-[10px] px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 font-bold uppercase tracking-wider">{TYPE_LABEL[r.type] || r.type}</span> },
    { key: 'amount', header: 'Amount', render: (r: any) => <span className="font-mono font-bold text-emerald-500">{fmtINR(r.amount)}</span> },
    { key: 'notes', header: 'Notes', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.notes || '—'}</span> },
    {
      key: 'actions', header: '', render: (r: any) => (
        <button onClick={() => deleteMutation.mutate(r.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <SectionCard
      title={title}
      icon={Icon}
      right={<MonthYearControls month={month} year={year} onMonth={setMonth} onYear={setYear} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 space-y-4 h-fit">
          <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Plus size={14} className="text-indigo-500" /> Add {title}</h4>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Employee</label>
            <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !employeeId || !amount}
            className="w-full py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {addMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add Payout
          </button>
        </div>
        <div className="lg:col-span-2">
          <DataTable columns={columns} data={filtered} loading={isLoading} keyField="id" emptyTitle={`No ${TYPE_LABEL[payoutType] || 'payout'} entries`} emptyMessage="Add a payout to get started." />
        </div>
      </div>
    </SectionCard>
  );
}
