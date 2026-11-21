import { inr } from '../lib/format';

export default function Price({ price, finalPrice, discountPercent, className = '' }) {
  const onSale = finalPrice < price;
  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={onSale ? 'text-sale' : ''}>{inr(finalPrice)}</span>
      {onSale && (
        <>
          <span className="text-stone line-through decoration-1">{inr(price)}</span>
          {discountPercent > 0 && <span className="text-sale">{discountPercent}% off</span>}
        </>
      )}
    </div>
  );
}
