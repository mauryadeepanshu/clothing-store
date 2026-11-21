import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import ProductGrid from './ProductGrid';
import { GridSkeleton } from './Skeleton';
import ErrorState from './ErrorState';

/** A titled row of products pulled from the API by tag. */
export default function ProductRail({ title, query, link, linkLabel = 'View all' }) {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError('');
    api(`/products?${query}`, { auth: false })
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message));
  }, [query, attempt]);

  return (
    <section className="container-x py-14 sm:py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-3xl sm:text-4xl">{title}</h2>
        {link && <Link to={link} className="btn-ghost shrink-0">{linkLabel}</Link>}
      </div>
      {error && <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {!products && !error && <GridSkeleton count={query.includes('limit=8') ? 8 : 4} />}
      {products && <ProductGrid products={products} />}
    </section>
  );
}
