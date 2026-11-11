import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PrintQueueItem } from '../../types/database.types';

const BROADCAST_QUEUE_CHANNEL = 'flejes_print_queue_realtime';

// Generador de código de barras EAN-13 válido con dígito verificador
export const generateEan13 = (): string => {
  let code = '779' + Math.floor(100000000 + Math.random() * 900000000).toString();
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit.toString();
};

export interface MobileEntryPayload {
  name: string;
  current_price: number;
  previous_price?: number | null;
  box_quantity?: string | null;
  price_raw?: string | null;
  repositor?: string | null;
  organization_id?: string;
  branch_id?: string;
}

/**
 * Inserta un fleje de texto desde el celular directamente en Supabase (tabla flejes_pendientes).
 * Columnas requeridas/opcionales: nombre, precio, precio_anterior, cantidad_caja, repositor.
 */
export const insertMobileEntry = async (payload: MobileEntryPayload): Promise<PrintQueueItem> => {
  const orgId = payload.organization_id || '897d0beb-801d-4977-bc31-9b7e59def150';
  const branchId = payload.branch_id || '270dc478-e0fc-48d8-93c2-827a4e425175';
  const barcode = generateEan13();
  const trimmedName = payload.name.trim();

  let queueId = `pq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let createdAt = new Date().toISOString();

  // Construcción del objeto coincidiendo exactamente con las columnas de flejes_pendientes
  const insertPayload: Record<string, unknown> = {
    nombre: trimmedName,
    precio: payload.current_price,
  };

  if (payload.previous_price != null && !isNaN(payload.previous_price)) {
    insertPayload.precio_anterior = payload.previous_price;
  }

  if (payload.box_quantity && payload.box_quantity.trim()) {
    insertPayload.cantidad_caja = payload.box_quantity.trim();
  }

  if (payload.repositor && payload.repositor.trim()) {
    insertPayload.repositor = payload.repositor.trim();
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('flejes_pendientes')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        console.error("Error en Supabase:", error);
        throw error;
      }

      if (data) {
        const row = data as Record<string, unknown>;
        if (row.id) queueId = String(row.id);
        if (row.created_at) createdAt = String(row.created_at);
      }
    } catch (error) {
      console.error("Error en Supabase:", error);
      throw error;
    }
  }

  const newItem: PrintQueueItem = {
    id: queueId,
    organization_id: orgId,
    branch_id: branchId,
    product_id: queueId,
    product_name: trimmedName,
    barcode: barcode,
    current_price: payload.current_price,
    previous_price: payload.previous_price || null,
    price_raw: payload.price_raw || null,
    repositor: payload.repositor?.trim() || null,
    promo_type: payload.previous_price ? 'strikethrough' : 'none',
    template_type: payload.previous_price ? 'oferta_tachada' : 'normal',
    box_quantity: payload.box_quantity ? payload.box_quantity.trim() : null,
    quantity: 1,
    status: 'pending',
    source: 'scanner_mobile',
    preferred_mode: 'a4_sheet',
    created_at: createdAt,
  };

  // Emitir evento por BroadcastChannel y CustomEvent para sincronización local instantánea
  try {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_QUEUE_CHANNEL);
        bc.postMessage({ type: 'MOBILE_ENTRY_INSERT', item: newItem });
        setTimeout(() => bc.close(), 100);
      }
      window.dispatchEvent(new CustomEvent('PRINT_QUEUE_INSERT_LOCAL', { detail: newItem }));
    }
  } catch (bcError) {
    console.warn('Error emitiendo BroadcastChannel:', bcError);
  }

  return newItem;
};

/**
 * Suscribe la aplicación a eventos de inserción en flejes_pendientes por WebSockets de Supabase Realtime.
 */
export const subscribeToPrintQueueRealtime = (
  onItemReceived: (item: PrintQueueItem) => void
): (() => void) => {
  let supabaseChannel: ReturnType<typeof supabase.channel> | null = null;

  if (isSupabaseConfigured) {
    try {
      supabaseChannel = supabase
        .channel('flejes_pendientes_realtime_ws')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'flejes_pendientes',
          },
          (payload) => {
            console.log('⚡ Evento WebSocket Supabase Realtime INSERT en flejes_pendientes:', payload.new);
            const row = (payload.new || {}) as Record<string, unknown>;

            const productName = String(row.nombre || row.nombre_producto || 'Artículo de Góndola');
            const currentPrice = Number(row.precio != null ? row.precio : row.precio_nuevo) || 0;
            const previousPrice = row.precio_anterior != null ? Number(row.precio_anterior) : null;
            const boxQuantity = (row.cantidad_caja as string) || (row.box_quantity as string) || null;
            const repositorName = (row.repositor as string) || null;
            const barcode = (row.codigo_barra as string) || generateEan13();

            const newItem: PrintQueueItem = {
              id: (row.id as string) || `pq-${Date.now()}`,
              organization_id: (row.organization_id as string) || '897d0beb-801d-4977-bc31-9b7e59def150',
              branch_id: (row.branch_id as string) || '270dc478-e0fc-48d8-93c2-827a4e425175',
              product_id: (row.id as string) || `prod-${Date.now()}`,
              product_name: productName,
              barcode: barcode,
              current_price: currentPrice,
              previous_price: previousPrice,
              promo_type: previousPrice ? 'strikethrough' : 'none',
              template_type: previousPrice ? 'oferta_tachada' : 'normal',
              box_quantity: boxQuantity,
              quantity: (row.quantity as number) || 1,
              status: 'pending',
              source: 'scanner_mobile',
              preferred_mode: 'a4_sheet',
              foto_url: (row.foto_url as string) || undefined,
              needs_name_review: !row.nombre && !row.nombre_producto,
              repositor: repositorName,
              created_at: (row.created_at as string) || new Date().toISOString(),
            };

            onItemReceived(newItem);
          }
        )
        .subscribe((status) => {
          console.log('Estado de conexión Supabase Realtime (flejes_pendientes):', status);
        });
    } catch (err) {
      console.error("Error en Supabase:", err);
    }
  }

  // Soporte BroadcastChannel para pruebas multi-pestaña
  let bc: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(BROADCAST_QUEUE_CHANNEL);
      bc.onmessage = (event) => {
        if (event.data?.type === 'MOBILE_ENTRY_INSERT' && event.data.item) {
          onItemReceived(event.data.item);
        }
      };
    } catch (err) {
      console.warn('Error configurando BroadcastChannel:', err);
    }
  }

  // Soporte CustomEvent local
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<PrintQueueItem>;
    if (custom.detail) {
      onItemReceived(custom.detail);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('PRINT_QUEUE_INSERT_LOCAL', handleLocalEvent);
  }

  return () => {
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }
    if (bc) {
      bc.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('PRINT_QUEUE_INSERT_LOCAL', handleLocalEvent);
    }
  };
};
