import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Clock, Check, X, Calendar, Plane, Wallet, RotateCcw, BarChart3 } from 'lucide-react';
import { leaveApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { DataTable, Column } from '../components/ui/DataTable';

type TabKey = 'leave' | 'cancel-leave' | 'compoff' | 'travel' | 'advance' | 'loan' | 'shift' | 'optional-holiday' | 'overtime';

const SUB_TO_TAB: Record<string, TabKey> = {
  leave: 'leave',
  'cancel-leave': 'cancel-leave',
  compoff: 'compoff',
  travel: 'travel',
  advance: 'advance',
  loan: 'loan',
  shift: 'shift',
  'optional-holiday': 'optional-holiday',
  overtime: 'overtime',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  leave: 'leave',
  'cancel-leave': 'cancel-leave',
  compoff: 'compoff',
  travel: 'travel',
  advance: 'advance',
  loan: 'loan',
  shift: 'shift',
  'optional-holiday': 'optional-holiday',
  overtime: 'overtime',
};

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'leave', label: 'Leave', icon: Calendar },
  { key: 'cancel-leave', label: 'Cancel Leave', icon: X },
  { key: 'compoff', label: 'COL/COFF', icon: RotateCcw },
  { key: 'travel', label: 'Travel Claim', icon: Plane },
  { key: 'advance', label: 'Advance Claim', icon: Wallet },
  { key: 'loan', label: 'Loan/Advance', icon: Wallet },
  { key: 'shift', label: 'Shift Change', icon: Clock },
  { key: 'optional-holiday', label: 'Optional Holidays', icon: Calendar },
  { key: 'overtime', label: 'Overtime (O.T)', icon: BarChart3 },
];

function ApprovalQueue({
  title,
  queryKey,
  queryFn,
  onApprove,
  onReject,
}: {
  title: string;
  queryKey: string[];
  queryFn: () => Promise<any>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn,
  });

  const requests = Array.isArray(data) ? data : (data?.data ?? []);
  const pending = requests.filter((r: any) => r.status === 'pending' || r.status === 'submitted');

  const columns: Column<any>[] = [
    { key: 'employeeName', header: 'Employee', render: (row) => row.employee?.firstName + ' ' + row.employee?.lastName || row.employeeId },
    { key: 'type', header: 'Type', render: (row) => row.leaveType || row.type || '—' },
    { key: 'startDate', header: 'Start Date', render: (row) => row.startDate ? new Date(row.startDate).toLocaleDateString('en-IN') : '—' },
    { key: 'endDate', header: 'End Date', render: (row) => row.endDate ? new Date(row.endDate).toLocaleDateString('en-IN') : '—' },
    { key: 'days', header: 'Days', render: (row) => row.days || row.totalDays || '—' },
    { key: 'reason', header: 'Reason', render: (row) => <span className="max-w-[180px] truncate block text-xs text-slate-500">{row.reason || '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onApprove(row.id)}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded font-medium transition-colors"
          >
            <Check size={12} /> Approve
          </button>
          <button
            onClick={() => onReject(row.id)}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded font-medium transition-colors"
          >
            <X size={12} /> Reject
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="text-center py-12 text-slate-400 text-sm">Loading pending approvals…</div>;

  if (!pending.length) {
    return (
      <div className="text-center py-16">
        <CheckSquare size={40} className="mx-auto text-emerald-400 mb-3 opacity-60" />
        <p className="text-sm font-medium text-slate-600">No pending {title} approvals</p>
        <p className="text-xs text-slate-400 mt-1">All items have been processed.</p>
      </div>
    );
  }

  return <DataTable columns={columns} data={pending} keyField="id" />;
}

export default function ApprovalsPage() {
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initialTab: TabKey = sub ? (SUB_TO_TAB[sub] || 'leave') : 'leave';
  const [tab, setTab] = useState<TabKey>(initialTab);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/approvals/${TAB_TO_SUB[t]}`);
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-pending'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => leaveApi.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-pending'] }),
  });

  const pendingCount = 0;

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Approvals"
        subtitle="Review and approve pending employee requests"
        actions={
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            )}
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-0 mb-6 border-b border-slate-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === key
                ? 'border-[#00a8cc] text-[#00a8cc]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            {TABS.find(t => t.key === tab)?.label} Approval Queue
          </h3>
          <div className="flex gap-2">
            <button className="text-xs flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium transition-colors">
              <Check size={12} /> Approve All Selected
            </button>
            <button className="text-xs flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors">
              <X size={12} /> Reject All Selected
            </button>
          </div>
        </div>

        <div className="p-4">
          {tab === 'leave' && (
            <ApprovalQueue
              title="Leave"
              queryKey={['leave-pending']}
              queryFn={() => leaveApi.listAll({ status: 'pending' })}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id) => rejectMutation.mutate(id)}
            />
          )}
          {tab === 'cancel-leave' && (
            <ApprovalQueue
              title="Leave Cancellation"
              queryKey={['leave-cancel-pending']}
              queryFn={() => leaveApi.listAll({ status: 'cancel_requested' })}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id) => rejectMutation.mutate(id)}
            />
          )}
          {tab !== 'leave' && tab !== 'cancel-leave' && (
            <div className="text-center py-16">
              <CheckSquare size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">No pending {TABS.find(t => t.key === tab)?.label} approvals</p>
              <p className="text-xs text-slate-400 mt-1">All items have been reviewed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
