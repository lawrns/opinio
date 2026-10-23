import Link from 'next/link';
import { Fingerprint, Receipt, ChatsCircle, ArrowUpRight, ShieldCheck } from '@phosphor-icons/react/dist/ssr';

export function ConnectedPipeline() {
  return (
    <section id="metodologia" className="border-t border-op-border bg-white pb-16 pt-12 sm:pb-20 sm:pt-16">
      <div className="op-container space-y-14">
        {/* Top Methodology & Editorial Overview */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-16">
          <div>
            <p className="op-eyebrow mb-3">Cómo funciona</p>
            <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-[-0.03em] text-op-ink sm:text-4xl">
              Las estrellas son el inicio.
              <br />
              Los datos cuentan el resto.
            </h2>
          </div>
          <p className="max-w-lg self-end text-base leading-relaxed text-op-secondary">
            Un promedio de estrellas dice poco por sí solo. El pasaporte junta la identidad legal del comercio, las opiniones de sus clientes y el seguimiento de sus casos. Cada perfil indica qué datos están registrados.
          </p>
        </div>

        {/* 3 Pillar Pipeline Cards (Preserves required SEO link to /resenas-y-reputacion) */}
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Fingerprint,
              number: '01',
              title: 'Existe',
              subtitle: 'Conoce quién está detrás.',
              body: 'Consulta la razón social, el RFC, los canales de contacto y el estado de verificación de cada comercio. Los datos de fuentes públicas y los datos verificados se muestran por separado.',
            },
            {
              icon: Receipt,
              number: '02',
              title: 'Cumple',
              subtitle: (
                <Link
                  href="/resenas-y-reputacion"
                  className="underline decoration-[#00b67a] decoration-2 underline-offset-4 hover:text-op-green-dark"
                >
                  Lee opiniones con contexto.
                </Link>
              ),
              body: 'Revisa qué comprobante respalda cada opinión. Cuando el comercio conecta sus pedidos, la cobertura compara las invitaciones registradas con los pedidos registrados.',
            },
            {
              icon: ChatsCircle,
              number: '03',
              title: 'Resuelve',
              subtitle: 'Mira qué pasa después.',
              body: 'Consulta las respuestas de la tienda y el historial de reclamos. Distinguimos una respuesta del comercio de una solución confirmada por quien compró.',
            },
          ].map(({ icon: Icon, number, title, subtitle, body }) => (
            <div
              key={number}
              className="rounded-2xl border border-op-border bg-[#fcfbf3] p-6 shadow-flat sm:p-7"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl border border-op-border bg-white text-op-ink">
                  <Icon aria-hidden="true" className="size-5.5" />
                </span>
                <span className="font-mono text-xs font-semibold text-op-muted">PILAR {number}</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-op-ink">{title}</h3>
              <p className="mb-2.5 mt-1.5 text-sm font-semibold text-op-ink">{subtitle}</p>
              <p className="text-sm leading-relaxed text-op-secondary">{body}</p>
            </div>
          ))}
        </div>

        {/* Calm Editorial Score Reading Card */}
        <div
          id="independencia"
          className="rounded-3xl border border-op-border bg-[#fcfbf3] p-6 shadow-flat sm:p-10 lg:p-12"
        >
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1.15fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-op-border bg-white px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-op-secondary">
                Escala de 0 a 100 · Metodología abierta
              </span>
              <h3 className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] text-op-ink sm:text-4xl">
                Somos Opinio México.
              </h3>
              <p className="mt-4 text-base leading-relaxed text-op-secondary">
                La cobertura mide cuántas compras registradas tienen invitación para opinar. El puntaje va de 0 a 100 y suma tres factores: datos de identidad, opiniones con comprobante y casos resueltos. Cuando un comercio aún reúne pocos datos, el perfil aparece en observación.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  href="/resenas-y-reputacion"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1a1b] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-op-green-dark"
                >
                  Consultar estándar de reputación
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  href="/directorio"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-op-border bg-white px-5 py-3 text-sm font-semibold text-op-ink transition-colors hover:border-op-strong hover:bg-op-shaded"
                >
                  Ver directorio público
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-op-border bg-white p-6 shadow-flat sm:p-7">
              <div className="flex items-center gap-2.5 border-b border-op-border pb-4">
                <span className="flex size-9 items-center justify-center rounded-xl border border-op-border bg-[#fcfbf3] text-op-green-dark">
                  <ShieldCheck aria-hidden="true" className="size-5" weight="fill" />
                </span>
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-op-muted">
                    Lectura del puntaje
                  </p>
                  <h4 className="text-base font-bold text-op-ink">Cómo leer cada rango en el pasaporte</h4>
                </div>
              </div>

              <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
                <div className="rounded-xl border border-op-border bg-[#fcfbf3] p-4">
                  <span className="font-mono text-xl font-bold tracking-tight text-op-ink">80 a 100</span>
                  <h5 className="mt-1.5 text-sm font-bold text-op-ink">Evidencia amplia</h5>
                  <p className="mt-1 text-xs leading-relaxed text-op-secondary">
                    Identidad verificada, cobertura constante de pedidos y reclamos atendidos con confirmación.
                  </p>
                </div>
                <div className="rounded-xl border border-op-border bg-[#fcfbf3] p-4">
                  <span className="font-mono text-xl font-bold tracking-tight text-op-ink">60 a 79</span>
                  <h5 className="mt-1.5 text-sm font-bold text-op-ink">Evidencia parcial</h5>
                  <p className="mt-1 text-xs leading-relaxed text-op-secondary">
                    Algunos pilares tienen datos verificados o hay reclamos abiertos en seguimiento.
                  </p>
                </div>
                <div className="rounded-xl border border-op-border bg-[#fcfbf3] p-4">
                  <span className="font-mono text-xl font-bold tracking-tight text-op-muted">Sin dato</span>
                  <h5 className="mt-1.5 text-sm font-bold text-op-ink">En observación</h5>
                  <p className="mt-1 text-xs leading-relaxed text-op-secondary">
                    Reúne menos opiniones verificadas del mínimo necesario para calcular un puntaje.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
