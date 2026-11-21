import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import Img from './Img';
import Price from './Price';
import Stars from './Stars';
import { useWishlist } from '../context/WishlistContext';

export default function ProductCard({ product }) {
  const { has, toggle } = useWishlist();
  const saved = has(product._id);
  const soldOut = product.totalStock === 0;
  return (
    <article className="group relative">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-mist">
          <Img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-opacity duration-500" />
          {product.images[1] && (
            <Img src={product.images[1]} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute left-0 top-0 flex flex-col items-start gap-1 p-2">
            {soldOut && <span className="badge bg-paper text-ink">Sold out</span>}
            {!soldOut && product.discountPercent > 0 && <span className="badge bg-ink text-paper">−{product.discountPercent}%</span>}
            {!soldOut && product.isNewArrival && <span className="badge bg-paper text-ink">New</span>}
            {!soldOut && product.totalStock > 0 && product.totalStock <= 5 && <span className="badge bg-paper text-sale">Only {product.totalStock} left</span>}
          </div>
          {!soldOut && product.sizes?.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 hidden translate-y-full flex-wrap gap-1 bg-paper/90 p-2 text-[11px] backdrop-blur transition-transform duration-300 group-hover:translate-y-0 md:flex" aria-hidden="true">
              {product.sizes.map((s) => <span key={s.name} className={`px-1.5 py-0.5 ${s.stock > 0 ? '' : 'text-stone/50 line-through'}`}>{s.name}</span>)}
            </div>
          )}
        </div>
        <div className="mt-3">
          <h3 className="font-sans text-sm leading-snug">{product.name}</h3>
          <Price price={product.price} finalPrice={product.finalPrice} className="mt-1 text-sm" />
          {product.ratingCount > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-stone"><Stars value={product.ratingAvg} size={12} /> {product.ratingCount}</p>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(product._id)}
        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        aria-pressed={saved}
        className="absolute right-1.5 top-1.5 bg-paper/80 p-2 backdrop-blur transition-colors hover:bg-paper"
      >
        <Heart size={18} strokeWidth={1.5} className={saved ? 'fill-ink' : ''} />
      </button>
    </article>
  );
}
