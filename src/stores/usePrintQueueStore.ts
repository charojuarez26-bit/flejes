import { create } from 'zustand';
import { PrintQueueItem, PrintMode, FlejePendiente } from '../types/database.types';

interface PrintQueueState {
  queue: PrintQueueItem[];
  printMode: PrintMode;
  setPrintMode: (mode: PrintMode) => void;
  addItem: (item: Partial<PrintQueueItem> & { product_name: string; current_price: number }) => void;
  addBatch: (items: Omit<PrintQueueItem, 'id' | 'created_at' | 'status'>[]) => void;
  addFromRelevamiento: (item: FlejePendiente) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  updateItemName: (id: string, name: string) => void;
  updateItem: (id: string, updates: Partial<PrintQueueItem>) => void;
  clearQueue: () => void;
  markBatchAsPrinted: () => void;
  posterItem: PrintQueueItem | null;
  setPosterItem: (item: PrintQueueItem | null) => void;
}

const INITIAL_QUEUE_SAMPLE: PrintQueueItem[] = [
  {
    id: 'pq-1',
    organization_id: 'org-demo-1',
    branch_id: 'branch-1',
    product_id: 'p-1',
    product_name: 'Alfajor Havanna Mixto 90g',
    barcode: '7790040123456',
    current_price: 1850,
    previous_price: 2200,
    promo_type: 'strikethrough',
    box_quantity: '12 u.',
    quantity: 1,
    status: 'pending',
    source: 'manual',
    preferred_mode: 'a4_sheet',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pq-2',
    organization_id: 'org-demo-1',
    branch_id: 'branch-1',
    product_id: 'p-2',
    product_name: 'Caramelos Sugus Confitados 50g',
    barcode: '7790040654321',
    current_price: 750,
    previous_price: null,
    promo_type: 'none',
    box_quantity: '24 u.',
    quantity: 1,
    status: 'pending',
    source: 'manual',
    preferred_mode: 'a4_sheet',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pq-3',
    organization_id: 'org-demo-1',
    branch_id: 'branch-1',
    product_id: 'p-3',
    product_name: 'Chocolate Cadbury Frutilla 150g',
    barcode: '7790040987654',
    current_price: 3400,
    previous_price: 3900,
    promo_type: 'two_for_one',
    promo_detail: '2x1 Llevando 2',
    box_quantity: '16 u.',
    quantity: 1,
    status: 'pending',
    source: 'manual',
    preferred_mode: 'a4_sheet',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pq-4',
    organization_id: 'org-demo-1',
    branch_id: 'branch-1',
    product_id: 'p-4',
    product_name: 'Chicles Beldent Menta 10g',
    barcode: '7790040112233',
    current_price: 650,
    previous_price: null,
    promo_type: 'none',
    box_quantity: '20 u.',
    quantity: 1,
    status: 'pending',
    source: 'manual',
    preferred_mode: 'a4_sheet',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pq-5',
    organization_id: 'org-demo-1',
    branch_id: 'branch-1',
    product_id: 'p-5',
    product_name: 'Turrón Arcor Maní y Miel 25g',
    barcode: '7790040445566',
    current_price: 420,
    previous_price: null,
    promo_type: 'none',
    box_quantity: '50 u.',
    quantity: 1,
    status: 'pending',
    source: 'manual',
    preferred_mode: 'a4_sheet',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pq-6',
    organization_id: 'org-demo-1',
    branch_id: 'branch-1',
    product_id: 'p-6',
    product_name: 'Gomitas Mogul Ositos Ácidos 100g',
    barcode: '7790040778899',
    current_price: 1250,
    previous_price: 1500,
    promo_type: 'second_50',
    promo_detail: '2da al 50%',
    box_quantity: '12 u.',
    quantity: 1,
    status: 'pending',
    source: 'manual',
    preferred_mode: 'a4_sheet',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pq-7',
    organization_id: 'org-demo-1',
    branch_id: 'branch-1',
    product_id: 'p-7',
    product_name: 'Alfajor Guaymallén Triple Blanco',
    barcode: '7790040332211',
    current_price: 550,
    previous_price: null,
    promo_type: 'none',
    box_quantity: '24 u.',
    quantity: 1,
    status: 'pending',
    source: 'manual',
    preferred_mode: 'a4_sheet',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pq-8',
    organization_id: 'org-demo-1',
    branch_id: 'branch-1',
    product_id: 'p-8',
    product_name: 'Bon o Bon Leche Display 15g',
    barcode: '7790040998877',
    current_price: 480,
    previous_price: null,
    promo_type: 'none',
    box_quantity: '30 u.',
    quantity: 1,
    status: 'pending',
    source: 'manual',
    preferred_mode: 'a4_sheet',
    created_at: new Date().toISOString(),
  },
];

export const usePrintQueueStore = create<PrintQueueState>((set) => ({
  queue: INITIAL_QUEUE_SAMPLE,
  printMode: 'a4_sheet',

  setPrintMode: (printMode) => set({ printMode }),

  addItem: (item) =>
    set((state) => {
      const explicitId = (item as Partial<PrintQueueItem>).id;
      if (explicitId && state.queue.some((q) => q.id === explicitId)) {
        return state;
      }
      return {
        queue: [
          ...state.queue,
          {
            organization_id: '897d0beb-801d-4977-bc31-9b7e59def150',
            branch_id: '270dc478-e0fc-48d8-93c2-827a4e425175',
            product_id: `prod-${Date.now()}`,
            barcode: '7790000000000',
            previous_price: null,
            promo_type: 'none',
            template_type: 'normal',
            quantity: 1,
            source: 'manual',
            preferred_mode: 'a4_sheet',
            ...item,
            id: explicitId || `pq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            status: item.status || 'pending',
            created_at: item.created_at || new Date().toISOString(),
          },
        ],
      };
    }),

  addBatch: (newItems) =>
    set((state) => ({
      queue: [
        ...state.queue,
        ...newItems.map((item, idx) => ({
          ...item,
          id: `pq-${Date.now()}-${idx}`,
          status: 'pending' as const,
          created_at: new Date().toISOString(),
        })),
      ],
    })),

  addFromRelevamiento: (item) =>
    set((state) => {
      // Evitar duplicados por id o código si ya existe recientemente
      const exists = state.queue.some(
        (q) => q.id === `pq-relev-${item.id}` || (q.source === 'relevamiento_pasillo' && q.id === item.id)
      );
      if (exists) return state;

      const newItem: PrintQueueItem = {
        id: `pq-relev-${item.id}`,
        organization_id: item.organization_id || 'org-demo-1',
        branch_id: item.branch_id || 'branch-1',
        product_id: item.id,
        product_name: item.nombre_producto?.trim() || '[Pendiente Nombre - Ver Foto]',
        barcode: item.codigo_barra,
        current_price: Number(item.precio_nuevo),
        previous_price: null,
        promo_type: 'none',
        template_type: 'normal',
        quantity: 1,
        status: 'pending',
        source: 'relevamiento_pasillo',
        preferred_mode: 'a4_sheet',
        foto_url: item.foto_url,
        needs_name_review: !item.nombre_producto?.trim(),
        repositor: item.repositor || null,
        created_at: item.created_at || new Date().toISOString(),
      };

      return {
        queue: [...state.queue, newItem],
      };
    }),

  updateItemName: (id, name) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              product_name: name.trim() || item.product_name,
              needs_name_review: false,
            }
          : item
      ),
    })),

  updateItem: (id, updates) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    })),

  clearQueue: () => set({ queue: [] }),

  posterItem: null,
  setPosterItem: (posterItem) => set({ posterItem }),

  markBatchAsPrinted: () =>
    set((state) => ({
      queue: state.queue.map((item) => ({
        ...item,
        status: 'printed' as const,
        printed_at: new Date().toISOString(),
      })),
    })),
}));
