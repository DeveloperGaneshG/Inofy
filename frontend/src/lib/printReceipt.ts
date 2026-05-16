import { Bill } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { getStoreSettings } from '@/lib/storeSettings';
import { api } from '@/lib/axios';

async function printViaBackend(bill: Bill): Promise<boolean> {
  const store = getStoreSettings();
  try {
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
        totalPrice: Number(i.totalPrice),
      })),
      subtotal: Number(bill.subtotal),
      taxAmount: Number(bill.taxAmount),
      discountAmount: Number(bill.discountAmount),
      totalAmount: Number(bill.totalAmount),
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
  <div class="center" style="margin-top:6px">Thank you for visiting!</div>
  <div class="center">Come again :)</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=320,height=600,toolbar=0,menubar=0,scrollbars=0');
  if (!win) {
    alert(
      'Popup blocked — please allow popups for this site.\n' +
      'Chrome: click the blocked popup icon in the address bar → "Always allow"',
    );
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.onafterprint = () => win.close();
  }, 300);
}

export async function printReceipt(bill: Bill): Promise<void> {
  // Try direct ESC/POS via backend first (no dialog, instant print)
  const printed = await printViaBackend(bill);
  // Fall back to browser print dialog if backend fails
  if (!printed) {
    printViaBrowser(bill);
  }
}
