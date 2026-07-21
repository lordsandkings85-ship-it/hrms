import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Landmark, ShieldAlert, Award, Plus, Trash2 } from 'lucide-react';
import { organizationApi } from '../api/client';

export default function OrganizationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'departments' | 'branches' | 'designations'>('departments');

  // Input states
  const [deptName, setDeptName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [desigTitle, setDesigTitle] = useState('');
  const [desigGrade, setDesigGrade] = useState('');

  // Fetch lists
  const { data: departments, isLoading: isLoadingDepts } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => organizationApi.listDepartments(),
  });

  const { data: branches, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => organizationApi.listBranches(),
  });

  const { data: designations, isLoading: isLoadingDesigs } = useQuery({
    queryKey: ['designations-list'],
    queryFn: () => organizationApi.listDesignations(),
  });

  // Create mutations
  const createDeptMutation = useMutation({
    mutationFn: organizationApi.createDepartment,
    onSuccess: () => {
      alert('Department created!');
      setDeptName('');
      queryClient.invalidateQueries({ queryKey: ['departments-list'] });
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: organizationApi.deleteDepartment,
    onSuccess: () => {
      alert('Department deleted!');
      queryClient.invalidateQueries({ queryKey: ['departments-list'] });
    },
    onError: (err: any) => {
      alert(`Error deleting department: ${err.message}`);
    }
  });

  const createBranchMutation = useMutation({
    mutationFn: organizationApi.createBranch,
    onSuccess: () => {
      alert('Branch created!');
      setBranchName('');
      setBranchAddress('');
      queryClient.invalidateQueries({ queryKey: ['branches-list'] });
    },
  });

  const createDesigMutation = useMutation({
    mutationFn: organizationApi.createDesignation,
    onSuccess: () => {
      alert('Designation created!');
      setDesigTitle('');
      setDesigGrade('');
      queryClient.invalidateQueries({ queryKey: ['designations-list'] });
    },
  });

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    createDeptMutation.mutate(deptName);
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    createBranchMutation.mutate({ name: branchName, address: branchAddress || undefined });
  };

  const handleCreateDesig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigTitle.trim()) return;
    createDesigMutation.mutate({ title: desigTitle, grade: desigGrade || undefined });
  };

  return (
    <div className="page-container max-w-7xl space-y-6">
      <header className="mb-6 animate-slideUp" style={{ animationDelay: '0.1s' }}>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Organization Structure</h1>
        <p className="text-sm font-medium text-muted mt-1">Configure company divisions (departments), physical office locations (branches), and pay grades (designations).</p>
      </header>

      {/* Tabs selectors */}
      <div className="flex border-b border-line gap-8 text-sm animate-slideUp" style={{ animationDelay: '0.15s' }}>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 font-semibold transition-colors relative ${activeTab === 'departments' ? 'text-ledger' : 'text-muted hover:text-ink'}`}
        >
          Departments
          {activeTab === 'departments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ledger rounded-t-full animate-slideUp" />}
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`pb-3 font-semibold transition-colors relative ${activeTab === 'branches' ? 'text-ledger' : 'text-muted hover:text-ink'}`}
        >
          Branches / Offices
          {activeTab === 'branches' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ledger rounded-t-full animate-slideUp" />}
        </button>
        <button
          onClick={() => setActiveTab('designations')}
          className={`pb-3 font-semibold transition-colors relative ${activeTab === 'designations' ? 'text-ledger' : 'text-muted hover:text-ink'}`}
        >
          Designations
          {activeTab === 'designations' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ledger rounded-t-full animate-slideUp" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slideUp" style={{ animationDelay: '0.2s' }}>
        {/* Tab Creation Panel */}
        <div className="section-card p-6 h-fit">
          {activeTab === 'departments' && (
            <div className="animate-slideUp" style={{ animationDuration: '0.3s' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                <Building2 className="text-ledger" size={18} /> New Department
              </h2>
              <form onSubmit={handleCreateDept} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Department Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Research & Development"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                  />
                </div>
                <button type="submit" disabled={createDeptMutation.isPending} className="w-full btn-primary py-2.5 text-sm font-semibold">
                  {createDeptMutation.isPending ? 'Creating...' : 'Create Department'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'branches' && (
            <div className="animate-slideUp" style={{ animationDuration: '0.3s' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                <Landmark className="text-ledger" size={18} /> New Office Branch
              </h2>
              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore Headquarters"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Physical Address</label>
                  <textarea
                    placeholder="Street, city, postal code..."
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                  />
                </div>
                <button type="submit" disabled={createBranchMutation.isPending} className="w-full btn-primary py-2.5 text-sm font-semibold">
                  {createBranchMutation.isPending ? 'Creating...' : 'Create Branch'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'designations' && (
            <div className="animate-slideUp" style={{ animationDuration: '0.3s' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                <Award className="text-ledger" size={18} /> New Designation
              </h2>
              <form onSubmit={handleCreateDesig} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Designation Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Technical Architect"
                    value={desigTitle}
                    onChange={(e) => setDesigTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Grade / Band</label>
                  <input
                    type="text"
                    placeholder="e.g. L4, E6"
                    value={desigGrade}
                    onChange={(e) => setDesigGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                  />
                </div>
                <button type="submit" disabled={createDesigMutation.isPending} className="w-full btn-primary py-2.5 text-sm font-semibold">
                  {createDesigMutation.isPending ? 'Creating...' : 'Create Designation'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Tab Listing Panel */}
        <div className="lg:col-span-2 section-card overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line bg-paper/20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{activeTab} Registry</h3>
          </div>

          <div className="animate-slideUp" style={{ animationDuration: '0.3s' }}>
            {activeTab === 'departments' && (
              <div>
                {isLoadingDepts && <div className="p-6 text-sm text-muted flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ledger"></div>Loading departments...</div>}
                {(!departments || departments.length === 0) && !isLoadingDepts && (
                  <div className="p-6 text-sm text-muted">No departments registered. Create one on the left panel.</div>
                )}
                <div className="divide-y divide-line">
                  {departments?.map((dept: any) => (
                    <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-paper/40 transition-colors">
                      <span className="text-sm font-bold text-ink">{dept.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] uppercase font-mono text-muted bg-paper px-2 py-1 rounded">ID: {dept.id.slice(0, 8)}</span>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${dept.name}?`)) {
                              deleteDeptMutation.mutate(dept.id);
                            }
                          }}
                          disabled={deleteDeptMutation.isPending}
                          className="p-1.5 rounded text-rust hover:bg-rust hover:text-white transition-colors"
                          title="Delete Department"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'branches' && (
              <div>
                {isLoadingBranches && <div className="p-6 text-sm text-muted flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ledger"></div>Loading branches...</div>}
                {(!branches || branches.length === 0) && !isLoadingBranches && (
                  <div className="p-6 text-sm text-muted">No branches registered. Create one on the left panel.</div>
                )}
                <div className="divide-y divide-line">
                  {branches?.map((b: any) => (
                    <div key={b.id} className="p-4 hover:bg-paper/40 transition-colors">
                      <div className="text-sm font-bold text-ink">{b.name}</div>
                      {b.address && <p className="text-xs font-medium text-muted mt-1">{b.address}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'designations' && (
              <div>
                {isLoadingDesigs && <div className="p-6 text-sm text-muted flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ledger"></div>Loading designations...</div>}
                {(!designations || designations.length === 0) && !isLoadingDesigs && (
                  <div className="p-6 text-sm text-muted">No designations registered. Create one on the left panel.</div>
                )}
                <div className="divide-y divide-line">
                  {designations?.map((d: any) => (
                    <div key={d.id} className="p-4 flex items-center justify-between hover:bg-paper/40 transition-colors">
                      <div>
                        <div className="text-sm font-bold text-ink">{d.title}</div>
                        {d.grade && <span className="text-[10px] uppercase font-mono font-bold bg-ledger/10 text-ledger px-2 py-0.5 rounded mt-1.5 inline-block">Grade: {d.grade}</span>}
                      </div>
                      <span className="text-[10px] uppercase font-mono text-muted bg-paper px-2 py-1 rounded">ID: {d.id.slice(0, 8)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
