import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getRecent } from '../lib/recent';
import ProductGrid from './ProductGrid';

/** Shows products the shopper opened recently (stored in this browser only). */
export default function RecentlyViewed({ excludeId, title = 'Recently viewed' }) {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    const ids = getRecent().filter((id) => id !== excludeId).slice(0, 4);
    if (!ids.length) { setProducts([]); return; }
    api(`/products?ids=${ids.join(',')}&limit=4`, { auth: false })
      .then((d) => setProducts(ids.map((id) => d.products.find((p) => p._id === id)).filter(Boolean)))
      .catch(() => {});
  }, [excludeId]);
  if (!products.length) return null;
  return (
    <section className="container-x py-14">
      <h2 className="mb-8 text-3xl">{title}</h2>
      <ProductGrid products={products} />
    </section>
  );
}
