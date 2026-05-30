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
    <div class="item">
      <div class="row">
        <span class="iname">${i + 1}. ${item.product?.name ?? item.productId}</span>
        <span class="iamt">${formatCurrency(Number(item.totalPrice))}</span>
      </div>
      <div class="isub">${sub}</div>
    </div>`;
  }).join('');

  const discountRow = Number(bill.discountAmount) > 0
    ? `<div class="row"><span>Discount</span><span>-${formatCurrency(Number(bill.discountAmount))}</span></div>`
    : '';
  const taxRow = Number(bill.taxAmount) > 0
    ? `<div class="row"><span>GST</span><span>${formatCurrency(Number(bill.taxAmount))}</span></div>`
    : '';
  const customerRow = bill.customer ? `<div>Customer : ${bill.customer.name}</div>` : '';
  const gstinRow    = store.gstin   ? `<div class="c">GSTIN: ${store.gstin}</div>`    : '';

  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <title>${bill.billNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;line-height:1.6}
    .c{text-align:center}
    .row{display:flex;justify-content:space-between;gap:4px}
    .bold{font-weight:bold}
    .xl{font-size:14px}
    .lg{font-size:13px}
    .item{margin-bottom:3px}
    .iname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
    .iamt{flex-shrink:0;white-space:nowrap;font-weight:600}
    .isub{padding-left:8px;font-size:10px;color:#333}
    .sep{border-top:1px solid #000;margin:4px 0}
    .dash{border-top:1px dashed #000;margin:4px 0}
    @page{size:80mm auto;margin:3mm 4mm}
  </style>
</head><body>
  <div class="c bold xl">${store.name}</div>
  <div class="c">${store.address}</div>
  <div class="c">Tel: ${store.phone}</div>
  ${gstinRow}
  <div class="sep"></div>
  <div class="c bold">TAX RECEIPT</div>
  <div class="sep"></div>
  <div>Bill No : ${bill.billNumber}</div>
  <div>Date    : ${new Date(bill.createdAt).toLocaleString('en-IN')}</div>
  <div>Cashier : ${bill.user?.name ?? '—'}</div>
  ${customerRow}
  <div>Payment : ${bill.paymentMethod}</div>
  <div class="dash"></div>
  ${itemRows}
  <div class="dash"></div>
  <div class="row"><span>Subtotal</span><span>${formatCurrency(Number(bill.subtotal))}</span></div>
  ${taxRow}
  ${discountRow}
  <div class="sep"></div>
  <div class="row bold lg"><span>TOTAL</span><span>${formatCurrency(Number(bill.totalAmount))}</span></div>
  <div class="sep"></div>
  <div class="c" style="margin:4px 0">${barcodeSvg}</div>
  <div class="c bold">** Thank you for shopping! **</div>
  <div class="c">Please visit us again</div>
</body></html>`;

  // Use iframe in the main document so Chrome uses the same printer context as Ctrl+P
  const FRAME_ID = 'invofy-print-frame';
  const existing = document.getElementById(FRAME_ID);
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = FRAME_ID;
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 2000);
  }, 500);
}

export async function printReceipt(bill: Bill): Promise<void> {
  const printed = await printViaBackend(bill);
  if (!printed) {
    printReceiptBrowser(bill);
  }
}
