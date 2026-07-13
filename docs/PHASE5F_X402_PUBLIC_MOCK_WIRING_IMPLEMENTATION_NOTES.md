# Phase 5F x402 Public Mock Wiring Implementation Notes

PR #69 implements Option B from the PR #68 public wiring design memo.

## Status

- Mock-only public MCP wiring.
- Default-off.
- Local stdio only.
- No live Stock Trends API call, including credential-free calls.
- No API key use, request, inspection, logging, or storage in the x402 path.
- No resolver lookup.
- No proof schema, proof storage, proof forwarding, or proof verification.
- No auth header or payment header construction.
- No payment, spend, paid output, automatic retry, or remote MCP.
- No new MCP tool name, prompt, resource, route promotion, or pricing mirror.
- Existing API-key paid execution remains unchanged when x402 flags are absent.

## Public surface

Default/free mode remains one tool, ten resources, and zero prompts. API-key
paid exposure remains ten tools when its existing gates are satisfied.

When `STOCKTRENDS_ENABLE_X402_RELAY=true`, the server exposes the public
planning tool plus the same nine paid semantic tools already used by API-key
mode:

1. `stocktrends_get_stim_latest`
2. `stocktrends_get_stim_history`
3. `stocktrends_get_indicators_latest`
4. `stocktrends_get_indicators_history`
5. `stocktrends_get_selections_latest`
6. `stocktrends_get_market_regime_latest`
7. `stocktrends_get_market_regime_history`
8. `stocktrends_get_breadth_sector_latest`
9. `stocktrends_get_leadership_summary_latest`

The existing strict input schemas are reused directly. No x402-specific tool
names or proof input fields are added.

## Config and mode separation

The three PR #66 flags remain strict and default-off:

- `STOCKTRENDS_ENABLE_X402_RELAY`
- `STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION`
- `STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING`

Only literal `true` enables relay or mock challenge behavior. Ambiguous truthy
values fail startup. Challenge behavior requires relay exposure. Proof
forwarding true remains unsupported and fails startup.

Any active relay posture combined with `STOCKTRENDS_ENABLE_PAID_TOOLS=true`
fails startup as `invalid_config` / `x402_mixed_mode_invalid` before the API-key
field is read. There is no fallback or precedence between modes.

## Invocation behavior

Relay exposure without challenge behavior lists the nine semantic paid tools,
but each invocation fails closed locally with `x402_challenge_unavailable`.

Relay plus challenge behavior returns the PR #66 local mock challenge result.
The result is deterministic and includes:

- `status: payment_required`
- `error_code: x402_payment_required`
- `api_status: 402`
- tool, route, and `GET` method identity
- the approved PR #64 challenge header-name set
- the approved PR #64 top-level body-key set
- the approved PR #64 field-category set
- redacted shape-only placeholders, never live challenge values
- all authorization, execution, request, auth, payment, proof, spend, paid-data,
  and automatic-retry safety booleans set to false

No `api_data` field is returned.

## Allowlist and resolver boundary

The public mock registrations are derived from the existing auth-capable paid
policy and remain limited to exactly its nine approved `GET` routes. Public
resources, pricing, instrument discovery, deferred routes, POST routes,
decision/portfolio routes, Intelligence Agent routes, and distribution routes
are excluded.

The four ST-IM/indicators tools require canonical `symbol_exchange` in mock
challenge mode. Raw-symbol and symbol-plus-exchange inputs fail closed with
`x402_symbol_exchange_required` before any resolver or client path. API-key
mode retains its existing resolver behavior because these mock registrations do
not exist when x402 flags are absent.

## Repeated-identical posture

Each server instance keeps an in-memory normalized signature set for public
mock challenges. The signature contains tool, route, method, and recursively
key-sorted validated input. It is reserved before the local mock result is
returned. A second identical call in the same session fails closed with
`x402_repeated_challenge_call`.

The state is in-memory only and resets on server restart. No challenge value,
proof, payment material, paid output, or spend state is stored.

## Validation boundary

Automated validation is mock-only and uses the in-memory MCP transport with a
fetch spy that must remain uncalled. It covers the four surface modes, all nine
public mock invocations, exact result metadata, no resolver/network behavior,
proof-like input rejection, allowlist failure, paid-output-without-proof
failure, repeated-identical denial, config parsing, and preservation of the
existing API-key paid test suite.

No MCP Inspector, runbook, live endpoint, live x402 flow, paid validation,
payment/proof activity, remote MCP, package publication, or marketplace action
is part of this implementation or its validation.
