import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PrintQueueItem } from '../../types/database.types';
import { useTenantStore } from '../../stores/useTenantStore';

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
  repositor_id?: string | null;
  organization_id?: string | null;
  branch_id?: string | null;
}

/**
 * Inserta un fleje de texto desde el celular directamente en Supabase (tabla flejes_pendientes).
 * Incluye organization_id, branch_id y repositor_id según la arquitectura multi-tenant.
 */
export const insertMobileEntry = async (payload: MobileEntryPayload): Promise<PrintQueueItem> => {
  const tenantState = useTenantStore.getState();
  const currentOrgId = payload.organization_id !== undefined
    ? payload.organization_id
    : tenantState.currentOrganizationId;
  const currentBranchId = payload.branch_id !== undefined
    ? payload.branch_id
    : tenantState.currentBranchId;

  const orgId = currentOrgId || '897d0beb-801d-4977-bc31-9b7e59def150';
  const branchId = currentBranchId || '270dc478-e0fc-48d8-93c2-827a4e425175';
  const barcode = generateEan13();
  const trimmedName = payload.name.trim();

  let queueId = `pq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let createdAt = new Date().toISOString();

  const repositorId = payload.repositor_id !== undefined
    ? payload.repositor_id
    : tenantState.currentRepositor?.id;
  const repositorName = payload.repositor !== undefined
    ? payload.repositor
    : tenantState.currentRepositor?.name;

  // Construcción del objeto coincidiendo con las columnas de flejes_pendientes (incluyendo multi-tenant)
  const insertPayload: Record<string, unknown> = {
    nombre: trimmedName,
    precio: payload.current_price,
    organization_id: currentOrgId ?? null,
    branch_id: currentBranchId ?? null,
  };

  if (repositorId) {
    insertPayload.repositor_id = repositorId;
  }

  if (payload.previous_price != null && !isNaN(payload.previous_price)) {
    insertPayload.precio_anterior = payload.previous_price;
  }

  if (payload.box_quantity && payload.box_quantity.trim()) {
    insertPayload.cantidad_caja = payload.box_quantity.trim();
  }

  if (repositorName && repositorName.trim()) {
    insertPayload.repositor = repositorName.trim();
  }

  if (isSupabaseConfigured) {
    try {
      // Blindaje de seguridad: Validar si la organización sigue activa antes de insertar
      let effectiveOrgId = currentOrgId;
      if (!effectiveOrgId && currentBranchId) {
        const { data: bData } = await supabase
          .from('branches')
          .select('organization_id')
          .eq('id', currentBranchId)
          .maybeSingle();
        if (bData?.organization_id) {
          effectiveOrgId = bData.organization_id;
        }
      }

      if (effectiveOrgId) {
        const { data: orgStatusData } = await supabase
          .from('organizations')
          .select('subscription_status, next_billing_date')
          .eq('id', effectiveOrgId)
          .maybeSingle();

        if (orgStatusData) {
          let isBillingCurrent = true;
          if (orgStatusData.next_billing_date) {
            const cleanDate = String(orgStatusData.next_billing_date).split('T')[0];
            const parts = cleanDate.split('-');
            if (parts.length === 3) {
              const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
              isBillingCurrent = dueDate.getTime() >= Date.now();
            }
          }

          if (orgStatusData.subscription_status !== 'active' || !isBillingCurrent) {
            // Forzar cierre de sesión y purga de caché
            tenantState.setCurrentRepositor(null);
            tenantState.setCurrentBranch(null);
            tenantState.setCurrentOrganization(null);
            tenantState.setWhiteLabelName(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('current_repositor');
              localStorage.removeItem('repositor_nombre');
              localStorage.removeItem('repositorName');
              localStorage.removeItem('current_organization_id');
              localStorage.removeItem('current_branch_id');
              localStorage.removeItem('white_label_name');
              localStorage.removeItem('whiteLabelName');
              localStorage.removeItem('branch_name');
              localStorage.removeItem('organization_name');
            }
            throw new Error('Acción bloqueada: cuenta suspendida');
          }
        }
      }

      const { data, error } = await supabase
        .from('flejes_pendientes')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        // Fallback si la columna repositor_id todavía no existe en flejes_pendientes
        if ((error.code === '42703' || error.message?.includes('repositor_id')) && insertPayload.repositor_id) {
          console.warn("Columna repositor_id no encontrada en flejes_pendientes, reintentando sin ella...");
          delete insertPayload.repositor_id;
          const retryRes = await supabase
            .from('flejes_pendientes')
            .insert([insertPayload])
            .select()
            .single();

          if (retryRes.error) {
            console.error("Error en Supabase tras reintento:", retryRes.error);
            throw retryRes.error;
          }

          if (retryRes.data) {
            const row = retryRes.data as Record<string, unknown>;
            if (row.id) queueId = String(row.id);
            if (row.created_at) createdAt = String(row.created_at);
          }
        } else {
          console.error("Error en Supabase:", error);
          throw error;
        }
      } else if (data) {
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
 * Consulta la cola de flejes pendientes en Supabase (tabla flejes_pendientes) filtrando ÚNICAMENTE por branch_id.
 */
export const fetchPendingFlejes = async (
  currentBranchId: string
): Promise<PrintQueueItem[]> => {
  if (!isSupabaseConfigured || !currentBranchId) return [];

  try {
    const { data, error } = await supabase
      .from('flejes_pendientes')
      .select('*')
      .eq('branch_id', currentBranchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error exacto Supabase al consultar flejes_pendientes por sucursal:", error.message, error.details, error.hint);
      return [];
    }

    return (data || []).map((row: any) => {
      const productName = String(row.nombre || row.nombre_producto || 'Artículo de Góndola');
      const currentPrice = Number(row.precio != null ? row.precio : row.precio_nuevo) || 0;
      const previousPrice = row.precio_anterior != null ? Number(row.precio_anterior) : null;
      const boxQuantity = (row.cantidad_caja as string) || (row.box_quantity as string) || null;
      const repositorName = (row.repositor as string) || null;
      const barcode = (row.codigo_barra as string) || generateEan13();

      return {
        id: String(row.id || `pq-${Date.now()}`),
        organization_id: (row.organization_id as string) || 'org-demo-1',
        branch_id: String(row.branch_id || currentBranchId),
        product_id: String(row.id || `prod-${Date.now()}`),
        product_name: productName,
        barcode: barcode,
        current_price: currentPrice,
        previous_price: previousPrice,
        promo_type: previousPrice ? 'strikethrough' : 'none',
        template_type: previousPrice ? 'oferta_tachada' : 'normal',
        box_quantity: boxQuantity,
        quantity: (row.quantity as number) || 1,
        status: (row.estado as any) || 'pending',
        source: 'scanner_mobile',
        preferred_mode: 'a4_sheet',
        foto_url: (row.foto_url as string) || undefined,
        needs_name_review: !row.nombre && !row.nombre_producto,
        repositor: repositorName,
        created_at: (row.created_at as string) || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error("Error al leer flejes_pendientes:", err);
    return [];
  }
};

/**
 * Suscribe la aplicación a eventos de inserción en flejes_pendientes por WebSockets de Supabase Realtime.
 * Aplica filtro estricto por branch_id: 'branch_id=eq.' + currentBranchId
 */
export const subscribeToPrintQueueRealtime = (
  onItemReceived: (item: PrintQueueItem) => void,
  currentBranchId: string
): (() => void) => {
  let supabaseChannel: ReturnType<typeof supabase.channel> | null = null;

  if (isSupabaseConfigured && currentBranchId) {
    try {
      const channelName = `flejes_branch_${currentBranchId}`;

      supabaseChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'flejes_pendientes',
            filter: 'branch_id=eq.' + currentBranchId,
          },
          (payload) => {
            console.log('⚡ Evento WebSocket Supabase Realtime INSERT para sucursal:', currentBranchId, payload.new);
            const row = (payload.new || {}) as Record<string, unknown>;

            // Descartar si el branch_id no coincide estrictamente con este terminal
            if (row.branch_id && String(row.branch_id) !== String(currentBranchId)) {
              return;
            }

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
