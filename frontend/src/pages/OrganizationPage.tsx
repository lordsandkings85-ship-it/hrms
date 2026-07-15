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
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Organization Structure</h1>
        <p className="text-sm text-muted mt-1">Configure company divisions (departments), physical office locations (branches), and pay grades (designations).</p>
      </header>

      {/* Tabs selectors */}
      <div className="flex border-b border-line mb-8 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-2.5 font-medium transition-colors border-b-2 ${activeTab === 'departments' ? 'border-ledger text-ledger font-semibold' : 'text-muted hover:text-ink border-transparent'}`}
        >
          Departments
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          className={`pb-2.5 font-medium transition-colors border-b-2 ${activeTab === 'branches' ? 'border-ledger text-ledger font-semibold' : 'text-muted hover:text-ink border-transparent'}`}
        >
          Branches / Offices
        </button>
        <button
          onClick={() => setActiveTab('designations')}
          className={`pb-2.5 font-medium transition-colors border-b-2 ${activeTab === 'designations' ? 'border-ledger text-ledger font-semibold' : 'text-muted hover:text-ink border-transparent'}`}
        >
          Designations
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tab Creation Panel */}
        <div className="bg-white border border-line rounded-lg p-6 h-fit">
          {activeTab === 'departments' && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="text-ledger" size={18} /> New Department
              </h2>
              <form onSubmit={handleCreateDept} className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Department Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Research &amp; Development"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                  />
                </div>
                <button type="submit" className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-semibold hover:bg-ledgerDark">
                  Create Department
                </button>
              </form>
            </div>
          )}

          {activeTab === 'branches' && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Landmark className="text-ledger" size={18} /> New Office Branch
              </h2>
              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore Headquarters"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Physical Address</label>
                  <textarea
                    placeholder="Street, city, postal code..."
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                  />
                </div>
                <button type="submit" className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-semibold hover:bg-ledgerDark">
                  Create Branch
                </button>
              </form>
            </div>
          )}

          {activeTab === 'designations' && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award className="text-ledger" size={18} /> New Designation
              </h2>
              <form onSubmit={handleCreateDesig} className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Designation Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Technical Architect"
                    value={desigTitle}
                    onChange={(e) => setDesigTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Grade / Band</label>
                  <input
                    type="text"
                    placeholder="e.g. L4, E6"
                    value={desigGrade}
                    onChange={(e) => setDesigGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                  />
                </div>
                <button type="submit" className="w-full bg-ledger text-paper rounded-md py-2.5 text-sm font-semibold hover:bg-ledgerDark">
                  Create Designation
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Tab Listing Panel */}
        <div className="lg:col-span-2 bg-white border border-line rounded-lg overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-line bg-paper/20">
            <h3 className="text-sm font-semibold capitalize">{activeTab} Registry</h3>
          </div>

          {activeTab === 'departments' && (
            <div>
              {isLoadingDepts && <div className="p-6 text-sm text-muted">Loading departments...</div>}
              {(!departments || departments.length === 0) && !isLoadingDepts && (
                <div className="p-6 text-sm text-muted">No departments registered. Create one on the left panel.</div>
              )}
              <div className="divide-y divide-line">
                {departments?.map((dept: any) => (
                  <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                    <span className="text-sm font-medium text-ink">{dept.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">ID: {dept.id.slice(0, 8)}...</span>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${dept.name}?`)) {
                            deleteDeptMutation.mutate(dept.id);
                          }
                        }}
                        disabled={deleteDeptMutation.isPending}
                        className="p-1.5 rounded-md border border-line text-rust hover:bg-rust/5 transition-colors"
                        title="Delete Department"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'branches' && (
            <div>
              {isLoadingBranches && <div className="p-6 text-sm text-muted">Loading branches...</div>}
              {(!branches || branches.length === 0) && !isLoadingBranches && (
                <div className="p-6 text-sm text-muted">No branches registered. Create one on the left panel.</div>
              )}
              <div className="divide-y divide-line">
                {branches?.map((b: any) => (
                  <div key={b.id} className="p-4 hover:bg-paper/40">
                    <div className="text-sm font-medium text-ink">{b.name}</div>
                    {b.address && <p className="text-xs text-muted mt-1">{b.address}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'designations' && (
            <div>
              {isLoadingDesigs && <div className="p-6 text-sm text-muted">Loading designations...</div>}
              {(!designations || designations.length === 0) && !isLoadingDesigs && (
                <div className="p-6 text-sm text-muted">No designations registered. Create one on the left panel.</div>
              )}
              <div className="divide-y divide-line">
                {designations?.map((d: any) => (
                  <div key={d.id} className="p-4 flex items-center justify-between hover:bg-paper/40">
                    <div>
                      <div className="text-sm font-medium text-ink">{d.title}</div>
                      {d.grade && <span className="text-[10px] uppercase font-mono font-bold bg-paper px-1.5 py-0.5 rounded border border-line text-muted mt-1 inline-block">Grade: {d.grade}</span>}
                    </div>
                    <span className="text-xs text-muted">ID: {d.id.slice(0, 8)}...</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
