#!/usr/bin/env bun
/**
 * Comprehensive National Business Seed Script for opinio.mx
 *
 * Populates 120+ high-relevance Mexican commerce, service, and digital businesses.
 *
 * INTEGRITY & COMPLIANCE RULES:
 * - verified_level = 'public_info' (strictly factual; no fabricated claims or scores).
 * - trust_score = 0, confidence_level = 'preliminary'.
 * - Descriptions are neutral, legal, and factual.
 * - Idempotent upsert by slug; never overwrites or downgrades claimed/verified profiles.
 */

import { pool } from '../src/lib/db';

export interface BusinessFicha {
  slug: string;
  brand_name: string;
  legal_name?: string;
  category: string;
  domain: string;
  description: string;
  operating_area?: string;
}

export const MASTER_FICHAS: BusinessFicha[] = [
  // ---------------------------------------------------------------------------
  // 1. Marketplaces y e-commerce
  // ---------------------------------------------------------------------------
  {
    slug: 'mercadolibre',
    brand_name: 'Mercado Libre',
    legal_name: 'DeRemate.com de México, S. de R.L. de C.V.',
    category: 'Marketplaces y e-commerce',
    domain: 'mercadolibre.com.mx',
    description: 'Marketplace líder en México para compra y venta entre usuarios y marcas oficiales, con logística integrada (Mercado Envíos), pagos y protección al comprador.'
  },
  {
    slug: 'amazon-mexico',
    brand_name: 'Amazon México',
    legal_name: 'Servicios Comerciales Amazon México, S. de R.L. de C.V.',
    category: 'Marketplaces y e-commerce',
    domain: 'amazon.com.mx',
    description: 'Tienda en línea de Amazon para México: envíos Prime, catálogo nacional e internacional de terceros y gestión de devoluciones.'
  },
  {
    slug: 'shein-mexico',
    brand_name: 'Shein México',
    legal_name: 'Roadget Business PTE. LTD.',
    category: 'Marketplaces y e-commerce',
    domain: 'shein.com.mx',
    description: 'Plataforma global de moda, calzado y accesorios en línea con envíos internacionales directos a domicilios en México.'
  },
  {
    slug: 'temu',
    brand_name: 'Temu',
    legal_name: 'Whaleco Technology Limited',
    category: 'Marketplaces y e-commerce',
    domain: 'temu.com',
    description: 'Marketplace internacional enfocado en productos de consumo a precios de fábrica con envíos globales hacia la República Mexicana.'
  },
  {
    slug: 'aliexpress-mexico',
    brand_name: 'AliExpress México',
    legal_name: 'Alibaba.com Singapore E-Commerce Private Limited',
    category: 'Marketplaces y e-commerce',
    domain: 'aliexpress.com',
    description: 'Plataforma de comercio electrónico transfronterizo de Grupo Alibaba con entrega a domicilio en México y sistema de disputas.'
  },
  {
    slug: 'claroshop',
    brand_name: 'Claroshop',
    legal_name: 'Claro Shop, S.A. de C.V.',
    category: 'Marketplaces y e-commerce',
    domain: 'claroshop.com',
    description: 'Tienda en línea de Grupo Carso con opción de compra con cargo a recibo Telmex/Telcel, marketplace de tiendas oficiales y envíos a todo México.'
  },

  // ---------------------------------------------------------------------------
  // 2. Retail y tiendas departamentales
  // ---------------------------------------------------------------------------
  {
    slug: 'liverpool',
    brand_name: 'Liverpool',
    legal_name: 'Distribuidora Liverpool, S.A. de C.V.',
    category: 'Retail y departamentales',
    domain: 'liverpool.com.mx',
    description: 'Cadena departamental mexicana con tienda en línea, crédito departamental, Click & Collect en tienda y cobertura nacional de entregas.'
  },
  {
    slug: 'palacio-de-hierro',
    brand_name: 'El Palacio de Hierro',
    legal_name: 'El Palacio de Hierro, S.A. de C.V.',
    category: 'Retail y departamentales',
    domain: 'elpalaciodehierro.com',
    description: 'Cadena de tiendas departamentales de lujo en México con alta moda, perfumería, electrónica, hogar y financiamiento propio.'
  },
  {
    slug: 'sears-mexico',
    brand_name: 'Sears México',
    legal_name: 'Sears Operadora México, S.A. de C.V.',
    category: 'Retail y departamentales',
    domain: 'sears.com.mx',
    description: 'Cadena departamental mexicana de Grupo Carso con venta de electrodomésticos, muebles, electrónica, moda y crédito Sears.'
  },
  {
    slug: 'coppel',
    brand_name: 'Coppel',
    legal_name: 'Coppel, S.A. de C.V.',
    category: 'Retail y departamentales',
    domain: 'coppel.com',
    description: 'Cadena mexicana de retail omnicanal con tienda en línea, préstamos personales, crédito departamental a plazos y presencia nacional.'
  },
  {
    slug: 'suburbia',
    brand_name: 'Suburbia',
    legal_name: 'Suburbia, S. de R.L. de C.V.',
    category: 'Retail y departamentales',
    domain: 'suburbia.com.mx',
    description: 'Tienda departamental orientada a moda accesible, telefonía, línea blanca y calzado familiar en toda la República Mexicana.'
  },
  {
    slug: 'sanborns',
    brand_name: 'Sanborns',
    legal_name: 'Sanborns Hermanos, S.A.',
    category: 'Retail y departamentales',
    domain: 'sanborns.com.mx',
    description: 'Cadena mexicana de retail, librería, farmacia, electrónica y restaurante tradicional con tienda en línea de Grupo Carso.'
  },

  // ---------------------------------------------------------------------------
  // 3. Supermercados, autoservicio y clubes de precio
  // ---------------------------------------------------------------------------
  {
    slug: 'walmart-mexico',
    brand_name: 'Walmart México',
    legal_name: 'Nueva Wal-Mart de México, S. de R.L. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'walmart.com.mx',
    description: 'La mayor cadena de autoservicio de México: despensa, electrónica, farmacia, entrega a domicilio el mismo día y recolección pickup.'
  },
  {
    slug: 'bodega-aurrera',
    brand_name: 'Bodega Aurrera',
    legal_name: 'Nueva Wal-Mart de México, S. de R.L. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'bodegaaurrera.com.mx',
    description: 'Cadena de autoservicio de precios accesibles con la red de tiendas más extensa del país y servicio de despensa a domicilio.'
  },
  {
    slug: 'soriana',
    brand_name: 'Soriana',
    legal_name: 'Organización Soriana, S.A.B. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'soriana.com',
    description: 'Cadena mexicana de supermercados e hipermercados con catálogo digital, programa de lealtad Recompensas Soriana y entregas express.'
  },
  {
    slug: 'chedraui',
    brand_name: 'Chedraui',
    legal_name: 'Grupo Comercial Chedraui, S.A.B. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'chedraui.com.mx',
    description: 'Grupo comercial mexicano con hipermercados, supermercados Selecto, abarrotes, perecederos y entrega a domicilio nacional.'
  },
  {
    slug: 'la-comer',
    brand_name: 'La Comer',
    legal_name: 'La Comer, S.A.B. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'lacomer.com.mx',
    description: 'Cadena de autoservicio enfocada en alimentos gourmet, productos frescos, importados y panadería tradicional con servicio en línea.'
  },
  {
    slug: 'costco-mexico',
    brand_name: 'Costco México',
    legal_name: 'Costco de México, S.A. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'costco.com.mx',
    description: 'Club de precios por membresía en México con venta al mayoreo, abarrotes, electrónica, óptica, farmacia y tienda en línea.'
  },
  {
    slug: 'sams-club-mexico',
    brand_name: "Sam's Club México",
    legal_name: 'Nueva Wal-Mart de México, S. de R.L. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'sams.com.mx',
    description: 'Club de precios de membresía de Walmart en México con presentaciones institucionales, tecnología y beneficios exclusivos para socios.'
  },
  {
    slug: 'heb-mexico',
    brand_name: 'H-E-B México',
    legal_name: 'Supermercados Internacionales HEB, S.A. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'heb.com.mx',
    description: 'Cadena de supermercados con fuerte presencia en el norte y centro de México, reconocida por frescura, carnes y productos de importación.'
  },
  {
    slug: 'justo',
    brand_name: 'Jüsto',
    legal_name: 'Jüsto Inc. / J-Commerce, S.A.P.I. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'justo.mx',
    description: 'Supermercado 100% digital en México sin tiendas físicas intermediarias, enfocado en frutas, verduras y despensa fresca entregada a domicilio.'
  },
  {
    slug: 'oxxo',
    brand_name: 'OXXO',
    legal_name: 'Cadena Comercial OXXO, S.A. de C.V.',
    category: 'Supermercados y autoservicio',
    domain: 'oxxo.com',
    description: 'La mayor cadena de tiendas de conveniencia de México: abarrotes, café Andatti, pagos de servicios, depósitos bancarios y envíos de dinero.'
  },

  // ---------------------------------------------------------------------------
  // 4. Fintech, neobancos y pagos
  // ---------------------------------------------------------------------------
  {
    slug: 'mercadopago',
    brand_name: 'Mercado Pago',
    legal_name: 'MP Agregador, S. de R.L. de C.V.',
    category: 'Fintech, neobancos y pagos',
    domain: 'mercadopago.com.mx',
    description: 'Billetera digital e institución de pagos en México: transferencias SPEI 24/7, cobros Point, tarjeta de crédito y rendimiento sobre saldos.'
  },
  {
    slug: 'nu-mexico',
    brand_name: 'Nu México',
    legal_name: 'Nu México Financiera, S.A. de C.V., S.F.P.',
    category: 'Fintech, neobancos y pagos',
    domain: 'nu.com.mx',
    description: 'Entidad financiera regulada (SOFIPO) en México: cuenta con cajitas de rendimiento, tarjeta de crédito sin anualidad y préstamos personales.'
  },
  {
    slug: 'plata-card',
    brand_name: 'Plata Card',
    legal_name: 'Plata Card, S.A.P.I. de C.V.',
    category: 'Fintech, neobancos y pagos',
    domain: 'platacard.mx',
    description: 'Tarjeta de crédito digital mexicana con cashback configurable por categorías y gestión de límites mediante aplicación móvil.'
  },
  {
    slug: 'stori',
    brand_name: 'Stori',
    legal_name: 'Stori Card / Mi Stori, S.A. de C.V., S.F.P.',
    category: 'Fintech, neobancos y pagos',
    domain: 'stori.mx',
    description: 'Fintech y SOFIPO mexicana enfocada en inclusión financiera: tarjetas de crédito para iniciar historial y cuentas con rendimiento diario.'
  },
  {
    slug: 'klar',
    brand_name: 'Klar',
    legal_name: 'Klar Servicios Financieros / Klar Technologies, S.A.P.I. de C.V.',
    category: 'Fintech, neobancos y pagos',
    domain: 'klar.mx',
    description: 'Plataforma mexicana de servicios financieros regulados: cuenta de ahorro con alto rendimiento, líneas de crédito y tarjeta de crédito/débito.'
  },
  {
    slug: 'uala-mexico',
    brand_name: 'Ualá México',
    legal_name: 'ABC Capital Banco / Ualá México, S.A.',
    category: 'Fintech, neobancos y pagos',
    domain: 'uala.mx',
    description: 'Entidad bancaria digital en México con cuenta que genera rendimientos diarios, tarjeta de débito Mastercard e inversiones en pagarés.'
  },
  {
    slug: 'hey-banco',
    brand_name: 'Hey Banco',
    legal_name: 'Banco Regional, S.A., Institución de Banca Múltiple, Banregio Grupo Financiero',
    category: 'Fintech, neobancos y pagos',
    domain: 'heybanco.com',
    description: 'Brazo bancario 100% digital de Banregio: cuenta con tarjeta dual débito/crédito, pagarés con rendimiento garantizado y fondos de inversión.'
  },
  {
    slug: 'kueski',
    brand_name: 'Kueski',
    legal_name: 'Kueski, S.A.P.I. de C.V., SOFOM, E.N.R.',
    category: 'Fintech, neobancos y pagos',
    domain: 'kueski.com',
    description: 'Plataforma mexicana de micropréstamos personales y servicio de compra ahora, paga después (Kueski Pay) en miles de comercios del país.'
  },
  {
    slug: 'bitso',
    brand_name: 'Bitso',
    legal_name: 'Bitso International / Nvio Pagos México, S.A.P.I. de C.V., Institución de Fondos de Pago Electrónico',
    category: 'Fintech, neobancos y pagos',
    domain: 'bitso.com',
    description: 'Exchange líder de criptomonedas en América Latina con transferencias SPEI en pesos mexicanos, compra/venta de activos digitales y transferencias internacionales.'
  },
  {
    slug: 'spin-by-oxxo',
    brand_name: 'Spin by OXXO',
    legal_name: 'Compropago, S.A.P.I. de C.V., Institución de Fondos de Pago Electrónico',
    category: 'Fintech, neobancos y pagos',
    domain: 'spinbyoxxo.com.mx',
    description: 'Billetera digital y tarjeta de débito respaldada por Femsa con depósitos y retiros en efectivo en más de 20,000 tiendas OXXO de México.'
  },
  {
    slug: 'clip',
    brand_name: 'Clip',
    legal_name: 'PayClip, S. de R.L. de C.V.',
    category: 'Fintech, neobancos y pagos',
    domain: 'clip.mx',
    description: 'Empresa mexicana proveedora de lectores de tarjetas bancarias, links de cobro a distancia y soluciones integrales de punto de venta para negocios.'
  },
  {
    slug: 'conekta',
    brand_name: 'Conekta',
    legal_name: 'Conekta, S.A.P.I. de C.V.',
    category: 'Fintech, neobancos y pagos',
    domain: 'conekta.com',
    description: 'Pasarela mexicana de pagos para comercio electrónico que procesa tarjetas de crédito, débito, transferencias bancarias y pagos en efectivo en tiendas.'
  },
  {
    slug: 'baubap',
    brand_name: 'Baubap',
    legal_name: 'Baubap, S.A.P.I. de C.V., SOFOM, E.N.R.',
    category: 'Fintech, neobancos y pagos',
    domain: 'baubap.com',
    description: 'Microfinanciera digital en México que otorga préstamos personales inmediatos a través de smartphone las 24 horas del día.'
  },
  {
    slug: 'moneypool',
    brand_name: 'Moneypool',
    legal_name: 'Moneypool, S.A.P.I. de C.V.',
    category: 'Fintech, neobancos y pagos',
    domain: 'moneypool.mx',
    description: 'Aplicación mexicana para organizar cobros grupales, recolección de dinero entre amigos, eventos y pagos entre particulares.'
  },

  // ---------------------------------------------------------------------------
  // 5. Banca tradicional y digital
  // ---------------------------------------------------------------------------
  {
    slug: 'bbva-mexico',
    brand_name: 'BBVA México',
    legal_name: 'BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México',
    category: 'Banca digital y servicios financieros',
    domain: 'bbva.mx',
    description: 'El mayor grupo financiero de México: banca móvil con más de 20 millones de usuarios digitales, cuentas, tarjetas, hipotecas y seguros.'
  },
  {
    slug: 'santander-mexico',
    brand_name: 'Santander México',
    legal_name: 'Banco Santander México, S.A., Institución de Banca Múltiple, Grupo Financiero Santander México',
    category: 'Banca digital y servicios financieros',
    domain: 'santander.com.mx',
    description: 'Institución bancaria líder en México con servicios de banca en línea, crédito automotriz, hipotecas, cuentas universitarias y empresariales.'
  },
  {
    slug: 'banorte',
    brand_name: 'Banorte',
    legal_name: 'Banco Mercantil del Norte, S.A., Institución de Banca Múltiple, Grupo Financiero Banorte',
    category: 'Banca digital y servicios financieros',
    domain: 'banorte.com',
    description: 'El banco fuerte de México: institución financiera de capital nacional con red de sucursales, banca móvil, nómina y créditos comerciales.'
  },
  {
    slug: 'citibanamex',
    brand_name: 'Citibanamex',
    legal_name: 'Banco Nacional de México, S.A., Integrante del Grupo Financiero Banamex',
    category: 'Banca digital y servicios financieros',
    domain: 'citibanamex.com',
    description: 'Institución bancaria histórica de México con amplia cartera de tarjetas de crédito, preventas de espectáculos, cuentas de ahorro y Afore.'
  },
  {
    slug: 'hsbc-mexico',
    brand_name: 'HSBC México',
    legal_name: 'HSBC México, S.A., Institución de Banca Múltiple, Grupo Financiero HSBC',
    category: 'Banca digital y servicios financieros',
    domain: 'hsbc.com.mx',
    description: 'Institución bancaria global en México con créditos al consumo, cuentas digitales, banca patrimonial y financiamiento de comercio exterior.'
  },
  {
    slug: 'scotiabank-mexico',
    brand_name: 'Scotiabank México',
    legal_name: 'Scotiabank Inverlat, S.A., Institución de Banca Múltiple, Grupo Financiero Scotiabank Inverlat',
    category: 'Banca digital y servicios financieros',
    domain: 'scotiabank.com.mx',
    description: 'Institución bancaria con operaciones en México con financiamiento automotriz, préstamos hipotecarios y servicios de banca digital.'
  },
  {
    slug: 'banco-azteca',
    brand_name: 'Banco Azteca',
    legal_name: 'Banco Azteca, S.A., Institución de Banca Múltiple',
    category: 'Banca digital y servicios financieros',
    domain: 'bancoazteca.com.mx',
    description: 'Institución bancaria de Grupo Salinas con sucursales abiertas los 365 días del año, créditos al consumo, remesas y cuentas de depósito.'
  },

  // ---------------------------------------------------------------------------
  // 6. Delivery y quick commerce
  // ---------------------------------------------------------------------------
  {
    slug: 'rappi',
    brand_name: 'Rappi',
    legal_name: 'Rappi Technologies México, S. de R.L. de C.V.',
    category: 'Delivery y quick commerce',
    domain: 'rappi.com.mx',
    description: 'Super-app de entregas en México: restaurantes, supermercados (Turbo en 10 min), farmacias, licores, compras generales y RappiCard.'
  },
  {
    slug: 'ubereats',
    brand_name: 'Uber Eats',
    legal_name: 'Uber Portier México, S. de R.L. de C.V.',
    category: 'Delivery y quick commerce',
    domain: 'ubereats.com',
    description: 'Plataforma digital de pedidos de comida a domicilio y abarrotes conectada a la red de socios repartidores de Uber en México.'
  },
  {
    slug: 'didi-food',
    brand_name: 'DiDi Food',
    legal_name: 'DiDi Food México, S.A. de C.V.',
    category: 'Delivery y quick commerce',
    domain: 'didifood.com.mx',
    description: 'Aplicación de entrega de comida a domicilio con cobertura en las principales metrópolis y ciudades medianas de la República Mexicana.'
  },
  {
    slug: '99minutos',
    brand_name: '99 Minutos',
    legal_name: '99 Minutos, S.A.P.I. de C.V.',
    category: 'Delivery y quick commerce',
    domain: '99minutos.com',
    description: 'Empresa logística mexicana de última milla con entregas same-day, next-day y lockers inteligentes para e-commerce en Latinoamérica.'
  },

  // ---------------------------------------------------------------------------
  // 7. Movilidad y transporte de pasajeros
  // ---------------------------------------------------------------------------
  {
    slug: 'uber',
    brand_name: 'Uber',
    legal_name: 'Uber B.V. / Uber México Technology, S.A. de C.V.',
    category: 'Movilidad y transporte de pasajeros',
    domain: 'uber.com',
    description: 'Plataforma de viajes compartidos por aplicación con servicios UberX, Uber Black, Uber Planet y Uber Comfort en decenas de ciudades mexicanas.'
  },
  {
    slug: 'didi',
    brand_name: 'DiDi',
    legal_name: 'DiDi Mobility México, S.A. de C.V.',
    category: 'Movilidad y transporte de pasajeros',
    domain: 'didi.mx',
    description: 'Plataforma de movilidad urbana por app con opciones de viajes accesibles (DiDi Express, DiDi Taxi) y entregas directas.'
  },
  {
    slug: 'cabify-mexico',
    brand_name: 'Cabify México',
    legal_name: 'Maxi Mobility México, S.A. de C.V.',
    category: 'Movilidad y transporte de pasajeros',
    domain: 'cabify.com',
    description: 'Servicio de movilidad de pasajeros y transporte corporativo con tarifas transparentes y conductores certificados en México.'
  },
  {
    slug: 'ado',
    brand_name: 'ADO',
    legal_name: 'Autobuses de Oriente, S.A. de C.V.',
    category: 'Movilidad y transporte de pasajeros',
    domain: 'ado.com.mx',
    description: 'Línea de autobuses líder de pasajeros en el centro, sur, golfo y sureste de México con venta de boletos en línea y terminales conectadas.'
  },
  {
    slug: 'primera-plus',
    brand_name: 'Primera Plus',
    legal_name: 'Transporte de Pasajeros Primera Plus, S.A. de C.V.',
    category: 'Movilidad y transporte de pasajeros',
    domain: 'primeraplus.com.mx',
    description: 'Línea de autobuses ejecutiva con amenidades de viaje y cobertura en la región del Bajío, Ciudad de México, Jalisco y Michoacán.'
  },
  {
    slug: 'etn-turistar',
    brand_name: 'ETN Turistar Lujo',
    legal_name: 'ETN Turistar Lujo, S.A. de C.V.',
    category: 'Movilidad y transporte de pasajeros',
    domain: 'etn.com.mx',
    description: 'Línea de autobuses de lujo con asientos individuales, entretenimiento a bordo y rutas que conectan el centro, occidente y norte de México.'
  },
  {
    slug: 'omnibus-de-mexico',
    brand_name: 'Omnibus de México',
    legal_name: 'Omnibus de México, S.A. de C.V.',
    category: 'Movilidad y transporte de pasajeros',
    domain: 'odm.com.mx',
    description: 'Empresa mexicana de autotransporte federal de pasajeros con cobertura en más de 20 estados y cruces fronterizos hacia EE. UU.'
  },

  // ---------------------------------------------------------------------------
  // 8. Aerolíneas y travel online
  // ---------------------------------------------------------------------------
  {
    slug: 'volaris',
    brand_name: 'Volaris',
    legal_name: 'Concesionaria Vuela Compañía de Aviación, S.A.P.I. de C.V.',
    category: 'Aerolíneas y travel online',
    domain: 'volaris.com',
    description: 'Aerolínea mexicana de ultra bajo costo con la mayor red de rutas punto a punto en México, Estados Unidos, Centroamérica y Sudamérica.'
  },
  {
    slug: 'vivaaerobus',
    brand_name: 'VivaAerobus',
    legal_name: 'Aeroenlaces Nacionales, S.A. de C.V.',
    category: 'Aerolíneas y travel online',
    domain: 'vivaaerobus.com',
    description: 'Aerolínea mexicana de bajo costo con flota joven de aeronaves Airbus y tarifas base económicas para vuelos nacionales e internacionales.'
  },
  {
    slug: 'aeromexico',
    brand_name: 'Aeroméxico',
    legal_name: 'Aerovías de México, S.A. de C.V.',
    category: 'Aerolíneas y travel online',
    domain: 'aeromexico.com',
    description: 'Aerolínea bandera de México, miembro de SkyTeam, con vuelos transoceánicos, salones Premier y programa de fidelidad Aeroméxico Rewards.'
  },
  {
    slug: 'despegar-mexico',
    brand_name: 'Despegar México',
    legal_name: 'Despegar.com México, S.A. de C.V.',
    category: 'Aerolíneas y travel online',
    domain: 'despegar.com.mx',
    description: 'Agencia de viajes en línea líder en Latinoamérica para reserva de vuelos, hoteles, paquetes vacacionales, renta de autos y tours.'
  },
  {
    slug: 'bestday',
    brand_name: 'BestDay',
    legal_name: 'Best Day Travel Group, S.A. de C.V.',
    category: 'Aerolíneas y travel online',
    domain: 'bestday.com.mx',
    description: 'Agencia de viajes online mexicana especializada en paquetes todo incluido, hoteles de playa, traslados y circuitos turísticos.'
  },

  // ---------------------------------------------------------------------------
  // 9. Logística y paquetería
  // ---------------------------------------------------------------------------
  {
    slug: 'estafeta',
    brand_name: 'Estafeta',
    legal_name: 'Estafeta Mexicana, S.A. de C.V.',
    category: 'Logística y paquetería',
    domain: 'estafeta.com',
    description: 'Empresa mexicana de logística y mensajería con cobertura nacional, servicios terrestres, aéreos exprés y soluciones para comercio electrónico.'
  },
  {
    slug: 'dhl-mexico',
    brand_name: 'DHL Express México',
    legal_name: 'DHL Express México, S.A. de C.V.',
    category: 'Logística y paquetería',
    domain: 'dhl.com',
    description: 'Compañía global de mensajería exprés y logística en México con red aérea propia, puntos de servicio y envíos internacionales garantizados.'
  },
  {
    slug: 'fedex-mexico',
    brand_name: 'FedEx México',
    legal_name: 'Federal Express Holdings México y Compañía, S.N.C. de C.V.',
    category: 'Logística y paquetería',
    domain: 'fedex.com',
    description: 'Empresa global de envíos de paquetes, carga aérea y transporte terrestre en México con rastreo en tiempo real y red de sucursales.'
  },
  {
    slug: 'paquetexpress',
    brand_name: 'Paquetexpress',
    legal_name: 'Paquetexpress, S.A. de C.V.',
    category: 'Logística y paquetería',
    domain: 'paquetexpress.com.mx',
    description: 'Empresa mexicana de transporte y logística integral de paquetería ligera y carga con cobertura en todo el territorio nacional.'
  },
  {
    slug: 'redpack',
    brand_name: 'Redpack',
    legal_name: 'Redpack, S.A. de C.V.',
    category: 'Logística y paquetería',
    domain: 'redpack.com.mx',
    description: 'Empresa mexicana de mensajería, paquetería y logística de última milla con centros operativos en todo el país; filial de Grupo Traxión.'
  },
  {
    slug: 'transportes-castores',
    brand_name: 'Castores',
    legal_name: 'Transportes Castores de Baja California, S.A. de C.V.',
    category: 'Logística y paquetería',
    domain: 'castores.com.mx',
    description: 'Líder en autotransporte de carga consolidada, paquetería pesada y mudanzas nacionales con flotilla de tractocamiones propia en México.'
  },
  {
    slug: 'tres-guerras',
    brand_name: 'Tresguerras',
    legal_name: 'Autotransportes de Carga Tresguerras, S.A. de C.V.',
    category: 'Logística y paquetería',
    domain: 'tresguerras.com.mx',
    description: 'Empresa mexicana de paquetería y carga con más de 100 sucursales en todo el país y entregas puerta a puerta para empresas y particulares.'
  },
  {
    slug: 'jt-express-mexico',
    brand_name: 'J&T Express México',
    legal_name: 'J&T Express México, S.A. de C.V.',
    category: 'Logística y paquetería',
    domain: 'jtexpress.mx',
    description: 'Compañía global de envíos express y paquetería con fuerte enfoque en entrega de compras de plataformas de comercio electrónico en México.'
  },
  {
    slug: 'ups-mexico',
    brand_name: 'UPS México',
    legal_name: 'United Parcel Service de México, S.A. de C.V.',
    category: 'Logística y paquetería',
    domain: 'ups.com',
    description: 'Empresa internacional de logística y transporte de paquetes con servicios para comercio exterior, agentes aduanales y distribución nacional.'
  },

  // ---------------------------------------------------------------------------
  // 10. Telecomunicaciones e internet
  // ---------------------------------------------------------------------------
  {
    slug: 'telcel',
    brand_name: 'Telcel',
    legal_name: 'Radiomóvil Dipsa, S.A. de C.V.',
    category: 'Telecomunicaciones e internet',
    domain: 'telcel.com',
    description: 'El mayor operador de telefonía móvil de México (América Móvil): planes prepago Amigo, pospago, red 5G y cobertura en más del 90% de la población.'
  },
  {
    slug: 'telmex',
    brand_name: 'Telmex / Infinitum',
    legal_name: 'Teléfonos de México, S.A.B. de C.V.',
    category: 'Telecomunicaciones e internet',
    domain: 'telmex.com',
    description: 'Proveedor principal de internet de fibra óptica (Infinitum) y telefonía fija en México, con soluciones residenciales y empresariales.'
  },
  {
    slug: 'totalplay',
    brand_name: 'Totalplay',
    legal_name: 'Total Play Telecomunicaciones, S.A.P.I. de C.V.',
    category: 'Telecomunicaciones e internet',
    domain: 'totalplay.com.mx',
    description: 'Empresa mexicana de Grupo Salinas proveedora de internet de alta velocidad por fibra óptica directa al hogar, televisión interactiva y telefonía.'
  },
  {
    slug: 'izzi',
    brand_name: 'izzi telecom',
    legal_name: 'Empresas Cablevisión, S.A.B. de C.V. / izzi Telecom',
    category: 'Telecomunicaciones e internet',
    domain: 'izzi.mx',
    description: 'Compañía de telecomunicaciones de Grupo Televisa con paquetes de internet de banda ancha, televisión por cable, telefonía fija y móvil izzi móvil.'
  },
  {
    slug: 'megacable',
    brand_name: 'Megacable',
    legal_name: 'Megacable Comunicaciones, S.A.B. de C.V.',
    category: 'Telecomunicaciones e internet',
    domain: 'megacable.com.mx',
    description: 'Empresa mexicana de telecomunicaciones con presencia en más de 30 estados con internet de fibra óptica simétrica y televisión digital.'
  },
  {
    slug: 'bait',
    brand_name: 'Bait',
    legal_name: 'Bodega Aurrera Internet y Telefonía / Walmart México',
    category: 'Telecomunicaciones e internet',
    domain: 'mibait.com',
    description: 'Operador móvil virtual (OMV) de Walmart de México que ofrece paquetes de internet y telefonía móvil de bajo costo a través de la Red Compartida.'
  },
  {
    slug: 'virgin-mobile-mexico',
    brand_name: 'Virgin Mobile México',
    legal_name: 'Virgin Mobile México, S. de R.L. de C.V.',
    category: 'Telecomunicaciones e internet',
    domain: 'virginmobile.mx',
    description: 'Operador móvil virtual en México enfocado en planes de telefonía móvil prepago sin contratos ni plazos forzosos.'
  },
  {
    slug: 'starlink-mexico',
    brand_name: 'Starlink México',
    legal_name: 'Starlink Satellite Systems México, S. de R.L. de C.V.',
    category: 'Telecomunicaciones e internet',
    domain: 'starlink.com',
    description: 'Servicio de internet satelital de alta velocidad y baja latencia operado por SpaceX con cobertura en zonas rurales y urbanas de México.'
  },
  {
    slug: 'sky-mexico',
    brand_name: 'Sky México',
    legal_name: 'Innovación Móvil / Corporación Novavisión, S. de R.L. de C.V.',
    category: 'Telecomunicaciones e internet',
    domain: 'sky.com.mx',
    description: 'Proveedor mexicano de televisión de paga satelital DTH, transmisiones deportivas en exclusiva e internet doméstico inalámbrico (Blue Telecomm).'
  },

  // ---------------------------------------------------------------------------
  // 11. Farmacias, salud y diagnóstico
  // ---------------------------------------------------------------------------
  {
    slug: 'farmacias-del-ahorro',
    brand_name: 'Farmacias del Ahorro',
    legal_name: 'Comercializadora Farmacéutica de Chiapas, S.A.P.I. de C.V.',
    category: 'Farmacias, salud y diagnóstico',
    domain: 'fahorro.com',
    description: 'Una de las mayores cadenas de farmacias de México con venta en línea, envíos a domicilio sin costo, consultorios médicos adyacentes y Monedero del Ahorro.'
  },
  {
    slug: 'farmacias-san-pablo',
    brand_name: 'Farmacias San Pablo',
    legal_name: 'Farmacia San Pablo, S.A. de C.V.',
    category: 'Farmacias, salud y diagnóstico',
    domain: 'farmaciasanpablo.com.mx',
    description: 'Cadena de farmacias reconocida por su amplio surtido de medicamentos de patente, dermocosmética, ortopedia y entrega a domicilio express.'
  },
  {
    slug: 'farmacias-benavides',
    brand_name: 'Farmacias Benavides',
    legal_name: 'Farmacias Benavides, S.A.B. de C.V.',
    category: 'Farmacias, salud y diagnóstico',
    domain: 'benavides.com.mx',
    description: 'Cadena farmacéutica mexicana con más de un siglo de historia, consultorios de orientación médica y presencia destacada en el norte y centro del país.'
  },
  {
    slug: 'farmacias-guadalajara',
    brand_name: 'Farmacias Guadalajara',
    legal_name: 'Corporativo Fragua, S.A.B. de C.V.',
    category: 'Farmacias, salud y diagnóstico',
    domain: 'farmaciasguadalajara.com',
    description: 'Cadena mexicana bajo el concepto de Superfarmacia: medicamentos, alimentos, fotografía, hogar y servicios financieros las 24 horas.'
  },
  {
    slug: 'farmacias-similares',
    brand_name: 'Farmacias Similares',
    legal_name: 'Farmacias Similares, S.A. de C.V.',
    category: 'Farmacias, salud y diagnóstico',
    domain: 'farmaciassimilares.com',
    description: 'La mayor cadena de farmacias de medicamentos genéricos en México y América Latina, con miles de consultorios médicos comunitarios.'
  },
  {
    slug: 'laboratorio-chopo',
    brand_name: 'Laboratorio Médico del Chopo',
    legal_name: 'Laboratorio Médico Polanco / Diagnóstico Médico Especializado Chopo, S.A. de C.V.',
    category: 'Farmacias, salud y diagnóstico',
    domain: 'chopo.com.mx',
    description: 'Red nacional líder de laboratorios de análisis clínicos, resonancias, tomografías, rayos X y estudios de medicina preventiva en México.'
  },
  {
    slug: 'salud-digna',
    brand_name: 'Salud Digna',
    legal_name: 'Salud Digna I.A.P.',
    category: 'Farmacias, salud y diagnóstico',
    domain: 'salud-digna.org',
    description: 'Institución de asistencia privada con más de 180 clínicas en México que ofrece análisis de laboratorio, lentes, mastografías y ultrasonidos a precios solidarios.'
  },
  {
    slug: 'laboratorios-polanco',
    brand_name: 'Laboratorios Médicos Polanco',
    legal_name: 'Laboratorio Médico Polanco, S.A. de C.V.',
    category: 'Farmacias, salud y diagnóstico',
    domain: 'laboratoriopolanco.com',
    description: 'Cadena de laboratorios de análisis clínicos y gabinete con acreditaciones de calidad y sucursales en la zona metropolitana de la CDMX y estados.'
  },

  // ---------------------------------------------------------------------------
  // 12. Electrónica, cómputo y gadgets
  // ---------------------------------------------------------------------------
  {
    slug: 'cyberpuerta',
    brand_name: 'CyberPuerta',
    legal_name: 'Cyberpuerta, S.A. de C.V.',
    category: 'Electrónica, cómputo y gadgets',
    domain: 'cyberpuerta.mx',
    description: 'Tienda en línea líder en México para la compra de componentes de PC, computadoras, servidores, periféricos y accesorios de tecnología.'
  },
  {
    slug: 'pcel',
    brand_name: 'PCel',
    legal_name: 'PCel, S.A. de C.V.',
    category: 'Electrónica, cómputo y gadgets',
    domain: 'pcel.com',
    description: 'Comercio mexicano especializado en componentes de hardware, tarjetas gráficas, procesadores y laptops con tienda física y portal en línea.'
  },
  {
    slug: 'intercompras',
    brand_name: 'Intercompras',
    legal_name: 'Intercompras Comercio Digital, S.A. de C.V.',
    category: 'Electrónica, cómputo y gadgets',
    domain: 'intercompras.com',
    description: 'Tienda de comercio electrónico mexicana de computación, redes, impresión y suministros de oficina para consumidores y empresas.'
  },
  {
    slug: 'steren',
    brand_name: 'Steren',
    legal_name: 'Electrónica Steren, S.A. de C.V.',
    category: 'Electrónica, cómputo y gadgets',
    domain: 'steren.com.mx',
    description: 'Líder mexicano en comercialización de productos y accesorios de electrónica, audio, cables, conectores, proyectos escolares y domótica.'
  },
  {
    slug: 'radioshack-mexico',
    brand_name: 'RadioShack México',
    legal_name: 'RadioShack de México, S.A. de C.V.',
    category: 'Electrónica, cómputo y gadgets',
    domain: 'radioshack.com.mx',
    description: 'Cadena de tiendas de electrónica de consumo, gadgets, telefonía y audio perteneciente a Grupo Gigante en México.'
  },

  // ---------------------------------------------------------------------------
  // 13. Hogar, muebles, colchones y diseño
  // ---------------------------------------------------------------------------
  {
    slug: 'gaia-design',
    brand_name: 'GAIA Design',
    legal_name: 'Gaia Design, S.A.P.I. de C.V.',
    category: 'Hogar, muebles y colchones',
    domain: 'gaiadesign.com.mx',
    description: 'Marca mexicana de diseño de mobiliario contemporáneo, accesorios para el hogar y decoración de interiores con tiendas y portal en línea.'
  },
  {
    slug: 'colchones-wendy',
    brand_name: 'Colchones Wendy',
    legal_name: 'Colchones Wendy, S.A. de C.V.',
    category: 'Hogar, muebles y colchones',
    domain: 'wendy.com.mx',
    description: 'Fabricante de colchones y sistemas para el descanso con más de 70 años de presencia en los hogares mexicanos.'
  },
  {
    slug: 'colchones-emma',
    brand_name: 'Emma Colchones México',
    legal_name: 'Emma Sleep GmbH / Emma México',
    category: 'Hogar, muebles y colchones',
    domain: 'emma-colchon.com.mx',
    description: 'Marca internacional de colchones en caja tipo memory foam, bases de cama y almohadas ergonómicas con 100 noches de prueba.'
  },
  {
    slug: 'muebles-alameda',
    brand_name: 'Alameda',
    legal_name: 'Alameda Muebles, S.A. de C.V.',
    category: 'Hogar, muebles y colchones',
    domain: 'alameda.mx',
    description: 'Tienda en línea de muebles de diseño para salas, comedores, recámaras y home office con envíos a la República Mexicana.'
  },
  {
    slug: 'muebles-dico',
    brand_name: 'Muebles Dico',
    legal_name: 'Dico, S.A. de C.V.',
    category: 'Hogar, muebles y colchones',
    domain: 'dico.com.mx',
    description: 'Cadena de mueblerías más grande de México con opciones accesibles para salas, recámaras, comedores y colchones.'
  },
  {
    slug: 'sodimac-mexico',
    brand_name: 'Sodimac México',
    legal_name: 'Sodimac México, S.A. de C.V.',
    category: 'Hogar, muebles y colchones',
    domain: 'sodimac.com.mx',
    description: 'Cadena de tiendas de mejoramiento del hogar, remodelación, herramientas y materiales de construcción en alianza con Organización Soriana.'
  },
  {
    slug: 'home-depot-mexico',
    brand_name: 'The Home Depot México',
    legal_name: 'The Home Depot México, S. de R.L. de C.V.',
    category: 'Hogar, muebles y colchones',
    domain: 'homedepot.com.mx',
    description: 'Cadena líder de productos para la construcción, remodelación, pintura, jardinería, electrodomésticos y ferretería en México.'
  },

  // ---------------------------------------------------------------------------
  // 14. Belleza, moda y calzado
  // ---------------------------------------------------------------------------
  {
    slug: 'ben-and-frank',
    brand_name: 'Ben & Frank',
    legal_name: 'Ben & Frank Eyewear, S.A.P.I. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'benandfrank.com',
    description: 'Marca mexicana de lentes oftálmicos y de sol directo al consumidor con diseño propio, examen de la vista y tiendas físicas en México.'
  },
  {
    slug: 'flexi',
    brand_name: 'Flexi',
    legal_name: 'Calzado Flexi, S.A. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'flexi.com.mx',
    description: 'Marca mexicana de calzado cómodo y formal fabricado en León, Guanajuato, con tiendas propias y distribución nacional.'
  },
  {
    slug: 'andrea',
    brand_name: 'Andrea',
    legal_name: 'Fábricas de Calzado Andrea, S.A. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'andrea.com',
    description: 'Empresa mexicana líder en venta por catálogo y comercio electrónico de calzado, indumentaria, belleza y accesorios.'
  },
  {
    slug: 'charly',
    brand_name: 'Charly',
    legal_name: 'Grupo Charly, S.A. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'charly.com',
    description: 'Marca mexicana de calzado atlético, tenis urbanos e indumentaria deportiva patrocinadora oficial de múltiples clubes del fútbol nacional.'
  },
  {
    slug: 'cuidado-con-el-perro',
    brand_name: 'Cuidado con el Perro',
    legal_name: 'Cuidado con el Perro, S.A. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'cuidadoconelperro.com.mx',
    description: 'Marca mexicana de ropa urbana, juvenil y calzado con cientos de tiendas físicas y venta en línea a precios muy competitivos.'
  },
  {
    slug: 'price-shoes',
    brand_name: 'Price Shoes',
    legal_name: 'Price Shoes de México, S.A. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'priceshoes.com',
    description: 'Compañía mexicana de venta de calzado, ropa y accesorios mediante clubes de membresía, catálogo y macrotiendas físicas.'
  },
  {
    slug: 'innova-sport',
    brand_name: 'Innovasport',
    legal_name: 'Innovasport, S.A. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'innovasport.com',
    description: 'Cadena de tiendas especializada en calzado deportivo, jerseys oficiales, equipamiento de running y entrenamiento atlético en México.'
  },
  {
    slug: 'marti',
    brand_name: 'Martí',
    legal_name: 'Deportes Martí, S.A. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'marti.mx',
    description: 'Cadena mexicana de tiendas deportivas con equipo fitness, raquetas, calzado especializado y accesorios para atletas de alto rendimiento.'
  },
  {
    slug: 'c-and-a-mexico',
    brand_name: 'C&A México',
    legal_name: 'C&A México, S. de R.L. de C.V.',
    category: 'Belleza, moda y calzado',
    domain: 'cyamoda.com',
    description: 'Cadena de moda con colecciones casuales de denim, ropa para damas, caballeros y niños en México.'
  },

  // ---------------------------------------------------------------------------
  // 15. Gimnasios, fitness y deportes
  // ---------------------------------------------------------------------------
  {
    slug: 'smart-fit',
    brand_name: 'Smart Fit México',
    legal_name: 'Smart Fit de México, S.A.P.I. de C.V.',
    category: 'Gimnasios, fitness y deportes',
    domain: 'smartfit.com.mx',
    description: 'La mayor cadena de gimnasios de bajo costo en México y América Latina con planes Black y Smart en cientos de unidades.'
  },
  {
    slug: 'sports-world',
    brand_name: 'Sports World',
    legal_name: 'Operadora de Centros Deportivos Sports World, S.A.B. de C.V.',
    category: 'Gimnasios, fitness y deportes',
    domain: 'sportsworld.com.mx',
    description: 'Clubes deportivos familiares y gimnasios en México con alberca, áreas de peso integrado, clases grupales y entrenamiento funcional.'
  },
  {
    slug: 'anytime-fitness',
    brand_name: 'Anytime Fitness México',
    legal_name: 'Anytime Fitness México, S.A. de C.V.',
    category: 'Gimnasios, fitness y deportes',
    domain: 'anytimefitness.com.mx',
    description: 'Franquicia de gimnasios con acceso las 24 horas del día los 365 días del año con llave de acceso global y entrenadores personales.'
  },
  {
    slug: 'energy-fitness',
    brand_name: 'Energy Fitness México',
    legal_name: 'Energy Fitness México, S.A. de C.V.',
    category: 'Gimnasios, fitness y deportes',
    domain: 'energyfitness.com.mx',
    description: 'Cadena de clubes de acondicionamiento físico con instalaciones premium, clases de ciclismo bajo techo, box y bienestar.'
  },

  // ---------------------------------------------------------------------------
  // 16. Restaurantes, comida y cafeterías
  // ---------------------------------------------------------------------------
  {
    slug: 'caffenio',
    brand_name: 'CAFFENIO',
    legal_name: 'Servicios Corporativos Caffenio, S.A. de C.V.',
    category: 'Restaurantes, comida y cafeterías',
    domain: 'caffenio.com',
    description: 'Empresa mexicana cafetera originaria de Sonora con drive-thru express, café de altura, bebidas frías, repostería y lealtad digital.'
  },
  {
    slug: 'starbucks-mexico',
    brand_name: 'Starbucks México',
    legal_name: 'Café Sirena, S. de R.L. de C.V. (Grupo Alsea)',
    category: 'Restaurantes, comida y cafeterías',
    domain: 'starbucks.com.mx',
    description: 'Cadena de cafeterías operada en México por Alsea con más de 750 sucursales, bebidas artesanales y programa Starbucks Rewards.'
  },
  {
    slug: 'dominos-pizza-mexico',
    brand_name: "Domino's Pizza México",
    legal_name: 'Operadora de Franquicias Alsea, S.A.P.I. de C.V.',
    category: 'Restaurantes, comida y cafeterías',
    domain: 'dominos.com.mx',
    description: 'Cadena de pizzerías con servicio a domicilio garantizado en 30 minutos, seguimiento de pedidos Tracker y mostrador en todo México.'
  },
  {
    slug: 'vips',
    brand_name: 'Vips',
    legal_name: 'Operadora Vips, S. de R.L. de C.V. (Grupo Alsea)',
    category: 'Restaurantes, comida y cafeterías',
    domain: 'vips.com.mx',
    description: 'Cadena tradicional de restaurantes familiares en México famosa por sus caldos, desayunos completos, enchiladas suizas y panadería dulce.'
  },
  {
    slug: 'toks',
    brand_name: 'Toks',
    legal_name: 'Restaurantes Toks, S.A. de C.V. (Grupo Gigante)',
    category: 'Restaurantes, comida y cafeterías',
    domain: 'toks.com.mx',
    description: 'Cadena mexicana de restaurantes familiares con menú tradicional, café orgánico de proyectos productivos comunitarios y platillos de autor.'
  },
  {
    slug: 'chilis-mexico',
    brand_name: "Chili's México",
    legal_name: 'Gastrosur, S.A.P.I. de C.V. (Grupo Alsea)',
    category: 'Restaurantes, comida y cafeterías',
    domain: 'chilis.com.mx',
    description: 'Cadena de comida casual tex-mex en México con costillas baby back, hamburguesas a la parrilla, alitas y margaritas clásicas.'
  },
  {
    slug: 'little-caesars-mexico',
    brand_name: 'Little Caesars México',
    legal_name: 'Little Caesars Pizza / Caesar Entregas de México, S.A. de C.V.',
    category: 'Restaurantes, comida y cafeterías',
    domain: 'littlecaesars.com',
    description: 'Cadena internacional de pizzerías con modelo Hot-N-Ready de pizzas calientes para llevar al instante a precios de alta accesibilidad.'
  },

  // ---------------------------------------------------------------------------
  // 17. Automotriz, refacciones y movilidad de vehículos
  // ---------------------------------------------------------------------------
  {
    slug: 'kavak',
    brand_name: 'Kavak',
    legal_name: 'Uvi México, S.A.P.I. de C.V.',
    category: 'Automotriz, autopartes y llantas',
    domain: 'kavak.com',
    description: 'Plataforma líder en compra, reacondicionamiento, venta y financiamiento de autos seminuevos inspeccionados con garantía mecánica en México.'
  },
  {
    slug: 'auto-zone-mexico',
    brand_name: 'AutoZone México',
    legal_name: 'AutoZone de México, S. de R.L. de C.V.',
    category: 'Automotriz, autopartes y llantas',
    domain: 'autozone.com.mx',
    description: 'Cadena líder de venta de refacciones automotrices, aceites, baterías, herramientas de préstamo y diagnóstico gratuito de escáner automotriz.'
  },
  {
    slug: 'michelin-mexico',
    brand_name: 'Michelin México',
    legal_name: 'Industrias Michelin, S.A. de C.V.',
    category: 'Automotriz, autopartes y llantas',
    domain: 'michelin.com.mx',
    description: 'Fabricante global de llantas con centros de servicio de alineación, balanceo, frenos y suspensión en toda la República Mexicana.'
  },
  {
    slug: 'bridgestone-mexico',
    brand_name: 'Bridgestone México',
    legal_name: 'Bridgestone de México, S.A. de C.V.',
    category: 'Automotriz, autopartes y llantas',
    domain: 'bridgestone.com.mx',
    description: 'Empresa fabricante de neumáticos y soluciones avanzadas de movilidad con red de talleres y llanteras autorizadas en México.'
  },

  // ---------------------------------------------------------------------------
  // 18. Entretenimiento, cines y apuestas deportivas
  // ---------------------------------------------------------------------------
  {
    slug: 'cinepolis',
    brand_name: 'Cinépolis',
    legal_name: 'Cinépolis de México, S.A. de C.V.',
    category: 'Entretenimiento, cines y apuestas',
    domain: 'cinepolis.com',
    description: 'Empresa mexicana líder en exhibición cinematográfica mundial con salas tradicionales, VIP, 4DX, Macro XE y venta de boletos por app móvil.'
  },
  {
    slug: 'cinemex',
    brand_name: 'Cinemex',
    legal_name: 'Operadora de Cinemas, S.A. de C.V.',
    category: 'Entretenimiento, cines y apuestas',
    domain: 'cinemex.com',
    description: 'Cadena mexicana de salas de cine con conceptos Platino, Premium, Tradicional, dulcería gourmet y programa Invitado Especial.'
  },
  {
    slug: 'caliente',
    brand_name: 'Caliente',
    legal_name: 'Tecnología en Entretenimiento Caliplay, S. de R.L. de C.V.',
    category: 'Entretenimiento, cines y apuestas',
    domain: 'caliente.mx',
    description: 'La mayor casa mexicana de apuestas deportivas, casino en línea y juegos de azar con permiso oficial otorgado por la Secretaría de Gobernación.'
  },
  {
    slug: 'winpot',
    brand_name: 'Winpot',
    legal_name: 'Buen Mazal del Norte, S.A. de C.V.',
    category: 'Entretenimiento, cines y apuestas',
    domain: 'winpot.mx',
    description: 'Operador mexicano de casino digital, slots y apuestas deportivas regulado bajo permiso federal de la Dirección General de Juegos y Sorteos.'
  }
];

export async function seedDirectory() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const f of MASTER_FICHAS) {
      const res = await client.query(
        `INSERT INTO businesses (
           slug, brand_name, legal_name, category, description, domain, logo_url,
           operating_area, claimed, verified_level, trust_score,
           confidence_level, coverage_percentage, observed_orders_count,
           invited_orders_count, issues_per_thousand, resolution_rate,
           median_response_hours, reopen_rate, effective_reviews_count
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,'public_info',0,'preliminary',0,0,0,0,0,0,0,0)
         ON CONFLICT (slug) DO UPDATE SET
           brand_name = EXCLUDED.brand_name,
           legal_name = COALESCE(businesses.legal_name, EXCLUDED.legal_name),
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           domain = EXCLUDED.domain,
           logo_url = EXCLUDED.logo_url,
           operating_area = EXCLUDED.operating_area,
           updated_at = NOW()
         WHERE businesses.verified_level = 'public_info' AND businesses.trust_score = 0
         RETURNING (xmax = 0) AS did_insert`,
        [
          f.slug,
          f.brand_name,
          f.legal_name || null,
          f.category,
          f.description,
          f.domain,
          `/logos/${f.slug}.png`,
          f.operating_area || 'Nacional (México)'
        ]
      );

      if (res.rows.length === 0) {
        skipped++;
      } else if (res.rows[0].did_insert) {
        inserted++;
        console.log(`  ➕ Inserted: ${f.brand_name} (${f.slug})`);
      } else {
        updated++;
        console.log(`  🔄 Updated: ${f.brand_name} (${f.slug})`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Finished: ${inserted} inserted, ${updated} updated, ${skipped} skipped (retained existing claimed/verified). Total master catalogue: ${MASTER_FICHAS.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding directory:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('seed-directory-scale')) {
  seedDirectory().then(() => process.exit(0)).catch(() => process.exit(1));
}
