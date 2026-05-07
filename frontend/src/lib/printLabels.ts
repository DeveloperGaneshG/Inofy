import JsBarcode from 'jsbarcode';
import { Product } from '@/types';

function generateBarcodeSVG(value: string): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: 2,
      height: 48,
      displayValue: true,
      fontSize: 11,
      margin: 4,
      lineColor: '#000',
    });
  } catch {
    // fallback: just show the raw value as text if barcode generation fails
    return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><text x="50%" y="50%" text-anchor="middle" font-size="10" fill="#555">${value}</text></svg>`;
  }
  return svg.outerHTML;
}

function labelHTML(product: Product): string {
  const barcodeValue = product.barcode || product.sku;
  const barcodeSVG = generateBarcodeSVG(barcodeValue);

  const mrp = product.mrp ? Number(product.mrp) : null;
  const price = Number(product.price);
  const hasDiscount = mrp !== null && mrp > price;
  const discountPct = hasDiscount ? Math.round(((mrp! - price) / mrp!) * 100) : 0;
  const gst = Number(product.gstRate ?? 18);

  const mrpLine = mrp
    ? `<span class="mrp">${hasDiscount ? `<s>MRP ₹${mrp.toFixed(2)}</s>` : `MRP ₹${mrp.toFixed(2)}`}</span>`
    : '';

  const discountBadge = hasDiscount
    ? `<span class="discount">${discountPct}% OFF</span>`
    : '';

  return `
    <div class="label">
      <div class="store-name">INVOFY MART</div>
      <div class="barcode">${barcodeSVG}</div>
      <div class="product-name">${product.name}</div>
      <div class="sku">SKU: ${product.sku}</div>
      <div class="price-row">
        ${mrpLine}
        <span class="sell-price">₹${price.toFixed(2)}</span>
        ${discountBadge}
      </div>
      <div class="gst-line">Incl. ${gst}% GST</div>
    </div>
  `;
}

export function printProductLabels(products: Product[], copies: number = 1): void {
  const labels = products
    .flatMap((p) => Array(copies).fill(null).map(() => labelHTML(p)))
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Barcode Labels</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; }

    .labels-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4mm;
      padding: 6mm;
    }

    .label {
      width: 60mm;
      min-height: 42mm;
      border: 1px dashed #bbb;
      padding: 2.5mm 3mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .store-name {
      font-size: 7pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      color: #333;
      text-transform: uppercase;
    }

    .barcode svg {
      max-width: 54mm;
      height: auto;
    }

    .product-name {
      font-size: 8pt;
      font-weight: bold;
      text-align: center;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sku {
      font-size: 6.5pt;
      color: #666;
      font-family: monospace;
    }

    .price-row {
      display: flex;
      align-items: center;
      gap: 2mm;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 1mm;
    }

    .mrp {
      font-size: 7pt;
      color: #888;
    }

    .mrp s {
      color: #999;
    }

    .sell-price {
      font-size: 11pt;
      font-weight: bold;
      color: #000;
    }

    .discount {
      font-size: 6.5pt;
      background: #e63946;
      color: #fff;
      padding: 0.5mm 1.5mm;
      border-radius: 2px;
      font-weight: bold;
    }

    .gst-line {
      font-size: 6pt;
      color: #999;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 6mm;
      }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="labels-grid">${labels}</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
</body>
</html>`;

  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) {
    alert('Please allow popups to print labels.');
    return;
  }
  popup.document.write(html);
  popup.document.close();
}
