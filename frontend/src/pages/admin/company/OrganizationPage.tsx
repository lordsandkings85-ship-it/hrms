import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Landmark, ShieldAlert, Award, Plus, Trash2, MapPin, Users, Layers, Loader2, Search, Download, Check, Settings, Pencil, X, Eye, Power } from 'lucide-react';
import { organizationApi, settingsApi, orgMastersApi, companiesApi, Company } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { CompanyFormModal, GROUP_NAME } from '../../../components/company/CompanyFormModal';
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
  legalName: z.string().optional(),
  displayName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  tanNumber: z.string().optional(),
  cinNumber: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  professionalTaxNumber: z.string().optional(),
  labourWelfareFundNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifsc: z.string().optional(),
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
const branchSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  pincode: z.string().optional(),
});
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
  const branchForm = useForm({ resolver: zodResolver(branchSchema), defaultValues: { name: '', code: '', address: '', city: '', state: '', country: 'India', phone: '', pincode: '' } });
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
  const [editBranchForm, setEditBranchForm] = useState({ name: '', code: '', address: '', city: '', state: '', country: 'India', phone: '', pincode: '' });

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
      legalName: '', displayName: '', city: '', state: '', country: 'India', pincode: '',
      tanNumber: '', cinNumber: '', pfNumber: '', esiNumber: '',
      professionalTaxNumber: '', labourWelfareFundNumber: '',
      bankName: '', bankAccountName: '', bankAccountNumber: '', ifsc: '',
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
        legalName: profile.legalName || '',
        displayName: profile.displayName || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || 'India',
        pincode: profile.pincode || '',
        tanNumber: profile.tanNumber || '',
        cinNumber: profile.cinNumber || '',
        pfNumber: profile.pfNumber || '',
        esiNumber: profile.esiNumber || '',
        professionalTaxNumber: profile.professionalTaxNumber || '',
        labourWelfareFundNumber: profile.labourWelfareFundNumber || '',
        bankName: profile.bankName || '',
        bankAccountName: profile.bankAccountName || '',
        bankAccountNumber: profile.bankAccountNumber || '',
        ifsc: profile.ifsc || '',
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
      legalName: data.legalName || null, displayName: data.displayName || null,
      city: data.city || null, state: data.state || null, country: data.country || null, pincode: data.pincode || null,
      tanNumber: data.tanNumber || null, cinNumber: data.cinNumber || null,
      pfNumber: data.pfNumber || null, esiNumber: data.esiNumber || null,
      professionalTaxNumber: data.professionalTaxNumber || null,
      labourWelfareFundNumber: data.labourWelfareFundNumber || null,
      bankName: data.bankName || null, bankAccountName: data.bankAccountName || null,
      bankAccountNumber: data.bankAccountNumber || null, ifsc: data.ifsc || null,
    }),
    onSuccess: () => {
      toastSuccess('Company profile updated');
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update profile')
  });

  // Multi-company: list all companies under the Lords And Kings Group
  const { data: companies, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => companiesApi.list(),
  });

  const [companyModal, setCompanyModal] = useState<{
    mode: 'add' | 'edit' | 'view';
    company?: Company | null;
  } | null>(null);

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => companiesApi.update(id, { status }),
    onSuccess: (_data, vars) => {
      toastSuccess(`Company ${vars.status === 'active' ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['companies-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update company status'),
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
    { key: 'code', header: 'Code', render: (row) => <span className="text-xs font-mono text-indigo-500">{row.code || '—'}</span> },
    { key: 'city', header: 'City / State', render: (row) => <span className="text-xs text-[var(--text-muted)]">{[row.city, row.state].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'phone', header: 'Phone', render: (row) => <span className="text-xs font-mono">{row.phone || '—'}</span> },
    { key: 'employees', header: 'Employees', render: (row) => <span className="text-xs font-bold">{row._count?.employees ?? 0}</span> },
    { key: 'isActive', header: 'Status', render: (row) => row.isActive !== false
      ? <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20">Active</span>
      : <span className="text-[var(--text-muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-full text-[10px] font-bold border border-[var(--border)]">Inactive</span> },
    {
      key: 'actions', header: '', render: (row) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => { setEditingBranchId(row.id); setEditBranchForm({ name: row.name || '', code: row.code || '', address: row.address || '', city: row.city || '', state: row.state || '', country: row.country || 'India', phone: row.phone || '', pincode: row.pincode || '' }); }} className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10"><Pencil size={14} /></button>
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

  // Lords And Kings (the profile company) always first, then creation order.
  const sortedCompanies = (companies ?? []).slice().sort((a, b) => {
    if (a.id === profile?.id) return -1;
    if (b.id === profile?.id) return 1;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
  const isProfileCompany = (id: string) => id === profile?.id;

  const companiesColumns: Column<any>[] = [
    {
      key: 'logo',
      header: 'Company Logo',
      render: (row) => (
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-center text-purple-500 font-bold text-sm">
          {row.logoUrl
            ? <img src={row.logoUrl} alt="" className="w-full h-full object-cover" />
            : (row.displayName || row.name || 'CO').slice(0, 2).toUpperCase()}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Company Name',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-bold text-[var(--text-primary)] truncate flex items-center gap-2">
            {row.displayName || row.name}
            {isProfileCompany(row.id) && (
              <span className="shrink-0 text-[9px] font-bold uppercase bg-purple-500/10 text-purple-500 border border-purple-500/20 px-1.5 py-0.5 rounded-full">Parent</span>
            )}
          </p>
          {row.legalName && <p className="text-xs text-[var(--text-muted)] truncate">{row.legalName}</p>}
        </div>
      ),
    },
    { key: 'legalName', header: 'Legal Name', render: (row) => <span className="text-xs text-[var(--text-muted)]">{row.legalName || '—'}</span> },
    { key: 'panNumber', header: 'PAN', render: (row) => <span className="text-xs font-mono">{row.panNumber || '—'}</span> },
    { key: 'gstNumber', header: 'GSTIN', render: (row) => <span className="text-xs font-mono">{row.gstNumber || '—'}</span> },
    {
      key: 'location',
      header: 'Location',
      render: (row) => <span className="text-xs text-[var(--text-muted)]">{[row.city, row.state].filter(Boolean).join(', ') || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => row.status === 'active'
        ? <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20">Active</span>
        : <span className="text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-500/20">Inactive</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => <span className="text-xs text-[var(--text-muted)]">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-1.5 justify-end">
          <button
            onClick={() => setCompanyModal({ mode: 'view', company: row })}
            title="View company"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-purple-500 hover:bg-purple-500/10"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => setCompanyModal({ mode: 'edit', company: row })}
            title="Edit company"
            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10"
          >
            <Pencil size={14} />
          </button>
          {!isProfileCompany(row.id) && (
            <button
              onClick={() => {
                const next = row.status === 'active' ? 'inactive' : 'active';
                if (confirm(`${next === 'active' ? 'Activate' : 'Deactivate'} "${row.displayName || row.name}"?`)) {
                  toggleStatusMutation.mutate({ id: row.id, status: next });
                }
              }}
              title={row.status === 'active' ? 'Deactivate company' : 'Activate company'}
              className={`p-1.5 rounded-lg ${row.status === 'active' ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
            >
              <Power size={14} />
            </button>
          )}
        </div>
      ),
    },
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
        <div className="space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute top-0 right-0 p-24 bg-purple-500/10 rounded-bl-full -z-0 blur-2xl"></div>
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shadow-inner">
                <Landmark size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{GROUP_NAME}</h2>
                <p className="text-sm text-[var(--text-muted)] mt-0.5 font-medium">This is the parent / group-level organization. All companies below operate under this group.</p>
              </div>
            </div>
            <button
              onClick={() => setCompanyModal({ mode: 'add', company: null })}
              className="relative z-10 flex items-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-all shadow-md shadow-purple-500/20"
            >
              <Plus size={16} /> Add New Company
            </button>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Building2 className="text-purple-500" size={18} /> Companies
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage all companies under {GROUP_NAME}</p>
              </div>
              <span className="text-[10px] font-mono text-purple-500 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">{companies?.length ?? 0} total</span>
            </div>
            <DataTable
              columns={companiesColumns}
              data={sortedCompanies}
              keyField="id"
              loading={isLoadingCompanies}
              selectable={false}
              showToolbar={false}
              pageSize={10}
              emptyTitle="No companies found"
              emptyMessage="This group does not have any companies yet."
            />
          </div>

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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Statutory & Registration Numbers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Legal Name</label>
                      <input {...profileForm.register('legalName')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="Registered legal name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Display Name</label>
                      <input {...profileForm.register('displayName')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="Display name used in UI" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">TAN Number</label>
                      <input {...profileForm.register('tanNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. CHNR12345A" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">CIN Number</label>
                      <input {...profileForm.register('cinNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. U72900TN2022PTC123456" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">PF Number</label>
                      <input {...profileForm.register('pfNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. TN/CHN/12345" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">ESI Number</label>
                      <input {...profileForm.register('esiNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 12000345678901234" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Professional Tax Number</label>
                      <input {...profileForm.register('professionalTaxNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. PT/CHN/123456" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Labour Welfare Fund Number</label>
                      <input {...profileForm.register('labourWelfareFundNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. TN/LWF/12345" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">City</label>
                      <input {...profileForm.register('city')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Chennai" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">State</label>
                      <input {...profileForm.register('state')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Tamil Nadu" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Country</label>
                      <input {...profileForm.register('country')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. India" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Pincode</label>
                      <input {...profileForm.register('pincode')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 600001" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Bank Details (Company)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Bank Name</label>
                      <input {...profileForm.register('bankName')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. HDFC Bank" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Account Name</label>
                      <input {...profileForm.register('bankAccountName')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Lords And Kings Pvt Ltd" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Account Number</label>
                      <input {...profileForm.register('bankAccountNumber')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 50100234567890" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-primary)]">IFSC Code</label>
                      <input {...profileForm.register('ifsc')} className="w-full px-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. HDFC0001234" />
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
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Edit Branch</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Name *</label>
                      <input value={editBranchForm.name} onChange={(e) => setEditBranchForm({ ...editBranchForm, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Code</label>
                      <input value={editBranchForm.code} onChange={(e) => setEditBranchForm({ ...editBranchForm, code: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. CHN-001" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Address</label>
                    <input value={editBranchForm.address} onChange={(e) => setEditBranchForm({ ...editBranchForm, address: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 123 Tech Park" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">City</label>
                      <input value={editBranchForm.city} onChange={(e) => setEditBranchForm({ ...editBranchForm, city: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">State</label>
                      <input value={editBranchForm.state} onChange={(e) => setEditBranchForm({ ...editBranchForm, state: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Country</label>
                      <input value={editBranchForm.country} onChange={(e) => setEditBranchForm({ ...editBranchForm, country: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Phone</label>
                      <input value={editBranchForm.phone} onChange={(e) => setEditBranchForm({ ...editBranchForm, phone: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Pincode</label>
                      <input value={editBranchForm.pincode} onChange={(e) => setEditBranchForm({ ...editBranchForm, pincode: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingBranchId(null)} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} className="inline mr-1" />Cancel</button>
                    <button onClick={() => updateBranchMutation.mutate({ id: editingBranchId, data: editBranchForm })} disabled={!editBranchForm.name.trim() || updateBranchMutation.isPending} className="flex-1 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                      {updateBranchMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
                    </button>
                  </div>
                </div>
              ) : (
              <form onSubmit={branchForm.handleSubmit((d) => createBranchMutation.mutate(d))} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Name *</label>
                    <input {...branchForm.register('name')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Head Office" />
                    {branchForm.formState.errors.name && <p className="text-xs text-rose-500">{branchForm.formState.errors.name.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Code</label>
                    <input {...branchForm.register('code')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. CHN-001" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Address</label>
                  <input {...branchForm.register('address')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 123 Tech Park" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">City</label>
                    <input {...branchForm.register('city')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">State</label>
                    <input {...branchForm.register('state')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Country</label>
                    <input {...branchForm.register('country')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Phone</label>
                    <input {...branchForm.register('phone')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Pincode</label>
                    <input {...branchForm.register('pincode')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                  </div>
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
      {companyModal && (
        <CompanyFormModal
          open
          mode={companyModal.mode}
          company={companyModal.company}
          onClose={() => setCompanyModal(null)}
        />
      )}
    </div>
  );
}
