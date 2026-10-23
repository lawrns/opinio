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
              color: 'bg-op-blue-soft text-op-blue-dark border-op-blue-border',
              title: 'Existe',
              subtitle: 'Conoce quién está detrás.',
              body: 'Consulta la razón social, el RFC, los canales de contacto y el estado de verificación de cada comercio. Los datos de fuentes públicas y los datos verificados se muestran por separado.',
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
              body: 'Revisa qué comprobante respalda cada opinión. Cuando el comercio conecta sus pedidos, la cobertura compara las invitaciones registradas con los pedidos registrados.',
            },
            {
              icon: ChatsCircle,
              number: '03',
              color: 'bg-op-peach-soft text-op-peach border-op-peach-border',
              title: 'Resuelve',
              subtitle: 'Mira qué pasa después.',
              body: 'Consulta las respuestas de la tienda y el historial de reclamos. Distinguimos una respuesta del comercio de una solución confirmada por quien compró.',
            },
          ].map(({ icon: Icon, number, color, title, subtitle, body }) => (
            <div
              key={number}
              className="group rounded-[22px] border border-op-border bg-[#fcfbf3] p-6 shadow-flat transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-elevated sm:p-7"
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

        {/* Reverse-engineered Trustpilot Value Proposition Mint Green Banner (#b2f8cc) + Dark Forest Report Box (#0a2e1d) */}
        <div
          id="independencia"
          className="relative overflow-hidden rounded-[24px] bg-[#b2f8cc] p-6 text-[#1b1a1b] shadow-flat sm:p-10 lg:p-12"
        >
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.05fr_1.15fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#0a2e1d] px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#b2f8cc]">
                Escala de 0 a 100 · Metodología abierta
              </span>
              <h3 className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] text-[#1b1a1b] sm:text-4xl">
                Somos Opinio México.
              </h3>
              <p className="mt-4 text-base leading-relaxed text-[#1b1a1b]/85">
                La cobertura mide cuántas compras registradas tienen invitación para opinar. El puntaje va de 0 a 100 y suma tres factores: datos de identidad, opiniones con comprobante y casos resueltos. Cuando un comercio aún reúne pocos datos, el perfil aparece en observación.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  href="/resenas-y-reputacion"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1a1b] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#0a2e1d]"
                >
                  Consultar estándar de reputación
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  href="/directorio"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#1b1a1b]/25 bg-white/75 px-5 py-3 text-sm font-bold text-[#1b1a1b] transition-all hover:bg-white"
                >
                  Ver directorio público
                </Link>
              </div>
            </div>

            {/* Trustpilot-style Dark Green Report Box (tb().reportBox + animate-tp-report-up) */}
            <div className="animate-tp-report-up relative overflow-hidden rounded-[22px] bg-[#0a2e1d] p-6 text-white shadow-hero sm:p-8">
              {/* Floating decorative star/shield SVG motion graphic */}
              <svg
                aria-hidden="true"
                viewBox="0 0 160 160"
                className="animate-op-float pointer-events-none absolute -right-6 -top-6 size-36 opacity-25"
              >
                <circle cx="80" cy="80" r="64" fill="#00b67a" />
                <path
                  d="m80 28 14.5 29.4 32.5 4.7-23.5 22.9 5.5 32.4L80 102.1 51 117.4l5.5-32.4L33 62.1l32.5-4.7L80 28Z"
                  fill="#ffe400"
                />
              </svg>

              <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/15 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#00b67a] text-[#0a2e1d]">
                    <ShieldCheck aria-hidden="true" className="size-5" weight="fill" />
                  </span>
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#b2f8cc]">
                      Lectura del puntaje
                    </p>
                    <h4 className="text-base font-bold text-white">Cómo leer cada rango en el pasaporte</h4>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-5 grid gap-3.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <span className="font-mono text-2xl font-extrabold tracking-tight text-[#04da8d]">80 a 100</span>
                  <h5 className="mt-1.5 text-sm font-bold text-white">Evidencia amplia</h5>
                  <p className="mt-1 text-xs leading-relaxed text-white/75">
                    Identidad verificada, cobertura constante de pedidos y reclamos atendidos con confirmación.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <span className="font-mono text-2xl font-extrabold tracking-tight text-[#ffe400]">60 a 79</span>
                  <h5 className="mt-1.5 text-sm font-bold text-white">Evidencia parcial</h5>
                  <p className="mt-1 text-xs leading-relaxed text-white/75">
                    Algunos pilares tienen datos verificados o hay reclamos abiertos en seguimiento.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <span className="font-mono text-2xl font-extrabold tracking-tight text-white/60">Sin dato</span>
                  <h5 className="mt-1.5 text-sm font-bold text-white">En observación</h5>
                  <p className="mt-1 text-xs leading-relaxed text-white/75">
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
