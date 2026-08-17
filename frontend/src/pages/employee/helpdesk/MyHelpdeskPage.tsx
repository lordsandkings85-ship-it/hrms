import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Headphones, Plus, Clock, CheckCircle, AlertCircle,
  Loader2, MessageSquare, TicketCheck, Send, Eye, ArrowLeft, Search
} from 'lucide-react';
import { useToast } from '../../../components/ui/ToastProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { helpdeskApi } from '../../../api/client';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DataTable, Column } from '../../../components/ui/DataTable';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'hr' | 'it' | 'payroll' | 'asset' | 'general';
type TabKey = 'new' | 'history';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: 'Open',        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',   icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Loader2 },
  resolved:    { label: 'Resolved',    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  closed:      { label: 'Closed',      color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; dot: string }> = {
  low:    { label: 'Low',    color: 'text-slate-500',  dot: 'bg-slate-500' },
  medium: { label: 'Medium', color: 'text-blue-500',   dot: 'bg-blue-500' },
  high:   { label: 'High',   color: 'text-amber-500',  dot: 'bg-amber-500' },
  urgent: { label: 'Urgent', color: 'text-rose-500',    dot: 'bg-rose-500' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  hr: 'Human Resources', it: 'IT Support', payroll: 'Payroll',
  asset: 'Assets & Equipment', general: 'General'
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${cfg.color}`}>
      <Icon size={12} className={status === 'in_progress' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-alt)] ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const ticketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  category: z.enum(['hr', 'it', 'payroll', 'asset', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

type TicketFormData = z.infer<typeof ticketSchema>;

export default function MyHelpdeskPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { sub } = useParams<{ sub?: string }>();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const myEmpId = user?.employee?.id || '';
  const initialTab: TabKey = sub === 'my-tickets' ? 'history' : 'new';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets', myEmpId],
    queryFn: () => helpdeskApi.mine(),
    enabled: !!myEmpId,
    refetchInterval: 30_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: '', category: 'general', priority: 'medium', description: '' }
  });

  const createMutation = useMutation({
    mutationFn: (data: TicketFormData) => helpdeskApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets', myEmpId] });
      toastSuccess('Ticket submitted successfully!');
      reset();
      setTab('history');
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit ticket'),
  });

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(t === 'history' ? '/helpdesk/my-tickets' : '/helpdesk');
  };

  const ticketList: Ticket[] = Array.isArray(tickets) ? tickets : [];

  const stats = {
    open: ticketList.filter(t => t.status === 'open').length,
    inProgress: ticketList.filter(t => t.status === 'in_progress').length,
    resolved: ticketList.filter(t => t.status === 'resolved').length,
    total: ticketList.length,
  };

  if (selectedTicket) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button onClick={() => setSelectedTicket(null)}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-indigo-500 transition-colors font-bold mb-2">
          <ArrowLeft size={16} /> Back to Ticket History
        </button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="p-6 border-b border-[var(--border)] bg-indigo-500/5 rounded-t-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedTicket.subject}</h2>
                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">{CATEGORY_LABELS[selectedTicket.category]}</p>
              </div>
              <StatusBadge status={selectedTicket.status} />
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border)]">
              <div>
                <label className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">Priority</label>
                <div className="mt-2"><PriorityBadge priority={selectedTicket.priority} /></div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">Ticket ID</label>
                <div className="mt-2 text-sm font-mono text-[var(--text-primary)] font-bold">#{selectedTicket.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">Submitted</label>
                <div className="mt-2 text-sm font-mono text-[var(--text-primary)] font-bold">{new Date(selectedTicket.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">Last Updated</label>
                <div className="mt-2 text-sm font-mono text-[var(--text-primary)] font-bold">{new Date(selectedTicket.updatedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide">Description</label>
              <div className="mt-2 p-6 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const columns: Column<Ticket>[] = [
    { key: 'id', header: 'Ticket ID', render: row => <span className="font-mono text-xs font-bold text-[var(--text-primary)]">#{row.id.slice(0, 8).toUpperCase()}</span> },
    { key: 'subject', header: 'Subject', render: row => (
      <div>
        <div className="text-sm font-bold text-[var(--text-primary)]">{row.subject}</div>
        <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{CATEGORY_LABELS[row.category]}</div>
      </div>
    )},
    { key: 'priority', header: 'Priority', render: row => <PriorityBadge priority={row.priority} /> },
    { key: 'status', header: 'Status', render: row => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Date', render: row => <span className="font-mono text-xs text-[var(--text-muted)]">{new Date(row.createdAt).toLocaleDateString()}</span> },
    { key: 'actions', header: 'Actions', render: row => (
        <button onClick={() => setSelectedTicket(row)} className="p-2 bg-[var(--surface-alt)] border border-[var(--border)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors">
          <Eye size={16} className="text-[var(--text-muted)] hover:text-indigo-500" />
        </button>
      )
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <Headphones size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">IT & HR Helpdesk</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Raise requests, get support, and track resolutions instantly.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets', value: stats.total, color: 'text-[var(--text-primary)]', bg: 'bg-[var(--surface)]' },
          { label: 'Open', value: stats.open, color: 'text-blue-500', bg: 'bg-blue-500/5 border-blue-500/20' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-amber-500', bg: 'bg-amber-500/5 border-amber-500/20' },
          { label: 'Resolved', value: stats.resolved, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[var(--border)] shadow-sm rounded-2xl p-5 flex items-center justify-between`}>
            <div>
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
            <TicketCheck size={24} className={`opacity-20 ${s.color}`} />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {([['new', 'Raise a Ticket', Plus], ['history', 'My Tickets', TicketCheck]] as [TabKey, string, React.ElementType][]).map(([key, label, Icon]) => (
          <button key={key} onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              tab === key 
                ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20' 
                : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
        {tab === 'new' ? (
          <div className="max-w-3xl">
             <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
               <Plus className="text-indigo-500" size={20} /> Submit a New Request
             </h3>
             <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Subject <span className="text-rose-500">*</span></label>
                 <input {...register('subject')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" placeholder="Brief description of the issue" />
                 {errors.subject && <p className="text-xs text-rose-500">{errors.subject.message}</p>}
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Category</label>
                    <select {...register('category')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Priority</label>
                    <select {...register('priority')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Description <span className="text-rose-500">*</span></label>
                 <textarea {...register('description')} rows={5} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none" placeholder="Provide detailed information to help us resolve this faster..." />
                 {errors.description && <p className="text-xs text-rose-500">{errors.description.message}</p>}
               </div>

               <div className="pt-4 border-t border-[var(--border)]">
                 <button type="submit" disabled={createMutation.isPending} className="py-2.5 px-6 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2">
                   {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit Request
                 </button>
               </div>
             </form>
          </div>
        ) : (
          <div className="premium-datatable">
             <style>{`
                  .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                  .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                  .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                  .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                  .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                  .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
             `}</style>
             <DataTable columns={columns} data={ticketList} loading={isLoading} keyField="id" />
          </div>
        )}
      </div>
    </div>
  );
}
