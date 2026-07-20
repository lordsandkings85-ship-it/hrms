import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Headphones, Plus, Tag, Clock, CheckCircle, AlertCircle,
  Loader2, MessageSquare, ChevronRight, Filter,
} from 'lucide-react';
import { useToast } from '../components/ui/ToastProvider';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api/client';
import { DataTable, type Column } from '../components/ui/DataTable';

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
  employeeId?: string;
  employee?: { firstName: string; lastName: string };
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: 'Open',        color: 'bg-info-light text-info-dark border border-info/20',           icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-warning-light text-warning-dark border border-warning/20',  icon: Loader2 },
  resolved:    { label: 'Resolved',    color: 'bg-success-light text-success-dark border border-success/20',  icon: CheckCircle },
  closed:      { label: 'Closed',      color: 'bg-line text-muted border border-line',                       icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-muted dark:text-white/50' },
  medium: { label: 'Medium', color: 'text-info-dark' },
  high:   { label: 'High',   color: 'text-warning-dark' },
  urgent: { label: 'Urgent', color: 'text-danger font-semibold' },
};

// Since the backend helpdesk module isn't yet deployed, we use localStorage mock
function useMockTickets() {
  const STORAGE_KEY = 'hrms_helpdesk_tickets';
  const stored = localStorage.getItem(STORAGE_KEY);
  const tickets: Ticket[] = stored ? JSON.parse(stored) : DEMO_TICKETS;

  const save = (t: Ticket[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(t));

  return {
    tickets,
    create: (data: Partial<Ticket>) => {
      const newTicket: Ticket = {
        id: `TKT-${Date.now()}`,
        subject: data.subject ?? '',
        description: data.description ?? '',
        status: 'open',
        priority: data.priority ?? 'medium',
        category: data.category ?? 'general',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      save([newTicket, ...tickets]);
      return newTicket;
    },
    updateStatus: (id: string, status: TicketStatus) => {
      const updated = tickets.map(t => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t);
      save(updated);
      return updated;
    },
  };
}

const DEMO_TICKETS: Ticket[] = [
  { id: 'TKT-001', subject: 'Cannot access payroll reports', description: 'Getting 403 error on payroll page', status: 'open', priority: 'high', category: 'it', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'TKT-002', subject: 'Salary slip not generated for March', description: 'My salary slip for March 2025 is missing.', status: 'in_progress', priority: 'urgent', category: 'payroll', createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 43200000).toISOString() },
  { id: 'TKT-003', subject: 'Laptop return request', description: 'I need to return my company laptop.', status: 'resolved', priority: 'low', category: 'asset', createdAt: new Date(Date.now() - 604800000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'TKT-004', subject: 'Leave balance correction', description: 'My casual leave balance is incorrect.', status: 'open', priority: 'medium', category: 'hr', createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString() },
];

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function NewTicketModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<Ticket>) => void }) {
  const [form, setForm] = useState<Partial<Ticket>>({ priority: 'medium', category: 'general' });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Ticket, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject?.trim()) return;
    setSaving(true);
    setTimeout(() => { onSave(form); onClose(); setSaving(false); }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="relative bg-white dark:bg-ink2 border border-line dark:border-white/10 rounded-2xl shadow-popover w-full max-w-lg p-6 animate-scaleIn"
      >
        <h2 className="text-base font-semibold text-ink dark:text-white mb-5">Submit a Support Ticket</h2>

        <div className="space-y-4">
          <div>
            <label className="input-label">Subject *</label>
            <input required className="input" placeholder="Brief description of the issue" value={form.subject ?? ''} onChange={e => set('subject', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="general">General</option>
                <option value="hr">HR</option>
                <option value="it">IT</option>
                <option value="payroll">Payroll</option>
                <option value="asset">Asset</option>
              </select>
            </div>
            <div>
              <label className="input-label">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea className="input resize-none" rows={4} placeholder="Provide more details about the issue…" value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Submit Ticket
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HelpdeskPage() {
  const { success } = useToast();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.isSystem;

  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const stored = localStorage.getItem('hrms_helpdesk_tickets');
    return stored ? JSON.parse(stored) : DEMO_TICKETS;
  });

  const saveTickets = (t: Ticket[]) => {
    setTickets(t);
    localStorage.setItem('hrms_helpdesk_tickets', JSON.stringify(t));
  };

  const handleCreate = (data: Partial<Ticket>) => {
    const newTicket: Ticket = {
      id: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      subject: data.subject ?? '',
      description: data.description ?? '',
      status: 'open',
      priority: data.priority ?? 'medium',
      category: data.category ?? 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTickets([newTicket, ...tickets]);
    success('Ticket Submitted', `${newTicket.id} has been created successfully.`);
  };

  const handleStatusChange = (id: string, status: TicketStatus) => {
    const updated = tickets.map(t => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t);
    saveTickets(updated);
    success('Status Updated', `Ticket status changed to ${STATUS_CONFIG[status].label}.`);
  };

  const filtered = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  const columns: Column<Ticket>[] = [
    { key: 'id', header: 'Ticket ID', width: '110px', render: row => (
      <span className="font-mono text-xs font-semibold text-ledger dark:text-white/80">{row.id}</span>
    )},
    { key: 'subject', header: 'Subject', sortable: true, render: row => (
      <div>
        <div className="text-sm font-medium text-ink dark:text-white leading-tight">{row.subject}</div>
        {row.description && <div className="text-xs text-muted dark:text-white/40 truncate max-w-xs mt-0.5">{row.description}</div>}
      </div>
    )},
    { key: 'category', header: 'Category', width: '100px', render: row => (
      <span className="capitalize text-xs font-medium text-muted dark:text-white/60 bg-paperDim dark:bg-white/5 border border-line dark:border-white/10 px-2 py-0.5 rounded-full">{row.category}</span>
    )},
    { key: 'priority', header: 'Priority', width: '90px', render: row => <PriorityBadge priority={row.priority} /> },
    { key: 'status', header: 'Status', width: '130px', render: row => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Raised On', sortable: true, width: '120px', render: row => (
      <span className="text-xs text-muted dark:text-white/50">{new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
    )},
    ...(isAdmin ? [{
      key: 'actions' as keyof Ticket,
      header: 'Actions',
      width: '120px',
      render: (row: Ticket) => (
        <select
          value={row.status}
          onChange={e => handleStatusChange(row.id, e.target.value as TicketStatus)}
          onClick={e => e.stopPropagation()}
          className="input py-1 text-xs"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      ),
    }] : []),
  ];

  return (
    <div className="page-container">
      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onSave={handleCreate} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink dark:text-white tracking-tight flex items-center gap-2">
            <Headphones size={20} />
            Helpdesk
          </h1>
          <p className="text-sm text-muted dark:text-white/50 mt-0.5">Submit and track support tickets for HR, IT, Payroll, and Asset issues.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={15} />
          New Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-ink dark:text-white' },
          { label: 'Open', value: stats.open, color: 'text-info' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-warning-dark' },
          { label: 'Resolved', value: stats.resolved, color: 'text-success' },
        ].map(s => (
          <div key={s.label} className="section-card px-4 py-3">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted dark:text-white/50 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-line dark:border-white/10">
        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === s
                ? 'border-ledger text-ink dark:text-white'
                : 'border-transparent text-muted dark:text-white/40 hover:text-ink dark:hover:text-white'
            }`}
          >
            {s === 'all' ? 'All Tickets' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-line dark:bg-white/10 text-[10px] text-muted dark:text-white/40">
              {s === 'all' ? tickets.length : tickets.filter(t => t.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable<Ticket>
        columns={columns as Column<Ticket>[]}
        data={filtered as Ticket[]}
        keyField="id"
        searchable
        searchPlaceholder="Search tickets…"
        emptyTitle="No tickets found"
        emptyMessage="No support tickets match your current filter."
        bulkActions={isAdmin ? [
          { label: 'Mark Resolved', onClick: (rows) => { (rows as Ticket[]).forEach(r => handleStatusChange(r.id, 'resolved')); success(`${rows.length} ticket(s) resolved`); } },
          { label: 'Close Tickets', danger: true, onClick: (rows) => { (rows as Ticket[]).forEach(r => handleStatusChange(r.id, 'closed')); } },
        ] : []}
      />
    </div>
  );
}
