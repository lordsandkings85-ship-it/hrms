import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Award, Plus, Trash2, MapPin, Users, Layers, Loader2, Download,
  Check, Settings, Pencil, X, Crown, Sprout, Building, Home, Search,
  UserPlus, ArrowRightLeft, ShieldCheck, Sparkles, Mail, Phone, Globe,
  Briefcase, CheckCircle2, UserCheck, AlertCircle, ArrowUpRight, Upload, Image as ImageIcon
} from 'lucide-react';
import { organizationApi, settingsApi, orgMastersApi, companiesApi, Company } from '../../../api/client';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../../components/ui/ToastProvider';
import { Modal } from '../../../components/ui/Modal';
import { CompanyFormModal } from '../../../components/company/CompanyFormModal';

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

const EXTRA_THEMES = [
  {
    colorName: 'cyan',
    cardBg: 'bg-[#ECFEFF] dark:bg-cyan-950/20',
    cardBorder: 'border-cyan-200/90 dark:border-cyan-800/50',
    activeBorder: 'border-cyan-500 ring-2 ring-cyan-500/30 shadow-cyan-500/10 shadow-lg',
    badgeBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
    iconBg: 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20',
    taglineColor: 'text-cyan-700/80 dark:text-cyan-400',
    accentColor: '#0891B2',
    headerGradient: 'from-cyan-600/10 to-transparent',
    icon: Building2,
  },
  {
    colorName: 'rose',
    cardBg: 'bg-[#FFF1F2] dark:bg-rose-950/20',
    cardBorder: 'border-rose-200/90 dark:border-rose-800/50',
    activeBorder: 'border-rose-500 ring-2 ring-rose-500/30 shadow-rose-500/10 shadow-lg',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    iconBg: 'bg-rose-600 text-white shadow-md shadow-rose-500/20',
    taglineColor: 'text-rose-700/80 dark:text-rose-400',
    accentColor: '#E11D48',
    headerGradient: 'from-rose-600/10 to-transparent',
    icon: Briefcase,
  },
  {
    colorName: 'teal',
    cardBg: 'bg-[#F0FDFA] dark:bg-teal-950/20',
    cardBorder: 'border-teal-200/90 dark:border-teal-800/50',
    activeBorder: 'border-teal-500 ring-2 ring-teal-500/30 shadow-teal-500/10 shadow-lg',
    badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
    iconBg: 'bg-teal-600 text-white shadow-md shadow-teal-500/20',
    taglineColor: 'text-teal-700/80 dark:text-teal-400',
    accentColor: '#0D9488',
    headerGradient: 'from-teal-600/10 to-transparent',
    icon: Globe,
  },
  {
    colorName: 'orange',
    cardBg: 'bg-[#FFF7ED] dark:bg-orange-950/20',
    cardBorder: 'border-orange-200/90 dark:border-orange-800/50',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/30 shadow-orange-500/10 shadow-lg',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
    iconBg: 'bg-orange-600 text-white shadow-md shadow-orange-500/20',
    taglineColor: 'text-orange-700/80 dark:text-orange-400',
    accentColor: '#EA580C',
    headerGradient: 'from-orange-600/10 to-transparent',
    icon: Building,
  },
];

const GROUP_ENTITIES = [
  {
    key: 'enterprises',
    matchNames: ['lordsandkings enterprises', 'lords and kings enterprises'],
    defaultName: 'Lordsandkings Enterprises',
    tagline: 'TRADING | SERVICES | GROWTH',
    industry: 'Trading & Services',
    type: 'Proprietary',
    theme: {
      colorName: 'blue',
      cardBg: 'bg-[#F0F7FF] dark:bg-blue-950/20',
      cardBorder: 'border-blue-200/90 dark:border-blue-800/50',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/30 shadow-blue-500/10 shadow-lg',
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
      iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
      taglineColor: 'text-blue-700/80 dark:text-blue-400',
      accentColor: '#2563EB',
      headerGradient: 'from-blue-600/10 to-transparent',
    },
    icon: Building2,
  },
  {
    key: 'agro',
    matchNames: ['lordsandkings agro', 'lords and kings agro'],
    defaultName: 'Lordsandkings Agro',
    tagline: 'AGRICULTURE | FOOD | SUSTAINABILITY',
    industry: 'Agriculture & Food',
    type: 'Private Limited',
    theme: {
      colorName: 'green',
      cardBg: 'bg-[#F0FDF4] dark:bg-emerald-950/20',
      cardBorder: 'border-emerald-200/90 dark:border-emerald-800/50',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-500/10 shadow-lg',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
      iconBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
      taglineColor: 'text-emerald-700/80 dark:text-emerald-400',
      accentColor: '#16A34A',
      headerGradient: 'from-emerald-600/10 to-transparent',
    },
    icon: Sprout,
  },
  {
    key: 'enterprises-pvt-ltd',
    matchNames: ['lordsandkings enterprises pvt ltd', 'lords and kings enterprises pvt ltd', 'lords and kings enterprises private limited'],
    defaultName: 'Lordsandkings Enterprises Pvt Ltd',
    tagline: 'BUSINESS | INNOVATION | EXCELLENCE',
    industry: 'Business & Technology',
    type: 'Private Limited',
    theme: {
      colorName: 'amber',
      cardBg: 'bg-[#FFFBEB] dark:bg-amber-950/20',
      cardBorder: 'border-amber-200/90 dark:border-amber-800/50',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/30 shadow-amber-500/10 shadow-lg',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
      iconBg: 'bg-amber-600 text-white shadow-md shadow-amber-500/20',
      taglineColor: 'text-amber-700/80 dark:text-amber-400',
      accentColor: '#D97706',
      headerGradient: 'from-amber-600/10 to-transparent',
    },
    icon: Building,
  },
  {
    key: 'estates-llp',
    matchNames: ['lordsandkings estates llp', 'lords and kings estates llp', 'lords and kings estates'],
    defaultName: 'Lordsandkings Estates LLP',
    tagline: 'REAL ESTATE | DEVELOPMENT | VALUE',
    industry: 'Real Estate & Infrastructure',
    type: 'LLP',
    theme: {
      colorName: 'purple',
      cardBg: 'bg-[#FAF5FF] dark:bg-purple-950/20',
      cardBorder: 'border-purple-200/90 dark:border-purple-800/50',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/30 shadow-purple-500/10 shadow-lg',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
      iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
      taglineColor: 'text-purple-700/80 dark:text-purple-400',
      accentColor: '#7C3AED',
      headerGradient: 'from-purple-600/10 to-transparent',
    },
    icon: Home,
  },
];

const profileSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  logoUrl: z.string().optional().or(z.literal('')),
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
  status: z.string().optional(),
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

  const initialTab = SUB_TO_TAB[subAction] || 'profile';
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Selected company state inside Company Profile view
  const [selectedCompanyKey, setSelectedCompanyKey] = useState<string>('enterprises');
  const [companyWorkspaceTab, setCompanyWorkspaceTab] = useState<'details' | 'employees'>('details');
  const [addCompanyModalOpen, setAddCompanyModalOpen] = useState(false);

  // Employee Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [assignReason, setAssignReason] = useState('Assigned via Company Profile Manager');
  const [assignEffectiveDate, setAssignEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  // Employee list filter in workspace
  const [empFilterSearch, setEmpFilterSearch] = useState('');

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
    { key: 'profile', label: 'Company Profile & Group', icon: <Building2 size={16} /> },
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
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => companiesApi.list(),
  });

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

  // Match companies from backend to our group cards (standard 4 presets + any dynamic additions)
  const matchedEntities = useMemo(() => {
    const standardEntities = GROUP_ENTITIES.map((entity) => {
      const found = companies.find((c) => {
        const lowerName = (c.name || '').toLowerCase().trim();
        const lowerDisplay = (c.displayName || '').toLowerCase().trim();
        return entity.matchNames.some((m) => lowerName.includes(m) || lowerDisplay.includes(m));
      });
      return {
        ...entity,
        companyData: found || null,
        companyId: found?.id || null,
        employeeCount: found?._count?.employees ?? 0,
      };
    });

    const standardCompanyIds = new Set(standardEntities.map((e) => e.companyId).filter(Boolean));
    const extraCompanies = companies.filter(
      (c) =>
        !standardCompanyIds.has(c.id) &&
        c.status !== 'group_parent' &&
        c.name.toLowerCase().trim() !== 'lords and kings' &&
        (c.displayName || '').toLowerCase().trim() !== 'lords and kings (group)'
    );

    const extraEntities = extraCompanies.map((c, index) => {
      const themeConfig = EXTRA_THEMES[index % EXTRA_THEMES.length];
      return {
        key: `custom-${c.id}`,
        matchNames: [(c.name || '').toLowerCase(), (c.displayName || '').toLowerCase()],
        defaultName: c.displayName || c.name,
        tagline: `${(c.industry || 'BUSINESS').toUpperCase()} | ${(c.companyType || 'ENTERPRISE').toUpperCase()}`,
        industry: c.industry || 'Business & Enterprise',
        type: c.companyType || 'Private Limited',
        theme: {
          colorName: themeConfig.colorName,
          cardBg: themeConfig.cardBg,
          cardBorder: themeConfig.cardBorder,
          activeBorder: themeConfig.activeBorder,
          badgeBg: themeConfig.badgeBg,
          iconBg: themeConfig.iconBg,
          taglineColor: themeConfig.taglineColor,
          accentColor: themeConfig.accentColor,
          headerGradient: themeConfig.headerGradient,
        },
        icon: themeConfig.icon,
        companyData: c,
        companyId: c.id,
        employeeCount: c._count?.employees ?? 0,
      };
    });

    return [...standardEntities, ...extraEntities];
  }, [companies]);

  // Selected company object
  const activeEntity = useMemo(() => {
    return matchedEntities.find((e) => e.key === selectedCompanyKey) || matchedEntities[0];
  }, [matchedEntities, selectedCompanyKey]);

  const activeCompanyId = activeEntity?.companyId;

  // Query employees of selected company
  const { data: companyEmployees = [], isLoading: isLoadingCompEmployees } = useQuery({
    queryKey: ['company-employees', activeCompanyId],
    queryFn: () => (activeCompanyId ? companiesApi.getEmployees(activeCompanyId) : Promise.resolve([])),
    enabled: !!activeCompanyId,
  });

  // Query all group employees for assignment modal
  const { data: allGroupEmployees = [], isLoading: isLoadingAllEmployees } = useQuery({
    queryKey: ['group-employees'],
    queryFn: () => companiesApi.getGroupEmployees(),
    enabled: assignModalOpen,
  });

  // Company Profile Form
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
      bankName: '', bankAccountName: '', bankAccountNumber: '', ifsc: '', status: 'active',
    },
  });

  // Update profile form when active company changes
  const activeCompanyData = activeEntity?.companyData;
  const activeEntityKey = activeEntity?.key;

  useEffect(() => {
    if (activeCompanyData) {
      profileForm.reset({
        name: activeCompanyData.name || activeEntity?.defaultName || '',
        logoUrl: activeCompanyData.logoUrl || '',
        timezone: activeCompanyData.timezone || 'Asia/Kolkata',
        currency: activeCompanyData.currency || 'INR',
        address: activeCompanyData.address || '',
        phone: activeCompanyData.phone || '',
        email: activeCompanyData.email || '',
        website: activeCompanyData.website || '',
        gstNumber: activeCompanyData.gstNumber || '',
        panNumber: activeCompanyData.panNumber || '',
        industry: activeCompanyData.industry || activeEntity?.industry || '',
        companyType: activeCompanyData.companyType || activeEntity?.type || 'Private Limited',
        financialYearStart: activeCompanyData.financialYearStart ? String(activeCompanyData.financialYearStart) : '',
        financialYearEnd: activeCompanyData.financialYearEnd ? String(activeCompanyData.financialYearEnd) : '',
        payrollEffectiveFrom: activeCompanyData.payrollEffectiveFrom ? String(activeCompanyData.payrollEffectiveFrom) : '',
        legalName: activeCompanyData.legalName || activeEntity?.defaultName || '',
        displayName: activeCompanyData.displayName || activeEntity?.defaultName || '',
        city: activeCompanyData.city || '',
        state: activeCompanyData.state || '',
        country: activeCompanyData.country || 'India',
        pincode: activeCompanyData.pincode || '',
        tanNumber: activeCompanyData.tanNumber || '',
        cinNumber: activeCompanyData.cinNumber || '',
        pfNumber: activeCompanyData.pfNumber || '',
        esiNumber: activeCompanyData.esiNumber || '',
        professionalTaxNumber: activeCompanyData.professionalTaxNumber || '',
        labourWelfareFundNumber: activeCompanyData.labourWelfareFundNumber || '',
        bankName: activeCompanyData.bankName || '',
        bankAccountName: activeCompanyData.bankAccountName || '',
        bankAccountNumber: activeCompanyData.bankAccountNumber || '',
        ifsc: activeCompanyData.ifsc || '',
        status: activeCompanyData.status || 'active',
      });
    } else if (activeEntity) {
      profileForm.reset({
        name: activeEntity.defaultName,
        displayName: activeEntity.defaultName,
        legalName: activeEntity.defaultName,
        industry: activeEntity.industry,
        companyType: activeEntity.type,
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        country: 'India',
        status: 'active',
        logoUrl: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        gstNumber: '',
        panNumber: '',
        tanNumber: '',
        cinNumber: '',
        pfNumber: '',
        esiNumber: '',
        professionalTaxNumber: '',
        labourWelfareFundNumber: '',
        bankName: '',
        bankAccountName: '',
        bankAccountNumber: '',
        ifsc: '',
        financialYearStart: '',
        financialYearEnd: '',
        payrollEffectiveFrom: '',
        city: '',
        state: '',
        pincode: '',
      });
    }
  }, [activeEntityKey, activeCompanyData?.id, activeCompanyData?.updatedAt]);

  // Mutations
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      if (!activeCompanyId) {
        return companiesApi.create({
          ...data,
          name: data.name,
          financialYearStart: data.financialYearStart ? parseInt(data.financialYearStart) : undefined,
          financialYearEnd: data.financialYearEnd ? parseInt(data.financialYearEnd) : undefined,
          payrollEffectiveFrom: data.payrollEffectiveFrom ? parseInt(data.payrollEffectiveFrom) : undefined,
        });
      }
      return companiesApi.update(activeCompanyId, {
        ...data,
        financialYearStart: data.financialYearStart ? parseInt(data.financialYearStart) : undefined,
        financialYearEnd: data.financialYearEnd ? parseInt(data.financialYearEnd) : undefined,
        payrollEffectiveFrom: data.payrollEffectiveFrom ? parseInt(data.payrollEffectiveFrom) : undefined,
      });
    },
    onSuccess: () => {
      toastSuccess(`${activeEntity?.defaultName || 'Company'} details updated successfully`);
      queryClient.invalidateQueries({ queryKey: ['companies-list'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to update company details')
  });

  const assignEmployeesMutation = useMutation({
    mutationFn: ({ companyId, employeeIds, reason, effectiveFrom }: { companyId: string; employeeIds: string[]; reason?: string; effectiveFrom?: string }) =>
      companiesApi.assignEmployees(companyId, { employeeIds, reason, effectiveFrom }),
    onSuccess: (res) => {
      toastSuccess(`Successfully assigned ${res.assignedCount} employee(s) to ${res.companyName}`);
      setAssignModalOpen(false);
      setSelectedEmpIds([]);
      queryClient.invalidateQueries({ queryKey: ['companies-list'] });
      queryClient.invalidateQueries({ queryKey: ['company-employees'] });
      queryClient.invalidateQueries({ queryKey: ['group-employees'] });
    },
    onError: (e: any) => toastError(e.message || 'Failed to assign employees'),
  });

  // Seed default masters
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

  // Filtered employees for active company
  const filteredCompanyEmployees = useMemo(() => {
    if (!empFilterSearch.trim()) return companyEmployees;
    const q = empFilterSearch.toLowerCase();
    return companyEmployees.filter((e: any) =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (e.employeeCode || '').toLowerCase().includes(q) ||
      (e.department?.name || '').toLowerCase().includes(q) ||
      (e.designation?.title || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q)
    );
  }, [companyEmployees, empFilterSearch]);

  // Filtered group employees for assignment modal
  const filteredGroupEmployees = useMemo(() => {
    return (allGroupEmployees as any[]).filter((e) => {
      const q = assignSearch.toLowerCase();
      const matchSearch =
        !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        (e.employeeCode || '').toLowerCase().includes(q) ||
        (e.department?.name || '').toLowerCase().includes(q) ||
        (e.company?.displayName || e.company?.name || '').toLowerCase().includes(q);
      return matchSearch;
    });
  }, [allGroupEmployees, assignSearch]);

  // Master handlers
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

  const createDeptMutation = useMutation({
    mutationFn: (data: z.infer<typeof deptSchema>) => organizationApi.createDepartment(data.name),
    onSuccess: () => {
      toastSuccess('Department created');
      deptForm.reset();
      queryClient.invalidateQueries({ queryKey: ['departments-list'] });
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

  const totalGroupEmployees = useMemo(() => {
    return matchedEntities.reduce((sum, e) => sum + e.employeeCount, 0);
  }, [matchedEntities]);

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Top Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                tab === t.key
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {tab === 'profile' && (
            <button
              onClick={() => setAddCompanyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#F5D77F] hover:from-[#F5D77F] hover:to-[#D4AF37] rounded-xl shadow-md shadow-amber-500/20 transition-all transform hover:scale-105 cursor-pointer"
            >
              <Plus size={15} className="stroke-[3]" />
              Add Company
            </button>
          )}

          {tab !== 'profile' && (
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
              title="Seed default departments and designations"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Seed Defaults
            </button>
          )}
        </div>
      </div>

      {tab === 'profile' ? (
        <div className="space-y-10">

          {/* ========================================================================= */}
          {/* ROYAL LORDS AND KINGS GROUP HEADER BANNER (Exact visual match)            */}
          {/* ========================================================================= */}
          <div className="relative rounded-3xl p-8 md:p-10 border-2 border-[#D4AF37] shadow-[0_12px_40px_rgba(212,175,55,0.18)] overflow-hidden bg-gradient-to-b from-[#06152B] via-[#0B2347] to-[#06152B] text-center text-white max-w-4xl mx-auto">
            {/* Ambient gold glow effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F7D070] to-transparent opacity-60" />

            <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
              {/* Gold Crown Emblem */}
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#F5D77F]/20 to-transparent flex items-center justify-center border border-[#D4AF37]/40 shadow-inner">
                  <Crown size={36} className="text-[#F5D77F] filter drop-shadow-[0_2px_8px_rgba(245,215,127,0.6)]" />
                </div>
              </div>

              {/* Title & Group */}
              <div className="space-y-1">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5D6] via-[#FFFFFF] to-[#F5D77F] uppercase font-serif drop-shadow-sm">
                  Lords And Kings
                </h1>
                <div className="flex items-center justify-center gap-3">
                  <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
                  <p className="text-xs md:text-sm tracking-[0.35em] uppercase font-bold text-[#E5C158]">
                    G R O U P
                  </p>
                  <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
                </div>
              </div>

              {/* Tagline */}
              <p className="text-[11px] md:text-xs tracking-[0.2em] font-semibold text-slate-300/90 uppercase pt-1">
                A STRONGER TOMORROW TOGETHER
              </p>

              {/* Summary Stats & Add Company Pill */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
                <span className="px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FCE8A6] font-semibold flex items-center gap-1.5">
                  <Building2 size={13} className="text-[#F5D77F]" /> {matchedEntities.length} Corporate Entities
                </span>
                <span className="px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-slate-200 font-semibold flex items-center gap-1.5">
                  <Users size={13} className="text-emerald-400" /> {totalGroupEmployees} Total Workforce
                </span>
                <button
                  type="button"
                  onClick={() => setAddCompanyModalOpen(true)}
                  className="px-3.5 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5D77F] hover:from-[#F5D77F] hover:to-[#D4AF37] text-slate-950 font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all transform hover:scale-105 cursor-pointer"
                >
                  <Plus size={13} className="stroke-[3]" /> Add Company
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HIERARCHY TREE CONNECTOR (Visual branches matching diagram)               */}
          {/* ========================================================================= */}
          <div className="hidden lg:block relative -my-4 h-16 w-full max-w-6xl mx-auto pointer-events-none">
            {/* Main center vertical stem coming from parent banner */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-[#0B2347] dark:bg-slate-400" />
            
            {/* Horizontal branch line spanning the 4 card centers (12.5%, 37.5%, 62.5%, 87.5%) */}
            <div className="absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-[#0B2347] dark:bg-slate-400 rounded-full" />
            
            {/* 4 Vertical drops with down arrows */}
            <div className="absolute top-6 left-[12.5%] -translate-x-1/2 w-0.5 h-7 bg-[#0B2347] dark:bg-slate-400 flex items-end justify-center">
              <div className="w-2 h-2 border-r-2 border-b-2 border-[#0B2347] dark:border-slate-400 rotate-45 mb-[-3px]" />
            </div>
            <div className="absolute top-6 left-[37.5%] -translate-x-1/2 w-0.5 h-7 bg-[#0B2347] dark:bg-slate-400 flex items-end justify-center">
              <div className="w-2 h-2 border-r-2 border-b-2 border-[#0B2347] dark:border-slate-400 rotate-45 mb-[-3px]" />
            </div>
            <div className="absolute top-6 left-[62.5%] -translate-x-1/2 w-0.5 h-7 bg-[#0B2347] dark:bg-slate-400 flex items-end justify-center">
              <div className="w-2 h-2 border-r-2 border-b-2 border-[#0B2347] dark:border-slate-400 rotate-45 mb-[-3px]" />
            </div>
            <div className="absolute top-6 left-[87.5%] -translate-x-1/2 w-0.5 h-7 bg-[#0B2347] dark:bg-slate-400 flex items-end justify-center">
              <div className="w-2 h-2 border-r-2 border-b-2 border-[#0B2347] dark:border-slate-400 rotate-45 mb-[-3px]" />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THE COMPANY CARDS (Clickable, themed, showing count & details)            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {matchedEntities.map((entity) => {
              const isSelected = selectedCompanyKey === entity.key;
              const IconComponent = entity.icon;
              return (
                <div
                  key={entity.key}
                  onClick={() => setSelectedCompanyKey(entity.key)}
                  className={`relative rounded-3xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between text-center border-2 ${entity.theme.cardBg} ${
                    isSelected
                      ? entity.theme.activeBorder
                      : `${entity.theme.cardBorder} hover:shadow-md hover:-translate-y-1`
                  }`}
                  style={{ minHeight: '260px' }}
                >
                  {/* Selected Indicator Pill */}
                  {isSelected && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-extrabold uppercase tracking-wider shadow flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-400" /> Active Workspace
                    </div>
                  )}

                  {/* Icon / Brand Logo Emblem */}
                  <div className="flex flex-col items-center pt-2">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${entity.companyData?.logoUrl ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md p-1.5' : entity.theme.iconBg} transition-transform duration-300 ${isSelected ? 'scale-110' : ''} overflow-hidden`}>
                      {entity.companyData?.logoUrl ? (
                        <img src={entity.companyData.logoUrl} alt={entity.defaultName} className="w-full h-full object-contain" />
                      ) : (
                        <IconComponent size={28} />
                      )}
                    </div>

                    {/* Company Title */}
                    <h3 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-snug tracking-tight">
                      {entity.defaultName}
                    </h3>
                  </div>

                  {/* Divider line in accent color */}
                  <div className="my-4 flex justify-center">
                    <div className="h-0.5 w-12 rounded-full opacity-60" style={{ backgroundColor: entity.theme.accentColor }} />
                  </div>

                  {/* Tagline & Footer Badges */}
                  <div className="space-y-3">
                    <p className={`text-[10px] md:text-[11px] font-bold tracking-wider uppercase ${entity.theme.taglineColor}`}>
                      {entity.tagline}
                    </p>

                    <div className="pt-2 flex items-center justify-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${entity.theme.badgeBg}`}>
                        <Users size={12} className="inline mr-1" />
                        {entity.employeeCount} {entity.employeeCount === 1 ? 'Employee' : 'Employees'}
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded-md font-semibold bg-white/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {entity.type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Company Card Button */}
            <div
              onClick={() => setAddCompanyModalOpen(true)}
              className="relative rounded-3xl p-6 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center border-2 border-dashed border-[var(--border)] hover:border-amber-500 bg-[var(--surface)] hover:bg-amber-500/5 group shadow-sm hover:shadow-md hover:-translate-y-1"
              style={{ minHeight: '260px' }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#F5D77F] group-hover:text-slate-950 transition-all shadow-sm">
                <Plus size={32} className="stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Add Company
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-[200px]">
                Create a new corporate entity or subsidiary under the group
              </p>
              <span className="mt-4 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-full border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                <Plus size={12} className="stroke-[3]" /> New Entity
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SELECTED COMPANY WORKSPACE (Details Editor & Employee Assignment)         */}
          {/* ========================================================================= */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
            
            {/* Header of the Selected Company Workspace */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${activeEntity.companyData?.logoUrl ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md p-1.5' : activeEntity.theme.iconBg} overflow-hidden`}>
                  {activeEntity.companyData?.logoUrl ? (
                    <img src={activeEntity.companyData.logoUrl} alt={activeEntity.defaultName} className="w-full h-full object-contain" />
                  ) : (
                    (() => {
                      const ActiveIcon = activeEntity.icon;
                      return <ActiveIcon size={30} />;
                    })()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                      {activeEntity.defaultName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Active Entity
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
                    {activeEntity.tagline} · {activeEntity.industry}
                  </p>
                </div>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex items-center gap-2 bg-[var(--surface-alt)] p-1.5 rounded-2xl border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCompanyWorkspaceTab('details')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    companyWorkspaceTab === 'details'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Settings size={15} /> Company Details & Profile
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyWorkspaceTab('employees')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    companyWorkspaceTab === 'employees'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Users size={15} /> Assigned Employees ({companyEmployees.length})
                </button>
              </div>
            </div>

            {/* TAB 1: COMPANY DETAILS EDITOR FORM */}
            {companyWorkspaceTab === 'details' && (
              <form onSubmit={profileForm.handleSubmit((d) => updateCompanyMutation.mutate(d))} className="space-y-8">
                
                {/* 0. Brand Logo Uploader Section */}
                <div className="bg-[var(--surface-alt)] border border-[var(--border)] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-xs">
                  {/* Live Logo Preview Box */}
                  <div className="relative w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-[var(--border)] flex items-center justify-center p-2 shadow-inner shrink-0 overflow-hidden">
                    {profileForm.watch('logoUrl') ? (
                      <img
                        src={profileForm.watch('logoUrl')}
                        alt="Company Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[var(--text-muted)] text-center p-1">
                        <ImageIcon size={24} className="mb-1 text-slate-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <h5 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        Company Logo & Branding
                        {profileForm.watch('logoUrl') && (
                          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Logo Configured
                          </span>
                        )}
                      </h5>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Upload your official logo (PNG, JPG, SVG, WebP) or paste an image URL. This logo will automatically reflect on official <strong>Monthly Payslips</strong>, reports, and dashboards.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Upload from file button */}
                      <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 shadow-sm">
                        <Upload size={14} /> Upload Logo File
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = reader.result as string;
                              profileForm.setValue('logoUrl', result, { shouldDirty: true, shouldValidate: true });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>

                      {profileForm.watch('logoUrl') && (
                        <button
                          type="button"
                          onClick={() => profileForm.setValue('logoUrl', '', { shouldDirty: true, shouldValidate: true })}
                          className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 size={13} /> Remove Logo
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 max-w-xl pt-1">
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] whitespace-nowrap">Or Image URL:</span>
                      <input
                        {...profileForm.register('logoUrl')}
                        className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-purple-500 font-mono"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                </div>

                {/* 1. Basic Details */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
                    <Building2 size={16} className="text-purple-500" /> Basic & Identity Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Company Name <span className="text-rose-500">*</span></label>
                      <input {...profileForm.register('name')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Lordsandkings Enterprises" />
                      {profileForm.formState.errors.name && <p className="text-xs text-rose-500">{profileForm.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Legal / Registered Name</label>
                      <input {...profileForm.register('legalName')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="Registered Legal Name" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Display Name</label>
                      <input {...profileForm.register('displayName')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="Name shown across UI" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Industry Domain</label>
                      <input {...profileForm.register('industry')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Trading / Agro / Estates" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Company Structure / Type</label>
                      <select {...profileForm.register('companyType')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
                        <option value="Proprietary">Proprietary</option>
                        <option value="Private Limited">Private Limited</option>
                        <option value="Public Limited">Public Limited</option>
                        <option value="LLP">LLP</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Trust">Trust</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Address */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
                    <MapPin size={16} className="text-purple-500" /> Contact & Registered Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Company Email</label>
                      <input {...profileForm.register('email')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="info@lordsandkings.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Company Phone</label>
                      <input {...profileForm.register('phone')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="+91-XXXXXXXXXX" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Website</label>
                      <input {...profileForm.register('website')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="https://lordsandkings.com" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Full Registered Address</label>
                      <textarea {...profileForm.register('address')} rows={2} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500 resize-none" placeholder="Enter complete registered office address" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">City</label>
                      <input {...profileForm.register('city')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Chennai" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">State</label>
                      <input {...profileForm.register('state')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Tamil Nadu" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Pincode</label>
                      <input {...profileForm.register('pincode')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 600001" />
                    </div>
                  </div>
                </div>

                {/* 3. Statutory & Tax Registration */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-purple-500" /> Statutory & Tax Numbers
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">GSTIN / GST Number</label>
                      <input {...profileForm.register('gstNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500" placeholder="e.g. 33AABCL1234F1Z5" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">PAN Number</label>
                      <input {...profileForm.register('panNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500" placeholder="e.g. AABCL1234F" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">TAN Number</label>
                      <input {...profileForm.register('tanNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500" placeholder="e.g. CHNR12345A" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">CIN Number</label>
                      <input {...profileForm.register('cinNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500" placeholder="e.g. U72900TN2022PTC123456" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">PF Registration Number</label>
                      <input {...profileForm.register('pfNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. TN/CHN/12345" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">ESI Registration Number</label>
                      <input {...profileForm.register('esiNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. 12000345678901234" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Professional Tax (PT) Number</label>
                      <input {...profileForm.register('professionalTaxNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. PT/CHN/123456" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">LWF Registration Number</label>
                      <input {...profileForm.register('labourWelfareFundNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. TN/LWF/12345" />
                    </div>
                  </div>
                </div>

                {/* 4. Bank Account Details */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
                    <Building size={16} className="text-purple-500" /> Company Bank Account
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Bank Name</label>
                      <input {...profileForm.register('bankName')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. HDFC Bank" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Account Holder Name</label>
                      <input {...profileForm.register('bankAccountName')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500" placeholder="e.g. Lordsandkings Enterprises" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Account Number</label>
                      <input {...profileForm.register('bankAccountNumber')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500" placeholder="e.g. 50200012345678" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">IFSC Code</label>
                      <input {...profileForm.register('ifsc')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500" placeholder="e.g. HDFC0001234" />
                    </div>
                  </div>
                </div>

                {/* 5. System Preferences & Financial Year */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-500" /> Regional & Financial Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Timezone</label>
                      <select {...profileForm.register('timezone')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="UTC">UTC (Universal)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Currency</label>
                      <select {...profileForm.register('currency')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="AED">AED (د.إ)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">FY Start Month</label>
                      <select {...profileForm.register('financialYearStart')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
                        <option value="">-- SELECT --</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{new Date(2024, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">FY End Month</label>
                      <select {...profileForm.register('financialYearEnd')} className="w-full px-3.5 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500">
                        <option value="">-- SELECT --</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{new Date(2024, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-6 border-t border-[var(--border)] flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={updateCompanyMutation.isPending}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    {updateCompanyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Save {activeEntity.defaultName} Details
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: ASSIGNED EMPLOYEES & WORKFORCE ASSIGNMENT */}
            {companyWorkspaceTab === 'employees' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={empFilterSearch}
                      onChange={(e) => setEmpFilterSearch(e.target.value)}
                      placeholder={`Search employees in ${activeEntity.defaultName}…`}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmpIds([]);
                      setAssignModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-purple-700 transition-colors shadow-md shadow-purple-500/20"
                  >
                    <UserPlus size={16} /> Assign Employees to {activeEntity.defaultName}
                  </button>
                </div>

                {isLoadingCompEmployees ? (
                  <div className="flex justify-center items-center py-16">
                    <Loader2 size={24} className="animate-spin text-purple-500" />
                  </div>
                ) : filteredCompanyEmployees.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl p-8 bg-[var(--surface-alt)]/50 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
                      <Users size={24} />
                    </div>
                    <h4 className="text-base font-bold text-[var(--text-primary)]">
                      No employees assigned to {activeEntity.defaultName}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                      Assign workforce members from the group to this corporate entity to manage attendance, payroll, and departmental structures.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAssignModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors mt-2"
                    >
                      <UserPlus size={14} /> Assign Workforce Members
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCompanyEmployees.map((emp: any) => (
                      <div
                        key={emp.id}
                        className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] hover:shadow-md transition-all flex items-start justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-sm border border-purple-500/20 shrink-0 overflow-hidden">
                            {emp.photoUrl ? (
                              <img src={emp.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">
                              {emp.firstName} {emp.lastName}
                            </h4>
                            <p className="text-xs text-purple-600 font-mono font-medium">
                              {emp.employeeCode || emp.employeeId || '—'}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {emp.designation?.title || 'No Designation'} · {emp.department?.name || 'No Dept'}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                          {emp.status || 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MASTERS TAB VIEWS (Branches, Departments, Designations, Categories, Grades) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Plus size={16} className="text-amber-500" /> Create New Entry
              </h3>

              {tab === 'departments' && (
                <form onSubmit={deptForm.handleSubmit((d) => createDeptMutation.mutate(d))} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Department Name</label>
                    <input {...deptForm.register('name')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. Engineering" />
                    {deptForm.formState.errors.name && <p className="text-xs text-rose-500">{deptForm.formState.errors.name.message}</p>}
                  </div>
                  <button type="submit" disabled={createDeptMutation.isPending} className="w-full py-2 bg-amber-500 text-slate-950 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex justify-center items-center gap-2">
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
                        <input value={editBranchForm.name} onChange={(e) => setEditBranchForm({ ...editBranchForm, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Code</label>
                        <input value={editBranchForm.code} onChange={(e) => setEditBranchForm({ ...editBranchForm, code: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. CHN-001" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Address</label>
                      <input value={editBranchForm.address} onChange={(e) => setEditBranchForm({ ...editBranchForm, address: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. 123 Tech Park" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">City</label>
                        <input value={editBranchForm.city} onChange={(e) => setEditBranchForm({ ...editBranchForm, city: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">State</label>
                        <input value={editBranchForm.state} onChange={(e) => setEditBranchForm({ ...editBranchForm, state: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Country</label>
                        <input value={editBranchForm.country} onChange={(e) => setEditBranchForm({ ...editBranchForm, country: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Phone</label>
                        <input value={editBranchForm.phone} onChange={(e) => setEditBranchForm({ ...editBranchForm, phone: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Pincode</label>
                        <input value={editBranchForm.pincode} onChange={(e) => setEditBranchForm({ ...editBranchForm, pincode: e.target.value })} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingBranchId(null)} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={14} className="inline mr-1" />Cancel</button>
                      <button onClick={() => updateBranchMutation.mutate({ id: editingBranchId, data: editBranchForm })} disabled={!editBranchForm.name.trim() || updateBranchMutation.isPending} className="flex-1 py-2 bg-amber-500 text-slate-950 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                        {updateBranchMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
                      </button>
                    </div>
                  </div>
                ) : (
                <form onSubmit={branchForm.handleSubmit((d) => createBranchMutation.mutate(d))} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Name *</label>
                      <input {...branchForm.register('name')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. Head Office" />
                      {branchForm.formState.errors.name && <p className="text-xs text-rose-500">{branchForm.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Code</label>
                      <input {...branchForm.register('code')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. CHN-001" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Address</label>
                    <input {...branchForm.register('address')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. 123 Tech Park" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">City</label>
                      <input {...branchForm.register('city')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">State</label>
                      <input {...branchForm.register('state')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Country</label>
                      <input {...branchForm.register('country')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Phone</label>
                      <input {...branchForm.register('phone')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Pincode</label>
                      <input {...branchForm.register('pincode')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <button type="submit" disabled={createBranchMutation.isPending} className="w-full py-2 bg-amber-500 text-slate-950 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex justify-center items-center gap-2">
                    {createBranchMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Branch
                  </button>
                </form>
                )
              )}

              {tab === 'designations' && (
                <form onSubmit={desigForm.handleSubmit((d) => createDesigMutation.mutate(d))} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Designation Title</label>
                    <input {...desigForm.register('title')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. Senior Developer" />
                    {desigForm.formState.errors.title && <p className="text-xs text-rose-500">{desigForm.formState.errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Grade/Band</label>
                    <input {...desigForm.register('grade')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder="e.g. Band 4" />
                  </div>
                  <button type="submit" disabled={createDesigMutation.isPending} className="w-full py-2 bg-amber-500 text-slate-950 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex justify-center items-center gap-2">
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
                    <input {...masterForm.register('value')} className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-amber-500" placeholder={tab === 'categories' ? 'e.g. Permanent' : 'e.g. Grade A'} />
                  </div>
                  <button type="submit" disabled={createMasterMutation.isPending} className="w-full py-2 bg-amber-500 text-slate-950 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex justify-center items-center gap-2">
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

      {/* ========================================================================= */}
      {/* ASSIGN EMPLOYEES MODAL                                                    */}
      {/* ========================================================================= */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Workforce to ${activeEntity.defaultName}`}
        size="xl"
      >
        <div className="space-y-6">
          <p className="text-xs text-[var(--text-muted)]">
            Select employees from across the Lords And Kings Group to assign them to <strong>{activeEntity.defaultName}</strong>. Historical records are preserved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Search by employee name, code, department, current company…"
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-2">
              <span>{selectedEmpIds.length} of {filteredGroupEmployees.length} selected</span>
            </div>
          </div>

          {/* Quick Select / Deselect All */}
          <div className="flex items-center justify-between text-xs px-1">
            <button
              type="button"
              onClick={() => {
                if (selectedEmpIds.length === filteredGroupEmployees.length) {
                  setSelectedEmpIds([]);
                } else {
                  setSelectedEmpIds(filteredGroupEmployees.map((e: any) => e.id));
                }
              }}
              className="text-purple-600 font-bold hover:underline"
            >
              {selectedEmpIds.length === filteredGroupEmployees.length ? 'Deselect All' : 'Select All Filtered'}
            </button>
            <span className="text-[var(--text-muted)]">Target: {activeEntity.defaultName}</span>
          </div>

          {/* Employee Selection List */}
          <div className="max-h-80 overflow-y-auto space-y-2 border border-[var(--border)] rounded-2xl p-2 bg-[var(--surface-alt)]/40">
            {isLoadingAllEmployees ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-purple-500" /></div>
            ) : filteredGroupEmployees.length === 0 ? (
              <div className="text-center py-10 text-xs text-[var(--text-muted)]">
                No employees found matching your search.
              </div>
            ) : (
              filteredGroupEmployees.map((emp: any) => {
                const isSelected = selectedEmpIds.includes(emp.id);
                const isAlreadyInCompany = emp.companyId === activeCompanyId;
                return (
                  <label
                    key={emp.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500/10 border-purple-500'
                        : isAlreadyInCompany
                        ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmpIds([...selectedEmpIds, emp.id]);
                          } else {
                            setSelectedEmpIds(selectedEmpIds.filter((id) => id !== emp.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {emp.firstName} {emp.lastName}
                          <span className="ml-2 font-mono text-[10px] text-purple-600">({emp.employeeCode || emp.employeeId || '—'})</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {emp.designation?.title || 'No Designation'} · {emp.department?.name || 'No Dept'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAlreadyInCompany
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {emp.company?.displayName || emp.company?.name || 'Unassigned'}
                      </span>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Transfer Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">Effective Date</label>
              <input
                type="date"
                value={assignEffectiveDate}
                onChange={(e) => setAssignEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">Reason / Note</label>
              <input
                type="text"
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="Reason for assignment / transfer"
                className="w-full px-3 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedEmpIds.length === 0 || assignEmployeesMutation.isPending || !activeCompanyId}
              onClick={() => {
                if (activeCompanyId) {
                  assignEmployeesMutation.mutate({
                    companyId: activeCompanyId,
                    employeeIds: selectedEmpIds,
                    reason: assignReason,
                    effectiveFrom: assignEffectiveDate,
                  });
                }
              }}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-md shadow-purple-500/20"
            >
              {assignEmployeesMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              Assign {selectedEmpIds.length} Selected to {activeEntity.defaultName}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Company Modal */}
      <CompanyFormModal
        open={addCompanyModalOpen}
        mode="add"
        onClose={() => setAddCompanyModalOpen(false)}
      />

    </div>
  );
}
