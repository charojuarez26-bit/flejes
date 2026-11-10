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
 * Inserta un fleje de texto desde el celular directamente en Supabase (tabla products y print_queue).
 */
export const insertMobileEntry = async (payload: MobileEntryPayload): Promise<PrintQueueItem> => {
  const orgId = payload.organization_id || '897d0beb-801d-4977-bc31-9b7e59def150';
  const branchId = payload.branch_id || '270dc478-e0fc-48d8-93c2-827a4e425175';
  const barcode = generateEan13();
  const trimmedName = payload.name.trim();

  let productId = `prod-${Date.now()}`;
  let queueId = `pq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let createdAt = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      // 1. Dar de alta el producto en el catálogo maestro
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .insert({
          organization_id: orgId,
          barcode: barcode,
          name: trimmedName,
          box_quantity: payload.box_quantity ? payload.box_quantity.trim() : null,
          description: payload.repositor ? `repositor:${payload.repositor.trim()}` : null,
        })
        .select()
        .single();

      if (!prodErr && prodData) {
        productId = prodData.id;
      } else if (prodErr) {
        console.warn('Advertencia al insertar en products:', prodErr.message);
      }

      // 2. Insertar en la cola de impresión en tiempo real
      const queueInsertPayload: Record<string, unknown> = {
        organization_id: orgId,
        branch_id: branchId,
        product_id: productId,
        current_price: payload.current_price,
        previous_price: payload.previous_price || null,
        box_quantity: payload.box_quantity ? payload.box_quantity.trim() : null,
        quantity: 1,
        status: 'pending',
        source: 'scanner_mobile',
        preferred_mode: 'a4_sheet',
        promo_type: payload.previous_price ? 'strikethrough' : 'none',
      };
      if (payload.repositor) {
        queueInsertPayload.repositor = payload.repositor.trim();
      }

      let { data: queueData, error: queueErr } = await supabase
        .from('print_queue')
        .insert(queueInsertPayload)
        .select()
        .single();

      // Si la columna repositor aún no existe en print_queue, reintentar sin ese campo
      if (queueErr && queueErr.message?.includes('repositor')) {
        delete queueInsertPayload.repositor;
        const retry = await supabase
          .from('print_queue')
          .insert(queueInsertPayload)
          .select()
          .single();
        queueData = retry.data;
        queueErr = retry.error;
      }

      if (!queueErr && queueData) {
        queueId = queueData.id;
        createdAt = queueData.created_at;
      } else if (queueErr) {
        console.warn('Advertencia al insertar en print_queue:', queueErr.message);
      }
    } catch (dbErr) {
      console.warn('Error de conexión a Supabase al insertar fleje móvil:', dbErr);
    }
  }

  const newItem: PrintQueueItem = {
    id: queueId,
    organization_id: orgId,
    branch_id: branchId,
    product_id: productId,
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
 * Suscribe la aplicación a eventos de inserción en print_queue por WebSockets de Supabase Realtime.
 */
export const subscribeToPrintQueueRealtime = (
  onItemReceived: (item: PrintQueueItem) => void
): (() => void) => {
  let supabaseChannel: ReturnType<typeof supabase.channel> | null = null;

  if (isSupabaseConfigured) {
    try {
      supabaseChannel = supabase
        .channel('print_queue_websocket')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'print_queue',
          },
          async (payload) => {
            console.log('⚡ Evento WebSocket Supabase Realtime INSERT en print_queue:', payload.new);
            const row = payload.new as Record<string, unknown>;

            // Consultar datos del producto relacionado
            let productName = 'Artículo de Góndola';
            let barcode = generateEan13();
            let repositorName: string | null = (row.repositor as string) || null;

            if (row.product_id) {
              const { data: prod } = await supabase
                .from('products')
                .select('name, barcode, box_quantity, description')
                .eq('id', row.product_id as string)
                .maybeSingle();

              if (prod) {
                productName = prod.name;
                barcode = prod.barcode;
                if (!repositorName && prod.description && prod.description.startsWith('repositor:')) {
                  repositorName = prod.description.replace('repositor:', '').trim();
                }
              }
            }

            const currentPrice = Number(row.current_price) || 0;
            const previousPrice = row.previous_price ? Number(row.previous_price) : null;

            const newItem: PrintQueueItem = {
              id: (row.id as string) || `pq-${Date.now()}`,
              organization_id: (row.organization_id as string) || 'org-demo-1',
              branch_id: (row.branch_id as string) || 'branch-1',
              product_id: (row.product_id as string) || `prod-${Date.now()}`,
              product_name: productName,
              barcode: barcode,
              current_price: currentPrice,
              previous_price: previousPrice,
              promo_type: previousPrice ? 'strikethrough' : 'none',
              template_type: previousPrice ? 'oferta_tachada' : 'normal',
              box_quantity: (row.box_quantity as string) || null,
              quantity: (row.quantity as number) || 1,
              status: 'pending',
              source: 'scanner_mobile',
              preferred_mode: 'a4_sheet',
              repositor: repositorName,
              created_at: (row.created_at as string) || new Date().toISOString(),
            };

            onItemReceived(newItem);
          }
        )
        .subscribe((status) => {
          console.log('Estado de conexión Supabase Realtime (print_queue):', status);
        });
    } catch (err) {
      console.warn('Error inicializando canal Realtime en print_queue:', err);
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
