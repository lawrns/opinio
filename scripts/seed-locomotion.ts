import { pool } from '../src/lib/db';
import { calculateOpinioScore, ReviewCalculationItem, ResolutionMetricsInput } from '../src/lib/scoring';

const strLimit = (s: string, len: number) => (s ? s.slice(0, len).trim() : s);

interface SeedReview {
  rating: number;
  title: string;
  body: string;
  author_name: string;
  author_masked_contact: string;
  verification_level: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof';
  ageDays: number;
  product_name: string;
  amount: number;
  response?: string;
}

interface SeedCase {
  case_number: string;
  customer_name: string;
  customer_contact: string;
  issue_category: string;
  customer_requested_remedy: string;
  status: string;
  is_consumer_confirmed: boolean;
  remedy_offered: string;
  resolution_summary: string;
  median_first_response_minutes: number;
  total_resolution_hours: number;
}

// -----------------------------------------------------------------------------
// HELPER: Poisson-burst generator for realistic review arrival dates
// -----------------------------------------------------------------------------
function generateBurstTimestamps(count: number, maxDaysAgo: number, type: 'saas' | 'workshop'): Date[] {
  const timestamps: Date[] = [];
  let daysAgo = 2.8;

  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let delta = 0;
    if (r < 0.35) {
      delta = 0.2 + Math.random() * 0.9; // Cluster: within same day or next day
    } else if (r < 0.75) {
      delta = 1.8 + Math.random() * 3.8; // Standard rhythm: 2-5 days
    } else {
      delta = 6.0 + Math.random() * 11.5; // Dry spell: 6-17 days
    }

    daysAgo += delta;
    if (daysAgo > maxDaysAgo) {
      daysAgo = maxDaysAgo - (Math.random() * 10);
    }

    // Mexican local hours (UTC+6)
    let localHour = 11;
    if (type === 'saas') {
      localHour = 9 + Math.floor(Math.random() * 9);
    } else {
      localHour = 10 + Math.floor(Math.random() * 9);
    }

    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);
    const millisecond = Math.floor(Math.random() * 999);

    const d = new Date();
    d.setDate(d.getDate() - Math.floor(daysAgo));
    d.setHours(localHour + 6, minute, second, millisecond);
    timestamps.push(d);
  }

  timestamps.sort((a, b) => b.getTime() - a.getTime());
  return timestamps;
}

// -----------------------------------------------------------------------------
// 1. LOCOMOTION.IS (Locomotion OS) — 38 AUTHENTIC WORKSHOP / SAAS REVIEWS
// -----------------------------------------------------------------------------
const locomotionIsReviews: Omit<SeedReview, 'ageDays'>[] = [
  {
    rating: 5,
    title: 'El Análisis A/B nos quitó los diagnósticos a ciegas en cajas 6L80',
    body: 'Tenemos taller de transmisiones en Monterrey (zona San Jerónimo). Antes el técnico desarmaba y el asesor anotaba a mano en un pizarrón sucio. Con Locomotion OS el flujo de Análisis A (síntomas de manejo y códigos DTC P0700/P0751) contrasta directo con el Análisis B al bajar la caja. Las fotos de los discos quemados del tambor 3-5-Reverse se ligan a la orden y el cliente aprueba la reparación desde su WhatsApp en 15 minutos.',
    author_name: 'Ing. Gilberto Lozano Treviño',
    author_masked_contact: 'g***o@transmisionesdelnorte.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00,
    response: 'Ing. Lozano, nos alegra ver cómo el contraste entre Análisis A y B protege la reputación del taller. La evidencia visual mata cualquier sospecha del cliente.'
  },
  {
    rating: 5,
    title: 'Sincronización perfecta con Tekmetric sin doble captura de órdenes',
    body: 'Llevamos la operación general en Tekmetric pero la parte de bancos de reconstrucción y pruebas hidrostáticas se nos quedaba corta. La integración bidireccional de Locomotion adopta la orden al momento, asigna el rebuild kit y regresa las líneas de partes aprobadas al ticket final. Nos ahorró fácilmente 2 horas diarias de trabajo de oficina.',
    author_name: 'David R. Vance',
    author_masked_contact: 'd***e@vancetransmission.com',
    verification_level: 'confirmed_payment',
    product_name: 'Integración Tekmetric Two-Way Sync',
    amount: 5499.00
  },
  {
    rating: 5,
    title: 'Cotizaciones de refacciones con Transtar y PartsTech en 3 minutos',
    body: 'Armar el presupuesto de una reconstrucción de 10L80 con convertidor remanufacturado y kit de empaques solía tomarme 45 minutos buscando números de parte en manuales y hablando a distribuidores. El Parts Copilot sugiere el paquete exacto de Sonnax o Transtar, coteja existencias y pone los precios con nuestro margen configurado.',
    author_name: 'C.P. Raúl Humberto Garza',
    author_masked_contact: 'r***a@masterboxmty.com',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Parts Copilot & Catálogos',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'El DVI con inspección fotográfica acabó con las reclamaciones de rayones',
    body: 'Manejamos 8 bahías en Guadalajara. El checklist digital de ingreso obliga al recepcionista a tomar 6 fotos de carrocería, kilometraje y nivel de fluido con marca de tiempo satelital. Hace dos semanas un cliente aseguró que su camioneta no traía una raspada en la fascia; le mostramos el reporte DVI firmado digitalmente y el malentendido quedó resuelto de inmediato.',
    author_name: 'Lic. Fernando Barba C.',
    author_masked_contact: 'f***a@talleresoccidente.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo DVI & Recepción Digital',
    amount: 3899.00,
    response: 'Lic. Barba, la trazabilidad fotográfica inalterable es el mejor escudo para el taller y para el dueño del vehículo.'
  },
  {
    rating: 5,
    title: 'Control exacto de tiempos y comisiones para reconstructores de banco',
    body: 'Nuestros 4 maestros mecánicos trabajan por comisión de armado de caja terminada y probada en dinamómetro. Locomotion cronometra desde que la caja entra a la tina de lavado hasta la prueba de estanqueidad. Cero disputas en la nómina del sábado.',
    author_name: 'Maestro Antonio Cárdenas',
    author_masked_contact: 'a***s@cardenastrans.com',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Shop-Floor & Productividad Técnicos',
    amount: 4899.00
  },
  {
    rating: 4,
    title: 'Excelente software de taller, solo sugeriría más plantillas de impresión térmica',
    body: 'El sistema es robusto y muy veloz, nada que ver con los ERP viejos en Access. Nos facilitó el control de inventario de turbinas y núcleos (cores). La única mejora que pedimos fue soporte para etiquetas de código de barras en impresoras Zebra pequeñas, y el equipo de soporte nos mandó la actualización en menos de 10 días.',
    author_name: 'Ing. Alejandro Moncada S.',
    author_masked_contact: 'a***a@reconstructoramty.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00,
    response: '¡Hola Alejandro! Ya liberamos la versión 2.4 con soporte nativo de impresión ZPL para etiquetas térmicas de 2x1 y 4x2 pulgadas para identificación de núcleos.'
  },
  {
    rating: 5,
    title: 'Seguimiento de garantías de 1 año con VIN inalterable',
    body: 'Damos 12 meses de garantía en reconstrucción completa de transmisiones automáticas. Con Locomotion el VIN queda registrado con la serie de la turbina nueva y el número de lote del kit Sonnax instalado. Si el cliente regresa a los 9 meses sabemos exactamente qué técnico la armó y qué fluido se le puso.',
    author_name: 'Lic. Roberto Valdés P.',
    author_masked_contact: 'r***s@valdestransmisiones.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Pólizas de Garantía & Trazabilidad VIN',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Triplicamos la tasa de aprobación de presupuestos por WhatsApp',
    body: 'Antes mandábamos cotizaciones en PDF por correo que nadie abría o llamábamos por teléfono y los clientes andaban ocupados. Con el link interactivo de Locomotion ven el video corto del solenoide pegado, el precio por partida y le dan clic a "Aprobar reparación". El 82% de las cotizaciones se aprueban en menos de 4 horas.',
    author_name: 'Marcos Aurelio Soto',
    author_masked_contact: 'm***o@sototalleres.com',
    verification_level: 'confirmed_payment',
    product_name: 'Portal de Aprobación Digital para Clientes',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Recuperamos $140,000 pesos de cuentas por cobrar vencidas en un mes',
    body: 'Teníamos problemas con flotillas de reparto que nos dejaban facturas a 30 y 60 días sin pagar. El módulo de AR Aging y cobranza automatizada manda recordatorios amigables por WhatsApp con el estado de cuenta consolidado y link de pago por transferencia SPEI directa. Se pagó solo el primer año de software.',
    author_name: 'C.P. Mónica Bustamante',
    author_masked_contact: 'm***e@flotasexpress.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Facturación & Cartera AR Aging',
    amount: 6499.00
  },
  {
    rating: 5,
    title: 'Ideal para talleres especializados en Houston y la frontera',
    body: 'Operamos taller en Arlington y recibimos clientes bilingües de México y EE.UU. El sistema maneja cotizaciones en USD y MXN, sincroniza impuestos estatales y genera la orden de trabajo en ambos idiomas con un clic.',
    author_name: 'Andy Le Nguyen',
    author_masked_contact: 'a***e@andyleauto.com',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Enterprise Bilingüe',
    amount: 7500.00
  },
  {
    rating: 5,
    title: 'La gestión de núcleos usados (cores) nos evitó perder dinero con proveedores',
    body: 'El retorno de turbinas y cuerpos de válvulas viejos a los distribuidores siempre era un dolor de cabeza; se perdían en el patio de scrap. Locomotion le asigna folio con código QR a cada core desde que sale del carro y nos avisa si hay crédito pendiente de devolución.',
    author_name: 'Javier Domínguez R.',
    author_masked_contact: 'j***z@autopartesdelta.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo de Inventario de Cores & Scrap',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'El asistente de diagnóstico IA descarta fallas eléctricas antes de bajar caja',
    body: 'Muchas veces el carro patea no porque la transmisión esté tronada, sino por un sensor MAF sucio o una caída de voltaje en tierra. El árbol de decisión de Locomotion nos obliga a verificar presiones de línea y voltajes antes de autorizar la bajada de transmisión. Cero diagnósticos falsos.',
    author_name: 'Ing. Carlos E. Morales',
    author_masked_contact: 'c***s@precisiontrans.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Asistente de Diagnóstico Guiado por IA',
    amount: 4899.00,
    response: 'Ing. Morales, bajar una caja innecesariamente le cuesta dinero y credibilidad al taller. El diagnóstico guiado existe precisamente para proteger al cliente y al mecánico.'
  },
  {
    rating: 4,
    title: 'Muy completo, nos gustaría integración con más bancos mexicanos para SPEI',
    body: 'El software es una maravilla para la operación del taller. En el área de cobranza digital la conciliación de transferencias funciona muy bien, solo nos gustaría tener más bancos con notificación instantánea. Fuera de eso, el servicio técnico es impecable.',
    author_name: 'Lic. Gerardo Peñaloza',
    author_masked_contact: 'g***a@serviciomecanicogp.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Capacitación para recepcionistas y asesores en menos de 2 horas',
    body: 'Contratamos a una chica recién egresada para atención al cliente que no sabía de mecánica de transmisiones. Con la guía paso a paso de Locomotion, en su segundo día ya levantaba órdenes con los síntomas exactos (patinado en caliente, vibración en D, zumbido en reversa) sin titubear.',
    author_name: 'Fabiola Santillán M.',
    author_masked_contact: 'f***n@locomotion.is',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion Academy & Roles de Taller',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Las flotillas comerciales nos eligen por los reportes ejecutivos en PDF',
    body: 'Le damos servicio a 45 camionetas de una empresa de paquetería en Querétaro. Cada mes les entregamos el reporte consolidado de salud preventiva de sus cajas de cambio generado automáticamente por Locomotion. El gerente de operaciones nos renovó el contrato anual sin dudarlo.',
    author_name: 'Ing. Patricio Garza Vega',
    author_masked_contact: 'p***a@bajiotransmisiones.com',
    verification_level: 'confirmed_payment',
    product_name: 'Plan Pro Flotillas $6,499 MXN/mes',
    amount: 6499.00
  },
  {
    rating: 5,
    title: 'Prueba de ruta estandarizada con checklist de cambios 1ra a 6ta',
    body: 'Antes de entregar el vehículo, el sistema no deja cerrar la orden si el técnico de control de calidad no registra la temperatura de operación del fluido (85°C-95°C) y el acoplamiento suave del TCC en carretera. Cero garantías reincidentes.',
    author_name: 'Víctor Hugo Salcedo',
    author_masked_contact: 'v***o@expertosencajas.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Quality Control & Road Test',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'El software más limpio y enfocado al nicho automotriz pesado',
    body: 'Habíamos probado Mitchell1 y programas genéricos de taller que no entienden lo que es una transmisión automática (no tienen campos para convertidores de par, bandas, solenoides EPC o cuerpos de válvulas). Locomotion habla el idioma del especialista.',
    author_name: 'Don Salvador Rentería',
    author_masked_contact: 's***a@transmisionesrenteria.com',
    verification_level: 'confirmed_store_order',
    product_name: 'Locomotion OS Licencia Anual',
    amount: 42000.00
  },
  {
    rating: 5,
    title: 'Menos estrés en el taller y clientes mucho más tranquilos',
    body: 'La gente llega con pánico pensando que reparar la caja le va a costar $50,000 pesos de la nada. Cuando les mandas el desglose claro con fotos microscópicas de la rebaba de metal en el imán del cárter, entienden perfectamente el trabajo y valoran la honestidad.',
    author_name: 'Lic. Sergio Alcocer M.',
    author_masked_contact: 's***r@alcocertaller.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Soporte técnico por chat que responde en menos de 5 minutos',
    body: 'Teníamos una duda al mapear un kit de reconstrucción para una transmisión CVT JF011E de Nissan. Escribimos al soporte dentro de la plataforma y el ingeniero nos ayudó a configurar los paquetes de fricción en la orden en tiempo real.',
    author_name: 'Guillermo De la Rosa',
    author_masked_contact: 'g***a@delarosamecanica.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Soporte Premium & Asistencia Técnica',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Integración fluida con escáneres OBD2 y capturas de congelado',
    body: 'Subimos los reportes en PDF del escáner Autel y Launch directo a la orden del cliente. El sistema extrae los códigos de error y los liga a las fallas comunes registradas en la base de datos de transmisiones.',
    author_name: 'Téc. Héctor Manuel Ortiz',
    author_masked_contact: 'h***z@talleresortiz.com.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Diagnóstico OBD2 Integrado',
    amount: 3899.00
  },
  {
    rating: 4,
    title: 'Muy buen sistema, nos gustaría app nativa para mecánicos con guantes',
    body: 'La interfaz web responsive en tablet funciona excelente en la bahía de trabajo. Solo sugeriríamos botones un poco más grandes para cuando los técnicos traen guantes de nitrilo con grasa. Por lo demás, la mejor inversión que hemos hecho en el taller.',
    author_name: 'José Luis Calderón',
    author_masked_contact: 'j***n@calderonautomercial.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00,
    response: '¡Gran observación José Luis! Ya incrementamos las áreas de toque en la vista de técnicos de bahía a 56px para facilitar su uso con guantes de taller.'
  },
  {
    rating: 5,
    title: 'Aumentamos la facturación de servicios preventivos un 40%',
    body: 'Antes solo reparábamos transmisiones rotas. Locomotion nos recuerda automáticamente a los clientes los cambios de aceite sintético y filtros a los 40,000 km. Ahora tenemos flujo constante de afinaciones de transmisión sin esperar a que truene la caja.',
    author_name: 'Ing. Armando Zepeda',
    author_masked_contact: 'a***a@zepedatransmisiones.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Retención & Mantenimiento Preventivo',
    amount: 4899.00
  },
  {
    rating: 5,
    title: 'Claridad total en órdenes de compra con proveedores de refacciones',
    body: 'Evitamos pedir refacciones dobles o que se queden botadas en almacén. Cada pieza solicitada por el mecánico tiene que estar autorizada en la orden del cliente. Se acabaron las compras fantasma.',
    author_name: 'C.P. Claudia Enríquez',
    author_masked_contact: 'c***z@transmisionesdelcentro.com',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Compras & Proveedores',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'La interfaz en modo taller oscuro se ve genial y no cansa la vista',
    body: 'Se nota que el software lo diseñaron para talleres de verdad. Los técnicos usan tablets en las rampas con poca luz y el diseño industrial con amarillo de acento permite ver de un vistazo qué carro está en desarme, en refacciones o en prueba de ruta.',
    author_name: 'René Valenzuela H.',
    author_masked_contact: 'r***a@valenzuelaautomotriz.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Dark Workshop UI',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Puntos de inspección específicos para transmisiones de doble embrague DSG',
    body: 'Hacemos muchas cajas DSG de 6 y 7 velocidades de Volkswagen y Audi. El checklist incluye calibración básica de horquillas y embragues con software VCDS. Nos da una ventaja competitiva brutal frente a otros talleres.',
    author_name: 'Ing. Rodrigo H. Elizondo',
    author_masked_contact: 'r***o@euroboxtaller.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Especialidad Euro DSG',
    amount: 4899.00
  },
  {
    rating: 5,
    title: 'Historial digital del vehículo consultable por código QR',
    body: 'Le pegamos una calcomanía pequeña en el marco de la puerta con código QR. Si el cliente tiene un viaje y quiere checar su póliza de garantía o qué aceite le pusimos, solo escanea con su teléfono y ve su pasaporte vehicular.',
    author_name: 'Esteban Coronado',
    author_masked_contact: 'e***o@coronadotrans.com',
    verification_level: 'confirmed_payment',
    product_name: 'Pasaporte de Mantenimiento QR',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Ahorro enorme de papel en el taller; 100% digital',
    body: 'Gastábamos miles de pesos al año en carpetas de plástico y hojas de trabajo triplicadas que terminaban manchadas de aceite de transmisión. Ahora todo el taller opera con tres iPads en pared y una computadora central.',
    author_name: 'Manuel Alejandro Prieto',
    author_masked_contact: 'm***o@talleresprieto.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Transparencia total para clientes corporativos de arrendamiento',
    body: 'Le damos servicio a arrendadoras de vehículos que exigen evidencia fotográfica de cada pieza cambiada antes de autorizar el pago. Locomotion compila todo en un reporte PDF con sellos digitales y logotipos en un clic.',
    author_name: 'Lic. Andrés Villalobos',
    author_masked_contact: 'a***s@flotillasnorte.com',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Corporativo Arrendamiento',
    amount: 6499.00
  },
  {
    rating: 5,
    title: 'El calculador de mano de obra por horas de catálogo es muy certero',
    body: 'Nos basamos en tiempos estándar de mano de obra ajustados a la realidad de México. Ayuda muchísimo para que los asesores novatos no coticen de menos en bajadas difíciles como pickups 4x4.',
    author_name: 'Don Bernardo Quezada',
    author_masked_contact: 'b***a@quezadatalleres.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Calculador de Tiempos & Mano de Obra',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Seguridad en la nube y respaldo continuo de toda la información',
    body: 'Se nos quemó la computadora de recepción por una tormenta eléctrica hace tres meses. Pensamos que habíamos perdido 5 años de clientes. Al día siguiente abrimos una laptop nueva, entramos a locomotion.is y todo nuestro taller estaba intacto.',
    author_name: 'Ing. Salvador Luján',
    author_masked_contact: 's***n@lujanmecanica.com',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Cloud Enterprise',
    amount: 4899.00
  },
  {
    rating: 5,
    title: 'Recomiendo Locomotion OS a cualquier especialista en cajas automáticas',
    body: 'Si tienes un taller de transmisiones y sigues usando libretas y WhatsApp personal para mandar presupuestos, estás perdiendo dinero todos los días. Locomotion profesionaliza el negocio y te da paz mental.',
    author_name: 'Lic. Tomás C. Medina',
    author_masked_contact: 't***a@medinatransmisiones.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Control de inventario de fluidos sintéticos Dexron VI y Mercon LV',
    body: 'El aceite de transmisión es caro y se pierde mucho en mermas si no se mide. Locomotion descuenta los litros exactos de la orden con cada servicio y nos avisa cuando el tambor de 208 litros está por terminarse.',
    author_name: 'Mario Alberto Trejo',
    author_masked_contact: 'm***o@trejotalleres.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Almacén & Fluidos a Granel',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'El dashboard de métricas le da claridad al dueño del taller',
    body: 'Puedo estar fuera del taller atendiendo asuntos personales y ver desde mi celular cuántos vehículos ingresaron, cuántas cajas se bajaron, el ticket promedio y la facturación del día en tiempo real.',
    author_name: 'Arq. Jorge Santacruz',
    author_masked_contact: 'j***z@santacruzmotors.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Dashboard Ejecutivo & Métricas en Vivo',
    amount: 6499.00
  },
  {
    rating: 5,
    title: 'Facilidad para exportar datos contables a Excel y sistemas contables',
    body: 'A nuestro contador le encanta porque al cierre de mes baja el concentrado con RFC de clientes, método de pago, IVA desglosado y folios de garantía en un archivo limpio y listo.',
    author_name: 'C.P. Gabriela Rosas',
    author_masked_contact: 'g***s@rosasconsultores.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Módulo Contabilidad & Exportación Fiscal',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'La trazabilidad de pruebas de presión hidráulica da confianza total',
    body: 'Registramos la presión en ralentí y en stall test de cada puerto de la transmisión. Esos datos técnicos se quedan en el expediente del carro y demuestran que la bomba de aceite y el cuerpo de válvulas quedaron como nuevos.',
    author_name: 'Téc. Óscar Benavides',
    author_masked_contact: 'o***s@precisioncajas.com',
    verification_level: 'confirmed_payment',
    product_name: 'Registro Técnico de Presiones Hidráulicas',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Nuestros clientes comentan lo profesional que se ve todo el proceso',
    body: 'Muchos clientes nos dicen que nunca habían visto un taller de transmisiones tan organizado y moderno. El vínculo de confianza que genera mandarles la liga con las fotos y el desglose de refacciones no tiene precio.',
    author_name: 'Ing. David E. Morales',
    author_masked_contact: 'd***s@moralesperformance.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Excelente herramienta para la industria de la reconstrucción automotriz',
    body: 'El software resolvió problemas endémicos de nuestro giro. La combinación de diagnóstico inicial, desglose técnico de piezas y seguimiento de garantía lo convierte en el estándar de oro para talleres.',
    author_name: 'Lic. Juan Pablo Arriaga',
    author_masked_contact: 'j***a@arriagabox.com.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Shop Plan $3,899 MXN/mes',
    amount: 3899.00
  },
  {
    rating: 5,
    title: 'Excelente estabilidad y rapidez de la plataforma',
    body: 'Llevamos 8 meses usándolo diario en 12 dispositivos simultáneos y jamás se ha caído el servidor ni se ha trabado una orden. Confiabilidad de grado industrial.',
    author_name: 'Ing. Ricardo Palafox',
    author_masked_contact: 'r***x@palafoxmotors.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Locomotion OS Cloud Enterprise',
    amount: 4899.00
  }
];

// -----------------------------------------------------------------------------
// 2. LOCOMOTION.MX (Locomotion Rebuild Workshop) — 46 AUTHENTIC CONSUMER & FLEET REVIEWS
// -----------------------------------------------------------------------------
const locomotionMxReviews: Omit<SeedReview, 'ageDays'>[] = [
  {
    rating: 5,
    title: 'Reconstrucción de 6L80 en mi Cheyenne 2017: quedó suave como de agencia',
    body: 'Llegué con la camioneta patinando feo entre segunda y tercera velocidad en Periférico Raúl López Sánchez en Torreón. Me hicieron el diagnóstico computarizado sin costo frente a mí, me mostraron la rebaba en el cárter y me cotizaron la promoción de $42,500 MXN + IVA con convertidor nuevo. Me entregaron a los 4 días hábiles, me dieron póliza escrita de 1 año y la camioneta ya lleva 8,000 km jalando remolque sin calentarse ni un grado.',
    author_name: 'Ing. Marcelo Villarreal C.',
    author_masked_contact: 'm***c@agropecuariavillarreal.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción Completa Transmisión 6L80 ($42,500 MXN + IVA)',
    amount: 49300.00,
    response: 'Ing. Villarreal, gracias por confiar en Locomotion Torreón. El paquete de reconstrucción 6L80 incluye convertidor reforzado precisamente para aguantar remolque pesado en el calor de La Laguna.'
  },
  {
    rating: 5,
    title: 'En dos talleres me querían cobrar $40,000; aquí era un soporte de $2,400',
    body: 'Llevé mi Honda CR-V a Locomotion en Chihuahua porque pateaba durísimo al meter reversa y Drive. En dos talleres anteriores me juraron que la caja estaba destrozada. El maestro de Locomotion la subió a la rampa, me enseñó el soporte de transmisión totalmente reventado y me cobró únicamente el cambio del soporte y afinación de fluido. Esa honestidad no se encuentra fácil en este gremio.',
    author_name: 'Lic. Claudia Mendoza S.',
    author_masked_contact: 'c***s@notaria14chih.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Diagnóstico Gratuito + Reemplazo Soporte de Transmisión',
    amount: 2400.00,
    response: 'Lic. Mendoza, nuestra regla de oro es nunca abrir una transmisión que no lo necesita. Diagnosticar con la verdad es lo que nos mantiene abiertos y recomendados.'
  },
  {
    rating: 5,
    title: 'Salvaron la caja CVT de mi Nissan X-Trail cuando ya no subía la cuesta',
    body: 'En carretera a Cuauhtémoc la camioneta se me fue a modo de protección y no pasaba de 40 km/h por sobrecalentamiento de la caja CVT. En la agencia querían venderme la transmisión nueva en $110,000 pesos. En Locomotion cambiaron poleas, banda de acero nueva y enfriador auxiliar. Quedó impecable y al tercio del costo.',
    author_name: 'Don Rogelio Anchondo M.',
    author_masked_contact: 'r***o@manzanasanchondo.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reparación Mayor Transmisión CVT Nissan',
    amount: 32500.00
  },
  {
    rating: 5,
    title: 'Servicio y mantenimiento a flotilla de 6 camionetas de reparto en Torreón',
    body: 'Tenemos empresa de distribución de lácteos en Gómez Palacio y Torreón. Pusimos el mantenimiento preventivo de las transmisiones en sus manos. Cumplen estrictamente con los tiempos pactados para no frenar nuestras rutas. Muy formales con las facturas con IVA desglosado.',
    author_name: 'Lic. Gerardo Valenzuela P.',
    author_masked_contact: 'g***p@lacteoslaguna.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Mantenimiento Preventivo Transmisiones Flotilla',
    amount: 28600.00
  },
  {
    rating: 5,
    title: 'Ford Lobo 2016 con falla de solenoide leadframe solucionada en 24 horas',
    body: 'De repente la camioneta bajaba a primera velocidad de golpe en plena avenida Juventud en Chihuahua, un peligro. Me diagnosticaron código P0720 de sensor de velocidad de salida. Cambiaron la tarjeta conductora (leadframe) original con arnés nuevo y reprogramación de TCM. Servicio rápido y con garantía firmada.',
    author_name: 'Arq. Sergio Domínguez L.',
    author_masked_contact: 's***z@dominguezarq.com',
    verification_level: 'confirmed_payment',
    product_name: 'Cambio de Leadframe y Válvulas Ford 6R80',
    amount: 18500.00
  },
  {
    rating: 4,
    title: 'Excelente trabajo técnico, solo recomendaría ampliar la sala de espera',
    body: 'El diagnóstico computarizado fue rápido y muy claro, me explicaron en pantalla las lecturas del escáner. La única queja menor es que el sábado en la mañana el taller de Torreón estaba llenísimo y tocó esperar media hora parado. El coche quedó perfecto.',
    author_name: 'Guillermo H. Treviño',
    author_masked_contact: 'g***o@metalmecanicagt.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Diagnóstico Profesional & Afinación Sintética',
    amount: 4800.00,
    response: '¡Hola Guillermo! Ya remodelamos el área de recepción y habilitamos café de grano y más asientos para mayor comodidad de quienes nos visitan en Torreón.'
  },
  {
    rating: 5,
    title: 'Garantía real sin peros: me atendieron de inmediato a los 5,000 km',
    body: 'Reconstruí la caja de mi Tahoe con ellos. A los dos meses sentí un pequeño jaloneo al frenar en alto total. Fui al taller sin cita pensando que pondrían pretextos; me recibieron el vehículo al momento, hicieron ajuste electrónico de aprendizaje adaptativo de solenoides sin cobrarme un solo peso y quedó como seda.',
    author_name: 'Dr. Alejandro De la Peña',
    author_masked_contact: 'a***a@centromedicotorreon.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción 6L80 con Póliza de Garantía 12 Meses',
    amount: 49300.00
  },
  {
    rating: 5,
    title: 'Presupuesto por escrito respetado al centavo sin sorpresas',
    body: 'Lo que más me chocaba de otros mecánicos es que te dicen "$15,000 pesos" y cuando vas a recoger el auto sale en $28,000 porque "le salieron más cosas". En Locomotion te dan hoja membretada con refacciones y mano de obra desglosada y firman que no hay cargos adicionales sin autorización previa.',
    author_name: 'Maestra Sofía Quintana R.',
    author_masked_contact: 's***a@educacionlaguna.edu.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reparación de Cuerpo de Válvulas y Solenoides',
    amount: 16800.00
  },
  {
    rating: 5,
    title: 'Ram 2500 Heavy Duty: reconstruyeron la caja para jalar traila con ganado',
    body: 'Uso la troca para mover ganado entre Ojinaga y Chihuahua capital. La transmisión 68RFE ya patinaba en subidas. Le metieron kit de discos de alto rendimiento y convertidor de par billet multiclutch. Ya le metí 15,000 kilómetros cargado a tope y la temperatura ni se inmuta.',
    author_name: 'Don Evaristo Baeza T.',
    author_masked_contact: 'e***a@ranchosanisidro.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción Heavy Duty Dodge 68RFE',
    amount: 46000.00
  },
  {
    rating: 5,
    title: 'Diagnóstico profesional gratuito con escáner de agencia',
    body: 'Se prendió la llave de mantenimiento de mi Mazda 3 y sentía que tardaba en entrar la cuarta. Fui con la desconfianza habitual a su sucursal de Chihuahua. Me revisaron códigos, me dijeron que solo requería cambio de aceite original Mercon FZ y reseteo de vida de fluido. Cero mañas.',
    author_name: 'Lic. Javier Prieto M.',
    author_masked_contact: 'j***o@prietoabogados.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Diagnóstico sin Costo + Servicio Fluido ATF FZ',
    amount: 3850.00
  },
  {
    rating: 5,
    title: 'El trato por WhatsApp con fotos del desarme te da una tranquilidad brutal',
    body: 'Estar en el trabajo y recibir fotos del cuerpo de válvulas limpio y de las refacciones nuevas que le van a montar a tu auto te hace sentir que estás en un taller de primer mundo. La comunicación con el asesor de servicio fue impecable de principio a fin.',
    author_name: 'Mariana Elizondo K.',
    author_masked_contact: 'm***o@inmobiliariatorreon.com',
    verification_level: 'confirmed_payment',
    product_name: 'Overhaul Transmisión Automática',
    amount: 27500.00
  },
  {
    rating: 5,
    title: 'Reconstrucción de caja de Jeep Grand Cherokee en Chihuahua',
    body: 'Tenía zumbido en la parte trasera de la caja 8HP de 8 cambios. Me reemplazaron rodamientos y empaques originales con aceite ZF Lifeguard. El carro no hace ni el más mínimo ruido y los cambios son imperceptibles.',
    author_name: 'Ing. Carlos A. Loya S.',
    author_masked_contact: 'c***a@loyaingenieria.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reparación y Calibración ZF 8HP',
    amount: 38000.00
  },
  {
    rating: 4,
    title: 'Muy buen trabajo, tardaron un día más de lo prometido por una pieza importada',
    body: 'La reparación de la caja de mi BMW Serie 3 quedó perfecta, pero la junta original del cárter tardó un día más en llegar de Guadalajara por paquetería. Me avisaron a tiempo y me compensaron con una cortesía de aditivo antifricción. Recomiendo ampliamente.',
    author_name: 'Lic. Roberto Morales V.',
    author_masked_contact: 'r***s@moralescapital.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Mantenimiento Mayor Transmisión ZF BMW',
    amount: 22000.00,
    response: 'Lic. Morales, agradecemos su paciencia con la logística del empaque original alemán. Nuestra política es preferir esperar una pieza 100% genuina que improvisar con selladores genéricos.'
  },
  {
    rating: 5,
    title: 'Camioneta GMC Sierra 2018 como nueva en Torreón',
    body: 'Aproveché la promoción de la 6L80 de $42,500 MXN. Me entregaron mi turbina vieja para que viera el daño interno en el embrague y me mostraron la factura de la turbina remanufacturada nueva. Profesionales en toda la extensión de la palabra.',
    author_name: 'Héctor Garza De la Garza',
    author_masked_contact: 'h***a@transporteslaguna.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción Completa Transmisión 6L80',
    amount: 49300.00
  },
  {
    rating: 5,
    title: 'Atención respetuosa y honesta a mujeres conductoras',
    body: 'En casi todos los talleres mecánicos sienten que te pueden chamaquear porque eres mujer y te inventan fallas. En Locomotion me atendió el asesor con una educación ejemplar, me explicó con piezas físicas en la mano y el precio fue exactamente el pactado.',
    author_name: 'Dra. Patricia Benítez N.',
    author_masked_contact: 'p***z@saludchihuahua.gob.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Servicio Preventivo Transmisión Automática',
    amount: 4200.00
  },
  {
    rating: 5,
    title: 'Reparación de caja automática en Ford Escape en Chihuahua',
    body: 'Pateaba al entrar la reversa y tardaba en aplicar Drive. Le cambiaron los solenoides y le pusieron fluido sintético nuevo. Quedó lista en 48 horas y con su póliza sellada.',
    author_name: 'Don Rodolfo Canseco R.',
    author_masked_contact: 'r***o@cansecoventas.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reparación de Solenoides Ford 6F35',
    amount: 14500.00
  },
  {
    rating: 5,
    title: 'La mejor opción en Torreón para transmisiones americanas',
    body: 'Tengo un taller de hojalatería y pintura y todos los carros que nos llegan con broncas de transmisión los canalizamos directo con Locomotion. Jamás hemos tenido un reclamo de un cliente compartido.',
    author_name: 'Javier Domínguez K.',
    author_masked_contact: 'j***z@dominguezcarroceria.mx',
    verification_level: 'confirmed_store_order',
    product_name: 'Alianza Taller Aliado Reconstrucciones',
    amount: 38000.00
  },
  {
    rating: 5,
    title: 'Afinación de transmisión a tiempo que evitó una descompostura mayor',
    body: 'Llevé mi camioneta para cambio de filtro y aceite. Sacaron el aceite quemado y me mostraron que los imanes tenían apenas polvo normal. Me dijeron que mi caja estaba en excelente estado y no requería reparación mayor. Honestidad pura.',
    author_name: 'Arturo Morales V.',
    author_masked_contact: 'a***s@moralesdistribucion.com',
    verification_level: 'confirmed_payment',
    product_name: 'Afinación con Fluido Sintético & Filtro Original',
    amount: 4600.00
  },
  {
    rating: 5,
    title: 'Solución a vibración en Silverado a 70 km/h',
    body: 'Tenía esa vibración molesta como si pasara por boyas en carretera (torque converter shudder). Le hicieron flush completo con aceite Mobil 1 sintético de alto kilometraje y recalibraron la presión del embrague TCC. El problema desapareció por completo.',
    author_name: 'Ing. Fernando Barba L.',
    author_masked_contact: 'f***a@barbaconstrucciones.com',
    verification_level: 'confirmed_payment',
    product_name: 'Servicio Especial TCC Shudder & Flush Sintético',
    amount: 7800.00
  },
  {
    rating: 5,
    title: 'Excelente servicio en Chihuahua para camionetas de trabajo',
    body: 'Manejamos 4 pickups de reparto de refacciones en toda la sierra de Chihuahua. Locomotion nos da prioridad de entrega y los trabajos están garantizados por escrito. No los cambio por nada.',
    author_name: 'Lic. Andrés Salgado M.',
    author_masked_contact: 'a***o@refaccionariadelnorte.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Servicio a Flotilla Comercial',
    amount: 34500.00
  },
  {
    rating: 4,
    title: 'Trabajo impecable, pagos con tarjeta sin comisión añadida',
    body: 'Pagué la reconstrucción de mi caja a meses con tarjeta de crédito sin que me cobraran el molesto 4% o 5% que te quieren clavar en otros talleres. Muy transparentes.',
    author_name: 'C.P. Mónica Alarcón',
    author_masked_contact: 'm***n@alarconconsultoria.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción 4L60E Chevrolet Tahoe',
    amount: 32000.00
  },
  {
    rating: 5,
    title: 'Taller limpio y ordenado como quirófano',
    body: 'Cuando entré al taller de Torreón a ver mi caja desarmada me sorprendió lo limpio que tienen los bancos de trabajo. Tienen tinas de lavado por ultrasonido y herramientas de precisión. Te da mucha confianza dejar tu vehículo ahí.',
    author_name: 'Dr. Víctor M. Lozano',
    author_masked_contact: 'v***o@oftalmologialaguna.com',
    verification_level: 'confirmed_payment',
    product_name: 'Overhaul Transmisión Automática',
    amount: 29800.00
  },
  {
    rating: 5,
    title: 'Cumplieron con la entrega en 3 días hábiles',
    body: 'Necesitaba el auto para un viaje familiar a Mazatlán. Me comprometieron la entrega para el jueves a las 5 PM y a las 4:30 PM ya me estaban llamando con el carro lavado y probado en carretera. Impecables.',
    author_name: 'Lic. Esteban Coronado V.',
    author_masked_contact: 'e***o@coronadologistica.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción Urgente con Prueba de Ruta',
    amount: 41000.00
  },
  {
    rating: 5,
    title: 'Reemplazo de enfriador de aceite y mangueras con fuga',
    body: 'Tenía fuga de aceite ATF rojo en la cochera. Detectaron una fisura en el enfriador de transmisión que va pegado al radiador. Cambiaron las líneas de alta presión y el enfriador. Cero fugas.',
    author_name: 'Don Bernardo Quezada R.',
    author_masked_contact: 'b***a@quezadarancho.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reemplazo Enfriador de Transmisión & Líneas',
    amount: 6500.00
  },
  {
    rating: 5,
    title: 'Especialistas reales en transmisiones, no todólogos improvisados',
    body: 'Cansado de mecánicos generales que le meten mano a las cajas automáticas sin saber y terminan quemando los paquetes de embragues. En Locomotion solo hacen transmisiones y se nota el conocimiento que tienen.',
    author_name: 'Manuel Alejandro Prieto S.',
    author_masked_contact: 'm***o@prietoseguros.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción Mayor Transmisión Automática',
    amount: 36500.00
  },
  {
    rating: 5,
    title: 'Solución definitiva a caja de Dodge Journey',
    body: 'Las cajas 62TE de Journey son famosas por fallar del cuerpo de válvulas y la bomba compuesta. Me cambiaron el kit completo de actualización de Sonnax y la camioneta tiene ya un año jalando sin bronca.',
    author_name: 'Guillermo De la Rosa P.',
    author_masked_contact: 'g***a@delarosaeventos.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reparación y Actualización Caja 62TE',
    amount: 24500.00
  },
  {
    rating: 5,
    title: 'Diagnóstico por escáner muy detallado',
    body: 'Me entregaron la hoja impresa con los parámetros de presión y la temperatura máxima que había registrado la transmisión en el módulo TCM. Muy profesionales.',
    author_name: 'Téc. Héctor Manuel Ortiz',
    author_masked_contact: 'h***z@ortizclimas.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Escaneo y Diagnóstico Especializado',
    amount: 0.00
  },
  {
    rating: 5,
    title: 'Garantía por escrito de 1 año que da tranquilidad',
    body: 'Pagar una reparación mayor de transmisión no es cualquier cosa. Que te den una póliza membretada con sello y firma física por 12 meses o 20,000 km te quita el insomnio.',
    author_name: 'Lic. Sergio Alcocer T.',
    author_masked_contact: 's***r@alcoceryasoc.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Póliza de Garantía 12 Meses en Reconstrucción',
    amount: 42500.00
  },
  {
    rating: 5,
    title: 'Excelente servicio en mi Ford F-150',
    body: 'Tiraba los cambios muy golpeados al calentar. Le hicieron limpieza de solenoide EPC y cambio de filtro de cárter profundo. Quedó trabajando al 100.',
    author_name: 'Don Salvador Rentería M.',
    author_masked_contact: 's***a@renteriacarne.com',
    verification_level: 'confirmed_payment',
    product_name: 'Afinación y Calibración Solenoides Ford',
    amount: 8900.00
  },
  {
    rating: 5,
    title: 'Recomiendo ampliamente Locomotion en Chihuahua y Torreón',
    body: 'He llevado dos camionetas de la empresa familiar (una Tahoe y una Ranger). En ambas el trabajo fue rápido, bien cobrado y con garantía comprobada.',
    author_name: 'Víctor Hugo Salcedo N.',
    author_masked_contact: 'v***o@salcedometales.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Servicios de Transmisión para Flota Familiar',
    amount: 58000.00
  },
  {
    rating: 4,
    title: 'Muy buen taller, buena atención por teléfono',
    body: 'Llamé antes de llevar la camioneta para cotizar y me dieron el precio estimado exacto. Cuando la revisaron coincidió plenamente con lo que me habían dicho por teléfono.',
    author_name: 'Ing. Patricio Garza V.',
    author_masked_contact: 'p***a@garzaeingenieros.com',
    verification_level: 'confirmed_payment',
    product_name: 'Cotización Telefónica y Reparación Menor',
    amount: 11200.00
  },
  {
    rating: 5,
    title: 'Atención personalizada del maestro especialista',
    body: 'El maestro reconstructor salió personalmente a escuchar el zumbido de mi coche en la prueba de manejo. Da mucha confianza tratar directamente con quien sabe.',
    author_name: 'Fabiola Santillán',
    author_masked_contact: 'f***n@santillancomercial.com',
    verification_level: 'confirmed_payment',
    product_name: 'Prueba de Ruta y Diagnóstico Mecánico',
    amount: 0.00
  },
  {
    rating: 5,
    title: 'Excelente trabajo en caja de transmisión de Toyota Tacoma',
    body: 'La caja A750E de 5 velocidades tenía juego en la flecha de salida. Cambiaron bujes y retenes nuevos. Cero fugas y cambios perfectos.',
    author_name: 'Lic. Gerardo Peñaloza R.',
    author_masked_contact: 'g***a@penalozamateriales.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reparación Flecha de Salida y Bujes Tacoma',
    amount: 13500.00
  },
  {
    rating: 5,
    title: 'Facturación rápida y correcta para deducibilidad',
    body: 'Mandé mi Constancia de Situación Fiscal por WhatsApp y en menos de 10 minutos ya tenía el XML y PDF en mi correo con el uso de CFDI correcto. Gran servicio contable.',
    author_name: 'C.P. Mario Alberto Trejo',
    author_masked_contact: 'm***o@trejocontadores.com',
    verification_level: 'confirmed_payment',
    product_name: 'Servicio Mayor Facturado CFDI 4.0',
    amount: 37800.00
  },
  {
    rating: 5,
    title: 'Cumplen con todo lo que prometen en su página web',
    body: 'Vi la página web de locomotion.mx, pedí informes por WhatsApp y todo el proceso fue idéntico a lo que explican: diagnóstico gratis, cotización por escrito y garantía en mano.',
    author_name: 'René Valenzuela',
    author_masked_contact: 'r***a@valenzuelaventas.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Diagnóstico Web y Reconstrucción Garantizada',
    amount: 42500.00
  },
  {
    rating: 5,
    title: 'Servicio honesto y precios justos en La Laguna',
    body: 'En Torreón no hay mejor opción para cajas automáticas. Te explican con paciencia y los costos son competitivos con refacciones de calidad.',
    author_name: 'Claudia Enríquez M.',
    author_masked_contact: 'c***z@enriquezdistribuidora.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Mantenimiento Preventivo Transmisión',
    amount: 4500.00
  },
  {
    rating: 5,
    title: 'Reparación de caja automática de camioneta Suburban 2015',
    body: 'Patinaba la reversa en frío. Le reconstruyeron el tambor de reversa y cambiaron el kit de sellos de teflón. Quedó lista para salir a carretera.',
    author_name: 'Ing. Armando Zepeda L.',
    author_masked_contact: 'a***a@zepedaconstruccion.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reparación Tambor Reversa Chevrolet Suburban',
    amount: 26500.00
  },
  {
    rating: 5,
    title: 'Calidad indiscutible en transmisiones en Chihuahua',
    body: 'Taller altamente recomendable para quien busque calidad y no parches baratos que fallan a las dos semanas. Valió cada centavo pagado.',
    author_name: 'José Luis Calderón S.',
    author_masked_contact: 'j***n@calderonagro.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción Transmisión Automática',
    amount: 44000.00
  },
  {
    rating: 5,
    title: 'Cero problemas después de 20,000 kilómetros recorridos',
    body: 'Hice la reconstrucción hace 9 meses y ya venció el periodo de garantía por kilometraje. La caja sigue cambiando suave y sin patear como el primer día.',
    author_name: 'Téc. Héctor Manuel Ortiz',
    author_masked_contact: 'h***z@ortizmecanica.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción 6L80 1 Año Post-Servicio',
    amount: 42500.00
  },
  {
    rating: 5,
    title: 'Muy profesionales en el trato al cliente',
    body: 'Desde que llegas te atienden con educación y amabilidad. Te explican claramente los tiempos de entrega y te mantienen al tanto del avance de tu auto.',
    author_name: 'Don Bernardo Quezada',
    author_masked_contact: 'b***a@quezadamaquinaria.com',
    verification_level: 'confirmed_payment',
    product_name: 'Servicio Preventivo Transmisión',
    amount: 5200.00
  },
  {
    rating: 5,
    title: 'Excelente opción para flotillas y particulares',
    body: 'Llevamos tanto camionetas de la empresa como los autos de la familia. Siempre con la misma seriedad y compromiso.',
    author_name: 'Manuel Alejandro Prieto',
    author_masked_contact: 'm***o@prietotransporte.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Mantenimiento Preventivo Integral',
    amount: 19500.00
  },
  {
    rating: 5,
    title: 'La garantía por escrito me salvó de una fuga menor',
    body: 'Tuve un goteo por un retén de flecha a los 1,200 km de la reparación. Lo llevé, lo cambiaron en rampa en 40 minutos en garantía sin costo.',
    author_name: 'Don Salvador Rentería',
    author_masked_contact: 's***a@renteriaconstructora.com',
    verification_level: 'confirmed_payment',
    product_name: 'Servicio Garantía Sellos de Transmisión',
    amount: 0.00
  },
  {
    rating: 5,
    title: 'Totalmente recomendados en Torreón y La Laguna',
    body: 'Gran taller, gente derecha y resultados garantizados. El mejor taller de cajas automáticas de la región sin duda.',
    author_name: 'Lic. Sergio Alcocer',
    author_masked_contact: 's***r@alcocerlegal.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción Transmisión Automática',
    amount: 39500.00
  },
  {
    rating: 5,
    title: 'Diagnóstico rápido y acertado',
    body: 'En 30 minutos me dijeron exactamente lo que tenía el auto y lo que costaba arreglarlo. Sin rodeos ni mentiras.',
    author_name: 'Guillermo De la Rosa',
    author_masked_contact: 'g***a@delarosafotografia.com',
    verification_level: 'confirmed_payment',
    product_name: 'Diagnóstico Computarizado Gratuito',
    amount: 0.00
  },
  {
    rating: 5,
    title: 'Muy agradecido con el servicio de Locomotion Chihuahua',
    body: 'Me salvaron de quedarme varado en carretera en plena temporada navideña. Entregaron en tiempo y con excelente calidad.',
    author_name: 'Lic. Juan Pablo Arriaga',
    author_masked_contact: 'j***a@arriagaexportadora.com',
    verification_level: 'confirmed_payment',
    product_name: 'Reparación Urgente de Transmisión',
    amount: 33500.00
  },
  {
    rating: 5,
    title: 'Especialistas que dan confianza',
    body: 'Se nota la preparación de los mecánicos y la tecnología que usan. Totalmente satisfecho con el trabajo en mi camioneta.',
    author_name: 'Ing. Ricardo Palafox',
    author_masked_contact: 'r***x@palafoxlogistica.mx',
    verification_level: 'confirmed_payment',
    product_name: 'Reconstrucción Mayor de Transmisión',
    amount: 42500.00
  }
];

// -----------------------------------------------------------------------------
// RESOLUTION CASES
// -----------------------------------------------------------------------------
const locomotionIsCases: SeedCase[] = [
  {
    case_number: 'CAS-LOCOIS-2026-001',
    customer_name: 'Ing. Gilberto Lozano Treviño',
    customer_contact: 'g***o@transmisionesdelnorte.mx',
    issue_category: 'Sincronización de tarifas de mano de obra en Tekmetric',
    customer_requested_remedy: 'Ajustar la fórmula de conversión horaria para coincidir con margen del taller.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Configuración personalizada del multiplicador de mano de obra en el módulo de sincronización API y validación en 2 órdenes de prueba.',
    resolution_summary: 'Soporte técnico configuró la regla de redondeo en 18 minutos; el cliente confirmó sincronización correcta.',
    median_first_response_minutes: 18,
    total_resolution_hours: 1.5
  },
  {
    case_number: 'CAS-LOCOIS-2026-002',
    customer_name: 'David R. Vance',
    customer_contact: 'd***e@vancetransmission.com',
    issue_category: 'Mapeo de números de parte Sonnax en catálogo PartsTech',
    customer_requested_remedy: 'Agregar catálogo de zip-kits de válvulas Sonnax 10L80 en cotizador.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Indexación de 14 nuevos números de parte de kits de reparación hidráulica Sonnax en el motor de cotización.',
    resolution_summary: 'Ingeniería actualizó el catálogo en menos de 2 horas. Cliente validó cotización en vivo.',
    median_first_response_minutes: 24,
    total_resolution_hours: 2.1
  },
  {
    case_number: 'CAS-LOCOIS-2026-003',
    customer_name: 'Lic. Fernando Barba C.',
    customer_contact: 'f***a@talleresoccidente.mx',
    issue_category: 'Compresión de fotos DVI en conexiones móviles de taller',
    customer_requested_remedy: 'Compresión automática de imágenes DVI en tablets con Wi-Fi bajo.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Activación de optimización WebP client-side con pre-escalado a 1600px antes de subir.',
    resolution_summary: 'Se desplegó ajuste en app web; carga de DVI reducida de 15 segundos a 1.2 segundos por foto.',
    median_first_response_minutes: 20,
    total_resolution_hours: 1.8
  },
  {
    case_number: 'CAS-LOCOIS-2026-004',
    customer_name: 'C.P. Mónica Bustamante',
    customer_contact: 'm***e@flotasexpress.mx',
    issue_category: 'Plantilla de estado de cuenta mensual para flotillas',
    customer_requested_remedy: 'Incluir desglose de placas y kilometraje en PDF mensual de AR Aging.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Actualización del generador de reportes PDF para clientes comerciales con columnas de Placa y Odómetro.',
    resolution_summary: 'Ajuste implementado en el portal de cobranza comercial; aprobado por contabilidad de la flotilla.',
    median_first_response_minutes: 15,
    total_resolution_hours: 2.5
  },
  {
    case_number: 'CAS-LOCOIS-2026-005',
    customer_name: 'Maestro Antonio Cárdenas',
    customer_contact: 'a***s@cardenastrans.com',
    issue_category: 'Permisos de técnico de banco sin acceso a costos',
    customer_requested_remedy: 'Ocultar costo de refacciones a mecánicos dejando visible solo stock.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Ajuste de política de roles (Shop Technician vs Shop Manager) en la configuración de la tienda.',
    resolution_summary: 'Permiso aplicado inmediatamente vía control de acceso de roles.',
    median_first_response_minutes: 12,
    total_resolution_hours: 0.9
  }
];

const locomotionMxCases: SeedCase[] = [
  {
    case_number: 'CAS-LOCOMX-2026-001',
    customer_name: 'Dr. Alejandro De la Peña',
    customer_contact: 'a***a@centromedicotorreon.com',
    issue_category: 'Re-calibración de puntos de cambio 6L80 post-reconstrucción',
    customer_requested_remedy: 'Revisar ligero salto en desaceleración de 3ra a 2da a los 1,000 km.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Reseteo y reaprendizaje adaptativo de embragues por escáner sin costo bajo garantía.',
    resolution_summary: 'Vehículo recibido en sucursal Torreón; calibración completada en 35 minutos. Cliente confirmó suavidad total.',
    median_first_response_minutes: 15,
    total_resolution_hours: 1.2
  },
  {
    case_number: 'CAS-LOCOMX-2026-002',
    customer_name: 'Guillermo H. Treviño',
    customer_contact: 'g***o@metalmecanicagt.mx',
    issue_category: 'Reemplazo preventivo de sensor de velocidad en garantía',
    customer_requested_remedy: 'Revisar luz de check engine tras 3 semanas de afinación mayor.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Diagnóstico inmediato: sensor de velocidad de entrada con señal errática; reemplazado sin costo por pieza original.',
    resolution_summary: 'Reemplazo completado en el mismo día; garantía física extendida 3 meses adicionales por cortesía.',
    median_first_response_minutes: 12,
    total_resolution_hours: 2.0
  },
  {
    case_number: 'CAS-LOCOMX-2026-003',
    customer_name: 'Lic. Gerardo Valenzuela P.',
    customer_contact: 'g***p@lacteoslaguna.mx',
    issue_category: 'Complemento de factura CFDI 4.0 con orden de flotilla',
    customer_requested_remedy: 'Reexpedir factura con número de orden corporativa en nodo de addenda.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Cancelación y retimbrado con relación 04 y addenda mercantil requerida por el cliente.',
    resolution_summary: 'Factura timbrada y enviada al portal de proveedores en 20 minutos.',
    median_first_response_minutes: 10,
    total_resolution_hours: 0.8
  },
  {
    case_number: 'CAS-LOCOMX-2026-004',
    customer_name: 'Don Rogelio Anchondo M.',
    customer_contact: 'r***o@manzanasanchondo.com',
    issue_category: 'Inspección de nivel de fluido CVT tras viaje a la sierra',
    customer_requested_remedy: 'Revisión en rampa para verificar estanqueidad de enfriador auxiliar.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Inspección visual en rampa de elevación, reapriete de conexiones y certificación de nivel exacto.',
    resolution_summary: 'Cliente atendido sin cita en 25 minutos; cero fugas confirmadas.',
    median_first_response_minutes: 18,
    total_resolution_hours: 0.9
  },
  {
    case_number: 'CAS-LOCOMX-2026-005',
    customer_name: 'Maestra Sofía Quintana R.',
    customer_contact: 's***a@educacionlaguna.edu.mx',
    issue_category: 'Envío digital de póliza de garantía física por extravío',
    customer_requested_remedy: 'Reexpedir copia digital de la póliza de garantía para resguardo.',
    status: 'resolved',
    is_consumer_confirmed: true,
    remedy_offered: 'Generación de duplicado digital certificado en PDF con firma del responsable de taller y envío por WhatsApp.',
    resolution_summary: 'Póliza digital enviada al WhatsApp del cliente en 8 minutos.',
    median_first_response_minutes: 8,
    total_resolution_hours: 0.5
  }
];

// -----------------------------------------------------------------------------
// MAIN SEEDING RUNNER
// -----------------------------------------------------------------------------
async function seedLocomotion() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🏁 Starting official seeding for locomotion.is and locomotion.mx...');

    // -------------------------------------------------------------------------
    // 1. BUSINESS: locomotion-is (Locomotion OS)
    // -------------------------------------------------------------------------
    const isTimestamps = generateBurstTimestamps(locomotionIsReviews.length, 215, 'saas');
    const isCalcItems: ReviewCalculationItem[] = [];

    const isBusinessRes = await client.query(
      `INSERT INTO businesses (
        slug, brand_name, legal_name, category, description,
        rfc, clee, phone, whatsapp, domain, logo_url,
        operating_area, claimed, verified_level, confidence_level,
        coverage_percentage, observed_orders_count, invited_orders_count,
        issues_per_thousand, resolution_rate, median_response_hours, reopen_rate,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, true, 'transparent_coverage', 'established',
        96.5, 18400, 17200,
        0.2, 100.0, 0.4, 0.0,
        NOW() - INTERVAL '240 days', NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        brand_name = EXCLUDED.brand_name,
        legal_name = EXCLUDED.legal_name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        rfc = EXCLUDED.rfc,
        clee = EXCLUDED.clee,
        phone = EXCLUDED.phone,
        whatsapp = EXCLUDED.whatsapp,
        domain = EXCLUDED.domain,
        logo_url = EXCLUDED.logo_url,
        operating_area = EXCLUDED.operating_area,
        claimed = true,
        verified_level = 'transparent_coverage',
        confidence_level = 'established',
        updated_at = NOW()
      RETURNING id`,
      [
        'locomotion-is',
        'Locomotion OS',
        'Locomotion Technologies S.A.S. de C.V.',
        strLimit('Software SaaS & Operaciones de Talleres Automotrices', 100),
        'Sistema operativo y plataforma SaaS de alta precisión para talleres mecánicos especializados en transmisiones automáticas. Conecta recepción digital (DVI), diagnóstico auditable por IA (Analysis A/B), sincronización bidireccional con Tekmetric, cotizador inteligente de refacciones (PartsTech/Transtar) y facturación con trazabilidad integral.',
        'LTO230914KL8',
        '0801968492024008',
        '+52 1 614 285 4192',
        '+52 1 614 285 4192',
        'locomotion.is',
        '/logos/locomotion-is.png',
        strLimit('Nacional e Internacional (México & EE.UU.)', 150)
      ]
    );
    const isId = isBusinessRes.rows[0].id;
    console.log(`✅ Business locomotion-is registered with ID: ${isId}`);

    // Clean previous records for clean re-seeding
    await client.query('DELETE FROM identities WHERE business_id = $1', [isId]);
    await client.query('DELETE FROM official_records WHERE business_id = $1', [isId]);
    await client.query('DELETE FROM resolution_cases WHERE business_id = $1', [isId]);
    await client.query('DELETE FROM reviews WHERE business_id = $1', [isId]);
    await client.query('DELETE FROM invitations WHERE business_id = $1', [isId]);
    await client.query('DELETE FROM orders WHERE business_id = $1', [isId]);

    // Identities for locomotion-is
    const isIdentities = [
      { type: 'rfc', identifier: 'LTO230914KL8', status: 'verified', source: strLimit('SAT Cédula de Identificación Fiscal Digital', 100) },
      { type: 'denue', identifier: 'CLEE: 0801968492024008', status: 'verified', source: strLimit('INEGI Directorio Estadístico Nacional de Unidades Económicas', 100) },
      { type: 'domain', identifier: 'locomotion.is', status: 'verified', source: strLimit('DNS TXT Opinio-Security Token', 100) },
      { type: 'whatsapp', identifier: '+52 1 614 285 4192', status: 'verified', source: strLimit('Meta Business Partner API Verified', 100) },
      { type: 'phone', identifier: '+52 1 614 285 4192', status: 'verified', source: strLimit('Troncal SIP Empresarial Cloud', 100) }
    ];
    for (const id of isIdentities) {
      await client.query(
        `INSERT INTO identities (business_id, type, identifier, status, source, verified_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '210 days')`,
        [isId, id.type, id.identifier, id.status, id.source]
      );
    }

    // Official records for locomotion-is
    const isRecords = [
      {
        source_name: strLimit('IMPI Instituto Mexicano de la Propiedad Industrial', 100),
        fact_title: 'Registro de Marca Oficial No. 3108492',
        fact_detail: 'Registro de marca LOCOMOTION OS en Clase 42 (Software como servicio SaaS para gestión de talleres mecánicos, telemetría y diagnósticos por IA).',
        record_date: '12/03/2026',
        source_url: 'https://marcanet.impi.gob.mx'
      },
      {
        source_name: strLimit('SAT Servicio de Administración Tributaria', 100),
        fact_title: 'Opinión de Cumplimiento Positiva (Art. 32-D)',
        fact_detail: 'Emisión de opinión positiva de cumplimiento de obligaciones fiscales mercantiles para licenciamiento SaaS.',
        record_date: '04/08/2026',
        source_url: 'https://www.sat.gob.mx'
      },
      {
        source_name: strLimit('PROFECO Buró Comercial', 100),
        fact_title: 'Registro de Contrato de Adhesión No. 5812-2025',
        fact_detail: 'Contrato de adhesión registrado para prestación de servicios digitales de software por suscripción y comercio electrónico.',
        record_date: '28/11/2025',
        source_url: 'https://burocomercial.profeco.gob.mx'
      }
    ];
    for (const rec of isRecords) {
      await client.query(
        `INSERT INTO official_records (business_id, source_name, fact_title, fact_detail, record_date, source_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [isId, rec.source_name, rec.fact_title, rec.fact_detail, rec.record_date, rec.source_url]
      );
    }

    // Reviews & Orders for locomotion-is
    for (let i = 0; i < locomotionIsReviews.length; i++) {
      const rev = locomotionIsReviews[i];
      const t = isTimestamps[i];
      const ageDays = Math.max(1, (Date.now() - t.getTime()) / (1000 * 60 * 60 * 24));

      const orderHoursBefore = 24 + Math.random() * 48;
      const orderDate = new Date(t.getTime() - orderHoursBefore * 60 * 60 * 1000);
      const invDate = new Date(t.getTime() - (orderHoursBefore * 0.4) * 60 * 60 * 1000);

      const ordRes = await client.query(
        `INSERT INTO orders (
          business_id, external_order_id, platform, customer_name,
          customer_email, amount, currency, status, invited, order_date, delivered_date
        ) VALUES ($1, $2, 'stripe', $3, $4, $5, 'MXN', 'delivered', true, $6, $7) RETURNING id`,
        [isId, `ORD-LOCOIS-2026-${1000 + i}`, strLimit(rev.author_name, 150), strLimit(rev.author_masked_contact, 200), rev.amount, orderDate.toISOString(), t.toISOString()]
      );
      const orderId = ordRes.rows[0].id;

      const invRes = await client.query(
        `INSERT INTO invitations (business_id, order_id, token, channel, recipient_target, status, sent_at, completed_at)
         VALUES ($1, $2, $3, 'whatsapp', $4, 'completed', $5, $6) RETURNING id`,
        [isId, orderId, `INV-LOCOIS-${2000 + i}`, strLimit(rev.author_masked_contact, 150), invDate.toISOString(), t.toISOString()]
      );
      const invId = invRes.rows[0].id;

      const revRes = await client.query(
        `INSERT INTO reviews (
          business_id, order_id, invitation_id, rating, title, body, author_name,
          author_masked_contact, verification_level, score_weight,
          integrity_factor, product_name, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'published', $13, $13) RETURNING id`,
        [
          isId, orderId, invId, rev.rating, strLimit(rev.title, 255), rev.body, strLimit(rev.author_name, 150),
          strLimit(rev.author_masked_contact, 150), rev.verification_level,
          rev.verification_level === 'confirmed_payment' ? 1.00 : 0.90,
          1.00, strLimit(rev.product_name, 200), t.toISOString()
        ]
      );

      if (rev.response) {
        await client.query(
          `INSERT INTO review_responses (review_id, business_id, responder_name, response_text, created_at)
           VALUES ($1, $2, 'Equipo Oficial Locomotion OS', $3, $4)`,
          [revRes.rows[0].id, isId, rev.response, new Date(t.getTime() + 3 * 3600 * 1000).toISOString()]
        );
      }

      isCalcItems.push({
        rating: rev.rating,
        verificationLevel: rev.verification_level,
        ageDays,
        integrityFactor: 1.00
      });
    }

    // Resolution cases for locomotion-is
    for (const c of locomotionIsCases) {
      const caseRes = await client.query(
        `INSERT INTO resolution_cases (
          business_id, case_number, customer_name, customer_contact,
          issue_category, customer_requested_remedy, status,
          is_consumer_confirmed, remedy_offered, resolution_summary,
          median_first_response_minutes, total_resolution_hours, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING id`,
        [
          isId, strLimit(c.case_number, 50), strLimit(c.customer_name, 150), strLimit(c.customer_contact, 150),
          strLimit(c.issue_category, 100), strLimit(c.customer_requested_remedy, 100), c.status,
          c.is_consumer_confirmed, c.remedy_offered, c.resolution_summary,
          c.median_first_response_minutes, c.total_resolution_hours
        ]
      );
      const caseId = caseRes.rows[0].id;
      await client.query(
        `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
         VALUES ($1, 'consumer', $2, $3, false)`,
        [caseId, c.customer_name, `Consulta técnica de configuración: ${c.issue_category}. Solicitud: ${c.customer_requested_remedy}`]
      );
      await client.query(
        `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
         VALUES ($1, 'merchant', 'Soporte Técnico Locomotion OS', $2, false)`,
        [caseId, c.remedy_offered]
      );
      if (c.is_consumer_confirmed) {
        await client.query(
          `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
           VALUES ($1, 'consumer', $2, 'Confirmación del taller: Solución probada y verificada en bahía de trabajo.', false)`,
          [caseId, c.customer_name]
        );
      }
    }

    // Calculate score for locomotion-is
    const isResolutionInput: ResolutionMetricsInput = {
      casesCount: 5,
      consumerConfirmedCount: 5,
      merchantRespondedCount: 5,
      medianResponseHours: 0.35,
      reopenedCount: 0
    };
    const isScore = calculateOpinioScore(isCalcItems, isResolutionInput, 18400, 17200, 78.0, 20);

    await client.query(
      `UPDATE businesses SET
        trust_score = $1,
        effective_reviews_count = $2,
        confidence_level = $3,
        coverage_percentage = $4,
        resolution_rate = $5,
        updated_at = NOW()
      WHERE id = $6`,
      [isScore.opinioScore, Math.round(isScore.effectiveSampleSize), isScore.confidenceLevel, isScore.coveragePercentage, isScore.resolutionRate, isId]
    );
    console.log(`⭐ Locomotion OS Score: ${isScore.opinioScore}/100, Effective Reviews: ${Math.round(isScore.effectiveSampleSize)}`);

    // Widgets for locomotion-is
    const isWidgets = [
      { token: 'wgt_locomotion_is_badge_2026', type: 'badge', config: { style: 'pill', showScore: true, showCoverage: true } },
      { token: 'wgt_locomotion_is_card_2026', type: 'card', config: { theme: 'light', showReviews: true } },
      { token: 'wgt_locomotion_is_reassurance_2026', type: 'reassurance', config: { placement: 'checkout' } },
      { token: 'wgt_locomotion_is_ribbon_2026', type: 'ribbon', config: { style: 'ribbon' } }
    ];
    for (const w of isWidgets) {
      await client.query(
        `INSERT INTO widgets (business_id, token, widget_type, config, is_active)
         VALUES ($1, $2, $3, $4::jsonb, true)
         ON CONFLICT (token) DO UPDATE SET is_active = true, config = EXCLUDED.config`,
        [isId, w.token, w.type, JSON.stringify(w.config)]
      );
    }
    console.log('🎖️ Seeded widgets for locomotion.is');

    // -------------------------------------------------------------------------
    // 2. BUSINESS: locomotion-mx (Locomotion MX Workshop)
    // -------------------------------------------------------------------------
    const mxTimestamps = generateBurstTimestamps(locomotionMxReviews.length, 275, 'workshop');
    const mxCalcItems: ReviewCalculationItem[] = [];

    const mxBusinessRes = await client.query(
      `INSERT INTO businesses (
        slug, brand_name, legal_name, category, description,
        rfc, clee, phone, whatsapp, domain, logo_url,
        operating_area, claimed, verified_level, confidence_level,
        coverage_percentage, observed_orders_count, invited_orders_count,
        issues_per_thousand, resolution_rate, median_response_hours, reopen_rate,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, true, 'transparent_coverage', 'established',
        95.8, 3200, 2950,
        0.3, 100.0, 0.3, 0.0,
        NOW() - INTERVAL '300 days', NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        brand_name = EXCLUDED.brand_name,
        legal_name = EXCLUDED.legal_name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        rfc = EXCLUDED.rfc,
        clee = EXCLUDED.clee,
        phone = EXCLUDED.phone,
        whatsapp = EXCLUDED.whatsapp,
        domain = EXCLUDED.domain,
        logo_url = EXCLUDED.logo_url,
        operating_area = EXCLUDED.operating_area,
        claimed = true,
        verified_level = 'transparent_coverage',
        confidence_level = 'established',
        updated_at = NOW()
      RETURNING id`,
      [
        'locomotion-mx',
        'Locomotion MX',
        'Transmisiones Automáticas Locomotion S.A. de C.V.',
        strLimit('Servicios Automotrices & Reconstrucción de Transmisiones', 100),
        'Taller de alta especialidad en diagnóstico computarizado, mantenimiento mayor y reconstrucción de transmisiones automáticas (6L80, 4L60E, CVT, DSG, ZF) en Torreón (Coahuila) y Chihuahua (Chihuahua). Diagnóstico profesional sin costo, presupuesto formal por escrito sin cargos ocultos y póliza de garantía física de 12 meses o 20,000 km.',
        'TAL210428MC2',
        '0503568492018002',
        '+52 1 871 392 7810',
        '+52 1 871 392 7810',
        'locomotion.mx',
        '/logos/locomotion-mx.png',
        strLimit('Torreón, Coahuila & Chihuahua, Chihuahua', 150)
      ]
    );
    const mxId = mxBusinessRes.rows[0].id;
    console.log(`✅ Business locomotion-mx registered with ID: ${mxId}`);

    // Clean previous records
    await client.query('DELETE FROM identities WHERE business_id = $1', [mxId]);
    await client.query('DELETE FROM official_records WHERE business_id = $1', [mxId]);
    await client.query('DELETE FROM resolution_cases WHERE business_id = $1', [mxId]);
    await client.query('DELETE FROM reviews WHERE business_id = $1', [mxId]);
    await client.query('DELETE FROM invitations WHERE business_id = $1', [mxId]);
    await client.query('DELETE FROM orders WHERE business_id = $1', [mxId]);

    // Identities for locomotion-mx
    const mxIdentities = [
      { type: 'rfc', identifier: 'TAL210428MC2', status: 'verified', source: strLimit('SAT Cédula de Identificación Fiscal Digital', 100) },
      { type: 'denue', identifier: 'CLEE: 0503568492018002', status: 'verified', source: strLimit('INEGI DENUE - Taller Mecánico Especializado', 100) },
      { type: 'domain', identifier: 'locomotion.mx', status: 'verified', source: strLimit('DNS TXT Opinio-Security Token', 100) },
      { type: 'whatsapp', identifier: '+52 1 871 392 7810', status: 'verified', source: strLimit('Meta Business Partner API Verified', 100) },
      { type: 'phone', identifier: '+52 1 871 392 7810', status: 'verified', source: strLimit('Línea de Taller y Recepción Torreón', 100) }
    ];
    for (const id of mxIdentities) {
      await client.query(
        `INSERT INTO identities (business_id, type, identifier, status, source, verified_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '270 days')`,
        [mxId, id.type, id.identifier, id.status, id.source]
      );
    }

    // Official records for locomotion-mx
    const mxRecords = [
      {
        source_name: strLimit('PROFECO Buró Comercial', 100),
        fact_title: 'Registro de Contrato de Adhesión No. 3489-2023',
        fact_detail: 'Registro oficial de contrato de adhesión para talleres mecánicos de reparación y mantenimiento automotriz conforme a NOM-174-SCFI-2007.',
        record_date: '14/06/2025',
        source_url: 'https://burocomercial.profeco.gob.mx'
      },
      {
        source_name: strLimit('SAT Servicio de Administración Tributaria', 100),
        fact_title: 'Opinión de Cumplimiento Positiva (Art. 32-D)',
        fact_detail: 'Emisión de opinión positiva de cumplimiento fiscal para facturación CFDI 4.0 de servicios mecánicos y venta de refacciones.',
        record_date: '18/07/2026',
        source_url: 'https://www.sat.gob.mx'
      },
      {
        source_name: strLimit('IMPI Instituto Mexicano de la Propiedad Industrial', 100),
        fact_title: 'Registro de Marca Oficial No. 2984120',
        fact_detail: 'Registro de marca LOCOMOTION MX en Clase 37 (Servicios de reparación, reconstrucción y mantenimiento mecánico de transmisiones y vehículos de motor).',
        record_date: '08/02/2025',
        source_url: 'https://marcanet.impi.gob.mx'
      }
    ];
    for (const rec of mxRecords) {
      await client.query(
        `INSERT INTO official_records (business_id, source_name, fact_title, fact_detail, record_date, source_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [mxId, rec.source_name, rec.fact_title, rec.fact_detail, rec.record_date, rec.source_url]
      );
    }

    // Reviews & Orders for locomotion-mx
    for (let i = 0; i < locomotionMxReviews.length; i++) {
      const rev = locomotionMxReviews[i];
      const t = mxTimestamps[i];
      const ageDays = Math.max(1, (Date.now() - t.getTime()) / (1000 * 60 * 60 * 24));

      const orderHoursBefore = 48 + Math.random() * 72;
      const orderDate = new Date(t.getTime() - orderHoursBefore * 60 * 60 * 1000);
      const invDate = new Date(t.getTime() - (orderHoursBefore * 0.3) * 60 * 60 * 1000);

      const ordRes = await client.query(
        `INSERT INTO orders (
          business_id, external_order_id, platform, customer_name,
          customer_email, amount, currency, status, invited, order_date, delivered_date
        ) VALUES ($1, $2, 'workshop_pos', $3, $4, $5, 'MXN', 'delivered', true, $6, $7) RETURNING id`,
        [mxId, `ORD-LOCOMX-2026-${1000 + i}`, strLimit(rev.author_name, 150), strLimit(rev.author_masked_contact, 200), rev.amount, orderDate.toISOString(), t.toISOString()]
      );
      const orderId = ordRes.rows[0].id;

      const invRes = await client.query(
        `INSERT INTO invitations (business_id, order_id, token, channel, recipient_target, status, sent_at, completed_at)
         VALUES ($1, $2, $3, 'whatsapp', $4, 'completed', $5, $6) RETURNING id`,
        [mxId, orderId, `INV-LOCOMX-${2000 + i}`, strLimit(rev.author_masked_contact, 150), invDate.toISOString(), t.toISOString()]
      );
      const invId = invRes.rows[0].id;

      const revRes = await client.query(
        `INSERT INTO reviews (
          business_id, order_id, invitation_id, rating, title, body, author_name,
          author_masked_contact, verification_level, score_weight,
          integrity_factor, product_name, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'published', $13, $13) RETURNING id`,
        [
          mxId, orderId, invId, rev.rating, strLimit(rev.title, 255), rev.body, strLimit(rev.author_name, 150),
          strLimit(rev.author_masked_contact, 150), rev.verification_level,
          rev.verification_level === 'confirmed_payment' ? 1.00 : 0.90,
          1.00, strLimit(rev.product_name, 200), t.toISOString()
        ]
      );

      if (rev.response) {
        await client.query(
          `INSERT INTO review_responses (review_id, business_id, responder_name, response_text, created_at)
           VALUES ($1, $2, 'Equipo Oficial Locomotion MX', $3, $4)`,
          [revRes.rows[0].id, mxId, rev.response, new Date(t.getTime() + 4 * 3600 * 1000).toISOString()]
        );
      }

      mxCalcItems.push({
        rating: rev.rating,
        verificationLevel: rev.verification_level,
        ageDays,
        integrityFactor: 1.00
      });
    }

    // Resolution cases for locomotion-mx
    for (const c of locomotionMxCases) {
      const caseRes = await client.query(
        `INSERT INTO resolution_cases (
          business_id, case_number, customer_name, customer_contact,
          issue_category, customer_requested_remedy, status,
          is_consumer_confirmed, remedy_offered, resolution_summary,
          median_first_response_minutes, total_resolution_hours, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING id`,
        [
          mxId, strLimit(c.case_number, 50), strLimit(c.customer_name, 150), strLimit(c.customer_contact, 150),
          strLimit(c.issue_category, 100), strLimit(c.customer_requested_remedy, 100), c.status,
          c.is_consumer_confirmed, c.remedy_offered, c.resolution_summary,
          c.median_first_response_minutes, c.total_resolution_hours
        ]
      );
      const caseId = caseRes.rows[0].id;
      await client.query(
        `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
         VALUES ($1, 'consumer', $2, $3, false)`,
        [caseId, c.customer_name, `Reporte formal de servicio en garantía: ${c.issue_category}. Solicitud: ${c.customer_requested_remedy}`]
      );
      await client.query(
        `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
         VALUES ($1, 'merchant', 'Atención a Clientes Locomotion MX', $2, false)`,
        [caseId, c.remedy_offered]
      );
      if (c.is_consumer_confirmed) {
        await client.query(
          `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
           VALUES ($1, 'consumer', $2, 'Confirmación del cliente: Vehículo revisado y entregado en óptimas condiciones bajo póliza de garantía.', false)`,
          [caseId, c.customer_name]
        );
      }
    }

    // Calculate score for locomotion-mx
    const mxResolutionInput: ResolutionMetricsInput = {
      casesCount: 5,
      consumerConfirmedCount: 5,
      merchantRespondedCount: 5,
      medianResponseHours: 0.3,
      reopenedCount: 0
    };
    const mxScore = calculateOpinioScore(mxCalcItems, mxResolutionInput, 3200, 2950, 77.0, 20);

    await client.query(
      `UPDATE businesses SET
        trust_score = $1,
        effective_reviews_count = $2,
        confidence_level = $3,
        coverage_percentage = $4,
        resolution_rate = $5,
        updated_at = NOW()
      WHERE id = $6`,
      [mxScore.opinioScore, Math.round(mxScore.effectiveSampleSize), mxScore.confidenceLevel, mxScore.coveragePercentage, mxScore.resolutionRate, mxId]
    );
    console.log(`⭐ Locomotion MX Score: ${mxScore.opinioScore}/100, Effective Reviews: ${Math.round(mxScore.effectiveSampleSize)}`);

    // Widgets for locomotion-mx
    const mxWidgets = [
      { token: 'wgt_locomotion_mx_badge_2026', type: 'badge', config: { style: 'pill', showScore: true, showCoverage: true } },
      { token: 'wgt_locomotion_mx_card_2026', type: 'card', config: { theme: 'light', showReviews: true } },
      { token: 'wgt_locomotion_mx_reassurance_2026', type: 'reassurance', config: { placement: 'checkout' } },
      { token: 'wgt_locomotion_mx_ribbon_2026', type: 'ribbon', config: { style: 'ribbon' } }
    ];
    for (const w of mxWidgets) {
      await client.query(
        `INSERT INTO widgets (business_id, token, widget_type, config, is_active)
         VALUES ($1, $2, $3, $4::jsonb, true)
         ON CONFLICT (token) DO UPDATE SET is_active = true, config = EXCLUDED.config`,
        [mxId, w.token, w.type, JSON.stringify(w.config)]
      );
    }
    console.log('🎖️ Seeded widgets for locomotion.mx');

    await client.query('COMMIT');
    console.log('\n🎉 ALL LOCOMOTION LISTINGS SUCCESSFULLY SEEDED AND VERIFIED IN DB!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedLocomotion();
