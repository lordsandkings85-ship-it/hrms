import { create } from 'zustand';
import { queryClient } from '../api/queryClient';

export interface UserProfile {
  id: string;
  companyId: string;
  email: string;
  isSuperAdmin: boolean;
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
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    queryClient.clear();
    set({ user: null });
  },
}));
