'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  Armchair, 
  DeviceMobile, 
  Sparkle, 
  Diamond, 
  TShirt, 
  Wrench, 
  Package, 
  Coffee,
  CaretRight
} from '@phosphor-icons/react';

const CATEGORIES = [
  { name: 'Muebles y Hogar', icon: Armchair, query: 'Hogar' },
  { name: 'Tecnología y Celulares', icon: DeviceMobile, query: 'Electrónica' },
  { name: 'Belleza y Skincare', icon: Sparkle, query: 'Belleza' },
  { name: 'Joyería y Plata .925', icon: Diamond, query: 'Joyería' },
  { name: 'Moda y Calzado', icon: TShirt, query: 'Moda' },
  { name: 'Autopartes y Talleres', icon: Wrench, query: 'Autos' },
  { name: 'Paquetería y Envíos', icon: Package, query: 'Servicios' },
  { name: 'Café y Gourmet', icon: Coffee, query: 'Café' },
];

export function CategoryBar() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black text-[#121511] tracking-tight">
          ¿Qué estás buscando?
        </h2>
        <Link
          href="/verificar?categoria=all"
          className="text-xs font-bold text-[#2050E6] hover:underline flex items-center gap-1"
        >
          <span>Ver todas las categorías</span>
          <CaretRight weight="bold" className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.name}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href={`/verificar?q=${encodeURIComponent(cat.query)}`}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] shadow-2xs hover:shadow-xs text-center transition-all group h-full"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#121511] group-hover:text-[#00B67A] group-hover:border-[#B3ECD9] group-hover:bg-[#E6F8F2] transition-colors mb-2">
                  <Icon weight="regular" className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#121511] line-clamp-1 leading-tight">
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
