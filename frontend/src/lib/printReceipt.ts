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

function printViaBrowser(bill: Bill): void {
  const store = getStoreSettings();
  const barcodeSvg = generateBarcodeSvg(bill.billNumber);

  const itemRows = bill.items
    .map(
      (item) => `
    <div class="item-name">${item.product?.name ?? item.productId}</div>
    <div class="row indent">
      <span>${item.quantity} x ${formatCurrency(Number(item.unitPrice))}</span>
      <span>${formatCurrency(Number(item.totalPrice))}</span>
    </div>`,
    )
    .join('');

  const discountRow =
    Number(bill.discountAmount) > 0
      ? `<div class="row"><span>Discount</span><span>-${formatCurrency(Number(bill.discountAmount))}</span></div>`
      : '';

  const customerRow = bill.customer ? `<div>Customer: ${bill.customer.name}</div>` : '';
  const gstinRow = store.gstin ? `<div class="center">GSTIN: ${store.gstin}</div>` : '';

  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <title>${bill.billNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;padding:3mm}
    .center{text-align:center}
    .row{display:flex;justify-content:space-between}
    .bold{font-weight:bold}
    .lg{font-size:14px}
    .indent{padding-left:8px}
    .item-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .solid{border-top:1px solid #000;margin:4px 0}
    .dash{border-top:1px dashed #000;margin:4px 0}
    @page{size:80mm auto;margin:0}
  </style>
</head><body>
  <div class="center bold lg">${store.name}</div>
  <div class="center">${store.address}</div>
  <div class="center">${store.phone}</div>
  ${gstinRow}
  <div class="solid"></div>
  <div class="center bold">RECEIPT</div>
  <div class="solid"></div>
  <div>Bill: ${bill.billNumber}</div>
  <div>Date: ${new Date(bill.createdAt).toLocaleString('en-IN')}</div>
  <div>Cashier: ${bill.user?.name ?? '—'}</div>
  ${customerRow}
  <div>Payment: ${bill.paymentMethod}</div>
  <div class="dash"></div>
  ${itemRows}
  <div class="dash"></div>
  <div class="row"><span>Subtotal</span><span>${formatCurrency(Number(bill.subtotal))}</span></div>
  <div class="row"><span>GST</span><span>${formatCurrency(Number(bill.taxAmount))}</span></div>
  ${discountRow}
  <div class="solid"></div>
  <div class="row bold lg"><span>TOTAL</span><span>${formatCurrency(Number(bill.totalAmount))}</span></div>
  <div class="solid"></div>
  <div style="text-align:center;margin:6px 0">${barcodeSvg}</div>
  <div class="center" style="margin-top:6px">Thank you for visiting!</div>
  <div class="center">Come again :)</div>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 300);
}

export async function printReceipt(bill: Bill): Promise<void> {
  const printed = await printViaBackend(bill);
  if (!printed) {
    printViaBrowser(bill);
  }
}
