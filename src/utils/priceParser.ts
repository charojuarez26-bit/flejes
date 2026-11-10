export interface QuantityDeal {
  quantity: number;
  totalPrice: number;
  unitPrice: number;
  displayDeal: string;
  unitPriceFormatted: string;
}

/**
 * Detecta si una cadena de texto o valor numérico corresponde a un patrón
 * de oferta por cantidad tipo "6x2000", "3X1500", "4 x 1000", "6 x $2000", etc.
 */
export const parseQuantityDeal = (
  value: string | number | null | undefined
): QuantityDeal | null => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Regex para capturar: Cantidad [x|X|*] [opcional $] PrecioTotal
  // Ejemplos válidos: "6x2000", "3X1500", "4 x 1000", "6 x $2000", "2 x 500"
  const match = str.match(/^(\d+)\s*[xX*]\s*\$?\s*([\d.,\s]+)$/);
  if (!match) return null;

  const quantity = parseInt(match[1], 10);
  if (isNaN(quantity) || quantity <= 1) return null;

  // Limpieza de formato de precio (puntos de miles o comas decimales)
  let rawPrice = match[2].replace(/\s/g, '');
  if (rawPrice.includes(',') && rawPrice.includes('.')) {
    rawPrice = rawPrice.replace(/\./g, '').replace(',', '.');
  } else if (rawPrice.includes(',')) {
    rawPrice = rawPrice.replace(',', '.');
  } else if (rawPrice.includes('.') && rawPrice.split('.')[1]?.length === 3) {
    rawPrice = rawPrice.replace(/\./g, '');
  }

  const totalPrice = parseFloat(rawPrice);
  if (isNaN(totalPrice) || totalPrice <= 0) return null;

  // Excluir casos como "2x1" que son plantillas 2x1 y no precio total
  if (totalPrice <= 1) return null;

  const unitPrice = totalPrice / quantity;

  return {
    quantity,
    totalPrice,
    unitPrice,
    displayDeal: `${quantity} x $${totalPrice.toLocaleString('es-AR')}`,
    unitPriceFormatted: unitPrice.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };
};
