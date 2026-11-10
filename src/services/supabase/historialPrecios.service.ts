import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface PrecioHistorialItem {
  id: string;
  producto_nombre: string;
  codigo_barra?: string;
  precio_anterior?: number | null;
  precio_nuevo: number;
  repositor?: string | null;
  created_at: string;
  source?: string;
  box_quantity?: string | null;
}

/**
 * Formatea una fecha ISO a un formato legible en español (ej: "10 Nov, 14:30").
 */
export const formatFechaHistorial = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = date.getDate();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
};

/**
 * Consulta el historial de cambios de precios registrados en Supabase en los últimos 7 días.
 * Aplica filtro .gte('created_at', fechaHace7Dias) y orden descendente .order('created_at', { ascending: false }).
 */
export const fetchHistorialPrecios = async (daysBack: number = 7): Promise<PrecioHistorialItem[]> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffIso = cutoffDate.toISOString();

  const results: PrecioHistorialItem[] = [];
  const seenIds = new Set<string>();

  if (isSupabaseConfigured) {
    try {
      // 1. Consulta principal a la tabla print_queue con join a products
      const { data: queueData, error: queueError } = await supabase
        .from('print_queue')
        .select(`
          id,
          current_price,
          previous_price,
          box_quantity,
          source,
          created_at,
          product_id,
          products (
            name,
            barcode,
            description
          )
        `)
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: false });

      if (!queueError && Array.isArray(queueData)) {
        for (const row of queueData) {
          const rawRow = row as Record<string, unknown>;
          const rawProduct = rawRow.products as Record<string, unknown> | null;

          let repositorName: string | null = (rawRow.repositor as string) || null;
          if (!repositorName && rawProduct?.description && typeof rawProduct.description === 'string') {
            if (rawProduct.description.startsWith('repositor:')) {
              repositorName = rawProduct.description.replace('repositor:', '').trim();
            }
          }

          const item: PrecioHistorialItem = {
            id: String(rawRow.id),
            producto_nombre: String(rawProduct?.name || 'Artículo sin nombre'),
            codigo_barra: rawProduct?.barcode ? String(rawProduct.barcode) : undefined,
            precio_anterior: rawRow.previous_price != null ? Number(rawRow.previous_price) : null,
            precio_nuevo: Number(rawRow.current_price) || 0,
            repositor: repositorName,
            created_at: String(rawRow.created_at || new Date().toISOString()),
            source: rawRow.source ? String(rawRow.source) : undefined,
            box_quantity: rawRow.box_quantity ? String(rawRow.box_quantity) : null,
          };

          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            results.push(item);
          }
        }
      } else if (queueError) {
        console.warn('Advertencia consultando print_queue en historial:', queueError.message);
      }

      // 2. Consulta complementaria a flejes_pendientes (si existe en el schema)
      try {
        const { data: fpData, error: fpError } = await supabase
          .from('flejes_pendientes')
          .select('*')
          .gte('created_at', cutoffIso)
          .order('created_at', { ascending: false });

        if (!fpError && Array.isArray(fpData)) {
          for (const row of fpData) {
            const rawRow = row as Record<string, unknown>;
            const itemId = String(rawRow.id);
            if (!seenIds.has(itemId)) {
              seenIds.add(itemId);
              results.push({
                id: itemId,
                producto_nombre: String(rawRow.nombre_producto || `Código ${rawRow.codigo_barra}`),
                codigo_barra: rawRow.codigo_barra ? String(rawRow.codigo_barra) : undefined,
                precio_anterior: null,
                precio_nuevo: Number(rawRow.precio_nuevo) || 0,
                repositor: rawRow.repositor ? String(rawRow.repositor) : null,
                created_at: String(rawRow.created_at || new Date().toISOString()),
                source: 'relevamiento_pasillo',
              });
            }
          }
        }
      } catch {
        // flejes_pendientes puede no existir aún en producción
      }
    } catch (err) {
      console.warn('Error general obteniendo historial de precios desde Supabase:', err);
    }
  }

  // Ordenar todos los registros descendente por created_at
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return results;
};
