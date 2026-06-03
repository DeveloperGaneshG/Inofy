import JsBarcode from 'jsbarcode';
import { Bill } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { getStoreSettings } from '@/lib/storeSettings';
import { api } from '@/lib/axios';

function generateBarcodeSvg(value: string): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 10, margin: 4 });
  return svg.outerHTML;
}

async function printViaBackend(bill: Bill): Promise<boolean> {
  const store = getStoreSettings();
  try {
    const itemSavings = bill.items.reduce((sum, item) => {
      const mrp = Number(item.product?.mrp ?? item.unitPrice);
      const disc = mrp > Number(item.unitPrice) ? (mrp - Number(item.unitPrice)) * item.quantity : 0;
      return sum + disc;
    }, 0);
    const savedAmount = itemSavings + Number(bill.discountAmount);

    const res = await api.post('/print/receipt', {
      billNumber: bill.billNumber,
      createdAt: bill.createdAt,
      cashier: bill.user?.name ?? '—',
      customer: bill.customer?.name,
      paymentMethod: bill.paymentMethod,
      items: bill.items.map((i) => ({
        name: i.product?.name ?? i.productId,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        mrp: Number(i.product?.mrp ?? i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      subtotal: Number(bill.subtotal),
      taxAmount: Number(bill.taxAmount),
      discountAmount: Number(bill.discountAmount),
      totalAmount: Number(bill.totalAmount),
      savedAmount: savedAmount > 0 ? savedAmount : undefined,
      storeName: store.name,
      storeAddress: store.address,
      storePhone: store.phone,
      storeGstin: store.gstin,
    });
    return res.data?.success === true;
  } catch {
    return false;
  }
}

export function printReceiptBrowser(bill: Bill): void {
  const store = getStoreSettings();
  const barcodeSvg = generateBarcodeSvg(bill.billNumber);

  const itemRows = bill.items.map((item, i) => {
    const mrp  = Number(item.product?.mrp ?? item.unitPrice);
    const sold = Number(item.unitPrice);
    const qty  = item.quantity;
    const disc = mrp > sold ? (mrp - sold) * qty : 0;
    const sub  = disc > 0
      ? `${qty} x ${formatCurrency(mrp)} (saved ${formatCurrency(disc)})`
      : `${qty} x ${formatCurrency(sold)}`;
    return `
    <div class="rp-item">
      <div class="rp-row">
        <span class="rp-iname">${i + 1}. ${item.product?.name ?? item.productId}</span>
        <span class="rp-iamt">${formatCurrency(Number(item.totalPrice))}</span>
      </div>
      <div class="rp-isub">${sub}</div>
    </div>`;
  }).join('');

  const discountRow = Number(bill.discountAmount) > 0
    ? `<div class="rp-row"><span>Discount</span><span>-${formatCurrency(Number(bill.discountAmount))}</span></div>`
    : '';
  const taxRow = Number(bill.taxAmount) > 0
    ? `<div class="rp-row"><span>GST</span><span>${formatCurrency(Number(bill.taxAmount))}</span></div>`
    : '';
  const customerRow = bill.customer ? `<div>Customer : ${bill.customer.name}</div>` : '';
  const gstinRow    = store.gstin   ? `<div class="rp-c">GSTIN: ${store.gstin}</div>` : '';

  const itemSavings = bill.items.reduce((sum, item) => {
    const mrp = Number(item.product?.mrp ?? item.unitPrice);
    const disc = mrp > Number(item.unitPrice) ? (mrp - Number(item.unitPrice)) * item.quantity : 0;
    return sum + disc;
  }, 0);
  const totalSaved = itemSavings + Number(bill.discountAmount);
  const savedRow = totalSaved > 0
    ? `<div class="rp-c rp-bold">** You saved ${formatCurrency(totalSaved)} on this bill! **</div>`
    : '';

  const STYLE_ID = 'invofy-print-style';
  const DIV_ID   = 'invofy-receipt-print';

  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(DIV_ID)?.remove();

  const headStyle = document.createElement('style');
  headStyle.id = STYLE_ID;
  // @page MUST be at top level — Chrome ignores it when nested inside @media print
  // Width 72mm = actual printable area of an 80mm thermal roll (4mm margin each side)
  headStyle.textContent = `
    @page { size: 80mm auto; margin: 0mm; }

    @media print {
      html, body {
        width: 80mm !important;
        min-width: 0 !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body > * { display: none !important; }
      body > #${DIV_ID} { display: block !important; }
      #${DIV_ID} {
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        line-height: 1.5;
        width: 72mm;
        max-width: 72mm;
        box-sizing: border-box;
        padding: 2mm 2mm;
        margin: 0;
        color: #000;
        overflow: hidden;
      }
      #${DIV_ID} svg {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 0 auto;
      }
      .rp-c    { text-align: center; }
      .rp-row  { display: flex; justify-content: space-between; gap: 4px; width: 100%; overflow: hidden; }
      .rp-bold { font-weight: bold; }
      .rp-xl   { font-size: 13px; }
      .rp-lg   { font-size: 12px; }
      .rp-item { margin-bottom: 2px; width: 100%; overflow: hidden; }
      .rp-iname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
      .rp-iamt  { flex-shrink: 0; white-space: nowrap; font-weight: 600; }
      .rp-isub  { padding-left: 6px; font-size: 9px; color: #444; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .rp-sep   { border-top: 1px solid #000; margin: 3px 0; }
      .rp-dash  { border-top: 1px dashed #000; margin: 3px 0; }
    }
    #${DIV_ID} { display: none; }
  `;
  document.head.appendChild(headStyle);

  // Receipt content div (hidden on screen, visible during print via head style)
  const div = document.createElement('div');
  div.id = DIV_ID;
  div.innerHTML = `
    <div class="rp-c rp-bold rp-xl">${store.name}</div>
    <div class="rp-c">${store.address}</div>
    <div class="rp-c">Tel: ${store.phone}</div>
    ${gstinRow}
    <div class="rp-sep"></div>
    <div class="rp-c rp-bold">TAX RECEIPT</div>
    <div class="rp-sep"></div>
    <div>Bill No : ${bill.billNumber}</div>
    <div>Date    : ${new Date(bill.createdAt).toLocaleString('en-IN')}</div>
    <div>Cashier : ${bill.user?.name ?? '—'}</div>
    ${customerRow}
    <div>Payment : ${bill.paymentMethod}</div>
    <div class="rp-dash"></div>
    ${itemRows}
    <div class="rp-dash"></div>
    <div class="rp-row"><span>Subtotal</span><span>${formatCurrency(Number(bill.subtotal))}</span></div>
    ${taxRow}
    ${discountRow}
    <div class="rp-sep"></div>
    <div class="rp-row rp-bold rp-lg"><span>TOTAL</span><span>${formatCurrency(Number(bill.totalAmount))}</span></div>
    <div class="rp-sep"></div>
    ${savedRow}
    <div class="rp-c" style="margin:4px 0">${barcodeSvg}</div>
    <div class="rp-c rp-bold">** Thank you for shopping! **</div>
    <div class="rp-c">Please visit us again</div>
  `;
  document.body.appendChild(div);

  window.print();

  setTimeout(() => {
    headStyle.remove();
    div.remove();
  }, 1000);
}

export async function printReceipt(bill: Bill): Promise<void> {
  const printed = await printViaBackend(bill);
  if (!printed) {
    printReceiptBrowser(bill);
  }
}
