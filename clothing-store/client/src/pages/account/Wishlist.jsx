import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import ProductGrid from '../../components/ProductGrid';

export default function Wishlist() {
  const { products } = useWishlist();
  if (!products.length) {
    return (
      <div className="border border-dashed border-ink/20 p-10 text-center">
        <p className="font-display text-2xl">Nothing saved yet</p>
        <p className="mt-2 text-sm text-stone">Tap the heart on any product to keep it here.</p>
        <Link to="/shop" className="btn mt-6">Browse the shop</Link>
      </div>
    );
  }
  return <ProductGrid products={products} cols="grid-cols-2 md:grid-cols-3" />;
}
