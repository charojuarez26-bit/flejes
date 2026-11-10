import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  History,
  RotateCw,
  Search,
  TrendingUp,
  TrendingDown,
  User,
  CalendarX2,
  Tag,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  fetchHistorialPrecios,
  formatFechaHistorial,
  PrecioHistorialItem,
} from '../../services/supabase/historialPrecios.service';
import { usePrintQueueStore } from '../../stores/usePrintQueueStore';

interface HistorialPreciosProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistorialPrecios: React.FC<HistorialPreciosProps> = ({ isOpen, onClose }) => {
  const { queue } = usePrintQueueStore();

  const [items, setItems] = useState<PrecioHistorialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'mobile' | 'pc'>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadHistorial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Consultar a Supabase los registros de los últimos 7 días
      const remoteData = await fetchHistorialPrecios(7);

      // 2. Combinar con elementos de la sesión actual en memoria (de los últimos 7 días)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      const localItems: PrecioHistorialItem[] = queue
        .filter((q) => {
          if (!q.created_at) return true;
          return new Date(q.created_at) >= cutoff;
        })
        .map((q) => ({
          id: q.id,
          producto_nombre: q.product_name,
          codigo_barra: q.barcode,
          precio_anterior: q.previous_price || null,
          precio_nuevo: q.current_price,
          repositor: q.repositor || null,
          created_at: q.created_at || new Date().toISOString(),
          source: q.source,
          box_quantity: q.box_quantity || null,
        }));

      // 3. Fusionar y deduplicar por id
      const mergedMap = new Map<string, PrecioHistorialItem>();
      for (const item of remoteData) {
        mergedMap.set(item.id, item);
      }
      for (const item of localItems) {
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      }

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(mergedList);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('No se pudo sincronizar el historial con Supabase');
    } finally {
      setLoading(false);
    }
  }, [queue]);

  // Cargar datos automáticamente cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadHistorial();
    }
  }, [isOpen, loadHistorial]);

  // Filtrado por buscador y origen
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = item.producto_nombre.toLowerCase().includes(query);
        const matchCode = item.codigo_barra?.toLowerCase().includes(query);
        const matchRepo = item.repositor?.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchRepo) return false;
      }

      // Filtro origen
      if (filterSource === 'mobile') {
        const isMobile =
          item.source === 'scanner_mobile' ||
          item.source === 'relevamiento_pasillo' ||
          Boolean(item.repositor);
        if (!isMobile) return false;
      } else if (filterSource === 'pc') {
        const isPc = !item.repositor && item.source !== 'relevamiento_pasillo';
        if (!isPc) return false;
      }

      return true;
    });
  }, [items, searchTerm, filterSource]);

  // Métricas rápidas
  const metrics = useMemo(() => {
    let increased = 0;
    let decreased = 0;
    let sameOrNew = 0;

    for (const item of items) {
      if (item.precio_anterior != null && item.precio_anterior > 0) {
        if (item.precio_nuevo > item.precio_anterior) increased++;
        else if (item.precio_nuevo < item.precio_anterior) decreased++;
        else sameOrNew++;
      } else {
        sameOrNew++;
      }
    }

    return { total: items.length, increased, decreased, sameOrNew };
  }, [items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm print:hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col overflow-hidden shadow-2xl animate-scaleUp">
        {/* 1. Header del Modal */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-100">
                  Historial de Precios
                </h2>
                <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/70 border border-indigo-700/60 px-2 py-0.5 rounded-full">
                  Últimos 7 días
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Seguimiento de modificaciones, altas y relevamientos de precios en góndola
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistorial}
              disabled={loading}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
              title="Actualizar datos desde Supabase"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Barra de Métricas Rápidas */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs flex-shrink-0">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Total Modificaciones</span>
            <span className="font-extrabold text-slate-100 text-sm">{metrics.total}</span>
          </div>

          <div className="bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-xl flex items-center justify-between text-amber-300">
            <span className="flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Aumentos
            </span>
            <span className="font-black text-amber-400 text-sm">{metrics.increased}</span>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-xl flex items-center justify-between text-emerald-300">
            <span className="flex items-center gap-1 font-semibold">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> Rebajas / Ofertas
            </span>
            <span className="font-black text-emerald-400 text-sm">{metrics.decreased}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Nuevos / Fijos</span>
            <span className="font-extrabold text-slate-300 text-sm">{metrics.sameOrNew}</span>
          </div>
        </div>

        {/* 3. Filtros y Búsqueda */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por producto, código de barras o repositor..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
            <button
              onClick={() => setFilterSource('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                filterSource === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setFilterSource('mobile')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                filterSource === 'mobile'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Móvil
            </button>
            <button
              onClick={() => setFilterSource('pc')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                filterSource === 'pc'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PC Escritorio
            </button>
          </div>
        </div>

        {/* 4. Tabla / Lista de Registros */}
        <div className="flex-1 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
              <RotateCw className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-xs font-semibold">Consultando registros en Supabase...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-rose-400 gap-2">
              <p className="text-sm font-bold">{error}</p>
              <button
                onClick={loadHistorial}
                className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                Reintentar
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            /* Estado Vacío */
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
                <CalendarX2 className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">
                {searchTerm
                  ? 'No se encontraron coincidencias'
                  : 'Sin cambios de precios en los últimos 7 días'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchTerm
                  ? 'Prueba modificando los términos de búsqueda o el filtro de origen.'
                  : 'Todos los productos mantienen sus valores vigentes o no se han cargado modificaciones recientes en la última semana.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800 backdrop-blur-sm">
                <tr>
                  <th className="py-2.5 px-4">Fecha / Hora</th>
                  <th className="py-2.5 px-4">Producto</th>
                  <th className="py-2.5 px-4">Precio Anterior</th>
                  <th className="py-2.5 px-4">Precio Nuevo</th>
                  <th className="py-2.5 px-4">Variación</th>
                  <th className="py-2.5 px-4 text-right">Repositor / Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {filteredItems.map((item) => {
                  const hasPrev = item.precio_anterior != null && item.precio_anterior > 0;
                  const diff = hasPrev ? item.precio_nuevo - item.precio_anterior! : 0;
                  const pct = hasPrev && item.precio_anterior! > 0
                    ? Math.round((diff / item.precio_anterior!) * 100)
                    : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Fecha / Hora Formateada (ej: 10 Nov, 14:30) */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {formatFechaHistorial(item.created_at)}
                      </td>

                      {/* Nombre del Producto y Código */}
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="font-bold text-slate-100 group-hover:text-indigo-300 transition">
                          {item.producto_nombre}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {item.codigo_barra && (
                            <span className="font-mono bg-slate-800 px-1 rounded text-slate-300">
                              {item.codigo_barra}
                            </span>
                          )}
                          {item.box_quantity && (
                            <span className="text-slate-400">Cja: {item.box_quantity}</span>
                          )}
                        </div>
                      </td>

                      {/* Precio Anterior */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasPrev ? (
                          <span className="font-mono text-xs text-red-400 line-through">
                            ${item.precio_anterior!.toLocaleString('es-AR')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">—</span>
                        )}
                      </td>

                      {/* Precio Nuevo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-black text-emerald-400">
                          ${item.precio_nuevo.toLocaleString('es-AR')}
                        </span>
                      </td>

                      {/* Variación */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {pct != null && pct !== 0 ? (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded ${
                              pct > 0
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                                : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                            }`}
                          >
                            {pct > 0 ? (
                              <>
                                <TrendingUp className="w-3 h-3" /> +{pct}%
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3" /> {pct}%
                              </>
                            )}
                          </span>
                        ) : hasPrev ? (
                          <span className="text-[10px] text-slate-400 font-semibold">Sin cambio</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/50">
                            <Tag className="w-2.5 h-2.5" /> Nuevo
                          </span>
                        )}
                      </td>

                      {/* Repositor / Origen */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {item.repositor ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-950/50 border border-sky-800/60 text-sky-300 text-xs font-semibold">
                            <User className="w-3 h-3 text-sky-400" />
                            <span>{item.repositor}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {item.source === 'scanner_mobile' || item.source === 'relevamiento_pasillo'
                              ? '📱 Móvil'
                              : '💻 Carga PC'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 5. Footer con Status de Sincronización */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <div>
            {lastRefreshed ? (
              <span>
                Última sincronización: <strong className="text-slate-300 font-mono">{lastRefreshed.toLocaleTimeString('es-AR')}</strong>
              </span>
            ) : (
              <span>Conectado a Supabase</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
          >
            <span>Cerrar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
