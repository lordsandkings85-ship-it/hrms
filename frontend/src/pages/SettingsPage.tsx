import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Shield, PlusCircle, CheckCircle2 } from 'lucide-react';
import { settingsApi } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/ToastProvider';

const ALL_MODULES = [
  'dashboard', 'employees', 'attendance', 'leave', 'payroll', 'recruitment',
  'performance', 'projects', 'timesheets', 'expenses', 'travel', 'assets',
  'documents', 'organization', 'shifts', 'announcements', 'training',
  'reports', 'settings', 'billing', 'integrations', 'super_admin',
];

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'rbac'>('profile');

  // Profile forms
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');

  // RBAC Form
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({}); // key is "module:action"

  // Fetch Company Profile
  const { data: profile } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
  });

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.name || '');
      setLogoUrl(profile.logoUrl || '');
      setTimezone(profile.timezone || 'Asia/Kolkata');
      setCurrency(profile.currency || 'INR');
    }
  }, [profile]);

  // Fetch Roles
  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['settings-roles'],
    queryFn: () => settingsApi.listRoles(),
  });

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: () => {
      success('Settings saved!', 'Company profile updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
    },
  });

  // Create Role Mutation
  const createRoleMutation = useMutation({
    mutationFn: settingsApi.createRole,
    onSuccess: () => {
      success('Role created!', 'Custom RBAC role added successfully.');
      setRoleName('');
      setSelectedPermissions({});
      queryClient.invalidateQueries({ queryKey: ['settings-roles'] });
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: companyName,
      logoUrl: logoUrl || null,
      timezone,
      currency,
    });
  };

  const handlePermissionToggle = (module: string, action: string) => {
    const key = `${module}:${action}`;
    setSelectedPermissions({
      ...selectedPermissions,
      [key]: !selectedPermissions[key],
    });
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return alert('Enter a role name');

    // Filter permissions
    const permissions = Object.entries(selectedPermissions)
      .filter(([_, isSelected]) => isSelected)
      .map(([key]) => {
        const [module, action] = key.split(':');
        return { module, action };
      });

    createRoleMutation.mutate({
      name: roleName,
      permissions,
    });
  };

  return (
    <div className="page-container max-w-7xl space-y-6">
      <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
        <PageHeader
          title="Settings"
          subtitle="Company profile, regional policies, and role-based security permissions."
          icon={Settings}
        />
      </div>

      {/* Tabs */}
      <div className="tab-container animate-slideUp" style={{ animationDelay: '0.15s' }}>
        <button onClick={() => setActiveTab('profile')} className={`tab-pill flex items-center gap-2 ${activeTab === 'profile' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>
          <Settings size={15} /> Company Profile
        </button>
        <button onClick={() => setActiveTab('rbac')} className={`tab-pill flex items-center gap-2 ${activeTab === 'rbac' ? 'tab-pill-active' : 'tab-pill-inactive'}`}>
          <Shield size={15} /> RBAC Security Roles
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slideUp" style={{ animationDelay: '0.2s' }}>
        {activeTab === 'profile' ? (
          <>
            {/* Left Profile details Form */}
            <div className="section-card p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                <Settings className="text-ledger" size={18} /> Company Meta Settings
              </h2>
              {profile && (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Company Name</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Logo URL</label>
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="UTC">UTC / Coordinated Time</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Currency Code</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm font-mono focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={updateProfileMutation.isPending} className="btn-primary py-2.5 px-6 text-sm font-semibold">
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Config Settings'}
                    </button>
                  </div>
                </form>
              )}
            </div>
            {/* Visual company profile detail card */}
            <div className="section-card p-6 h-fit text-center">
              <div className="w-20 h-20 bg-paper/60 rounded-2xl mx-auto flex items-center justify-center border border-line text-ledger mb-4 text-2xl font-bold shadow-sm">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'CO'}
              </div>
              <h3 className="text-base font-bold text-ink">{profile?.name}</h3>
              <p className="text-xs text-muted mt-1">Tenant ID: <span className="font-mono bg-paper/50 px-1 py-0.5 rounded">{profile?.id}</span></p>
              <div className="border-t border-line mt-5 pt-5 text-left text-xs space-y-3 text-muted">
                <div className="flex justify-between items-center">
                  <span className="font-semibold uppercase tracking-wider">Timezone</span> 
                  <span className="text-ink font-bold">{profile?.timezone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold uppercase tracking-wider">Currency</span> 
                  <span className="text-ink font-bold font-mono bg-paper/50 px-2 py-0.5 rounded">{profile?.currency}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* RBAC custom role creation form */}
            <div className="section-card p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 flex items-center gap-2 text-muted">
                <PlusCircle className="text-ledger" size={18} /> New Security Role
              </h2>
              <form onSubmit={handleCreateRole} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Role Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Attendance Manager, Shift Specialist"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded border border-line bg-paper/50 text-sm focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-3">Customize Module Permissions Matrix</label>
                  <div className="max-h-[22rem] overflow-y-auto border border-line rounded bg-paper/20 text-xs custom-scrollbar">
                    {ALL_MODULES.map((mod) => (
                      <div key={mod} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line last:border-b-0 hover:bg-paper/40 transition-colors">
                        <span className="font-bold capitalize text-ink w-32 shrink-0">{mod.replace('_', ' ')}</span>
                        <div className="flex flex-wrap gap-5">
                          {ALL_ACTIONS.map((act) => {
                            const key = `${mod}:${act}`;
                            return (
                              <label key={act} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={!!selectedPermissions[key]}
                                  onChange={() => handlePermissionToggle(mod, act)}
                                  className="rounded border-line text-ledger focus:ring-ledger w-4 h-4 transition-colors"
                                />
                                <span className="capitalize text-muted text-xs font-medium group-hover:text-ink transition-colors">{act}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={createRoleMutation.isPending} className="btn-primary py-2.5 px-6 text-sm font-semibold">
                    {createRoleMutation.isPending ? 'Creating...' : 'Save Custom Security Role'}
                  </button>
                </div>
              </form>
            </div>

            {/* Existing custom roles */}
            <div className="section-card overflow-hidden h-fit">
              <div className="px-6 py-4 border-b border-line bg-paper/20 flex items-center gap-2 font-semibold uppercase tracking-wider text-sm text-muted">
                <Shield size={16} className="text-ledger" /> Security Roles
              </div>
              {isLoadingRoles && <div className="p-6 text-sm text-muted flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ledger"></div>Loading roles...</div>}
              <div className="divide-y divide-line">
                {roles?.map((r: any) => (
                  <div key={r.id} className="p-4 hover:bg-paper/40 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm font-bold text-ink">{r.name}</div>
                      {r.isSystem && <span className="text-[10px] uppercase font-mono font-bold bg-ledger text-white px-2 py-0.5 rounded shadow-sm">System Default</span>}
                    </div>
                    <div className="text-xs font-medium text-muted mt-2">{r.permissions?.length || 0} permissions rules mapped.</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
