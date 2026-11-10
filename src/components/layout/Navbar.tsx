import React from 'react';
import { usePrintQueueStore } from '../../stores/usePrintQueueStore';
import { useTenantStore } from '../../stores/useTenantStore';
import { Printer, FileSpreadsheet, Palette, Store, CheckCircle, AlertTriangle, History, Smartphone } from 'lucide-react';

interface NavbarProps {
  onOpenBulkImport: () => void;
  onOpenConfig: () => void;
  onOpenHistorial?: () => void;
  onOpenRepositor?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBulkImport,
  onOpenConfig,
  onOpenHistorial,
  onOpenRepositor,
}) => {
  const { queue, printMode, setPrintMode } = usePrintQueueStore();
  const { tradeName, branches, activeBranchId } = useTenantStore();

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const totalItems = queue.length;
  const isA4 = printMode === 'a4_sheet';
  const isA4Ready = totalItems > 0 && totalItems % 10 === 0;
  const isPrintDisabled = isA4 ? !isA4Ready : totalItems === 0;

  const handleTriggerPrint = () => {
    if (isPrintDisabled) return;
    window.print();
  };

  const handleOpenRepositor = () => {
    if (onOpenRepositor) {
      onOpenRepositor();
    } else {
      window.open('?repositor=true', '_blank');
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 flex-shrink-0 z-30 select-none print:hidden">
      {/* Brand & Organization */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-none uppercase tracking-tight drop-shadow-sm">
            {tradeName}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-semibold">
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            <span>{activeBranch?.name}</span>
          </div>
        </div>

        {onOpenHistorial && (
          <button
            onClick={onOpenHistorial}
            className="ml-3 bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-200 border border-indigo-700/70 hover:border-indigo-500 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            title="Ver historial de cambios de precios en los últimos 7 días"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Historial (7 días)</span>
          </button>
        )}
      </div>

      {/* Middle: Actions (Modo Repositor, Excel, Config Marca Blanca) */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenRepositor}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          title="Abrir Modo Repositor en nueva pestaña para emular la vista móvil"
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Modo Repositor</span>
        </button>

        <button
          onClick={onOpenBulkImport}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          title="Importar catálogo desde Excel (.xlsx) o CSV"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Excel / CSV</span>
        </button>

        <button
          onClick={onOpenConfig}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          title="Personalizar nombre de comercio y color corporativo"
        >
          <Palette className="w-4 h-4 text-amber-400" />
          <span>Marca Blanca</span>
        </button>
      </div>

      {/* Right: Print Mode Selector & Print Button */}
      <div className="flex items-center gap-3">
        {/* Selector de Modo */}
        <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs font-bold">
          <button
            onClick={() => setPrintMode('a4_sheet')}
            className={`px-2.5 py-1 rounded transition ${
              printMode === 'a4_sheet'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            A4 (2×5 = 10)
          </button>
          <button
            onClick={() => setPrintMode('thermal_80mm')}
            className={`px-2.5 py-1 rounded transition ${
              printMode === 'thermal_80mm'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Térmica 80mm
          </button>
          <button
            onClick={() => setPrintMode('thermal_58mm')}
            className={`px-2.5 py-1 rounded transition ${
              printMode === 'thermal_58mm'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            58mm
          </button>
        </div>

        {/* Indicador de Tanda A4 */}
        {isA4 && (
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              isA4Ready
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/80'
            }`}
          >
            {isA4Ready ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{totalItems / 10} Hoja(s) Lista(s)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{totalItems} cargados (Faltan {10 - (totalItems % 10)})</span>
              </>
            )}
          </div>
        )}

        {/* Botón Imprimir */}
        <button
          onClick={handleTriggerPrint}
          disabled={isPrintDisabled}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-extrabold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 active:scale-95"
          title={
            isA4 && !isA4Ready
              ? 'Para evitar desperdiciar papel A4, carga múltiplos de 10 flejes'
              : 'Imprimir tanda de flejes'
          }
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Tanda</span>
        </button>
      </div>
    </header>
  );
};
