import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { FlejePendiente } from '../../types/database.types';

const BUCKET_NAME = 'fotos_flejes';
const BROADCAST_CHANNEL_NAME = 'flejes_relevamiento_channel';

// Fallback helper to convert a File to a Data URL (base64)
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Sube una fotografía de góndola al Storage de Supabase ('fotos_flejes').
 * Si no está conectado o falla, utiliza fallback en base64 para permitir pruebas locales continuas.
 */
export const uploadFotoFleje = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `relevamientos/${cleanName}`;

  if (isSupabaseConfigured) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg',
        });

      if (!uploadError) {
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      } else {
        console.warn('Supabase storage upload error, fallback a Data URL:', uploadError.message);
      }
    } catch (err) {
      console.warn('Error conectando a Supabase Storage:', err);
    }
  }

  // Fallback transparente: retorna Data URL local para modo sin conexión / demo
  return await fileToDataUrl(file);
};

/**
 * Inserta un nuevo relevamiento en la tabla 'flejes_pendientes' de Supabase
 * y emite un evento de broadcast en tiempo real.
 */
export const crearFlejePendiente = async (params: {
  codigo_barra: string;
  precio_nuevo: number;
  foto_url?: string | null;
  nombre_producto?: string;
  organization_id?: string;
  branch_id?: string;
  repositor?: string | null;
}): Promise<FlejePendiente> => {
  const newItem: FlejePendiente = {
    id: `relev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organization_id || 'org-demo-1',
    branch_id: params.branch_id || 'branch-1',
    codigo_barra: params.codigo_barra.trim(),
    precio_nuevo: params.precio_nuevo,
    foto_url: params.foto_url || null,
    nombre_producto: params.nombre_producto?.trim() || null,
    repositor: params.repositor?.trim() || null,
    estado: 'pendiente',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const insertRecord: Record<string, unknown> = {
        nombre: newItem.nombre_producto,
        precio: newItem.precio_nuevo,
        codigo_barra: newItem.codigo_barra,
        precio_nuevo: newItem.precio_nuevo,
        foto_url: newItem.foto_url,
        nombre_producto: newItem.nombre_producto,
        repositor: newItem.repositor,
        estado: 'pendiente',
      };

      const { data, error } = await supabase
        .from('flejes_pendientes')
        .insert([insertRecord])
        .select()
        .single();

      if (!error && data) {
        const row = data as Record<string, unknown>;
        newItem.id = String(row.id || newItem.id);
        newItem.created_at = String(row.created_at || newItem.created_at);
      } else if (error) {
        console.error("Error en Supabase:", error);
      }
    } catch (err) {
      console.error("Error en Supabase:", err);
    }
  }

  // Notificar por BroadcastChannel (otra pestaña/ventana) y CustomEvent (misma ventana)
  try {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage({ type: 'NUEVO_FLEJE_PENDIENTE', item: newItem });
        // Dar tiempo a procesar antes de cerrar
        setTimeout(() => bc.close(), 100);
      }
      window.dispatchEvent(new CustomEvent('NUEVO_FLEJE_EVENT', { detail: newItem }));
    }
  } catch (bcError) {
    console.warn('BroadcastChannel / Event error:', bcError);
  }

  return newItem;
};

/**
 * Actualiza el nombre asignado al producto tras la revisión visual en la PC.
 */
export const actualizarNombreFleje = async (id: string, nombreProducto: string): Promise<void> => {
  if (isSupabaseConfigured && !id.startsWith('relev-')) {
    try {
      const { error } = await supabase
        .from('flejes_pendientes')
        .update({
          nombre: nombreProducto,
          nombre_producto: nombreProducto,
          estado: 'incorporado',
        })
        .eq('id', id);

      if (error) {
        console.error("Error en Supabase:", error);
      }
    } catch (err) {
      console.error("Error en Supabase:", err);
    }
  }
};

/**
 * Suscribe la aplicación a nuevos registros en tiempo real (Supabase Realtime WebSockets + BroadcastChannel).
 */
export const subscribeToFlejesPendientes = (
  onNewItem: (item: FlejePendiente) => void
): (() => void) => {
  // 1. Supabase Realtime WebSocket
  let supabaseChannel: ReturnType<typeof supabase.channel> | null = null;
  if (isSupabaseConfigured) {
    try {
      supabaseChannel = supabase
        .channel('realtime_flejes_pendientes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'flejes_pendientes',
          },
          (payload) => {
            if (payload.new) {
              onNewItem(payload.new as FlejePendiente);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Error iniciando suscripción Supabase Realtime:', err);
    }
  }

  // 2. BroadcastChannel para multitab local instantáneo
  let bc: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === 'NUEVO_FLEJE_PENDIENTE' && event.data.item) {
          onNewItem(event.data.item);
        }
      };
    } catch (err) {
      console.warn('No se pudo inicializar BroadcastChannel:', err);
    }
  }

  // 3. CustomEvent para comunicación intra-ventana inmediata
  const handleLocalCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<FlejePendiente>;
    if (custom.detail) {
      onNewItem(custom.detail);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('NUEVO_FLEJE_EVENT', handleLocalCustomEvent);
  }

  // Función de limpieza al desmontar
  return () => {
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }
    if (bc) {
      bc.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('NUEVO_FLEJE_EVENT', handleLocalCustomEvent);
    }
  };
};
