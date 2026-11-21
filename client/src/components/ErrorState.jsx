import { RefreshCw } from 'lucide-react';

export default function ErrorState({ message = 'Something went wrong.', onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-3 border border-dashed border-ink/20 px-6 py-12 text-center ${className}`} role="alert">
      <p className="font-display text-2xl">We couldn’t load this</p>
      <p className="max-w-sm text-sm text-stone">{message}</p>
      {onRetry && <button className="btn-outline btn-sm" onClick={onRetry}><RefreshCw size={14} /> Try again</button>}
    </div>
  );
}
