import React from 'react';
import { PrintQueueItem, PrintMode } from '../../../types/database.types';
import { TagRouter } from '../../tag-engine/components/TagRouter';

interface ThermalLayoutProps {
  items: PrintQueueItem[];
  mode: PrintMode; // 'thermal_58mm' | 'thermal_80mm'
}

export const ThermalLayout: React.FC<ThermalLayoutProps> = ({ items, mode }) => {
  const widthMm = mode === 'thermal_58mm' ? '58mm' : '80mm';

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 print:hidden">
        Rollo Térmico Continuo ({widthMm}) • {items.length} Etiquetas
      </div>

      <div
        className="bg-white shadow-2xl print:shadow-none p-0 flex flex-col gap-0 print:m-0"
        style={{ width: widthMm }}
      >
        {items.map((item) => (
          <div key={item.id} className="print:break-inside-avoid">
            <TagRouter item={item} isThermal />
          </div>
        ))}
      </div>
    </div>
  );
};
