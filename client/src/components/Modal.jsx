import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 animate-fadein bg-ink/40" aria-label="Close" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full animate-fadein overflow-y-auto bg-paper p-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
