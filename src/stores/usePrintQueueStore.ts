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
  incrementCantidad: (id: string) => void;
  decrementCantidad: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  updateItemName: (id: string, name: string) => void;
  updateItem: (id: string, updates: Partial<PrintQueueItem>) => void;
  clearQueue: () => void;
  markBatchAsPrinted: () => void;
  posterItem: PrintQueueItem | null;
  setPosterItem: (item: PrintQueueItem | null) => void;
}

export const usePrintQueueStore = create<PrintQueueState>((set) => ({
  queue: [],
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
            quantity: item.cantidad ?? item.quantity ?? 1,
            cantidad: item.cantidad ?? item.quantity ?? 1,
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

  incrementCantidad: (id) =>
    set((state) => ({
      queue: state.queue.map((item) => {
        if (item.id === id) {
          const current = item.cantidad ?? item.quantity ?? 1;
          const updated = current + 1;
          return { ...item, cantidad: updated, quantity: updated };
        }
        return item;
      }),
    })),

  decrementCantidad: (id) =>
    set((state) => ({
      queue: state.queue.map((item) => {
        if (item.id === id) {
          const current = item.cantidad ?? item.quantity ?? 1;
          const updated = Math.max(1, current - 1);
          return { ...item, cantidad: updated, quantity: updated };
        }
        return item;
      }),
    })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      queue: state.queue.map((item) => {
        if (item.id === id) {
          const updated = Math.max(1, quantity);
          return { ...item, cantidad: updated, quantity: updated };
        }
        return item;
      }),
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
