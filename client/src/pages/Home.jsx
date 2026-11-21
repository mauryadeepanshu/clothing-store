import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from '../components/Img';
import ProductRail from '../components/ProductRail';
import RecentlyViewed from '../components/RecentlyViewed';
import { api } from '../lib/api';
import { useSettings, useStore, rupees } from '../context/SettingsContext';
import usePageTitle from '../lib/usePageTitle';

const u = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const isExternal = (to) => /^https?:/.test(to || '');
function CtaLink({ to, className, children }) {
  if (!to) return null;
  return isExternal(to) ? <a href={to} className={className}>{children}</a> : <Link to={to} className={className}>{children}</Link>;
}

export default function Home() {
  usePageTitle('');
  const { settings } = useSettings();
  const store = useStore();
  const hero = settings?.hero;
  const promo = settings?.promo;
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    api('/categories', { auth: false }).then((d) => setCategories(d.categories.filter((c) => c.productCount > 0))).catch(() => {});
  }, []);

  return (
    <>
      {/* Hero: one full-bleed editorial image; the wordmark is the single bold element on the page. */}
      <section className="relative h-[100svh] min-h-[560px] overflow-hidden bg-ink text-paper">
        {hero && <Img src={hero.image} alt={hero.imageAlt} className="absolute inset-0 h-full w-full object-cover object-[50%_30%] opacity-90" fetchpriority="high" loading="eager" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-ink/30" />
        <div className="relative flex h-full flex-col justify-end">
          <div className="container-x pb-6 sm:pb-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-md">
                {hero?.eyebrow && <p className="text-sm text-paper/80">{hero.eyebrow}</p>}
                <p className="mt-2 min-h-[2.5em] font-display text-2xl leading-snug sm:text-3xl">{hero?.headline}</p>
              </div>
              <div className="flex gap-3">
                {hero?.primaryLabel && <CtaLink to={hero.primaryLink} className="inline-flex items-center bg-paper px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-sand">{hero.primaryLabel}</CtaLink>}
                {hero?.secondaryLabel && <CtaLink to={hero.secondaryLink} className="inline-flex items-center border border-paper px-6 py-3.5 text-sm font-medium transition-colors hover:bg-paper hover:text-ink">{hero.secondaryLabel}</CtaLink>}
              </div>
            </div>
          </div>
          <h1 className="sr-only">Modern Fashion Store</h1>
          <p aria-hidden="true" className="container-x -mb-[0.2em] animate-rise select-none font-display text-[27vw] leading-[0.8] tracking-wordmark lg:text-[25vw]">Modern</p>
        </div>
      </section>

      {/* Shop Men / Shop Women */}
      <section className="container-x grid gap-3 py-14 sm:grid-cols-2 sm:gap-5 sm:py-20">
        {[
          { to: '/shop/women', label: 'Women', note: 'Dresses, tailoring, knitwear', img: u('1515886657613-9f3515b0c78f', 1200), alt: 'Woman in an ivory dress' },
          { to: '/shop/men', label: 'Men', note: 'Shirts, denim, outerwear', img: u('1617137968427-85924c800a22', 1200), alt: 'Man in a relaxed linen shirt' },
        ].map((c) => (
          <Link key={c.to} to={c.to} className="group block">
            <div className="aspect-[4/5] overflow-hidden bg-mist">
              <Img src={c.img} alt={c.alt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <h2 className="text-4xl sm:text-5xl">{c.label}</h2>
              <span className="text-sm text-stone">{c.note}</span>
            </div>
          </Link>
        ))}
      </section>

      <ProductRail title="New arrivals" query="tag=new&limit=4&sort=newest" link="/shop?tag=new" />

      {/* Promotional banner (editable in Admin > Homepage) */}
      {promo?.enabled && (
        <section className="bg-sand">
          <div className="container-x grid items-center gap-8 py-14 md:grid-cols-2 md:py-0">
            <div className="md:py-20">
              {promo.eyebrow && <p className="text-sm">{promo.eyebrow}</p>}
              <h2 className="mt-3 max-w-md text-4xl leading-tight sm:text-5xl">{promo.headline}</h2>
              {promo.body && <p className="mt-4 max-w-sm text-sm text-ink/70">{promo.body}</p>}
              {promo.ctaLabel && <CtaLink to={promo.ctaLink} className="btn mt-8">{promo.ctaLabel}</CtaLink>}
            </div>
            {promo.image && (
              <div className="aspect-[4/3] overflow-hidden md:aspect-auto md:h-[520px]">
                <Img src={promo.image} alt={promo.imageAlt} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </section>
      )}

      <ProductRail title="Best sellers" query="tag=bestseller&limit=8&sort=popular" link="/shop?tag=bestseller" />

      {/* Trending collections (categories) */}
      {categories.length > 0 && (
        <section className="container-x pb-14 sm:pb-20">
          <h2 className="mb-8 text-3xl sm:text-4xl">Trending collections</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
            {categories.slice(0, 10).map((c) => (
              <Link key={c._id} to={`/shop?category=${c.slug}`} className="group block">
                <div className="aspect-square overflow-hidden bg-mist">
                  <Img src={c.image} alt={c.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="text-stone">{c.productCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProductRail title="Trending now" query="tag=trending&limit=4&sort=popular" link="/shop?tag=trending" />

      <RecentlyViewed title="Pick up where you left off" />

      {/* Service strip */}
      <section className="border-y border-ink/10">
        <div className="container-x grid gap-8 py-12 text-sm sm:grid-cols-3">
          {[
            [Number(store.shippingFee) > 0 ? `Free shipping over ${rupees(store.freeShippingThreshold)}` : 'Free shipping', 'Check the delivery date for your PIN code on any product.'],
            store.returnWindowDays > 0 ? [`${store.returnWindowDays}-day returns`, 'Unworn items with tags, collected from your door.'] : ['Easy support', 'Damaged or wrong item? We’ll make it right.'],
            ['Pay your way', 'UPI, cards and net banking via Razorpay, or cash on delivery.'],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-display text-xl">{t}</p>
              <p className="mt-1 text-stone">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
