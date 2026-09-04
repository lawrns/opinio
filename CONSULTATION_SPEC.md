# Opinio.mx Architecture & Consultation Synthesis
**Date:** 2026-09-04  
**Parties:** Lead Architect, Fable (Product & UX Director), Grok (Systems & Database Architect)  
**Target:** https://github.com/lawrns/opinio | Database on Coolify `82.208.21.221:15437`

---

## 1. Fable’s Product & UX Directives
1. **The Core Thesis:** "La confianza se demuestra." Mexico doesn't need another generic review directory where merchants buy 5-star badges. It needs an independent commercial trust passport for commerce outside marketplaces (Shopify, Tiendanube, WhatsApp, SPEI, Instagram).
2. **Three Proof Pillars:**
   - **Existe:** Legal entity, RFC format, DENUE establishment data, verified WhatsApp, verified domain.
   - **Cumple:** Denominator-based trust! Invitation Coverage % (e.g., 93% of orders invited) + Issues per 1,000 orders.
   - **Resuelve:** What happens when things break: Consumer-confirmed resolution rate (not merchant assertions!), response time SLA.
3. **Consumer Verification Hook:** "Verificar antes de transferir" — Instant lookup by business name, WhatsApp number, website URL, social handle, or payment link.
4. **Merchant Operating System:** Not reputation management, but ROI: conversion lift, operational bottleneck identification, resolution workflow that prevents chargebacks and PROFECO complaints.

---

## 2. Grok’s Systems & Data Directives
1. **Coolify PostgreSQL 16:** Hosted on `82.208.21.221:15437` with persistent volumes and proxy routing under Coolify project `opinio`.
2. **Mathematical Bayesian Scoring Engine:**
   - Review score $x_i = 25(s_i - 1)$
   - Weights $w_i = v_i \times d_i \times q_i$, with verification levels $v_i \in [0.35, 1.0]$, recency half-life $d_i = \max(0.25, 2^{-age/365})$, and integrity bound $q_i \in [0.70, 1.15]$.
   - Experience Score $E = \frac{C m + \sum w_i x_i}{C + \sum w_i}$ with prior $C=20$, category baseline $m$.
   - Resolution Score $R = 0.40(\text{confirmed}) + 0.25(\text{response}) + 0.20(\text{speed}) + 0.15(1 - \text{reopen})$.
   - Effective Sample Size $n_{eff} = \frac{(\sum w_i)^2}{\sum w_i^2}$.
3. **Auditability & Integrity:** Append-only history, HMAC-signed widgets, strict commercial firewall (paying tier NEVER alters trust score).

---

## 3. Lead Architect’s Implementation Plan
- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React, Framer Motion.
- **ORM & Database:** Drizzle ORM + node-postgres / pg connecting to Coolify PostgreSQL.
- **Surfaces:**
  - Consumer Portal (`/`, `/verificar`, `/b/[slug]`, `/escribir-opinion/[slug]`, `/caso/[id]`)
  - Merchant Operating Center (`/merchant`, `/merchant/reviews`, `/merchant/inbox`, `/merchant/requests`, `/merchant/insights`, `/merchant/widgets`, `/merchant/integrations`, `/merchant/settings`)
  - Signed Embeddable Widgets (`/widget/badge/[token]`, `/widget/card/[token]`, `/widget/reassurance/[token]`)
  - Full REST API (`/api/v1/...`) with order ingestion, invitation dispatch, case resolution, and seed capabilities.
