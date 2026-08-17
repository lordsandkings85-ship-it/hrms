import { useQuery, useMutation } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { CreditCard, ShieldCheck, Download, Loader2, Zap, Rocket, Star } from 'lucide-react';
import { billingApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';
import { DataTable, Column } from '../../../components/ui/DataTable';

const BRAND: [number, number, number] = [16, 185, 129];
const DARK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

function handleDownloadReceipt(row: any) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Lords & Kings HRMS', 14, 11);
  doc.setFontSize(9);
  doc.text('PAYMENT RECEIPT', pageWidth - 14, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(220, 252, 231);
  doc.text(row.invoiceNumber, pageWidth - 14, 16, { align: 'right' });

  let y = 36;
  const detail = (label: string, value: string) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(value, 14 + 40, y);
    y += 7;
  };
  detail('Invoice Number', row.invoiceNumber);
  detail('Billing Date', new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
  detail('Status', String(row.status || '-').toUpperCase());

  y += 6;
  doc.setFillColor(...BRAND);
  doc.roundedRect(14, y, pageWidth - 28, 16, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT PAID', 18, y + 10);
  doc.setFontSize(14);
  doc.text(`Rs. ${Math.round(row.amount || 0).toLocaleString('en-IN')}`, pageWidth - 18, y + 10, { align: 'right' });
  y += 28;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  doc.text('This is a computer-generated receipt. For queries, contact billing@lordsandkings.co.', 14, y);
  doc.text(`Page 1 of 1 | Lords & Kings`, 14, 287);

  doc.save(`${row.invoiceNumber}_Receipt.pdf`);
}

export default function BillingPage() {
  const { success: toastSuccess } = useToast();

  const { data: subscription, refetch, isLoading: isLoadingSub } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: () => billingApi.getSubscription(),
  });

  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => billingApi.listInvoices(),
  });

  const upgradeMutation = useMutation({
    mutationFn: (planName: string) => billingApi.upgradePlan(planName),
    onSuccess: (_, planName) => {
      toastSuccess(`Upgraded to ${planName} Plan successfully!`);
      refetch();
    },
  });

  const handleUpgrade = (planName: string) => {
    upgradeMutation.mutate(planName);
  };

  const invoiceColumns: Column<any>[] = [
    { key: 'invoiceNumber', header: 'Invoice #', render: (row) => <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{row.invoiceNumber}</span> },
    { key: 'date', header: 'Billing Date', render: (row) => <span className="font-mono text-xs text-[var(--text-muted)]">{new Date(row.date).toLocaleDateString()}</span> },
    { key: 'amount', header: 'Amount', render: (row) => <span className="font-mono text-sm font-bold text-emerald-500">₹{row.amount.toLocaleString()}</span> },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row) => (
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
          row.status === 'paid' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      key: 'actions', 
      header: 'Receipt', 
      render: (row) => (
        <button onClick={() => handleDownloadReceipt(row)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-colors">
          <Download size={14} /> PDF
        </button>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
             <CreditCard size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Billing & Subscription</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage your subscription plans, view past invoices, and upgrade your limits.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Subscription Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2 mb-6">
              <ShieldCheck className="text-emerald-500" size={18} /> Active Subscription
            </h3>
            {isLoadingSub ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-[var(--text-muted)]" /></div>
            ) : subscription ? (
              <div className="space-y-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Current Plan</span>
                    <div className="text-2xl font-bold text-[var(--text-primary)] capitalize mt-1">
                      {subscription.planName || 'Free Sandbox'}
                    </div>
                  </div>
                  <Star className="text-emerald-500 opacity-50" size={32} />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)] font-medium">Renewal Status</span>
                    <span className="font-bold text-[var(--text-primary)] capitalize">{subscription.status}</span>
                  </div>
                  {subscription.renewsAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)] font-medium">Next Billing Date</span>
                      <span className="font-bold font-mono text-[var(--text-primary)]">{new Date(subscription.renewsAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-[var(--border)] space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">Upgrade Options</span>
                  <button
                    onClick={() => handleUpgrade('growth')}
                    disabled={upgradeMutation.isPending}
                    className="w-full flex items-center justify-between border border-[var(--border)] hover:border-blue-500 px-4 py-3 rounded-xl transition-all bg-[var(--surface-alt)] hover:bg-blue-500/5 group"
                  >
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-2"><Zap size={16} className="text-blue-500"/> Growth Tier (100 Emp)</span>
                    <span className="font-mono font-bold text-[var(--text-muted)] group-hover:text-blue-500">₹5,000/mo</span>
                  </button>
                  <button
                    onClick={() => handleUpgrade('enterprise')}
                    disabled={upgradeMutation.isPending}
                    className="w-full flex items-center justify-between border border-[var(--border)] hover:border-purple-500 px-4 py-3 rounded-xl transition-all bg-[var(--surface-alt)] hover:bg-purple-500/5 group"
                  >
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-2"><Rocket size={16} className="text-purple-500"/> Enterprise Tier</span>
                    <span className="font-mono font-bold text-[var(--text-muted)] group-hover:text-purple-500">₹15,000/mo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-8">
                <div className="w-16 h-16 bg-[var(--surface-alt)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
                  <CreditCard size={24} />
                </div>
                <p className="text-sm text-[var(--text-muted)] font-medium max-w-[200px] mx-auto">No active subscription plan configured in this workspace.</p>
                <button
                  onClick={() => handleUpgrade('growth')}
                  disabled={upgradeMutation.isPending}
                  className="bg-emerald-500 text-white text-sm px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors w-full"
                >
                  Provision Growth Tier
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Billing Invoices table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">Invoice History</h3>
            
            <div className="premium-datatable">
              <style>{`
                  .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                  .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                  .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                  .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                  .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                  .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
              `}</style>
              <DataTable columns={invoiceColumns} data={invoices || []} loading={isLoadingInvoices} keyField="id" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
