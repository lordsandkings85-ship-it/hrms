import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Shield, PlusCircle, CheckCircle2 } from 'lucide-react';
import { settingsApi } from '../api/client';

const ALL_MODULES = [
  'dashboard', 'employees', 'attendance', 'leave', 'payroll', 'recruitment',
  'performance', 'projects', 'timesheets', 'expenses', 'travel', 'assets',
  'documents', 'organization', 'shifts', 'announcements', 'training',
  'reports', 'settings', 'billing', 'integrations', 'super_admin',
];

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

export default function SettingsPage() {
  const queryClient = useQueryClient();
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
      alert('Company profile settings saved!');
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
    },
  });

  // Create Role Mutation
  const createRoleMutation = useMutation({
    mutationFn: settingsApi.createRole,
    onSuccess: () => {
      alert('Custom RBAC Role created!');
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
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted mt-1">Configure company profiles, metadata, regional policies, and custom Role-based security permissions.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-line mb-8 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-2.5 font-medium transition-colors border-b-2 ${activeTab === 'profile' ? 'border-ledger text-ledger font-semibold' : 'text-muted hover:text-ink border-transparent'}`}
        >
          Company Profile
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-2.5 font-medium transition-colors border-b-2 ${activeTab === 'rbac' ? 'border-ledger text-ledger font-semibold' : 'text-muted hover:text-ink border-transparent'}`}
        >
          RBAC Security Roles
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {activeTab === 'profile' ? (
          <>
            {/* Left Profile details Form */}
            <div className="bg-white border border-line rounded-lg p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings className="text-ledger" size={18} /> Company Meta Settings
              </h2>
              {profile && (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted mb-1">Company Name</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Logo URL</label>
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted mb-1">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="UTC">UTC / Coordinated Time</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Currency Code</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm font-mono"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={updateProfileMutation.isPending} className="bg-ledger text-paper rounded-md px-6 py-2.5 text-sm font-semibold hover:bg-ledgerDark">
                    Save Config Settings
                  </button>
                </form>
              )}
            </div>
            {/* Visual company profile detail card */}
            <div className="bg-white border border-line rounded-lg p-5 h-fit text-center">
              <div className="w-20 h-20 bg-paper/60 rounded-full mx-auto flex items-center justify-center border border-line text-ledger mb-4 text-2xl font-bold">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'CO'}
              </div>
              <h3 className="text-base font-semibold text-ink">{profile?.name}</h3>
              <p className="text-xs text-muted mt-1">Tenant ID: <span className="font-mono">{profile?.id}</span></p>
              <div className="border-t border-line mt-4 pt-4 text-left text-xs space-y-2 text-muted">
                <div>Timezone: <span className="text-ink font-semibold">{profile?.timezone}</span></div>
                <div>Currency: <span className="text-ink font-semibold">{profile?.currency}</span></div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* RBAC custom role creation form */}
            <div className="bg-white border border-line rounded-lg p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <PlusCircle className="text-ledger" size={18} /> New Security Role
              </h2>
              <form onSubmit={handleCreateRole} className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Role Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Attendance Manager, Shift Specialist"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md border border-line bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-3 font-semibold">Customize Module Permissions Matrix</label>
                  <div className="max-h-80 overflow-y-auto border border-line rounded divide-y divide-line bg-paper/10 text-xs">
                    {ALL_MODULES.map((mod) => (
                      <div key={mod} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <span className="font-semibold capitalize text-ink w-32 shrink-0">{mod.replace('_', ' ')}</span>
                        <div className="flex flex-wrap gap-4">
                          {ALL_ACTIONS.map((act) => {
                            const key = `${mod}:${act}`;
                            return (
                              <label key={act} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!selectedPermissions[key]}
                                  onChange={() => handlePermissionToggle(mod, act)}
                                  className="rounded border-line text-ledger focus:ring-ledger w-3.5 h-3.5"
                                />
                                <span className="capitalize text-muted text-[11px]">{act}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={createRoleMutation.isPending} className="bg-ledger text-paper rounded-md px-6 py-2.5 text-sm font-semibold hover:bg-ledgerDark">
                  Save Custom Security Role
                </button>
              </form>
            </div>

            {/* Existing custom roles */}
            <div className="bg-white border border-line rounded-lg overflow-hidden h-fit">
              <div className="px-5 py-3 border-b border-line bg-paper/20 flex items-center gap-2">
                <Shield size={16} /> Security Roles
              </div>
              {isLoadingRoles && <div className="p-4 text-xs text-muted">Loading roles...</div>}
              <div className="divide-y divide-line">
                {roles?.map((r: any) => (
                  <div key={r.id} className="p-4 hover:bg-paper/40">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm font-medium text-ink">{r.name}</div>
                      {r.isSystem && <span className="text-[9px] bg-ledger/10 text-ledger px-1.5 py-0.5 rounded font-bold">System Default</span>}
                    </div>
                    <div className="text-xs text-muted mt-1">{r.permissions?.length || 0} permissions rules mapped.</div>
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
