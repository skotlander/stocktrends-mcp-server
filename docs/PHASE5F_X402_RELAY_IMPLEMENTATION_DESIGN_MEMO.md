# Phase 5F x402 Relay Implementation Design Memo

This memo is a docs-only implementation design and contract memo for a future
Stock Trends MCP Server x402 relay path. It follows the Phase 5F architecture
memo, the contract verification plan, and the challenge-only verification
report. It does not implement the relay.

## 1. Status

- **Docs-only implementation design / contract memo.**
- **No implementation.** No `src/`, `tests/`, `package.json`, or
  `package-lock.json` change is authorized by this memo.
- **No validation.** This document records a future design only.
- **No live calls.**
- **No credential-free calls.**
- **No API key.** No API key is used, requested, inspected, printed, logged, or
  stored.
- **No x402 execution.**
- **No payment proof.**
- **No proof forwarding.**
- **No payment.**
- **No spend.**
- **No wallet/private key.**
- **No payment header.**
- **No remote MCP.**
- **No MCP Inspector.**
- **No package publication.**
- **No directory submission.**
- **No marketplace launch.**

This memo may be used as design input for a later reviewed PR. It does not, by
itself, authorize runtime implementation, challenge execution, proof forwarding,
or any paid activity.

## 2. Design Objective

This memo defines a concrete future implementation design for an x402 relay path
while preserving the non-custodial relay posture selected in PR #62.

The design objectives are:

- use PR #64's verified no-key challenge shape as the evidence base for a
  future challenge-relay result;
- keep Stock Trends API as the payment, pricing, challenge, settlement,
  verification, and metering authority;
- keep the MCP server as a thin relay / protocol translator, not a wallet and
  not a payment authority;
- split the verified challenge-relay contract from unverified proof/envelope
  forwarding;
- prepare for a future mock-only implementation PR;
- avoid any claim that proof/envelope forwarding is ready before API
  documentation or server-side confirmation exists;
- preserve the current API-key path and current default/free surface; and
- avoid authorizing runtime implementation from this memo alone.

## 3. Evidence Base

The design rests on the following reviewed Phase 5F chain:

- **PR #62: Phase 5F x402 relay architecture memo.** It selected the first
  architecture target as non-custodial MCP-as-relay / protocol-translator, with
  the Stock Trends API and payment facilitator remaining authoritative for
  pricing, challenge issuance, settlement, verification, and metering.
- **PR #63: Phase 5F x402 contract verification plan.** It authorized a
  challenge-only verification plan for the nine current auth-capable paid
  routes, with no API key, no payment proof, no spend, and no paid output.
- **PR #64: Phase 5F x402 contract verification report.** It verified that all
  nine allowlisted paid routes returned no-key HTTP `402` payment-required
  challenges with a consistent shape at the authorized status/header-name/
  top-level-key level. PR #64 did not verify proof/envelope forwarding details.

The current baseline remains **1/10/10/0/9**:

- default/free mode: exactly 1 tool;
- paid-exposed mode: exactly 10 tools;
- public resources: exactly 10;
- prompts: exactly 0;
- auth-capable paid routes: exactly 9.

The nine auth-capable paid routes checked by PR #64 were:

| Route | Existing paid tool family |
| --- | --- |
| `/v1/stim/latest` | ST-IM latest |
| `/v1/stim/history` | ST-IM history |
| `/v1/indicators/latest` | indicators latest |
| `/v1/indicators/history` | indicators history |
| `/v1/selections/latest` | selections latest |
| `/v1/market/regime/latest` | market regime latest |
| `/v1/market/regime/history` | market regime history |
| `/v1/breadth/sector/latest` | breadth sector latest |
| `/v1/leadership/summary/latest` | leadership summary latest |

PR #64 found consistent relevant response header names:

- `payment-required`
- `x-request-id`
- `x-stocktrends-payment-required`
- `x-stocktrends-accepted-payment-methods`
- `x-stocktrends-pricing-rule`

PR #64 found consistent top-level challenge body keys:

- `accepted_payment_methods`
- `detail`
- `error`
- `payment_required`
- `pricing`
- `protocol`
- `resource`
- `stocktrends_preview`

PR #64 found the following challenge field categories present by key name:

- amount
- asset
- network
- recipient/address
- expiry/expires_at
- correlation/challenge id/nonce
- accepted payment methods
- pricing rule/family

The proof/envelope requirements remain unresolved. PR #64 did not infer the
exact proof header name, proof body/envelope location, challenge-correlation
binding, expiry behavior, replay/stale proof behavior, success envelope, or
error codes for malformed or rejected proof.

## 4. Current Baseline Preserved

The future relay design must preserve the current MCP baseline unless a later
reviewed PR explicitly changes it:

- default/free mode remains exactly 1 tool;
- paid-exposed mode remains exactly 10 tools;
- public resources remain exactly 10;
- prompts remain exactly 0;
- auth-capable paid routes remain exactly 9;
- transport remains local stdio only;
- the current paid path remains `X-API-Key` subscription/API-key mode;
- there is no current x402 relay implementation;
- there is no remote or hosted MCP transport; and
- there is no final listing, directory submission, or marketplace launch.

The x402 relay is additive future work. It must not disturb default/free mode or
the existing API-key paid path.

## 5. Proposed Future Mode Model

The future mode model should stay explicit and fail closed:

- **Free mode unchanged.** Default/free mode remains credential-free and exposes
  the current one public planning tool plus the current public resources.
- **API-key paid mode unchanged.** Existing paid exposure and paid execution
  remain governed by their current API-key, pricing, cap, and loop gates.
- **x402 relay mode separate and explicit.** Relay behavior is not inferred from
  the absence of an API key or from the presence of paid tools.
- **No automatic mixed mode.** API-key mode and x402 relay mode are separate
  operator choices. Ambiguous combinations fail closed.
- **Default off.** Every relay gate is off unless explicitly enabled in a later
  implementation.
- **Exposure does not imply execution.** Making relay-capable tools visible
  must not trigger challenge calls, proof forwarding, paid output, or spend.
- **Proof forwarding not enabled until separately confirmed.** Proof forwarding
  requires API documentation or server-side confirmation plus a later reviewed
  implementation decision.
- **Invalid combinations fail closed.** Ambiguous, partial, or contradictory
  configuration must produce deterministic local errors before any request.
- **No route/tool count increase unless separately approved.**

Candidate flags below are provisional discussion labels only, not final
environment variable names:

- `STOCKTRENDS_X402_RELAY_EXPOSURE` - whether the existing paid tools may expose
  an x402 relay posture.
- `STOCKTRENDS_X402_CHALLENGE_EXECUTION` - whether an explicit relay-mode tool
  call may make a no-key challenge request.
- `STOCKTRENDS_X402_PROOF_FORWARDING` - proof forwarding gate, blocked and
  default-false until API/server confirmation.
- `STOCKTRENDS_X402_MAX_CHALLENGES_PER_SESSION` - optional per-session
  challenge cap.
- `STOCKTRENDS_X402_MAX_CHALLENGES_PER_TOOL` - optional per-tool challenge cap.
- `STOCKTRENDS_X402_MAX_FULFILLED_CALLS_PER_SESSION` - optional local,
  non-authoritative cap for fulfilled paid x402 responses if proof forwarding
  is later approved.

The x402 parser should require strict literal `true` for enabling flags and
reject ambiguous truthy strings such as `1`, `yes`, `on`, or non-empty arbitrary
values. That stricter x402 posture should not silently change existing API-key
mode parsing unless a later migration explicitly approves it.

## 6. Tool Surface Design

Future implementation has three possible shapes:

| Option | Description | Assessment |
| --- | --- | --- |
| Reuse existing nine paid tools with explicit relay mode/input | Same semantic operations, with a caller-selected relay path. | Possible, but every input-schema change must be reviewed for ambiguity and backward compatibility. |
| Add separate x402-specific tools | New tool names for x402 challenge/proof behavior. | Clear separation, but increases tool count and may fragment the semantic surface. |
| Keep tool count unchanged with mode-specific result behavior | Same existing paid tools; server mode determines whether a call uses API-key execution or x402 challenge relay. | Recommended initial posture if implementation can stay unambiguous and testable. |

**Recommendation:** keep the tool count unchanged if possible. The existing nine
paid tools should remain the semantic operations. Mode should determine the
payment path. In x402 challenge mode, a paid tool called without proof should
return a structured `payment_required` result rather than paid API data.

The subsequent proof-forwarding path remains deferred until API/server
confirmation. This memo approves no tool count change, no new x402-specific
tools, and no input-schema change by itself.

## 7. Challenge Relay Contract

The future challenge-relay result should be a structured, machine-readable
payment-required result derived from PR #64's verified shape. This is a
provisional contract sketch only, not implementation and not final field names:

```json
{
  "status": "payment_required",
  "error_code": "x402_payment_required",
  "api_status": 402,
  "tool_name": "<existing paid tool name>",
  "endpoint_path": "<allowlisted paid route>",
  "http_method": "GET",
  "challenge": {
    "header_names_present": [
      "payment-required",
      "x-request-id",
      "x-stocktrends-payment-required",
      "x-stocktrends-accepted-payment-methods",
      "x-stocktrends-pricing-rule"
    ],
    "top_level_body_keys_present": [
      "accepted_payment_methods",
      "detail",
      "error",
      "payment_required",
      "pricing",
      "protocol",
      "resource",
      "stocktrends_preview"
    ],
    "field_categories_present": [
      "amount",
      "asset",
      "network",
      "recipient_or_address",
      "expiry_or_expires_at",
      "correlation_or_challenge_id_or_nonce",
      "accepted_payment_methods",
      "pricing_rule_or_family"
    ],
    "safe_values": {
      "payment_required": true,
      "protocol": "<relay only if classified safe>",
      "resource": "<relay only if route-bound and classified safe>",
      "pricing": "<relay only if classified safe>",
      "accepted_payment_methods": "<relay only if classified safe>",
      "stocktrends_preview": "<relay only if classified safe>"
    }
  },
  "mcp_metadata": {
    "paid_execution_occurred": false,
    "auth_header_sent": false,
    "payment_header_sent": false,
    "proof_forwarded": false,
    "spend_occurred": false,
    "paid_api_data_returned": false
  }
}
```

Fields safe to relay in the first implementation review:

- `status` / `error_code` values indicating payment is required;
- API status class and `api_status = 402`;
- tool name, endpoint path, HTTP method, and route identity;
- relevant header names present, not header values;
- top-level body key names present;
- challenge field categories present by key name;
- explicit safety booleans such as `paid_execution_occurred=false`,
  `auth_header_sent=false`, `payment_header_sent=false`,
  `proof_forwarded=false`, and `spend_occurred=false`.

Fields that remain shape-only or redacted until implementation review classifies
them safe:

- raw header values;
- raw challenge body values;
- amount, asset, network, recipient/address, expiry, challenge id, nonce, or
  correlation value;
- `pricing` values;
- `accepted_payment_methods` values;
- `resource` values beyond route binding;
- `stocktrends_preview` values; and
- any value that could function as proof material, payment instructions, replay
  material, or sensitive payment metadata.

`x-request-id` may be useful for support and correlation, but PR #64 did not
capture header values. A later implementation must decide whether request IDs
are safe to return to the caller, redacted in logs, or represented only as
presence/absence.

No challenge-relay result may include paid `api_data`. If a no-key challenge
call returns paid output, the relay must fail closed with an
`x402_paid_output_without_proof` result.

## 8. Proof/Envelope Forwarding Contract Status

Proof/envelope forwarding is not ready for implementation.

PR #64 did not infer exact proof header, body, or envelope requirements. API
documentation or server-side confirmation is required before any proof
forwarding code is written.

A future proof-forwarding design must decide:

- proof input shape;
- proof header/body mapping;
- challenge correlation binding;
- expiry handling;
- replay/stale proof behavior;
- success response shape;
- error codes for malformed or rejected proof; and
- redaction and non-storage rules.

Until those questions are answered, the only acceptable future implementation
posture is proof-forwarding disabled or fail-closed.

## 9. Request/Response Flow Design

### A. Challenge relay flow

1. A user or agent invokes an existing paid tool in explicit x402 relay
   challenge mode.
2. The MCP server verifies that x402 challenge relay is enabled, the route is
   allowlisted, the tool input is strict and bounded, caps pass, and no API-key
   or proof path is active.
3. The MCP server makes a no-key `GET` request to the same allowlisted route
   using only minimal/caller parameters.
4. The challenge request sends no API key, no authorization header, no payment
   header, and no proof.
5. The Stock Trends API returns HTTP `402` payment-required challenge.
6. The MCP server returns a structured payment-required result containing safe
   shape information and route/tool identity.
7. No proof is generated or forwarded, no payment is made, no spend occurs, and
   no paid API data is returned.

### B. Future proof forwarding flow

This flow is design-only and blocked pending API/server confirmation.

1. A client supplies an explicit proof/envelope in the later confirmed shape.
2. The MCP server validates only local shape, route binding, expiry/correlation
   fields if confirmed, allowlist membership, and redaction policy. It does not
   verify payment validity.
3. The MCP server forwards the proof only to the same Stock Trends API origin
   and same route that produced the challenge.
4. The Stock Trends API verifies, settles, meters, and returns either an
   API-authored paid response or an API-authored rejection.
5. The MCP server returns the API-authored paid response or safe rejection
   metadata.
6. The MCP server performs no local payment verification, stores no proof, and
   performs no automatic retry.

## 10. Allowlist and Route Policy

The initial relay scope is limited to the same nine auth-capable paid routes
verified in PR #64:

- `/v1/stim/latest`
- `/v1/stim/history`
- `/v1/indicators/latest`
- `/v1/indicators/history`
- `/v1/selections/latest`
- `/v1/market/regime/latest`
- `/v1/market/regime/history`
- `/v1/breadth/sector/latest`
- `/v1/leadership/summary/latest`

The relay must not include:

- deferred routes;
- public resources;
- pricing catalog calls;
- instrument lookup/resolve calls except as a separately reviewed resolver
  decision;
- POST routes;
- decision or portfolio routes;
- Intelligence Agent artifact routes;
- package/listing/marketplace routes; or
- any non-allowlisted route.

Route identity must bind the challenge and any future proof. A proof must never
be forwarded to a route different from the challenge route. Non-allowlisted
routes fail closed before any request.

For symbol-dependent tools, canonical `symbol_exchange` input is preferred so
challenge calls can avoid credential-free resolver calls where possible. The
existing resolver behavior must be reviewed before implementation so x402
challenge calls do not accidentally call credential-free resolver routes unless
that resolver step is explicitly intended, bounded, and documented.

## 11. Header and Payload Handling

Challenge calls:

- send no API key;
- send no `Authorization` header;
- send no Bearer token;
- send no payment header;
- send no proof or proof-like value;
- send no cookies or ambient credentials;
- use only `Accept` and `User-Agent` unless a later reviewed design approves an
  additional non-secret header; and
- send minimal, already-validated route parameters.

Future proof calls, if later approved:

- may send only the API-confirmed proof header/body shape;
- must not invent payment headers;
- must not add OAuth/Bearer behavior;
- must not send cookies or ambient credentials;
- must not send API key and proof together unless a future design explicitly
  approves that combination, which is expected to remain disallowed;
- must forward proof only to the exact confirmed Stock Trends API origin and
  route; and
- must redact any proof/payment values in errors, logs, and result metadata.

Response handling:

- relay header names are safer than header values;
- response header values are redacted unless classified safe in implementation
  review;
- `x-request-id` handling must be explicitly decided before implementation;
- payment-related values remain redacted unless classified safe;
- raw challenge bodies are not logged or persisted; and
- raw payload dumps are forbidden.

## 12. Pricing and Catalog Reconciliation

PR #64 confirms that the challenge contains pricing-rule/family categories by
key name. It did not call the pricing catalog and did not compare values.

The future relay should eventually reconcile API challenge information against
the pricing catalog only if safe and separately approved. The Stock Trends API
remains the pricing authority. The MCP server must not invent, hardcode, or
override x402 prices.

If a later implementation compares challenge data with catalog data, mismatch,
missing data, duplicated rule IDs, unsupported units, or inconsistent route/
family identity must fail closed.

Any catalog call for x402 reconciliation must be separately approved in an
implementation design or validation plan. This memo does not authorize a catalog
call.

## 13. Error Model

Future deterministic error/result codes should be provisional until
implementation, but the fail-closed categories should be clear:

| Code | Intended fail-closed behavior |
| --- | --- |
| `x402_relay_disabled` | Relay mode is not enabled; no request is sent. |
| `x402_challenge_required` | Proof or paid output was requested without a confirmed challenge path; no proof is forwarded. |
| `x402_payment_required` | API returned a safe payment-required challenge; no paid data is returned. |
| `x402_challenge_unavailable` | API did not return a usable payment-required challenge; no retry or fallback occurs. |
| `x402_challenge_unexpected_shape` | Challenge status/header/body shape does not match the approved shape; no proof path is enabled. |
| `x402_proof_forwarding_not_enabled` | Proof forwarding gate is off or unconfirmed; no proof is forwarded. |
| `x402_proof_invalid_shape` | Client-supplied proof/envelope fails local shape checks; no request is sent. |
| `x402_proof_rejected_by_api` | API rejects a forwarded proof; return safe API-authored rejection metadata only. |
| `x402_route_not_allowlisted` | Route is outside the nine-route allowlist; no request is sent. |
| `x402_mixed_mode_invalid` | API-key and x402 modes are ambiguous or contradictory; no request is sent. |
| `x402_paid_output_without_proof` | No-key challenge call returned paid data; fail closed and do not surface paid output. |
| `x402_secret_safety_violation` | Secret/proof/payment-like value would be logged or returned unsafely; redact and fail closed. |

These codes are design placeholders. A future implementation may rename them,
but it must preserve deterministic, local, fail-closed behavior.

## 14. Security and Redaction Model

Before implementation, the existing redaction model must be extended for x402
relay material. At minimum, redaction should cover:

- payment proof/envelope values;
- payment header values;
- wallet/private-key/seed phrase material;
- bearer/OAuth-style credentials if they appear unexpectedly;
- API-key material;
- proof/challenge correlation values when not classified safe;
- nonce/challenge IDs when not classified safe;
- recipient/address values unless classified safe;
- amount/asset/network values unless classified safe; and
- raw challenge or proof payloads.

The relay must not create:

- raw payload dumps;
- proof persistence;
- challenge persistence beyond shape-only, if any;
- logs with proof/challenge values;
- logs with payment header values;
- logs with wallet/private-key/seed phrase material; or
- screenshots or validation artifacts containing payment material.

A secret-shaped scan is required for any future implementation PR and any future
validation report. The scan should explicitly distinguish boundary words in
documentation from real secret, proof, wallet, or header values.

## 15. Spend, Retry, and Loop Controls

Challenge-only calls should not debit paid spend caps unless a later reviewed
design explicitly approves counting them. A challenge is not paid output and is
not a successful paid execution.

If proof forwarding is later approved and fulfilled paid x402 responses are
returned, local cap accounting may be useful as non-authoritative operator
protection. The API remains the metering and settlement authority.

The relay must preserve the existing anti-loop posture:

- no automatic retry after `402`;
- no automatic proof forwarding;
- no background, scheduled, CI, unattended, bulk, or sweep calls;
- repeated-identical call gates apply to relay calls;
- per-tool and per-session relay caps are needed;
- proof reuse is forbidden unless API documentation and later design explicitly
  approve it; and
- unexpected paid output fails closed.

## 16. API-Key Coexistence and Mixed-Mode Policy

The current API-key path remains valid. x402 relay is additive future work, not
a replacement for subscription/API-key execution.

Coexistence policy:

- no silent fallback from API-key mode to x402;
- no silent fallback from x402 to API-key mode;
- explicit mode selection required;
- if API-key and x402 relay mode are both configured ambiguously, fail closed;
- do not send API key and proof together unless a future design explicitly
  approves it, which is expected to remain disallowed;
- do not use `Authorization: Bearer` as a fallback;
- do not add OAuth behavior; and
- x402 config parsing must reject ambiguous truthy values.

The current API-key behavior, including pricing preflight, catalog
reconciliation, caps, and repeated-identical-call gates, remains intact.

## 17. Local Stdio and Remote MCP Posture

Initial x402 relay design remains local stdio only.

Remote or hosted MCP remains unapproved. Any future remote posture would require
a separate design for:

- authentication;
- tenancy;
- rate limits;
- abuse controls;
- auditability;
- deployment operations;
- payment delegation;
- proof and secret handling;
- cross-user isolation;
- marketplace/listing claims; and
- incident response.

This memo makes no hosted or marketplace claim.

## 18. Validation and Testing Plan for Future Implementation

Exact next PR recommendation: **PR #66 should be a mock-only challenge-relay
implementation PR, gated by approval of this memo, with proof forwarding
disabled or fail-closed and with no live calls.**

Recommended PR sequence:

1. **PR #66: mock-only challenge-relay implementation.** Add only local
   configuration gates, allowlist checks, deterministic result shapes, redaction
   behavior, cap/loop gates, and mocked API `402` challenge fixtures. No live
   Stock Trends API calls and no proof forwarding.
2. **PR #67: no-spend validation report for PR #66.** Validate mock-only
   behavior, docs scope, secret scanning, source/test/package scope, and
   fail-closed behavior. No live calls.
3. **Later proof-forwarding design PR.** Only after API documentation or
   server-side confirmation, design proof input shape, forwarding mapping,
   correlation, expiry, replay, redaction, and success/error result shape.
4. **Later proof-forwarding implementation PR.** Mock-only first, with proof
   forwarding disabled by default and enabled only for confirmed shapes.
5. **Later live proof-forwarding validation.** Only if separately authorized and
   needed, with explicit no-secret, no-wallet-custody, capped, supervised,
   documented validation.

Future mock-only tests should cover:

- config flags and strict literal `true` parsing;
- default-off mode gating;
- API-key/x402 mixed-mode failures;
- relay exposure without execution;
- challenge execution gate;
- result shape for verified PR #64 challenge fields;
- safe field redaction and shape-only behavior;
- allowlist enforcement;
- route identity binding;
- symbol-dependent resolver policy;
- proof forwarding disabled/fail-closed;
- no paid output without proof;
- no auth/payment header construction in challenge mode;
- no API-key/proof combination;
- repeated-identical call gate;
- per-tool and per-session relay caps; and
- secret-shaped diff/output scans.

## 19. Non-Goals

This memo does not approve:

- implementation;
- proof forwarding;
- payment;
- spend;
- wallet custody;
- private keys;
- payment signing;
- payment verification;
- API-key behavior changes;
- remote or hosted MCP;
- autonomous paid execution;
- unattended, scheduled, CI, background, or bulk use;
- deferred routes;
- decision or portfolio routes;
- Intelligence Agent artifacts;
- investment advice;
- package publication;
- directory submission; or
- final marketplace launch.

## 20. Recommendation

Approve this memo only as an implementation design / contract memo.

If the design is approved, proceed next to the PR #66 mock-only challenge-relay
implementation described above. The first implementation should support
challenge relay / payment-required result shape first, with proof-forwarding
disabled or fail-closed.

Proof/envelope forwarding remains blocked pending API documentation or
server-side confirmation.

Marketplace x402 claims remain deferred until end-to-end relay, including proof
forwarding, is implemented and validated.

The Stock Trends Intelligence Agent return remains deferred until the MCP x402
relay path is live enough to support the intended discoverability and
transaction goals without overstating payment readiness.
