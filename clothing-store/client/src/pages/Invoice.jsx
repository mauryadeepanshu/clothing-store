import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { date } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const n2 = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Printable GST invoice, or packing slip with ?type=packing. "Save as PDF" in the print dialog downloads it. */
export default function Invoice() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const packing = params.get('type') === 'packing';
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/orders/${id}/invoice`).then((d) => {
      setData(d);
      document.title = `${packing ? 'Packing slip' : 'Invoice'} ${d.order.orderNumber}`;
    }).catch((e) => setError(e.message));
    return () => { document.title = 'Modern Fashion Store'; };
  }, [id, packing]);

  if (error) return <p className="p-10 text-sale">{error}</p>;
  if (!data) return <Spinner className="min-h-screen" />;
  const { order, invoice } = data;
  const a = order.shippingAddress;
  const s = invoice.seller;
  const tax = invoice.taxInvoice;
  const back = user?.role === 'admin' ? `/admin/orders?open=${order._id}` : `/account/orders/${order._id}`;

  return (
    <div className="min-h-screen bg-mist/50 py-8 print:bg-white print:py-0">
      <style>{'@page { size: A4; margin: 14mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <Link to={back} className="btn-ghost"><ArrowLeft size={14} /> Back to order</Link>
        <button onClick={() => window.print()} className="btn btn-sm"><Printer size={14} /> {packing ? 'Print packing slip' : 'Print or save as PDF'}</button>
      </div>
      <div className="mx-auto max-w-[210mm] bg-white p-8 text-[12px] leading-snug text-ink shadow-sm print:p-0 print:shadow-none sm:p-12">
        <div className="flex items-start justify-between gap-6 border-b border-ink pb-5">
          <div>
            <p className="font-display text-3xl tracking-wordmark">Modern</p>
            <p className="mt-2 font-medium">{s.name}</p>
            {s.address && <p className="max-w-[260px] text-stone">{s.address}</p>}
            {s.gstin && <p className="mt-1">GSTIN: <strong>{s.gstin}</strong></p>}{s.email && <p className="text-stone">{s.email}{s.phone ? `, ${s.phone}` : ''}</p>}
          </div>
          <div className="text-right">
            <p className="font-display text-2xl">{packing ? 'Packing slip' : tax ? 'Tax invoice' : 'Invoice'}</p>
            {!packing && <p className="mt-2">Invoice no. <strong>{invoice.invoiceNumber}</strong></p>}
            <p className={packing ? 'mt-2' : ''}>Order no. <strong>{order.orderNumber}</strong></p>
            <p>Date: {date(order.createdAt)}</p>
            <p>Payment: {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Prepaid (Razorpay)'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-5">
          <div>
            <p className="text-stone">{packing ? 'Ship to' : 'Billed and shipped to'}</p>
            <p className="mt-1 text-[13px] font-medium">{a.fullName}</p>
            <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
            <p>{a.city}, {a.state} {a.pincode}</p>
            <p>Phone: {a.phone}</p>
          </div>
          {!packing && tax && (
            <div className="text-right">
              <p className="text-stone">Place of supply</p>
              <p className="mt-1 font-medium">{a.state}</p>
              <p className="text-stone">{invoice.interState ? 'Inter-state supply (IGST)' : 'Intra-state supply (CGST + SGST)'}</p>
            </div>
          )}
          {packing && order.paymentMethod === 'COD' && (
            <div className="self-start border-2 border-ink p-3 text-right">
              <p className="text-stone">Collect on delivery</p>
              <p className="font-display text-2xl">₹{n2(order.total)}</p>
            </div>
          )}
        </div>

        {packing ? (
          <table className="w-full border-collapse">
            <thead><tr className="border-y border-ink text-left"><th className="py-2">#</th><th className="py-2">Item</th><th className="py-2">Size</th><th className="py-2">Colour</th><th className="py-2 text-right">Qty</th><th className="w-16 py-2 text-right">Packed</th></tr></thead>
            <tbody>
              {order.items.map((i, k) => (
                <tr key={k} className="border-b border-ink/15"><td className="py-2">{k + 1}</td><td className="py-2">{i.name}</td><td className="py-2">{i.size}</td><td className="py-2">{i.color}</td><td className="py-2 text-right text-[14px] font-medium">{i.quantity}</td><td className="py-2 text-right">☐</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4} className="py-3 text-right">Total pieces</td><td className="py-3 text-right text-[14px] font-medium">{order.items.reduce((x, i) => x + i.quantity, 0)}</td><td /></tr></tfoot>
          </table>
        ) : (
          !tax ? (
          <>
            <table className="w-full border-collapse">
              <thead><tr className="border-y border-ink text-left"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Discount</th><th className="py-2 text-right">Amount</th></tr></thead>
              <tbody>{invoice.lines.map((l, k) => <tr key={k} className="border-b border-ink/15"><td className="py-2">{l.description}</td><td className="py-2 text-right">{l.quantity}</td><td className="py-2 text-right">{n2(l.unitPrice)}</td><td className="py-2 text-right">{l.discount ? n2(l.discount) : '–'}</td><td className="py-2 text-right">{n2(l.total)}</td></tr>)}</tbody>
            </table>
            <div className="ml-auto mt-4 flex w-full max-w-[280px] justify-between border-t border-ink pt-2 text-[14px] font-medium"><span>Total</span><span>₹{n2(invoice.totals.total)}</span></div>
            <p className="mt-10 text-stone">The seller is not registered under GST, so no GST is charged or shown on this invoice.</p>
          </>
          ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-y border-ink text-left">
                    <th className="py-2 pr-2">Description</th><th className="py-2 pr-2">HSN/SAC</th><th className="py-2 pr-2 text-right">Qty</th><th className="py-2 pr-2 text-right">Rate</th><th className="py-2 pr-2 text-right">Discount</th><th className="py-2 pr-2 text-right">Taxable</th>
                    {invoice.interState ? <th className="py-2 pr-2 text-right">IGST</th> : <><th className="py-2 pr-2 text-right">CGST</th><th className="py-2 pr-2 text-right">SGST</th></>}
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((l, k) => (
                    <tr key={k} className="border-b border-ink/15 align-top">
                      <td className="py-2 pr-2">{l.description}</td><td className="py-2 pr-2 text-stone">{l.hsn}</td><td className="py-2 pr-2 text-right">{l.quantity}</td><td className="py-2 pr-2 text-right">{n2(l.unitPrice)}</td><td className="py-2 pr-2 text-right">{l.discount ? n2(l.discount) : '–'}</td><td className="py-2 pr-2 text-right">{n2(l.taxable)}</td>
                      {invoice.interState ? <td className="py-2 pr-2 text-right">{n2(l.igst)}<span className="block text-stone">{l.rate}%</span></td> : <><td className="py-2 pr-2 text-right">{n2(l.cgst)}<span className="block text-stone">{l.rate / 2}%</span></td><td className="py-2 pr-2 text-right">{n2(l.sgst)}<span className="block text-stone">{l.rate / 2}%</span></td></>}
                      <td className="py-2 text-right">{n2(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto mt-4 w-full max-w-[280px] space-y-1">
              <div className="flex justify-between"><span>Taxable value</span><span>₹{n2(invoice.totals.taxable)}</span></div>
              {invoice.interState ? <div className="flex justify-between"><span>IGST</span><span>₹{n2(invoice.totals.igst)}</span></div> : <><div className="flex justify-between"><span>CGST</span><span>₹{n2(invoice.totals.cgst)}</span></div><div className="flex justify-between"><span>SGST</span><span>₹{n2(invoice.totals.sgst)}</span></div></>}
              <div className="flex justify-between border-t border-ink pt-2 text-[14px] font-medium"><span>Invoice total</span><span>₹{n2(invoice.totals.total)}</span></div>
              {order.couponCode && <p className="text-right text-stone">Includes coupon {order.couponCode}</p>}
            </div>
            <p className="mt-10 text-stone">Prices are inclusive of GST. This is a computer-generated invoice and does not require a signature.</p>
          </>
          )
        )}
        {packing && <p className="mt-10 border-t border-ink/15 pt-3 text-stone">Thank you for shopping with {s.tradeName || s.name}. Returns and exchanges can be requested from your account.</p>}
      </div>
    </div>
  );
}
