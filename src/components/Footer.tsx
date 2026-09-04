'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ExternalLink, 
  Lock, 
  Scale, 
  Building, 
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-[#F7F5EA] text-[#454744] mt-16 font-sans">
      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission Statement */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <svg 
                className="w-6 h-6 text-[#00B67A] fill-current group-hover:scale-105 transition-transform" 
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-xl font-extrabold tracking-tight text-[#121511]">
                Opinio<span className="text-[#00B67A]">.mx</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm leading-relaxed text-[#454744] max-w-sm">
              El primer <strong className="text-[#121511]">Pasaporte de Confianza Comercial</strong> de México. Conectamos identidad legal auditada (SAT/DENUE), órdenes con denominador real y resolución bilateral de quejas antes de que pagues por transferencia, WhatsApp o tienda en línea.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-[#6C706B]">
              <span className="inline-flex items-center gap-1 text-[#008B5D] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00B67A]" />
                Infraestructura independiente de confianza
              </span>
              <span>•</span>
              <span>Operando en México</span>
            </div>
          </div>

          {/* Consumidores */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121511]">
              Consumidores
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/verificar" className="hover:text-[#121511] hover:underline transition-colors">
                  Verificar negocio antes de pagar
                </Link>
              </li>
              <li>
                <Link href="/verificar?q=whatsapp" className="hover:text-[#121511] hover:underline transition-colors">
                  Checar número de WhatsApp
                </Link>
              </li>
              <li>
                <Link href="/verificar?q=spei" className="hover:text-[#121511] hover:underline transition-colors">
                  Validar cuenta CLABE / SPEI
                </Link>
              </li>
              <li>
                <Link href="/#metodologia" className="hover:text-[#121511] hover:underline transition-colors">
                  Cómo funciona el Pasaporte
                </Link>
              </li>
              <li>
                <Link href="/#casos" className="hover:text-[#121511] hover:underline transition-colors">
                  Portal de Casos y Mediación
                </Link>
              </li>
            </ul>
          </div>

          {/* Comercios y Marcas */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121511]">
              Comercios
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/merchant" className="hover:text-[#121511] hover:underline transition-colors">
                  Opinio Merchant OS
                </Link>
              </li>
              <li>
                <Link href="/merchant/integrations" className="hover:text-[#121511] hover:underline transition-colors">
                  Conexión Shopify y Tiendanube
                </Link>
              </li>
              <li>
                <Link href="/merchant/widgets" className="hover:text-[#121511] hover:underline transition-colors">
                  Incrustar Sellos Dinámicos
                </Link>
              </li>
              <li>
                <Link href="/#metodologia" className="hover:text-[#121511] hover:underline transition-colors">
                  Metodología del Denominador
                </Link>
              </li>
              <li>
                <Link href="/merchant/settings" className="hover:text-[#121511] hover:underline transition-colors">
                  Validación SAT &amp; DENUE
                </Link>
              </li>
            </ul>
          </div>

          {/* Marco Oficial y Estudios */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121511]">
              Fuentes Oficiales
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs font-medium">
              <li>
                <a 
                  href="https://burocomercial.profeco.gob.mx" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 hover:text-[#121511] hover:underline transition-colors"
                >
                  <span>Buró Comercial PROFECO</span>
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.inegi.org.mx/app/mapa/denue/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 hover:text-[#121511] hover:underline transition-colors"
                >
                  <span>INEGI DENUE México</span>
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.amvo.org.mx" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 hover:text-[#121511] hover:underline transition-colors"
                >
                  <span>Estudios AMVO 2026</span>
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              </li>
              <li>
                <Link href="/#metodologia" className="hover:text-[#121511] hover:underline transition-colors">
                  Algoritmo Bayesiano
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:contacto@opinio.mx" 
                  className="hover:text-[#121511] hover:underline transition-colors"
                >
                  Atención al Ciudadano
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Official Disclaimers and Context Banners */}
        <div className="mt-12 pt-8 border-t border-gray-300 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-[#6C706B] leading-relaxed">
          <div className="p-4 rounded-2xl bg-white border border-gray-200">
            <div className="flex items-center gap-2 text-[#121511] font-bold mb-1.5">
              <Scale className="h-4 w-4 text-[#00B67A]" />
              <span>Deslinde de Independencia PROFECO</span>
            </div>
            <p>
              Opinio.mx es una plataforma tecnológica privada e independiente de auditoría comercial. No es una entidad gubernamental ni está afiliada a la Procuraduría Federal del Consumidor (PROFECO). Los datos de contratos de adhesión y quejas provienen de consultas al Buró Comercial público de PROFECO con cita de fecha de corte.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-gray-200">
            <div className="flex items-center gap-2 text-[#121511] font-bold mb-1.5">
              <Building className="h-4 w-4 text-blue-600" />
              <span>Atribución Registral INEGI DENUE</span>
            </div>
            <p>
              Los identificadores CLEE y la existencia física de unidades económicas corresponden al Directorio Estadístico Nacional de Unidades Económicas (DENUE) del Instituto Nacional de Estadística y Geografía (INEGI), actualizados conforme a los censos económicos públicos del Estado Mexicano.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-gray-200">
            <div className="flex items-center gap-2 text-[#121511] font-bold mb-1.5">
              <Lock className="h-4 w-4 text-[#00B67A]" />
              <span>Aviso LFPDPPP y Privacidad</span>
            </div>
            <p>
              En estricto cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), Opinio anonimiza números telefónicos, direcciones de correo y cuentas CLABE en sus reseñas públicas. No comercializamos datos personales de compradores.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-gray-300 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6C706B]">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Opinio Technologies S.A.P.I. de C.V. Todos los derechos reservados.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Link href="/#aviso-privacidad" className="hover:text-[#121511] transition-colors">
              Aviso de Privacidad Integral
            </Link>
            <Link href="/#terminos" className="hover:text-[#121511] transition-colors">
              Términos de Servicio
            </Link>
            <Link href="/#firewall" className="hover:text-[#121511] transition-colors">
              Política Antimanipulación
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-[#121511] font-mono text-[11px] font-semibold">
              SHA-256 Verified Ledger
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
