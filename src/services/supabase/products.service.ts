import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PrintQueueItem } from '../../types/database.types';

// Catálogo maestro de muestra para contingencia offline o test sin Supabase
const LOCAL_MOCK_CATALOG: Record<string, Partial<PrintQueueItem>> = {
  '7790040123456': { product_name: 'Alfajor Havanna Mixto 90g', current_price: 1850, previous_price: 2200, promo_type: 'strikethrough', box_quantity: '12 u.' },
  '7790040654321': { product_name: 'Caramelos Sugus Confitados 50g', current_price: 750, promo_type: 'none', box_quantity: '24 u.' },
  '7790040987654': { product_name: 'Chocolate Cadbury Frutilla 150g', current_price: 3400, previous_price: 3900, promo_type: 'two_for_one', promo_detail: '2x1 Llevando 2', box_quantity: '16 u.' },
  '7790040112233': { product_name: 'Chicles Beldent Menta 10g', current_price: 650, promo_type: 'none', box_quantity: '20 u.' },
  '7790040445566': { product_name: 'Turrón Arcor Maní y Miel 25g', current_price: 420, promo_type: 'none', box_quantity: '50 u.' },
  '7790040778899': { product_name: 'Gomitas Mogul Ositos Ácidos 100g', current_price: 1250, previous_price: 1500, promo_type: 'second_50', promo_detail: '2da al 50%', box_quantity: '12 u.' },
  '7790040332211': { product_name: 'Alfajor Guaymallén Triple Blanco', current_price: 550, promo_type: 'none', box_quantity: '24 u.' },
  '7790040998877': { product_name: 'Bon o Bon Leche Display 15g', current_price: 480, promo_type: 'none', box_quantity: '30 u.' },
  '7790040556677': { product_name: 'Oblea Tita Clásica 19g', current_price: 390, promo_type: 'none', box_quantity: '36 u.' },
  '7790040889900': { product_name: 'Alfajor Capitán del Espacio Negro', current_price: 890, previous_price: 1050, promo_type: 'strikethrough', box_quantity: '24 u.' },
};

export async function fetchProductByBarcode(barcode: string, orgId: string, branchId: string): Promise<Omit<PrintQueueItem, 'id' | 'created_at' | 'status'>> {
  const cleanBarcode = barcode.trim();

  // 1. Si Supabase está conectado, consultar base de datos en la nube
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          barcode,
          box_quantity,
          branch_prices (
            current_price,
            previous_price,
            promo_type,
            promo_detail
          )
        `)
        .eq('organization_id', orgId)
        .eq('barcode', cleanBarcode)
        .single();

      if (!error && data) {
        const priceInfo = Array.isArray(data.branch_prices) ? data.branch_prices[0] : (data.branch_prices as any);
        return {
          organization_id: orgId,
          branch_id: branchId,
          product_id: data.id,
          product_name: data.name,
          barcode: data.barcode,
          current_price: priceInfo?.current_price || 990,
          previous_price: priceInfo?.previous_price || null,
          promo_type: priceInfo?.promo_type || 'none',
          promo_detail: priceInfo?.promo_detail || null,
          box_quantity: data.box_quantity || null,
          quantity: 1,
          source: 'scanner_mobile',
          preferred_mode: 'a4_sheet',
        };
      }
    } catch (err) {
      console.warn('Fallo consulta Supabase, usando catálogo local:', err);
    }
  }

  // 2. Consulta en catálogo local de respaldo
  const localMatch = LOCAL_MOCK_CATALOG[cleanBarcode];
  if (localMatch) {
    return {
      organization_id: orgId,
      branch_id: branchId,
      product_id: `prod-${cleanBarcode}`,
      product_name: localMatch.product_name || `Artículo ${cleanBarcode}`,
      barcode: cleanBarcode,
      current_price: localMatch.current_price || 950,
      previous_price: localMatch.previous_price || null,
      promo_type: localMatch.promo_type || 'none',
      promo_detail: localMatch.promo_detail || null,
      box_quantity: localMatch.box_quantity || null,
      quantity: 1,
      source: 'scanner_mobile',
      preferred_mode: 'a4_sheet',
    };
  }

  // 3. Fallback dinámico si es un código nuevo no registrado
  return {
    organization_id: orgId,
    branch_id: branchId,
    product_id: `prod-scanned-${Date.now()}`,
    product_name: `Artículo Góndola (${cleanBarcode.slice(-4)})`,
    barcode: cleanBarcode,
    current_price: 990,
    previous_price: null,
    promo_type: 'none',
    box_quantity: '24 u.',
    quantity: 1,
    source: 'scanner_mobile',
    preferred_mode: 'a4_sheet',
  };
}
