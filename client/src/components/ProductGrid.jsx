import ProductCard from './ProductCard';

export default function ProductGrid({ products, cols = 'grid-cols-2 lg:grid-cols-4' }) {
  return (
    <div className={`grid gap-x-3 gap-y-10 sm:gap-x-5 ${cols}`}>
      {products.map((p) => <ProductCard key={p._id} product={p} />)}
    </div>
  );
}
