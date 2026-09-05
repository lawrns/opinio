#!/usr/bin/env bun
/**
 * Seed factual public-info fichas for opinio.mx (Phase 0 growth play).
 *
 * INTEGRITY RULES (hard):
 * - No fabricated reviews, orders, cases, RFCs, CLEEs, phones or identities.
 * - verified_level stays 'public_info' (never claim identity/orders we lack).
 * - trust_score = 0, confidence 'preliminary' → passport renders honest empty state.
 * - Descriptions are neutral, factual, one-line. No complaint/defamation claims.
 * - Idempotent: upsert by slug; never downgrades a row that later got real data
 *   (WHERE clause keeps claimed/verified rows untouched).
 */
import { pool } from '../src/lib/db';

interface Ficha {
  slug: string;
  brand_name: string;
  category: string;
  domain: string;
  description: string;
}

const fichas: Ficha[] = [
  // Marketplaces y e-commerce
  { slug: 'mercadolibre', brand_name: 'Mercado Libre', category: 'Marketplaces y e-commerce', domain: 'mercadolibre.com.mx', description: 'Marketplace líder en México para compra y venta entre usuarios, con logística integrada (Mercado Envíos), pagos y programa de protección al comprador.' },
  { slug: 'amazon-mexico', brand_name: 'Amazon México', category: 'Marketplaces y e-commerce', domain: 'amazon.com.mx', description: 'Tienda en línea de Amazon para México: envíos Prime, marketplace de terceros y servicio de devoluciones.' },
  { slug: 'shein-mexico', brand_name: 'Shein México', category: 'Marketplaces y e-commerce', domain: 'shein.com.mx', description: 'Plataforma de moda en línea con operación en México, envíos internacionales y app propia.' },
  { slug: 'temu', brand_name: 'Temu', category: 'Marketplaces y e-commerce', domain: 'temu.com', description: 'Marketplace en línea enfocado en precios bajos, con envíos internacionales hacia México.' },
  // Retail y departamentales
  { slug: 'liverpool', brand_name: 'Liverpool', category: 'Retail y departamentales', domain: 'liverpool.com.mx', description: 'Cadena departamental mexicana con tienda en línea, crédito propio, envíos y recolección en tienda.' },
  { slug: 'coppel', brand_name: 'Coppel', category: 'Retail y departamentales', domain: 'coppel.com', description: 'Cadena mexicana de retail con tienda en línea, crédito a meses y cobertura en todo el país.' },
  // Fintech, neobancos y pagos
  { slug: 'mercadopago', brand_name: 'Mercado Pago', category: 'Fintech, neobancos y pagos', domain: 'mercadopago.com.mx', description: 'Plataforma de pagos digitales de Mercado Libre en México: cobros, transferencias SPEI, wallet y soluciones para negocios.' },
  { slug: 'nu-mexico', brand_name: 'Nu México', category: 'Fintech, neobancos y pagos', domain: 'nu.com.mx', description: 'Institución de fintech popular (sofipo) en México: tarjetas de crédito sin anualidad, cuenta de ahorro con rendimiento y app móvil.' },
  { slug: 'plata-card', brand_name: 'Plata Card', category: 'Fintech, neobancos y pagos', domain: 'platacard.mx', description: 'Tarjeta de crédito digital mexicana enfocada en inclusión crediticia mediante app móvil.' },
  { slug: 'stori', brand_name: 'Stori', category: 'Fintech, neobancos y pagos', domain: 'stori.mx', description: 'Tarjeta de crédito digital en México orientada a personas sin historial crediticio.' },
  { slug: 'bitso', brand_name: 'Bitso', category: 'Fintech, neobancos y pagos', domain: 'bitso.com', description: 'Exchange de criptomonedas con operación en México: compra/venta de cripto, SPEI y retiros.' },
  { slug: 'kueski', brand_name: 'Kueski', category: 'Fintech, neobancos y pagos', domain: 'kueski.com', description: 'Plataforma mexicana de préstamos digitales y pagos a plazos (BNPL) en comercio electrónico.' },
  // Banca digital
  { slug: 'bbva-mexico', brand_name: 'BBVA México', category: 'Banca digital', domain: 'bbva.mx', description: 'Banco con la app móvil más usada en México: banca digital, tarjetas, créditos y transferencias.' },
  // Delivery y quick commerce
  { slug: 'rappi', brand_name: 'Rappi', category: 'Delivery y quick commerce', domain: 'rappi.com.mx', description: 'Súper-app de delivery en México: comida, supermercado, farmacia, efectivo y servicios financieros.' },
  { slug: 'ubereats', brand_name: 'Uber Eats', category: 'Delivery y quick commerce', domain: 'ubereats.com', description: 'Plataforma de entrega de comida a domicilio de Uber con operación en más de 70 ciudades de México.' },
  { slug: 'didi-food', brand_name: 'DiDi Food', category: 'Delivery y quick commerce', domain: 'didi-food.com', description: 'App de entrega de comida a domicilio del ecosistema DiDi con operación en México.' },
  { slug: '99minutos', brand_name: '99 Minutos', category: 'Delivery y quick commerce', domain: '99minutos.com', description: 'Empresa de logística de última milla y entregas same-day con origen en México y presencia en Latinoamérica.' },
  // Movilidad
  { slug: 'uber', brand_name: 'Uber', category: 'Movilidad', domain: 'uber.com', description: 'Plataforma de transporte privado por app con operación en México: viajes, tarifas dinámicas y Uber Eats.' },
  { slug: 'didi', brand_name: 'DiDi', category: 'Movilidad', domain: 'didiglobal.com', description: 'App de movilidad y servicios de transporte con operación en México; parte del ecosistema DiDi Global.' },
  // Telecomunicaciones e internet
  { slug: 'telcel', brand_name: 'Telcel', category: 'Telecomunicaciones e internet', domain: 'telcel.com', description: 'Operador de telefonía móvil líder en México (América Móvil): prepago, pospago, datos y cobertura nacional.' },
  { slug: 'telmex', brand_name: 'Telmex / Infinitum', category: 'Telecomunicaciones e internet', domain: 'telmex.com', description: 'Proveedor mexicano de telefonía fija e internet (Infinitum) del grupo América Móvil.' },
  { slug: 'totalplay', brand_name: 'Totalplay', category: 'Telecomunicaciones e internet', domain: 'totalplay.com.mx', description: 'Proveedor de fibra óptica, televisión de paga y telefonía en México (Grupo Salinas).' },
  // Aerolíneas y travel online
  { slug: 'volaris', brand_name: 'Volaris', category: 'Aerolíneas y travel online', domain: 'volaris.com', description: 'Aerolínea mexicana de bajo costo con la red doméstica más grande de México.' },
  { slug: 'vivaaerobus', brand_name: 'VivaAerobus', category: 'Aerolíneas y travel online', domain: 'vivaaerobus.com', description: 'Aerolínea mexicana de ultra bajo costo con rutas nacionales e internacionales.' },
  { slug: 'aeromexico', brand_name: 'Aeroméxico', category: 'Aerolíneas y travel online', domain: 'aeromexico.com', description: 'Aerolínea bandera de México, miembro de SkyTeam, con programa de lealtad Club Premier.' },
  // Logística y paquetería
  { slug: 'estafeta', brand_name: 'Estafeta', category: 'Logística y paquetería', domain: 'estafeta.com', description: 'Empresa mexicana de mensajería y paquetería con cobertura nacional y servicios para e-commerce.' },
  // Apuestas deportivas y casino (fichas informativas; sin promoción)
  { slug: 'winpot', brand_name: 'Winpot', category: 'Apuestas deportivas y casino', domain: 'winpot.mx', description: 'Operador mexicano de apuestas deportivas y casino en línea con permiso de la Secretaría de Gobernación.' },
  { slug: 'caliente', brand_name: 'Caliente', category: 'Apuestas deportivas y casino', domain: 'caliente.mx', description: 'Grupo mexicano de apuestas deportivas, casino y juegos con presencia física y en línea.' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    let updated = 0;
    for (const f of fichas) {
      const res = await client.query(
        `INSERT INTO businesses (
           slug, brand_name, category, description, domain, logo_url,
           operating_area, claimed, verified_level, trust_score,
           confidence_level, coverage_percentage, observed_orders_count,
           invited_orders_count, issues_per_thousand, resolution_rate,
           median_response_hours, reopen_rate, effective_reviews_count
         ) VALUES ($1,$2,$3,$4,$5,$6,'Nacional (México)',false,'public_info',0,'preliminary',0,0,0,0,0,0,0,0)
         ON CONFLICT (slug) DO UPDATE SET
           brand_name = EXCLUDED.brand_name,
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           domain = EXCLUDED.domain,
           logo_url = EXCLUDED.logo_url,
           operating_area = EXCLUDED.operating_area,
           updated_at = NOW()
         WHERE businesses.verified_level = 'public_info' AND businesses.trust_score = 0
         RETURNING (xmax = 0) AS did_insert`,
        [f.slug, f.brand_name, f.category, f.description, f.domain, `/logos/${f.slug}.png`]
      );
      if (res.rows.length === 0) {
        console.log(`  ⏭  Skipped (already has data): ${f.slug}`);
      } else if (res.rows[0].did_insert) {
        inserted++;
        console.log(`  ➕ Inserted: ${f.brand_name} (${f.slug})`);
      } else {
        updated++;
        console.log(`  🔄 Updated: ${f.brand_name} (${f.slug})`);
      }
    }
    await client.query('COMMIT');
    console.log(`✅ Fichas listas: ${inserted} nuevas, ${updated} actualizadas de ${fichas.length}.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
