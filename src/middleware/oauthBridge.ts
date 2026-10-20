/**
 * OAuth Bridge Middleware for /mcp
 * No express dependency - works with Express, Fastify, or Node http
 * Plugs into existing streamable-http transport
 */

import { verifyAndMapToken } from '../auth/oauth.js';

export interface StockTrendsContext {
  apiKey?: string;
  sub?: string;
  tier?: string;
  enablePaidTools: boolean;
}

// Generic middleware signature - compatible with Express and other frameworks
export async function oauthBridgeMiddleware(req: any, _res: any, next: any) {
  const enabled = process.env.STOCKTRENDS_OAUTH_ENABLED === 'true';

  if (!enabled) {
    req.stocktrendsContext = { enablePaidTools: false } as StockTrendsContext;
    return next();
  }

  const authHeader = req.headers?.authorization as string | undefined;
  const identity = await verifyAndMapToken(authHeader);

  if (identity.apiKey) {
    req.stocktrendsContext = {
      apiKey: identity.apiKey,
      sub: identity.sub,
      tier: identity.tier,
      enablePaidTools: true,
    } as StockTrendsContext;
    req.STOCKTRENDS_API_KEY = identity.apiKey;
    console.log(`[oauth] mapped sub=${identity.sub} tier=${identity.tier} -> paid tools enabled`);
  } else {
    req.stocktrendsContext = {
      sub: identity.sub,
      tier: identity.tier || 'free',
      enablePaidTools: false,
    } as StockTrendsContext;
    if (identity.sub) {
      console.log(`[oauth] valid token sub=${identity.sub} but no subscription -> free mode`);
    }
  }

  next();
}
