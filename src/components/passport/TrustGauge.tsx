'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface TrustGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  confidenceLevel?: string;
  className?: string;
  showSubtext?: boolean;
}

export function TrustGauge({
  score,
  size = 'md',
  confidenceLevel,
  className,
  showSubtext = true,
}: TrustGaugeProps) {
  // Dimensions per size
  const config = {
    sm: {
      svgSize: 64,
      strokeWidth: 4.5,
      radius: 26,
      scoreText: 'text-base',
      subText: 'text-[7px]',
      beaconText: 'text-[8px]',
      padding: 'p-1',
    },
    md: {
      svgSize: 96,
      strokeWidth: 6,
      radius: 40,
      scoreText: 'text-2xl',
      subText: 'text-[9px]',
      beaconText: 'text-[10px]',
      padding: 'p-2',
    },
    lg: {
      svgSize: 132,
      strokeWidth: 8,
      radius: 54,
      scoreText: 'text-4xl',
      subText: 'text-[10px]',
      beaconText: 'text-[11px]',
      padding: 'p-3',
    },
  }[size];

  const circumference = 2 * Math.PI * config.radius;
  const strokeOffset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className={cn("flex flex-col items-center justify-center shrink-0 select-none", className)}>
      <div className={cn("relative flex items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,1)] border border-[#E5E7EB]", config.padding)}>
        {/* SVG Dual-Ring Radial Progress */}
        <svg
          width={config.svgSize}
          height={config.svgSize}
          className="transform -rotate-90 origin-center"
        >
          {/* Subtle Background Track */}
          <circle
            cx={config.svgSize / 2}
            cy={config.svgSize / 2}
            r={config.radius}
            stroke="#EFEFEA"
            strokeWidth={config.strokeWidth}
            fill="transparent"
          />

          {/* Active Emerald Progress Arc */}
          <motion.circle
            cx={config.svgSize / 2}
            cy={config.svgSize / 2}
            r={config.radius}
            stroke="#00B67A"
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: strokeOffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="flex items-baseline font-mono font-black text-[#121511] leading-none">
            <span className={config.scoreText}>
              {score.toFixed(1)}
            </span>
          </div>
          {showSubtext && size !== 'sm' && (
            <span className={cn("font-mono font-bold uppercase tracking-wider text-[#6C706B] mt-0.5", config.subText)}>
              Opinio
            </span>
          )}
        </div>
      </div>

      {/* Micro-Pill Beacon Status under Gauge */}
      {showSubtext && (
        <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E6F8F2] border border-[#B3ECD9] text-[#008B5D] font-mono font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B67A] animate-pulse" />
          <span className={config.beaconText}>
            {confidenceLevel === 'very_strong' ? 'NIVEL 4 • AUDITADO' : 'PASAPORTE AUDITADO'}
          </span>
        </div>
      )}
    </div>
  );
}
