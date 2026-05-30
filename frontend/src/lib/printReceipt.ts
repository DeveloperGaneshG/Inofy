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

  const ID = 'invofy-receipt-print';

  // Remove any previous print container
  document.getElementById(ID)?.remove();

  const container = document.createElement('div');
  container.id = ID;
  container.innerHTML = `
    <style>
      /* Screen: hide receipt container */
      #${ID} { display: none; }

      /* Print: hide everything else, show only receipt */
      @media print {
        body > *:not(#${ID}) { display: none !important; }
        #${ID} {
          display: block !important;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.6;
          color: #000;
        }
        @page { size: 80mm auto; margin: 3mm 4mm; }
        .rp-c  { text-align: center; }
        .rp-row{ display: flex; justify-content: space-between; gap: 4px; }
        .rp-bold { font-weight: bold; }
        .rp-xl { font-size: 14px; }
        .rp-lg { font-size: 13px; }
        .rp-item { margin-bottom: 3px; }
        .rp-iname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
        .rp-iamt  { flex-shrink: 0; white-space: nowrap; font-weight: 600; }
        .rp-isub  { padding-left: 8px; font-size: 10px; color: #333; }
        .rp-sep  { border-top: 1px solid #000; margin: 4px 0; }
        .rp-dash { border-top: 1px dashed #000; margin: 4px 0; }
      }
    </style>

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
    <div class="rp-c" style="margin:4px 0">${barcodeSvg}</div>
    <div class="rp-c rp-bold">** Thank you for shopping! **</div>
    <div class="rp-c">Please visit us again</div>
  `;

  document.body.appendChild(container);

  // window.print() on the main window — the only call that respects --kiosk-printing
  window.print();

  setTimeout(() => container.remove(), 1000);
}

export async function printReceipt(bill: Bill): Promise<void> {
  const printed = await printViaBackend(bill);
  if (!printed) {
    printReceiptBrowser(bill);
  }
}
