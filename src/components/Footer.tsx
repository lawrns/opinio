import Link from 'next/link';
import { Brand } from './Brand';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-op-border bg-op-shaded">
      <div className="op-container py-12">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-4 text-sm leading-relaxed text-op-secondary">La confianza se demuestra. Conoce a los comercios, comparte tu experiencia y da seguimiento a lo que necesita resolverse.</p>
            <p className="mt-4 text-xs font-medium text-op-muted">Hecho para las compras de México.</p>
          </div>
          <nav aria-label="Enlaces para consumidores">
            <h2 className="text-sm font-semibold">Para quien compra</h2>
            <ul className="mt-3 text-sm text-op-secondary">
              {[['/verificar', 'Explorar comercios'], ['/verificar?accion=opinar', 'Compartir una opinión'], ['/caso/nuevo', 'Abrir un caso']].map(([href, label]) => <li key={href}><Link className="inline-flex min-h-11 items-center hover:underline" href={href}>{label}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Enlaces de Opinio">
            <h2 className="text-sm font-semibold">Conoce Opinio</h2>
            <ul className="mt-3 text-sm text-op-secondary">
              {[['/#metodologia', 'Cómo leemos la evidencia'], ['/#independencia', 'Nuestra independencia'], ['/merchant', 'Panel para comercios']].map(([href, label]) => <li key={href}><Link className="inline-flex min-h-11 items-center hover:underline" href={href}>{label}</Link></li>)}
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-op-border pt-6 text-xs leading-relaxed text-op-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Opinio.mx</p>
          <p className="max-w-xl">Plataforma independiente. Opinio no es una autoridad ni está afiliada a PROFECO, SAT o INEGI. Un perfil no garantiza el resultado de una compra.</p>
        </div>
      </div>
    </footer>
  );
}
