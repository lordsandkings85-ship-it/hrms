import { useQuery, useMutation } from '@tanstack/react-query';
import { CreditCard, ShieldCheck, Download } from 'lucide-react';
import { billingApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';

export default function BillingPage() {
  // Fetch subscription metadata
  const { data: subscription, refetch } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: () => billingApi.getSubscription(),
  });

  // Fetch invoices list
  const { data: invoices } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => billingApi.listInvoices(),
  });

  // Upgrade Plan Mutation
  const upgradeMutation = useMutation({
    mutationFn: billingApi.upgradePlan,
    onSuccess: () => {
      alert('Subscription plan updated successfully!');
      refetch();
    },
  });

  const handleUpgrade = (planName: string) => {
    upgradeMutation.mutate(planName);
  };

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp mb-2">
        <PageHeader
          title="Billing & Subscription"
          subtitle="Manage your plan, invoices, and payment details."
          icon={CreditCard}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Subscription Info */}
        <div className="section-card p-6 h-fit">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <CreditCard className="text-ledger" size={18} /> Active Subscription
          </h2>
          {subscription ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs text-muted">Tier Status Plan</span>
                <div className="text-xl font-bold text-ledger flex items-center gap-1.5 capitalize mt-0.5">
                  <ShieldCheck size={18} /> {subscription.planName || 'Free Sandbox'}
                </div>
              </div>

              <div>
                <span className="text-xs text-muted">Renewal Status</span>
                <div className="text-sm font-medium mt-0.5 capitalize text-ink">
                  {subscription.status}
                </div>
                {subscription.renewsAt && (
                  <div className="text-xs text-muted mt-0.5">Renews on {new Date(subscription.renewsAt).toLocaleDateString()}</div>
                )}
              </div>

              <div className="border-t border-line pt-4 space-y-3">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider block">Upgrade Subscription</span>
                <div className="space-y-2">
                  <button
                    onClick={() => handleUpgrade('growth')}
                    className="w-full flex items-center justify-between border border-line hover:border-ledger px-3 py-2 rounded text-xs transition-colors bg-paper/20 hover:bg-ledger/5"
                  >
                    <span>Growth Tier (100 Employees)</span>
                    <span className="font-mono font-bold text-ledger">₹5,000/mo</span>
                  </button>
                  <button
                    onClick={() => handleUpgrade('enterprise')}
                    className="w-full flex items-center justify-between border border-line hover:border-ledger px-3 py-2 rounded text-xs transition-colors bg-paper/20 hover:bg-ledger/5"
                  >
                    <span>Enterprise Tier (Unlimited)</span>
                    <span className="font-mono font-bold text-ledger">₹15,000/mo</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center py-4">
              <p className="text-xs text-muted">No active subscription plan configured in this workspace. Set up a sandbox tier now.</p>
              <button
                onClick={() => handleUpgrade('growth')}
                className="bg-ledger text-paper text-xs px-4 py-2 rounded font-semibold hover:bg-ledgerDark"
              >
                Provision Growth Tier Plan
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Billing Invoices table */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line bg-paper/20">
            <h3 className="text-sm font-semibold">Downloadable Transaction Invoices</h3>
          </div>
          {(!invoices || invoices.length === 0) ? (
            <div className="p-6 text-sm text-muted text-center">No transactions invoice history generated yet. Invoices are dispatched on plan renewal cycles.</div>
          ) : (
            <div className="divide-y divide-line">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                  <div>
                    <div className="text-sm font-medium">Invoice ID: {inv.id.slice(0, 10).toUpperCase()}</div>
                    <div className="text-xs text-muted mt-0.5">
                      Issued {new Date(inv.issuedAt).toLocaleDateString()} &bull; <span className="capitalize">{inv.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-ink">₹{inv.amount.toLocaleString()}</div>
                      <div className="text-[10px] text-muted">GST Tax: ₹{inv.gstAmount.toLocaleString()}</div>
                    </div>
                    <a
                      href={`https://billing.hrms.internal/invoices/${inv.id}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 border border-line rounded hover:bg-paper/60 text-muted hover:text-ink"
                      title="Download PDF Invoice"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

