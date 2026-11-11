import React from 'react';
import { usePrintQueueStore } from '../../stores/usePrintQueueStore';
import { useTenantStore } from '../../stores/useTenantStore';
import { Printer, FileSpreadsheet, Palette, Store, CheckCircle, AlertTriangle, History, Smartphone, Unlink } from 'lucide-react';

interface NavbarProps {
  onOpenBulkImport: () => void;
  onOpenConfig: () => void;
  onOpenHistorial?: () => void;
  onOpenRepositor?: () => void;
  onDisconnectStation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBulkImport,
  onOpenConfig,
  onOpenHistorial,
  onOpenRepositor,
  onDisconnectStation,
}) => {
  const { queue, printMode, setPrintMode } = usePrintQueueStore();
  const {
    tradeName,
    branches,
    activeBranchId,
    currentBranchId,
    setCurrentBranch,
    setCurrentOrganization,
    setWhiteLabelName,
  } = useTenantStore();

  const activeBranch = branches.find((b) => b.id === (currentBranchId || activeBranchId)) || {
    id: currentBranchId || activeBranchId,
    name: typeof window !== 'undefined' ? localStorage.getItem('branch_name') || 'Casa Central' : 'Casa Central',
  };

  const currentCommerceName = (typeof window !== 'undefined' ? (localStorage.getItem('organization_name') || localStorage.getItem('whiteLabelName') || localStorage.getItem('white_label_name')) : null) || tradeName || 'SUPERMERCADO';
  const currentBranchName = (typeof window !== 'undefined' ? localStorage.getItem('branch_name') : null) || activeBranch?.name || 'Casa Central';

  const handleDisconnect = () => {
    setCurrentBranch(null);
    setCurrentOrganization(null);
    setWhiteLabelName(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_branch_id');
      localStorage.removeItem('current_organization_id');
      localStorage.removeItem('white_label_name');
      localStorage.removeItem('whiteLabelName');
      localStorage.removeItem('branch_name');
      localStorage.removeItem('organization_name');
      window.location.href = '/';
    }
    if (onDisconnectStation) {
      onDisconnectStation();
    }
  };

  const totalItems = queue.reduce((sum, item) => sum + (item.cantidad || item.quantity || 1), 0);
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
    <header className="flex flex-col flex-shrink-0 z-30 select-none print:hidden border-b border-slate-800">
      {/* FILA 1: Identidad y Sesión del Local */}
      <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between gap-4 border-b border-slate-800/80">
        {/* Izquierda: Nombre de Comercio, Badge En Vivo y Sucursal */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-bold text-white leading-none uppercase tracking-tight truncate max-w-xs sm:max-w-sm md:max-w-md">
              {currentCommerceName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono shrink-0 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>En vivo</span>
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold shrink-0">
            <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Sucursal: <strong className="text-slate-200">{currentBranchName}</strong></span>
          </div>
        </div>

        {/* Derecha: Modo Repositor y Desvincular Terminal */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenRepositor}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Abrir Modo Repositor en nueva pestaña para emular la vista móvil"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Modo Repositor</span>
            <span className="sm:hidden">Celular</span>
          </button>

          <button
            onClick={handleDisconnect}
            className="bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 hover:text-rose-100 border border-rose-800/40 hover:border-rose-700/60 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Desvincular este terminal y volver al selector de comercio y sucursal"
          >
            <Unlink className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Desvincular Terminal</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </div>
      </div>

      {/* FILA 2: Barra de Herramientas y Control de Impresión */}
      <div className="bg-slate-900/60 backdrop-blur-sm px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto">
        {/* Grupo Izquierdo: Herramientas Auxiliares */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenHistorial && (
            <button
              onClick={onOpenHistorial}
              className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Ver historial de cambios de precios en los últimos 7 días"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Historial</span>
            </button>
          )}

          <button
            onClick={onOpenBulkImport}
            className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Importar catálogo desde Excel (.xlsx) o CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={onOpenConfig}
            className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Personalizar nombre de comercio y color corporativo"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Marca Blanca</span>
          </button>
        </div>

        {/* Grupo Derecho: Configuración y Salida de Impresión */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Selector de Formato */}
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs font-bold shadow-inner">
            <button
              onClick={() => setPrintMode('a4_sheet')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                printMode === 'a4_sheet'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              A4 (2×5 = 10)
            </button>
            <button
              onClick={() => setPrintMode('thermal_80mm')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                printMode === 'thermal_80mm'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Térmica 80mm
            </button>
            <button
              onClick={() => setPrintMode('thermal_58mm')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                printMode === 'thermal_58mm'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              58mm
            </button>
          </div>

          {/* Badge de Estado de Lote A4 */}
          {isA4 && (
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm ${
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

          {/* Botón Principal: Imprimir Tanda */}
          <button
            onClick={handleTriggerPrint}
            disabled={isPrintDisabled}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-extrabold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer"
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
      </div>
    </header>
  );
};
