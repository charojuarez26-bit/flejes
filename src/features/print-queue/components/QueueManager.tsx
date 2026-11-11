import React, { useState } from 'react';
import { usePrintQueueStore } from '../../../stores/usePrintQueueStore';
import { Trash2, Plus, Minus, Tag, AlertCircle, Edit2, Check, Smartphone, ZoomIn, Megaphone, User } from 'lucide-react';
import { PhotoLightboxModal } from '../../../components/modals/PhotoLightboxModal';
import { actualizarNombreFleje } from '../../../services/supabase/relevamiento.service';
import { PrintQueueItem } from '../../../types/database.types';

export const QueueManager: React.FC = () => {
  const { queue, removeItem, updateQuantity, updateItemName, clearQueue, printMode, setPosterItem } =
    usePrintQueueStore();

  const [lightboxItem, setLightboxItem] = useState<PrintQueueItem | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineNameValue, setInlineNameValue] = useState<string>('');

  const isA4 = printMode === 'a4_sheet';
  const totalItems = queue.length;
  const remainder = totalItems % 10;
  const isA4Complete = totalItems > 0 && remainder === 0;

  const startInlineEdit = (item: PrintQueueItem) => {
    setInlineEditingId(item.id);
    setInlineNameValue(item.product_name.startsWith('[Pendiente') ? '' : item.product_name);
  };

  const saveInlineEdit = (item: PrintQueueItem) => {
    const finalName = inlineNameValue.trim() || item.product_name;
    updateItemName(item.id, finalName);
    setInlineEditingId(null);
    // Notificar a Supabase
    actualizarNombreFleje(item.product_id, finalName);
  };

  const handleLightboxSave = (newName: string) => {
    if (lightboxItem) {
      updateItemName(lightboxItem.id, newName);
      actualizarNombreFleje(lightboxItem.product_id, newName);
      setLightboxItem(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-xl">
      {/* Header de la lista */}
      <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Cola de Impresión ({totalItems})
          </h3>
        </div>

        {totalItems > 0 && (
          <button
            onClick={() => {
              if (confirm('¿Vaciar toda la cola de impresión?')) {
                clearQueue();
              }
            }}
            className="text-[11px] font-semibold text-slate-300 hover:text-rose-400 transition"
          >
            Vaciar Cola
          </button>
        )}
      </div>

      {/* Lista scrolleable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/50">
        {totalItems === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <AlertCircle className="w-10 h-10 mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-400">Cola de impresión vacía</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Carga manual, importa Excel o envía relevamientos desde el móvil
            </p>
          </div>
        ) : (
          queue.map((item, index) => {
            const isEditingThis = inlineEditingId === item.id;
            const isFromMobile = item.source === 'relevamiento_pasillo' || Boolean(item.foto_url);
            const needsReview = item.needs_name_review;

            return (
              <div
                key={item.id}
                className={`py-2 px-2.5 rounded-lg transition border shadow-sm ${
                  needsReview
                    ? 'bg-amber-950/40 border-amber-600/70'
                    : isFromMobile
                    ? 'bg-sky-950/40 border-sky-700/60'
                    : 'bg-slate-800 border-slate-700/90 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  {/* 1. Información del Producto & Edición de Nombre */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Miniatura de Foto de Góndola si existe, o Número */}
                    {item.foto_url ? (
                      <div className="relative group/thumb shrink-0 cursor-pointer" onClick={() => setLightboxItem(item)}>
                        <img
                          src={item.foto_url}
                          alt="Góndola"
                          className="w-9 h-9 rounded-md object-cover border border-sky-500/50 group-hover/thumb:border-sky-400 shadow transition"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 font-black text-[10px] flex items-center justify-center shrink-0 border border-slate-600">
                        {index + 1}
                      </span>
                    )}

                    {/* Contenedor del Nombre del Producto */}
                    <div className="flex-1 min-w-0">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5 my-0.5">
                          <input
                            type="text"
                            value={inlineNameValue}
                            onChange={(e) => setInlineNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(item);
                              if (e.key === 'Escape') setInlineEditingId(null);
                            }}
                            placeholder="Nombre del producto..."
                            className="w-full px-2 py-1 bg-slate-950 border border-sky-500 rounded text-xs text-slate-100 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveInlineEdit(item)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded shrink-0 transition"
                            title="Confirmar nombre"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0 group/title">
                          <span
                            className={`text-xs font-bold truncate cursor-pointer block min-w-0 flex-1 ${
                              needsReview
                                ? 'text-amber-300 italic underline decoration-dashed'
                                : 'text-white'
                            }`}
                            onClick={() => startInlineEdit(item)}
                            title={needsReview ? 'Haz clic para asignar el nombre según la foto' : item.product_name}
                          >
                            {item.product_name}
                          </span>
                          <button
                            onClick={() => startInlineEdit(item)}
                            className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-sky-300 p-0.5 shrink-0 transition"
                            title="Editar nombre"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Repositor (si fue enviado desde el celular) */}
                      {item.repositor && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <User className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>Enviado por:</span>
                          <span className="font-semibold text-slate-200 truncate">{item.repositor}</span>
                        </div>
                      )}

                      {/* Barcode, badges y avisos */}
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-slate-800/80 px-1 rounded text-slate-300 shrink-0">
                          {item.barcode}
                        </span>

                        {isFromMobile && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/50 shrink-0">
                            <Smartphone className="w-2.5 h-2.5" /> Móvil
                          </span>
                        )}

                        {needsReview && (
                          <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/60 animate-pulse shrink-0">
                            Asignar Nombre
                          </span>
                        )}

                        {item.promo_type !== 'none' && (
                          <span className="text-[9px] text-amber-400 font-bold uppercase shrink-0">
                            ★ {item.promo_detail || item.promo_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Contenedor del Precio */}
                  <div className="text-right shrink-0 min-w-[65px] px-1 font-bold">
                    <div className="text-xs font-black text-emerald-400 whitespace-nowrap">
                      ${item.current_price.toLocaleString('es-AR')}
                    </div>
                    {item.previous_price && (
                      <div className="text-[10px] text-red-400 line-through whitespace-nowrap">
                        ${item.previous_price.toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>

                  {/* 3. Contenedor del grupo de botones de acción */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center bg-slate-700/90 rounded border border-slate-600 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 text-slate-300 hover:text-white"
                        title="Reducir"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black px-1.5 text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 text-slate-300 hover:text-white"
                        title="Aumentar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => setPosterItem(item)}
                      className="p-1 text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 rounded border border-amber-700/60 transition shrink-0"
                      title="Imprimir Cartel A4 Gigante (1 página completa)"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition shrink-0"
                      title="Eliminar de la cola"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer con advertencia de desperdicio A4 */}
      {isA4 && totalItems > 0 && !isA4Complete && (
        <div className="p-2.5 bg-amber-950/70 border-t border-amber-800/80 text-[11px] text-amber-200 flex items-center justify-between">
          <span>⚠️ Faltan {10 - remainder} para completar la hoja de 10</span>
          <span className="font-extrabold text-amber-300">{remainder} / 10</span>
        </div>
      )}

      {/* Modal Lightbox para ampliar fotografía y asignar nombre */}
      <PhotoLightboxModal
        isOpen={Boolean(lightboxItem)}
        onClose={() => setLightboxItem(null)}
        photoUrl={lightboxItem?.foto_url || null}
        productName={lightboxItem?.product_name}
        barcode={lightboxItem?.barcode}
        price={lightboxItem?.current_price}
        onSaveName={handleLightboxSave}
      />
    </div>
  );
};
