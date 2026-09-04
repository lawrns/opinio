# Opinio.mx — Pasaporte de Confianza Comercial en México

> **La confianza se demuestra.**  
> *Antes de pagar, comprueba quién vende, cómo cumple y cómo responde.*

Opinio.mx es la capa independiente de confianza para el comercio mexicano fuera de los marketplaces cerrados (Shopify, Tiendanube, WhatsApp Business, SPEI, Instagram Direct y enlaces de pago). 

---

## 🌟 Los Tres Pilares de Prueba

A diferencia de directorios de reseñas tradicionales donde los comercios compran sellos de 5 estrellas o filtran clientes insatisfechos, Opinio audita tres dimensiones inseparables:

| Pilar | Pregunta del Consumidor | Evidencia Auditada | Salida Pública en el Pasaporte |
| :--- | :--- | :--- | :--- |
| **Existe** | *¿A quién le estoy pagando realmente?* | Cédula Fiscal SAT (RFC), Directorio INEGI DENUE (CLEE), Dominio DNS verificado, WhatsApp Business oficial | Estatus de identidad, fecha de verificación, vinculación legal/marca |
| **Cumple** | *¿Los clientes reciben lo prometido?* | **El Denominador:** Métrica de cobertura (% de pedidos reales invitados a opinar), índice de quejas por 1,000 pedidos, reseñas ponderadas por nivel de comprobante | Opinio Score (0–100), Métrica de Cobertura (ej. 93.9%), distribución 1-5 estrellas |
| **Resuelve** | *¿Qué pasa cuando algo sale mal?* | Tasa de resolución **confirmada por el consumidor** (nunca por aserción unilateral del comercio), SLA mediano de primera respuesta, bitácora de reembolsos SPEI y reposiciones | Tasa de resolución confirmada (%), tiempo mediano de respuesta, historial de casos |

---

## 📐 El Moat: Reputación con Denominador

La mayoría de los sistemas de reputación solo conocen el numerador (10 quejas, 50 reseñas).
Opinio audita el **denominador real**:
* **Cobertura de Invitación:** *93.9% de órdenes conectadas fueron invitadas a opinar en los últimos 90 días.*
* **Tasa de Incidencia:** *0.5 problemas reportados por cada 1,000 órdenes conectadas.*
* **Continuidad de Conexión:** *Monitoreo continuo sin desconexiones selectivas en meses malos.*

---

## 🧮 Motor de Cálculo Matemático (Spec Sección 7)

Opinio implementa un motor bayesiano determinista:

1. **Puntaje por reseña:**
   $$x_i = 25(s_i - 1)$$
   Donde 1 estrella = 0 y 5 estrellas = 100.
2. **Ponderación por evidencia, antigüedad e integridad:**
   $$w_i = v_i \times d_i \times q_i$$
   * $v_i \in \{1.00 \text{ (Pago confirmado)}, 0.90 \text{ (Pedido confirmado)}, 0.75 \text{ (Comprobante revisado)}, 0.35 \text{ (Sin comprobante)}\}$
   * Recaimiento temporal con vida media de 12 meses: $d_i = \max(0.25, 2^{-\text{días}/365})$
   * Factor de integridad acotado: $q_i \in [0.70, 1.15]$
3. **Puntaje Bayesiano de Experiencia:**
   $$E = \frac{C m + \sum w_i x_i}{C + \sum w_i}$$
   Con $C = 20$ (peso a priori equivalente a 20 reseñas verificadas) y $m = 75$ (línea base del sector).
4. **Tamaño Muestral Efectivo:**
   $$n_{\text{eff}} = \frac{(\sum w_i)^2}{\sum w_i^2}$$
5. **Puntaje de Resolución (publicado con $\ge 5$ casos):**
   $$R = 0.40(\text{confirmado}) + 0.25(\text{tasa respuesta}) + 0.20(\text{velocidad}) + 0.15(1 - \text{tasa reapertura})$$
6. **Puntaje Compuesto:**
   $$S = 0.70 E + 0.30 R \quad (\text{o } S = E \text{ si } \text{casos} < 5)$$

---

## 🏗️ Arquitectura Técnica

* **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
* **Diseño:** Mobbin benchmarks (Linear, Stripe, Midday, Sana) y 21st.dev component patterns.
* **Base de Datos:** PostgreSQL 16 alojado en infraestructura Coolify (`82.208.21.221:15437`).
* **Conexión:** Pool persistente `pg` en `src/lib/db.ts` optimizado para Next.js runtime.
* **Seguridad & Firewall Comercial:** El plan o pago del comercio **NUNCA** altera el algoritmo ni el cálculo del puntaje.

---

## 📱 Superficies del Producto

### 1. Portal del Consumidor
* `/`: Portada con buscador instantáneo multi-criterio (Nombre, WhatsApp `+52`, URL, CLABE SPEI), pilares de prueba, simulación de validación ante transferencias, directorio destacado (Luuna, doto.com.mx, Ahal, Xaman Joyería, Möbel Studio, TechStore MX).
* `/verificar`: Buscador de verificación con debounce y estados honestos (Evidencia sólida, Evidencia moderada, Registrado sin conexión, Solo datos públicos, Sin coincidencia).
* `/b/[slug]`: Pasaporte de Confianza Oficial con los 6 bloques normativos (Header con dial 0-100, Pasaporte Existe, Experiencia Cumple, Denominador de Cobertura, Incidencia y Resolución Resuelve, Fuentes Oficiales PROFECO/DENUE, Reseñas Verificadas).
* `/escribir-opinion/[slug]`: Asistente de reseña verificada con selección de nivel de comprobante y desglose dimensional.
* `/caso/[id]`: Portal de resolución y mediación para consumidores con chat privado, propuesta de remedios (Reembolso SPEI, Reposición) y el botón cardinal de **Confirmación de Resolución por el Consumidor**.

### 2. Opinio Merchant OS
* `/merchant`: Dashboard ejecutivo con KPIs en tiempo real, velocímetro de cobertura ($>90\%$), alertas de SLA y enlaces directos.
* `/merchant/reviews`: Consola de opiniones con filtros de comprobante y publicador de respuestas oficiales.
* `/merchant/inbox`: Bandeja de Resolución directa con cronómetros SLA y propuesta de remedios.
* `/merchant/requests`: Gestor de campañas de invitación por WhatsApp y Email auditadas.
* `/merchant/insights`: Benchmarks contra percentiles de la industria mexicana y análisis de conversión.
* `/merchant/widgets`: Generador y personalizador de sellos dinámicos (Badge compacto, Sello flotante, Tarjeta de checkout, QR).
* `/merchant/integrations`: Conectores para Shopify, Tiendanube, WooCommerce, Webhooks REST y CSV.
* `/merchant/settings`: Vinculación de Cédula Fiscal SAT, DENUE CLEE y canal oficial de WhatsApp.

### 3. Widgets Embebidos
* `/widget/badge/[token]`: Sello compacto para barras de navegación y pie de página.
* `/widget/card/[token]`: Tarjeta flotante interactiva con desglose de 3 pilares.
* `/widget/reassurance/[token]`: Componente de tranquilidad para pasarela de checkout.

---

## 🔌 API REST (`/api/v1/`)

* `GET /api/v1/search?q=...`: Búsqueda instantánea con clasificación de estado de evidencia.
* `GET /api/v1/businesses/[slug]`: Pasaporte completo con identidades, fuentes oficiales y métricas vivas.
* `POST /api/v1/reviews`: Envío de reseñas con recálculo automático del pasaporte.
* `GET /api/v1/reviews?business_id=...`: Listado y filtrado de opiniones.
* `POST /api/v1/reviews/[id]/responses`: Respuesta oficial del comercio.
* `POST /api/v1/cases`: Apertura de expedientes de mediación y resolución.
* `GET /api/v1/cases/[id]`: Detalle del caso con hilo de mensajes.
* `PATCH /api/v1/cases/[id]`: Actualización y confirmación de satisfacción del consumidor.
* `POST /api/v1/cases/[id]/messages`: Mensajería directa entre consumidor y comercio.
* `POST /api/v1/order-events`: Ingesta de pedidos (Shopify, Tiendanube, API) para alimentar el denominador.
* `POST /api/v1/invitations`: Despacho de invitaciones auditadas.
* `GET /api/v1/widgets/[token]`: Payload firmado y validado para incrustación en tiendas externas.

---

## 🚀 Puesta en Marcha Local

```bash
# Instalar dependencias
pnpm install

# Migrar y sembrar base de datos Coolify
bun run scripts/migrate.ts
bun run scripts/seed.ts

# Compilar proyecto
pnpm build

# Iniciar servidor de producción
pnpm start -p 3005
```

---

## 🛡️ Aviso Legal y de Privacidad
Opinio.mx opera de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). No sustituye las facultades de la Procuraduría Federal del Consumidor (PROFECO) ni de las autoridades jurisdiccionales mexicanas.
