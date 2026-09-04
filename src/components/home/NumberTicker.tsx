'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'motion/react';

interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  delay?: number;
  className?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  className = '',
  decimalPlaces = 0,
  prefix = '',
  suffix = '',
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === 'down' ? 0 : value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      setDisplayValue(Number(latest.toFixed(decimalPlaces)));
    });
  }, [springValue, decimalPlaces]);

  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(displayValue);

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export function MetricsStrip() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6C706B]">
            <span>Volumen Transaccional</span>
            <span className="w-2 h-2 rounded-full bg-[#00B67A] animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#121511] font-mono">
            $<NumberTicker value={54820000} prefix="" /> <span className="text-xs font-bold text-[#6C706B]">MXN</span>
          </div>
          <p className="text-[11px] text-[#6C706B] font-medium">
            Órdenes auditadas con comprobante o webhook
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6C706B]">
            <span>Cobertura Promedio</span>
            <span className="text-[10px] font-bold text-[#008B5D] bg-[#E6F8F2] px-2 py-0.5 rounded-full">
              Anti-Cherry-Picking
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#008B5D] font-mono">
            <NumberTicker value={93.4} decimalPlaces={1} suffix="%" />
          </div>
          <p className="text-[11px] text-[#6C706B] font-medium">
            De compradores reales reciben invitación
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6C706B]">
            <span>Mediana SLA Resolución</span>
            <span className="text-[10px] font-bold text-[#2050E6] bg-[#EEF2FE] px-2 py-0.5 rounded-full">
              Supervisado
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#121511] font-mono">
            <NumberTicker value={0.6} decimalPlaces={1} suffix=" hrs" />
          </div>
          <p className="text-[11px] text-[#6C706B] font-medium">
            Primera atención formal ante quejas
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6C706B]">
            <span>Reseñas sin Comprobante</span>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              Ponderación Cero
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#121511] font-mono">
            0%
          </div>
          <p className="text-[11px] text-[#6C706B] font-medium">
            Ninguna reseña no comprobada altera el score
          </p>
        </div>
      </div>
    </section>
  );
}
