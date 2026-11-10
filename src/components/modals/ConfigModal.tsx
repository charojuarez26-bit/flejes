import React, { useState } from 'react';
import { useTenantStore } from '../../stores/useTenantStore';
import { X, Palette, Check, Store } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { name: 'Negro Carbón', hex: '#0f172a' },
  { name: 'Azul Retail', hex: '#1d4ed8' },
  { name: 'Verde Farmacia', hex: '#047857' },
  { name: 'Rojo Descuento', hex: '#b91c1c' },
  { name: 'Ámbar Golosinas', hex: '#d97706' },
  { name: 'Púrpura Minimarket', hex: '#6d28d9' },
];

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const { tradeName, brandColor, setBranding, branches, activeBranchId, setActiveBranchId } = useTenantStore();

  const [inputTradeName, setInputTradeName] = useState(tradeName);
  const [selectedColor, setSelectedColor] = useState(brandColor);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBranding(inputTradeName.trim() || 'TODO GOLOSINAS', selectedColor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Personalización (Marca Blanca)</h2>
              <p className="text-xs text-slate-400">Configura el nombre y color corporativo de tus flejes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Nombre del Comercio */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Nombre del Comercio (Aparece en cada fleje) *
            </label>
            <input
              type="text"
              value={inputTradeName}
              onChange={(e) => setInputTradeName(e.target.value)}
              placeholder="Ej: TODO GOLOSINAS, SUPERMERCADO LÍDER..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-bold uppercase tracking-wider"
              required
            />
          </div>

          {/* Color Corporativo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Color Corporativo
            </label>
            {/* Presets */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {COLOR_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.hex}
                  onClick={() => setSelectedColor(preset.hex)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition ${
                    selectedColor.toLowerCase() === preset.hex.toLowerCase()
                      ? 'border-blue-500 bg-slate-800 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="truncate">{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Custom Picker */}
            <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer bg-transparent border-none"
              />
              <div className="flex-1">
                <span className="text-[11px] text-slate-400 block">Personalizado (Hexadecimal):</span>
                <span className="font-mono text-xs font-bold text-slate-200">{selectedColor}</span>
              </div>
            </div>
          </div>

          {/* Previsualización en Vivo de la Cabecera */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Vista previa del encabezado:
            </label>
            <div className="p-3 bg-white rounded-lg border border-slate-300 text-slate-900">
              <div className="flex justify-between items-center border-b-2 pb-1" style={{ borderColor: selectedColor }}>
                <span className="font-black text-xs uppercase tracking-wider" style={{ color: selectedColor }}>
                  {inputTradeName || 'NOMBRE COMERCIO'}
                </span>
                <span
                  className="text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide"
                  style={{ backgroundColor: selectedColor }}
                >
                  PRECIO
                </span>
              </div>
              <div className="text-center py-2 text-slate-400 text-xs font-medium">
                (El nombre y color impactarán dinámicamente en todos los flejes)
              </div>
            </div>
          </div>

          {/* Sucursal Activa */}
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sucursal Activa para Impresión:</span>
            </label>
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Botón Guardar */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar Cambios Dinámicos</span>
          </button>
        </form>
      </div>
    </div>
  );
};
