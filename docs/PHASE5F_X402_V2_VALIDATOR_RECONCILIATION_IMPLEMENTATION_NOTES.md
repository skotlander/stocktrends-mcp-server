# Phase 5F x402 v2 Validator Reconciliation Implementation Notes

Date: 2026-07-14

## Scope

PR #76 replaces only the live no-key x402 challenge validator's legacy PR #64
value model with the canonical x402 v2 challenge contract confirmed by PR #75.
It remains a validation-and-safe-omission change. It does not construct or
forward proof, make a payment, retry a paid call, relay raw challenge values, or
return paid output.

The five supplied Stock Trends API payment files remained external source
evidence and were not copied into this repository. `payments/x402.py` and
`payments/enforcement.py` were the primary authority for the challenge body,
requirements object, standard `Payment-Required` value, and no-signature
enforcement flow. `mpp.py`, `mpp_client.py`, and `policy_provider.py` confirmed
that MPP and payment-policy behavior are separate and do not redefine the x402
challenge fields.

## Files changed

- `src/stocktrendsClient.ts`
- `src/x402Relay.ts`
- `tests/x402Relay.test.ts`
- `docs/PHASE5F_X402_V2_VALIDATOR_RECONCILIATION_IMPLEMENTATION_NOTES.md`
- `README.md` (one documentation-index link only)

No package, lockfile, deployment, route-policy, MPP, API-key authentication,
resource, prompt, or unrelated tool file changed.

## Source contract implemented

The live validator now requires the seven source-authored body keys and their
canonical values: `error`, `detail`, `protocol`, route-bound `resource`, the
five-key `pricing` object, exactly `["x402"]`, and a full `payment_required`
requirements object. The requirements object must contain exactly
`x402Version`, `resource`, `accepts`, and `extensions`; `x402Version` is the
integer `2`; and `accepts` contains exactly one canonical entry with `scheme`,
`network`, atomic string `amount`, `asset`, `payTo`, positive safe-integer
`maxTimeoutSeconds`, and `extra`.

The legacy live-path requirements for `payment_required === true`,
accepted-method objects, `recipient`/`address`, absolute expiry fields, generic
pricing aliases, the PR #64 category set, and mandatory `stocktrends_preview`
were removed. The separate public mock-only PR #64 fixture path was not
changed.

## Header decoder and identity boundary

The dedicated no-key response seam reads only the authoritative standard
`Payment-Required` value. It still observes only allowlisted header names and
does not read unrelated values such as `x-request-id` or non-standard
`x-stocktrends-*` metadata. The standard header is required; the four legacy
metadata names are optional and cannot substitute for it.

The encoded value has an explicit 64-KiB cap. The decoder accepts canonical
standard base64 only, rejects whitespace, base64url characters, malformed
alphabet/padding and non-canonical encodings, enforces a separate 32-KiB
decoded cap, decodes UTF-8 fatally, parses exactly one JSON value, and requires
a bounded plain object with safe JSON structures. It uses the platform
`Buffer`, `TextDecoder`, and `JSON.parse`; no dependency was added.

JavaScript's standard JSON parser does not expose duplicate-key detection. The
implementation does not add a custom JSON parser for that one limitation. All
post-parse key, type, length, value, recursive-bound, and structural-identity
checks remain strict.

Before semantic validation or extension filtering, a deterministic structural
comparison requires the decoded header object and `body.payment_required` to
have identical JSON types, keys, array lengths/order, and values. Object key
order is ignored. Divergence returns a stable coarse error without a path or
value.

## Resource, value, and network binding

`payment_required.resource` is validated as the exact six-key `ResourceInfo`
object with bounded strings and tags and `mimeType === "application/json"`.
The top-level resource string, the requirements resource URL, and
`accepts[0].extra.resource.url` must agree, and the two resource objects must be
structurally equal.

A resource may be the exact allowlisted route or an absolute URL with the exact
configured API origin and exact route pathname. Credentials, fragments,
queries, alternate/trailing paths, encoded tricks, and parser-normalized route
changes fail closed. The existing nine-route allowlist is unchanged.

Atomic amounts are bounded positive canonical digit strings and are never
converted to USD. `pricing.amount_usd` is a bounded positive fixed-six decimal
string and is never accepted as a JSON number. Network, token/asset, and scheme
must match exactly across pricing and the accepted requirement. The current
supported family is `eip155:<positive chain id>` with strict 20-byte `0x`
addresses for asset and `payTo`; it is not hard-coded to Base. Timeout remains
a positive JavaScript safe-integer duration and is not converted to an expiry.
No conversion relationship is inferred between USD and atomic amounts.

## Extension treatment

Unknown members are allowed only inside `accepts[0].extra`,
`payment_required.extensions`, and the optional known
`stocktrends_preview` envelope. `extra` still requires bounded `name`,
`version`, and the exact resource copy; `assetTransferMethod` remains optional.
`extensions` and the optional preview must be plain objects.

Every extension container has explicit depth, per-object member, total-member,
array, string, and total UTF-8 size bounds. Only JSON-safe scalars, arrays, and
plain objects are accepted. Prototype-pollution keys, proof/signature/auth or
private-key/seed material, and keys that shadow route, pricing, amount, asset,
payee, network, scheme, timeout, settlement, or authorization meaning are
rejected. Extension data is ignored for payment semantics.

## Safe output and failure behavior

Stable coarse failures distinguish missing authoritative header, malformed or
oversized header, rejected decoded shape, header/body mismatch, invalid
challenge shape/value, unsupported network family, and prohibited material.
Errors never include raw encoded/decoded content, divergent paths, or rejected
values.

A valid response continues to produce only the existing safe MCP
`payment_required` result. Amount, price, asset, payee, network, scheme,
timeout, resource URL, extension values, raw body content, and the raw or
decoded header are omitted from text, structured output, metadata, and logs.
No structured challenge-value relay was added.

## Mocked tests

`tests/x402Relay.test.ts` now builds synthetic canonical compact and rich
challenges and matching standard-base64 headers. Coverage includes all nine
tool/route bindings; header presence, decoding, UTF-8/JSON/object and size
failures; exact header/body identity; canonical body, pricing, requirements,
resource, accepted-entry, amount, address, network, and timeout rules;
cross-field mismatches; optional `assetTransferMethod` and preview behavior;
extension bounds and prohibited material; sentinel omission; and the existing
manual-redirect, one-request, body-stream cap, paid-output-without-proof,
reservation/cap, symbol-policy, surface-count, mock-mode, and API-key-mode
regressions. All HTTP behavior is injected or mocked.

## Unchanged capability boundaries

The server remains local stdio MCP only. The Stock Trends API remains the
pricing, challenge, settlement, verification, and metering authority. The
exact nine paid GET routes, one-attempt behavior, no retry or fallback, literal
`true` flag semantics, reservation/cap handling, and API-key paid path are
unchanged. Live no-key mode still sends no API key, proof, payment signature,
`X-PAYMENT`, Authorization, Bearer token, cookie, or request body.

`STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING` remains unsupported and fail-closed.
There is still no payment construction, wallet custody, signing, facilitator
call, settlement verification, metering claim, paid output, dynamic tool
registration, remote MCP, OAuth, route promotion, marketplace readiness claim,
or investment advice behavior.

## Execution and readiness statement

This implementation and its tests made no live or credential-free Stock Trends
API call, used no API key, sent no proof or payment header, contacted no
facilitator or control plane, made no payment or spend, and used no MCP
Inspector or remote MCP. No live validation authorization was provided or
used.

This branch is ready only for independent code review after local mocked
validation. It is not ready or authorized for live x402 validation.
