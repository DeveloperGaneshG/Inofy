import { Printer } from 'lucide-react';
import { Bill } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Props {
  bill: Bill;
}

const MART_NAME = 'Invofy Mart';
const MART_ADDRESS = '123 Market St, City - 560001';
const MART_PHONE = '+91 98765 43210';

export default function Receipt({ bill }: Props) {
  const handleThermalPrint = () => {
    const itemRows = bill.items.map((item) => `
      <div class="item-name">${item.product?.name ?? item.productId}</div>
      <div class="row indent">
        <span>${item.quantity} x ${formatCurrency(Number(item.unitPrice))}</span>
        <span>${formatCurrency(Number(item.totalPrice))}</span>
      </div>`).join('');

    const discountRow = Number(bill.discountAmount) > 0
      ? `<div class="row"><span>Discount</span><span>-${formatCurrency(Number(bill.discountAmount))}</span></div>`
      : '';

    const customerRow = bill.customer ? `<div>Customer: ${bill.customer.name}</div>` : '';

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
  <div class="center bold lg">${MART_NAME}</div>
  <div class="center">${MART_ADDRESS}</div>
  <div class="center">${MART_PHONE}</div>
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
    if (!win) { alert('Popup blocked — please allow popups for this site.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  };

  return (
    <div>
      <div className="mb-4 no-print">
        <Button variant="outline" size="sm" onClick={handleThermalPrint}>
          <Printer className="h-3 w-3" /> Print Receipt
        </Button>
      </div>

      {/* Thermal Receipt — 80mm style */}
      <div className="thermal-receipt mx-auto border bg-white p-4 shadow-sm print:shadow-none" style={{ width: '80mm', fontFamily: 'Courier New, monospace', fontSize: '12px' }}>
        <div className="text-center">
          <p className="font-bold text-base">{MART_NAME}</p>
          <p>{MART_ADDRESS}</p>
          <p>{MART_PHONE}</p>
          <p>{'='.repeat(36)}</p>
          <p className="font-bold">RECEIPT</p>
          <p>{'='.repeat(36)}</p>
        </div>

        <div className="my-1">
          <p>Bill: {bill.billNumber}</p>
          <p>Date: {new Date(bill.createdAt).toLocaleString('en-IN')}</p>
          <p>Cashier: {bill.user?.name}</p>
          {bill.customer && <p>Customer: {bill.customer.name}</p>}
          <p>Payment: {bill.paymentMethod}</p>
        </div>

        <p>{'-'.repeat(36)}</p>

        {/* Items */}
        {bill.items.map((item) => (
          <div key={item.id}>
            <p className="truncate">{item.product?.name ?? item.productId}</p>
            <div className="flex justify-between">
              <span>  {item.quantity} × {formatCurrency(Number(item.unitPrice))}</span>
              <span>{formatCurrency(Number(item.totalPrice))}</span>
            </div>
          </div>
        ))}

        <p>{'-'.repeat(36)}</p>

        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(bill.subtotal))}</span></div>
        <div className="flex justify-between"><span>GST</span><span>{formatCurrency(Number(bill.taxAmount))}</span></div>
        {Number(bill.discountAmount) > 0 && (
          <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(Number(bill.discountAmount))}</span></div>
        )}

        <p>{'='.repeat(36)}</p>
        <div className="flex justify-between font-bold text-base">
          <span>TOTAL</span>
          <span>{formatCurrency(Number(bill.totalAmount))}</span>
        </div>
        <p>{'='.repeat(36)}</p>

        <div className="mt-2 text-center">
          <p>Thank you for visiting!</p>
          <p>Come again :)</p>
        </div>
      </div>
    </div>
  );
}
