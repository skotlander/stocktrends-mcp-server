# OAuth Bridge for Meta AI Connectors

## Overview
This bridge adds optional OAuth 2.0 JWT verification in front of `/mcp` for Meta AI Connectors, while preserving x402 flow for Claude/Cursor.

## Why
- Meta AI consumer app has no user-configurable MCP. Must go through Connectors program (curated).
- x402 cannot settle on consumer host (no wallet). Need identity (OAuth), not payment rail.
- Existing server already has correct security: free mode refuses API key, exposure vs execution separate gates.

## Configuration

```ini
STOCKTRENDS_OAUTH_ENABLED=false # set true to enable bridge
STOCKTRENDS_OAUTH_ISSUER=https://clerk.stocktrends.com/
STOCKTRENDS_OAUTH_AUDIENCE=https://mcp.stocktrends.com
STOCKTRENDS_OAUTH_JWKS_URI=https://clerk.stocktrends.com/.well-known/jwks.json
# For local demo:
STOCKTRENDS_OAUTH_DEMO_SUB=demo_user_123
STOCKTRENDS_API_KEY=st_test_xxx
```

## Clerk Setup (15 min)

1. Create Clerk app, domain `auth.stocktrends.com`
2. Create JWT Template `stocktrends_mcp`:
```json
{
  "aud": "https://mcp.stocktrends.com",
  "iss": "https://clerk.stocktrends.com",
  "sub": "{{user.id}}",
  "stocktrends_api_key": "{{user.public_metadata.stocktrends_api_key}}",
  "stocktrends_tier": "{{user.public_metadata.stocktrends_tier}}"
}
```
3. When user subscribes, set public_metadata via Clerk API:
```ts
await clerk.users.updateUserMetadata(clerkUserId, {
  publicMetadata: { stocktrends_api_key: stApiKey, stocktrends_tier: 'pro' }
});
```

## Auth0 Alternative

Create API `https://mcp.stocktrends.com`, add Action:
```js
exports.onExecutePostLogin = async (event, api) => {
  const apiKey = event.user.app_metadata?.stocktrends_api_key;
  if (apiKey) api.accessToken.setCustomClaim('https://stocktrends.com/api_key', apiKey);
};
```

## How it plugs into existing server

In `src/server.ts` or wherever you create express app for streamable-http:

```ts
import { oauthBridgeMiddleware } from './middleware/oauthBridge.js';

app.use('/mcp', oauthBridgeMiddleware);
// existing MCP handler follows
```

In tool execution, read API key from request context first, then env:

```ts
const apiKey = (req as any).STOCKTRENDS_API_KEY || process.env.STOCKTRENDS_API_KEY;
```

## Security preserved

- Default: credential-free, refuses API key
- Paid exposure: requires ENABLE_PAID_TOOLS=true + API_KEY (now from OAuth mapping)
- Paid execution: requires ENABLE_PAID_EXECUTION=true + pricing preflight + caps + budget
- No global env mutation per-request
- Fails open to free mode for discovery, closed for paid tools

## Testing

```bash
# Free mode
curl https://mcp.stocktrends.com/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Premium (with JWT)
curl https://mcp.stocktrends.com/mcp -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## For MCP Registry

Update server.json with auth block (see /mnt/data/server-oauth.json), then:

```bash
npx mcp-publisher publish
```
