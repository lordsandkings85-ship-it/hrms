import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, MapPin, Clock, ChevronRight, Search, Filter,
  Building2, Users, Calendar, DollarSign, ExternalLink, Star,
  ArrowRight, Loader2, Bookmark, BookmarkCheck
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { recruitmentApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../../../components/ui/ToastProvider';

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full_time' | 'part_time' | 'contract' | 'internship';
  experienceRange: string;
  salaryRange?: string;
  description: string;
  requirements: string[];
  postedAt: string;
  deadline: string;
  isInternal: boolean;
  applied: boolean;
  candidatesCount?: number;
}

const MOCK_JOBS: JobOpening[] = [];
const TYPE_CONFIG: Record<JobOpening['type'], { label: string; color: string }> = {
  full_time:   { label: 'Full Time',   color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  part_time:   { label: 'Part Time',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  contract:    { label: 'Contract',    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  internship:  { label: 'Internship',  color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

export default function JobOpeningsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<JobOpening['type'] | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selected, setSelected] = useState<JobOpening | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const { data: rawJobs = [], isLoading } = useQuery({
    queryKey: ['job-openings'],
    queryFn: () => recruitmentApi.listJobs(),
  });

  const jobs: JobOpening[] = rawJobs
    .filter((j: any) => j.status === 'open')
    .map((j: any) => ({
      id: j.id,
      title: j.title,
      description: j.description || 'Open position within the organization.',
      department: 'Open Position',
      location: 'Company Office',
      type: 'full_time',
      experienceRange: 'N/A',
      isInternal: true,
      postedAt: '',
      deadline: '',
      requirements: [],
      applied: (j.candidates || []).some((c: any) => c.email === user?.email),
      candidatesCount: (j.candidates || []).length,
    }));

  const applyMutation = useMutation({
    mutationFn: (data: { jobId: string; name: string; email: string }) =>
      recruitmentApi.addCandidate(data.jobId, data),
    onSuccess: (_d, vars) => {
      const name = vars.name || 'Your application';
      toastSuccess(`${name} submitted successfully!`);
      setApplied(prev => new Set([...prev, vars.jobId]));
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to apply'),
  });

  const departments = Array.from(new Set(jobs.map(j => j.department)));

  const filtered = jobs.filter(j => {
    const matchSearch = !searchTerm || j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || j.type === typeFilter;
    const matchDept = deptFilter === 'all' || j.department === deptFilter;
    return matchSearch && matchType && matchDept;
  });

  const toggleSave = (id: string) => setSaved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleApply = (job: JobOpening) => {
    if (job.applied || applied.has(job.id)) return;
    const name = `${user?.employee?.firstName || ''} ${user?.employee?.lastName || ''}`.trim() || user?.email || 'Employee';
    applyMutation.mutate({ jobId: job.id, name, email: user?.email || '' });
  };

  if (selected) {
    const typeCfg = TYPE_CONFIG[selected.type];
    const isApplied = selected.applied || applied.has(selected.id);
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <button onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          ← Back to Job Openings
        </button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] bg-gradient-to-r from-indigo-500/5 to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${typeCfg.color}`}>{typeCfg.label}</span>
                  {selected.isInternal && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Internal Opening</span>}
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selected.title}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Building2 size={14} />{selected.department}</span>
                  <span className="flex items-center gap-1"><MapPin size={14} />{selected.location}</span>
                  <span className="flex items-center gap-1"><Clock size={14} />{selected.experienceRange}</span>
                  {selected.salaryRange && <span className="flex items-center gap-1"><DollarSign size={14} />{selected.salaryRange}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-[var(--text-muted)]">Open for applications</div>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-2">About the Role</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{selected.description}</p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Key Requirements</h3>
              <div className="space-y-2">
                {selected.requirements.map(req => (
                  <div key={req} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    {req}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              {isApplied ? (
                <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl text-sm font-medium">
                  <BookmarkCheck size={15} /> Application Submitted
                </div>
              ) : (
                <button onClick={() => handleApply(selected)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60">
                  {applyMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} {applyMutation.isPending ? 'Applying...' : 'Apply Now'}
                </button>
              )}
              <button onClick={() => toggleSave(selected.id)}
                className={`p-2.5 rounded-xl border transition-all ${
                  saved.has(selected.id) ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-indigo-500/30'
                }`}>
                {saved.has(selected.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Job Openings"
        subtitle="Explore internal and external career opportunities"
        icon={Briefcase}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search jobs by title or department..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
          <option value="all">All Types</option>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>
      </div>

      <div className="text-sm text-[var(--text-muted)]">{filtered.length} opening{filtered.length !== 1 ? 's' : ''} found</div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-[var(--text-muted)]">
          <Briefcase size={32} className="opacity-30" />
          <p className="text-sm">No job openings match your criteria</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(job => {
            const typeCfg = TYPE_CONFIG[job.type];
            const isApplied = job.applied || applied.has(job.id);
            return (
              <div key={job.id} className="border border-[var(--border)] rounded-2xl p-5 bg-[var(--surface)] hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeCfg.color}`}>{typeCfg.label}</span>
                      {job.isInternal && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Internal</span>}
                      {isApplied && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Applied</span>}
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Building2 size={12} />{job.department}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock size={12} />{job.experienceRange}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2">{job.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button onClick={() => toggleSave(job.id)}
                      className={`p-1.5 rounded-lg transition-all ${saved.has(job.id) ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-amber-400'}`}>
                      {saved.has(job.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    </button>
                    <div className="text-xs font-medium text-[var(--text-muted)]">
                      {job.candidatesCount != null ? `${job.candidatesCount} applicants` : 'Open'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => setSelected(job)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:border-indigo-500/30 hover:text-indigo-400 transition-all">
                    View Details <ChevronRight size={14} />
                  </button>
                  {!isApplied && (
                    <button onClick={() => handleApply(job)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
                      Apply <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
