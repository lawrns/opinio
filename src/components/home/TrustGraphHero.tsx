'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { 
  MagnifyingGlass, 
  ArrowRight, 
  SealCheck, 
  ShieldCheck, 
  TreeStructure,
  Receipt,
  FileText,
  Clock,
  Sparkle
} from '@phosphor-icons/react';
import { HomeSearch } from './HomeSearch';

export function TrustGraphHero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Subtle pointer depth (not aggressive chasing)
  const bgTranslateX = useTransform(mouseX, [-500, 500], [-10, 10]);
  const bgTranslateY = useTransform(mouseY, [-500, 500], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  // Coordinated entrance animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    },
  };

  return (
    <section 
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 px-4 sm:px-6 lg:px-8 border-b border-[#E2E8F0] bg-[#FAF9F5]"
    >
      {/* ========================================================================= */}
      {/* 1. AMBIENT TRUST GRAPH BACKGROUND VISUALIZATION (THE DENOMINATOR NETWORK) */}
      {/* ========================================================================= */}
      <motion.div 
        style={{ x: bgTranslateX, y: bgTranslateY }}
        className="absolute inset-0 pointer-events-none overflow-hidden opacity-60 -z-10"
      >
        <svg 
          className="w-full h-full min-w-[1000px] absolute left-1/2 -translate-x-1/2 top-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Hairline Grid Pattern */}
            <pattern id="trust-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#E2E8F0" strokeWidth="0.75" strokeDasharray="2 4" />
            </pattern>
            {/* Flowing Signal Gradients */}
            <linearGradient id="signal-green" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="signal-slate" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Precision Grid Layer */}
          <rect width="100%" height="100%" fill="url(#trust-grid)" opacity="0.6" />

          {/* Network Connection Lines (Source -> Ingestion -> Verification) */}
          <g stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3">
            <line x1="15%" y1="20%" x2="35%" y2="40%" />
            <line x1="35%" y1="40%" x2="50%" y2="35%" />
            <line x1="50%" y1="35%" x2="65%" y2="40%" />
            <line x1="65%" y1="40%" x2="85%" y2="25%" />
            <line x1="35%" y1="40%" x2="50%" y2="60%" />
            <line x1="50%" y1="60%" x2="65%" y2="40%" />
          </g>

          {/* Animated Flowing Transaction Pulse 1 */}
          <motion.circle
            r="3.5"
            fill="#059669"
            initial={{ cx: '15%', cy: '20%', opacity: 0 }}
            animate={{ 
              cx: ['15%', '35%', '50%', '65%', '85%'],
              cy: ['20%', '40%', '35%', '40%', '25%'],
              opacity: [0, 0.9, 0.9, 0.9, 0]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Animated Flowing Transaction Pulse 2 */}
          <motion.circle
            r="3"
            fill="#0284C7"
            initial={{ cx: '35%', cy: '40%', opacity: 0 }}
            animate={{ 
              cx: ['35%', '50%', '65%'],
              cy: ['40%', '60%', '40%'],
              opacity: [0, 0.8, 0]
            }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />

          {/* Static Anchored Graph Nodes */}
          <circle cx="35%" cy="40%" r="4" fill="#FFFFFF" stroke="#059669" strokeWidth="2" />
          <circle cx="50%" cy="35%" r="4.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
          <circle cx="65%" cy="40%" r="4" fill="#FFFFFF" stroke="#059669" strokeWidth="2" />
          <circle cx="50%" cy="60%" r="3.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
        </svg>
      </motion.div>

      {/* ========================================================================= */}
      {/* 2. FOREGROUND EDITORIAL HERO CONTENT                                      */}
      {/* ========================================================================= */}
      <div className="max-w-4xl mx-auto text-center space-y-7 relative z-10">
        {/* Eyebrow: Institutional Trust Standard */}
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-[#F1EFEA] text-[#334155] border border-[#E2E8F0] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
            Infraestructura de Confianza Comercial • México
          </span>
        </div>

        {/* Display Headline */}
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0F172A] leading-[1.08]">
            La confianza se demuestra con el denominador.
          </h1>
          <p className="text-base sm:text-lg text-[#334155] font-normal max-w-2xl mx-auto leading-relaxed pt-1">
            Antes de pagar por WhatsApp, SPEI o tienda en línea, comprueba quién respalda al negocio, cuántos pedidos entrega realmente y cómo responde ante una queja.
          </p>
        </div>

        {/* Hero Search Capsule */}
        <div className="pt-2">
          <HomeSearch />
        </div>

        {/* Ambient Evidence Pipeline Ribbon */}
        <div className="pt-2 max-w-3xl mx-auto">
          <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-[#475569]">
            <span className="flex items-center gap-1.5 font-bold text-[#0F172A]">
              <TreeStructure weight="bold" className="w-3.5 h-3.5 text-[#059669]" />
              Flujo de Verificación:
            </span>
            <span className="flex items-center gap-1 text-[#334155]">
              <span className="text-[#059669] font-bold">1.</span> Identidad SAT
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span className="flex items-center gap-1 text-[#334155]">
              <span className="text-[#059669] font-bold">2.</span> Órdenes Conectadas
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span className="flex items-center gap-1 text-[#334155]">
              <span className="text-[#059669] font-bold">3.</span> Cobertura &ge;90%
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span className="flex items-center gap-1 text-[#065F46] font-bold">
              <SealCheck weight="bold" className="w-3.5 h-3.5 text-[#059669]" />
              Pasaporte Certificado
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
