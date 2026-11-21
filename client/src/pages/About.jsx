import { Link } from 'react-router-dom';
import Img from '../components/Img';
import usePageTitle from '../lib/usePageTitle';
import { useStore } from '../context/SettingsContext';

export default function About() {
  usePageTitle('About us');
  const store = useStore();
  return (
    <>
      <section className="container-x grid gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:items-end">
        <h1 className="text-5xl leading-[1.05] sm:text-7xl">Fewer, better clothes.</h1>
        <p className="max-w-prose text-base leading-relaxed text-ink/80">
          A focused range of shirts, denim, knitwear and outerwear in heavier fabrics and cleaner cuts, priced fairly and
          described honestly, so you can buy fewer things and wear them longer.
        </p>
      </section>
      <div className="container-x">
        <div className="aspect-[16/7] overflow-hidden bg-mist">
          <Img src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=2000&q=80" alt="Inside a minimal clothing store" className="h-full w-full object-cover" />
        </div>
      </div>
      <section className="container-x grid gap-10 py-14 sm:grid-cols-3 sm:py-20">
        {[
          ['Made to be worn often', 'Every product page lists fabric, weight and care details, so you can compare before you buy.'],
          ['Fair, clear pricing', 'Prices include GST. Sale prices are real reductions on the regular price, and coupons are listed openly in your bag.'],
          ['Easy if it doesn’t fit', store.returnWindowDays > 0 ? `Size exchanges and returns within ${store.returnWindowDays} days of delivery, collected from your door. Request them from your account in a minute.` : 'If something arrives damaged or wrong, we replace or refund it.'],
        ].map(([t, d]) => (
          <div key={t}>
            <h2 className="text-2xl">{t}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">{d}</p>
          </div>
        ))}
      </section>
      <section className="border-t border-ink/10">
        <div className="container-x flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl font-display text-3xl">Questions about sizing, an order, or bulk purchases?</p>
          <Link to="/contact" className="btn">Contact us</Link>
        </div>
      </section>
    </>
  );
}
