import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);
  const dismiss = useCallback((tid) => setToasts((t) => t.filter((x) => x.id !== tid)), []);
  const toast = useCallback(
    (message, type = 'success') => {
      const tid = ++id.current;
      setToasts((t) => [...t.slice(-2), { id: tid, message, type }]);
      setTimeout(() => dismiss(tid), 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex animate-fadein items-start gap-3 px-4 py-3 text-sm shadow-lg ${t.type === 'error' ? 'bg-sale text-paper' : 'bg-ink text-paper'}`}>
            {t.type === 'error' ? <AlertCircle size={18} className="mt-px shrink-0" /> : <Check size={18} className="mt-px shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
