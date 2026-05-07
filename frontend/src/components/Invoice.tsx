import { useRef } from 'react';
import { Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  bill: Bill;
}

const MART_NAME = 'Invofy Mart';
const MART_ADDRESS = '123 Market Street, City - 560001';
const MART_PHONE = '+91 98765 43210';
const MART_GST = 'GSTIN: 29AAAAA0000A1Z5';

export default function Invoice({ bill }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(MART_NAME, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(MART_ADDRESS, pageWidth / 2, 27, { align: 'center' });
    doc.text(MART_PHONE, pageWidth / 2, 32, { align: 'center' });
    doc.text(MART_GST, pageWidth / 2, 37, { align: 'center' });

    // Invoice info
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth / 2, 48, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bill No: ${bill.billNumber}`, 14, 58);
    doc.text(`Date: ${formatDate(bill.createdAt)}`, 14, 63);
    doc.text(`Cashier: ${bill.user?.name ?? '—'}`, 14, 68);
    doc.text(`Payment: ${bill.paymentMethod}`, 14, 73);

    if (bill.customer) {
      doc.text(`Customer: ${bill.customer.name}`, pageWidth - 14, 58, { align: 'right' });
      if (bill.customer.phone) doc.text(`Phone: ${bill.customer.phone}`, pageWidth - 14, 63, { align: 'right' });
    }

    // Items table
    autoTable(doc, {
      startY: 80,
      head: [['#', 'Product', 'Qty', 'Unit Price', 'Total']],
      body: bill.items.map((item, i) => {
        const mrp = item.product?.mrp ? Number(item.product.mrp) : null;
        const price = Number(item.unitPrice);
        const nameCell = mrp && mrp > price
          ? `${item.product?.name ?? item.productId}\n(MRP: ${formatCurrency(mrp)})`
          : item.product?.name ?? item.productId;
        return [i + 1, nameCell, item.quantity, formatCurrency(price), formatCurrency(Number(item.totalPrice))];
      }),
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text(`Subtotal: ${formatCurrency(Number(bill.subtotal))}`, pageWidth - 14, finalY, { align: 'right' });
    doc.text(`GST: ${formatCurrency(Number(bill.taxAmount))}`, pageWidth - 14, finalY + 5, { align: 'right' });
    if (Number(bill.discountAmount) > 0) {
      doc.text(`Discount: -${formatCurrency(Number(bill.discountAmount))}`, pageWidth - 14, finalY + 10, { align: 'right' });
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${formatCurrency(Number(bill.totalAmount))}`, pageWidth - 14, finalY + 17, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for shopping with us!', pageWidth / 2, finalY + 28, { align: 'center' });

    doc.save(`${bill.billNumber}.pdf`);
  };

  return (
    <div>
      {/* Action Buttons — hidden on print */}
      <div className="mb-4 flex gap-2 no-print">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4" /> Print Invoice
        </Button>
        <Button variant="outline" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>

      {/* Invoice Layout */}
      <div ref={printRef} className="mx-auto max-w-2xl rounded-xl border bg-white p-8 shadow-sm print:shadow-none print:border-none">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{MART_NAME}</h1>
          <p className="text-sm text-muted-foreground">{MART_ADDRESS}</p>
          <p className="text-sm text-muted-foreground">{MART_PHONE} · {MART_GST}</p>
        </div>

        <Separator className="my-4" />

        <div className="text-center">
          <h2 className="text-lg font-semibold uppercase tracking-widest">Tax Invoice</h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p><span className="font-medium">Bill No:</span> {bill.billNumber}</p>
            <p><span className="font-medium">Date:</span> {formatDate(bill.createdAt)}</p>
            <p><span className="font-medium">Cashier:</span> {bill.user?.name}</p>
            <p><span className="font-medium">Payment:</span> {bill.paymentMethod}</p>
          </div>
          {bill.customer && (
            <div className="space-y-1 text-right">
              <p className="font-medium">Bill To:</p>
              <p>{bill.customer.name}</p>
              {bill.customer.phone && <p>{bill.customer.phone}</p>}
              {bill.customer.email && <p>{bill.customer.email}</p>}
              {bill.customer.address && <p className="text-xs">{bill.customer.address}</p>}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left text-muted-foreground">#</th>
              <th className="pb-2 text-left text-muted-foreground">Product</th>
              <th className="pb-2 text-right text-muted-foreground">Qty</th>
              <th className="pb-2 text-right text-muted-foreground">Unit Price</th>
              <th className="pb-2 text-right text-muted-foreground">GST%</th>
              <th className="pb-2 text-right text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, i) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2 text-muted-foreground">{i + 1}</td>
                <td className="py-2">
                  <p className="font-medium">{item.product?.name ?? item.productId}</p>
                  {item.product?.sku && <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>}
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">
                  <div>{formatCurrency(Number(item.unitPrice))}</div>
                  {item.product?.mrp && Number(item.product.mrp) > Number(item.unitPrice) && (
                    <div className="text-[10px] text-muted-foreground line-through">{formatCurrency(Number(item.product.mrp))}</div>
                  )}
                </td>
                <td className="py-2 text-right text-sm text-muted-foreground">
                  {item.product?.gstRate != null ? `${Number(item.product.gstRate)}%` : '—'}
                </td>
                <td className="py-2 text-right font-medium">{formatCurrency(Number(item.totalPrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Separator className="my-4" />

        {/* Totals */}
        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(Number(bill.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST</span>
            <span>{formatCurrency(Number(bill.taxAmount))}</span>
          </div>
          {Number(bill.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>- {formatCurrency(Number(bill.discountAmount))}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(Number(bill.totalAmount))}</span>
          </div>
          {(() => {
            const savings = bill.items.reduce((sum, item) => {
              const mrp = item.product?.mrp ? Number(item.product.mrp) : null;
              if (mrp && mrp > Number(item.unitPrice)) {
                return sum + (mrp - Number(item.unitPrice)) * item.quantity;
              }
              return sum;
            }, 0);
            return savings > 0 ? (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>You saved</span>
                <span>{formatCurrency(savings)}</span>
              </div>
            ) : null;
          })()}
        </div>

        <Separator className="my-6" />
        <p className="text-center text-sm text-muted-foreground">
          Thank you for shopping with us! · This is a computer-generated invoice.
        </p>
      </div>
    </div>
  );
}
