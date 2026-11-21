import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const LOCAL_KEY = 'mfs_cart';
const COUPON_KEY = 'mfs_coupon';

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch { return []; }
};
const writeLocal = (items) => localStorage.setItem(LOCAL_KEY, JSON.stringify(items));

// Normalise a server cart line into the shape the UI uses.
const fromServer = (i) => ({
  id: i._id,
  productId: i.product._id,
  slug: i.product.slug,
  name: i.product.name,
  image: i.product.image,
  mrp: i.product.price,
  price: i.product.finalPrice,
  size: i.size,
  color: i.color,
  quantity: i.quantity,
  stock: i.stock,
});

export function CartProvider({ children }) {
  const { user, ready } = useAuth();
  const [items, setItems] = useState(readLocal);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [couponCode, setCouponCodeState] = useState(() => localStorage.getItem(COUPON_KEY) || '');
  const syncedFor = useRef(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Logged-in: the server cart is the source of truth. On first load after login, merge the guest cart into it.
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      syncedFor.current = null;
      setItems(readLocal());
      return;
    }
    if (syncedFor.current === user._id) return;
    syncedFor.current = user._id;
    const guest = readLocal();
    setLoading(true);
    const req = guest.length
      ? api('/cart/merge', { method: 'POST', body: { items: guest.map((g) => ({ product: g.productId, size: g.size, color: g.color, quantity: g.quantity })) } })
      : api('/cart');
    req
      .then((d) => {
        setItems(d.items.map(fromServer));
        localStorage.removeItem(LOCAL_KEY);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, ready]);

  useEffect(() => {
    if (!user) writeLocal(items);
  }, [items, user]);

  const setCouponCode = useCallback((code) => {
    setCouponCodeState(code);
    if (code) localStorage.setItem(COUPON_KEY, code);
    else localStorage.removeItem(COUPON_KEY);
  }, []);

  /** product: full product object from the API; returns a promise that rejects with a readable message. */
  const addItem = useCallback(
    async (product, size, color, quantity = 1) => {
      const sizeInfo = product.sizes.find((s) => s.name === size);
      if (user) {
        const d = await api('/cart', { method: 'POST', body: { product: product._id, size, color, quantity } });
        setItems(d.items.map(fromServer));
      } else {
        const prev = itemsRef.current;
        const existing = prev.find((i) => i.productId === product._id && i.size === size && i.color === color);
        const nextQty = Math.min(10, (existing?.quantity || 0) + quantity);
        if (sizeInfo && nextQty > sizeInfo.stock) {
          throw new Error(sizeInfo.stock ? `Only ${sizeInfo.stock} left in size ${size}` : 'This size is out of stock');
        }
        setItems(
          existing
            ? prev.map((i) => (i === existing ? { ...i, quantity: nextQty } : i))
            : [
                ...prev,
                {
                  id: `${product._id}-${size}-${color}`,
                  productId: product._id,
                  slug: product.slug,
                  name: product.name,
                  image: product.colors?.find((c) => c.name === color)?.images?.[0] || product.images[0],
                  mrp: product.price,
                  price: product.finalPrice,
                  size,
                  color,
                  quantity,
                  stock: sizeInfo?.stock ?? 10,
                },
              ]
        );
      }
      setDrawerOpen(true);
    },
    [user]
  );

  const updateQuantity = useCallback(
    async (id, quantity) => {
      if (quantity < 1) return;
      if (user) {
        const d = await api(`/cart/${id}`, { method: 'PATCH', body: { quantity } });
        setItems(d.items.map(fromServer));
      } else {
        const line = itemsRef.current.find((i) => i.id === id);
        if (line && quantity > line.stock) throw new Error(`Only ${line.stock} left in size ${line.size}`);
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(10, quantity) } : i)));
      }
    },
    [user]
  );

  const removeItem = useCallback(
    async (id) => {
      if (user) {
        const d = await api(`/cart/${id}`, { method: 'DELETE' });
        setItems(d.items.map(fromServer));
      } else setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [user]
  );

  const clear = useCallback(async () => {
    setItems([]);
    setCouponCode('');
    if (user) await api('/cart', { method: 'DELETE' }).catch(() => {});
    else localStorage.removeItem(LOCAL_KEY);
  }, [user, setCouponCode]);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const savings = items.reduce((s, i) => s + (i.mrp - i.price) * i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      savings,
      loading,
      couponCode,
      setCouponCode,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      drawerOpen,
      setDrawerOpen,
      // Shape the server expects for quotes and orders.
      orderLines: items.map((i) => ({ product: i.productId, size: i.size, color: i.color, quantity: i.quantity })),
    };
  }, [items, loading, couponCode, setCouponCode, addItem, updateQuantity, removeItem, clear, drawerOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
