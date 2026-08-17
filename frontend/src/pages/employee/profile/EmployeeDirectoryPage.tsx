import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Grid, List, Mail, Phone, MapPin, Building2,
  ChevronRight, Briefcase, ExternalLink, Loader2, UserCircle
} from 'lucide-react';
import { employeesApi } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';

type ViewMode = 'grid' | 'list';

export default function EmployeeDirectoryPage() {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employee-directory'],
    queryFn: () => employeesApi.list({ }),
  });

  const empList: any[] = Array.isArray(employees) ? employees : (employees as any)?.items ?? [];

  const departments = Array.from(new Set(empList.map(e => e.department?.name).filter(Boolean)));

  const filtered = empList.filter(e => {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchSearch = !searchTerm || fullName.includes(searchTerm.toLowerCase()) ||
      e.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.designation?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = deptFilter === 'all' || e.department?.name === deptFilter;
    return matchSearch && matchDept;
  });

  function getInitials(e: any) {
    return `${e.firstName?.[0] ?? ''}${e.lastName?.[0] ?? ''}`.toUpperCase();
  }

  function getAvatarColor(id: string) {
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
    ];
    const idx = parseInt(id?.slice(-2) || '0', 16) % colors.length;
    return colors[idx];
  }

  if (selectedEmp) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setSelectedEmp(null)}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6">
          ← Back to Directory
        </button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-indigo-600/20 to-purple-600/10" />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarColor(selectedEmp.id)} flex items-center justify-center text-2xl font-bold text-white shadow-lg border-4 border-[var(--surface)]`}>
                {getInitials(selectedEmp)}
              </div>
              <div className="pb-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedEmp.firstName} {selectedEmp.lastName}</h2>
                <p className="text-sm text-[var(--text-muted)]">{selectedEmp.designation?.title || 'Employee'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Building2, label: 'Department', value: selectedEmp.department?.name || '—' },
                { icon: Briefcase, label: 'Employee ID', value: selectedEmp.employeeId || '—' },
                { icon: Mail, label: 'Email', value: selectedEmp.email || '—' },
                { icon: Phone, label: 'Phone', value: selectedEmp.phone || '—' },
                { icon: MapPin, label: 'Location', value: selectedEmp.branch?.name || selectedEmp.location || '—' },
                { icon: UserCircle, label: 'Reports To', value: selectedEmp.reportingManager ? `${selectedEmp.reportingManager.firstName} ${selectedEmp.reportingManager.lastName}` : '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-alt)]">
                  <Icon size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">{label}</div>
                    <div className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Employee Directory"
        subtitle={`${filtered.length} of ${empList.length} employees`}
        icon={Users}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, or designation..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="flex gap-1 p-1 bg-[var(--surface-alt)] rounded-xl">
          {([['grid', Grid], ['list', List]] as const).map(([mode, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`p-1.5 rounded-lg transition-all ${viewMode === mode ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <Spinner /> : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-[var(--text-muted)]">
          <Users size={32} className="opacity-30" />
          <p className="text-sm">No employees found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(emp => (
            <button key={emp.id} onClick={() => setSelectedEmp(emp)}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group text-center">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(emp.id)} flex items-center justify-center text-lg font-bold text-white shadow-md group-hover:scale-105 transition-transform`}>
                {getInitials(emp)}
              </div>
              <div>
                <div className="font-semibold text-sm text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{emp.designation?.title || 'Employee'}</div>
                {emp.department?.name && (
                  <div className="text-xs text-indigo-400 mt-1">{emp.department.name}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => (
            <button key={emp.id} onClick={() => setSelectedEmp(emp)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-indigo-500/30 transition-all text-left group">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(emp.id)} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                {getInitials(emp)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{emp.designation?.title} · {emp.department?.name || 'No Department'}</div>
              </div>
              <div className="text-xs text-[var(--text-muted)] hidden sm:block">{emp.employeeId}</div>
              <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
