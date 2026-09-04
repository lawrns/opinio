'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw,
  ChevronRight,
  Info,
  Store,
  Check
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

type MatchState = 
  | 'strong_evidence' 
  | 'moderate_evidence' 
  | 'claimed_unconnected' 
  | 'public_info' 
  | 'no_match';

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
  operating_area: string | null;
  claimed: boolean;
  verified_level: string;
  trust_score: number | string;
  confidence_level: string;
  coverage_percentage: number | string;
  observed_orders_count: number;
  invited_orders_count: number;
  issues_per_thousand: number | string;
  resolution_rate: number | string;
  median_response_hours: number | string;
  effective_reviews_count: number;
}

const CATEGORIES = [
  'Todos',
  'Hogar, Muebles y Colchones',
  'Electrónica y Gadgets',
  'Belleza y Cuidado Personal',
  'Joyería y Accesorios',
  'Muebles y Diseño de Interiores',
  'Electrónica y Accesorios',
];

function getMatchStateInfo(biz: BusinessItem): {
  state: MatchState;
  label: string;
  description: string;
  badgeClass: string;
} {
  const coverage = Number(biz.coverage_percentage) || 0;
  const orders = biz.observed_orders_count || 0;

  if (biz.claimed && (biz.verified_level === 'transparent_coverage' || coverage >= 80) && orders > 0) {
    return {
      state: 'strong_evidence',
      label: 'Evidencia Sólida',
      description: 'Identidad verificada ante SAT/DENUE y experiencia respaldada por pedidos conectados.',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }

  if (biz.claimed && orders > 0) {
    return {
      state: 'moderate_evidence',
      label: 'Evidencia Moderada',
      description: 'Negocio localizado, pero la muestra de órdenes conectadas aún está en proceso de maduración.',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    };
  }

  if (biz.claimed) {
    return {
      state: 'claimed_unconnected',
      label: 'Registrado sin conexión de pedidos',
      description: 'El negocio confirmó su identidad legal, pero Opinio aún no audita su volumen de órdenes.',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    };
  }

  return {
    state: 'public_info',
    label: 'Solo Información Pública',
    description: 'Perfil elaborado a partir de fuentes del DENUE / SAT; el comercio aún no participa activamente.',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
  };
}

function VerificarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('cat') || 'Todos';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch results based on search term and category
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (searchTerm.trim()) {
          queryParams.set('q', searchTerm.trim());
        }
        if (selectedCategory && selectedCategory !== 'Todos') {
          queryParams.set('category', selectedCategory);
        }

        const res = await fetch(`/api/v1/search?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setBusinesses(data.results || data.businesses || []);
          setTotalCount(data.total || (data.results || data.businesses || []).length);
        }
      } catch (err) {
        console.error('Error fetching search results:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Todos');
    router.push('/verificar');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#008B5D] uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4 text-[#00B67A]" />
          <span>Directorio de Confianza Comercial México</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#121511]">
          Verificar Negocio antes de Pagar
        </h1>
        <p className="text-sm sm:text-base text-gray-700 max-w-2xl font-medium">
          Busca por nombre comercial, razón social, WhatsApp (+52), dominio web o RFC para consultar el pasaporte y evidencia de cumplimiento.
        </p>
      </div>

      {/* Main Search Bar & Filters Section */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm mb-8 space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe el nombre, WhatsApp (+52 55...), dominio (ej. luuna.mx) o RFC..."
            className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 pl-12 pr-10 py-3.5 text-sm sm:text-base text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A] focus:ring-2 focus:ring-[#00B67A]/20 transition-all font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#121511] text-xs px-2 py-1 bg-gray-100 rounded-lg"
            >
              Borrar
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-500 font-semibold shrink-0 mr-1 text-[11px]">
            Categoría:
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#121511] text-white shadow-xs'
                    : 'bg-[#FAFAF8] text-gray-600 hover:text-[#121511] border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & State Filter Summary */}
      <div className="flex items-center justify-between gap-4 mb-6 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span>Mostrando</span>
          <span className="font-bold text-[#121511]">{businesses.length}</span>
          <span>de</span>
          <span className="font-bold text-[#121511]">{totalCount}</span>
          <span>negocios verificados</span>
          {loading && (
            <RefreshCw className="h-3 w-3 animate-spin text-[#00B67A] ml-1" />
          )}
        </div>

        {(searchTerm || selectedCategory !== 'Todos') && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-[#2050E6] hover:underline font-semibold"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Results Grid */}
      {businesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {businesses.map((biz) => {
            const stateInfo = getMatchStateInfo(biz);
            const score = Number(biz.trust_score) || 0;
            const coverage = Number(biz.coverage_percentage) || 0;
            const issues = Number(biz.issues_per_thousand) || 0;
            const resolution = Number(biz.resolution_rate) || 0;
            const starsCount = Math.min(5, Math.max(1, Math.round(score / 20)));

            return (
              <div
                key={biz.slug}
                className="tp-card p-6 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Header: Brand Name + Score + State Badge */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/b/${biz.slug}`}
                          className="text-lg font-bold text-[#121511] group-hover:text-[#00B67A] transition-colors truncate"
                        >
                          {biz.brand_name}
                        </Link>
                        {biz.verified_level === 'transparent_coverage' && (
                          <span title="Cobertura auditada transparente">
                            <ShieldCheck className="h-4 w-4 text-[#00B67A] shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                        {biz.legal_name || 'Razón social no declarada'}
                      </p>
                    </div>

                    {/* Circular Score Badge */}
                    <div className="flex flex-col items-center justify-center h-13 w-13 rounded-full bg-[#FCFBF3] border border-gray-200 shrink-0">
                      <span className="text-base font-black text-[#008B5D] leading-none font-mono">
                        {score}
                      </span>
                      <span className="text-[8px] font-bold text-gray-500 uppercase">
                        Opinio
                      </span>
                    </div>
                  </div>

                  {/* Green Stars Row */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < starsCount ? "tp-star-box text-xs w-4.5 h-4.5" : "tp-star-box-empty text-xs w-4.5 h-4.5"}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-xs font-bold text-[#121511]">
                      {score} / 100
                    </span>
                  </div>

                  {/* Evidence State Badge & Description */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stateInfo.badgeClass}`}>
                      <span>{stateInfo.label}</span>
                    </span>
                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                      {stateInfo.description}
                    </p>
                  </div>

                  {/* Public and Verified Identifiers */}
                  <div className="flex flex-wrap gap-1.5 mb-4 text-[11px]">
                    {biz.rfc && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FAFAF8] border border-gray-200 px-2 py-0.5 text-gray-700 font-mono font-medium">
                        RFC: {biz.rfc}
                      </span>
                    )}
                    {biz.clee && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FAFAF8] border border-gray-200 px-2 py-0.5 text-gray-700 font-mono">
                        DENUE INEGI
                      </span>
                    )}
                    {biz.domain && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FAFAF8] border border-gray-200 px-2 py-0.5 text-gray-700">
                        <Store className="h-3 w-3 text-gray-400" />
                        {biz.domain}
                      </span>
                    )}
                    {biz.whatsapp && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800 font-medium">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        WhatsApp Oficial
                      </span>
                    )}
                  </div>

                  {/* 3 Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-[#FCFBF3] border border-gray-200 text-center mb-4 font-mono">
                    <div>
                      <div className="text-xs font-bold text-[#121511]">
                        {coverage > 0 ? `${coverage}%` : 'N/D'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-sans">
                        Cobertura
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#121511]">
                        {issues}
                      </div>
                      <div className="text-[10px] text-gray-500 font-sans">
                        Quejas /1k
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#008B5D]">
                        {resolution > 0 ? `${resolution}%` : '100%'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-sans">
                        Resolución
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-medium">
                    {biz.category}
                  </span>
                  <Link
                    href={`/b/${biz.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2050E6] group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Ver Pasaporte de Confianza</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center space-y-4 max-w-2xl mx-auto shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-[#121511]">
            No encontramos coincidencias para &quot;{searchTerm}&quot;
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            Opinio solo publica negocios con información pública contrastada o tiendas que han iniciado su proceso de verificación comercial.
          </p>

          <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 text-xs text-gray-700 text-left space-y-2 mt-4">
            <div className="font-bold text-[#008B5D] flex items-center gap-1.5">
              <Info className="h-4 w-4 text-[#00B67A]" />
              ¿Qué hacer si un vendedor te pide pagar por SPEI o depósito?
            </div>
            <p>
              1. Pídele su Cédula Fiscal SAT (RFC) de 12 o 13 dígitos y búscala aquí.
            </p>
            <p>
              2. Solicítale su enlace oficial de Pasaporte Opinio (opinio.mx/b/su-tienda).
            </p>
            <p>
              3. Si no cuenta con registro ni establecimiento físico en el DENUE, abstente de transferir por SPEI sin una pasarela protegida.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 rounded-full bg-[#121511] px-5 py-2.5 text-xs font-bold text-white hover:bg-black transition-colors shadow-xs"
            >
              <span>Ver todos los comercios auditados</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerificarPage() {
  return (
    <div className="min-h-screen bg-[#FCFBF3] text-[#121511] flex flex-col font-sans selection:bg-[#00B67A] selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-[#00B67A]" />
          </div>
        }>
          <VerificarContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
