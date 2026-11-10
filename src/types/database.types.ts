export type UserRole = 'owner' | 'admin' | 'supervisor' | 'operator';
export type PromoType = 'none' | 'strikethrough' | 'two_for_one' | 'second_50' | 'custom';
export type MarketingTemplate = 'normal' | 'oferta_tachada' | 'dos_por_uno' | 'segunda_50';
export type PrintStatus = 'pending' | 'printed' | 'discarded';
export type PrintSource = 'manual' | 'bulk_import' | 'scanner_mobile' | 'price_change_auto' | 'relevamiento_pasillo';
export type PrintMode = 'a4_sheet' | 'thermal_58mm' | 'thermal_80mm';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color: string;
  accent_color: string;
  header_title: string;
  created_at?: string;
  updated_at?: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  address?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  default_branch_id?: string | null;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export interface Product {
  id: string;
  organization_id: string;
  barcode: string;
  internal_sku?: string;
  name: string;
  description?: string;
  category?: string;
  box_quantity?: string;
  unit_measure?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BranchPrice {
  id: string;
  organization_id: string;
  branch_id: string;
  product_id: string;
  current_price: number;
  previous_price?: number | null;
  promo_type: PromoType;
  promo_detail?: string | null;
  updated_by?: string;
  updated_at?: string;
  product?: Product;
}

export interface PrintQueueItem {
  id: string;
  organization_id: string;
  branch_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  current_price: number;
  previous_price?: number | null;
  promo_type: PromoType;
  template_type?: MarketingTemplate;
  promo_detail?: string | null;
  box_quantity?: string | null;
  quantity: number;
  status: PrintStatus;
  source: PrintSource;
  preferred_mode: PrintMode;
  foto_url?: string | null;
  needs_name_review?: boolean;
  price_raw?: string | null;
  repositor?: string | null;
  created_by?: string;
  created_at?: string;
  printed_at?: string | null;
}

export interface FlejePendiente {
  id: string;
  organization_id?: string;
  branch_id?: string;
  codigo_barra: string;
  precio_nuevo: number;
  foto_url?: string | null;
  nombre_producto?: string | null;
  repositor?: string | null;
  estado?: 'pendiente' | 'incorporado' | 'descartado';
  created_at?: string;
  created_by?: string;
}
