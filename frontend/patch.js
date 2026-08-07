const fs = require('fs');

let content = fs.readFileSync('src/pages/PayrollPage.tsx', 'utf-8');

const hooks_injection = 
  const { data: attendanceSummary } = useQuery({
    queryKey: ['attendance-summary', runMonth, runYear],
    queryFn: () => payrollApiExt.getAttendanceSummary(runMonth, runYear),
    enabled: tab === 'attendance-process' && isAdmin,
  });

  const { data: payouts, refetch: refetchPayouts } = useQuery({
    queryKey: ['payouts', runMonth, runYear],
    queryFn: () => payrollApiExt.getPayouts(runMonth, runYear),
    enabled: tab === 'additional-payout' && isAdmin,
  });

  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  const { data: cyclePayslips } = useQuery({
    queryKey: ['cycle-payslips', selectedCycleId],
    queryFn: () => payrollApiExt.getCyclePayslips(selectedCycleId),
    enabled: !!selectedCycleId && (tab === 'processed' || tab === 'send-payslips') && isAdmin,
  });

  const addPayoutMutation = useMutation({
    mutationFn: payrollApiExt.addPayout,
    onSuccess: () => refetchPayouts()
  });

  const deletePayoutMutation = useMutation({
    mutationFn: payrollApiExt.deletePayout,
    onSuccess: () => refetchPayouts()
  });

  const sendPayslipsMutation = useMutation({
    mutationFn: payrollApiExt.sendPayslips,
    onSuccess: (res) => alert(res.message || 'Payslips sent successfully.')
  });
;

content = content.replace('  const taxPreview = useMemo(() => computeTax({', hooks_injection + '\n  const taxPreview = useMemo(() => computeTax({');

const new_tabs_ui = 
      {/* === Attendance Process Tab === */}
      {tab === 'attendance-process' && isAdmin && (
        <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">Attendance Summary</h2>
            <div className="flex gap-4 mb-6">
              <select value={runMonth} onChange={e => setRunMonth(Number(e.target.value))} className="px-3 py-2 rounded border border-line bg-paper/50 text-sm">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}</option>)}
              </select>
              <select value={runYear} onChange={e => setRunYear(Number(e.target.value))} className="px-3 py-2 rounded border border-line bg-paper/50 text-sm">
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <DataTable
              columns={[
                { key: 'emp', header: 'Employee', render: (r: any) => <div className="text-sm"><b>{r.employeeCode}</b> - {r.firstName} {r.lastName}</div> },
                { key: 'totalDays', header: 'Total Days', render: (r: any) => <div className="text-sm">{r.totalDays}</div> },
                { key: 'present', header: 'Present', render: (r: any) => <div className="text-sm text-green-600 font-bold">{r.present}</div> },
                { key: 'absent', header: 'Absent', render: (r: any) => <div className="text-sm text-red-600 font-bold">{r.absent}</div> },
                { key: 'leave', header: 'Leave', render: (r: any) => <div className="text-sm text-amber-600 font-bold">{r.leave}</div> },
                { key: 'status', header: 'Status', render: (r: any) => <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">{r.status}</span> },
              ]}
              data={attendanceSummary || []}
              keyField="id"
              emptyTitle="No attendance logs"
            />
          </div>
        </div>
      )}

      {/* === Additional Payout Tab === */}
      {tab === 'additional-payout' && isAdmin && (
        <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 section-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">Add Payout</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                addPayoutMutation.mutate({
                  employeeId: fd.get('employeeId') as string, month: runMonth, year: runYear,
                  type: fd.get('type') as string, amount: Number(fd.get('amount')), notes: fd.get('notes') as string
                }, { onSuccess: () => (e.target as HTMLFormElement).reset() });
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Employee</label>
                  <select name="employeeId" required className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm">
                    <option value="">Select Employee...</option>
                    {employees?.items?.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Type</label>
                  <select name="type" required className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm">
                    <option value="bonus">Bonus</option>
                    <option value="commission">Commission</option>
                    <option value="incentive">Incentive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Amount</label>
                  <input type="number" name="amount" required className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Notes</label>
                  <textarea name="notes" className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm" rows={2}></textarea>
                </div>
                <button type="submit" disabled={addPayoutMutation.isPending} className="btn-primary w-full py-2">Add Payout</button>
              </form>
            </div>
            <div className="lg:col-span-2 section-card p-6">
              <div className="flex gap-4 mb-4">
                <select value={runMonth} onChange={e => setRunMonth(Number(e.target.value))} className="px-3 py-2 rounded border border-line bg-paper/50 text-sm">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}</option>)}
                </select>
                <select value={runYear} onChange={e => setRunYear(Number(e.target.value))} className="px-3 py-2 rounded border border-line bg-paper/50 text-sm">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <DataTable
                columns={[
                  { key: 'emp', header: 'Employee', render: (r: any) => <div className="text-sm">{r.employee.firstName} {r.employee.lastName}</div> },
                  { key: 'type', header: 'Type', render: (r: any) => <span className="capitalize text-sm font-medium">{r.type}</span> },
                  { key: 'amount', header: 'Amount', render: (r: any) => <div className="text-sm">{fmt(r.amount)}</div> },
                  { key: 'action', header: 'Action', render: (r: any) => (
                    <button onClick={() => deletePayoutMutation.mutate(r.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  )}
                ]}
                data={payouts || []}
                keyField="id"
                emptyTitle="No payouts for this month"
              />
            </div>
          </div>
        </div>
      )}

      {/* === Processed Salary Tab === */}
      {tab === 'processed' && isAdmin && (
        <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">View Processed Salary</h2>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-muted mb-1">Select Payroll Cycle</label>
              <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)} className="w-full max-w-sm px-3 py-2 rounded border border-line bg-paper/50 text-sm">
                <option value="">-- Select Cycle --</option>
                {cycles?.map((c: any) => (
                  <option key={c.id} value={c.id}>{new Date(2020, c.month - 1).toLocaleString('default', { month: 'long' })} {c.year} - {c.status}</option>
                ))}
              </select>
            </div>
            
            {selectedCycleId && (
              <DataTable
                columns={[
                  { key: 'emp', header: 'Employee', render: (r: any) => <div className="text-sm"><b>{r.employee.employeeCode}</b> - {r.employee.firstName} {r.employee.lastName}</div> },
                  { key: 'gross', header: 'Gross Pay', render: (r: any) => <div className="text-sm font-medium text-ledger">{fmt(r.grossPay)}</div> },
                  { key: 'deductions', header: 'Deductions', render: (r: any) => <div className="text-sm text-red-500">{fmt(r.totalDeductions)}</div> },
                  { key: 'net', header: 'Net Pay', render: (r: any) => <div className="text-sm font-bold">{fmt(r.netPay)}</div> },
                ]}
                data={cyclePayslips || []}
                keyField="id"
                emptyTitle="No payslips generated for this cycle"
              />
            )}
          </div>
        </div>
      )}

      {/* === Send Payslips Tab === */}
      {tab === 'send-payslips' && isAdmin && (
        <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="section-card p-6 max-w-2xl mx-auto text-center h-64 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold mb-2">Send Payslips via Email</h2>
            <p className="text-sm text-muted mb-6">Select a locked cycle to distribute payslips to all employees in that cycle via email.</p>
            
            <div className="flex items-center gap-4 w-full max-w-md mx-auto">
              <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)} className="flex-1 px-3 py-2 rounded border border-line bg-paper/50 text-sm">
                <option value="">-- Select Cycle --</option>
                {cycles?.filter((c: any) => c.status === 'locked').map((c: any) => (
                  <option key={c.id} value={c.id}>{new Date(2020, c.month - 1).toLocaleString('default', { month: 'long' })} {c.year}</option>
                ))}
              </select>
              <button 
                disabled={!selectedCycleId || sendPayslipsMutation.isPending} 
                onClick={() => sendPayslipsMutation.mutate(selectedCycleId)}
                className="btn-primary"
              >
                {sendPayslipsMutation.isPending ? 'Sending...' : 'Send Emails'}
              </button>
            </div>
            {selectedCycleId && cyclePayslips && (
              <p className="text-xs text-muted mt-4">This will send {cyclePayslips.length} emails.</p>
            )}
          </div>
        </div>
      )}
;

content = content.replace('    </div>\n  );\n}', new_tabs_ui + '\n    </div>\n  );\n}');

fs.writeFileSync('src/pages/PayrollPage.tsx', content);
console.log("Done");
