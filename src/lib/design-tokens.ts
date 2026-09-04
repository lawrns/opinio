/** CSS-backed tokens shared by component styles and charts. */
export const tokens = {
  canvas: {
    base: 'var(--op-canvas)',
    sheet: 'var(--op-sheet)',
    shaded: 'var(--op-shaded)',
    inset: 'var(--op-inset)',
  },
  ink: {
    primary: 'var(--op-ink-primary)',
    secondary: 'var(--op-ink-secondary)',
    muted: 'var(--op-ink-muted)',
    faint: 'var(--op-ink-faint)',
    inverse: 'var(--op-sheet)',
  },
  semantics: {
    verified: {
      ink: 'var(--op-verified-ink)',
      accent: 'var(--op-verified-accent)',
      tint: 'var(--op-verified-tint)',
      border: 'var(--op-verified-border)',
    },
    caution: {
      ink: 'var(--op-caution-ink)',
      accent: 'var(--op-caution-ink)',
      tint: 'var(--op-caution-tint)',
      border: 'var(--op-caution-border)',
    },
    critical: {
      ink: 'var(--op-critical-ink)',
      accent: 'var(--op-critical-ink)',
      tint: 'var(--op-critical-tint)',
      border: 'var(--op-critical-border)',
    },
    neutral: {
      ink: 'var(--op-ink-secondary)',
      accent: 'var(--op-ink-secondary)',
      tint: 'var(--op-shaded)',
      border: 'var(--op-border-hairline)',
    },
    unavailable: {
      ink: 'var(--op-ink-muted)',
      accent: 'var(--op-ink-faint)',
      tint: 'var(--op-canvas)',
      border: 'var(--op-border-hairline)',
    },
  },
  borders: {
    hairline: 'var(--op-border-hairline)',
    strong: 'var(--op-border-strong)',
    dark: 'var(--op-ink-primary)',
  },
  radii: { sm: '6px', md: 'var(--op-radius-control)', lg: 'var(--op-radius-card)', full: '9999px' },
  shadows: { flat: 'var(--op-shadow-flat)', elevated: 'var(--op-shadow-elevated)', inset: 'inset 0 1px 0 var(--op-sheet)' },
  motion: {
    micro: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
    standard: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
    emphasis: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
} as const;

export type OpinioTokens = typeof tokens;
