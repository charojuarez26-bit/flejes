import { create } from 'zustand';
import { Organization, Branch } from '../types/database.types';

interface TenantState {
  organization: Organization;
  branches: Branch[];
  activeBranchId: string;
  currentOrganizationId: string | null;
  currentBranchId: string | null;
  currentRepositor: { id: string; name: string } | null;
  whiteLabelName: string | null;
  branchName: string | null;
  branchAddress: string | null;
  tradeName: string;
  brandColor: string;
  brandAccent: string;
  setBranding: (tradeName: string, brandColor: string, brandAccent?: string) => void;
  setWhiteLabelName: (whiteLabelName: string | null) => void;
  setBranchInfo: (branchName: string | null, branchAddress: string | null) => void;
  updateOrganization: (org: Partial<Organization>) => void;
  setActiveBranchId: (branchId: string) => void;
  setCurrentOrganization: (orgId: string | null) => void;
  setCurrentBranch: (branchId: string | null) => void;
  setCurrentRepositor: (repositor: { id: string; name: string } | null) => void;
  addBranch: (branch: Omit<Branch, 'id' | 'organization_id'>) => void;
}

const DEFAULT_ORG: Organization = {
  id: 'org-demo-1',
  name: 'Todo Golosinas',
  slug: 'golosinas',
  header_title: 'TODO GOLOSINAS',
  primary_color: '#0f172a',
  accent_color: '#f59e0b',
  logo_url: null,
};

const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'branch-1',
    organization_id: 'org-demo-1',
    name: 'Sucursal Central (Av. Corrientes)',
    code: 'SUC-01',
    address: 'Av. Corrientes 1420',
    is_active: true,
  },
  {
    id: 'branch-2',
    organization_id: 'org-demo-1',
    name: 'Sucursal Norte (Belgrano)',
    code: 'SUC-02',
    address: 'Av. Cabildo 2250',
    is_active: true,
  },
];

export const useTenantStore = create<TenantState>((set) => ({
  organization: DEFAULT_ORG,
  branches: DEFAULT_BRANCHES,
  activeBranchId: DEFAULT_BRANCHES[0].id,
  currentOrganizationId: typeof window !== 'undefined' ? localStorage.getItem('current_organization_id') || null : null,
  currentBranchId: typeof window !== 'undefined' ? localStorage.getItem('current_branch_id') || null : null,
  currentRepositor: typeof window !== 'undefined' && localStorage.getItem('current_repositor')
    ? (() => {
        try {
          return JSON.parse(localStorage.getItem('current_repositor') || 'null');
        } catch {
          return null;
        }
      })()
    : null,
  whiteLabelName: typeof window !== 'undefined'
    ? localStorage.getItem('whiteLabelName') || localStorage.getItem('white_label_name') || null
    : null,
  branchName: typeof window !== 'undefined'
    ? localStorage.getItem('branch_name') || null
    : null,
  branchAddress: typeof window !== 'undefined'
    ? localStorage.getItem('branch_address') || null
    : null,
  tradeName: typeof window !== 'undefined' && (localStorage.getItem('whiteLabelName') || localStorage.getItem('white_label_name'))
    ? (localStorage.getItem('whiteLabelName') || localStorage.getItem('white_label_name')!)
    : DEFAULT_ORG.header_title,
  brandColor: DEFAULT_ORG.primary_color,
  brandAccent: DEFAULT_ORG.accent_color,

  setBranding: (tradeName, brandColor, brandAccent = '#f59e0b') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whiteLabelName', tradeName);
      localStorage.setItem('white_label_name', tradeName);
    }
    set((state) => ({
      tradeName,
      whiteLabelName: tradeName,
      brandColor,
      brandAccent,
      organization: {
        ...state.organization,
        name: tradeName,
        header_title: tradeName,
        primary_color: brandColor,
        accent_color: brandAccent,
      },
    }));
  },

  setWhiteLabelName: (whiteLabelName) => {
    if (typeof window !== 'undefined') {
      if (whiteLabelName) {
        localStorage.setItem('whiteLabelName', whiteLabelName);
        localStorage.setItem('white_label_name', whiteLabelName);
      } else {
        localStorage.removeItem('whiteLabelName');
        localStorage.removeItem('white_label_name');
      }
    }
    set((state) => ({
      whiteLabelName,
      tradeName: whiteLabelName || state.tradeName,
      organization: {
        ...state.organization,
        header_title: whiteLabelName || state.organization.header_title,
      },
    }));
  },

  setBranchInfo: (branchName, branchAddress) => {
    if (typeof window !== 'undefined') {
      if (branchName) {
        localStorage.setItem('branch_name', branchName);
      } else {
        localStorage.removeItem('branch_name');
      }
      if (branchAddress) {
        localStorage.setItem('branch_address', branchAddress);
      } else {
        localStorage.removeItem('branch_address');
      }
    }
    set({ branchName, branchAddress });
  },

  updateOrganization: (updated) =>
    set((state) => ({
      organization: { ...state.organization, ...updated },
      tradeName: updated.header_title || updated.name || state.tradeName,
      brandColor: updated.primary_color || state.brandColor,
      brandAccent: updated.accent_color || state.brandAccent,
    })),

  setActiveBranchId: (activeBranchId) => set({ activeBranchId, currentBranchId: activeBranchId }),

  setCurrentOrganization: (currentOrganizationId) => {
    if (typeof window !== 'undefined') {
      if (currentOrganizationId) {
        localStorage.setItem('current_organization_id', currentOrganizationId);
      } else {
        localStorage.removeItem('current_organization_id');
      }
    }
    set({ currentOrganizationId });
  },

  setCurrentBranch: (currentBranchId) => {
    if (typeof window !== 'undefined') {
      if (currentBranchId) {
        localStorage.setItem('current_branch_id', currentBranchId);
      } else {
        localStorage.removeItem('current_branch_id');
      }
    }
    set({ currentBranchId });
  },

  setCurrentRepositor: (currentRepositor) => {
    if (typeof window !== 'undefined') {
      if (currentRepositor) {
        localStorage.setItem('current_repositor', JSON.stringify(currentRepositor));
        localStorage.setItem('repositor_nombre', currentRepositor.name);
        localStorage.setItem('repositorName', currentRepositor.name);
      } else {
        localStorage.removeItem('current_repositor');
        localStorage.removeItem('repositor_nombre');
        localStorage.removeItem('repositorName');
      }
    }
    set({ currentRepositor });
  },

  addBranch: (newBranchData) =>
    set((state) => {
      const newBranch: Branch = {
        ...newBranchData,
        id: `branch-${Date.now()}`,
        organization_id: state.organization.id,
      };
      return { branches: [...state.branches, newBranch] };
    }),
}));
