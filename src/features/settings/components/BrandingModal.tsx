import React, { useState } from 'react';
import { useTenantStore } from '../../../stores/useTenantStore';
import { X, Palette, Store, Check } from 'lucide-react';

interface BrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandingModal: React.FC<BrandingModalProps> = ({ isOpen, onClose }) => {
  const { organization, branches, activeBranchId, updateOrganization, setActiveBranchId, addBranch } = useTenantStore();

  const [headerTitle, setHeaderTitle] = useState(organization.header_title);
  const [primaryColor, setPrimaryColor] = useState(organization.primary_color);
  const [accentColor, setAccentColor] = useState(organization.accent_color);
  const [newBranchName, setNewBranchName] = useState('');

  if (!isOpen) return null;

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganization({
      header_title: headerTitle.trim() || 'SUPERMERCADO',
      primary_color: primaryColor,
      accent_color: accentColor,
    });
    onClose();
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    addBranch({
      name: newBranchName.trim(),
      code: `SUC-${branches.length + 1}`,
      is_active: true,
    });
    setNewBranchName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Configuración Marca Blanca</h2>
              <p className="text-xs text-slate-400">Personaliza la cabecera y colores de los flejes</p>
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <form onSubmit={handleSaveBranding} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Texto de Cabecera en Fleje (Marca Blanca)
              </label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="Ej: TODO GOLOSINAS o SUPERMERCADO NORTE"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-bold uppercase tracking-wider"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Este nombre aparecerá impreso en la parte superior de cada fleje.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Color Primario
                </label>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1.5">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono text-slate-300">{primaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Color de Acento
                </label>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1.5">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono text-slate-300">{accentColor}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-blue-600/30"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cambios de Marca Blanca</span>
            </button>
          </form>

          {/* Gestión de Sucursales (Multitenancy) */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Sucursales de la Organización</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Sucursal Activa para Impresión:
              </label>
              <select
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleAddBranch} className="flex gap-2">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Nombre de nueva sucursal..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
              >
                + Agregar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
