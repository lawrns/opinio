import { cn } from '@/lib/utils';

interface TrustGaugeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  confidenceLevel?: string;
  className?: string;
  showSubtext?: boolean;
}

const CONFIDENCE: Record<string, string> = {
  insufficient: 'Muestra insuficiente',
  low: 'Muestra limitada',
  emerging: 'Muestra inicial',
  moderate: 'Muestra moderada',
  strong: 'Muestra amplia',
  very_strong: 'Muestra muy amplia',
};

export function TrustGauge({ score, size = 'md', confidenceLevel, className, showSubtext = true }: TrustGaugeProps) {
  const diameter = { sm: 64, md: 96, lg: 132 }[size];
  const radius = diameter / 2 - 9;
  const circumference = Math.round(2 * Math.PI * radius * 100) / 100;
  const value = score === null ? null : Math.min(100, Math.max(0, score));
  const formatted = value === null ? null : Number.isInteger(value) ? String(value) : value.toFixed(1);
  const dashOffset = value === null ? circumference : Math.round(circumference * (1 - value / 100) * 100) / 100;
  return (
    <div className={cn('flex shrink-0 flex-col items-center gap-3', className)}>
      <div
        role="img"
        aria-label={
          value === null
            ? 'Sin calificación: muestra insuficiente'
            : `Calificación Opinio: ${formatted} de 100`
        }
        className="relative flex items-center justify-center"
      >
        <svg width={diameter} height={diameter} className="-rotate-90" aria-hidden="true">
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            stroke="var(--op-inset)"
            strokeWidth={7}
            fill="none"
          />
          {value !== null && (
            <circle
              cx={diameter / 2}
              cy={diameter / 2}
              r={radius}
              stroke="#00b67a"
              strokeWidth={7}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'font-data font-extrabold text-op-ink',
              size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-base'
            )}
          >
            {formatted === null ? '—' : formatted}
          </span>
          {size !== 'sm' && <span className="font-mono text-xs text-op-muted">de 100</span>}
        </div>
      </div>
      {showSubtext && (
        <span className="rounded-full bg-op-green-soft px-3 py-0.5 text-center font-mono text-xs font-semibold text-op-green-dark">
          {value === null ? 'Sin calificación' : CONFIDENCE[confidenceLevel || ''] || 'Consulta la muestra disponible'}
        </span>
      )}
    </div>
  );
}
