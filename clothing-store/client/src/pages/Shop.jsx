import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { api } from '../lib/api';
import ProductGrid from '../components/ProductGrid';
import { GridSkeleton } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import usePageTitle from '../lib/usePageTitle';

const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Most popular'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['discount', 'Biggest discount'],
];
const PRICE_BANDS = [
  ['', '999', 'Under ₹999'],
  ['1000', '1999', '₹1,000 – ₹1,999'],
  ['2000', '3999', '₹2,000 – ₹3,999'],
  ['4000', '', '₹4,000 and above'],
];
const TAG_TITLES = { new: 'New arrivals', bestseller: 'Best sellers', trending: 'Trending now', sale: 'Sale' };
const GENDER_TITLES = { men: 'Men', women: 'Women', unisex: 'Unisex' };

export default function Shop() {
  const { gender } = useParams();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [facets, setFacets] = useState({ sizes: [], colors: [] });
  const [categories, setCategories] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(params.get('q') || '');
  const [attempt, setAttempt] = useState(0);

  const listOf = (k) => (params.get(k) ? params.get(k).split(',') : []);
  const page = Number(params.get('page')) || 1;
  const sort = params.get('sort') || 'newest';
  const tag = params.get('tag') || '';
  const q = params.get('q') || '';

  useEffect(() => {
    api('/products/filters', { auth: false }).then(setFacets).catch(() => {});
    api('/categories', { auth: false }).then((d) => setCategories(d.categories)).catch(() => {});
  }, []);
  useEffect(() => setSearch(q), [q]);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams(params);
    if (gender) qs.set('gender', gender);
    qs.set('limit', '12');
    return qs.toString();
  }, [params, gender]);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    api(`/products?${queryString}`, { auth: false })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [queryString, attempt]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v === '' || v == null || (Array.isArray(v) && !v.length) ? next.delete(k) : next.set(k, Array.isArray(v) ? v.join(',') : v)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const toggleIn = (k, value) => {
    const cur = listOf(k);
    update({ [k]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] });
  };

  const activeCount = ['category', 'sizes', 'colors'].reduce((n, k) => n + listOf(k).length, 0) + (params.get('minPrice') || params.get('maxPrice') ? 1 : 0);
  const title = q ? `Results for “${q}”` : [GENDER_TITLES[gender], TAG_TITLES[tag]].filter(Boolean).join(' — ') || 'All clothing';

  usePageTitle(title);

  const filters = (
    <div className="space-y-8 text-sm">
      <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}>
        <label htmlFor="shop-search" className="label">Search</label>
        <div className="flex">
          <input id="shop-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. linen shirt" className="input" />
          <button type="submit" className="btn px-4">Go</button>
        </div>
      </form>

      <fieldset>
        <legend className="mb-3 font-medium">Category</legend>
        <div className="space-y-2">
          {categories.map((c) => (
            <label key={c._id} className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" className="h-4 w-4 accent-ink" checked={listOf('category').includes(c.slug)} onChange={() => toggleIn('category', c.slug)} />
              <span className="flex-1">{c.name}</span>
              <span className="text-xs text-stone">{c.productCount}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-medium">Price</legend>
        <div className="space-y-2">
          {PRICE_BANDS.map(([min, max, label]) => {
            const active = (params.get('minPrice') || '') === min && (params.get('maxPrice') || '') === max;
            return (
              <label key={label} className="flex cursor-pointer items-center gap-2.5">
                <input type="radio" name="price" className="h-4 w-4 accent-ink" checked={active} onChange={() => update({ minPrice: min, maxPrice: max })} />
                {label}
              </label>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input aria-label="Minimum price" type="number" min="0" placeholder="Min ₹" defaultValue={params.get('minPrice') || ''} key={`min-${params.get('minPrice')}`} onBlur={(e) => update({ minPrice: e.target.value })} className="input py-2" />
          <span className="text-stone">to</span>
          <input aria-label="Maximum price" type="number" min="0" placeholder="Max ₹" defaultValue={params.get('maxPrice') || ''} key={`max-${params.get('maxPrice')}`} onBlur={(e) => update({ maxPrice: e.target.value })} className="input py-2" />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-medium">Size</legend>
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((s) => (
            <button key={s} type="button" aria-pressed={listOf('sizes').includes(s)} onClick={() => toggleIn('sizes', s)} className={`chip ${listOf('sizes').includes(s) ? 'chip-active' : ''}`}>{s}</button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-medium">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {facets.colors.map((c) => {
            const on = listOf('colors').includes(c.name);
            return (
              <button key={c.name} type="button" aria-pressed={on} onClick={() => toggleIn('colors', c.name)} className={`chip flex items-center gap-2 ${on ? 'chip-active' : ''}`}>
                <span className="h-3.5 w-3.5 rounded-full border border-ink/20" style={{ background: c.hex }} />{c.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {activeCount > 0 && (
        <button type="button" className="btn-ghost" onClick={() => update({ category: '', sizes: '', colors: '', minPrice: '', maxPrice: '' })}>Clear all filters</button>
      )}
    </div>
  );

  return (
    <div className="container-x pb-20 pt-8 sm:pt-12">
      <nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Collections">
        {[['', 'All'], ['women', 'Women'], ['men', 'Men'], ['unisex', 'Unisex']].map(([g, label]) => (
          <Link key={label} to={`/shop${g ? `/${g}` : ''}${tag ? `?tag=${tag}` : ''}`} className={`chip ${(gender || '') === g ? 'chip-active' : ''}`}>{label}</Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <h1 className="text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-stone">{data ? `${data.total} ${data.total === 1 ? 'item' : 'items'}` : ' '}</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-outline btn-sm lg:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={14} /> Filters{activeCount ? ` (${activeCount})` : ''}
          </button>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value })} className="input w-auto py-2 pr-8 text-sm">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>

        {filtersOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <button className="absolute inset-0 bg-ink/40" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm animate-fadein overflow-y-auto bg-paper p-5">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-sans text-base">Filters</h2>
                <button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={22} /></button>
              </div>
              {filters}
              <button className="btn mt-8 w-full" onClick={() => setFiltersOpen(false)}>Show {data?.total ?? ''} items</button>
            </div>
          </div>
        )}

        <div>
          {error && <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />}
          {!data && !error && <GridSkeleton count={6} cols="grid-cols-2 md:grid-cols-3" />}
          {data && data.products.length === 0 && (
            <div className="py-20 text-center">
              <p className="font-display text-3xl">Nothing matches those filters</p>
              <p className="mt-2 text-sm text-stone">Try removing a size or colour, or widening the price range.</p>
              <button className="btn-outline mt-6" onClick={() => setParams(new URLSearchParams())}>Clear filters</button>
            </div>
          )}
          {data && data.products.length > 0 && (
            <>
              <ProductGrid products={data.products} cols="grid-cols-2 md:grid-cols-3" />
              {data.pages > 1 && (
                <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button className="chip" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>Previous</button>
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                    <button key={n} className={`chip w-10 ${n === page ? 'chip-active' : ''}`} aria-current={n === page ? 'page' : undefined} onClick={() => update({ page: n })}>{n}</button>
                  ))}
                  <button className="chip" disabled={page >= data.pages} onClick={() => update({ page: page + 1 })}>Next</button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
