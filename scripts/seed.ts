import { pool } from '../src/lib/db';
import { calculateOpinioScore, ReviewCalculationItem, ResolutionMetricsInput } from '../src/lib/scoring';

interface SeedBusiness {
  slug: string;
  brand_name: string;
  legal_name: string;
  category: string;
  description: string;
  rfc: string;
  clee: string;
  phone: string;
  whatsapp: string;
  domain: string;
  logo_url: string;
  operating_area: string;
  claimed: boolean;
  verified_level: string;
  observed_orders_count: number;
  invited_orders_count: number;
  identities: Array<{ type: string; identifier: string; status: string; source: string }>;
  official_records: Array<{ source_name: string; fact_title: string; fact_detail: string; record_date: string; source_url: string }>;
  reviews: Array<{
    rating: number;
    title: string;
    body: string;
    author_name: string;
    author_masked_contact: string;
    verification_level: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience';
    ageDays: number;
    product_name?: string;
    response?: string;
  }>;
  cases: Array<{
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
  }>;
}

const seedBusinesses: SeedBusiness[] = [
  {
    slug: 'luuna',
    brand_name: 'Luuna',
    legal_name: 'Comercializadora Zebrands S.A. de C.V.',
    category: 'Hogar, Muebles y Colchones',
    description: 'Marca mexicana de colchones de alta densidad, almohadas y artículos para el descanso con garantía de 100 noches de prueba.',
    rfc: 'CZE150414AB2',
    clee: '0901547891234001',
    phone: '+52 55 4164 0533',
    whatsapp: '+52 55 4164 0533',
    domain: 'luuna.mx',
    logo_url: '/logos/luuna.svg',
    operating_area: 'Nacional (México)',
    claimed: true,
    verified_level: 'transparent_coverage',
    observed_orders_count: 14820,
    invited_orders_count: 13910, // 93.9% coverage
    identities: [
      { type: 'rfc', identifier: 'CZE150414AB2', status: 'verified', source: 'SAT Cédula Fiscal Digital' },
      { type: 'denue', identifier: 'CLEE: 0901547891234001', status: 'verified', source: 'INEGI Directorio Estadístico Nacional de Unidades Económicas' },
      { type: 'domain', identifier: 'luuna.mx', status: 'verified', source: 'DNS TXT Opinio-Security Token' },
      { type: 'whatsapp', identifier: '+52 55 4164 0533', status: 'verified', source: 'Meta Business Verified & OTP' },
      { type: 'phone', identifier: '+52 55 4164 0533', status: 'verified', source: 'Verificación Telefónica Voz' }
    ],
    official_records: [
      {
        source_name: 'PROFECO Buró Comercial',
        fact_title: 'Contrato de Adhesión Registrado',
        fact_detail: 'Registro vigente núm. 2941-2022 ante la Procuraduría Federal del Consumidor para venta a distancia.',
        record_date: '15/03/2026',
        source_url: 'https://burocomercial.profeco.gob.mx'
      },
      {
        source_name: 'INEGI DENUE',
        fact_title: 'Unidad Económica Activa Registrada',
        fact_detail: 'Establecimiento en operación registrado bajo actividad de comercio al por menor de muebles y artículos para el hogar.',
        record_date: '02/01/2026',
        source_url: 'https://www.inegi.org.mx/app/mapa/denue/'
      }
    ],
    reviews: [
      {
        rating: 5,
        title: 'Excelente soporte y cumplimiento de las 100 noches',
        body: 'Pedí el colchón Luuna Original para entrega en Monterrey. Llegó en 4 días hábiles en caja sellada con instructivo. La calidad del descanso es inigualable.',
        author_name: 'Mariana Garza V.',
        author_masked_contact: 'm***a@gmail.com',
        verification_level: 'confirmed_payment',
        ageDays: 12,
        product_name: 'Colchón Luuna Original Matrimonial',
        response: '¡Hola Mariana! Qué alegría saber que tu descanso mejoró con el Luuna Original. Agradecemos tu confianza y verificación en Opinio.'
      },
      {
        rating: 5,
        title: 'Cumplen fecha pactada y factura automática',
        body: 'Compré almohadas de memory foam y base ajustable. El comprobante fiscal CFDI 4.0 llegó al correo minutos después de autorizar el pago con SPEI.',
        author_name: 'Carlos Mendoza T.',
        author_masked_contact: 'c***z@hotmail.com',
        verification_level: 'confirmed_store_order',
        ageDays: 24,
        product_name: 'Almohada Cool Flip Memory Foam'
      },
      {
        rating: 4,
        title: 'Buen producto, paquetería tardó 2 días más en Guadalajara',
        body: 'El colchón es comodísimo. Hubo una demora de 48 horas en Zapopan con la paquetería local, pero el equipo de WhatsApp me mantuvo informado con el número de guía.',
        author_name: 'Rodrigo Benítez S.',
        author_masked_contact: 'r***s@yahoo.com.mx',
        verification_level: 'confirmed_payment',
        ageDays: 45,
        product_name: 'Colchón Luuna One King Size',
        response: 'Rodrigo, lamentamos el desfase de la paquetería en Zapopan y agradecemos tu comprensión. Tomamos nota con el operador logístico para optimizar tiempos.'
      },
      {
        rating: 5,
        title: 'Proceso de garantía transparente',
        body: 'Cambié mi almohada porque prefería mayor firmeza. El proceso de devolución fue rápido y sin letras chiquitas.',
        author_name: 'Lorena Fuentes',
        author_masked_contact: 'l***s@outlook.com',
        verification_level: 'reviewed_proof',
        ageDays: 60
      },
      {
        rating: 2,
        title: 'Retraso inicial en entrega de cabecera',
        body: 'La cabecera tardó 10 días adicionales por falta de inventario de tela. Abrí un caso en Opinio y me ofrecieron un descuento y entrega prioritaria.',
        author_name: 'Alejandro Morales',
        author_masked_contact: 'a***s@gmail.com',
        verification_level: 'confirmed_payment',
        ageDays: 80,
        response: 'Alejandro, reiteramos nuestras disculpas por el desabasto temporal. Nos dio gusto haber resuelto favorablemente tu entrega mediante el caso Opinio.'
      }
    ],
    cases: [
      {
        case_number: 'CASO-LUU-2026-084',
        customer_name: 'Alejandro Morales',
        customer_contact: 'a***s@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'compensation',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Bonificación de $800 MXN en monedero y despacho prioritario express con guía dedicada.',
        resolution_summary: 'El cliente confirmó recepción completa de cabecera y aceptó bonificación acordada.',
        median_first_response_minutes: 28,
        total_resolution_hours: 18.5
      },
      {
        case_number: 'CASO-LUU-2026-061',
        customer_name: 'Valeria Cárdenas',
        customer_contact: 'v***s@gmail.com',
        issue_category: 'wrong_item',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Recolección sin costo de almohada estándar y envío simultáneo de versión Ergonómica King.',
        resolution_summary: 'Cambio completado exitosamente a entera satisfacción del consumidor.',
        median_first_response_minutes: 35,
        total_resolution_hours: 32.0
      },
      {
        case_number: 'CASO-LUU-2026-042',
        customer_name: 'Fernando De la Peña',
        customer_contact: 'f***a@prodigy.net.mx',
        issue_category: 'refund_pending',
        customer_requested_remedy: 'refund',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Reembolso total inmediato vía transferencia SPEI con clave de rastreo bancario Banxico.',
        resolution_summary: 'Devolución de 100 noches procesada y confirmada en cuenta receptora.',
        median_first_response_minutes: 40,
        total_resolution_hours: 24.0
      },
      {
        case_number: 'CASO-LUU-2026-033',
        customer_name: 'Beatriz Solís',
        customer_contact: 'b***s@gmail.com',
        issue_category: 'damaged_goods',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Reposición inmediata de funda protectora rasgada durante maniobra de paquetería.',
        resolution_summary: 'Nueva funda entregada y validada por la consumidora.',
        median_first_response_minutes: 19,
        total_resolution_hours: 14.0
      },
      {
        case_number: 'CASO-LUU-2026-019',
        customer_name: 'Gabriel Lozano',
        customer_contact: 'g***o@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Seguimiento con transportista y confirmación de ventana horaria matutina para entrega.',
        resolution_summary: 'Paquete entregado en la ventana acordada.',
        median_first_response_minutes: 22,
        total_resolution_hours: 8.0
      }
    ]
  },
  {
    slug: 'doto',
    brand_name: 'doto.com.mx',
    legal_name: 'Doto S.A. de C.V.',
    category: 'Electrónica y Gadgets',
    description: 'Plataforma líder en México de tecnología, smartphones liberados, laptops y accesorios con envío garantizado.',
    rfc: 'DOT160912KP9',
    clee: '1505847291039002',
    phone: '+52 55 8526 2626',
    whatsapp: '+52 55 8526 2626',
    domain: 'doto.com.mx',
    logo_url: '/logos/doto.svg',
    operating_area: 'Nacional (México)',
    claimed: true,
    verified_level: 'transparent_coverage',
    observed_orders_count: 24500,
    invited_orders_count: 22800, // 93.0% coverage
    identities: [
      { type: 'rfc', identifier: 'DOT160912KP9', status: 'verified', source: 'SAT Cédula de Identificación Fiscal' },
      { type: 'denue', identifier: 'CLEE: 1505847291039002', status: 'verified', source: 'INEGI DENUE Comercio Electrónico' },
      { type: 'domain', identifier: 'doto.com.mx', status: 'verified', source: 'DNS TXT Verification' },
      { type: 'whatsapp', identifier: '+52 55 8526 2626', status: 'verified', source: 'WhatsApp Business API Account' },
      { type: 'phone', identifier: '+52 55 8526 2626', status: 'verified', source: 'Central Telefónica PBX' }
    ],
    official_records: [
      {
        source_name: 'PROFECO Buró Comercial',
        fact_title: 'Presencia en Concilianet / Monitoreo Tiendas Virtuales',
        fact_detail: 'Cumple con disposiciones de la NMX-COE-001-SCFI-2018 para comercio electrónico.',
        record_date: '10/02/2026',
        source_url: 'https://burocomercial.profeco.gob.mx'
      }
    ],
    reviews: [
      {
        rating: 5,
        title: 'Equipo nuevo, sellado y versión global con garantía',
        body: 'Tenía dudas sobre comprar un teléfono fuera de las tiendas de telefonía tradicionales. El equipo llegó en 48 horas a Querétaro, versión global original con cargador y factura fiscal.',
        author_name: 'Esteban Rivas P.',
        author_masked_contact: 'e***s@gmail.com',
        verification_level: 'confirmed_payment',
        ageDays: 8,
        product_name: 'Smartphone Xiaomi 14 Pro 512GB',
        response: '¡Hola Esteban! En doto garantizamos equipos 100% nuevos, sellados y con respaldo fiscal en México. ¡Que lo disfrutes!'
      },
      {
        rating: 4,
        title: 'Excelente precio, empaque resistente',
        body: 'Pedí una laptop Asus y monitor gamer. El embalaje con burbuja protectora evitó cualquier daño en el traslado. Todo funcionando al 100.',
        author_name: 'Diana Soto L.',
        author_masked_contact: 'd***a@gmail.com',
        verification_level: 'confirmed_store_order',
        ageDays: 18,
        product_name: 'Laptop Gamer Asus ROG Strix'
      },
      {
        rating: 5,
        title: 'Facturación en línea sin trabas',
        body: 'Generé mi CFDI desde el portal con mi RFC en 2 minutos. Muy pocas tiendas tecnológicas en México tienen un sistema tan fluido.',
        author_name: 'Arturo Hinojosa',
        author_masked_contact: 'a***a@empresa.mx',
        verification_level: 'confirmed_payment',
        ageDays: 32
      },
      {
        rating: 3,
        title: 'Caja llegó ligeramente abollada por la paquetería',
        body: 'El producto por dentro estaba intacto pero la caja exterior de mensajería venía maltratada. Recomiendo reforzar el flejado exterior.',
        author_name: 'Samuel Cruz',
        author_masked_contact: 's***z@gmail.com',
        verification_level: 'reviewed_proof',
        ageDays: 55,
        response: 'Hola Samuel, agradecemos tu retroalimentación. Ya reforzamos las especificaciones de encintado y protección con el centro de distribución de Tlalnepantla.'
      }
    ],
    cases: [
      {
        case_number: 'CASO-DOT-2026-112',
        customer_name: 'Samuel Cruz',
        customer_contact: 's***z@gmail.com',
        issue_category: 'damaged_goods',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Inspección remota de sellos, validación de garantía extendida de 1 año sin costo adicional.',
        resolution_summary: 'Consumidor validó funcionamiento óptimo del dispositivo.',
        median_first_response_minutes: 15,
        total_resolution_hours: 6.5
      },
      {
        case_number: 'CASO-DOT-2026-095',
        customer_name: 'Guillermo Pacheco',
        customer_contact: 'g***o@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'refund',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Cancelación expedita y abono a tarjeta de crédito por extravío en ruta de paquetería.',
        resolution_summary: 'Reembolso acreditado y folio de aclaración bancaria entregado al usuario.',
        median_first_response_minutes: 20,
        total_resolution_hours: 12.0
      },
      {
        case_number: 'CASO-DOT-2026-078',
        customer_name: 'Lucía Santillán',
        customer_contact: 'l***n@gmail.com',
        issue_category: 'wrong_item',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Envío de reemplazo de memoria RAM con guía express y recolección gratuita del producto incorrecto.',
        resolution_summary: 'Consumidora recibió el modelo correcto de 32GB.',
        median_first_response_minutes: 30,
        total_resolution_hours: 26.0
      },
      {
        case_number: 'CASO-DOT-2026-051',
        customer_name: 'Mauricio Zavala',
        customer_contact: 'm***a@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Intervención con FedEx para entrega en ocurre el mismo día.',
        resolution_summary: 'Cliente recogió paquete en sucursal ocurre convenida.',
        median_first_response_minutes: 18,
        total_resolution_hours: 5.0
      },
      {
        case_number: 'CASO-DOT-2026-039',
        customer_name: 'Elena Navarrete',
        customer_contact: 'e***e@gmail.com',
        issue_category: 'refund_pending',
        customer_requested_remedy: 'refund',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Liberación de fondos retenidos en pasarela de pago.',
        resolution_summary: 'Saldo reflejado en cuenta bancaria del cliente.',
        median_first_response_minutes: 25,
        total_resolution_hours: 15.0
      }
    ]
  },
  {
    slug: 'ahal-cosmetica',
    brand_name: 'Ahal BioCosmética',
    legal_name: 'Ahal Laboratorios México S.A.P.I. de C.V.',
    category: 'Belleza y Cuidado Personal',
    description: 'Cosmética limpia y sustentable formulada en México con ingredientes orgánicos, libre de crueldad animal y envíos seguros a todo el país.',
    rfc: 'ALM180220TR1',
    clee: '1903948291029003',
    phone: '+52 81 1234 5678',
    whatsapp: '+52 81 1234 5678',
    domain: 'ahal.mx',
    logo_url: '/logos/ahal.svg',
    operating_area: 'Nacional (México)',
    claimed: true,
    verified_level: 'transparent_coverage',
    observed_orders_count: 8200,
    invited_orders_count: 7650, // 93.3% coverage
    identities: [
      { type: 'rfc', identifier: 'ALM180220TR1', status: 'verified', source: 'SAT RFC Validador Oficial' },
      { type: 'denue', identifier: 'CLEE: 1903948291029003', status: 'verified', source: 'INEGI Directorio de Establecimientos Nuevo León' },
      { type: 'domain', identifier: 'ahal.mx', status: 'verified', source: 'DNS TXT Token Verified' },
      { type: 'whatsapp', identifier: '+52 81 1234 5678', status: 'verified', source: 'Meta Verified WhatsApp Merchant' }
    ],
    official_records: [
      {
        source_name: 'INEGI DENUE',
        fact_title: 'Laboratorio y Comercio Farmacéutico/Cosmético Registrado',
        fact_detail: 'Instalación productiva y comercial en San Pedro Garza García, N.L. con estatus activo.',
        record_date: '15/01/2026',
        source_url: 'https://www.inegi.org.mx'
      }
    ],
    reviews: [
      {
        rating: 5,
        title: 'Los mejores sueros naturales hechos en México',
        body: 'Llevo 2 años comprando su protector solar y el suero de maracuyá. La atención por WhatsApp para consultar ingredientes fue muy amable.',
        author_name: 'Paola Villanueva G.',
        author_masked_contact: 'p***a@gmail.com',
        verification_level: 'confirmed_payment',
        ageDays: 14,
        product_name: 'Suero Facial Antioxidante Maracuyá',
        response: '¡Mil gracias Paola! Nos llena de orgullo formular productos limpios y seguros para tu piel.'
      },
      {
        rating: 5,
        title: 'Llegó en 2 días a Mérida, empaque ecológico',
        body: 'Cero plástico innecesario, cartón reciclado y muestras gratis incluidas. 100% recomendados.',
        author_name: 'Sofia Barrera',
        author_masked_contact: 's***a@merida.com',
        verification_level: 'confirmed_store_order',
        ageDays: 28,
        product_name: 'Bloqueador Solar Mineral FPS 50'
      },
      {
        rating: 4,
        title: 'Calidad impecable, solo desearía presentaciones más grandes',
        body: 'El desmaquillante bifásico es suave y no arde los ojos. Funciona excelente.',
        author_name: 'Fernanda Ortiz',
        author_masked_contact: 'f***z@gmail.com',
        verification_level: 'confirmed_payment',
        ageDays: 40
      }
    ],
    cases: [
      {
        case_number: 'CASO-AHL-2026-021',
        customer_name: 'Carla Zambrano',
        customer_contact: 'c***o@gmail.com',
        issue_category: 'damaged_goods',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Envío express de frasco gotero de reemplazo sin costo.',
        resolution_summary: 'Producto de reposición recibido en perfecto estado.',
        median_first_response_minutes: 12,
        total_resolution_hours: 10.0
      },
      {
        case_number: 'CASO-AHL-2026-015',
        customer_name: 'Jimena Castro',
        customer_contact: 'j***o@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Rastreo directo y bonificación de envío gratis en siguiente compra.',
        resolution_summary: 'Pedido entregado al día hábil siguiente.',
        median_first_response_minutes: 15,
        total_resolution_hours: 12.0
      },
      {
        case_number: 'CASO-AHL-2026-009',
        customer_name: 'Adriana Pineda',
        customer_contact: 'a***a@gmail.com',
        issue_category: 'wrong_item',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Envío del tono de base correcto y obsequio del producto anterior.',
        resolution_summary: 'Cliente satisfecha con el tono recibido.',
        median_first_response_minutes: 20,
        total_resolution_hours: 16.0
      },
      {
        case_number: 'CASO-AHL-2026-004',
        customer_name: 'Miriam Vega',
        customer_contact: 'm***a@gmail.com',
        issue_category: 'refund_pending',
        customer_requested_remedy: 'refund',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Reembolso por transferencia SPEI.',
        resolution_summary: 'Transferencia liquidada y comprobante bancario validado.',
        median_first_response_minutes: 18,
        total_resolution_hours: 8.0
      },
      {
        case_number: 'CASO-AHL-2026-002',
        customer_name: 'Daniela Reyes',
        customer_contact: 'd***s@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Contacto con sucursal DHL para liberación de entrega retenida.',
        resolution_summary: 'Paquete entregado el mismo día de la aclaración.',
        median_first_response_minutes: 10,
        total_resolution_hours: 4.0
      }
    ]
  },
  {
    slug: 'xaman-joyeria',
    brand_name: 'Xaman Joyería',
    legal_name: 'Xaman Diseños Artesanales S.A. de C.V.',
    category: 'Joyería y Accesorios',
    description: 'Joyería fina de plata ley .925 y oro de 14k hecha a mano en Taxco y Guadalajara. Venta directa por WhatsApp y tienda online.',
    rfc: 'XDA210615MN4',
    clee: '1403928192039004',
    phone: '+52 33 2190 4455',
    whatsapp: '+52 33 2190 4455',
    domain: 'xamanjoyeria.com',
    logo_url: '/logos/xaman.svg',
    operating_area: 'Nacional e Internacional',
    claimed: true,
    verified_level: 'transparent_coverage',
    observed_orders_count: 3200,
    invited_orders_count: 2950, // 92.2% coverage
    identities: [
      { type: 'rfc', identifier: 'XDA210615MN4', status: 'verified', source: 'SAT RFC' },
      { type: 'denue', identifier: 'CLEE: 1403928192039004', status: 'verified', source: 'INEGI DENUE Jalisco' },
      { type: 'whatsapp', identifier: '+52 33 2190 4455', status: 'verified', source: 'WhatsApp OTP' },
      { type: 'domain', identifier: 'xamanjoyeria.com', status: 'verified', source: 'DNS TXT' }
    ],
    official_records: [
      {
        source_name: 'Cámara de Joyería de Jalisco',
        fact_title: 'Socio Activo Afiliado',
        fact_detail: 'Empresa afiliada con certificación de calidad de metales preciosos plata .925.',
        record_date: '20/01/2026',
        source_url: 'https://camaradejoyeria.com.mx'
      }
    ],
    reviews: [
      {
        rating: 5,
        title: 'Plata auténtica con contraste oficial',
        body: 'Compré un anillo y aretes con piedras naturales. El grabado de .925 viene perfectamente legible y la caja con listón de terciopelo es hermosa para regalo.',
        author_name: 'Camila Robles',
        author_masked_contact: 'c***s@gmail.com',
        verification_level: 'confirmed_payment',
        ageDays: 10,
        product_name: 'Anillo Taxco Plata .925 Amatista'
      },
      {
        rating: 5,
        title: 'Transacción segura por WhatsApp y SPEI',
        body: 'Tenía desconfianza de transferir por SPEI pero me enviaron su Opinio Link verificado y el comprobante de guía salió a las dos horas. Muy profesionales.',
        author_name: 'Jorge Navarrete',
        author_masked_contact: 'j***e@gmail.com',
        verification_level: 'confirmed_payment',
        ageDays: 22
      },
      {
        rating: 4,
        title: 'La talla quedó un poco justa pero me la ajustaron',
        body: 'El servicio posventa me ofreció reajuste de medida enviándolo a su taller en Guadalajara. Todo resuelto.',
        author_name: 'Ana Laura Gómez',
        author_masked_contact: 'a***z@gmail.com',
        verification_level: 'reviewed_proof',
        ageDays: 48
      }
    ],
    cases: [
      {
        case_number: 'CASO-XAM-2026-018',
        customer_name: 'Ana Laura Gómez',
        customer_contact: 'a***z@gmail.com',
        issue_category: 'wrong_item',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Ajuste de talla sin costo de mano de obra ni envío.',
        resolution_summary: 'Anillo devuelto con medida solicitada núm 7.',
        median_first_response_minutes: 15,
        total_resolution_hours: 48.0
      },
      {
        case_number: 'CASO-XAM-2026-012',
        customer_name: 'Patricio Rangel',
        customer_contact: 'p***l@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Notificación de fabricación artesanal y entrega con paquetería am/pm.',
        resolution_summary: 'Entrega recibida antes de fecha de compromiso.',
        median_first_response_minutes: 20,
        total_resolution_hours: 14.0
      },
      {
        case_number: 'CASO-XAM-2026-008',
        customer_name: 'Jessica Valenzuela',
        customer_contact: 'j***a@gmail.com',
        issue_category: 'damaged_goods',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Reposición de broche de cadena de plata.',
        resolution_summary: 'Cadena reparada y pulida devuelta a clienta.',
        median_first_response_minutes: 12,
        total_resolution_hours: 24.0
      },
      {
        case_number: 'CASO-XAM-2026-005',
        customer_name: 'Hugo Salinas',
        customer_contact: 'h***s@gmail.com',
        issue_category: 'refund_pending',
        customer_requested_remedy: 'refund',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Reembolso inmediato por pieza agotada.',
        resolution_summary: 'Devolución vía SPEI liquidada.',
        median_first_response_minutes: 8,
        total_resolution_hours: 2.0
      },
      {
        case_number: 'CASO-XAM-2026-001',
        customer_name: 'Claudia Ibarra',
        customer_contact: 'c***a@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Aclaración de guía Estafeta y entrega urgente.',
        resolution_summary: 'Entrega finalizada en domicilio.',
        median_first_response_minutes: 10,
        total_resolution_hours: 6.0
      }
    ]
  },
  {
    slug: 'mobel-studio',
    brand_name: 'Möbel Studio GDL',
    legal_name: 'Möbel Vanguardia Mexicana S.A.S.',
    category: 'Muebles y Diseño de Interiores',
    description: 'Taller de carpintería fina y mobiliario a la medida en roble y nogal con presencia en Instagram y showroom en Zapopan, Jalisco.',
    rfc: 'MVM230910XX1',
    clee: '1412039102930005',
    phone: '+52 33 3810 9988',
    whatsapp: '+52 33 3810 9988',
    domain: 'mobelstudio.mx',
    logo_url: '/logos/mobel.svg',
    operating_area: 'Occidente y Centro de México',
    claimed: true,
    verified_level: 'connected_orders',
    observed_orders_count: 850,
    invited_orders_count: 760, // 89.4% coverage
    identities: [
      { type: 'rfc', identifier: 'MVM230910XX1', status: 'verified', source: 'SAT Cédula Fiscal' },
      { type: 'denue', identifier: 'CLEE: 1412039102930005', status: 'verified', source: 'INEGI DENUE Zapopan' },
      { type: 'whatsapp', identifier: '+52 33 3810 9988', status: 'verified', source: 'WhatsApp OTP' },
      { type: 'domain', identifier: 'mobelstudio.mx', status: 'verified', source: 'DNS TXT' }
    ],
    official_records: [
      {
        source_name: 'INEGI DENUE',
        fact_title: 'Taller y Fabricación de Muebles Registrado',
        fact_detail: 'Registro vigente como taller de manufactura de muebles de madera en Zapopan, Jalisco.',
        record_date: '05/02/2026',
        source_url: 'https://www.inegi.org.mx'
      }
    ],
    reviews: [
      {
        rating: 5,
        title: 'Mesa de comedor en nogal macizo: obra de arte',
        body: 'Mandamos a hacer una mesa para 8 personas con envío a CDMX. Nos enviaron fotos del proceso de lijado y barnizado en el taller. Entregaron con maniobra hasta el piso 4.',
        author_name: 'Santiago Legorreta',
        author_masked_contact: 's***a@legorreta.mx',
        verification_level: 'confirmed_payment',
        ageDays: 19,
        product_name: 'Comedor Nogal Silvestre 8 plazas'
      },
      {
        rating: 4,
        title: 'Excelente terminado, se extendió 1 semana la fabricación',
        body: 'El acabado del mueble de TV flotante es impecable. El tiempo de taller se retrasó 7 días naturales debido a secado de madera, pero nos avisaron proactivamente.',
        author_name: 'Mónica Heredia',
        author_masked_contact: 'm***a@gmail.com',
        verification_level: 'confirmed_store_order',
        ageDays: 35
      }
    ],
    cases: [
      {
        case_number: 'CASO-MOB-2026-007',
        customer_name: 'Mónica Heredia',
        customer_contact: 'm***a@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Visita de instalación gratuita y regalo de tabla de quesos en madera de olivo.',
        resolution_summary: 'Cliente recibió instalación y validó satisfacción total.',
        median_first_response_minutes: 25,
        total_resolution_hours: 20.0
      },
      {
        case_number: 'CASO-MOB-2026-004',
        customer_name: 'Alonso Treviño',
        customer_contact: 'a***o@gmail.com',
        issue_category: 'damaged_goods',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Retoque y cambio de jaladera en domicilio por ebanista de la marca.',
        resolution_summary: 'Mueble ajustado en sitio.',
        median_first_response_minutes: 30,
        total_resolution_hours: 48.0
      },
      {
        case_number: 'CASO-MOB-2026-003',
        customer_name: 'Raquel Corona',
        customer_contact: 'r***a@gmail.com',
        issue_category: 'wrong_item',
        customer_requested_remedy: 'replacement',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Cambio de acabado de barniz mate a semimate a solicitud del cliente.',
        resolution_summary: 'Acabado modificado a satisfacción de la clienta.',
        median_first_response_minutes: 20,
        total_resolution_hours: 72.0
      },
      {
        case_number: 'CASO-MOB-2026-002',
        customer_name: 'Eduardo Maza',
        customer_contact: 'e***a@gmail.com',
        issue_category: 'delay',
        customer_requested_remedy: 'clarification',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Coordinación de maniobra en sábado para recibir sin interferir con horario laboral.',
        resolution_summary: 'Entrega sabatina completada exitosamente.',
        median_first_response_minutes: 15,
        total_resolution_hours: 18.0
      },
      {
        case_number: 'CASO-MOB-2026-001',
        customer_name: 'Tania Villalobos',
        customer_contact: 't***s@gmail.com',
        issue_category: 'refund_pending',
        customer_requested_remedy: 'refund',
        status: 'resolved_consumer_confirmed',
        is_consumer_confirmed: true,
        remedy_offered: 'Devolución de anticipo por imposibilidad de medidas en departamento.',
        resolution_summary: 'Anticipo devuelto íntegramente por transferencia bancaria.',
        median_first_response_minutes: 12,
        total_resolution_hours: 6.0
      }
    ]
  },
  {
    slug: 'techstore-mx',
    brand_name: 'TechStore MX',
    legal_name: 'Importadora y Comercializadora Digital TechStore S.A.',
    category: 'Electrónica y Accesorios',
    description: 'Tienda de accesorios para computadoras, cables y componentes. Perfil con evidencia pública recopilada.',
    rfc: 'ICD200318AB9',
    clee: '0901482910390006',
    phone: '+52 55 5555 1234',
    whatsapp: '+52 55 5555 1234',
    domain: 'techstoremx.com',
    logo_url: '/logos/techstore.svg',
    operating_area: 'Ciudad de México y Área Metropolitana',
    claimed: false,
    verified_level: 'public_info',
    observed_orders_count: 0,
    invited_orders_count: 0,
    identities: [
      { type: 'rfc', identifier: 'ICD200318AB9', status: 'verified', source: 'SAT Registro Público' },
      { type: 'denue', identifier: 'CLEE: 0901482910390006', status: 'verified', source: 'INEGI DENUE CDMX' }
    ],
    official_records: [
      {
        source_name: 'INEGI DENUE',
        fact_title: 'Comercio al por menor registrado',
        fact_detail: 'Registro en alcaldía Cuauhtémoc, CDMX.',
        record_date: '10/01/2026',
        source_url: 'https://www.inegi.org.mx'
      }
    ],
    reviews: [
      {
        rating: 3,
        title: 'Tienda física existe en CDMX, no responden mucho en WhatsApp',
        body: 'Fui directamente a su local en el centro y me vendieron el cable. Por WhatsApp tardaron 3 días en darme cotización. Buen producto en persona.',
        author_name: 'Víctor Hugo P.',
        author_masked_contact: 'v***r@gmail.com',
        verification_level: 'unverified_experience',
        ageDays: 30
      }
    ],
    cases: []
  }
];

async function seed() {
  console.log('🌱 Seeding Opinio.mx database on Coolify PostgreSQL (82.208.21.221:15437)...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clean existing records
    await client.query('TRUNCATE TABLE audit_logs, widgets, official_records, case_messages, resolution_cases, review_responses, reviews, invitations, orders, identities, businesses RESTART IDENTITY CASCADE');

    for (const b of seedBusinesses) {
      // Calculate scores using official formula
      const reviewCalcItems: ReviewCalculationItem[] = b.reviews.map(r => ({
        rating: r.rating,
        verificationLevel: r.verification_level,
        ageDays: r.ageDays,
        integrityFactor: 1.0
      }));

      const confirmedCasesCount = b.cases.filter(c => c.is_consumer_confirmed).length;
      const resolutionMetrics: ResolutionMetricsInput = {
        casesCount: b.cases.length,
        consumerConfirmedCount: confirmedCasesCount,
        merchantRespondedCount: b.cases.length,
        medianResponseHours: 0.5,
        reopenedCount: 0
      };

      const calculated = calculateOpinioScore(
        reviewCalcItems,
        resolutionMetrics,
        b.observed_orders_count,
        b.invited_orders_count
      );

      const bResult = await client.query(
        `INSERT INTO businesses (
          slug, brand_name, legal_name, category, description,
          rfc, clee, phone, whatsapp, domain, logo_url,
          operating_area, claimed, verified_level, trust_score,
          confidence_level, coverage_percentage, observed_orders_count,
          invited_orders_count, issues_per_thousand, resolution_rate,
          median_response_hours, reopen_rate, effective_reviews_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        ) RETURNING id`,
        [
          b.slug,
          b.brand_name,
          b.legal_name,
          b.category,
          b.description,
          b.rfc,
          b.clee,
          b.phone,
          b.whatsapp,
          b.domain,
          b.logo_url,
          b.operating_area,
          b.claimed,
          b.verified_level,
          calculated.opinioScore,
          calculated.confidenceLevel,
          calculated.coveragePercentage,
          b.observed_orders_count,
          b.invited_orders_count,
          calculated.issuesPerThousand,
          calculated.resolutionRate,
          0.6, // median response hours
          0.0,
          b.reviews.length
        ]
      );

      const businessId = bResult.rows[0].id;
      console.log(`  🏢 Seeded business: ${b.brand_name} (ID: ${businessId}, Score: ${calculated.opinioScore}, Coverage: ${calculated.coveragePercentage}%)`);

      // 1. Identities
      for (const id of b.identities) {
        await client.query(
          `INSERT INTO identities (business_id, type, identifier, status, source)
           VALUES ($1, $2, $3, $4, $5)`,
          [businessId, id.type, id.identifier, id.status, id.source]
        );
      }

      // 2. Official Records
      for (const rec of b.official_records) {
        await client.query(
          `INSERT INTO official_records (business_id, source_name, fact_title, fact_detail, record_date, source_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [businessId, rec.source_name, rec.fact_title, rec.fact_detail, rec.record_date, rec.source_url]
        );
      }

      // 3. Orders and Invitations
      for (let i = 1; i <= 6; i++) {
        const orderRes = await client.query(
          `INSERT INTO orders (business_id, external_order_id, platform, customer_name, customer_email, customer_phone, amount, currency, status, invited)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            businessId,
            `ORD-${b.slug.toUpperCase()}-${1000 + i}`,
            'shopify',
            `Cliente ${i} Opinio`,
            `cliente${i}@opinio.mx`,
            `+52550000000${i}`,
            1450.00 * i,
            'MXN',
            'delivered',
            true
          ]
        );
        const orderId = orderRes.rows[0].id;

        await client.query(
          `INSERT INTO invitations (business_id, order_id, token, channel, recipient_target, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            businessId,
            orderId,
            `INV-${b.slug}-${1000 + i}`,
            i % 2 === 0 ? 'whatsapp' : 'email',
            `cliente${i}@opinio.mx`,
            'completed'
          ]
        );
      }

      // 4. Reviews & Responses
      for (const r of b.reviews) {
        const revRes = await client.query(
          `INSERT INTO reviews (
            business_id, rating, title, body, author_name,
            author_masked_contact, verification_level, score_weight,
            integrity_factor, product_name, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - ($12 || ' days')::INTERVAL) RETURNING id`,
          [
            businessId,
            r.rating,
            r.title,
            r.body,
            r.author_name,
            r.author_masked_contact,
            r.verification_level,
            r.verification_level === 'confirmed_payment' ? 1.00 : (r.verification_level === 'confirmed_store_order' ? 0.90 : 0.75),
            1.00,
            r.product_name || 'Compra en Línea Verificada',
            'published',
            r.ageDays
          ]
        );

        if (r.response) {
          await client.query(
            `INSERT INTO review_responses (review_id, business_id, responder_name, response_text)
             VALUES ($1, $2, $3, $4)`,
            [revRes.rows[0].id, businessId, `Equipo Oficial ${b.brand_name}`, r.response]
          );
        }
      }

      // 5. Resolution Cases & Messages
      for (const c of b.cases) {
        const caseRes = await client.query(
          `INSERT INTO resolution_cases (
            business_id, case_number, customer_name, customer_contact,
            issue_category, customer_requested_remedy, status,
            is_consumer_confirmed, remedy_offered, resolution_summary,
            median_first_response_minutes, total_resolution_hours, resolved_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING id`,
          [
            businessId,
            c.case_number,
            c.customer_name,
            c.customer_contact,
            c.issue_category,
            c.customer_requested_remedy,
            c.status,
            c.is_consumer_confirmed,
            c.remedy_offered,
            c.resolution_summary,
            c.median_first_response_minutes,
            c.total_resolution_hours
          ]
        );

        const caseId = caseRes.rows[0].id;
        // Initial customer claim
        await client.query(
          `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
           VALUES ($1, 'consumer', $2, $3, false)`,
          [caseId, c.customer_name, `Reporte inicial de incidencia por ${c.issue_category}. Solicitud: ${c.customer_requested_remedy}.`]
        );
        // Merchant prompt remedy
        await client.query(
          `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
           VALUES ($1, 'merchant', $2, $3, false)`,
          [caseId, `Atención a Clientes ${b.brand_name}`, c.remedy_offered]
        );
        // Consumer confirmation
        if (c.is_consumer_confirmed) {
          await client.query(
            `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private)
             VALUES ($1, 'consumer', $2, 'Confirmo de conformidad que la solución fue recibida y el caso queda resuelto.', false)`,
            [caseId, c.customer_name]
          );
        }
      }

      // 6. Default Widgets
      await client.query(
        `INSERT INTO widgets (business_id, token, widget_type, config)
         VALUES ($1, $2, 'badge', $3::jsonb)`,
        [
          businessId,
          `wgt_${b.slug}_badge_2026`,
          JSON.stringify({ style: 'pill', showScore: true, showCoverage: true })
        ]
      );
      await client.query(
        `INSERT INTO widgets (business_id, token, widget_type, config)
         VALUES ($1, $2, 'card', $3::jsonb)`,
        [
          businessId,
          `wgt_${b.slug}_card_2026`,
          JSON.stringify({ theme: 'dark', showReviews: true })
        ]
      );
      await client.query(
        `INSERT INTO widgets (business_id, token, widget_type, config)
         VALUES ($1, $2, 'reassurance', $3::jsonb)`,
        [
          businessId,
          `wgt_${b.slug}_reassurance_2026`,
          JSON.stringify({ placement: 'checkout' })
        ]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with authentic Mexican commercial trust passports!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
