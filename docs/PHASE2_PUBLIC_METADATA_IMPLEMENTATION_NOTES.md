# Phase 2 Public Metadata Implementation Notes

Implementation date: 2026-07-07

## Resources Added

The static public resource registry now includes these Phase 2 resources:

| MCP resource URI | Backing endpoint | No-key verification |
| --- | --- | --- |
| `stocktrends://methodology/indicators` | `GET /v1/meta/indicators` | `200 application/json` |
| `stocktrends://methodology/inference` | `GET /v1/meta/inference` | `200 application/json` |
| `stocktrends://pricing/catalog` | `GET /v1/pricing/catalog` | `200 application/json` |
| `stocktrends://proof/market-edge` | `GET /v1/ai/proof/market-edge` | `200 application/json` |

The pricing catalog is exposed only as public planning metadata. The market-edge proof endpoint is exposed only as a static public resource; it is not registered as an MCP tool and does not enable paid calls, x402 handling, wallet behavior, or payment retries.

## Candidates Excluded

| Candidate resource URI | Backing endpoint | No-key verification | Decision |
| --- | --- | --- | --- |
| `stocktrends://intelligence/discovery` | `GET /v1/intelligence/discovery` | `503 application/json` | Excluded until healthy public no-key behavior is confirmed. |
| `stocktrends://intelligence/editorial/latest/preview` | `GET /v1/intelligence/editorial/latest/preview` | `503 application/json` | Excluded until healthy public no-key behavior is confirmed. |

## Preserved Safety Posture

- Local stdio transport only.
- Public resources only.
- Zero MCP tools.
- Zero MCP prompts.
- No API key required, read, logged, sent, or forwarded.
- No `Authorization` or `X-API-Key` headers.
- No paid endpoint resources, paid tools, x402 runtime, wallet handling, OAuth, remote MCP transport, database access, control-plane access, Intelligence Agent recomputation, or parallel reasoning layer.
- Resources remain fetch-on-request and fail closed on API errors, malformed JSON, redirects, auth/payment responses, and invalid configuration.
