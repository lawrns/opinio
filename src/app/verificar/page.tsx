'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  Building2, 
  Store, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  Filter, 
  RefreshCw,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info
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
      label: 'Evidencia Fuerte',
      description: 'Identidad verificada y experiencia respaldada por pedidos conectados.',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    };
  }

  if (biz.claimed && (biz.verified_level === 'connected_orders' || orders > 0)) {
    return {
      state: 'moderate_evidence',
      label: 'Evidencia Moderada',
      description: 'Encontramos el negocio, pero la evidencia de transacciones aún es limitada.',
      badgeClass: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
    };
  }

  if (biz.claimed && (biz.verified_level === 'identity_verified' || biz.verified_level === 'claimed')) {
    return {
      state: 'claimed_unconnected',
      label: 'Reclamado sin Conexión',
      description: 'El negocio confirmó su identidad, pero Opinio no puede verificar su volumen de pedidos.',
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    };
  }

  return {
    state: 'public_info',
    label: 'Solo Información Pública',
    description: 'Perfil elaborado con fuentes públicas oficiales; el negocio no participa todavía.',
    badgeClass: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
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
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" />
          <span>Directorio de Confianza Comercial</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
          Verificar Negocio antes de Pagar
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 max-w-2xl">
          Busca por nombre comercial, razón social, número de WhatsApp (+52), dominio web o cuenta CLABE para consultar su pasaporte y evidencia de cumplimiento.
        </p>
      </div>

      {/* Main Search Bar & Filters Section */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-6 backdrop-blur-xl shadow-xl mb-8 space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe el nombre, WhatsApp (+52 55...), dominio (ej. luuna.mx) o RFC..."
            className="w-full rounded-xl bg-neutral-950 border border-neutral-800 pl-12 pr-10 py-3.5 text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs px-2 py-1 bg-neutral-900 rounded"
            >
              Borrar
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-neutral-400 font-medium shrink-0 flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" /> Categoría:
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & State Filter Summary */}
      <div className="flex items-center justify-between gap-4 mb-6 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span>Mostrando</span>
          <span className="font-bold text-white">{businesses.length}</span>
          <span>de</span>
          <span className="font-bold text-white">{totalCount}</span>
          <span>negocios verificados</span>
          {loading && (
            <RefreshCw className="h-3 w-3 animate-spin text-emerald-400 ml-1" />
          )}
        </div>

        {(searchTerm || selectedCategory !== 'Todos') && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
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

            return (
              <div
                key={biz.slug}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md flex flex-col justify-between hover:border-neutral-700 transition-all shadow-md group"
              >
                <div>
                  {/* Top Header: Brand Name + Score + State Badge */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/b/${biz.slug}`}
                          className="text-lg font-bold text-white hover:text-emerald-400 transition-colors truncate"
                        >
                          {biz.brand_name}
                        </Link>
                        {biz.verified_level === 'transparent_coverage' && (
                          <span title="Cobertura auditada transparente">
                            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {biz.legal_name || 'Razón social no declarada'}
                      </p>
                    </div>

                    {/* Circular Score Badge */}
                    <div className="flex flex-col items-center justify-center h-13 w-13 rounded-full bg-neutral-950 border border-emerald-500/60 shadow-inner shrink-0">
                      <span className="text-base font-black text-emerald-400 leading-none">
                        {score}
                      </span>
                      <span className="text-[8px] font-semibold text-neutral-500 uppercase">
                        Opinio
                      </span>
                    </div>
                  </div>

                  {/* Evidence State Badge & Description */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${stateInfo.badgeClass}`}>
                      <span>{stateInfo.label}</span>
                    </span>
                    <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                      {stateInfo.description}
                    </p>
                  </div>

                  {/* Public and Verified Identifiers */}
                  <div className="flex flex-wrap gap-1.5 mb-4 text-[11px]">
                    {biz.rfc && (
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-neutral-300 font-mono">
                        RFC: {biz.rfc}
                      </span>
                    )}
                    {biz.clee && (
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-neutral-300 font-mono">
                        DENUE: Activo
                      </span>
                    )}
                    {biz.domain && (
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
                        <Store className="h-3 w-3 text-neutral-400" />
                        {biz.domain}
                      </span>
                    )}
                    {biz.whatsapp && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 text-emerald-300">
                        <Phone className="h-3 w-3 text-emerald-400" />
                        {biz.whatsapp}
                      </span>
                    )}
                  </div>

                  {/* 3 Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-neutral-950/70 border border-neutral-850 text-center mb-4">
                    <div>
                      <div className="text-xs font-bold text-white">
                        {coverage > 0 ? `${coverage}%` : 'N/D'}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Órdenes auditadas
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {issues}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Incidencias /1k
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-400">
                        {resolution > 0 ? `${resolution}%` : '100%'}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Resolución conf.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="pt-3 border-t border-neutral-850 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500">
                    {biz.category}
                  </span>
                  <Link
                    href={`/b/${biz.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 group-hover:translate-x-0.5 transition-transform"
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
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-12 text-center space-y-4 max-w-2xl mx-auto">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            No encontramos coincidencias para &quot;{searchTerm}&quot;
          </h3>
          <p className="text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
            Opinio solo publica negocios con información pública contrastada o tiendas que han iniciado su proceso de verificación comercial.
          </p>

          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 text-left space-y-2 mt-4">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Info className="h-4 w-4" />
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
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-emerald-400 transition-colors"
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        }>
          <VerificarContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
