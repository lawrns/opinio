/**
 * OPINIO.MX DESIGN SYSTEM TOKENS
 * Synthesized Light-Mode Architecture: Editorial Authority + Precision FinTech
 */

export const opinioTokens = {
  canvas: {
    base: '#FAFAF8',      // Warm porcelain primary background
    sheet: '#FFFFFF',     // Clean pure white surface for cards
    shaded: '#F4F2EB',    // Editorial shaded container
    inset: '#EAE7DD',     // Subtle recessed wells
  },
  ink: {
    primary: '#0F172A',   // Deep obsidian charcoal (high contrast, ultra-legible)
    secondary: '#334155', // Slate-700 for body copy and descriptions
    muted: '#64748B',     // Slate-500 for datelines, denominations, captions
    faint: '#94A3B8',     // Slate-400 for placeholders
    inverse: '#FFFFFF',   // Pure white for dark badges
  },
  pillars: {
    existe: {
      ink: '#1E3A8A',     // Sovereign blue for legal & SAT/DENUE identity
      tint: '#EFF6FF',
      border: '#BFDBFE',
      accent: '#2563EB',
    },
    cumple: {
      ink: '#065F46',     // Treasury emerald for fulfillment & denominator coverage
      tint: '#ECFDF5',
      border: '#A7F3D0',
      accent: '#059669',
    },
    resuelve: {
      ink: '#5B21B6',     // Mediation violet for dispute resolution & SLA
      tint: '#F5F3FF',
      border: '#DDD6FE',
      accent: '#7C3AED',
    },
  },
  states: {
    warning: {
      ink: '#92400E',
      tint: '#FFFBEB',
      border: '#FDE68A',
      accent: '#D97706',
    },
    critical: {
      ink: '#991B1B',
      tint: '#FEF2F2',
      border: '#FECACA',
      accent: '#DC2626',
    },
  },
  borders: {
    hairline: '#E2E8F0',  // 1px surgical divider
    editorial: '#DDD7CD', // Column rule border
    focus: '#0F172A',
  },
  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    flat: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  },
} as const;
