# Phase 5F x402 v2 Validator Reconciliation Implementation Notes

Date: 2026-07-14

## Scope

PR #76 replaces only the live no-key x402 challenge validator's legacy PR #64
value model with the canonical x402 v2 challenge contract confirmed by PR #75.
It remains a validation-and-safe-omission change. It does not construct or
forward proof, make a payment, retry a paid call, relay raw challenge values, or
return paid output.

The Stock Trends API files remained external source evidence and were not
copied into this repository. `payments/x402.py` and `payments/enforcement.py`
were the primary authority for the challenge body, requirements object,
standard `Payment-Required` value, and no-signature enforcement flow.
`discovery/endpoint_metadata.py`, including the implementations and directly
called shape helpers for `build_compact_bazaar_extension()` and
`build_bazaar_extension()`, was the authority for compact and rich Bazaar
discovery structure.

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
post-parse key, type, length, value, iterative-bound, and structural-identity
checks remain strict.

Before paid-output scanning, semantic validation, extension filtering, or
structural comparison, the full parsed response tree is traversed iteratively
with an explicit stack and maximum depth, per-object members, aggregate
members, array length, key length, and string length. The decoded header tree
passes the same bounded validation. Structural comparison is also iterative
and requires the decoded header object and `body.payment_required` to have
identical JSON types, keys, array lengths/order, and values. Object key order is
ignored. Excessive structure and divergence return stable coarse errors
without a path, key, or value.

## Direct-helper tool-input and signature boundary

Both direct helpers that generate a repeated-call signature now validate and
snapshot the complete `toolInput` before calling `buildChallengeSignature()`:
`buildPublicMockX402ChallengeRelayResult()` and
`executePublicLiveX402ChallengeRelay()`. Those are the only production call
sites. The snapshot traversal is iterative and accepts only JSON-safe scalars,
plain objects, and dense plain arrays. It reads data-property descriptors
without invoking getters and rejects accessors, symbol or non-enumerable
properties, sparse or custom-property arrays, non-plain prototypes, cycles,
`undefined`, functions, symbols, bigint, and non-finite numbers.

The direct-input limits are depth 32, at most 64 members in one object, 256
elements in one array, 4,096 aggregate object entries plus array elements, and
16 KiB of UTF-8 for each string value or key. The aggregate count includes
every serialized occurrence, including repeated non-cyclic object references.
Over-depth, over-budget, cyclic, reflective-error, or non-JSON-safe input
returns the single coarse `x402_tool_input_invalid` result before reservation
or fetch. That result includes no rejected path, key, value, or sentinel and
causes no retry, fallback, or second route.

Signature key sorting remains recursive only on the newly created bounded
plain snapshot, never on the attacker-supplied object graph. Therefore no
arbitrarily nested attacker-controlled structure reaches signature recursion.
For previously valid inputs, the snapshot preserves JSON scalar and array
semantics and the existing recursive sorter preserves the exact deterministic
signature serialization, including recursive object-key sorting.

## Resource, value, and network binding

`payment_required.resource` is validated as the exact six-key `ResourceInfo`
object with bounded strings and tags and `mimeType === "application/json"`.
The top-level resource string, the requirements resource URL, and
`accepts[0].extra.resource.url` must agree, and the two resource objects must be
structurally equal.

A resource may be the exact invoked route or an absolute URL whose raw string
is exactly `<canonical configured origin><exact invoked endpoint path>`. That
raw equality check occurs before URL parsing; parsing remains defense-in-depth.
Mixed-case scheme or host, an unconfigured explicit default port, zero-padded
ports, wrong ports, credentials, fragments, queries, backslashes, duplicate
slashes, alternate/trailing paths, encoded separators, double encoding, dot
segments, and other parser-normalized route changes fail closed. A configured
canonical non-default port is accepted only in that exact raw serialization.
The existing nine-route allowlist and exact tool-to-route binding are unchanged.

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

Every extension container is traversed iteratively with explicit depth,
per-object member, aggregate member, array, string, and total UTF-8 size bounds.
Object entries and array elements count against the same 512-member aggregate
budget, so sibling arrays and sibling objects cannot bypass it. The focused
tests prove acceptance exactly at the aggregate limit and rejection at the
first member beyond it. Only JSON-safe scalars, arrays, and plain objects are
accepted.

The prohibited-key policy tokenizes camelCase and separator/case variants
rather than matching arbitrary substrings. Proof, signature, authorization,
authentication-token, secret, private-key, wallet-seed, payment, settlement,
transaction, transaction-hash, facilitator, payment execution/completion, and
payment-semantic override concepts are checked before every Bazaar or generic
path allowance. They therefore remain universally prohibited, including below
ancestors named `schema`, `example`, `input`, `output`, or `info`. Consequently
`routeOverride`, `amount_override`, `network.override`, `payToOverride`, and
`maxTimeoutSecondsOverride` fail closed at generic, schema-root, and nested
schema paths, while benign `proofreading_note` and `seedling_metadata` do not
fail solely because they contain shorter character sequences.

The previous blanket allowance for every key below `bazaar.schema` was
removed. The remaining shadow-key exceptions are exact builder roles derived
from `build_compact_bazaar_extension()`, `build_bazaar_extension()`, and their
direct helpers:

- descriptive family identity at `bazaar.info.family`,
  `bazaar.info.endpoint_family`, and the compact declaration
  `bazaar.schema.properties.family`;
- descriptive discovery method at `bazaar.info.input.method` and its compact
  JSON Schema declaration
  `bazaar.schema.properties.input.properties.method`, plus the rich
  registry-authored interpretation prerequisite at
  `bazaar.info.interpretation_dependencies.dependency.method`;
- rich safe-request example `method` and `path` at
  `bazaar.info.input.example.{method,path}` and
  `bazaar.info.examples[*].{method,path}`;
- response-shape carrier names such as `data`, `results`, `rows`, and `records`
  only inside the rich `bazaar.info.output.example` role or as an actual JSON
  Schema property declaration under `bazaar.info.output.schema` or
  `bazaar.schema.properties.output`.

The ordinary bounded schema vocabulary, input property schemas, parameter
descriptions, examples, output metadata, response-shape metadata, and other
non-shadow descriptive fields remain accepted at the source-mirrored compact
and rich roles. No `schema`, `example`, `input`, `output`, or `info` subtree is
itself an exemption. Route/path authority, actual HTTP execution method,
amount, price, asset, token, payee/`payTo`, recipient/address, network/chain,
scheme, timeout/expiry, proof, authorization, payment, settlement,
transaction, and facilitator semantics remain rejected outside the exact
descriptive exceptions above. All extension data continues to be ignored for
payment semantics and omitted from MCP text, structured output, metadata,
errors, and logs.

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

`tests/x402Relay.test.ts` now builds hand-reviewed synthetic fixtures that
mirror the current compact Bazaar builder hierarchy and a representative rich
builder hierarchy, including compact `bazaar.info.family`, rich
`info.input.method`, safe-example `path`, schemas, parameters, output metadata,
and examples. Header and body requirements are built from the same synthetic
object. Values are clearly synthetic; no response capture or live request was
used.

Coverage includes compact acceptance for all nine tool/route bindings;
representative rich acceptance; extension-value omission; header presence,
decoding, UTF-8/JSON/object and size failures; exact header/body identity;
canonical body, pricing, requirements, raw resource serialization,
accepted-entry, amount, address, network, and timeout rules; cross-field
mismatches; optional `assetTransferMethod` and preview behavior; path-aware
extension semantics; shared array/object aggregate bounds; override aliases;
benign substring cases; and deep optional preview, unknown body, extensions,
and extra trees through both the direct helper and public MCP handler.

Security regressions restored from `origin/main` in canonical-v2 form cover
direct helper use with the live flag absent or disabled, independently
allowlisted tool/route mismatch, dishonest under-limit `Content-Length` with an
over-limit stream, exact `method`/`http_method` and paid-execution safety flags,
and duplicated `Payment-Required` values as deterministically combined by
Node's `Headers`. Existing manual-redirect, one-request, no-retry,
paid-output-without-proof, reservation/cap, symbol-policy, surface-count,
mock-mode, API-key-mode, and public PR #64 mock-only regressions remain covered.
All HTTP behavior is injected or mocked.

Focused direct-helper regressions cover 7,000-level objects and arrays,
alternating object/array nesting, cycles in objects and arrays, per-container
and aggregate breadth, exact depth and aggregate boundaries, long strings,
accessors, symbols, prototypes, sparse/unsafe structures, `undefined`,
functions, bigint, and non-finite numbers. Rejected live inputs reserve nothing
and invoke no fetch callback; rejected mock inputs create no in-flight or
completed signature. Accepted boundary inputs retain normal mock/live behavior,
and an exact expected signature plus reordered equivalent input proves the
existing deterministic signature is unchanged.

Focused Bazaar regressions reject `payment`, `payment_required`,
`payment_status`, `settlement`, `settlement_status`, `transaction`,
`transaction_hash`, `transactionHash`, `facilitator`, `facilitator_url`,
`proof`, `payment_signature`, `authorization`, `privateKey`, and `wallet_seed`
at both schema-root and representative nested schema roles. They also prove
override rejection inside those roles; compact acceptance across all nine
routes; representative rich acceptance; exact `family`, `method`, and `path`
roles; source-mirrored schema, parameter, example, and output metadata;
acceptance of `proofreading_note` and `seedling_metadata`; omission of accepted
extension values; and absence of raw rejected sentinels.

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
