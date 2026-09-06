/** Category accents keep navigation recognizable without changing trust/status colors. */
export function categoryStyle(category: string) {
  if (/comida|restauran|delivery/i.test(category)) return { tile: 'bg-op-peach-soft text-op-peach border-op-peach-border', edge: 'border-t-op-peach' };
  if (/salud|m[eé]dic|telemedicina/i.test(category)) return { tile: 'bg-op-blue-soft text-op-blue-dark border-op-blue-border', edge: 'border-t-op-blue' };
  if (/gym|fitness|deporte/i.test(category)) return { tile: 'bg-op-green-soft text-op-green-dark border-op-green-border', edge: 'border-t-op-green' };
  if (/mueble|hogar/i.test(category)) return { tile: 'bg-op-peach-soft text-op-peach border-op-peach-border', edge: 'border-t-op-peach' };
  if (/electr|tecno|servicio|software|ia|saas/i.test(category)) return { tile: 'bg-op-green-soft text-op-green-dark border-op-green-border', edge: 'border-t-op-green' };
  if (/belleza|moda|joyer/i.test(category)) return { tile: 'bg-op-lavender-soft text-op-lavender border-op-lavender-border', edge: 'border-t-op-lavender' };
  return { tile: 'bg-op-shaded text-op-secondary border-op-border', edge: 'border-t-op-strong' };
}
