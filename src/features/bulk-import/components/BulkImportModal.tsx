import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { usePrintQueueStore } from '../../../stores/usePrintQueueStore';
import { useTenantStore } from '../../../stores/useTenantStore';
import { X, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedRow {
  name: string;
  barcode: string;
  price: number;
  oldPrice?: number | null;
  boxQuantity?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose }) => {
  const { addBatch } = usePrintQueueStore();
  const { organization, activeBranchId } = useTenantStore();

  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg('El archivo no contiene filas o está vacío.');
          return;
        }

        // Mapeo inteligente de columnas
        const results: ParsedRow[] = rawJson.map((row, index) => {
          // Buscar columna nombre
          const name = row['producto'] || row['nombre'] || row['descripcion'] || row['name'] || row['item'] || `Producto ${index + 1}`;
          
          // Buscar columna código
          const barcode = String(row['codigo'] || row['barcode'] || row['ean'] || row['ean13'] || ('779' + Math.floor(1000000000 + Math.random() * 9000000000)));

          // Buscar columna precio
          const rawPrice = row['precio'] || row['precio_actual'] || row['price'] || row['pvp'] || 0;
          const cleanPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[$\s]/g, '').replace(',', '.')) : Number(rawPrice);

          // Buscar precio anterior
          const rawOldPrice = row['precio_anterior'] || row['antes'] || row['old_price'] || null;
          const cleanOldPrice = rawOldPrice ? (typeof rawOldPrice === 'string' ? parseFloat(rawOldPrice.replace(/[$\s]/g, '').replace(',', '.')) : Number(rawOldPrice)) : null;

          // Buscar caja
          const boxQuantity = row['caja'] || row['pack'] || row['cantidad_caja'] || undefined;

          return {
            name: String(name),
            barcode: String(barcode),
            price: isNaN(cleanPrice) ? 0 : cleanPrice,
            oldPrice: cleanOldPrice && !isNaN(cleanOldPrice) ? cleanOldPrice : null,
            boxQuantity: boxQuantity ? String(boxQuantity) : undefined,
          };
        });

        setParsedData(results);
      } catch (err: any) {
        setErrorMsg('Error al leer el archivo Excel/CSV: ' + (err.message || 'Formato no soportado'));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (parsedData.length === 0) return;

    const itemsToAdd = parsedData.map((row) => ({
      organization_id: organization.id,
      branch_id: activeBranchId,
      product_id: `prod-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product_name: row.name,
      barcode: row.barcode,
      current_price: row.price,
      previous_price: row.oldPrice || null,
      promo_type: row.oldPrice ? ('strikethrough' as const) : ('none' as const),
      box_quantity: row.boxQuantity || null,
      quantity: 1,
      source: 'bulk_import' as const,
      preferred_mode: 'a4_sheet' as const,
    }));

    addBatch(itemsToAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Importación Masiva de Artículos</h2>
              <p className="text-xs text-slate-400">Archivos Excel (.xlsx, .xls) o CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Dropzone */}
          <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 transition group">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 transition" />
            <span className="text-sm font-semibold text-slate-200">
              {fileName ? fileName : 'Haz clic o arrastra tu archivo Excel / CSV aquí'}
            </span>
            <span className="text-xs text-slate-400">
              Columnas detectadas automáticamente: Nombre, Código, Precio, Caja, Antes
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Previsualización ({parsedData.length} artículos detectados)
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-slate-300 uppercase sticky top-0 font-bold">
                    <tr>
                      <th className="p-2">Producto</th>
                      <th className="p-2">Código</th>
                      <th className="p-2">Precio</th>
                      <th className="p-2">Antes</th>
                      <th className="p-2">Caja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {parsedData.slice(0, 15).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/50">
                        <td className="p-2 font-medium">{row.name}</td>
                        <td className="p-2 font-mono text-slate-400">{row.barcode}</td>
                        <td className="p-2 text-emerald-400 font-bold">${row.price}</td>
                        <td className="p-2 text-red-400 line-through">{row.oldPrice ? `$${row.oldPrice}` : '-'}</td>
                        <td className="p-2 text-slate-400">{row.boxQuantity || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 15 && (
                <p className="text-[11px] text-slate-400 text-center italic">
                  Mostrando los primeros 15 artículos de {parsedData.length}...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedData.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Cargar {parsedData.length} Flejes a la Cola</span>
          </button>
        </div>
      </div>
    </div>
  );
};
