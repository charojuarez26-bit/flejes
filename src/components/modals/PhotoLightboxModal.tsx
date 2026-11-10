import React from 'react';
import { X, ZoomIn, Tag, Barcode } from 'lucide-react';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string | null;
  productName?: string;
  barcode?: string;
  price?: number;
  onSaveName?: (newName: string) => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  productName,
  barcode,
  price,
  onSaveName,
}) => {
  const [editingName, setEditingName] = React.useState(productName || '');

  React.useEffect(() => {
    setEditingName(productName || '');
  }, [productName, isOpen]);

  if (!isOpen || !photoUrl) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveName && editingName.trim()) {
      onSaveName(editingName.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">
              Foto de Góndola - Relevamiento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container with high contrast backdrop */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/70 min-h-[300px]">
          <img
            src={photoUrl}
            alt="Foto de góndola relevada"
            className="max-h-[55vh] w-auto max-w-full rounded-lg object-contain shadow-lg border border-slate-800"
          />
        </div>

        {/* Footer with Details & Quick Product Name Assign */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-300 font-bold">
                {barcode || 'Sin código'}
              </span>
            </div>
            {price !== undefined && (
              <div className="text-sm font-black text-emerald-400">
                Precio Relevado: ${price.toLocaleString('es-AR')}
              </div>
            )}
          </div>

          {onSaveName && (
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Ingresa el nombre del producto según la foto..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow"
              >
                Guardar Nombre
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
