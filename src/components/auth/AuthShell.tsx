import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] px-3.5 py-2.5 text-base text-[var(--op-ink-primary)] placeholder-[var(--op-ink-muted)] focus:outline-none focus:border-[var(--op-verified-accent)]';
export const buttonClass =
  'w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--op-ink-primary)] hover:bg-[var(--op-ink-secondary)] px-6 py-3.5 text-xs font-bold text-[var(--op-sheet)] transition-all disabled:opacity-50';
export const labelClass = 'text-sm font-bold text-[var(--op-ink-primary)]';

/** Minimal private-page frame for login, account and approval screens. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main id="contenido" className="flex-1 bg-[var(--op-canvas)] px-4 py-16">
      <div className="mx-auto max-w-md rounded-3xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--op-ink-muted)]">Opinio</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--op-ink-primary)]">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--op-ink-secondary)]">{children}</div>
      </div>
    </main>
  );
}
