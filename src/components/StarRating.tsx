/** A published review's rating or the arithmetic average of published ratings. */
export function StarRating({ rating, size = 'md', label }: { rating: number; size?: 'sm' | 'md'; label?: string }) {
  const value = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));
  const color = value >= 4 ? 'var(--op-verified-accent)' : value >= 3 ? 'var(--op-caution-ink)' : value >= 2 ? 'var(--op-peach-ink)' : 'var(--op-critical-ink)';
  return <span role="img" aria-label={label || `${value.toLocaleString('es-MX', { maximumFractionDigits: 1 })} de 5 estrellas`} className="inline-flex shrink-0 gap-1">
    {Array.from({ length: 5 }, (_, index) => <span key={index} aria-hidden="true" className={`relative overflow-hidden rounded-[2px] bg-op-strong ${size === 'sm' ? 'size-5' : 'size-7'}`}>
      <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(1, Math.max(0, value - index)) * 100}%`, background: color }} />
      <svg viewBox="0 0 24 24" className={`absolute inset-0 m-auto fill-op-sheet ${size === 'sm' ? 'size-3.5' : 'size-5'}`}><path d="m12 2.6 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6L3.2 9l6.1-.9L12 2.6Z" /></svg>
    </span>)}
  </span>;
}
