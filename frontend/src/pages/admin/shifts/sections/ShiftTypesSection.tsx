import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Check, Pencil, Trash2, X, Zap, Clock } from 'lucide-react';
import { shiftTypesApi } from '../../../../api/client';
import { DataTable, Column } from '../../../../components/ui/DataTable';
import { useToast } from '../../../../components/ui/ToastProvider';

const formatTime12 = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
};

export default function ShiftTypesSection() {
  const { data: types, isLoading } = useQuery({ queryKey: ['admin-shift-types'], queryFn: shiftTypesApi.list });
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-shift-types'] });

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [isFlexible, setIsFlexible] = useState(false);
  const [graceMinutes, setGraceMinutes] = useState(10);
  const [coreHoursStart, setCoreHoursStart] = useState('10:00');
  const [coreHoursEnd, setCoreHoursEnd] = useState('16:00');
  const [overtimeThresholdMinutes, setOvertimeThresholdMinutes] = useState(480);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const create = useMutation({
    mutationFn: () => shiftTypesApi.create({
      name, defaultStartTime: startTime, defaultEndTime: endTime,
      isFlexible, graceMinutes, overtimeThresholdMinutes,
      ...(isFlexible && { coreHoursStart, coreHoursEnd }),
    }),
    onSuccess: () => {
      toastSuccess('Shift type created');
      setName(''); setStartTime('09:00'); setEndTime('18:00');
      setIsFlexible(false); setGraceMinutes(10); setOvertimeThresholdMinutes(480);
      invalidate();
    },
    onError: (e: any) => toastError(e.message || 'Failed to create'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => shiftTypesApi.update(id, data),
    onSuccess: () => { toastSuccess('Shift type updated'); setEditingId(null); invalidate(); },
    onError: (e: any) => toastError(e.message || 'Failed to update'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => shiftTypesApi.remove(id),
    onSuccess: (r: any) => { toastSuccess(r.message || 'Shift type deleted'); invalidate(); },
    onError: (e: any) => toastError(e.message || 'Failed to delete'),
  });

  const columns: Column<any>[] = [
    { key: 'name', header: 'Shift Type', render: (r) => <span className="font-bold text-[var(--text-primary)]">{r.name}</span> },
    { key: 'startTime', header: 'Default Hours', render: (r) => <span className="font-mono text-xs">{formatTime12(r.defaultStartTime)} - {formatTime12(r.defaultEndTime)}</span> },
    { key: 'flexible', header: 'Mode', render: (r) => r.isFlexible
      ? <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1 w-fit"><Zap size={10} /> Flexible</span>
      : <span className="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-500/20 flex items-center gap-1 w-fit"><Clock size={10} /> Fixed</span> },
    { key: 'grace', header: 'Grace', render: (r) => <span className="text-xs font-mono">{r.graceMinutes}m</span> },
    { key: 'coreHours', header: 'Core Hours', render: (r) => r.coreHoursStart && r.coreHoursEnd
      ? <span className="text-xs font-mono text-[var(--text-muted)]">{formatTime12(r.coreHoursStart)} - {formatTime12(r.coreHoursEnd)}</span>
      : <span className="text-xs text-[var(--text-muted)]">—</span> },
    { key: 'ot', header: 'OT Threshold', render: (r) => <span className="text-xs font-mono">{r.overtimeThresholdMinutes}m</span> },
    { key: 'shifts', header: 'Shifts', render: (r) => <span className="text-xs font-bold">{r._count?.shifts ?? 0}</span> },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => { setEditingId(r.id); setEditForm({ name: r.name, defaultStartTime: r.defaultStartTime, defaultEndTime: r.defaultEndTime, isFlexible: r.isFlexible, graceMinutes: r.graceMinutes, coreHoursStart: r.coreHoursStart || '', coreHoursEnd: r.coreHoursEnd || '', overtimeThresholdMinutes: r.overtimeThresholdMinutes }); }} className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10"><Pencil size={14} /></button>
          <button onClick={() => { if (confirm(`Delete shift type "${r.name}"?`)) remove.mutate(r.id); }} disabled={remove.isPending} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Shift Types</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">Define shift type templates with timing, grace period, and flexible mode.</p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. General" className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Start Time</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">End Time</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">Grace (min)</label>
            <input type="number" value={graceMinutes} onChange={(e) => setGraceMinutes(Number(e.target.value))} min={0} max={60} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <label className="flex items-center gap-2 p-3 border border-[var(--border)] rounded-xl bg-[var(--surface-alt)] cursor-pointer col-span-2 md:col-span-1">
            <input type="checkbox" checked={isFlexible} onChange={(e) => setIsFlexible(e.target.checked)} className="w-4 h-4 rounded text-indigo-500" />
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Flexible Mode</div>
              <div className="text-[10px] text-[var(--text-muted)]">Core hours window</div>
            </div>
          </label>
          {isFlexible && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Core Start</label>
                <input type="time" value={coreHoursStart} onChange={(e) => setCoreHoursStart(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">Core End</label>
                <input type="time" value={coreHoursEnd} onChange={(e) => setCoreHoursEnd(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">OT Threshold (min)</label>
            <input type="number" value={overtimeThresholdMinutes} onChange={(e) => setOvertimeThresholdMinutes(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Type
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[200px]">
        {editingId && (
          <div className="mb-4 p-4 border border-indigo-500/30 bg-indigo-500/5 rounded-xl space-y-3">
            <p className="text-xs font-bold text-[var(--text-primary)]">Edit Shift Type</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm" placeholder="Name" />
              <input type="time" value={editForm.defaultStartTime} onChange={(e) => setEditForm({ ...editForm, defaultStartTime: e.target.value })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono" />
              <input type="time" value={editForm.defaultEndTime} onChange={(e) => setEditForm({ ...editForm, defaultEndTime: e.target.value })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono" />
              <input type="number" value={editForm.graceMinutes} onChange={(e) => setEditForm({ ...editForm, graceMinutes: Number(e.target.value) })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm" placeholder="Grace (min)" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={editForm.isFlexible} onChange={(e) => setEditForm({ ...editForm, isFlexible: e.target.checked })} className="w-4 h-4 rounded text-indigo-500" />
                Flexible
              </label>
              {editForm.isFlexible && (
                <>
                  <input type="time" value={editForm.coreHoursStart} onChange={(e) => setEditForm({ ...editForm, coreHoursStart: e.target.value })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono" />
                  <input type="time" value={editForm.coreHoursEnd} onChange={(e) => setEditForm({ ...editForm, coreHoursEnd: e.target.value })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono" />
                </>
              )}
              <input type="number" value={editForm.overtimeThresholdMinutes} onChange={(e) => setEditForm({ ...editForm, overtimeThresholdMinutes: Number(e.target.value) })} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm" placeholder="OT Threshold" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={12} className="inline mr-1" />Cancel</button>
              <button onClick={() => update.mutate({ id: editingId, data: editForm })} disabled={!editForm.name?.trim() || update.isPending} className="px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1">
                {update.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
              </button>
            </div>
          </div>
        )}
        <DataTable columns={columns} data={types ?? []} loading={isLoading} keyField="id" showToolbar={false} selectable={false} emptyTitle="No shift types" emptyMessage="Create a shift type to get started." />
      </div>
    </div>
  );
}
