# Opinio.mx Anti-Slop Architectural Diagnosis & Upgrade Plan
**Parties:** Fable 5.1 (Product & UX / Lane C Director), Grok (Systems Architect), Lead Engineer  
**Date:** 2026-09-04  
**Target:** Elimination of all vibe-coded artifacts, enforcement of anti-slop rules, and implementation of cunning, high-craft light-mode styling.

---

## 1. The Root Cause Diagnosis: Why the Page Felt "Vibe-Coded"

| Symptom Identified by User | Root Cause in Current Code | Anti-Slop Directive |
| :--- | :--- | :--- |
| **"Random icon colors, shitty icon pack"** | Use of literal emojis (`🛋️`, `📱`, `💍`, `👗`) in category buttons and random Tailwind rainbow classes (`text-blue-600`, `text-purple-600`, `text-amber-600`) across neighboring elements. | **Rule 3.C & 3.D:** Total ban on emojis as UI icons. Install `@phosphor-icons/react` with unified `1.75px` stroke. Enforce **Color Consistency Lock (Rule 4.2)**: single emerald trust accent (`#00B67A`), supported strictly by deep slate/charcoal neutrals. |
| **"Vibe-coded cards instead of high quality"** | Repetitive flat cards (`border border-gray-200 rounded-2xl bg-white p-5`) with no textural materiality, no micro-typography, and generic spacing. | **Rule 4.4 & 10:** Layered micro-geometry: inset hairline highlights (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.8)`), subtle paper elevation, strict tabular numerals (`font-mono tabular-nums`), and bespoke ledger receipts for denominator metrics. |
| **"Nothing beautifully animated from 21st.dev / mobbin"** | Zero motion primitives: static tabs, static cards, zero spring physics, static progress lines. | **Rule 5 & Motion (motion/react):** Implement buttery spring physics on pill switches, interactive hover lift with coordinate dampening, animated radial gauges, and real-time interactive CLABE/SPEI validation. |

---

## 2. Upgrade Architecture & Action Items

### A. Iconography & Color Lock
- Install `@phosphor-icons/react`.
- Eliminate every single emoji glyph across the entire codebase.
- Color lock:
  - Base canvas: `#FCFBF3` (Warm organic Trustpilot cream)
  - Card sheets: `#FFFFFF`
  - Inset rules: `#EBEAE1` / `#E5E7EB`
  - Primary ink: `#121511` (19.8:1 contrast ratio)
  - Accent: `#00B67A` (Emerald trust green)
  - Secondary: `#2050E6` (Cobalt for interactive action)

### B. High-Craft Cunning Cards
- Re-architect business cards into **Audited Commercial Passports**:
  - Top folio strip with country of origin (`MX`), verified legal classification, and RFC stamp.
  - Distinctive star rating tiles using pure geometric green squares with crisp white star cuts.
  - **The Denominator Ledger Box**: An inset recessed module showing exact verified vs observed order fractions (`13,911 / 14,821 pedidos auditados`).
  - Tactile micro-hover effects (`scale-[1.01]`, border highlight, shadow tint).

### C. Motion & Micro-Interactions
- Use `motion/react` for:
  - Smooth spring transitions between category filters.
  - Animated floating search capsule with active expansion.
  - Live interactive SPEI CLABE validator that parses bank codes (e.g., `012` -> BBVA México, `002` -> Citibanamex) in real time with spring-animated status badges.
