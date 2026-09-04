import { Fingerprint, ReceiptText, MessagesSquare } from 'lucide-react';

export function ConnectedPipeline() {
  return (
    <section id="metodologia" className="border-y border-op-border bg-op-shaded">
      <div className="op-container op-section">
        <div className="grid gap-5 md:grid-cols-2 md:gap-16"><div><p className="op-eyebrow mb-4">Cómo funciona</p><h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Las estrellas son el inicio.<br />La evidencia cuenta el resto.</h2></div><p className="max-w-lg self-end text-sm leading-relaxed text-op-secondary">Un puntaje necesita contexto. El pasaporte reúne la identidad del comercio, las experiencias de sus clientes y el seguimiento de sus casos. Cada perfil muestra qué información está disponible.</p></div>
        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {[
            { icon: Fingerprint, number: '01', color: 'bg-op-blue-soft text-op-blue-dark border-op-blue-border', title: 'Existe', subtitle: 'Conoce quién está detrás.', body: 'Consulta la razón social, los canales de contacto y el estado de verificación de cada identidad. Un dato público y uno verificado se muestran por separado.' },
            { icon: ReceiptText, number: '02', color: 'bg-op-peach-soft text-op-peach border-op-peach-border', title: 'Cumple', subtitle: 'Lee opiniones con contexto.', body: 'Revisa el tipo de evidencia de cada opinión. Cuando hay pedidos conectados, la cobertura indica qué porcentaje de compradores recibió una invitación a opinar.' },
            { icon: MessagesSquare, number: '03', color: 'bg-op-lavender-soft text-op-lavender border-op-lavender-border', title: 'Resuelve', subtitle: 'Mira qué pasa después.', body: 'Consulta las respuestas y los casos. Una solución propuesta por el comercio se distingue de una resolución confirmada por quien compró.' },
          ].map(({ icon: Icon, number, color, title, subtitle, body }) => <div key={number} className="border-t border-op-strong pt-6"><div className="mb-6 flex items-center justify-between"><span className={`flex size-12 items-center justify-center rounded-op-control border ${color}`}><Icon aria-hidden="true" className="size-6" /></span><span className="font-mono text-xs text-op-muted">{number}</span></div><h3 className="text-xl font-semibold tracking-tight">{title}</h3><p className="mb-3 mt-2 text-sm font-medium">{subtitle}</p><p className="text-sm leading-relaxed text-op-secondary">{body}</p></div>)}
        </div>
        <p className="mt-9 border-t border-op-border pt-5 text-xs leading-relaxed text-op-muted">Cobertura no significa satisfacción: mide invitaciones sobre pedidos registrados. El puntaje Opinio va de 0 a 100 y no es un promedio de estrellas. La falta de información no demuestra una mala experiencia.</p>
      </div>
    </section>
  );
}
