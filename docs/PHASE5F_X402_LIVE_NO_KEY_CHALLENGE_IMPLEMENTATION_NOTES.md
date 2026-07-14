# Phase 5F x402 Live No-Key Challenge Implementation Notes

PR #72 implements the default-off live no-key challenge path approved by the
PR #71 plan. Automated coverage is mocked-network only. This implementation
does not run or authorize live validation.

## Status

- Local stdio only.
- Default-off behind `STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY`.
- No API key in the x402 path.
- No proof input, storage, forwarding, verification, or payment-header path.
- No payment, spend, paid output, retry, resolver, pricing/catalog side call,
  public-resource side call, remote MCP, publication, or marketplace claim.
- The default/free, API-key paid, and existing x402 mock surfaces remain
  separate and count-stable.

## Config and mode separation

The live flag enables only for literal `true`. `false`, `0`, `no`, and `off`
disable it; ambiguous truthy values fail configuration. Live mode also requires
both existing x402 relay and challenge-execution flags to be literal `true`.
Missing prerequisites fail startup as `invalid_config` /
`x402_live_challenge_not_enabled`.

With the live flag absent or off, relay plus challenge execution remains the
existing deterministic mock-only mode. Proof forwarding set to true remains
unsupported. Any active x402 posture mixed with API-key paid exposure fails
closed before the API-key field is read. No mode falls back to another mode.

## Surface and registration

The live path reuses the existing nine paid semantic tool names. Counts remain:

| Mode | Tools | Resources | Prompts |
| --- | ---: | ---: | ---: |
| Default/free | 1 | 10 | 0 |
| API-key paid | 10 | 10 | 0 |
| x402 mock | 10 | 10 | 0 |
| x402 live no-key challenge | 10 | 10 | 0 |

Mock registrations retain their prior mock-only descriptions, closed-world
annotations, and `apiRequestSent: false` metadata. Live registrations instead
disclose that one external no-key GET may occur and use an open-world posture.
Their metadata states the one-request maximum and the no-key, no-proof,
no-payment-header, no-payment, no-spend, and no-paid-data boundaries.

## Request boundary

The dedicated client method accepts only an internal endpoint path, tool name,
validated query parameters, and the approved challenge header-name set. It:

- binds the request to the configured, reviewed Stock Trends API origin;
- rejects caller-supplied hosts and absolute URLs through the existing URL
  builder;
- sends one GET with safe `Accept` and `User-Agent` headers only;
- sets credentials to `omit`, redirect handling to `manual`, and sends no body;
- performs no retry or alternate request;
- observes approved response header names only and never reads their values;
- rejects malformed, negative, non-finite, or over-64-KiB declared
  `Content-Length` before body reads;
- consumes the response stream incrementally, aborting/cancelling as soon as
  accumulated bytes exceed 64 KiB even when the declaration is absent or
  dishonest;
- parses a bounded JSON object in memory only after the streaming cap passes;
  and
- records only endpoint path, tool name, method, and status in safe errors.

The live handler is the only x402 caller of this method. It performs no
instrument resolution, catalog reconciliation, public-resource read, or
API-key paid-path operation.

## Allowlist and symbol policy

The live path derives its allowlist from the existing nine auth-capable paid
GET policies and pins the exact list in tests. No public, catalog, resolver,
deferred, POST, decision/portfolio, Intelligence Agent, package, directory, or
marketplace route is reachable.

The ST-IM and indicators routes require canonical `symbol_exchange`. Raw
`symbol` and `symbol` plus `exchange` fail before reservation or network. The
canonical underscore form is translated to the API's established hyphen form
without any identity discovery or default exchange selection. Existing API-key
resolver behavior is unchanged when x402 flags are absent.

## Shape-only value policy and serialization

PR #64 approved response shape, not conditional live value safety. PR #72
therefore implements the plan's safest option: it relays no conditional values.

An accepted HTTP 402 response must have the exact approved header-name set,
top-level body-key set, field-category set, route binding, and approved nested
field map. Amounts use bounded positive decimal/numeric representations;
asset/network/rule/family fields use bounded identifiers; recipient/address
fields use a strict address-shaped string; expiry fields use positive integer
timestamps or calendar-valid UTC timestamps; challenge/correlation/nonce fields
use bounded identifiers; and accepted-method, pricing, and preview objects have
required fields plus exclusive recipient/address and expiry alternatives.
Wrong types, malformed values, missing required nested fields, or unexpected
nested material fail closed. Missing shape fails
`x402_live_challenge_unexpected_shape`; extra/unapproved paths, categories, or
types fail `x402_live_challenge_value_not_approved`.

The structured result contains only safe status, tool, route, method, approved
names/categories, and safety booleans. It has no conditional-values object and
no `api_data`. The `x-request-id` value is not read or returned. Live
`content[].text` is a fixed safe summary and never serializes the structured
result. Conditional response values therefore appear in neither structured
output nor text, errors, logs, or repository artifacts.

## Caps and loop prevention

Each server instance keeps in-memory live challenge reservations:

- one live challenge per tool per server session;
- three live challenges total per server session; and
- a recursively key-sorted signature over tool, route, GET method, and
  validated input.

Signature and cap reservation is synchronous before the first async boundary.
An identical signature fails `x402_live_challenge_repeated_call`; a per-tool or
session limit fails `x402_live_challenge_cap_exceeded`. A reservation remains
consumed after network, status, shape, or value failure. State resets on server
restart. There is no background, scheduled, bulk, pagination, sweep, retry, or
fallback behavior.

## Result and failure posture

An approved mocked HTTP 402 produces `payment_required` /
`x402_payment_required` with `challenge_source: api_no_key_live`,
`api_request_sent: true`, and every auth/payment/proof/spend/paid-output/retry
boolean false.

Success or paid-data-shaped output without proof is discarded and fails
`x402_live_challenge_paid_output_without_proof`. Non-402 status, redirect, and
network failure fail deterministically with no retry. Existing mock error codes
and result shape remain unchanged when the live flag is absent.

## Validation boundary

Tests inject the existing fetch seam and use synthetic, redacted fixtures only.
They inspect request origin/path/method/options/headers, all nine route mappings,
registration metadata, result serialization, value omission, cap behavior,
consumed failure reservations, proof/symbol/allowlist denials, and preservation
of mock and API-key surfaces. No test makes a live or credential-free Stock
Trends API request.
