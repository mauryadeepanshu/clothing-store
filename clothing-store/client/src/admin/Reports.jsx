import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../lib/api';
import { inr } from '../lib/format';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const iso = (d) => d.toLocaleDateString('en-CA');
const PRESETS = [['Last 7 days', 6], ['Last 30 days', 29], ['Last 90 days', 89]];

function toCSV(rows) {
  const cols = ['orderNumber', 'date', 'customer', 'email', 'items', 'subtotal', 'discount', 'coupon', 'shipping', 'total', 'payment', 'paymentStatus', 'status', 'city', 'state', 'pincode'];
  const head = ['Order', 'Date', 'Customer', 'Email', 'Items', 'Subtotal', 'Discount', 'Coupon', 'Shipping', 'Total', 'Payment', 'Payment status', 'Status', 'City', 'State', 'PIN'];
  const cell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = rows.map((r) => cols.map((c) => cell(c === 'date' ? new Date(r.date).toLocaleString('en-IN') : r[c])).join(','));
  return '\uFEFF' + [head.join(','), ...lines].join('\r\n'); // BOM so Excel reads ₹ and names correctly
}

export default function Reports() {
  const toast = useToast();
  const today = new Date();
  const [from, setFrom] = useState(iso(new Date(today.getTime() - 29 * 864e5)));
  const [to, setTo] = useState(iso(today));
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    setData(null);
    api(`/admin/reports?from=${from}&to=${to}`).then(setData).catch((e) => { toast(e.message, 'error'); setData({ error: true }); });
  }, [from, to, toast]);
  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const blob = new Blob([toCSV(data.orders)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orders_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const max = data?.byDay ? Math.max(1, ...data.byDay.map((d) => d.revenue)) : 1;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Sales reports</h1>
        <button className="btn-outline btn-sm" onClick={exportCSV} disabled={!data?.orders?.length}><Download size={14} /> Export orders (CSV for Excel)</button>
      </div>
      <div className="flex flex-wrap items-end gap-3 bg-paper p-4 text-sm">
        <label>From <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="input ml-1 w-auto py-2" /></label>
        <label>To <input type="date" value={to} min={from} max={iso(today)} onChange={(e) => setTo(e.target.value)} className="input ml-1 w-auto py-2" /></label>
        {PRESETS.map(([l, n]) => <button key={l} className="chip" onClick={() => { setFrom(iso(new Date(today.getTime() - n * 864e5))); setTo(iso(today)); }}>{l}</button>)}
      </div>
      {!data ? <Spinner /> : data.error ? null : (
        <>
          <div className="grid grid-cols-2 gap-px bg-ink/10 lg:grid-cols-4">
            {[['Gross sales', inr(data.summary.grossSales), `${data.summary.cancelled} cancelled orders excluded`], ['Orders', data.summary.orders, `${data.summary.units} pieces`], ['Average order', inr(data.summary.avgOrderValue), 'Per non-cancelled order'], ['Discounts given', inr(data.summary.discounts), `Shipping collected ${inr(data.summary.shipping)}`]].map(([l, v, n]) => (
              <div key={l} className="bg-paper p-5"><p className="text-sm text-stone">{l}</p><p className="mt-2 font-display text-3xl">{v}</p><p className="mt-1 text-xs text-stone">{n}</p></div>
            ))}
          </div>
          <section className="bg-paper p-5">
            <h2 className="font-sans text-base font-medium">Daily sales</h2>
            <div className="mt-6 overflow-x-auto">
              <div className="flex h-48 min-w-[600px] items-end gap-px" role="img" aria-label="Daily sales bar chart">
                {data.byDay.map((d) => (
                  <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${d.date}: ${inr(d.revenue)} from ${d.orders} orders`}>
                    <div className="w-full bg-ink group-hover:bg-stone" style={{ height: `${Math.max(1, (d.revenue / max) * 100)}%`, opacity: d.revenue ? 1 : 0.12 }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex min-w-[600px] justify-between text-xs text-stone"><span>{data.byDay[0]?.date}</span><span>{data.byDay.at(-1)?.date}</span></div>
            </div>
          </section>
          <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
            <section className="bg-paper p-5">
              <h2 className="font-sans text-base font-medium">By payment method</h2>
              <table className="table-x mt-3"><thead><tr><th>Method</th><th>Orders</th><th>Sales</th></tr></thead>
                <tbody>{data.byPayment.map((p) => <tr key={p.method}><td>{p.method === 'COD' ? 'Cash on delivery' : 'Razorpay'}</td><td>{p.orders}</td><td>{inr(p.revenue)}</td></tr>)}</tbody></table>
            </section>
            <section className="bg-paper p-5">
              <h2 className="font-sans text-base font-medium">Top products</h2>
              <table className="table-x mt-3"><thead><tr><th>Product</th><th>Units</th><th>Sales</th></tr></thead>
                <tbody>
                  {data.topProducts.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.units}</td><td>{inr(p.revenue)}</td></tr>)}
                  {!data.topProducts.length && <tr><td colSpan={3} className="text-stone">No sales in this period.</td></tr>}
                </tbody></table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
