import React from 'react';
import { PrintQueueItem } from '../../../types/database.types';
import { TagRouter } from '../../tag-engine/components/TagRouter';

interface A4SheetLayoutProps {
  items: (PrintQueueItem | null)[];
  pageNumber: number;
  totalPages: number;
}

export const A4SheetLayout: React.FC<A4SheetLayoutProps> = ({
  items,
  pageNumber,
  totalPages,
}) => {
  // Asegurar siempre 10 slots por hoja A4 (2 columnas x 5 filas)
  const slots = Array.from({ length: 10 }, (_, index) => items[index] || null);
  const itemsCountOnPage = items.filter(Boolean).length;

  return (
    <div className="flex flex-col items-center w-full print:block">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            width: 210mm !important;
          }
        }
      `}</style>
      {/* Encabezado visual de página (solo pantalla) */}
      <div className="w-[210mm] max-w-full flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 print:hidden">
        <span>Página {pageNumber} de {totalPages}</span>
        <span>{itemsCountOnPage} / 10 Flejes</span>
      </div>

      {/* Hoja A4 Estándar: 210mm x 297mm (Cuadrícula 2x5 con separación para corte) */}
      <div
        className="bg-white shadow-2xl print:shadow-none box-border p-[4.5mm] grid grid-cols-2 grid-rows-5 gap-[3mm] relative print:m-0 print:border-none print:w-[210mm] print:h-[296mm] print:max-h-[296mm] print:overflow-hidden print:break-after-page print:gap-[3mm]"
        style={{
          width: '210mm',
          height: '297mm',
        }}
      >
        {slots.map((item, idx) => {
          if (item) {
            return (
              <TagRouter
                key={`${item.id}-page-${pageNumber}-slot-${idx}`}
                item={item}
              />
            );
          }

          // Slot vacío para completar la tanda de 10
          return (
            <div
              key={`empty-${idx}`}
              className="border border-dashed border-slate-300 bg-slate-50/60 p-3 flex flex-col items-center justify-center text-center text-slate-400 select-none print:opacity-10 print:border-slate-200"
            >
              <span className="text-lg opacity-40 mb-0.5">🏷️</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Espacio {idx + 1} de 10</span>
              <span className="text-[9px] text-slate-400">Disponible para completar hoja</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
