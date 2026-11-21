import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!user) { setProducts([]); return; }
    api('/wishlist').then((d) => setProducts(d.products)).catch(() => {});
  }, [user]);

  const ids = useMemo(() => new Set(products.map((p) => p._id)), [products]);

  const toggle = useCallback(
    async (productId) => {
      if (!user) {
        toast('Log in to save items to your wishlist');
        navigate('/login', { state: { from: location.pathname } });
        return;
      }
      const has = ids.has(productId);
      try {
        const d = await api(`/wishlist/${productId}`, { method: has ? 'DELETE' : 'POST' });
        setProducts(d.products);
        toast(has ? 'Removed from wishlist' : 'Saved to wishlist');
      } catch (e) {
        toast(e.message, 'error');
      }
    },
    [user, ids, toast, navigate, location.pathname]
  );

  const value = useMemo(() => ({ products, ids, has: (id) => ids.has(id), toggle }), [products, ids, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
