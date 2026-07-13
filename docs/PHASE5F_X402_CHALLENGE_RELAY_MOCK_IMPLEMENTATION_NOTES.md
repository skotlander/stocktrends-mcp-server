# Phase 5F x402 Challenge Relay Mock Implementation Notes

PR #66 is the first runtime implementation step for the x402 relay track. It is
mock-only and internal-only.

## Status

- Mock-only implementation.
- x402 relay remains default-off.
- No live Stock Trends API call is performed by this implementation.
- No credential-free Stock Trends API call is performed for x402 relay behavior.
- No API key is used, requested, inspected, printed, logged, or stored by the
  x402 mock relay path.
- No proof forwarding is implemented.
- No payment header is constructed.
- No payment proof is created, accepted for forwarding, forwarded, stored, or
  verified.
- No wallet, private key, seed phrase, signing, settlement, or verification
  logic is added.
- No spend occurs.
- No remote MCP transport is added.
- No public MCP prompt is added.
- No public MCP resource is added.
- Public MCP tool count is unchanged.

## Config Flags

The provisional flags added in PR #66 are:

- `STOCKTRENDS_ENABLE_X402_RELAY`
- `STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION`
- `STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING`

All default to off. Only literal `true` enables the first two flags. The values
`false`, `0`, `no`, and `off` disable them. Ambiguous truthy values such as
`1`, `yes`, `on`, or arbitrary non-empty strings fail startup with
`invalid_config`.

`STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING=true` fails startup because proof
forwarding is unsupported in this mock-only build. Off values are accepted only
to keep disabled/default-off configuration explicit.

x402 relay flags cannot be combined with `STOCKTRENDS_ENABLE_PAID_TOOLS` in this
PR. That mixed mode fails closed with `invalid_config` /
`x402_mixed_mode_invalid` before the x402 path can run.

## Implementation Shape

The implementation adds an internal x402 relay helper. It does not register a
new MCP tool, does not expose x402 behavior to MCP clients, and does not alter
the current API-key paid execution path.

The helper can normalize a mocked HTTP `402` payment-required fixture shaped like
the PR #64 verification report:

- headers by name only: `payment-required`, `x-request-id`,
  `x-stocktrends-payment-required`,
  `x-stocktrends-accepted-payment-methods`, and
  `x-stocktrends-pricing-rule`;
- top-level body keys: `accepted_payment_methods`, `detail`, `error`,
  `payment_required`, `pricing`, `protocol`, `resource`, and
  `stocktrends_preview`;
- field categories: amount, asset, network, recipient/address,
  expiry/expires_at, correlation/challenge id/nonce, accepted payment methods,
  and pricing rule/family.

The normalized result is a structured `payment_required` object with
`error_code: "x402_payment_required"` and shape-only challenge metadata. Raw
challenge values are not relayed.

Safety metadata is always false for spend-bearing or credential-bearing actions:

- `paid_execution_occurred=false`
- `api_request_sent=false`
- `auth_header_sent=false`
- `payment_header_sent=false`
- `proof_forwarded=false`
- `spend_occurred=false`
- `paid_api_data_returned=false`

No `api_data` is returned from the mock challenge result.

## Allowlist

The x402 relay allowlist is exactly the same nine auth-capable paid routes:

- `/v1/stim/latest`
- `/v1/stim/history`
- `/v1/indicators/latest`
- `/v1/indicators/history`
- `/v1/selections/latest`
- `/v1/market/regime/latest`
- `/v1/market/regime/history`
- `/v1/breadth/sector/latest`
- `/v1/leadership/summary/latest`

Non-allowlisted routes fail closed with `x402_route_not_allowlisted` before any
request or action. Because the helper is internal-only in this PR, repeated-call
and loop posture is recorded as deferred until public tool wiring; no fetch,
payment, or spend can loop through this mock-only path.

## Proof Forwarding

Proof forwarding is not implemented. Any proof/envelope-like input fails closed
with `x402_proof_forwarding_not_enabled`. Mock fixtures containing proof-like
material fail closed with `x402_secret_safety_violation`.

Future proof forwarding remains blocked pending API/server confirmation of the
proof header/body shape, challenge binding, expiry, replay behavior, and
success/error contract.

## Redaction

The redaction layer now covers proof/payment/header/wallet-like values, including
payment proof/envelope names, payment headers, x402 proof labels, challenge IDs,
nonces, recipient/address labels, wallet-address labels, seed phrases, and
private-key labels.

## Validation Boundary

Automated validation for this PR is mock-only. It must not run MCP Inspector,
live x402 execution, paid validation, proof forwarding, remote MCP, or live
Stock Trends endpoint calls.
