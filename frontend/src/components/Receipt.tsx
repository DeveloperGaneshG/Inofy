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
  const handlePrint = () => window.print();

  return (
    <div>
      <div className="mb-4 no-print">
        <Button variant="outline" size="sm" onClick={handlePrint}>
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
        <div className="flex justify-between"><span>GST (18%)</span><span>{formatCurrency(Number(bill.taxAmount))}</span></div>
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
