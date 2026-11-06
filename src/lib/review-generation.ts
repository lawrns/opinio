import { createHash } from 'node:crypto';
import type { ReviewBrandConfig } from './review-brands';

export interface AcceptedFact {
  url: string;
  claim: string;
  source_excerpt: string;
  checked_at: string;
}

export interface AcceptedGeneration {
  verification_level: 'unverified_experience';
  content_origin: 'automated';
  humanized_at: string;
  rating: number;
  title: string;
  body: string;
  product_name: string | null;
  facts: AcceptedFact[];
}

export interface DuplicateCheck {
  body: string;
  recentBodies: readonly string[];
}

const FORBIDDEN = ['order_id', 'invitation_id', 'author_masked_contact', 'contact'] as const;
export const ENQUEUE_FRESHNESS_MS = 48 * 60 * 60 * 1000;
export const PUBLICATION_EVIDENCE_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

function reject(field: string, detail: string): never {
  throw new Error(`${field}: ${detail}`);
}

function normalizeText(value: string): string {
  return value.normalize('NFKC').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenSet(value: string): Set<string> {
  const tokens = normalizeText(value).split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 0);
  return new Set(tokens);
}

function timestamp(value: unknown, field: string): Date {
  if (typeof value !== 'string' && !(value instanceof Date)) reject(field, `${field} is required`);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) reject(field, `${field} is not a valid timestamp`);
  return date;
}

function trimmed(value: unknown, field: string): string {
  if (typeof value !== 'string') reject(field, `${field} must be text`);
  return value.trim();
}

function lengthBetween(value: string, field: string, min: number, max: number): void {
  if (value.length < min || value.length > max) reject(field, `${field} length is outside ${min}..${max}`);
}



function assertOfficialUrl(raw: string, brand: ReviewBrandConfig): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    reject('url', 'url is not a valid URL');
    return;
  }
  if (parsed.protocol !== 'https:') reject('url', 'url must use https');
  if (parsed.username !== '' || parsed.password !== '') reject('url', 'url must not include userinfo');
  if (parsed.port !== '' && parsed.port !== '443') reject('url', 'url port must be 443 or omitted');
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  const allowed = new URL(brand.officialOrigin).hostname.toLowerCase().replace(/\.$/, '');
  if (host !== allowed && !host.endsWith(`.${allowed}`)) reject('url', 'url host is not the official brand host');
}

function readFacts(value: unknown, brand: ReviewBrandConfig): AcceptedFact[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) reject('facts', 'facts must contain 1 to 5 items');
  return value.map((item) => {
    if (typeof item !== 'object' || item === null || !('url' in item) || !('claim' in item) || !('source_excerpt' in item) || !('checked_at' in item)) {
      reject('facts', 'facts must include url, claim, source_excerpt, and checked_at');
    }
    const url = trimmed(item.url, 'url');
    if (url.length === 0) reject('url', 'url is required');
    assertOfficialUrl(url, brand);
    const claim = trimmed(item.claim, 'claim');
    lengthBetween(claim, 'claim', 1, 500);
    const sourceExcerpt = trimmed(item.source_excerpt, 'source_excerpt');
    lengthBetween(sourceExcerpt, 'source_excerpt', 1, 2000);
    const normalizedClaim = normalizeText(claim);
    if (normalizedClaim.length === 0 || !normalizeText(sourceExcerpt).includes(normalizedClaim)) {
      reject('claim', 'claim is not supported by source_excerpt');
    }
    const checkedAt = timestamp(item.checked_at, 'checked_at');
    return {
      url,
      claim,
      source_excerpt: sourceExcerpt,
      checked_at: checkedAt.toISOString(),
    };
  });
}

export function validateGenerationInput(input: Record<string, unknown>, brand: ReviewBrandConfig): AcceptedGeneration {
  for (const field of FORBIDDEN) {
    if (field in input && input[field] != null) reject(field, `${field} is not allowed on a generated review`);
  }
  if (input.verification_level !== 'unverified_experience') {
    reject('verification_level', 'verification_level must be unverified_experience');
  }
  if (input.content_origin !== 'automated') reject('content_origin', 'content_origin must be automated');
  if (!('humanized_at' in input)) reject('humanized_at', 'humanized_at is required');
  const humanizedAt = timestamp(input.humanized_at, 'humanized_at');
  if (typeof input.rating !== 'number' || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    reject('rating', 'rating must be an integer from 1 to 5');
  }
  const title = trimmed(input.title, 'title');
  lengthBetween(title, 'title', 1, 255);
  const body = trimmed(input.body, 'body');
  lengthBetween(body, 'body', 5, 4000);
  let productName: string | null = null;
  if ('product_name' in input && input.product_name != null) {
    productName = trimmed(input.product_name, 'product_name');
    lengthBetween(productName, 'product_name', 1, 200);
  }
  const facts = readFacts(input.facts, brand);
  for (const fact of facts) {
    if (humanizedAt.getTime() < new Date(fact.checked_at).getTime()) {
      reject('humanized_at', 'humanized_at must be at or after every fact checked_at');
    }
  }
  return {
    verification_level: 'unverified_experience',
    content_origin: 'automated',
    humanized_at: humanizedAt.toISOString(),
    rating: input.rating,
    title,
    body,
    product_name: productName,
    facts,
  };
}

export function assertCurrentGeneration(
  input: { humanized_at: string; facts: readonly { checked_at: string }[] },
  now: Date,
): void {
  const latest = now.getTime();
  const earliest = latest - ENQUEUE_FRESHNESS_MS;
  const humanized = timestamp(input.humanized_at, 'humanized_at').getTime();
  if (humanized < earliest || humanized > latest) {
    reject('humanized_at', 'humanized_at must be current within 48 hours');
  }
  for (const fact of input.facts) {
    const checked = timestamp(fact.checked_at, 'checked_at').getTime();
    if (checked < earliest || checked > latest) {
      reject('checked_at', 'checked_at must be current within 48 hours');
    }
  }
}

export function contentDedupKey(slug: string, title: string, body: string): string {
  const material = [slug, title, body].map((part) => normalizeText(part)).join('\n');
  return createHash('sha256').update(material).digest('hex');
}

export function assertNotDuplicate(input: DuplicateCheck): void {
  const candidate = tokenSet(input.body);
  for (const recent of input.recentBodies) {
    const other = tokenSet(recent);
    if (candidate.size === 0 && other.size === 0) throw new Error('duplicate review text');
    if (candidate.size === 0 || other.size === 0) continue;
    let intersection = 0;
    for (const token of candidate) {
      if (other.has(token)) intersection += 1;
    }
    const union = candidate.size + other.size - intersection;
    if (intersection * 20 >= union * 17) throw new Error('duplicate review text');
  }
}
