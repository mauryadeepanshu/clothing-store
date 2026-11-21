import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const SettingsContext = createContext({ settings: null, store: null, setSettings: () => {}, setStore: () => {} });

export function SettingsProvider({ children }) {
  const [state, setState] = useState({ settings: null, store: null });
  useEffect(() => {
    api('/settings', { auth: false }).then((d) => setState(d)).catch(() => setState((s) => ({ ...s, settings: {} })));
  }, []);
  const setSettings = (settings) => setState((s) => ({ ...s, settings }));
  const setStore = (store) => setState((s) => ({ ...s, store }));
  return <SettingsContext.Provider value={{ ...state, setSettings, setStore }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

/** Business rules and contact details from Admin > Settings, with neutral fallbacks while loading. */
export function useStore() {
  const { store } = useContext(SettingsContext);
  return {
    freeShippingThreshold: 1999, shippingFee: 99, returnWindowDays: 15, dispatchTime: '1–2 working days',
    ...Object.fromEntries(Object.entries(store || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined)),
  };
}
export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
