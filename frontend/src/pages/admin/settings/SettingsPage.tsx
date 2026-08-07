import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Shield, Plus, Building2, Check, Loader2 } from 'lucide-react';
import { settingsApi } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastProvider';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const ALL_MODULES = [
  'dashboard', 'employees', 'attendance', 'leave', 'payroll', 'recruitment',
  'performance', 'projects', 'timesheets', 'expenses', 'travel', 'assets',
  'documents', 'organization', 'shifts', 'announcements', 'training',
  'reports', 'settings', 'billing', 'integrations', 'super_admin',
];
const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

const profileSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  industry: z.string().optional(),
  companyType: z.string().optional(),
  financialYearStart: z.string().optional(),
  financialYearEnd: z.string().optional(),
  payrollEffectiveFrom: z.string().optional(),
});

const roleSchema = z.object({
  name: z.string().min(3, 'Role name must be at least 3 characters'),
  permissions: z.record(z.boolean())
});

type ProfileData = z.infer<typeof profileSchema>;
type RoleData = z.infer<typeof roleSchema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const { sub } = useParams<{ sub?: string }>();
  const rbacSubs = ['roles', 'role-assign'];
  const [activeTab, setActiveTab] = useState<'profile' | 'rbac'>(sub && rbacSubs.includes(sub) ? 'rbac' : 'profile');

  useEffect(() => {
    if (sub && rbacSubs.includes(sub)) {
      setActiveTab('rbac');
    }
  }, [sub]);

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
  });

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['settings-roles'],
    queryFn: () => settingsApi.listRoles(),
  });

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', logoUrl: '', timezone: 'Asia/Kolkata', currency: 'INR' }
  });

  const roleForm = useForm<RoleData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', permissions: {} }
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name || '',
        logoUrl: profile.logoUrl || '',
        timezone: profile.timezone || 'Asia/Kolkata',
        currency: profile.currency || 'INR',
        address: profile.address || '',
        phone: profile.phone || '',
        email: profile.email || '',
        website: profile.website || '',
        gstNumber: profile.gstNumber || '',
        panNumber: profile.panNumber || '',
        industry: profile.industry || '',
        companyType: profile.companyType || '',
        financialYearStart: profile.financialYearStart ? String(profile.financialYearStart) : '',
        financialYearEnd: profile.financialYearEnd ? String(profile.financialYearEnd) : '',
        payrollEffectiveFrom: profile.payrollEffectiveFrom ? String(profile.payrollEffectiveFrom) : '',
      });
    }
  }, [profile, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileData) => settingsApi.updateProfile({
      name: data.name,
      logoUrl: data.logoUrl || null,
      timezone: data.timezone,
      currency: data.currency,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      gstNumber: data.gstNumber || null,
      panNumber: data.panNumber || null,
      industry: data.industry || null,
      companyType: data.companyType || null,
      financialYearStart: data.financialYearStart ? parseInt(data.financialYearStart) : null,
      financialYearEnd: data.financialYearEnd ? parseInt(data.financialYearEnd) : null,
      payrollEffectiveFrom: data.payrollEffectiveFrom ? parseInt(data.payrollEffectiveFrom) : null,
    }),
    onSuccess: () => {
      toastSuccess('Company profile updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update profile')
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: any) => settingsApi.createRole(data),
    onSuccess: () => {
      toastSuccess('Role created successfully.');
      roleForm.reset();
      queryClient.invalidateQueries({ queryKey: ['settings-roles'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to create role')
  });

  const handleUpdateProfile = (data: ProfileData) => updateProfileMutation.mutate(data);

  const handleCreateRole = (data: RoleData) => {
    const perms = Object.entries(data.permissions)
      .filter(([_, isSelected]) => isSelected)
      .map(([key]) => {
        const [module, action] = key.split(':');
        return { module, action };
      });
    if (perms.length === 0) return toastError('Select at least one permission');
    createRoleMutation.mutate({ name: data.name, permissions: perms });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-sky-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shadow-inner">
             <Settings size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Configuration Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Manage company profile, region preferences, and RBAC security policies.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
          activeTab === 'profile' ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20' : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
        }`}>
          <Building2 size={16} /> Company Profile
        </button>
        <button onClick={() => setActiveTab('rbac')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
          activeTab === 'rbac' ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20' : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
        }`}>
          <Shield size={16} /> RBAC Security Matrix
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {activeTab === 'profile' ? (
          <>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                   <Settings className="text-sky-500" size={20} /> Master Data Settings
                </h3>
                {isLoadingProfile ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 className="animate-spin" size={16}/> Loading profile...</div>
                ) : (
                  <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-8">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Basic Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Company Registered Name <span className="text-rose-500">*</span></label>
                          <input {...profileForm.register('name')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="e.g. Acme Corp" />
                          {profileForm.formState.errors.name && <p className="text-xs text-rose-500">{profileForm.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Brand Logo URL</label>
                          <input {...profileForm.register('logoUrl')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="https://..." />
                          {profileForm.formState.errors.logoUrl && <p className="text-xs text-rose-500">{profileForm.formState.errors.logoUrl.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Company Email</label>
                          <input {...profileForm.register('email')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="info@company.com" />
                          {profileForm.formState.errors.email && <p className="text-xs text-rose-500">{profileForm.formState.errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Company Phone</label>
                          <input {...profileForm.register('phone')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="+91-XXXXXXXXXX" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Registered Address</label>
                          <textarea {...profileForm.register('address')} rows={2} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="Enter full registered address" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Website</label>
                          <input {...profileForm.register('website')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="https://company.com" />
                          {profileForm.formState.errors.website && <p className="text-xs text-rose-500">{profileForm.formState.errors.website.message}</p>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Tax & Registration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">GST Number</label>
                          <input {...profileForm.register('gstNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="e.g. 27AABCCDDEEFFG" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">PAN Number</label>
                          <input {...profileForm.register('panNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="e.g. AABCD1234E" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Industry</label>
                          <input {...profileForm.register('industry')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="e.g. IT Services" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Company Type</label>
                          <select {...profileForm.register('companyType')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500">
                            <option value="">-- SELECT --</option>
                            <option value="Private Limited">Private Limited</option>
                            <option value="Public Limited">Public Limited</option>
                            <option value="Partnership">Partnership</option>
                            <option value="LLP">LLP</option>
                            <option value="Proprietary">Proprietary</option>
                            <option value="Trust">Trust</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Financial Year</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">FY Start Month</label>
                          <select {...profileForm.register('financialYearStart')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500">
                            <option value="">-- SELECT --</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                              <option key={m} value={m}>{new Date(2024, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">FY End Month</label>
                          <select {...profileForm.register('financialYearEnd')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500">
                            <option value="">-- SELECT --</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                              <option key={m} value={m}>{new Date(2024, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Payroll Effective From Year</label>
                          <input {...profileForm.register('payrollEffectiveFrom')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="e.g. 2024" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">System Preferences</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Operating Timezone <span className="text-rose-500">*</span></label>
                          <select {...profileForm.register('timezone')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500">
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="UTC">UTC / Coordinated Time</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                            <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Default Currency <span className="text-rose-500">*</span></label>
                          <select {...profileForm.register('currency')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500">
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="AED">AED (د.إ)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)]">
                      <button type="submit" disabled={updateProfileMutation.isPending} className="py-2.5 px-6 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 transition-colors flex justify-center items-center gap-2">
                        {updateProfileMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save All Changes
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

             <div className="lg:col-span-1 space-y-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[340px]">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-center mb-4 text-sky-500 font-bold text-2xl shadow-sm overflow-hidden">
                    {profile?.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" /> : (profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'CO')}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{profile?.name || 'Your Company'}</h3>
                  <p className="text-xs text-[var(--text-muted)] font-mono mt-1">Tenant ID: {profile?.id}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{profile?.email || profile?.phone || ''}</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Company Snapshot</h4>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-bold uppercase text-xs">Industry</span>
                      <span className="text-[var(--text-primary)]">{profile?.industry || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-bold uppercase text-xs">Type</span>
                      <span className="text-[var(--text-primary)]">{profile?.companyType || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-bold uppercase text-xs">GST</span>
                      <span className="text-[var(--text-primary)] font-mono">{profile?.gstNumber || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-bold uppercase text-xs">PAN</span>
                      <span className="text-[var(--text-primary)] font-mono">{profile?.panNumber || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-bold uppercase text-xs">Region</span>
                      <span className="text-[var(--text-primary)]">{profile?.timezone || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-bold uppercase text-xs">Currency</span>
                      <span className="font-mono font-bold text-[var(--text-primary)] bg-[var(--surface-alt)] px-2 py-0.5 rounded border border-[var(--border)]">{profile?.currency || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-bold uppercase text-xs">FY</span>
                      <span className="text-[var(--text-primary)]">
                        {profile?.financialYearStart && profile?.financialYearEnd
                          ? `${new Date(2024, profile.financialYearStart - 1, 1).toLocaleString('default', { month: 'short' })} – ${new Date(2024, profile.financialYearEnd - 1, 1).toLocaleString('default', { month: 'short' })}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-bold uppercase text-xs">Since</span>
                      <span className="text-[var(--text-primary)]">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                </div>
             </div>
          </>
        ) : (
          <>
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                 <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                   <Shield className="text-sky-500" size={20} /> Create Security Role
                 </h3>
                 <form onSubmit={roleForm.handleSubmit(handleCreateRole)} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Role Title <span className="text-rose-500">*</span></label>
                      <input {...roleForm.register('name')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-sky-500" placeholder="e.g. Regional HR Manager" />
                      {roleForm.formState.errors.name && <p className="text-xs text-rose-500">{roleForm.formState.errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Access Matrix</label>
                      <div className="h-[400px] overflow-y-auto bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl custom-scrollbar divide-y divide-[var(--border)]">
                        {ALL_MODULES.map((mod) => (
                          <div key={mod} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--surface)] transition-colors">
                            <span className="font-bold capitalize text-[var(--text-primary)] text-sm w-32 shrink-0">{mod.replace('_', ' ')}</span>
                            <div className="flex flex-wrap gap-4 flex-1">
                              {ALL_ACTIONS.map((act) => {
                                const key = `${mod}:${act}`;
                                return (
                                  <label key={act} className="flex items-center gap-2 cursor-pointer group">
                                    <Controller
                                      name={`permissions.${key}`}
                                      control={roleForm.control}
                                      render={({ field }) => (
                                        <input
                                          type="checkbox"
                                          checked={!!field.value}
                                          onChange={field.onChange}
                                          className="w-4 h-4 rounded text-sky-500 border-[var(--border)] focus:ring-sky-500 bg-[var(--surface)]"
                                        />
                                      )}
                                    />
                                    <span className="capitalize text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">{act}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-[var(--border)]">
                      <button type="submit" disabled={createRoleMutation.isPending} className="py-2.5 px-6 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 transition-colors flex justify-center items-center gap-2">
                        {createRoleMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Deploy Security Role
                      </button>
                    </div>
                 </form>
               </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-alt)] flex items-center gap-2">
                  <Shield size={16} className="text-[var(--text-muted)]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Active Roles</h3>
                </div>
                {isLoadingRoles && <div className="p-6 text-xs text-[var(--text-muted)] flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Scanning roles...</div>}
                <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto custom-scrollbar">
                  {roles?.map((r: any) => (
                    <div key={r.id} className="p-4 hover:bg-[var(--surface-hover)] transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="text-sm font-bold text-[var(--text-primary)] leading-tight">{r.name}</div>
                        {r.isSystem && <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded border border-sky-500/20 whitespace-nowrap">System</span>}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] font-medium mt-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                        {r.permissions?.length || 0} active policies
                      </div>
                    </div>
                  ))}
                  {roles?.length === 0 && <div className="p-4 text-xs text-[var(--text-muted)]">No active roles.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
