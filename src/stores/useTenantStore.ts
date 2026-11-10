import { create } from 'zustand';
import { Organization, Branch } from '../types/database.types';

interface TenantState {
  organization: Organization;
  branches: Branch[];
  activeBranchId: string;
  tradeName: string;
  brandColor: string;
  brandAccent: string;
  setBranding: (tradeName: string, brandColor: string, brandAccent?: string) => void;
  updateOrganization: (org: Partial<Organization>) => void;
  setActiveBranchId: (branchId: string) => void;
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
  tradeName: DEFAULT_ORG.header_title,
  brandColor: DEFAULT_ORG.primary_color,
  brandAccent: DEFAULT_ORG.accent_color,

  setBranding: (tradeName, brandColor, brandAccent = '#f59e0b') =>
    set((state) => ({
      tradeName,
      brandColor,
      brandAccent,
      organization: {
        ...state.organization,
        name: tradeName,
        header_title: tradeName,
        primary_color: brandColor,
        accent_color: brandAccent,
      },
    })),

  updateOrganization: (updated) =>
    set((state) => ({
      organization: { ...state.organization, ...updated },
      tradeName: updated.header_title || updated.name || state.tradeName,
      brandColor: updated.primary_color || state.brandColor,
      brandAccent: updated.accent_color || state.brandAccent,
    })),

  setActiveBranchId: (activeBranchId) => set({ activeBranchId }),

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
