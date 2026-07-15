import { useQuery, useMutation } from '@tanstack/react-query';
import { Plug, Power, PowerOff, ShieldCheck } from 'lucide-react';
import { integrationsApi } from '../api/client';

const INTEGRATION_PROVIDERS = [
  { provider: 'google_calendar', name: 'Google Calendar API', desc: 'Sync employee shifts and leave calendars automatically.' },
  { provider: 'slack', name: 'Slack Bot Hook', desc: 'Broadcast daily team check-in, announcements, and payroll status updates.' },
  { provider: 'razorpay', name: 'Razorpay Payroll Payouts', desc: 'Process automatic payroll bank transactions from payslips breakdown.' },
  { provider: 'tally', name: 'Tally ERP Sync', desc: 'Sync billing and payroll ledgers into company accounting files.' },
];

export default function IntegrationsPage() {
  // Fetch active integrations status
  const { data: activeList, refetch } = useQuery({
    queryKey: ['integrations-list'],
    queryFn: () => integrationsApi.list(),
  });

  // Connect integration Mutation
  const connectMutation = useMutation({
    mutationFn: integrationsApi.connect,
    onSuccess: () => {
      alert('Integration channel established!');
      refetch();
    },
  });

  // Disconnect integration Mutation
  const disconnectMutation = useMutation({
    mutationFn: integrationsApi.disconnect,
    onSuccess: () => {
      alert('Integration channel severed.');
      refetch();
    },
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
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">SaaS Connectors</h1>
        <p className="text-sm text-muted mt-1">Connect third-party calendars, communication channels, accounting systems, and bank payment processors.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INTEGRATION_PROVIDERS.map((item) => {
          const active = activeList?.find((a: any) => a.provider === item.provider);
          const isConnected = active?.status === 'connected';

          return (
            <div key={item.provider} className="bg-white border border-line rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-paper rounded border border-line text-ledger mb-4 h-fit">
                    <Plug size={20} />
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    isConnected ? 'bg-ledger/10 text-ledger' : 'bg-paper text-muted border border-line'
                  }`}>
                    {isConnected ? 'Active Connection' : 'Disconnected'}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-ink">{item.name}</h3>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">{item.desc}</p>
              </div>

              <div className="border-t border-line mt-6 pt-4 flex justify-between items-center">
                <span className="text-[10px] font-mono text-muted">ID: {item.provider}</span>
                <button
                  onClick={() => handleToggle(item)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded ${
                    isConnected
                      ? 'border border-rust text-rust hover:bg-rust/5'
                      : 'bg-ledger text-paper hover:bg-ledgerDark'
                  }`}
                >
                  {isConnected ? (
                    <>
                      <PowerOff size={12} /> Sever Channel
                    </>
                  ) : (
                    <>
                      <Power size={12} /> Establish Channel
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
