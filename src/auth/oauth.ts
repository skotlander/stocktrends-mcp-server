/**
 * OAuth 2.0 JWT verification for Stock Trends MCP
 * Preserves Phase 5A security model: exposure vs execution remain separate gates
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

const ISSUER = process.env.STOCKTRENDS_OAUTH_ISSUER;
const AUDIENCE = process.env.STOCKTRENDS_OAUTH_AUDIENCE;
const JWKS_URI = process.env.STOCKTRENDS_OAUTH_JWKS_URI;

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!JWKS) {
    if (!JWKS_URI) throw new Error('STOCKTRENDS_OAUTH_JWKS_URI not set');
    JWKS = createRemoteJWKSet(new URL(JWKS_URI));
  }
  return JWKS;
}

const SUBSCRIPTION_MAP = new Map<string, { apiKey: string; tier: string }>();

if (process.env.STOCKTRENDS_OAUTH_DEMO_SUB && process.env.STOCKTRENDS_API_KEY) {
  SUBSCRIPTION_MAP.set(process.env.STOCKTRENDS_OAUTH_DEMO_SUB, {
    apiKey: process.env.STOCKTRENDS_API_KEY,
    tier: 'pro',
  });
}

export interface MappedIdentity {
  apiKey?: string;
  sub?: string;
  tier?: string;
  payload?: JWTPayload;
}

export async function verifyAndMapToken(authHeader?: string): Promise<MappedIdentity> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {};
  }

  if (!ISSUER || !AUDIENCE) {
    console.warn('[oauth] ISSUER/AUDIENCE not configured, falling back to free mode');
    return {};
  }

  const token = authHeader.slice(7).trim();
  if (!token) return {};

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const sub = payload.sub;
    if (!sub) return {};

    const customApiKey =
      (payload as any).stocktrends_api_key ||
      (payload as any)['https://stocktrends.com/api_key'] ||
      (payload as any).apiKey;

    const mapped = SUBSCRIPTION_MAP.get(sub);
    const apiKey = mapped?.apiKey || customApiKey;
    const tier = mapped?.tier || (payload as any).stocktrends_tier || 'free';

    if (!apiKey) {
      return { sub, payload, tier: 'free' };
    }

    return { apiKey, sub, tier, payload };
  } catch (err) {
    console.warn('[oauth] verify failed:', (err as Error).message);
    return {};
  }
}

export function __setMapping(sub: string, data: { apiKey: string; tier: string }) {
  SUBSCRIPTION_MAP.set(sub, data);
}
export function __clearMapping() {
  SUBSCRIPTION_MAP.clear();
}
