import Link from 'next/link';
import { Brand } from './Brand';

export function Footer() {
  return (
    <footer className="mt-auto bg-[#1b1a1b] text-white">
      <div className="op-container py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Brand inverse />
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Consulta la identidad fiscal, la cobertura sobre pedidos registrados y el seguimiento de reclamos de tiendas en México.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-xs font-medium text-white/85">
              <span className="size-2 rounded-full bg-[#00b67a]" aria-hidden="true" />
              Hecho para las compras en México · MX
            </div>
          </div>
          <nav aria-label="Enlaces para consumidores">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
              Para quien compra
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-white/85">
              {[
                ['/directorio', 'Directorio de tiendas'],
                ['/verificar', 'Explorar comercios'],
                ['/verificar?accion=opinar', 'Escribir una opinión'],
                ['/caso/nuevo', 'Resolver un problema'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link
                    className="inline-flex min-h-10 items-center transition-colors hover:text-[#00b67a] hover:underline"
                    href={href}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Enlaces de Opinio">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
              Conoce Opinio
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-white/85">
              {[
                ['/#metodologia', 'Cómo leemos la evidencia'],
                ['/#independencia', 'Nuestra independencia'],
                ['/resenas-y-reputacion', 'Reseñas y reputación'],
                ['/blog', 'Blog editorial'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link
                    className="inline-flex min-h-10 items-center transition-colors hover:text-[#00b67a] hover:underline"
                    href={href}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Enlaces para comercios">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
              Comercios
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-white/85">
              {[
                ['/merchant', 'Panel para comercios'],
                ['/resenas-y-reputacion', 'Estándar de cobertura'],
                ['/verificar', 'Consultar pasaporte'],
              ].map(([href, label]) => (
                <li key={label}>
                  <Link
                    className="inline-flex min-h-10 items-center transition-colors hover:text-[#00b67a] hover:underline"
                    href={href}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/12 pt-6 text-xs leading-relaxed text-white/60 sm:flex-row sm:items-center">
          <p suppressHydrationWarning>© {new Date().getFullYear()} Opinio.mx · Todos los derechos reservados.</p>
          <p className="max-w-2xl">
            Plataforma privada e independiente de PROFECO, SAT e INEGI. Cada perfil reúne los datos registrados hasta la fecha de consulta.
          </p>
        </div>
      </div>
    </footer>
  );
}
