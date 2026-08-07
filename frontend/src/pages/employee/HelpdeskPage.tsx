import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Headphones, Plus, Loader2, CheckCircle, AlertCircle, TicketCheck
} from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';
import { helpdeskApi } from '../../api/client';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'hr' | 'it' | 'payroll' | 'asset' | 'general';

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

export default function HelpdeskPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['helpdesk-tickets'],
    queryFn: () => helpdeskApi.list(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: '', category: 'general', priority: 'medium', description: '' }
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: TicketFormData) => helpdeskApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      toastSuccess('Ticket Submitted Successfully');
      reset();
      setShowNew(false);
    },
    onError: (err: any) => toastError(err.message || 'Failed to submit ticket')
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) => helpdeskApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      toastSuccess('Status Updated Successfully');
    }
  });

  const filtered = statusFilter === 'all' ? tickets : tickets.filter((t: Ticket) => t.status === statusFilter);

  const stats = {
    total: tickets.length,
    open: tickets.filter((t: Ticket) => t.status === 'open').length,
    inProgress: tickets.filter((t: Ticket) => t.status === 'in_progress').length,
    resolved: tickets.filter((t: Ticket) => t.status === 'resolved').length,
  };

  const columns: Column<Ticket>[] = [
    { key: 'id', header: 'Ticket ID', render: row => <span className="font-mono text-xs font-bold text-[var(--text-primary)]">#{row.id.slice(0, 8).toUpperCase()}</span> },
    { key: 'subject', header: 'Subject', sortable: true, render: row => (
      <div>
        <div className="text-sm font-bold text-[var(--text-primary)]">{row.subject}</div>
        <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{CATEGORY_LABELS[row.category]}</div>
      </div>
    )},
    { key: 'priority', header: 'Priority', render: row => <PriorityBadge priority={row.priority} /> },
    { key: 'status', header: 'Status', render: row => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Date', sortable: true, render: row => <span className="font-mono text-xs text-[var(--text-muted)]">{new Date(row.createdAt).toLocaleDateString()}</span> },
    {
      key: 'actions' as keyof Ticket,
      header: 'Admin Actions',
      render: (row: Ticket) => (
        <select
          value={row.status}
          onChange={e => updateStatusMutation.mutate({ id: row.id, status: e.target.value as TicketStatus })}
          onClick={e => e.stopPropagation()}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer text-[var(--text-primary)]"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      ),
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-[var(--border)] bg-indigo-500/5 rounded-t-2xl">
              <h3 className="font-bold text-[var(--text-primary)] text-lg">Create Admin Ticket</h3>
              <p className="text-sm text-[var(--text-muted)]">Raise a system-wide or administrative issue.</p>
            </div>
            <form onSubmit={handleSubmit((d) => createTicketMutation.mutate(d))} className="p-6 space-y-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[var(--text-primary)]">Subject <span className="text-rose-500">*</span></label>
                 <input {...register('subject')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" placeholder="Brief description" />
                 {errors.subject && <p className="text-xs text-rose-500">{errors.subject.message}</p>}
               </div>
               <div className="grid grid-cols-2 gap-4">
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
                 <textarea {...register('description')} rows={4} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none" placeholder="Detailed information..." />
                 {errors.description && <p className="text-xs text-rose-500">{errors.description.message}</p>}
               </div>
               <div className="flex gap-4 pt-4 mt-4 border-t border-[var(--border)]">
                  <button type="button" onClick={() => setShowNew(false)} className="flex-1 py-2.5 bg-[var(--surface-alt)] text-[var(--text-primary)] rounded-xl text-sm font-bold border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors">Cancel</button>
                  <button type="submit" disabled={createTicketMutation.isPending} className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2">
                    {createTicketMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Ticket
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
             <Headphones size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Admin Helpdesk Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage all organizational support tickets, tracking, and resolutions.</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="relative z-10 flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
          <Plus size={18} /> New Admin Ticket
        </button>
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

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[500px]">
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-[var(--border)] pb-4">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                statusFilter === s
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {s === 'all' ? 'All Tickets' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${statusFilter === s ? 'bg-white/20' : 'bg-[var(--surface)]'}`}>
                {s === 'all' ? tickets.length : tickets.filter((t: Ticket) => t.status === s).length}
              </span>
            </button>
          ))}
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
           <DataTable columns={columns as Column<Ticket>[]} data={filtered as Ticket[]} loading={isLoading} keyField="id" />
        </div>
      </div>
    </div>
  );
}
