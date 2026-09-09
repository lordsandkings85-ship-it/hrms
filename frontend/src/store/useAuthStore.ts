import { create } from 'zustand';
import { queryClient } from '../api/queryClient';

export interface UserProfile {
  id: string;
  companyId: string;
  email: string;
  isSuperAdmin: boolean;
  canApproveApproval?: boolean;
  roleId?: string;
  role?: {
    id: string;
    name: string;
    isSystem: boolean;
  };
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    photoUrl?: string | null;
    uan?: string;
    esic?: string;
    pfNumber?: string;
    pan?: string;
    aadhaar?: string;
    status: string;
    workingDaysPerWeek?: number;
  };
  company?: {
    name: string;
    panNumber?: string;
    gstNumber?: string;
    address?: string;
  };
  companies?: {
    id: string;
    name: string;
    displayName?: string | null;
    legalName?: string | null;
    label?: string;
    status?: string;
  }[];
  activeCompanyId?: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  activeCompanyId?: string;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  switchCompany: (companyId: string) => void;
  logout: () => void;
}

const ACTIVE_COMPANY_KEY = 'activeCompanyId';

export function getActiveCompanyId(user: UserProfile | null): string | null {
  if (!user) return localStorage.getItem(ACTIVE_COMPANY_KEY);
  const stored = localStorage.getItem(ACTIVE_COMPANY_KEY);
  const companies = user.companies ?? [];
  if (stored && companies.some((c) => c.id === stored)) return stored;
  return user.activeCompanyId ?? user.companyId ?? companies[0]?.id ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => {
    const active = getActiveCompanyId(user);
    set({ user, activeCompanyId: active ?? undefined });
  },
  setLoading: (isLoading) => set({ isLoading }),
  switchCompany: (companyId) => {
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
    set({ activeCompanyId: companyId });
    queryClient.clear();
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    queryClient.clear();
    set({ user: null });
  },
}));
