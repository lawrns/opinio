import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Search, 
  Scale, 
  BarChart3, 
  AlertCircle, 
  Zap, 
  ExternalLink,
  Lock,
  Phone,
  Store,
  Star,
  Layers,
  ChevronRight,
  PackageCheck,
  Check,
  Award
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HomeSearch } from '@/components/home/HomeSearch';
import { query } from '@/lib/db';

interface BusinessItem {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  rfc: string | null;
  domain: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  trust_score: string | number;
  confidence_level: string;
  coverage_percentage: string | number;
  observed_orders_count: number;
  issues_per_thousand: string | number;
  resolution_rate: string | number;
  effective_reviews_count: number;
  verified_level: string;
}

interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  product_name: string | null;
  verification_level: string;
  created_at: string;
  brand_name: string;
  slug: string;
  domain: string | null;
}

export const revalidate = 60; // Refresh every minute

export default async function HomePage() {
  let featuredBusinesses: BusinessItem[] = [];
  let recentReviews: ReviewItem[] = [];

  try {
    const bRes = await query<BusinessItem>(`
      SELECT 
        id, slug, brand_name, legal_name, category, rfc, domain, whatsapp, logo_url,
        trust_score, confidence_level, coverage_percentage,
        observed_orders_count, issues_per_thousand, resolution_rate,
        effective_reviews_count, verified_level
      FROM businesses
      ORDER BY trust_score DESC
      LIMIT 8
    `);
    featuredBusinesses = bRes.rows;

    const rRes = await query<ReviewItem>(`
      SELECT 
        r.id, r.rating, r.title, r.body, r.author_name, r.product_name,
        r.verification_level, r.created_at, b.brand_name, b.slug, b.domain
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.status = 'published'
      ORDER BY r.created_at DESC
      LIMIT 8
    `);
    recentReviews = rRes.rows;
  } catch (error) {
    console.error('Error fetching data for homepage:', error);
  }

  const categories = [
    { name: 'Muebles y Hogar', icon: '🛋️', query: 'Hogar' },
    { name: 'Tecnología y Celulares', icon: '📱', query: 'Electrónica' },
    { name: 'Belleza y Cosmética', icon: '🧴', query: 'Belleza' },
    { name: 'Joyería y Plata .925', icon: '💍', query: 'Joyería' },
    { name: 'Ropa y Calzado', icon: '👗', query: 'Moda' },
    { name: 'Refacciones y Autos', icon: '🚗', query: 'Autos' },
    { name: 'Servicios e Instalación', icon: '🛠️', query: 'Servicios' },
    { name: 'Alimentos y Café', icon: '☕', query: 'Café' },
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF3] text-[#121511] flex flex-col font-sans selection:bg-[#00B67A] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. TRUSTPILOT-STYLE WARM HERO WITH ORGANIC COLOR SHAPES                   */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-[#FCFBF3]">
          {/* Organic Playful Color Shapes in Background (Trustpilot Iconic Shapes) */}
          <div className="absolute -top-12 -left-16 w-80 h-80 rounded-full bg-[#FFDA38]/40 blur-2xl pointer-events-none -z-10" />
          <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-[#FF7527]/25 blur-3xl pointer-events-none -z-10" />
          <div className="absolute -bottom-16 left-1/3 w-96 h-72 rounded-full bg-[#00B67A]/20 blur-3xl pointer-events-none -z-10" />

          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#121511] leading-[1.12]">
              Encuentra un negocio en el que puedas confiar
            </h1>

            <p className="text-base sm:text-lg text-gray-700 font-medium max-w-2xl mx-auto leading-relaxed">
              Descubre, comprueba y califica comercios en México antes de pagar por WhatsApp, SPEI o tienda en línea.
            </p>

            {/* Giant Pill Search Capsule */}
            <div className="pt-2">
              <HomeSearch />
            </div>

            <div className="pt-2">
              <Link
                href="/#metodologia"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-[#121511] underline underline-offset-4 hover:decoration-[#00B67A] transition-all"
              >
                <span>Conoce más sobre cómo funciona el Pasaporte Opinio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. CENTER DIVIDER PILL (BOUGHT SOMETHING RECENTLY?)                       */}
        {/* ========================================================================= */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <Link
              href="/escribir-opinion/luuna"
              className="inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-[#121511] border border-gray-300 shadow-2xs hover:shadow-xs hover:border-gray-400 transition-all active:scale-[0.98]"
            >
              <span>¿Compraste recientemente?</span>
              <span className="text-[#00B67A] font-bold flex items-center gap-1">
                Escribe una opinión con comprobante
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. CATEGORIES ROW ("¿QUÉ ESTÁS BUSCANDO?")                               */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#121511] tracking-tight">
              ¿Qué estás buscando?
            </h2>
            <Link
              href="/verificar?categoria=all"
              className="text-xs font-bold text-[#2050E6] hover:underline flex items-center gap-1"
            >
              <span>Ver todas las categorías</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/verificar?q=${encodeURIComponent(cat.query)}`}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xs text-center transition-all group"
              >
                <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="text-xs font-semibold text-[#121511] line-clamp-1">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. SOFT PEACH MERCHANT CALLOUT BANNER                                     */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#FEECEC] border border-[#FED7D7] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 max-w-2xl">
              <h3 className="text-2xl font-black text-[#121511] tracking-tight">
                ¿Quieres hacer crecer tu negocio?
              </h3>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">
                Demuestra tu operación real, elimina las dudas antes de transferir por SPEI y convierte la confianza en ventas fuera de los marketplaces cerrados.
              </p>
            </div>

            <Link
              href="/merchant"
              className="px-6 py-3.5 rounded-full text-xs font-extrabold bg-[#121511] hover:bg-black text-white shadow-sm transition-transform active:scale-95 shrink-0 text-center"
            >
              Empezar ahora con Opinio
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. "LOS MEJORES CALIFICADOS" (FEATURED PASSPORTS)                         */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-black text-[#121511] tracking-tight">
                Comercios con Pasaporte Verificado en México
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Negocios con identidad auditada (SAT / DENUE), métrica de cobertura real y compromiso de resolución de quejas.
              </p>
            </div>

            <Link
              href="/verificar"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#2050E6] hover:underline"
            >
              <span>Explorar todo el directorio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredBusinesses.map((b) => {
              const scoreNum = Number(b.trust_score) || 0;
              const starsCount = Math.min(5, Math.max(1, Math.round(scoreNum / 20)));

              return (
                <Link
                  key={b.id}
                  href={`/b/${b.slug}`}
                  className="tp-card p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Logo & Category */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-sm text-gray-800 shrink-0 overflow-hidden">
                        {b.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.logo_url}
                            alt={b.brand_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          b.brand_name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                        {b.category}
                      </span>
                    </div>

                    {/* Brand Name & Domain */}
                    <div>
                      <h3 className="text-base font-bold text-[#121511] group-hover:text-[#00B67A] transition-colors flex items-center gap-1.5">
                        <span className="truncate">{b.brand_name}</span>
                        <CheckCircle2 className="w-4 h-4 text-[#00B67A] shrink-0" />
                      </h3>
                      <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                        {b.domain || 'WhatsApp Oficial'}
                      </p>
                    </div>

                    {/* Green Star Tiles (Trustpilot Signature Look) */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={i < starsCount ? "tp-star-box" : "tp-star-box-empty"}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="font-mono text-sm font-black text-[#121511]">
                        {b.trust_score}
                      </span>
                    </div>

                    {/* Denominator Callout: The Opinio Difference */}
                    <div className="p-2.5 rounded-xl bg-[#FCFBF3] border border-gray-200/80 text-[11px] space-y-1 font-mono">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Cobertura Denominador:</span>
                        <span className="font-bold text-[#00B67A]">{b.coverage_percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-500 text-[10px]">
                        <span>Tasa de resolución:</span>
                        <span className="font-semibold text-[#121511]">{b.resolution_rate}% confirmado</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Strip: RFC & Legal Status */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-mono text-[10px] text-gray-600 truncate">
                      {b.rfc ? `RFC: ${b.rfc}` : 'SAT Validado'}
                    </span>
                    <span className="text-xs font-bold text-[#2050E6] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                      <span>Ver Pasaporte</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. SOFT WARM SAND CONSUMER PROTECTION BANNER                              */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#FBF5EA] border border-[#F0E6D2] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#9A3412]">
                <ShieldCheck className="w-4 h-4" />
                <span>Herramienta Ciudadana Gratuita</span>
              </div>
              <h3 className="text-2xl font-black text-[#121511] tracking-tight">
                Verifica antes de transferir por SPEI o WhatsApp
              </h3>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">
                Pega un número de WhatsApp, una cuenta CLABE de 18 dígitos o una URL de tienda para consultar si el beneficiario coincide con una razón social activa registrada ante el SAT.
              </p>
            </div>

            <Link
              href="/verificar"
              className="px-6 py-3.5 rounded-full text-xs font-extrabold bg-[#121511] hover:bg-black text-white shadow-sm transition-transform active:scale-95 shrink-0 text-center"
            >
              Consultar cuenta o WhatsApp
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. RECENT VERIFIED REVIEWS GRID (OPINIONES EN TIEMPO REAL)                */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-black text-[#121511] tracking-tight">
                Opiniones Recientes con Comprobante
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Comentarios auditados respaldados por comprobantes de pago SPEI, órdenes conectadas o facturas CFDI 4.0.
              </p>
            </div>

            <span className="text-xs font-mono text-[#00B67A] font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00B67A] animate-pulse" />
              Feed en vivo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentReviews.slice(0, 8).map((rev) => (
              <div
                key={rev.id}
                className="tp-card p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Reviewer Header */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#00B67A] text-white flex items-center justify-center font-bold text-xs">
                      {rev.author_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#121511] flex items-center gap-1">
                        <span>{rev.author_name}</span>
                        <Check className="w-3 h-3 text-[#00B67A]" />
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {rev.verification_level === 'confirmed_payment'
                          ? 'Pago SPEI Confirmado'
                          : rev.verification_level === 'confirmed_store_order'
                          ? 'Pedido Conectado'
                          : 'Comprobante Revisado'}
                      </span>
                    </div>
                  </div>

                  {/* Green Stars */}
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={i < rev.rating ? "tp-star-box text-xs w-4.5 h-4.5" : "tp-star-box-empty text-xs w-4.5 h-4.5"}
                      >
                        ★
                      </span>
                    ))}
                  </div>

                  {/* Review Text */}
                  <div>
                    {rev.title && (
                      <h4 className="text-xs font-bold text-[#121511] line-clamp-1 mb-1">
                        {rev.title}
                      </h4>
                    )}
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
                      &ldquo;{rev.body}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Bottom Store Strip */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <Link
                    href={`/b/${rev.slug}`}
                    className="font-bold text-[#121511] hover:text-[#00B67A] transition-colors truncate max-w-[160px]"
                  >
                    {rev.brand_name}
                  </Link>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {rev.domain || 'opinio.mx'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 8. WHY OPINIO: THE MEXICAN COMMERCIAL TRUST PILLARS                       */}
        {/* ========================================================================= */}
        <section id="metodologia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-[#00B67A]">
              La Confianza Se Demuestra
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#121511] tracking-tight">
              ¿Por qué Opinio no es otro directorio de opiniones?
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              En México, cualquier tienda fraudulenta puede inventar 10 reseñas de 5 estrellas en redes sociales. Opinio audita el denominador real y conecta tres pilares inseparables:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pilar 1: Existe */}
            <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
                Pilar 01 • Identidad
              </span>
              <h3 className="text-xl font-bold text-[#121511]">
                Existe
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Verificamos la persona moral o física ante la <strong>Cédula Fiscal del SAT</strong>, la localización física del establecimiento en el <strong>Directorio INEGI DENUE</strong> y el número oficial de WhatsApp Business.
              </p>
              <div className="pt-2 text-[11px] font-mono text-gray-500 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#00B67A]" />
                <span>Cero empresas fantasma</span>
              </div>
            </div>

            {/* Pilar 2: Cumple */}
            <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00B67A] flex items-center justify-center font-bold">
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00B67A]">
                Pilar 02 • El Denominador
              </span>
              <h3 className="text-xl font-bold text-[#121511]">
                Cumple
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Audita el <strong>volumen real de ventas conectadas</strong>. Prohíbe el cherry-picking exigiendo invitar a más del 90% de los clientes reales y mide las incidencias por cada 1,000 pedidos observados.
              </p>
              <div className="pt-2 text-[11px] font-mono text-gray-500 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#00B67A]" />
                <span>Reputación representativa, no filtrada</span>
              </div>
            </div>

            {/* Pilar 3: Resuelve */}
            <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Scale className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-600">
                Pilar 03 • Mediación
              </span>
              <h3 className="text-xl font-bold text-[#121511]">
                Resuelve
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Cuando algo sale mal, medimos el tiempo de respuesta SLA y registramos la solución. Un caso <strong>solo se marca resuelto cuando el comprador lo confirma formalmente</strong>.
              </p>
              <div className="pt-2 text-[11px] font-mono text-gray-500 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#00B67A]" />
                <span>Confirmación bilateral por el consumidor</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
