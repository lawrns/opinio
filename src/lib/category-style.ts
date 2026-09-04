/** Category accents keep navigation recognizable without changing trust/status colors. */
export function categoryStyle(category: string) {
  if (/mueble|hogar/i.test(category)) return { tile: 'bg-op-peach-soft text-op-peach border-op-peach-border', edge: 'border-t-op-peach' };
  if (/electr|tecno/i.test(category)) return { tile: 'bg-op-blue-soft text-op-blue-dark border-op-blue-border', edge: 'border-t-op-blue' };
  if (/belleza|moda/i.test(category)) return { tile: 'bg-op-lavender-soft text-op-lavender border-op-lavender-border', edge: 'border-t-op-lavender' };
  if (/joyer|café/i.test(category)) return { tile: 'bg-op-warning-soft text-op-warning border-op-peach-border', edge: 'border-t-op-warning' };
  return { tile: 'bg-op-green-soft text-op-green-dark border-op-green-border', edge: 'border-t-op-green' };
}
