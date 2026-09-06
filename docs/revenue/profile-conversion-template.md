# Profile Conversion & Trust Architecture Template

## 1. Core User Intent on Store Passport (`/b/[slug]`)
When a consumer lands on an Opinio passport page via Google ("¿Es confiable [Marca]?", "¿Es seguro comprar en [Marca]?", "Opiniones [Marca] México"), they are in a high-intent decision gate:
**"Should I transfer / pay this merchant right now?"**

## 2. Seven Mandatory Information Gates
Every passport page must immediately answer these seven trust dimensions before the fold:
1. **Identity Proof**:
   - Official Folio Number (`OP-000000`)
   - Official Legal Name (`legal_name`) and Brand Name (`brand_name`)
   - Validated SAT Tax Identifier (`rfc`) or explicit status if pending
2. **Official Public Verification**:
   - PROFECO Virtual Store Monitoring & Consumer Bureau complaint audit
   - Domain match check (`domain` verified against registered merchant)
3. **Location & Delivery Scope**:
   - Declared operating jurisdiction (`operating_area`)
4. **Independent Trust Score**:
   - 0–100 algorithmic score based on dispute rate, response latency, and evidence weighting
5. **Audited Customer Voice**:
   - Average star rating out of 5
   - Total published reviews with verification tier badge (e.g. `Pago confirmado`, `Pedido confirmado`)
6. **Dispute Resolution Speed**:
   - Median response time in hours/minutes
   - Percentage of customer claims resolved favorably
7. **Actionable Conversion & Remediation Next Steps**:
   - **For Consumers**: "Escribir una opinión" or "Reportar un problema / Abrir caso"
   - **For Merchants**: "Reclamar este perfil comercial" (Inbound merchant acquisition hook)

## 3. Merchant Claim Conversion Path
- Unclaimed profiles display a prominent verified credential claiming CTA for business owners.
- Business verification captures:
  - Corporate email / WhatsApp confirmation
  - Constancia de Situación Fiscal (CSF) upload
  - Access to merchant dashboard (`/merchant`) for managing customer replies, API order sync, and official trust badges.
