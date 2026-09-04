'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  SealCheck, 
  Storefront, 
  Phone,
  Receipt
} from '@phosphor-icons/react';
import { TrustGauge } from '@/components/passport/TrustGauge';

export interface BusinessCardProps {
  business: {
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
    invited_orders_count: number;
    issues_per_thousand: string | number;
    resolution_rate: string | number;
    effective_reviews_count: number;
    verified_level: string;
  };
}

export function BusinessCard({ business }: BusinessCardProps) {
  const scoreNum = Number(business.trust_score) || 0;
  const coverageNum = Number(business.coverage_percentage) || 0;
  const issuesNum = Number(business.issues_per_thousand) || 0;
  const resolutionNum = Number(business.resolution_rate) || 0;

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.18, ease: 'easeOut' } }}
      className="group relative flex flex-col justify-between bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,1)] hover:border-[#CBD5E1] hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.07)] transition-all"
    >
      <div className="space-y-4">
        {/* Top Header: Logo + Identity + TrustGauge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center font-bold text-sm text-[#121511] shrink-0 overflow-hidden shadow-2xs">
              {business.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logo_url}
                  alt={business.brand_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                business.brand_name.slice(0, 2).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-black text-[#121511] group-hover:text-[#00B67A] transition-colors flex items-center gap-1.5 truncate">
                <span className="truncate">{business.brand_name}</span>
                <SealCheck weight="fill" className="w-4 h-4 text-[#00B67A] shrink-0" />
              </h3>
              <p className="text-[11px] text-[#6C706B] truncate font-medium mt-0.5">
                {business.legal_name || business.category}
              </p>
              <p className="text-[10px] text-[#9CA3AF] font-mono truncate">
                {business.domain || 'WhatsApp Oficial'}
              </p>
            </div>
          </div>

          {/* Precision SVG TrustGauge (Overhauled Image #1) */}
          <TrustGauge
            score={scoreNum}
            size="sm"
            confidenceLevel={business.confidence_level}
            showSubtext={false}
          />
        </div>

        {/* Verification Identifier Chips (Overhauled Image #2 upper strip) */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          {business.rfc && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F4F0] border border-[#E5E5DE] text-[#454744] font-semibold">
              <Receipt className="w-3 h-3 text-[#00B67A]" />
              RFC: {business.rfc}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F4F0] border border-[#E5E5DE] text-[#454744]">
            DENUE INEGI
          </span>
          {business.domain && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F4F0] border border-[#E5E5DE] text-[#454744] truncate max-w-[130px]">
              <Storefront className="w-3 h-3 text-gray-400" />
              {business.domain}
            </span>
          )}
          {business.whatsapp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E6F8F2] border border-[#B3ECD9] text-[#008B5D] font-bold">
              <Phone className="w-3 h-3 text-[#00B67A]" />
              WhatsApp Oficial
            </span>
          )}
        </div>

        {/* Architectural 3-Column Ledger Box (Overhauled Image #2 lower box) */}
        <div className="p-3 rounded-2xl bg-[#FBF9F2] border border-[#EBEAE1] grid grid-cols-3 divide-x divide-[#EBEAE1] text-center shadow-2xs">
          {/* Col 1: Cobertura */}
          <div className="px-1.5 space-y-0.5">
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6C706B]">
              Cobertura
            </div>
            <div className="font-mono font-black text-sm text-[#008B5D]">
              {coverageNum}%
            </div>
            <div className="text-[9px] text-gray-500 font-mono">
              {business.observed_orders_count.toLocaleString('es-MX')} auditadas
            </div>
          </div>

          {/* Col 2: Incidencias */}
          <div className="px-1.5 space-y-0.5">
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6C706B]">
              Quejas /1k
            </div>
            <div className="font-mono font-black text-sm text-[#121511]">
              {issuesNum}
            </div>
            <div className="text-[9px] text-[#008B5D] font-semibold">
              Top 10% sector
            </div>
          </div>

          {/* Col 3: Resolución */}
          <div className="px-1.5 space-y-0.5">
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#6C706B]">
              Resolución
            </div>
            <div className="font-mono font-black text-sm text-[#008B5D]">
              {resolutionNum}%
            </div>
            <div className="text-[9px] text-gray-500 font-mono">
              confirmado
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-4 pt-3.5 border-t border-[#F3F4F6] flex items-center justify-between text-xs">
        <span className="text-[10px] font-bold text-[#6C706B] bg-gray-100 px-2.5 py-0.5 rounded-full truncate max-w-[140px]">
          {business.category}
        </span>

        <Link
          href={`/b/${business.slug}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#121511] hover:bg-black text-white text-xs font-bold transition-all active:scale-95 shadow-2xs group-hover:bg-[#00B67A]"
        >
          <span>Ver Pasaporte</span>
          <ArrowUpRight weight="bold" className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
