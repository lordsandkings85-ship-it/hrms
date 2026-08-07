import { useQuery, useMutation } from '@tanstack/react-query';
import { Plug, Power, PowerOff, Loader2, Workflow, Bell, Wallet, FileSpreadsheet } from 'lucide-react';
import { integrationsApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';

const INTEGRATION_PROVIDERS = [
  { provider: 'google_calendar', name: 'Google Workspace', desc: 'Sync employee shifts and leave calendars automatically.', icon: <Workflow size={24}/>, color: 'text-blue-500' },
  { provider: 'slack', name: 'Slack Bot Hook', desc: 'Broadcast daily team check-in, announcements, and payroll updates.', icon: <Bell size={24}/>, color: 'text-purple-500' },
  { provider: 'razorpay', name: 'Razorpay Payroll', desc: 'Process automatic payroll bank transactions from payslips.', icon: <Wallet size={24}/>, color: 'text-emerald-500' },
  { provider: 'tally', name: 'Tally ERP Sync', desc: 'Sync billing and payroll ledgers into company accounting files.', icon: <FileSpreadsheet size={24}/>, color: 'text-amber-500' },
];

export default function IntegrationsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  
  const { data: activeList, refetch, isLoading } = useQuery({
    queryKey: ['integrations-list'],
    queryFn: () => integrationsApi.list(),
  });

  const connectMutation = useMutation({
    mutationFn: integrationsApi.connect,
    onSuccess: () => {
      toastSuccess('Integration channel established successfully!');
      refetch();
    },
    onError: (e: any) => toastError(e.message || 'Failed to establish connection')
  });

  const disconnectMutation = useMutation({
    mutationFn: integrationsApi.disconnect,
    onSuccess: () => {
      toastSuccess('Integration channel severed safely.');
      refetch();
    },
    onError: (e: any) => toastError(e.message || 'Failed to sever connection')
  });

  const handleToggle = (item: typeof INTEGRATION_PROVIDERS[0]) => {
    const active = activeList?.find((a: any) => a.provider === item.provider);
    if (active && active.status === 'connected') {
      disconnectMutation.mutate(active.id);
    } else {
      connectMutation.mutate({ provider: item.provider, config: {} });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
             <Plug size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">App Integrations</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Connect third-party tools, API webhooks, and automation pipelines to your HRMS.</p>
          </div>
        </div>
      </div>

      {isLoading ? (
         <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
           <Loader2 className="animate-spin" size={24} />
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {INTEGRATION_PROVIDERS.map((item) => {
            const active = activeList?.find((a: any) => a.provider === item.provider);
            const isConnected = active?.status === 'connected';
            const isPending = connectMutation.isPending || disconnectMutation.isPending;

            return (
              <div key={item.provider} className={`bg-[var(--surface)] border ${isConnected ? 'border-amber-500 shadow-sm shadow-amber-500/10' : 'border-[var(--border)]'} rounded-2xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-md`}>
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-center ${item.color}`}>
                      {item.icon}
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                      isConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]'
                    }`}>
                      {isConnected ? 'Active' : 'Disconnected'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{item.name}</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-2 font-medium leading-relaxed">{item.desc}</p>
                </div>

                <div className="border-t border-[var(--border)] mt-6 pt-4 flex justify-between items-center">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded">ID: {item.provider}</span>
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                      isConnected
                        ? 'border border-[var(--border)] text-rose-500 bg-[var(--surface-alt)] hover:bg-rose-500/10 hover:border-rose-500/30'
                        : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                    }`}
                  >
                    {isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isConnected ? (
                      <><PowerOff size={14} /> Sever Channel</>
                    ) : (
                      <><Power size={14} /> Establish Channel</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
