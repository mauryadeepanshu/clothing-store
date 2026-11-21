export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[3/4] animate-pulse bg-mist" />
      <div className="mt-3 h-3.5 w-3/4 animate-pulse bg-mist" />
      <div className="mt-2 h-3.5 w-1/3 animate-pulse bg-mist" />
    </div>
  );
}

export function GridSkeleton({ count = 4, cols = 'grid-cols-2 lg:grid-cols-4' }) {
  return (
    <div className={`grid gap-x-3 gap-y-10 sm:gap-x-5 ${cols}`} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div className="container-x grid gap-8 py-12 lg:grid-cols-[1.25fr_1fr] lg:gap-14" role="status" aria-label="Loading product">
      <div className="aspect-[3/4] animate-pulse bg-mist" />
      <div className="space-y-4">
        <div className="h-9 w-3/4 animate-pulse bg-mist" />
        <div className="h-5 w-1/3 animate-pulse bg-mist" />
        <div className="mt-8 flex gap-2">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-11 w-14 animate-pulse bg-mist" />)}</div>
        <div className="mt-6 h-12 w-full animate-pulse bg-mist" />
        <div className="h-24 w-full animate-pulse bg-mist" />
      </div>
    </div>
  );
}
