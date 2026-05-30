import { useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import { Bill } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { getStoreSettings } from '@/lib/storeSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { printReceiptBrowser } from '@/lib/printReceipt';

interface Props {
  bill: Bill | null;
  onClose: () => void;
  onNewBill: () => void;
  onViewInvoice: () => void;
}

export default function ReceiptPreviewModal({ bill, onClose, onNewBill, onViewInvoice }: Props) {
  const barcodeRef = useCallback((node: SVGSVGElement | null) => {
    if (node && bill?.billNumber) {
      JsBarcode(node, bill.billNumber, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 4,
      });
    }
  }, [bill?.billNumber]);

  if (!bill) return null;

  const store = getStoreSettings();
  const date = new Date(bill.createdAt).toLocaleString('en-IN');

  return (
    <Dialog open={!!bill} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 no-print">
          <DialogTitle className="text-base">Receipt Preview</DialogTitle>
        </DialogHeader>

        {/* Receipt preview */}
        <div className="receipt-print-content mx-4 mb-2 max-h-[60vh] overflow-y-auto rounded border bg-white p-3 text-[11px] leading-5"
          style={{ fontFamily: '"Courier New", Courier, monospace' }}>

          <div className="text-center font-bold text-sm">{store.name}</div>
          <div className="text-center">{store.address}</div>
          <div className="text-center">Tel: {store.phone}</div>
          {store.gstin && <div className="text-center">GSTIN: {store.gstin}</div>}
          <div className="text-center">==========================================</div>
          <div className="text-center font-bold">TAX RECEIPT</div>
          <div className="text-center">==========================================</div>

          <div>Bill No : {bill.billNumber}</div>
          <div>Date    : {date}</div>
          <div>Cashier : {bill.user?.name ?? '—'}</div>
          {bill.customer && <div>Customer: {bill.customer.name}</div>}
          <div>Payment : {bill.paymentMethod}</div>
          <div>------------------------------------------</div>

          {bill.items.map((item, i) => {
            const mrp = Number(item.product?.mrp ?? item.unitPrice);
            const sold = Number(item.unitPrice);
            const qty = item.quantity;
            const disc = mrp > sold ? (mrp - sold) * qty : 0;
            return (
              <div key={i} className="mb-1">
                <div className="flex justify-between font-medium">
                  <span className="truncate flex-1 min-w-0">{i + 1}. {item.product?.name ?? item.productId}</span>
                  <span className="shrink-0 ml-2">{formatCurrency(Number(item.totalPrice))}</span>
                </div>
                <div className="pl-3 text-[10px] text-gray-500">
                  {qty} x {formatCurrency(mrp)}
                  {disc > 0 && <span className="text-green-700"> (saved {formatCurrency(disc)})</span>}
                </div>
              </div>
            );
          })}

          <div>------------------------------------------</div>
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(bill.subtotal))}</span></div>
          {Number(bill.taxAmount) > 0 && (
            <div className="flex justify-between"><span>GST</span><span>{formatCurrency(Number(bill.taxAmount))}</span></div>
          )}
          {Number(bill.discountAmount) > 0 && (
            <div className="flex justify-between text-green-700"><span>Bill Discount</span><span>- {formatCurrency(Number(bill.discountAmount))}</span></div>
          )}
          <div className="text-center">==========================================</div>
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span><span>{formatCurrency(Number(bill.totalAmount))}</span>
          </div>
          <div className="text-center">==========================================</div>
          {(() => {
            const itemSavings = bill.items.reduce((sum, item) => {
              const mrp = Number(item.product?.mrp ?? item.unitPrice);
              const disc = mrp > Number(item.unitPrice) ? (mrp - Number(item.unitPrice)) * item.quantity : 0;
              return sum + disc;
            }, 0);
            const totalSaved = itemSavings + Number(bill.discountAmount);
            return totalSaved > 0 ? (
              <div className="text-center font-bold text-green-600 text-xs mt-1 border border-green-300 rounded py-1">
                ** You saved {formatCurrency(totalSaved)} on this bill! **
              </div>
            ) : null;
          })()}
          <div className="my-2 flex justify-center">
            <svg ref={barcodeRef} key={bill.billNumber} />
          </div>

          <div className="mt-2 text-center">** Thank you for shopping! **</div>
          <div className="text-center">Please visit us again</div>
        </div>

        <DialogFooter className="flex gap-2 px-4 pb-4 pt-2 no-print">
          <Button variant="outline" size="sm" onClick={onViewInvoice}>View Invoice</Button>
          <Button variant="outline" size="sm" onClick={onNewBill}>New Bill</Button>
          <Button size="sm" onClick={() => printReceiptBrowser(bill)}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
