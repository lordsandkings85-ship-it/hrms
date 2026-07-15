import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fnfApi, employeesApi } from '../api/client';
import { HandCoins, CheckCircle2, AlertTriangle, FileText, Lock } from 'lucide-react';

const fmt = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

export default function FnfPage() {
  const qc = useQueryClient();
  const [selectedEmp, setSelectedEmp] = useState('');
  const [lwdDate, setLwdDate] = useState('');
  const [noticeDays, setNoticeDays] = useState(90);

  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
  });

  const { data: fnfList } = useQuery({
    queryKey: ['fnf-list'],
    queryFn: fnfApi.list,
  });

  const { data: settlement, isLoading: settleLoading } = useQuery({
    queryKey: ['fnf-employee', selectedEmp],
    queryFn: () => fnfApi.get(selectedEmp),
    enabled: !!selectedEmp,
  });

  const initiateMutation = useMutation({
    mutationFn: fnfApi.initiate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fnf-employee', selectedEmp] });
      qc.invalidateQueries({ queryKey: ['fnf-list'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: fnfApi.approve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fnf-employee', selectedEmp] });
      qc.invalidateQueries({ queryKey: ['fnf-list'] });
    },
  });

  const statusColor: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-ledger/10 text-ledger',
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold flex items-center gap-3">
          <HandCoins size={24} className="text-ledger" />
          Full &amp; Final Settlement
        </h1>
        <p className="text-sm text-muted mt-1">
          Compute gratuity, leave encashment, notice recovery, and generate settlement statements for exiting employees.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Initiate form */}
        <div className="bg-white border border-line rounded-lg p-6 h-fit">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Compute Settlement</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">Employee</label>
              <select
                value={selectedEmp}
                onChange={e => setSelectedEmp(e.target.value)}
                className="w-full border border-line rounded px-3 py-2 text-sm"
              >
                <option value="">-- Select employee --</option>
                {employees?.items.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Last Working Day</label>
              <input
                type="date"
                value={lwdDate}
                onChange={e => setLwdDate(e.target.value)}
                className="w-full border border-line rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Notice Period (days)</label>
              <input
                type="number"
                value={noticeDays}
                onChange={e => setNoticeDays(Number(e.target.value))}
                className="w-full border border-line rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => {
                if (!selectedEmp || !lwdDate) return alert('Select employee and last working day');
                initiateMutation.mutate({ employeeId: selectedEmp, lastWorkingDay: lwdDate, noticePeriodDays: noticeDays });
              }}
              disabled={initiateMutation.isPending}
              className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark disabled:opacity-50"
            >
              {initiateMutation.isPending ? 'Computing…' : 'Compute Settlement'}
            </button>
          </div>
        </div>

        {/* Settlement Detail */}
        <div className="bg-white border border-line rounded-lg p-6">
          {!selectedEmp && (
            <div className="flex flex-col items-center justify-center h-48 text-muted text-sm">
              <HandCoins size={36} className="mb-2 opacity-20" />
              Select an employee to view their settlement
            </div>
          )}
          {selectedEmp && settleLoading && <div className="text-sm text-muted p-4">Loading…</div>}
          {settlement && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{settlement.employee?.firstName} {settlement.employee?.lastName}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[settlement.status] || ''}`}>
                  {settlement.status}
                </span>
              </div>

              {!settlement.isGratuityEligible && (
                <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-3 rounded-md">
                  <AlertTriangle size={14} /> Less than 5 years of service — gratuity not yet eligible (shown as projected amount)
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Earnings</div>
                {[
                  ['Gratuity', settlement.gratuityAmount],
                  ['Leave Encashment', settlement.leaveEncashAmount],
                  ['Unpaid Salary', settlement.unpaidSalaryAmt],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-muted">{l}</span>
                    <span className="font-mono text-ledger">{fmt(v as number)}</span>
                  </div>
                ))}

                <hr className="border-line my-2" />
                <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Deductions</div>
                {[
                  ['Notice Recovery', settlement.noticeRecovery],
                  ['Other Deductions', settlement.otherDeductions],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-muted">{l}</span>
                    <span className="font-mono text-rust">{fmt(v as number)}</span>
                  </div>
                ))}

                <hr className="border-line my-2" />
                <div className="flex justify-between font-semibold text-base">
                  <span>Net Settlement</span>
                  <span className="font-mono text-ledger">{fmt(settlement.netSettlement)}</span>
                </div>
              </div>

              {settlement.status === 'draft' && (
                <button
                  onClick={() => approveMutation.mutate(settlement.id)}
                  disabled={approveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-ledger text-paper rounded-md py-2 text-sm font-medium hover:bg-ledgerDark disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Approve Settlement
                </button>
              )}
            </div>
          )}
        </div>

        {/* FnF List */}
        <div className="bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-line">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText size={16} /> All Settlements
            </h3>
          </div>
          {!fnfList || fnfList.length === 0 ? (
            <div className="p-6 text-sm text-muted text-center">No FnF settlements initiated yet</div>
          ) : (
            <div className="divide-y divide-line">
              {fnfList.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedEmp(s.employee?.id || s.employeeId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-paper/50 text-left"
                >
                  <div>
                    <div className="text-sm font-medium">{s.employee?.firstName} {s.employee?.lastName}</div>
                    <div className="text-xs text-muted">{s.employee?.department?.name} · LWD: {s.lastWorkingDay ? new Date(s.lastWorkingDay).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-semibold text-ledger">{fmt(s.netSettlement)}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${statusColor[s.status] || ''}`}>
                      {s.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
