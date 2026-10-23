import Link from 'next/link';
import { Fingerprint, Receipt, ChatsCircle, ArrowUpRight } from '@phosphor-icons/react/dist/ssr';

export function ConnectedPipeline() {
  return (
    <section id="metodologia" className="border-t border-op-border bg-op-shaded/70">
      <div className="op-container op-section space-y-12">
        {/* Top Methodology & Editorial Overview */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-16">
          <div>
            <p className="op-eyebrow mb-3">Cómo funciona</p>
            <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-[-0.03em] text-op-ink sm:text-4xl">
              Las estrellas son el inicio.
              <br />
              La evidencia cuenta el resto.
            </h2>
          </div>
          <p className="max-w-lg self-end text-base leading-relaxed text-op-secondary">
            Un puntaje necesita contexto. El pasaporte reúne la identidad del comercio, las experiencias de sus clientes y el seguimiento de sus casos. Cada perfil muestra qué información está disponible.
          </p>
        </div>

        {/* 3 Pillar Pipeline Cards (Preserves required SEO link to /resenas-y-reputacion) */}
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Fingerprint,
              number: '01',
              color: 'bg-op-blue-soft text-op-blue-dark border-op-blue-border',
              title: 'Existe',
              subtitle: 'Conoce quién está detrás.',
              body: 'Consulta la razón social, los canales de contacto y el estado de verificación de cada identidad. Un dato público y uno verificado se muestran por separado.',
            },
            {
              icon: Receipt,
              number: '02',
              color: 'bg-op-green-soft text-op-green-dark border-op-green-border',
              title: 'Cumple',
              subtitle: (
                <Link
                  href="/resenas-y-reputacion"
                  className="underline decoration-[#00b67a] decoration-2 underline-offset-4 hover:text-op-green-dark"
                >
                  Lee opiniones con contexto.
                </Link>
              ),
              body: 'Revisa el tipo de evidencia de cada opinión. Cuando hay pedidos conectados, la cobertura compara las invitaciones registradas con los pedidos registrados.',
            },
            {
              icon: ChatsCircle,
              number: '03',
              color: 'bg-op-peach-soft text-op-peach border-op-peach-border',
              title: 'Resuelve',
              subtitle: 'Mira qué pasa después.',
              body: 'Consulta las respuestas y los casos. Una solución propuesta por el comercio se distingue de una resolución confirmada por quien compró.',
            },
          ].map(({ icon: Icon, number, color, title, subtitle, body }) => (
            <div
              key={number}
              className="rounded-2xl border border-op-border bg-white p-6 shadow-flat sm:p-7"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className={`flex size-12 items-center justify-center rounded-xl border ${color}`}>
                  <Icon aria-hidden="true" className="size-6" weight="duotone" />
                </span>
                <span className="font-mono text-xs font-bold text-op-muted">PILAR {number}</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-op-ink">{title}</h3>
              <p className="mb-2.5 mt-1.5 text-sm font-semibold text-op-ink">{subtitle}</p>
              <p className="text-sm leading-relaxed text-op-secondary">{body}</p>
            </div>
          ))}
        </div>

        {/* Dark Forest Methodology Band from Opinio Home v3 */}
        <div
          id="independencia"
          className="relative overflow-hidden rounded-3xl bg-[#0f1d1a] p-7 text-white shadow-hero sm:p-10 lg:p-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[#00b67a]/15 blur-3xl"
          />

          <div className="relative grid gap-10 lg:grid-cols-[1.05fr_1.25fr] lg:items-center">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#34d399]">
                Cómo leemos el puntaje · 0 a 100
              </span>
              <h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.025em] text-white sm:text-3xl">
                Transparencia sobre cómo se calcula cada perfil.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                Cobertura no significa satisfacción: mide invitaciones sobre pedidos registrados. El puntaje Opinio va de 0 a 100, combina evidencia verificada y no es un simple promedio de estrellas. La falta de información no demuestra una mala experiencia.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href="/resenas-y-reputacion"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#00b67a] px-5 py-2.5 text-xs font-bold text-[#0f1d1a] transition-transform hover:scale-[1.02]"
                >
                  Consultar estándar de reputación
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  href="/directorio"
                  className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-white/85 underline underline-offset-4 hover:text-white"
                >
                  Ver directorio público
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
                <span className="font-mono text-3xl font-extrabold tracking-tight text-[#34d399]">80+</span>
                <h4 className="mt-2 text-sm font-bold text-white">Evidencia sólida</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                  Identidad verificada, cobertura constante de pedidos y casos atendidos con confirmación.
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
                <span className="font-mono text-3xl font-extrabold tracking-tight text-[#fbbf24]">60–79</span>
                <h4 className="mt-2 text-sm font-bold text-white">Evidencia parcial</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                  Algunos pilares cuentan con datos verificados, o existen casos abiertos en seguimiento.
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/5 p-5">
                <span className="font-mono text-3xl font-extrabold tracking-tight text-white/50">Sin dato</span>
                <h4 className="mt-2 text-sm font-bold text-white">En observación</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                  Aún no alcanza el umbral mínimo de opiniones verificadas para emitir un puntaje numérico.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
