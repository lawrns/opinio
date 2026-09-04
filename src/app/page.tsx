import React from 'react';
import Link from 'next/link';
import { 
  Buildings, 
  ChartBar, 
  Scales, 
  ArrowRight, 
  CheckCircle,
  CaretRight,
  ShieldCheck,
  SealCheck,
  Check
} from '@phosphor-icons/react/dist/ssr';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HomeSearch } from '@/components/home/HomeSearch';
import { CategoryBar } from '@/components/home/CategoryBar';
import { BusinessCard } from '@/components/home/BusinessCard';
import { SpeiValidatorCard } from '@/components/home/SpeiValidatorCard';
import { query } from '@/lib/db';
import { TrustGraphHero } from '@/components/home/TrustGraphHero';
import { TrustMarquee } from '@/components/home/TrustMarquee';
import { MetricsStrip } from '@/components/home/NumberTicker';
import { ConnectedPipeline } from '@/components/home/ConnectedPipeline';

interface BusinessItem {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  description: string | null;
  rfc: string | null;
  clee: string | null;
  phone: string | null;
  whatsapp: string | null;
  domain: string | null;
  logo_url: string | null;
  banner_url: string | null;
  operating_area: string | null;
  claimed: boolean;
  verified_level: string;
  trust_score: string | number;
  confidence_level: string;
  coverage_percentage: string | number;
  observed_orders_count: number;
  invited_orders_count: number;
  issues_per_thousand: string | number;
  resolution_rate: string | number;
  median_response_hours: string | number;
  reopen_rate: string | number;
  effective_reviews_count: number;
  created_at: string;
  updated_at: string;
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
      SELECT *
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

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0F172A] flex flex-col font-sans selection:bg-[#059669] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. THE LIVING TRUST GRAPH HERO                                            */}
        {/* ========================================================================= */}
        <TrustGraphHero />

        {/* Live Ambient Transaction Ticker */}
        <div className="bg-white border-b border-[#E2E8F0]">
          <TrustMarquee />
        </div>

        {/* Live Real-Time Number Ticker Metrics Strip */}
        <MetricsStrip />

        {/* ========================================================================= */}
        {/* 2. CENTER DIVIDER PILL (REVIEW INVITATION TRIGGER)                        */}
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
                <ArrowRight weight="bold" className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. CATEGORIES ROW (ANTI-SLOP: PHOSPHOR ICONS, ZERO EMOJIS)                */}
        {/* ========================================================================= */}
        <CategoryBar />

        {/* ========================================================================= */}
        {/* 4. SOFT PEACH MERCHANT B2B GROWTH BANNER                                  */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#FEECEC] border border-[#FED7D7] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-2xs">
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
              className="px-6 py-3.5 rounded-full text-xs font-extrabold bg-[#121511] hover:bg-black text-white shadow-xs transition-transform active:scale-95 shrink-0 text-center"
            >
              Empezar ahora con Opinio
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. VERIFIED MEXICAN PASSPORTS (HIGH-CRAFT TACTILE CARDS)                  */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-2xl font-black text-[#121511] tracking-tight">
                Comercios con Pasaporte Verificado en México
              </h2>
              <p className="text-xs text-gray-600 mt-1 font-medium">
                Negocios con identidad auditada ante el SAT e INEGI DENUE, métrica de cobertura real y compromiso de resolución de quejas.
              </p>
            </div>

            <Link
              href="/verificar"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#2050E6] hover:underline"
            >
              <span>Explorar todo el directorio</span>
              <ArrowRight weight="bold" className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredBusinesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. INTERACTIVE SPEI & WHATSAPP VALIDATOR TOOL                             */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
          <SpeiValidatorCard />
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
              <p className="text-xs text-gray-600 mt-1 font-medium">
                Comentarios auditados respaldados por comprobantes de pago SPEI, órdenes conectadas o facturas CFDI 4.0.
              </p>
            </div>

            <span className="text-xs font-mono text-[#008B5D] font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00B67A] animate-pulse" />
              Feed auditado en vivo
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
                        <Check weight="bold" className="w-3 h-3 text-[#00B67A]" />
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
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
        {/* 8. CONNECTED 3-PILLAR PIPELINE (EXISTE -> CUMPLE -> RESUELVE)             */}
        {/* ========================================================================= */}
        <ConnectedPipeline />
      </main>

      <Footer />
    </div>
  );
}
