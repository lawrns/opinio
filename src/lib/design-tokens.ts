/**
 * OPINIO.MX DESIGN SYSTEM TOKENS
 * North Star: Modern Financial Infrastructure + Institutional Trust + Editorial Precision
 * Standardized across all consumer, merchant, and widget surfaces.
 */

export const tokens = {
  canvas: {
    base: '#FAF9F5',      // Warm archival parchment canvas
    sheet: '#FFFFFF',     // Clean pure white surface
    shaded: '#F2EFE9',    // Editorial shaded zone
    inset: '#EBE7DE',     // Recessed well for transaction ledgers
  },
  ink: {
    primary: '#0F172A',   // Deep obsidian slate (19.8:1 contrast)
    secondary: '#334155', // Slate-700 for editorial copy
    muted: '#64748B',     // Slate-500 for captions, timestamps, fractions
    faint: '#94A3B8',     // Slate-400 for structural guides
    inverse: '#FFFFFF',   // Pure white on dark surfaces
  },
  semantics: {
    verified: {
      ink: '#065F46',     // Emerald-800
      accent: '#059669',  // Emerald-600
      tint: '#ECFDF5',    // Emerald-50
      border: '#A7F3D0',  // Emerald-200
    },
    caution: {
      ink: '#92400E',     // Amber-800
      accent: '#D97706',  // Amber-600
      tint: '#FFFBEB',    // Amber-50
      border: '#FDE68A',  // Amber-200
    },
    critical: {
      ink: '#991B1B',     // Red-800
      accent: '#DC2626',  // Red-600
      tint: '#FEF2F2',    // Red-50
      border: '#FECACA',  // Red-200
    },
    neutral: {
      ink: '#334155',     // Slate-700
      accent: '#475569',  // Slate-600
      tint: '#F1F5F9',    // Slate-100
      border: '#E2E8F0',  // Slate-200
    },
    unavailable: {
      ink: '#64748B',
      accent: '#94A3B8',
      tint: '#F8FAFC',
      border: '#E2E8F0',
    },
  },
  borders: {
    hairline: '#E2E8F0',  // 1px architectural divider
    strong: '#CBD5E1',    // Interactive focus or active border
    dark: '#0F172A',      // Strict boundary
  },
  radii: {
    sm: '6px',            // Data chips, badges
    md: '10px',           // Interactive inputs, inner elements
    lg: '14px',           // Main semantic containers
    full: '9999px',       // Search capsules, action pills
  },
  shadows: {
    flat: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
    elevated: '0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(15, 23, 42, 0.02)',
    inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  },
  motion: {
    micro: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
    standard: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
    emphasis: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
} as const;

export type OpinioTokens = typeof tokens;
