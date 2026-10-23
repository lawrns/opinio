/** Returns a Trustpilot-style Spanish sentiment label for a 1-5 rating. */
export function ratingSentimentLabel(rating: number): string {
  if (rating >= 4.5) return 'Excelente';
  if (rating >= 3.8) return 'Muy bueno';
  if (rating >= 2.8) return 'Promedio';
  if (rating >= 1.8) return 'Regular';
  return 'Bajo';
}

/** A published review's rating or the arithmetic average of published ratings, styled with Trustpilot-grade square star tiles. */
export function StarRating({ rating, size = 'md', label }: { rating: number; size?: 'sm' | 'md'; label?: string }) {
  const value = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));
  const color =
    value >= 4.5
      ? '#00b67a'
      : value >= 3.8
        ? '#73cf11'
        : value >= 2.8
          ? '#ffce00'
          : value >= 1.8
            ? '#ff8622'
            : '#ff3722';

  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);

  return (
    <span
      role="img"
      aria-label={label || `${formatted} de 5 estrellas`}
      className="inline-flex shrink-0 items-center gap-1"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const fillPct = Math.round(Math.min(1, Math.max(0, value - index)) * 100);
        return (
          <span
            key={index}
            aria-hidden="true"
            className={`relative overflow-hidden rounded-[3px] bg-[#dcdce6] ${size === 'sm' ? 'size-5' : 'size-7'}`}
          >
            <span
              className="absolute inset-y-0 left-0 transition-all duration-300"
              style={{ width: `${fillPct}%`, background: color }}
            />
            <svg
              viewBox="0 0 24 24"
              className={`absolute inset-0 m-auto fill-white ${size === 'sm' ? 'size-3.5' : 'size-[18px]'}`}
            >
              <path d="m12 2.5 2.76 5.6 6.18.9-4.47 4.35 1.05 6.15L12 16.6l-5.52 2.9 1.05-6.15L3.06 9l6.18-.9L12 2.5Z" />
            </svg>
          </span>
        );
      })}
    </span>
  );
}
