export default function Spinner({ label = 'Loading', className = '' }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`} role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
