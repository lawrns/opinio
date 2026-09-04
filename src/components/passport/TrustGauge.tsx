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
  const circumference = 2 * Math.PI * radius;
  const value = score === null ? null : Math.min(100, Math.max(0, score));
  return <div className={cn('flex shrink-0 flex-col items-center gap-3', className)}>
    <div role="img" aria-label={value === null ? 'Sin calificación: muestra insuficiente' : `Calificación Opinio: ${value.toLocaleString('es-MX', { maximumFractionDigits: 1 })} de 100`} className="relative flex items-center justify-center">
      <svg width={diameter} height={diameter} className="-rotate-90" aria-hidden="true"><circle cx={diameter / 2} cy={diameter / 2} r={radius} stroke="var(--op-inset)" strokeWidth={6} fill="none" />{value !== null && <circle cx={diameter / 2} cy={diameter / 2} r={radius} stroke="var(--op-verified-accent)" strokeWidth={6} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} strokeLinecap="round" fill="none" />}</svg>
      <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center"><span className={cn('font-data font-semibold text-[var(--op-ink-primary)]', size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-base')}>{value === null ? '—' : value.toLocaleString('es-MX', { maximumFractionDigits: 1 })}</span>{size !== 'sm' && <span className="text-xs text-[var(--op-ink-muted)]">de 100</span>}</div>
    </div>
    {showSubtext && <span className="text-center text-xs font-medium text-[var(--op-ink-secondary)]">{value === null ? 'Sin calificación' : CONFIDENCE[confidenceLevel || ''] || 'Consulta la muestra disponible'}</span>}
  </div>;
}
