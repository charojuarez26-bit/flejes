import React from 'react';
import { PrintQueueItem, MarketingTemplate } from '../../../types/database.types';
import { useTenantStore } from '../../../stores/useTenantStore';
import { BarcodeRenderer } from './BarcodeRenderer';
import { parseQuantityDeal } from '../../../utils/priceParser';
import { Sparkles, ArrowLeft, Printer } from 'lucide-react';

interface CartelA4PosterProps {
  item: PrintQueueItem;
  onClose?: () => void;
}

export const CartelA4Poster: React.FC<CartelA4PosterProps> = ({ item, onClose }) => {
  const { tradeName, brandColor, branches, activeBranchId } = useTenantStore();
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const formattedPrice = (price: number) => {
    return price.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const todayStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Detección de oferta por cantidad (ej: "6x2000")
  const quantityDeal = parseQuantityDeal(item.price_raw || item.promo_detail || '') ||
                       parseQuantityDeal(item.current_price?.toString() || '');

  // Plantilla de marketing
  const templateType: MarketingTemplate = item.template_type ||
    (item.promo_type === 'strikethrough' ? 'oferta_tachada' :
     item.promo_type === 'two_for_one' ? 'dos_por_uno' :
     item.promo_type === 'second_50' ? 'segunda_50' : 'normal');

  return (
    <div className="flex flex-col items-center w-full">
      {/* Barra de Controles superior (solo pantalla) */}
      <div className="w-[210mm] max-w-full flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 mb-4 text-xs font-bold text-slate-200 shadow-xl print:hidden">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <span className="text-white font-extrabold">Modo Cartel A4 Gigante: </span>
            <span className="text-slate-300 font-semibold">{item.product_name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cartel</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Flejes</span>
            </button>
          )}
        </div>
      </div>

      {/* Cartel A4 Físico (210mm x 297mm) */}
      <div
        className="bg-white text-slate-950 p-[8mm] shadow-2xl flex flex-col justify-between box-border border-4 border-slate-950 relative select-none print:shadow-none print:m-0 print:border-4 print:border-slate-950 print:break-after-avoid"
        style={{
          width: '210mm',
          height: '296mm',
          maxHeight: '296mm',
        }}
      >
        {/* 1. Encabezado de Alto Impacto */}
        <div
          className="p-3 text-white text-center rounded-xl flex items-center justify-between shadow-md"
          style={{ backgroundColor: brandColor }}
        >
          <div className="text-left">
            <div className="text-xs uppercase tracking-widest font-bold opacity-90">
              {activeBranch?.name || 'Sucursal Principal'}
            </div>
            <div className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none">
              {tradeName}
            </div>
          </div>

          <div className="bg-white text-slate-950 font-black text-xs uppercase px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
            {quantityDeal
              ? 'OFERTA POR CANTIDAD'
              : templateType === 'dos_por_uno'
              ? 'PROMOCIÓN 2 × 1'
              : templateType === 'segunda_50'
              ? '2da UNIDAD AL 50%'
              : templateType === 'oferta_tachada'
              ? '¡OFERTA DESTACADA!'
              : 'SUPER PRECIO'}
          </div>
        </div>

        {/* 2. Nombre Inmenso del Producto */}
        <div className="my-auto py-2 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-black uppercase text-slate-950 leading-[1.05] tracking-tight line-clamp-3">
            {item.product_name}
          </h1>
          {item.box_quantity && (
            <div className="mt-2 text-base font-extrabold text-slate-600 uppercase tracking-wider">
              Presentación: {item.box_quantity}
            </div>
          )}
        </div>

        {/* 3. Área Gigantesca de Precios */}
        <div className="my-auto py-4 flex flex-col items-center justify-center text-center">
          {/* Si tiene oferta tachada */}
          {templateType === 'oferta_tachada' && item.previous_price && (
            <div className="mb-2 bg-red-100 border-2 border-red-300 text-red-700 px-6 py-1.5 rounded-full flex items-center gap-3">
              <span className="text-lg font-black uppercase tracking-wider">Antes:</span>
              <span className="text-3xl font-black line-through">
                ${formattedPrice(item.previous_price)}
              </span>
            </div>
          )}

          {/* Render según sea Oferta por Cantidad (6x2000) o Normal */}
          {quantityDeal ? (
            <div className="flex flex-col items-center">
              <div className="flex items-baseline justify-center tracking-tighter leading-none">
                <span className="text-5xl md:text-6xl font-black text-slate-800 mr-2">
                  {quantityDeal.quantity} x
                </span>
                <span className="text-6xl md:text-7xl font-black text-slate-900 leading-none mr-1">
                  $
                </span>
                <span className="text-8xl md:text-[95pt] font-black text-slate-950 leading-none tracking-tighter">
                  {formattedPrice(quantityDeal.totalPrice)}
                </span>
              </div>

              {/* Precio Unitario Calculado */}
              <div className="mt-4 px-6 py-2.5 bg-amber-400 text-slate-950 rounded-2xl border-2 border-slate-950 shadow-md">
                <span className="text-xl md:text-2xl font-black uppercase tracking-wide">
                  Precio Unitario: ${quantityDeal.unitPriceFormatted}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {templateType === 'dos_por_uno' && (
                <div className="mb-3 px-5 py-1.5 bg-amber-400 text-slate-950 font-black text-xl rounded-xl border-2 border-slate-950 uppercase">
                  Llevando 2 u. c/u: ${formattedPrice(item.current_price / 2)}
                </div>
              )}

              {templateType === 'segunda_50' && (
                <div className="mb-3 px-5 py-1.5 bg-blue-500 text-white font-black text-xl rounded-xl border-2 border-slate-950 uppercase">
                  La 2da unidad a: ${formattedPrice(item.current_price * 0.5)}
                </div>
              )}

              {/* Precio Normal Inmenso */}
              <div className="flex items-baseline justify-center tracking-tighter leading-none">
                <span className="text-6xl md:text-7xl font-black text-slate-900 leading-none mr-1">
                  $
                </span>
                <span className="text-8xl md:text-[110pt] font-black text-slate-950 leading-none tracking-tighter">
                  {formattedPrice(item.current_price)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Pie con Código de Barras y Fecha */}
        <div className="border-t-4 border-slate-950 pt-3 mt-auto flex items-end justify-between">
          <div className="w-48">
            <BarcodeRenderer value={item.barcode} height={32} fontSize={12} />
          </div>

          <div className="text-right flex flex-col justify-end">
            <span className="text-xs font-bold text-slate-700 uppercase">
              Precios válidos al {todayStr}
            </span>
            <span className="text-[10px] text-slate-500">
              Hasta agotar stock • Sujeto a condiciones comerciales
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
