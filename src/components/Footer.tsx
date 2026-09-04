import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ExternalLink, 
  FileText, 
  Lock, 
  Scale, 
  Building, 
  BarChart3,
  HelpCircle
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-950 text-neutral-400">
      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission Statement */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-neutral-950">
                <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Opinio<span className="text-emerald-400">.mx</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-neutral-400 max-w-sm">
              El primer <strong className="text-neutral-200">Pasaporte de Confianza Comercial</strong> de México. Conectamos identidad legal (SAT/DENUE), órdenes verificadas con denominador y resolución auditable de quejas antes de que pagues por transferencia, WhatsApp o tienda en línea.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Infraestructura independiente
              </span>
              <span>•</span>
              <span>Operando en México</span>
            </div>
          </div>

          {/* Consumidores */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
              Consumidores
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/verificar" className="hover:text-white transition-colors">
                  Verificar negocio antes de pagar
                </Link>
              </li>
              <li>
                <Link href="/verificar?q=whatsapp" className="hover:text-white transition-colors">
                  Checar número de WhatsApp
                </Link>
              </li>
              <li>
                <Link href="/verificar?q=spei" className="hover:text-white transition-colors">
                  Validar cuenta CLABE / SPEI
                </Link>
              </li>
              <li>
                <Link href="/#como-funciona" className="hover:text-white transition-colors">
                  Cómo funciona el Pasaporte
                </Link>
              </li>
              <li>
                <Link href="/#casos" className="hover:text-white transition-colors">
                  Portal de Casos y Mediación
                </Link>
              </li>
            </ul>
          </div>

          {/* Comercios y Marcas */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
              Comercios
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/merchant" className="hover:text-white transition-colors">
                  Opinio Merchant OS
                </Link>
              </li>
              <li>
                <Link href="/merchant/integrations" className="hover:text-white transition-colors">
                  Conexión Shopify y Tiendanube
                </Link>
              </li>
              <li>
                <Link href="/merchant/widgets" className="hover:text-white transition-colors">
                  Incrustar Sellos Dinámicos
                </Link>
              </li>
              <li>
                <Link href="/#metodologia" className="hover:text-white transition-colors">
                  Metodología del Denominador
                </Link>
              </li>
              <li>
                <Link href="/#firewall" className="hover:text-white transition-colors">
                  Firewall Comercial
                </Link>
              </li>
            </ul>
          </div>

          {/* Marco Oficial y Estudios */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
              Fuentes y Marco
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a 
                  href="https://burocomercial.profeco.gob.mx" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 hover:text-white transition-colors"
                >
                  <span>Buró Comercial PROFECO</span>
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.inegi.org.mx/app/mapa/denue/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 hover:text-white transition-colors"
                >
                  <span>INEGI DENUE México</span>
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.amvo.org.mx" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 hover:text-white transition-colors"
                >
                  <span>Estudios AMVO 2026</span>
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                </a>
              </li>
              <li>
                <Link href="/#metodologia" className="hover:text-white transition-colors">
                  Algoritmo Bayesiano
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:contacto@opinio.mx" 
                  className="hover:text-white transition-colors"
                >
                  Atención al Ciudadano
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Official Disclaimers and Context Banners */}
        <div className="mt-12 pt-8 border-t border-neutral-900 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-neutral-500 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
            <div className="flex items-center gap-2 text-neutral-300 font-medium mb-1.5">
              <Scale className="h-4 w-4 text-emerald-400" />
              <span>Deslinde de Independencia PROFECO</span>
            </div>
            <p>
              Opinio.mx es una plataforma tecnológica privada e independiente de auditoría comercial. No es una entidad gubernamental ni está afiliada a la Procuraduría Federal del Consumidor (PROFECO). Los datos de contratos de adhesión y quejas provienen de consultas al Buró Comercial público de PROFECO con cita de fecha de corte.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
            <div className="flex items-center gap-2 text-neutral-300 font-medium mb-1.5">
              <Building className="h-4 w-4 text-teal-400" />
              <span>Atribución Registral INEGI DENUE</span>
            </div>
            <p>
              Los identificadores CLEE y la existencia física de unidades económicas corresponden al Directorio Estadístico Nacional de Unidades Económicas (DENUE) del Instituto Nacional de Estadística y Geografía (INEGI), actualizados conforme a los censos económicos públicos del Estado Mexicano.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
            <div className="flex items-center gap-2 text-neutral-300 font-medium mb-1.5">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span>Aviso LFPDPPP y Privacidad</span>
            </div>
            <p>
              En estricto cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), Opinio anonimiza números telefónicos, direcciones de correo y cuentas CLABE en sus reseñas públicas. No comercializamos datos personales de compradores.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-neutral-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Opinio Technologies S.A.P.I. de C.V. Todos los derechos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/#aviso-privacidad" className="hover:text-neutral-300 transition-colors">
              Aviso de Privacidad Integral
            </Link>
            <Link href="/#terminos" className="hover:text-neutral-300 transition-colors">
              Términos de Servicio
            </Link>
            <Link href="/#firewall" className="hover:text-neutral-300 transition-colors">
              Política Antimanipulación
            </Link>
            <span className="text-neutral-700">|</span>
            <span className="text-neutral-400 font-mono text-[11px]">
              SHA-256 Verified Ledger
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
