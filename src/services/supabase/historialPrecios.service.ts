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
 * Consulta EXCLUSIVAMENTE a la tabla flejes_pendientes.
 */
export const fetchHistorialPrecios = async (daysBack: number = 7): Promise<PrecioHistorialItem[]> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffIso = cutoffDate.toISOString();

  const results: PrecioHistorialItem[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('flejes_pendientes')
        .select('*')
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error en Supabase:", error);
      } else if (Array.isArray(data)) {
        for (const row of data) {
          const rawRow = row as Record<string, unknown>;
          const productName = String(rawRow.nombre || rawRow.nombre_producto || 'Artículo sin nombre');
          const currentPrice = Number(rawRow.precio != null ? rawRow.precio : rawRow.precio_nuevo) || 0;
          const previousPrice = rawRow.precio_anterior != null ? Number(rawRow.precio_anterior) : null;
          const boxQuantity = (rawRow.cantidad_caja as string) || (rawRow.box_quantity as string) || null;

          results.push({
            id: String(rawRow.id),
            producto_nombre: productName,
            codigo_barra: rawRow.codigo_barra ? String(rawRow.codigo_barra) : undefined,
            precio_anterior: previousPrice,
            precio_nuevo: currentPrice,
            repositor: rawRow.repositor ? String(rawRow.repositor) : null,
            created_at: String(rawRow.created_at || new Date().toISOString()),
            source: 'flejes_pendientes',
            box_quantity: boxQuantity,
          });
        }
      }
    } catch (err) {
      console.error("Error en Supabase:", err);
    }
  }

  // Ordenar descendente por created_at
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return results;
};
