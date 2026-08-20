import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Landmark, ShieldAlert, Award, Plus, Trash2, MapPin, Users, Layers, Loader2, Search, Download, Check, Settings, Pencil, X } from 'lucide-react';
import { organizationApi, settingsApi, orgMastersApi } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';

const DEFAULT_DESIGNATIONS = [
  'Accounts Manager', 'Operations Associate', 'IT Associate', 'Accounts Associate',
  'Head of Finance', 'Fullstack Developer', 'Head of HR', 'Operations Manager',
  'Web Developer', 'Business Analyst', 'Consultant', 'Associate Accountant',
  'Executive Assistant', 'Accounts Executive', 'Digital Marketing',
];

const DEFAULT_DEPARTMENTS = [
  'Finance & Accounts', 'Operations', 'IT & Engineering', 'Human Resources',
  'Business & Strategy', 'Administration',
];

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

type TabKey = 'profile' | 'branches' | 'categories' | 'departments' | 'designations' | 'grades';

const SUB_TO_TAB: Record<string, TabKey> = {
  profile: 'profile',
  branches: 'branches',
  categories: 'categories',
  departments: 'departments',
  designations: 'designations',
  grades: 'grades',
};

const TAB_TO_SUB: Record<TabKey, string> = {
  profile: 'profile',
  branches: 'branches',
  categories: 'categories',
  departments: 'departments',
  designations: 'designations',
  grades: 'grades',
};

const deptSchema = z.object({ name: z.string().min(2, 'Name is required') });
const branchSchema = z.object({ name: z.string().min(2, 'Name is required'), address: z.string().optional() });
const desigSchema = z.object({ title: z.string().min(2, 'Title is required'), grade: z.string().optional() });

export default function OrganizationPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const subAction = pathParts.length > 2 ? pathParts[2] : 'profile';
  const { success: toastSuccess, error: toastError } = useToast();

  const initialTab = SUB_TO_TAB[subAction] || 'branches';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (subAction && SUB_TO_TAB[subAction]) {
      setTab(SUB_TO_TAB[subAction]);
    }
  }, [subAction]);

  const handleTabChange = (t: TabKey) => {
    setTab(t);
    navigate(`/organization/${TAB_TO_SUB[t]}`);
  };

  const TABS = [
    { key: 'profile', label: 'Company Profile', icon: <Building2 size={16} /> },
    { key: 'branches', label: 'Branch / Location', icon: <MapPin size={16} /> },
    { key: 'categories', label: 'Employee Category', icon: <Users size={16} /> },
    { key: 'departments', label: 'Department', icon: <Building2 size={16} /> },
    { key: 'designations', label: 'Designations', icon: <Award size={16} /> },
    { key: 'grades', label: 'Grade (Pay Cadre)', icon: <Layers size={16} /> },
  ] as const;

  // Forms
  const deptForm = useForm({ resolver: zodResolver(deptSchema), defaultValues: { name: '' } });
  const branchForm = useForm({ resolver: zodResolver(branchSchema), defaultValues: { name: '', address: '' } });
  const desigForm = useForm({ resolver: zodResolver(desigSchema), defaultValues: { title: '', grade: '' } });

  // Queries
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

  const { data: allMasters, isLoading: isLoadingMasters } = useQuery({
    queryKey: ['org-masters'],
    queryFn: () => orgMastersApi.list('masters'),
  });

  const categories = (allMasters ?? []).filter((m: any) => m.master === 'category');
  const grades = (allMasters ?? []).filter((m: any) => m.master === 'grade');

  const createMasterMutation = useMutation({
    mutationFn: ({ master, value }: { master: string; value: string }) => orgMastersApi.create('masters', { master, value }),
    onSuccess: () => {
      toastSuccess('Entry created');
      queryClient.invalidateQueries({ queryKey: ['org-masters'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to create')
  });

  const deleteMasterMutation = useMutation({
    mutationFn: (id: string) => orgMastersApi.remove('masters', id),
    onSuccess: () => {
      toastSuccess('Entry deleted');
      queryClient.invalidateQueries({ queryKey: ['org-masters'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to delete')
  });

  const masterForm = useForm({ defaultValues: { value: '' } });

  // Mutations
  const createDeptMutation = useMutation({
    mutationFn: (data: z.infer<typeof deptSchema>) => organizationApi.createDepartment(data.name),
    onSuccess: () => {
      toastSuccess('Department created');
      deptForm.reset();
      queryClient.invalidateQueries({ queryKey: ['departments-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to create')
  });

  const createBranchMutation = useMutation({
    mutationFn: (data: z.infer<typeof branchSchema>) => organizationApi.createBranch(data),
    onSuccess: () => {
      toastSuccess('Branch created');
      branchForm.reset();
      queryClient.invalidateQueries({ queryKey: ['branches-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to create')
  });

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editBranchForm, setEditBranchForm] = useState({ name: '', address: '' });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; address?: string } }) => organizationApi.updateBranch(id, data),
    onSuccess: () => {
      toastSuccess('Branch updated');
      setEditingBranchId(null);
      queryClient.invalidateQueries({ queryKey: ['branches-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update')
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: string) => organizationApi.deleteBranch(id),
    onSuccess: () => {
      toastSuccess('Branch deleted');
      queryClient.invalidateQueries({ queryKey: ['branches-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to delete')
  });

  const createDesigMutation = useMutation({
    mutationFn: (data: z.infer<typeof desigSchema>) => organizationApi.createDesignation(data),
    onSuccess: () => {
      toastSuccess('Designation created');
      desigForm.reset();
      queryClient.invalidateQueries({ queryKey: ['designations-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to create')
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => organizationApi.deleteDepartment(id),
    onSuccess: () => {
      toastSuccess('Department deleted');
      queryClient.invalidateQueries({ queryKey: ['departments-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to delete')
  });

  // Company Profile
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '', logoUrl: '', timezone: 'Asia/Kolkata', currency: 'INR',
      address: '', phone: '', email: '', website: '',
      gstNumber: '', panNumber: '', industry: '', companyType: '',
      financialYearStart: '', financialYearEnd: '', payrollEffectiveFrom: '',
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
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
    mutationFn: (data: z.infer<typeof profileSchema>) => settingsApi.updateProfile({
      name: data.name, logoUrl: data.logoUrl || null, timezone: data.timezone, currency: data.currency,
      address: data.address || null, phone: data.phone || null, email: data.email || null, website: data.website || null,
      gstNumber: data.gstNumber || null, panNumber: data.panNumber || null, industry: data.industry || null,
      companyType: data.companyType || null,
      financialYearStart: data.financialYearStart ? parseInt(data.financialYearStart) : null,
      financialYearEnd: data.financialYearEnd ? parseInt(data.financialYearEnd) : null,
      payrollEffectiveFrom: data.payrollEffectiveFrom ? parseInt(data.payrollEffectiveFrom) : null,
    }),
    onSuccess: () => {
      toastSuccess('Company profile updated');
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update profile')
  });

  const [seeding, setSeeding] = useState(false);

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const existingDepts = departments || [];
      const existingDesigs = designations || [];
      const created: string[] = [];

      for (const dept of DEFAULT_DEPARTMENTS) {
        if (!existingDepts.some(d => d.name.toLowerCase() === dept.toLowerCase())) {
          await organizationApi.createDepartment(dept);
          created.push(`Dept: ${dept}`);
        }
      }
      for (const desig of DEFAULT_DESIGNATIONS) {
        if (!existingDesigs.some(d => d.title.toLowerCase() === desig.toLowerCase())) {
          await organizationApi.createDesignation({ title: desig });
          created.push(`Desig: ${desig}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['departments-list'] });
      queryClient.invalidateQueries({ queryKey: ['designations-list'] });
      if (created.length > 0) {
        toastSuccess(`${created.length} items seeded`);
      } else {
        toastSuccess('All defaults already exist');
      }
    } catch (e: any) {
      toastError(e.message || 'Failed to seed defaults');
    } finally {
      setSeeding(false);
    }
  };

  const deptColumns: Column<any>[] = [
    { key: 'name', header: 'Department Name', render: (row) => <span className="font-bold text-[var(--text-primary)]">{row.name}</span> },
    { key: 'code', header: 'Code', render: (row) => <span className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-wider">{row.id.substring(0,8)}</span> },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (row) => (
        <button onClick={() => deleteDeptMutation.mutate(row.id)} className="text-rose-500 hover:text-rose-600 transition-colors p-1.5 hover:bg-rose-500/10 rounded">
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  const branchColumns: Column<any>[] = [
    { key: 'name', header: 'Branch Name', render: (row) => <span className="font-bold text-[var(--text-primary)]">{row.name}</span> },
    { key: 'address', header: 'Address', render: (row) => <span className="text-[var(--text-muted)] text-xs">{row.address || '—'}</span> },
    {
      key: 'actions', header: '', render: (row) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => { setEditingBranchId(row.id); setEditBranchForm({ name: row.name, address: row.address || '' }); }} className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10"><Pencil size={14} /></button>
          <button onClick={() => { if (confirm(`Delete branch "${row.name}"?`)) deleteBranchMutation.mutate(row.id); }} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const desigColumns: Column<any>[] = [
    { key: 'title', header: 'Designation Title', render: (row) => <span className="font-bold text-[var(--text-primary)]">{row.title}</span> },
    { key: 'grade', header: 'Grade/Band', render: (row) => <span className="text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] border border-indigo-500/20">{row.grade || '—'}</span> },
  ];

  const masterColumns: Column<any>[] = [
    { key: 'value', header: 'Name', render: (row) => <span className="font-bold text-[var(--text-primary)]">{row.value}</span> },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (row) => (
        <button onClick={() => deleteMasterMutation.mutate(row.id)} className="text-rose-500 hover:text-rose-600 transition-colors p-1.5 hover:bg-rose-500/10 rounded">
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-32 bg-purple-500/10 rounded-bl-full -z-0 blur-2xl"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shadow-inner">
             <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Company Setup Command Center</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Configure branches, departments, and designations.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              tab === t.key
                ? 'bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-500/20'
                : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        {tab !== 'profile' && (
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            title="Seed default departments and designations"
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Seed Defaults
          </button>
        )}
      </div>

      {tab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <Settings className="text-purple-500" size={20} /> Company Details
              </h3>
              <form onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))} className="space-y-8">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Company Registered Name <span className="text-rose-500">*</span></label>
                      <input {...profileForm.register('name')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Acme Corp" />
                      {profileForm.formState.errors.name && <p className="text-xs text-rose-500">{profileForm.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Brand Logo URL</label>
                      <input {...profileForm.register('logoUrl')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="https://..." />
                      {profileForm.formState.errors.logoUrl && <p className="text-xs text-rose-500">{profileForm.formState.errors.logoUrl.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Company Email</label>
                      <input {...profileForm.register('email')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="info@company.com" />
                      {profileForm.formState.errors.email && <p className="text-xs text-rose-500">{profileForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Company Phone</label>
                      <input {...profileForm.register('phone')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="+91-XXXXXXXXXX" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Registered Address</label>
                      <textarea {...profileForm.register('address')} rows={2} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="Enter full registered address" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Website</label>
                      <input {...profileForm.register('website')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="https://company.com" />
                      {profileForm.formState.errors.website && <p className="text-xs text-rose-500">{profileForm.formState.errors.website.message}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Tax & Registration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">GST Number</label>
                      <input {...profileForm.register('gstNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 27AABCCDDEEFFG" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">PAN Number</label>
                      <input {...profileForm.register('panNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. AABCD1234E" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Industry</label>
                      <input {...profileForm.register('industry')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. IT Services" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Company Type</label>
                      <select {...profileForm.register('companyType')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
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
                      <select {...profileForm.register('financialYearStart')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
                        <option value="">-- SELECT --</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{new Date(2024, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">FY End Month</label>
                      <select {...profileForm.register('financialYearEnd')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
                        <option value="">-- SELECT --</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{new Date(2024, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Payroll Effective From Year</label>
                      <input {...profileForm.register('payrollEffectiveFrom')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 2024" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">System Preferences</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Operating Timezone <span className="text-rose-500">*</span></label>
                      <select {...profileForm.register('timezone')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
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
                      <select {...profileForm.register('currency')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
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
                  <button type="submit" disabled={updateProfileMutation.isPending} className="py-2.5 px-6 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors flex justify-center items-center gap-2">
                    {updateProfileMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save All Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[340px]">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-center mb-4 text-purple-500 font-bold text-2xl shadow-sm overflow-hidden">
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
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Plus size={16} className="text-purple-500" /> Create New Entry</h3>
            
            {tab === 'departments' && (
              <form onSubmit={deptForm.handleSubmit((d) => createDeptMutation.mutate(d))} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Department Name</label>
                  <input {...deptForm.register('name')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Engineering" />
                  {deptForm.formState.errors.name && <p className="text-xs text-rose-500">{deptForm.formState.errors.name.message}</p>}
                </div>
                <button type="submit" disabled={createDeptMutation.isPending} className="w-full py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors flex justify-center items-center gap-2">
                  {createDeptMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Department
                </button>
              </form>
            )}

            {tab === 'branches' && (
              editingBranchId ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Edit Branch</p>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Branch Name</label>
                    <input value={editBranchForm.name} onChange={(e) => setEditBranchForm({ ...editBranchForm, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Address</label>
                    <input value={editBranchForm.address} onChange={(e) => setEditBranchForm({ ...editBranchForm, address: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingBranchId(null)} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} className="inline mr-1" />Cancel</button>
                    <button onClick={() => updateBranchMutation.mutate({ id: editingBranchId, data: editBranchForm })} disabled={!editBranchForm.name.trim() || updateBranchMutation.isPending} className="flex-1 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                      {updateBranchMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
                    </button>
                  </div>
                </div>
              ) : (
              <form onSubmit={branchForm.handleSubmit((d) => createBranchMutation.mutate(d))} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Branch Name</label>
                  <input {...branchForm.register('name')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Head Office" />
                  {branchForm.formState.errors.name && <p className="text-xs text-rose-500">{branchForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Address</label>
                  <input {...branchForm.register('address')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 123 Tech Park" />
                </div>
                <button type="submit" disabled={createBranchMutation.isPending} className="w-full py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors flex justify-center items-center gap-2">
                  {createBranchMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Branch
                </button>
              </form>
              )
            )}

            {tab === 'designations' && (
              <form onSubmit={desigForm.handleSubmit((d) => createDesigMutation.mutate(d))} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Designation Title</label>
                  <input {...desigForm.register('title')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Senior Developer" />
                  {desigForm.formState.errors.title && <p className="text-xs text-rose-500">{desigForm.formState.errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Grade/Band</label>
                  <input {...desigForm.register('grade')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Band 4" />
                </div>
                <button type="submit" disabled={createDesigMutation.isPending} className="w-full py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors flex justify-center items-center gap-2">
                  {createDesigMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Designation
                </button>
              </form>
            )}

            {(tab === 'categories' || tab === 'grades') && (
              <form
                onSubmit={masterForm.handleSubmit((d) => {
                  createMasterMutation.mutate(
                    { master: tab === 'categories' ? 'category' : 'grade', value: d.value.trim() },
                    { onSuccess: () => masterForm.reset() }
                  );
                })}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{tab === 'categories' ? 'Category Name' : 'Grade Name'}</label>
                  <input {...masterForm.register('value')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder={tab === 'categories' ? 'e.g. Permanent' : 'e.g. Grade A'} />
                </div>
                <button type="submit" disabled={createMasterMutation.isPending} className="w-full py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors flex justify-center items-center gap-2">
                  {createMasterMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {tab === 'categories' ? 'Create Category' : 'Create Grade'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm min-h-[400px]">
            <div className="premium-datatable">
               <style>{`
                  .premium-datatable table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                  .premium-datatable th { padding: 12px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--border); text-align: left; }
                  .premium-datatable td { padding: 12px 16px; background: var(--surface-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background 0.2s; }
                  .premium-datatable tr td:first-child { border-left: 1px solid var(--border); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
                  .premium-datatable tr td:last-child { border-right: 1px solid var(--border); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
                  .premium-datatable tbody tr:hover td { background: var(--surface-hover); }
               `}</style>
               {tab === 'departments' && <DataTable columns={deptColumns} data={departments || []} loading={isLoadingDepts} keyField="id" />}
               {tab === 'branches' && <DataTable columns={branchColumns} data={branches || []} loading={isLoadingBranches} keyField="id" />}
               {tab === 'designations' && <DataTable columns={desigColumns} data={designations || []} loading={isLoadingDesigs} keyField="id" />}
               {tab === 'categories' && <DataTable columns={masterColumns} data={categories} loading={isLoadingMasters} keyField="id" />}
               {tab === 'grades' && <DataTable columns={masterColumns} data={grades} loading={isLoadingMasters} keyField="id" />}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
