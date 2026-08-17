import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { employeesApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastProvider';

export default function SendCredentialsPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list({ pageSize: 100 }),
  });

  const empList = employees?.items ?? [];

  const handleResult = (res: any) => {
    const sent = res?.sent ?? 0;
    const skipped = res?.skipped ?? [];
    if (skipped.length) {
      toastError(`Sent: ${sent}`, skipped.map((s: any) => s.reason).join(', '));
    } else {
      toastSuccess(`Sent: ${sent}`);
    }
    queryClient.invalidateQueries({ queryKey: ['employees-list'] });
  };

  const bulkSend = useMutation({
    mutationFn: (ids: string[]) => employeesApi.sendCredentials(ids),
    onSuccess: handleResult,
    onError: (e: any) => toastError(e.message || 'Failed to send credentials'),
  });

  const sendOne = useMutation({
    mutationFn: (id: string) => employeesApi.sendCredentials([id]),
    onSuccess: handleResult,
    onError: (e: any) => toastError(e.message || 'Failed to send credentials'),
  });

  const columns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {((row.firstName || '?')[0] || '')}{((row.lastName || '?')[0] || '')}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--text-primary)] text-sm truncate">{row.firstName} {row.lastName}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">{row.employeeCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row: any) => <span className="font-mono text-xs text-[var(--text-primary)]">{row.email || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.status || 'active'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row: any) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              if (confirm(`Send login credentials to ${row.firstName} ${row.lastName}?`)) sendOne.mutate(row.id);
            }}
            disabled={sendOne.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-xs font-semibold disabled:opacity-40"
          >
            <Mail size={12} />
            Send
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
            <Mail size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Send Credentials</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Send login credentials to new or existing employees.</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              Employees
            </h3>
          </div>
          <div className="text-xs text-[var(--text-muted)] font-medium">{empList.length} employees</div>
        </div>

        <div className="premium-datatable">
          <style>{`
             .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
             .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
             .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
             .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
             .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
             .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
          `}</style>

          <DataTable
            columns={columns}
            data={empList}
            loading={isLoading}
            keyField="id"
            pageSize={100}
            bulkActions={[{ label: 'Send credentials', icon: Mail, onClick: (rows: any[]) => bulkSend.mutate(rows.map((r) => r.id)) }]}
          />
        </div>
      </div>
    </div>
  );
}
