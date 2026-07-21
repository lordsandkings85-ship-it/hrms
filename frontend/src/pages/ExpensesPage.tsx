import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Check, X, FileUp, IndianRupee } from 'lucide-react';
import { expensesApi, employeesApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { PageHeader } from '../components/ui/PageHeader';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const myEmpId = user?.employee?.id || '';

  const [selectedEmp, setSelectedEmp] = useState(myEmpId);
  const [category, setCategory] = useState('travel');
  const [amount, setAmount] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  // Sync selectedEmp with user structure data if non-admin
  useEffect(() => {
    if (!isAdmin && myEmpId) setSelectedEmp(myEmpId);
  }, [isAdmin, myEmpId]);

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list-all'],
    queryFn: () => employeesApi.list({ page: 1 }),
    enabled: !!isAdmin,
  });

  // Fetch expenses for selected employee
  const { data: expenses, refetch } = useQuery({
    queryKey: ['expenses-list', selectedEmp],
    queryFn: () => expensesApi.listForEmployee(selectedEmp),
    enabled: !!selectedEmp,
  });

  // Submit Expense
  const submitExpenseMutation = useMutation({
    mutationFn: expensesApi.submit,
    onSuccess: () => {
      alert('Expense claim registered successfully');
      setAmount('');
      setReceiptUrl('');
      refetch();
    },
  });

  // Update Status
  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      expensesApi.updateStatus(data.id, data.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list', selectedEmp] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !amount.trim()) return alert('Please enter all parameters');
    submitExpenseMutation.mutate({
      employeeId: selectedEmp,
      category,
      amount: Number(amount),
      receiptUrl,
    });
  };

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };



  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Expense Management"
          subtitle="Submit, review, and approve employee expense claims."
          icon={Receipt}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submit Claim form */}
        <div className="section-card p-6 h-fit">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Receipt className="text-ledger" size={18} /> Submit Claim
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">{isAdmin ? 'Employee Context' : 'Employee'}</label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                >
                  <option value="travel">Travel</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="food">Meals / Food</option>
                  <option value="fuel">Fuel &amp; Transport</option>
                  <option value="office">Office Supplies</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="₹0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-muted">Receipt URL</label>
              </div>
              <input
                type="text"
                placeholder="https://storage.hrms.internal/..."
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitExpenseMutation.isPending}
              className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark"
            >
              Submit Reimbursement Claim
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-paper/20">
            <h3 className="text-sm font-semibold">Expense Register</h3>
          </div>
          {selectedEmp ? (
            <div>
              {!expenses || expenses.length === 0 ? (
                <div className="p-6 text-sm text-muted text-center">No expense claims filed yet for this employee. Register one on the left panel.</div>
              ) : (
                <div className="divide-y divide-line">
                  {expenses.map((exp: any) => (
                    <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-paper rounded border border-line text-ledger">
                          <IndianRupee size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span className="capitalize">{exp.category} Expense</span>
                            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                              exp.status === 'pending'
                                ? 'bg-paper text-muted border border-line'
                                : exp.status === 'approved'
                                ? 'bg-ledger/10 text-ledger'
                                : 'bg-rust/10 text-rust'
                            }`}>
                              {exp.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted mt-1">
                            Claimed on {new Date(exp.createdAt).toLocaleDateString()}
                            {exp.receiptUrl && (
                              <a
                                href={exp.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-ledgerDark ml-2 underline hover:text-ledger flex inline-flex items-center gap-0.5 text-[11px]"
                              >
                                View Receipt <FileUp size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right font-mono font-semibold text-sm text-ink">₹{exp.amount.toLocaleString()}</div>
                        {isAdmin && exp.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleStatusUpdate(exp.id, 'approved')}
                              className="p-1 rounded border border-ledger text-ledger hover:bg-ledger/5"
                              title="Approve"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(exp.id, 'rejected')}
                              className="p-1 rounded border border-rust text-rust hover:bg-rust/5"
                              title="Reject"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted text-center">Select an employee context to inspect reimbursement requests.</div>
          )}
        </div>
      </div>
    </div>
  );
}

