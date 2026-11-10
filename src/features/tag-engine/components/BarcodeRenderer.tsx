import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  width = 1.3,
  height = 32,
  displayValue = true,
  fontSize = 10,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      // Intentar renderizar como EAN-13 si tiene 12 o 13 dígitos
      const cleanVal = value.trim();
      const format = cleanVal.length === 13 && /^\d+$/.test(cleanVal) ? 'EAN13' : 'CODE128';

      JsBarcode(svgRef.current, cleanVal, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        textMargin: 1,
        margin: 0,
        background: 'transparent',
        lineColor: '#000000',
      });
    } catch {
      // Fallback a CODE128 si falla validación EAN13 checksum
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, value, {
            format: 'CODE128',
            width,
            height,
            displayValue,
            fontSize,
            margin: 0,
            background: 'transparent',
            lineColor: '#000000',
          });
        }
      } catch (err) {
        console.error('Error rendering barcode:', err);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  return <svg ref={svgRef} className={`max-w-full ${className}`} />;
};
