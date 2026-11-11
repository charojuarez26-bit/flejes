import React, { useState, useEffect } from 'react';
import { usePrintQueueStore } from '../../../stores/usePrintQueueStore';
import { A4SheetLayout } from '../layouts/A4SheetLayout';
import { ThermalLayout } from '../layouts/ThermalLayout';
import { CartelA4Poster } from '../../tag-engine/components/CartelA4Poster';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export const PrintPreviewCanvas: React.FC = () => {
  const { queue, printMode, posterItem, setPosterItem } = usePrintQueueStore();
  const [zoomScale, setZoomScale] = useState<number>(0.85);

  const isA4 = printMode === 'a4_sheet';

  // Al activar Cartel A4, ejecutar window.print() automáticamente
  // y volver a la grilla normal al terminar o cancelar la impresión
  useEffect(() => {
    if (!posterItem) return;

    const timer = setTimeout(() => {
      const handleAfterPrint = () => {
        setPosterItem(null);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);

      try {
        window.print();
      } catch (err) {
        console.warn('Error al invocar window.print():', err);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
    };
  }, [posterItem, setPosterItem]);

  // Expansión ("Clonación") de flejes para impresión según propiedad cantidad
  const itemsParaImprimir = React.useMemo(() => {
    return queue.flatMap((item) => {
      const cant = Math.max(1, item.cantidad ?? item.quantity ?? 1);
      return Array(cant).fill(item);
    });
  }, [queue]);

  // Chunks de 10 items por cada hoja A4 (2 columnas x 5 filas)
  const chunkedPages = React.useMemo(() => {
    if (!isA4) return [];
    if (itemsParaImprimir.length === 0) return [[]]; // Mostrar al menos 1 hoja con placeholders

    const chunks = [];
    for (let i = 0; i < itemsParaImprimir.length; i += 10) {
      chunks.push(itemsParaImprimir.slice(i, i + 10));
    }
    return chunks;
  }, [itemsParaImprimir, isA4]);

  return (
    <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
      {/* Barra de Controles de Vista Previa (solo pantalla) */}
      <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center z-10 print:hidden">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
          {posterItem ? (
            <span className="text-amber-400 font-extrabold flex items-center gap-1.5">
              <span>📢</span>
              <span>Modo Cartel A4 Gigante (1 página completa)</span>
            </span>
          ) : (
            <>
              <span>📄 Previsualización de Impresión en Vivo</span>
              <span className="text-[11px] text-slate-500 font-normal">
                ({isA4 ? `${chunkedPages.length} hoja(s) A4 • ${itemsParaImprimir.length} fleje(s)` : `Rollo continuo ${printMode.replace('thermal_', '')}`})
              </span>
            </>
          )}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.1))}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
            title="Reducir zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold text-slate-300 w-12 text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => setZoomScale((s) => Math.min(1.2, s + 0.1))}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomScale(1)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded ml-1"
            title="Ajustar 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lienzo scrolleable con escala aplicada */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center print:p-0 print:overflow-visible printable-area">
        <div
          className="transition-transform duration-200 origin-top flex flex-col gap-10 items-center print:transform-none print:gap-0"
          style={{ transform: `scale(${zoomScale})` }}
        >
          {posterItem ? (
            <div className="print:m-0 print:p-0">
              <CartelA4Poster item={posterItem} onClose={() => setPosterItem(null)} />
            </div>
          ) : isA4 ? (
            chunkedPages.map((pageItems, pageIdx) => (
              <div key={pageIdx} className="print:break-after-page">
                <A4SheetLayout
                  items={pageItems}
                  pageNumber={pageIdx + 1}
                  totalPages={chunkedPages.length}
                />
              </div>
            ))
          ) : (
            <ThermalLayout items={itemsParaImprimir} mode={printMode} />
          )}
        </div>
      </div>
    </div>
  );
};
