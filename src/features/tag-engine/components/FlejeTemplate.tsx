import React from 'react';
import { PrintQueueItem, MarketingTemplate } from '../../../types/database.types';
import { useTenantStore } from '../../../stores/useTenantStore';
import { BarcodeRenderer } from './BarcodeRenderer';
import { parseQuantityDeal } from '../../../utils/priceParser';

interface FlejeTemplateProps {
  item: PrintQueueItem;
  className?: string;
  isThermal?: boolean;
}

export const FlejeTemplate: React.FC<FlejeTemplateProps> = ({ item, className = '', isThermal = false }) => {
  const {
    tradeName,
    whiteLabelName,
    brandColor,
    branchName,
    branchAddress,
    branches,
    activeBranchId,
  } = useTenantStore();
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const nombreComercio = whiteLabelName || tradeName || 'SUPERMERCADO';
  const nombreSucursal = branchName || activeBranch?.name || 'Casa Central';
  const direccionSucursal = branchAddress || activeBranch?.address || (typeof window !== 'undefined' ? localStorage.getItem('branch_address') : null);

  const formattedPrice = (price: number) => {
    return price.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const todayStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  // Detección de oferta por cantidad (ej: "6x2000", "3X1500", "4 x 1000")
  const quantityDeal = parseQuantityDeal(item.price_raw || item.promo_detail || '') ||
                       parseQuantityDeal(item.current_price?.toString() || '');

  // Normalizar tipo de plantilla
  const templateType: MarketingTemplate = item.template_type || 
    (item.promo_type === 'strikethrough' ? 'oferta_tachada' :
     item.promo_type === 'two_for_one' ? 'dos_por_uno' :
     item.promo_type === 'second_50' ? 'segunda_50' : 'normal');

  // RENDER TÉRMICO CONTINUO (58mm / 80mm)
  if (isThermal) {
    return (
      <div
        className={`bg-white text-black p-2 flex flex-col justify-between border-b-2 border-dashed border-slate-400 font-sans ${className}`}
        style={{ width: '100%', minHeight: '48mm' }}
      >
        <div className="flex justify-between items-center border-b border-black pb-1 mb-1">
          <span className="font-black text-lg uppercase tracking-tight leading-none truncate max-w-[200px]">
            {nombreComercio}
          </span>
          {templateType !== 'normal' && (
            <span className="bg-black text-white text-[9px] font-bold px-1 rounded uppercase flex-shrink-0">
              {templateType === 'oferta_tachada' ? 'OFERTA' : templateType === 'dos_por_uno' ? '2x1' : '2da 50%'}
            </span>
          )}
        </div>

        <h3 className="font-black text-base uppercase leading-tight line-clamp-2 my-1 text-center">
          {item.product_name}
        </h3>

        <div className="flex flex-col items-center justify-center my-1">
          {item.previous_price && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold uppercase text-slate-600">Antes</span>
              <span className="text-xs font-bold line-through text-red-600">
                ${formattedPrice(item.previous_price)}
              </span>
            </div>
          )}
          <span className="text-3xl font-black tracking-tight">${formattedPrice(item.current_price)}</span>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-slate-300">
          <div className="w-28">
            <BarcodeRenderer value={item.barcode} height={18} fontSize={8} />
          </div>
          <div className="text-right text-[8.5px] text-slate-600 font-semibold leading-tight">
            <div className="text-[7.5px] text-slate-800 font-bold truncate max-w-[140px]">
              {nombreSucursal}{direccionSucursal ? ` - ${direccionSucursal}` : ''}
            </div>
            {item.box_quantity && <div>Cja: {item.box_quantity}</div>}
            <div>{todayStr}</div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER HOJA A4 (CUADRÍCULA 2x5 = 10 FLEJES POR HOJA)
  return (
    <div
      className={`bg-white text-slate-900 border border-dashed border-slate-500 p-2 flex flex-col justify-between relative overflow-hidden select-none box-border ${className}`}
      style={{ height: '100%', width: '100%' }}
    >
      {/* 1. Encabezado Dinámico con Color Corporativo y Nombre del Comercio */}
      <div
        className="flex justify-between items-center pb-0.5 mb-1 border-b-2"
        style={{ borderColor: brandColor }}
      >
        <span
          className="font-black text-xl uppercase tracking-tight truncate mr-1 leading-none"
          style={{ color: brandColor }}
        >
          {nombreComercio}
        </span>

        {/* Badge Dinámico según Plantilla de Marketing */}
        {templateType === 'normal' && (
          <span
            className="text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide flex-shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            PRECIO
          </span>
        )}
        {templateType === 'oferta_tachada' && (
          <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide animate-pulse flex-shrink-0">
            ¡OFERTA!
          </span>
        )}
        {templateType === 'dos_por_uno' && (
          <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wide flex-shrink-0">
            2 × 1
          </span>
        )}
        {templateType === 'segunda_50' && (
          <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide flex-shrink-0">
            2da al 50%
          </span>
        )}
      </div>

      {/* 2. Nombre del Producto: Alineado al Centro */}
      <div className="my-0.5 text-center px-1">
        <h3 className="font-black text-[14.5px] uppercase leading-tight line-clamp-2 text-slate-950 text-center">
          {item.product_name}
        </h3>
      </div>

      {/* 3. Área Central de Precios Adaptada a la Plantilla */}
      <div className="flex-1 flex flex-col items-center justify-center my-0.5 text-center">
        {/* Plantilla: Oferta con Precio Tachado */}
        {templateType === 'oferta_tachada' && item.previous_price && (
          <div className="flex items-center justify-center gap-1.5 leading-none mb-0.5 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            <span className="text-[9px] font-bold text-red-700 uppercase">Antes:</span>
            <span className="text-xs font-black text-red-600 line-through">
              ${formattedPrice(item.previous_price)}
            </span>
          </div>
        )}

        {/* Plantilla: 2x1 */}
        {templateType === 'dos_por_uno' && (
          <div className="text-[9.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded leading-tight mb-0.5">
            Llevando 2 u. c/u: <strong className="font-black text-amber-900">${formattedPrice(item.current_price / 2)}</strong>
          </div>
        )}

        {/* Plantilla: 2da Unidad al 50% */}
        {templateType === 'segunda_50' && (
          <div className="text-[9.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded leading-tight mb-0.5">
            La 2da unidad a: <strong className="font-black text-blue-900">${formattedPrice(item.current_price * 0.5)}</strong>
          </div>
        )}

        {/* Precio Actual: Render Dinámico según Oferta por Cantidad o Precio Normal */}
        {quantityDeal ? (
          <div className="flex flex-col items-center justify-center my-0.5">
            <div className="flex items-baseline justify-center gap-1 leading-none">
              <span className="text-2xl font-black text-slate-800 leading-none">
                {quantityDeal.quantity} x
              </span>
              <span className="text-xl font-black text-slate-900 leading-none">$</span>
              <span className="text-4xl font-black text-slate-950 tracking-tighter leading-none">
                {formattedPrice(quantityDeal.totalPrice)}
              </span>
            </div>
            <div className="text-[10px] font-black text-slate-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full mt-1 uppercase tracking-wide">
              Unidad: ${quantityDeal.unitPriceFormatted}
            </div>
          </div>
        ) : (
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-2xl font-black text-slate-900 leading-none">$</span>
            <span className="text-5xl font-black text-slate-950 tracking-tighter leading-none">
              {formattedPrice(item.current_price)}
            </span>
          </div>
        )}
      </div>

      {/* 4. Pie: Código de Barras EAN-13 + Dirección Sucursal + Cantidad por Caja y Fecha */}
      <div className="flex justify-between items-end border-t border-slate-200 pt-0.5 mt-0.5">
        <div className="w-28">
          <BarcodeRenderer value={item.barcode} height={17} fontSize={7.5} />
        </div>

        <div className="text-right text-[9px] font-semibold text-slate-600 leading-tight">
          <div className="text-[7.5px] text-slate-500 font-medium truncate max-w-[150px]">
            {nombreSucursal}{direccionSucursal ? ` - ${direccionSucursal}` : ''}
          </div>
          {item.box_quantity && (
            <div className="text-slate-900 font-bold">Cja: {item.box_quantity}</div>
          )}
          <div className="text-[8px] text-slate-400">{todayStr}</div>
        </div>
      </div>
    </div>
  );
};
