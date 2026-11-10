import React, { useState, useRef, useEffect } from 'react';
import { MarketingTemplate } from '../../../types/database.types';
import { usePrintQueueStore } from '../../../stores/usePrintQueueStore';
import { useTenantStore } from '../../../stores/useTenantStore';
import { Sparkles, Plus, CornerDownLeft, Sparkle } from 'lucide-react';
import { parseQuantityDeal } from '../../../utils/priceParser';

export const FastInputForm: React.FC = () => {
  const { addItem } = usePrintQueueStore();
  const { organization, activeBranchId } = useTenantStore();

  const [productName, setProductName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [templateType, setTemplateType] = useState<MarketingTemplate>('normal');
  const [previousPrice, setPreviousPrice] = useState('');
  const [boxQuantity, setBoxQuantity] = useState('');

  // Refs para navegación ágil por teclado
  const inputNameRef = useRef<HTMLInputElement | null>(null);
  const inputBarcodeRef = useRef<HTMLInputElement | null>(null);
  const inputPriceRef = useRef<HTMLInputElement | null>(null);
  const inputOldPriceRef = useRef<HTMLInputElement | null>(null);
  const inputBoxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputNameRef.current?.focus();
  }, []);

  const handleGenerateEan = () => {
    const prefix = '779' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(prefix[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setBarcode(prefix + checkDigit);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const name = productName.trim();
    const deal = parseQuantityDeal(currentPrice);
    const priceNum = deal ? deal.totalPrice : parseFloat(currentPrice.replace(/\./g, '').replace(',', '.'));

    if (!name) {
      inputNameRef.current?.focus();
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      inputPriceRef.current?.focus();
      return;
    }

    const finalBarcode = barcode.trim() || '779' + Math.floor(1000000000 + Math.random() * 9000000000);
    const oldPriceNum = templateType === 'oferta_tachada' && previousPrice 
      ? parseFloat(previousPrice.replace(/\./g, '').replace(',', '.')) 
      : null;

    addItem({
      organization_id: organization.id,
      branch_id: activeBranchId,
      product_id: `prod-${Date.now()}`,
      product_name: name,
      barcode: finalBarcode,
      current_price: priceNum,
      previous_price: oldPriceNum,
      price_raw: deal ? currentPrice.trim() : null,
      promo_type: templateType === 'oferta_tachada' ? 'strikethrough' :
                  templateType === 'dos_por_uno' ? 'two_for_one' :
                  templateType === 'segunda_50' ? 'second_50' : 'none',
      template_type: templateType,
      promo_detail: deal ? deal.displayDeal : (templateType === 'dos_por_uno' ? '2x1' : templateType === 'segunda_50' ? '2da al 50%' : null),
      box_quantity: boxQuantity.trim() || null,
      quantity: 1,
      source: 'manual',
      preferred_mode: 'a4_sheet',
    });

    // Limpiar formulario y reenfocar
    setProductName('');
    setBarcode('');
    setCurrentPrice('');
    setPreviousPrice('');
    setBoxQuantity('');
    setTemplateType('normal');

    inputNameRef.current?.focus();
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-700">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <span>Nuevo Fleje</span>
        </h2>
        <span className="text-[10px] font-medium bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
          <CornerDownLeft className="w-3 h-3 text-emerald-400" />
          <span>[Enter] navega y carga</span>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* 1. Nombre del Producto */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Nombre del Producto *
          </label>
          <input
            ref={inputNameRef}
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (productName.trim()) inputBarcodeRef.current?.focus();
              }
            }}
            placeholder="Ej: Alfajor Guaymallén Blanco 38g"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* 2. Código de Barras EAN-13 */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[11px] font-semibold text-slate-300">
              Código de Barras (EAN-13)
            </label>
            <button
              type="button"
              onClick={handleGenerateEan}
              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
              tabIndex={-1}
            >
              <Sparkles className="w-3 h-3" />
              <span>Generar EAN</span>
            </button>
          </div>
          <input
            ref={inputBarcodeRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                inputPriceRef.current?.focus();
              }
            }}
            placeholder="Ej: 7790040123456"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* 3. Selector de Plantillas de Marketing */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Sparkle className="w-3 h-3 text-amber-400" />
            <span>Tipo de Plantilla de Marketing</span>
          </label>
          <select
            value={templateType}
            onChange={(e) => {
              const val = e.target.value as MarketingTemplate;
              setTemplateType(val);
              if (val === 'oferta_tachada') {
                setTimeout(() => inputOldPriceRef.current?.focus(), 50);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="normal">🏷️ Normal</option>
            <option value="oferta_tachada">🔥 Oferta (Precio Tachado)</option>
            <option value="dos_por_uno">✨ 2x1 (Llevás 2 Pagás 1)</option>
            <option value="segunda_50">⚡ 2da Unidad al 50%</option>
          </select>
        </div>

        {/* 4. Precio Actual y Cantidad por Caja */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Precio Actual ($) *
            </label>
            <input
              ref={inputPriceRef}
              type="text"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (templateType === 'oferta_tachada') {
                    inputOldPriceRef.current?.focus();
                  } else {
                    inputBoxRef.current?.focus();
                  }
                }
              }}
              placeholder="Ej: 1450 o 6x2000"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Cant. por Caja
            </label>
            <input
              ref={inputBoxRef}
              type="text"
              value={boxQuantity}
              onChange={(e) => setBoxQuantity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ej: 24 u."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* 5. Campo condicional si la plantilla es Oferta con Precio Anterior */}
        {templateType === 'oferta_tachada' && (
          <div className="p-2 bg-red-950/40 border border-red-800/60 rounded-lg">
            <label className="block text-[10px] font-bold text-red-300 mb-1">
              Precio Anterior / Tachado ($)
            </label>
            <input
              ref={inputOldPriceRef}
              type="text"
              value={previousPrice}
              onChange={(e) => setPreviousPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  inputBoxRef.current?.focus();
                }
              }}
              placeholder="Ej: 1800"
              className="w-full bg-slate-900 border border-red-700/60 rounded px-2 py-1 text-xs text-red-400 font-bold focus:outline-none focus:border-red-500"
            />
          </div>
        )}

        {/* Botón Agregar */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-blue-600/30 transition active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar a la Tanda (Enter)</span>
        </button>
      </form>
    </div>
  );
};
