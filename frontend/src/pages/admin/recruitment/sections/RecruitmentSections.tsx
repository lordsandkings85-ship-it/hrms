import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, GitBranch, Plus, Loader2, Trash2 } from 'lucide-react';
import { recruitmentApi } from '../../../../api/client';
import { DataTable, Column } from '../../../../components/ui/DataTable';
import { AdminSection, StatusBadge } from '../../../../components/ui/AdminSection';
import { useToast } from '../../../../components/ui/ToastProvider';

export function JobsSection() {
  const { data, isLoading } = useQuery({ queryKey: ['recruitment-jobs'], queryFn: recruitmentApi.listJobs });
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const create = useMutation({
    mutationFn: () => recruitmentApi.createJob({ title, description: description || undefined }),
    onSuccess: () => { success('Job created'); setTitle(''); setDescription(''); queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] }); },
    onError: (e: any) => error(e.message || 'Failed to create job'),
  });
  const columns: Column<any>[] = [
    { key: 'title', header: 'Job Title', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.title}</span> },
    { key: 'description', header: 'Description', render: (r: any) => <span className="text-[var(--text-muted)] text-xs line-clamp-1">{r.description || '—'}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'candidates', header: 'Candidates', render: (r: any) => <span className="font-semibold">{Array.isArray(r.candidates) ? r.candidates.length : r.candidateCount ?? 0}</span> },
  ];
  return (
    <AdminSection
      title="Job Openings"
      icon={Briefcase}
      subtitle="Job advertisements and openings"
      right={
        <div className="flex items-end gap-2 flex-wrap">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-44" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-56" />
          <button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Post
          </button>
        </div>
      }
    >
      <DataTable columns={columns} data={data ?? []} loading={isLoading} keyField="id" emptyTitle="No job openings" emptyMessage="Post a job to get started." />
    </AdminSection>
  );
}

const STAGES = ['applied', 'screening', 'interview', 'selected', 'offered', 'joined', 'hired', 'rejected', 'declined'];

const STAGE_LABEL: Record<string, string> = {
  applied: 'Applied', screening: 'Screening', interview: 'Interview', selected: 'Selected',
  offered: 'Offered', joined: 'Joined', hired: 'Hired', rejected: 'Rejected', declined: 'Declined',
};

export function PipelineSection() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { data: jobs, isLoading } = useQuery({ queryKey: ['recruitment-jobs'], queryFn: recruitmentApi.listJobs });

  const rows = (jobs ?? []).flatMap((j: any) =>
    (j.candidates ?? []).map((c: any) => ({ ...c, jobTitle: j.title }))
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobId, setJobId] = useState('');

  const moveStage = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => recruitmentApi.moveStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] }),
    onError: (e: any) => error(e.message || 'Failed to update stage'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => recruitmentApi.deleteCandidate(id),
    onSuccess: () => {
      success('Candidate removed');
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
    onError: (e: any) => error(e.message || 'Failed to remove candidate'),
  });

  const add = useMutation({
    mutationFn: () => recruitmentApi.addCandidate(jobId, { name: name.trim(), email: email.trim() || undefined }),
    onSuccess: () => {
      success('Candidate added to pipeline');
      setName(''); setEmail('');
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
    },
    onError: (e: any) => error(e.message || 'Failed to add candidate'),
  });

  const columns: Column<any>[] = [
    { key: 'name', header: 'Candidate', render: (r: any) => <span className="font-bold text-[var(--text-primary)]">{r.name}</span> },
    { key: 'email', header: 'Email', render: (r: any) => <span className="text-[var(--text-muted)] text-xs">{r.email || '—'}</span> },
    { key: 'jobTitle', header: 'Job', render: (r: any) => <span className="text-xs">{r.jobTitle || '—'}</span> },
    {
      key: 'stage', header: 'Stage', render: (r: any) => (
        <select value={r.stage} onChange={(e) => moveStage.mutate({ id: r.id, stage: e.target.value })} className="px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-semibold">
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      ),
    },
    {
      key: 'actions', header: '', render: (r: any) => (
        <button onClick={() => remove.mutate(r.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
      ),
    },
  ];
  return (
    <AdminSection
      title="Candidate Pipeline"
      icon={GitBranch}
      subtitle="Candidates across stages, synced to the recruitment API"
      right={
        <div className="flex items-end gap-2 flex-wrap">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Candidate name" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-40" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500 w-44" />
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500">
            <option value="">Select job...</option>
            {(jobs ?? []).map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <button onClick={() => add.mutate()} disabled={!name.trim() || !jobId || add.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
            {add.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
      }
    >
      <DataTable columns={columns} data={rows} loading={isLoading} keyField="id" emptyTitle="No candidates" emptyMessage="Add candidates to the pipeline to get started." />
    </AdminSection>
  );
}
