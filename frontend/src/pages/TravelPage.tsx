import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plane, Check, X, PlaneTakeoff, ShieldAlert } from 'lucide-react';
import { travelApi, employeesApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { PageHeader } from '../components/ui/PageHeader';

export default function TravelPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;
  const myEmpId = user?.employee?.id || '';

  const [selectedEmp, setSelectedEmp] = useState(myEmpId);
  const [purpose, setPurpose] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [advance, setAdvance] = useState('');

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

  // Fetch travel requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['travel-requests', isAdmin ? 'company' : myEmpId],
    queryFn: () => isAdmin ? travelApi.listForCompany() : travelApi.listForEmployee(myEmpId),
    enabled: isAdmin || !!myEmpId,
  });

  // Submit Travel Request
  const submitTravelMutation = useMutation({
    mutationFn: travelApi.request,
    onSuccess: () => {
      alert('Travel request submitted successfully');
      setPurpose('');
      setFromDate('');
      setToDate('');
      setAdvance('');
      queryClient.invalidateQueries({ queryKey: ['travel-requests'] });
    },
  });

  // Update Status
  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      travelApi.updateStatus(data.id, data.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-requests'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !fromDate || !toDate) return alert('Please enter required parameters');
    submitTravelMutation.mutate({
      employeeId: selectedEmp,
      fromDate,
      toDate,
      purpose,
      advance: Number(advance) || 0,
    });
  };

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Travel Management"
          subtitle="Submit travel requests, manage bookings, and track reimbursements."
          icon={Plane}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Travel Request Form */}
        <div className="section-card p-6 h-fit">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <PlaneTakeoff className="text-ledger" size={18} /> Request Travel
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
                <label className="block text-xs text-muted mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-line bg-white text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Cash Advance Requested (₹)</label>
              <input
                type="number"
                placeholder="₹0.00"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Purpose / Itinerary</label>
              <textarea
                placeholder="Client site integration, conference, customer review..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-line bg-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitTravelMutation.isPending}
              className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-medium hover:bg-ledgerDark"
            >
              Submit Travel Request
            </button>
          </form>
        </div>

        {/* Travel Requests List */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line">
            <h3 className="text-sm font-semibold">{isAdmin ? 'Travel Request Pipeline' : 'My Travel Requests'}</h3>
          </div>
          {isLoading && <div className="p-6 text-sm text-muted">Loading pipelines...</div>}
          {!isLoading && (!requests || requests.length === 0) && (
            <div className="p-6 text-sm text-muted">No travel requests logged yet in this workspace.</div>
          )}
          <div className="divide-y divide-line">
            {requests?.map((req: any) => (
              <div key={req.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-paper rounded border border-line text-ledger">
                    <Plane size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span>{req.employee?.firstName} {req.employee?.lastName}</span>
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                        req.status === 'pending'
                          ? 'bg-paper text-muted border border-line'
                          : req.status === 'approved'
                          ? 'bg-ledger/10 text-ledger'
                          : 'bg-rust/10 text-rust'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Duration: <span className="font-mono text-ink">{new Date(req.fromDate).toLocaleDateString()}</span> to <span className="font-mono text-ink">{new Date(req.toDate).toLocaleDateString()}</span>
                      {req.advance > 0 && <span className="text-ledgerDark ml-2 font-mono font-semibold">Advance: ₹{req.advance.toLocaleString()}</span>}
                    </div>
                    {req.purpose && <p className="text-xs text-muted italic mt-1">"{req.purpose}"</p>}
                  </div>
                </div>

                {isAdmin && req.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleStatusUpdate(req.id, 'approved')}
                      className="p-1 rounded border border-ledger text-ledger hover:bg-ledger/5"
                      title="Approve"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(req.id, 'rejected')}
                      className="p-1 rounded border border-rust text-rust hover:bg-rust/5"
                      title="Reject"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

