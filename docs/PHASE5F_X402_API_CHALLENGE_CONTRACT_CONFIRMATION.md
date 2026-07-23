# Phase 5F x402 API Challenge Contract Confirmation

PR #75 is a source-first, documentation-only confirmation of the Stock Trends
API's x402 HTTP `402` challenge builder and enforcement contract. It compares
that contract with the MCP validator introduced by PR #72, explains the most
likely contract-level cause of PR #73's fail-closed result, and defines a
mock-only reconciliation boundary for PR #76.

Date: 2026-07-14

## 1. Purpose and scope

This memo answers one narrow question: what do the supplied Stock Trends API
payment sources actually construct when x402 payment material is absent, and
how does that source-authored contract differ from the current MCP live
challenge validator?

This work inspected source and local repository history only. It made no live
or credential-free API call, used no API key, sent no proof or payment header,
performed no payment or spend, and used no MCP Inspector or remote MCP. The five
API files remain external reference material and were not copied into this
repository.

Evidence labels used below are:

- **API source fact**: directly established by one of the five supplied API
  files.
- **MCP source fact**: directly established by this repository's current source
  or tests.
- **Historical observation**: recorded by a prior Phase 5F report, but not
  re-observed in this PR.
- **Inference**: the strongest explanation supported by comparing those facts;
  it is not represented as captured PR #73 telemetry.
- **PR #76 rule**: a recommendation only; no runtime change is made here.

## 2. Authority boundary

The front-facing Stock Trends API remains authoritative for pricing, challenge
generation, settlement, verification, and metering. The MCP remains a thin
local stdio adapter. It does not custody a wallet, sign a payment, invent a
challenge value, verify settlement, or forward proof.

For this memo:

1. `<private-stocktrends-api>/payments/x402.py` and
   `<private-stocktrends-api>/payments/enforcement.py` are the
   primary authority for the constructed x402 requirements, challenge body,
   encoded header value, and no-signature enforcement result.
2. `mpp.py`, `mpp_client.py`, and `policy_provider.py` are secondary evidence
   about rail selection and policy inputs. They do not override the x402
   builder's field names.
3. `src/x402Relay.ts` and `src/stocktrendsClient.ts` are the current MCP
   implementation authority.
4. PR #64, PR #72, PR #73, and PR #74 documents are historical repository
   evidence. PR #64's shape-only observations do not override current API
   source, and this memo does not reinterpret PR #73 as having captured values
   it intentionally discarded.

The supplied API sources do not include the web-framework layer that converts
`PaymentEnforcementResult` into the final HTTP response. That omission matters:
PR #64 recorded a final live body with `stocktrends_preview` and five relevant
header names, while `build_x402_challenge()` itself does not construct
`stocktrends_preview` and `PaymentEnforcementResult` does not show the other
four headers being attached. This memo therefore distinguishes the confirmed
builder/enforcement contract from unresolved final-response decoration.

## 3. Evidence reviewed

### Stock Trends API sources

- `payments/x402.py`
  - configuration and challenge-mode selection: lines 35-62 and 126-148;
  - atomic-unit and base64 helpers: `_to_atomic_units()`,
    `_json_dumps_compact()`, and `_b64_json()` at lines 97-115;
  - `build_x402_requirements()` at lines 272-329;
  - `_extract_single_requirement()` at lines 332-353;
  - `build_x402_challenge()` at lines 356-399; and
  - payment-signature detection at lines 406-456.
- `payments/enforcement.py`
  - `_extract_x402_requirement_context()` at lines 19-28;
  - `PaymentEnforcementResult` at lines 31-43;
  - `enforce_x402_payment()` at lines 46-171; and
  - rail dispatch in `enforce_payment_rail()` at lines 173-184.
- `payments/mpp.py`
  - its separate header-based MPP contract and control-plane-backed
    `enforce_mpp_payment()` at lines 7-210.
- `payments/mpp_client.py`
  - `MppControlPlaneResult`, `_mpp_post()`, and the authorize/capture/void
    functions at lines 28-310.
- `payments/policy_provider.py`
  - payment-policy data classes at lines 32-69;
  - x402 and MPP machine-rail classification at line 90;
  - default endpoint rail/policy values and accepted-method strings at lines
    261-507;
  - effective rail derivation at lines 648-688; and
  - `get_accepted_payment_methods_for_path()` at lines 987-1019.

### MCP repository sources and history

- `src/x402Relay.ts`, especially:
  - approved header, top-level-key, and category constants at lines 17-45;
  - live execution and validation dispatch at lines 520-667;
  - current nested validators at lines 759-982; and
  - recursive category detection at lines 1023-1068.
- `src/stocktrendsClient.ts`, especially:
  - the 64-KiB body bound at line 18;
  - `NoKeyX402ChallengeRequest` and `NoKeyX402ChallengeResponse` at lines
    66-76;
  - same-origin URL construction at lines 97-112;
  - `fetchNoKeyX402Challenge()` at lines 246-310; and
  - bounded response-body handling at lines 431-490.
- `tests/x402Relay.test.ts`, including the current synthetic live fixture at
  lines 1561-1611 and malformed value/shape cases.
- The Phase 5F authority chain:
  - `docs/PHASE5F_X402_RELAY_ARCHITECTURE_MEMO.md` (PR #62);
  - `docs/PHASE5F_X402_CONTRACT_VERIFICATION_REPORT.md` (PR #64);
  - `docs/PHASE5F_X402_LIVE_NO_KEY_CHALLENGE_RELAY_PLAN.md` (PR #71);
  - `docs/PHASE5F_X402_LIVE_NO_KEY_CHALLENGE_IMPLEMENTATION_NOTES.md`
    (PR #72);
  - `docs/PHASE5F_X402_LIVE_NO_KEY_CHALLENGE_RELAY_VALIDATION_REPORT.md`
    (PR #73); and
  - `docs/PHASE5F_X402_LIVE_CHALLENGE_CONTRACT_DRIFT_DIAGNOSIS.md`
    (PR #74).
- Local git history confirmed that PR #72 is commit `5b44662`, PR #73 is
  `0500074`, and PR #74/current `main` is `cef08e1`.

## 4. Source execution flow

The no-signature x402 flow is source-confirmed as follows:

1. `enforce_payment_rail(payment_rail="x402", ...)` dispatches to
   `enforce_x402_payment()`; the `mpp` branch is separate
   (`enforcement.py:173-184`).
2. `enforce_x402_payment()` reads `X-StockTrends-Challenge-Mode` using the
   canonical or lower-case header key, then calls
   `build_x402_requirements(path, amount_usd, method)`
   (`enforcement.py:62-73`). This first requirements object is used to derive
   `payment_network` from `accepts[0].network` and `payment_token` from
   `accepts[0].asset`.
3. `has_payment_signature()` considers only a truthy `payment-signature` or
   `x-payment` value a present signature (`x402.py:431-437`). If neither is
   present, enforcement calls `build_x402_challenge()` with the route, amount,
   method, and optional challenge-mode header (`enforcement.py:75-81`).
4. `build_x402_challenge()` normalizes `amount_usd` to `Decimal`, resolves the
   response challenge mode, calls `build_x402_requirements()` again, constructs
   the body, and base64-encodes that same second requirements object
   (`x402.py:356-399`).
5. Enforcement returns `PaymentEnforcementResult` with:

   | Result field | Source-confirmed no-signature value |
   | --- | --- |
   | `outcome` | `"challenge"` |
   | `error_code` | `"payment_required"` |
   | `error_detail` | `"x402 payment required"` |
   | `challenge_body` | the object from `build_x402_challenge()` |
   | `payment_required_header` | standard-base64 UTF-8 JSON for the second requirements object |
   | `payment_network` | `accepts[0].network` from the separately built first requirements object |
   | `payment_token` | `accepts[0].asset` from the separately built first requirements object |

The two requirements objects receive the same path, amount, method, and default
network/token/scheme/payee inputs. Their discovery `extensions` can differ in
compactness: direct `build_x402_requirements()` defaults to `full`, whereas a
payment-required response defaults to `compact` unless the explicit header or
environment selects `full`/`rich` (`x402.py:126-148, 284, 305-309, 370-380`).
The core payment fields are not mode-dependent.

## 5. Confirmed HTTP 402 response-body contract

`build_x402_challenge()` constructs this body exactly at the builder boundary:

```json
{
  "error": "payment_required",
  "detail": "Payment is required to access this endpoint.",
  "protocol": "x402",
  "resource": "<requirements.resource.url>",
  "pricing": {
    "amount_usd": "<Decimal formatted to exactly six fractional digits>",
    "unit": "request",
    "network": "<network argument>",
    "token": "<token argument>",
    "scheme": "<scheme argument>"
  },
  "accepted_payment_methods": ["x402"],
  "payment_required": {
    "x402Version": 2,
    "resource": {
      "url": "<X402_API_BASE_URL + path, or path when no base is configured>",
      "description": "<explicit description or registry description>",
      "mimeType": "application/json",
      "serviceName": "<SERVICE_NAME>",
      "tags": ["<zero or more SERVICE_TAGS entries>"],
      "iconUrl": "<SERVICE_ICON_URL>"
    },
    "accepts": [
      {
        "scheme": "<scheme>",
        "network": "<network>",
        "amount": "<atomic-unit integer string>",
        "asset": "<token/asset address>",
        "payTo": "<seller address>",
        "maxTimeoutSeconds": 300,
        "extra": {
          "name": "<token name>",
          "version": "<token version>",
          "assetTransferMethod": "<present only when configured non-empty>",
          "resource": "<copy of payment_required.resource>"
        }
      }
    ],
    "extensions": "<compact or full Bazaar extension value>"
  }
}
```

The string placeholder shown for `extensions` above indicates an opaque value,
not a confirmed string type. The key is always present, but the supplied files
do not include `build_bazaar_extension()` or
`build_compact_bazaar_extension()`, so they do not establish its exact JSON
type or member set. PR #76 must treat it as a bounded extension container, not
invent an exact schema from its name.

The working hypotheses for the seven core top-level body keys, the pricing
members, `accepted_payment_methods`, and the nested x402 v2 requirements are
confirmed. The hypothesis is refined in four ways:

- `payment_required.resource` is a `ResourceInfo` object, while the top-level
  body `resource` is that object's `url` string.
- `accepts[0].extra.resource` is also present and is a copy of the
  `ResourceInfo` object.
- `extra.assetTransferMethod` is conditional on a non-empty configuration
  value.
- the exact structure of `extensions` is not confirmable from the five supplied
  files.

## 6. Confirmed Payment-Required header contract

`_b64_json()` compact-serializes the requirements object with JSON separators
`,` and `:`, `ensure_ascii=False`, UTF-8 encodes it, and applies standard
`base64.b64encode()` (`x402.py:109-115`). `build_x402_challenge()` returns that
encoded string as `payment_required_header` (`x402.py:398-399`), and
`PaymentEnforcementResult` carries it (`enforcement.py:36-40, 82-90`).

Therefore the source-confirmed value contract is:

```text
Payment-Required: base64(utf8(compact-json(requirements)))
```

It is standard base64, not source-confirmed base64url; no prefix or wrapper is
added. Decoding must yield a JSON object structurally equal to
`challenge_body.payment_required`. JSON key order and insignificant whitespace
are not semantic.

PR #64 historically observed a final `payment-required` response header on all
nine reviewed routes. The supplied files confirm the encoded value construction
but do not show the framework statement that attaches it under the HTTP header
name. They also do not establish the values or aliases of
`x-stocktrends-payment-required`, `x-stocktrends-accepted-payment-methods`,
`x-stocktrends-pricing-rule`, or `x-request-id`.

## 7. Field-by-field contract table

### Core body and requirements

| Source location | JSON/header path | Type | Status | Format or semantic rule | Current MCP expectation | Match | PR #76 disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `x402.py:382-396` | body | object | required | Seven builder keys; final decorators unresolved | Exact eight keys including `stocktrends_preview` | Mismatch | Require the seven core keys; allow only separately allowlisted envelope extensions |
| `x402.py:383` | `error` | string | required | Exact `payment_required` | Non-empty string, max 256 | Broad match | Require the exact literal |
| `x402.py:384` | `detail` | string | required | Exact source sentence | Non-empty string, max 1,024 | Broad match | Require the exact current source literal |
| `x402.py:385` | `protocol` | string | required | Exact `x402` | Bounded identifier-like string | Broad match | Require exact `x402` |
| `x402.py:386` | `resource` | string | required | Equal to `payment_required.resource.url` | Must equal the MCP endpoint path | Conditional mismatch | Require equality to nested URL and exact route/origin binding |
| `x402.py:394` | `accepted_payment_methods` | array of strings | required | Builder emits exactly `["x402"]` | Array of 1-16 payment-detail objects | Mismatch | Require exactly `["x402"]` for current contract |
| `x402.py:395` | `payment_required` | object | required | Full requirements object | Literal boolean `true` | Direct mismatch | Validate as requirements object |
| `x402.py:313` | `payment_required.x402Version` | integer | required | Literal `2` | No direct field validator | Missing | Require number/integer exactly `2`; reject boolean/coercion |
| `x402.py:296-303,315` | `payment_required.resource` | object | required | `url`, `description`, `mimeType`, `serviceName`, `tags`, `iconUrl` | No `ResourceInfo` validator | Missing | Validate exact core members, bounded strings/list, and route binding |
| `x402.py:316-327` | `payment_required.accepts` | array | required | Builder emits one entry | No canonical `accepts` validator | Missing | PR #76 should require exactly one entry; see section 8 |
| `x402.py:318` | `accepts[0].scheme` | string | required | Source argument/default; emitted as-is | No accepted-entry `scheme` | Missing | Bounded identifier; equal `pricing.scheme` |
| `x402.py:319` | `accepts[0].network` | string | required | Source-authored network identifier | Generic `network` identifier in different object | Path mismatch | Validate at canonical path; equal `pricing.network` |
| `x402.py:320-321` | `accepts[0].amount` | string | required | Integer string from atomic-unit conversion | Positive number or decimal/integer string in different object | Semantic/path mismatch | Require bounded canonical positive digit string; do not reinterpret as USD |
| `x402.py:322` | `accepts[0].asset` | string | required | Token/asset value; default is an EVM contract address | Generic identifier in different object | Path mismatch | Validate canonical path; equal `pricing.token`; network-specific format |
| `x402.py:323` | `accepts[0].payTo` | string | required | Seller destination; canonical case-sensitive key | Exactly one `recipient`/`address` alias | Direct mismatch | Require `payTo`; do not accept aliases as substitutes |
| `x402.py:324` | `accepts[0].maxTimeoutSeconds` | integer | required | Default `300`; duration, not absolute expiry | Optional `expiry`/`expires_at` UTC timestamp | Direct mismatch | Require positive safe integer; do not translate to an expiry timestamp |
| `x402.py:286-304,325` | `accepts[0].extra` | object | required | Source-authored extension container | Any extra nested key makes accepted entry invalid | Direct mismatch | Allow only at this exact path with recursive bounds and safety checks |
| `x402.py:287-288` | `extra.name`, `extra.version` | strings | required by builder | Source configuration values | No canonical validators | Missing | Require bounded strings in current-source fixture contract |
| `x402.py:290-291` | `extra.assetTransferMethod` | string | conditional | Present only when configured non-empty | No canonical validator | Missing | Optional bounded identifier; no default invented by MCP |
| `x402.py:304` | `extra.resource` | object | required by builder | Copy of `payment_required.resource` | No canonical validator | Missing | Require deep structural equality |
| `x402.py:305-309,328` | `payment_required.extensions` | JSON value from Bazaar builder | required key; value shape unresolved | Compact by default for 402; full/rich selectable | No canonical validator | Missing | Require bounded plain object in PR #76 fixtures; block rather than widen if source fixture disagrees |

### Pricing, header, and enforcement result

| Source location | JSON/header path | Type | Status | Format or semantic rule | Current MCP expectation | Match | PR #76 disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `x402.py:387-393` | `pricing` | object | required | Exact five keys | Exact different six-key object | Direct mismatch | Validate source-authored five-key object |
| `x402.py:388` | `pricing.amount_usd` | string | required | Decimal formatted with exactly six fractional digits | Key `amount`; positive number or decimal string | Name/format mismatch | Require bounded positive fixed-six decimal string |
| `x402.py:389` | `pricing.unit` | string | required | Exact `request` | Unapproved field | Direct mismatch | Require exact `request` |
| `x402.py:390` | `pricing.network` | string | required | Same source argument as accepted entry | Required generic identifier | Match after remap | Require equality to `accepts[0].network` |
| `x402.py:391` | `pricing.token` | string | required | Same source argument as accepted entry's `asset` | Key `asset` | Name mismatch | Require equality to `accepts[0].asset` |
| `x402.py:392` | `pricing.scheme` | string | required | Same source argument as accepted entry | Unapproved field | Direct mismatch | Require equality to `accepts[0].scheme` |
| `x402.py:113-115,398` | `Payment-Required` value | base64 string | required by builder/enforcement contract | Standard base64 of UTF-8 compact JSON requirements | Client observes header name only and never reads value | Missing | Decode only in memory; bound, parse, validate, deep-compare, never serialize raw |
| `enforcement.py:83-90` | result `outcome` and challenge fields | dataclass fields | conditional on no signature | `challenge`, body/header, network/token | MCP receives only HTTP status/names/body | Not currently mapped | No result-field mapping needed; validate HTTP representation only |
| `enforcement.py:19-28,88-89` | result `payment_network`, `payment_token` | optional strings | set in challenge branch | First requirements entry's `network` and `asset` | No direct comparison | Missing | Body/header consistency is authoritative; do not invent separate values |

## 8. Required, optional, conditional, array, and extension treatment

### Structurally required

At the builder boundary, the seven body keys, all five `pricing` keys,
`x402Version`, `resource`, `accepts`, `extensions`, all seven fields of the
single accepted requirement, `extra`, `extra.name`, `extra.version`, and
`extra.resource` are always constructed. `resource` always has the six shown
members.

### Conditional

- `extra.assetTransferMethod` is included only when
  `X402_DEFAULT_ASSET_TRANSFER_METHOD` is non-empty.
- The contents of `extensions` vary between compact and full discovery mode.
- The `resource.url` is relative when `X402_API_BASE_URL` is empty and is
  `X402_API_BASE_URL + path` otherwise.
- The five files do not show whether the final HTTP layer adds
  `stocktrends_preview` or other envelope fields and headers.

### Arrays and selection

The current builder emits:

- exactly one string in `accepted_payment_methods`;
- exactly one object in `payment_required.accepts`; and
- zero or more `resource.tags` copied from `SERVICE_TAGS`.

The source does **not** establish a protocol-wide one-entry limit for
`accepts`. `_extract_single_requirement()` accepts any non-empty list whose
first entry is an object and returns only `accepts[0]`; enforcement's network
and token extraction also reads only `accepts[0]` (`x402.py:332-353`;
`enforcement.py:19-28`). Later entries are neither selected nor validated by
those functions.

For the narrow PR #76 reconciliation, require `accepts.length === 1`, because
that is the exact current API builder output. Validate index `0` as the selected
payment requirement. Do not continue the MCP's current `.every()` policy over
an arbitrarily multi-entry array, and do not silently pick a later acceptable
entry. Multi-option support requires separate authoritative source evidence and
an explicit selection policy.

### Additional keys

Python dictionary construction does not itself declare a closed JSON Schema.
The current builders emit exact keys, while consumers such as
`_extract_single_requirement()` read selected keys and ignore others. That is
evidence of consumer tolerance, not proof that arbitrary additional fields are
safe or part of the authored challenge contract.

PR #76 should use this path-specific policy:

| Object level | Extra-key policy |
| --- | --- |
| Challenge body | Require seven core keys. Reject unknown top-level keys except an explicitly named, bounded envelope extension. Treat historically observed `stocktrends_preview` as optional and non-authoritative, not required. |
| `pricing` | Exact five source keys. Reject extras because they can change price meaning. |
| `payment_required` | Exact four core keys. Reject extras outside named extension containers. |
| `payment_required.resource` | Exact six current builder keys. Reject unknown identity/route metadata until sourced. |
| `accepts[0]` | Exact seven semantic keys. Reject `recipient`, `address`, `expiry`, `expires_at`, and all other aliases/extras as substitutes or additions. |
| `accepts[0].extra` | Bounded source-authored extension container. Retain internally for header/body equality or ignore semantically; never use unknown members to select a route, amount, asset, payee, timeout, proof, or settlement action. |
| `payment_required.extensions` | Bounded source-authored Bazaar extension container. Retain or ignore without interpreting unknown members as payment authorization. |
| Response headers | Require the standard `Payment-Required` value. Known legacy metadata headers may be observed by name but are not authoritative substitutes. Ignore unrelated transport headers. |

`extra` and `extensions` are not global escape hatches. Apply recursion depth,
member-count, array-length, string-length, decoded-byte, and total-body bounds;
accept only JSON-safe scalars/arrays/plain objects; reject prototype-pollution
keys and proof/auth/private-key/seed/payment-signature material; and never let
an extension override a sibling core field. Unknown fields anywhere else remain
fail-closed.

## 9. MCP PR #72 validator-policy comparison

The current live MCP policy is internally strict but models a different object:

- It requires the exact five-name set `payment-required`, `x-request-id`,
  `x-stocktrends-payment-required`,
  `x-stocktrends-accepted-payment-methods`, and
  `x-stocktrends-pricing-rule` (`src/x402Relay.ts:17-23, 802-805`).
- It requires the exact eight body keys recorded by PR #64, including
  `stocktrends_preview` (`src/x402Relay.ts:25-34, 807-816`).
- It requires `payment_required === true`, although API source constructs an
  object (`src/x402Relay.ts:818-830`).
- It treats `accepted_payment_methods` as 1-16 objects and validates every
  entry. Each object must have only `amount`, `asset`, `network`, exactly one of
  `recipient`/`address`, and at most one of `expiry`/`expires_at`
  (`src/x402Relay.ts:824-839, 858-865`).
- It requires `pricing` to contain `amount`, `asset`, `network`,
  `pricing_rule`, `family`, and exactly one of `recipient`/`address`, with no
  other keys (`src/x402Relay.ts:775-783, 867-873`).
- It requires `stocktrends_preview` to contain `challenge_id`,
  `correlation_id`, `nonce`, exactly one expiry alias, and exactly one
  recipient alias, with no other keys (`src/x402Relay.ts:784-792, 875-881`).
- It accepts positive finite numeric amounts or bounded positive decimal or
  integer strings; identifier fields use a bounded ASCII identifier grammar;
  recipients are strict 20-byte EVM hex addresses; expiry is a calendar-valid
  UTC timestamp ending in `Z`; and challenge identifiers use a bounded ASCII
  grammar (`src/x402Relay.ts:911-982`).
- It recursively requires the exact PR #64 category set: amount, asset,
  network, recipient/address, expiry, correlation/challenge/nonce,
  accepted-payment-methods, and pricing-rule/family. It marks fee, gas, chain,
  facilitator, settlement, and transaction-hash categories unexpected
  (`src/x402Relay.ts:1023-1068`).
- `fetchNoKeyX402Challenge()` reads only approved header **names**, never header
  values, so the MCP cannot currently decode or compare `Payment-Required`
  (`src/stocktrendsClient.ts:246-310`).

The current synthetic live fixture mirrors that policy: payment details live in
`accepted_payment_methods`, `pricing` uses the generic aliases, and
`stocktrends_preview` supplies expiry/identifier/address fields
(`tests/x402Relay.test.ts:1561-1611`). It is not a fixture of the now-confirmed
`build_x402_challenge()` output.

## 10. Exact source-confirmed mismatch findings

1. **`payment_required` type mismatch — confirmed.** API source emits the full
   requirements object; MCP source requires boolean `true`. This alone is a
   deterministic `x402_live_challenge_value_not_approved` condition if that
   source object reaches the current validator.
2. **Accepted-method structure mismatch — confirmed.** API source emits
   `["x402"]`; MCP requires an array of payment-detail objects and validates
   every element as an object.
3. **Canonical requirements path missing — confirmed.** The MCP has no
   structured validator for `payment_required.x402Version`, `resource`,
   `accepts`, or `extensions`.
4. **Payee field mismatch — confirmed.** API source emits case-sensitive
   `accepts[0].payTo`; MCP recognizes only `recipient` or `address` in its
   different accepted-method object.
5. **Timeout/expiry mismatch — confirmed.** API source emits positive-duration
   candidate `maxTimeoutSeconds`; MCP expects an optional absolute UTC
   `expiry`/`expires_at` in payment details and a required one in preview. These
   are not equivalent and must not be aliased.
6. **Pricing schema mismatch — confirmed.** API source uses `amount_usd`,
   `unit`, `network`, `token`, and `scheme`; MCP requires `amount`, `asset`,
   `network`, `recipient`/`address`, `pricing_rule`, and `family`. Source keys
   `unit`, `token`, and `scheme` are currently unapproved; required MCP fields
   are absent.
7. **Atomic amount placement mismatch — confirmed.** The API's payment amount
   is an integer string under `payment_required.accepts[0].amount`. The current
   scalar amount validator could accept a positive integer string, but the MCP
   expects it inside each `accepted_payment_methods` object and does not
   distinguish atomic units from USD. The scalar grammar is not the primary
   defect; path and unit semantics are.
8. **Resource-model mismatch — conditional.** API source permits a relative
   path or configured absolute API URL; MCP requires exact equality to the
   endpoint path. Whether this rejected PR #73 depends on the API deployment's
   `X402_API_BASE_URL` and final response assembly, which were not inspected.
9. **Header-value validation missing — confirmed.** The API provides a
   base64-encoded canonical requirements object; the MCP deliberately never
   reads header values and therefore cannot prove header/body consistency.
10. **Header-name requirement is broader than source confirmation —
    confirmed.** The API files confirm the standard encoded header value but
    do not author the MCP's exact five-name requirement. PR #64 historically
    observed those five names, so this is a source-authority mismatch rather
    than proof that the final API omits them.
11. **`stocktrends_preview` contradiction — confirmed as an evidence gap.**
    PR #64 observed it in final live bodies; the supplied primary builder does
    not create it. PR #76 must stop requiring it as core x402 v2 data while
    preserving a narrow optional known-extension treatment if the final layer
    still supplies it.
12. **Category model mismatch — confirmed.** `payTo` does not satisfy the
    MCP's recipient/address category, `maxTimeoutSeconds` does not satisfy its
    expiry category, and the core builder supplies no challenge/correlation/
    nonce or pricing-rule/family field. The exact category set will fail even
    after earlier object/type checks are repaired.

The proposed PR #73 explanation in PR #74 is therefore partly confirmed and
materially refined. `payTo`, `maxTimeoutSeconds`, and atomic `amount` are real
source-authored x402 v2 fields that do not match the generic alias model.
However, the source comparison shows earlier and more basic mismatches in
`payment_required`, `accepted_payment_methods`, and `pricing`.

## 11. Explanation of the PR #73 fail-closed outcome

**Confirmed:** PR #73 recorded an API HTTP `402` followed by MCP error
`x402_live_challenge_value_not_approved`. Current MCP source uses that error for
an unapproved top-level key, core value/type failure, nested-map failure,
forbidden material, or unexpected category. PR #73 retained no rejected path
or value.

**Most likely source-confirmed explanation:** the MCP validator encoded the
PR #64 shape/category model as a value contract, while current API source emits
the x402 v2 requirements object and canonical builder fields. If the attached
builder contract was the one deployed for the canary and its
`payment_required` object reached the current validator, the first core check
`response.body.payment_required !== true` would deterministically return
`x402_live_challenge_value_not_approved`. The string entry in
`accepted_payment_methods` and the source-authored `pricing` map would produce
the same error at the next nested checks. `payTo` and `maxTimeoutSeconds` would
also fail the current nested/category model after those earlier gates.

**Not knowable from PR #73:** this memo cannot prove which predicate rejected
the actual live response. The canary did not preserve a path or value, the
supplied source files are not identified as the deployed PR #73 API revision,
and the omitted final HTTP assembly layer may add or transform fields. Claiming
the exact runtime path would exceed the evidence.

## 12. Validator reconciliation rules recommended for PR #76

PR #76 should be a narrow mock-only implementation. It should replace the
legacy value model for the live path; it must not globally loosen validation.

1. **Capture only the authoritative header value in memory.** Extend the
   dedicated no-key response seam to read `Payment-Required` under the existing
   bounded response path. Do not read or relay `x-request-id`; do not log,
   persist, return, or include the raw encoded header in an error. Require the
   standard header. Treat legacy `x-stocktrends-*` headers as optional
   non-authoritative metadata, not substitutes.
2. **Decode strictly and within bounds.** Require bounded standard base64,
   decode to bounded UTF-8, parse one JSON object, reject malformed padding,
   non-UTF-8, non-object JSON, duplicate-key ambiguity where the parser can
   detect it, excessive depth/members/arrays/strings, and prototype-pollution
   keys.
3. **Validate the seven core body fields.** Require exact `error`, `detail`,
   `protocol`, `accepted_payment_methods`, and `pricing.unit`;
   a route-bound `resource`; the requirements object; and no unknown top-level
   core fields. `stocktrends_preview`, if present due to the final response
   layer, is an optional bounded known envelope extension and contributes no
   required x402 category.
4. **Validate canonical requirements, not aliases.** Require
   `x402Version === 2`, a valid `ResourceInfo`, exactly one accepted entry, and
   an `extensions` key. Require exact canonical accepted-entry keys
   `scheme`, `network`, `amount`, `asset`, `payTo`, `maxTimeoutSeconds`, and
   `extra`. Do not accept `recipient`, `address`, `expiry`, `expires_at`,
   `maxAmountRequired`, or other aliases as replacements.
5. **Bind resource identity.** Require body `resource`,
   `payment_required.resource.url`, and `accepts[0].extra.resource.url` to be
   equal. Permit either the exact endpoint path or an absolute URL whose origin
   equals `StockTrendsClient.apiBaseOrigin`, whose pathname equals the exact
   allowlisted endpoint path, and which has no credentials, fragment, or
   unapproved query. All other hosts, paths, or URL forms fail closed.
6. **Keep units distinct.** Require `accepts[0].amount` to be a bounded
   canonical positive digit string with no decimal point or sign. Require
   `pricing.amount_usd` to be a bounded positive fixed-six decimal string. Do
   not convert or equate them without a source-confirmed token-decimals field;
   header/body identity already proves the atomic amount was not altered.
7. **Cross-check payment meaning.** Require
   `pricing.network === accepts[0].network`,
   `pricing.token === accepts[0].asset`, and
   `pricing.scheme === accepts[0].scheme`. For the current `eip155:*` source
   contract, require `asset` and `payTo` to be 20-byte `0x` hex addresses.
   Other network/address families remain fail-closed until separately sourced.
   Require `maxTimeoutSeconds` to be a positive JavaScript safe integer; do not
   synthesize an absolute expiry.
8. **Validate header/body identity.** Deep-compare the decoded header object
   with `body.payment_required` before extension filtering or normalization.
   Any missing, extra, reordered-array, changed-type, or changed-value mismatch
   fails closed. Object key order is irrelevant.
9. **Bound extension containers narrowly.** Permit unknown members only under
   `accepts[0].extra`, `payment_required.extensions`, and the one explicitly
   allowed optional envelope extension. Retain them internally for equality or
   ignore them semantically. Reject core-field shadowing, ambiguous dynamic
   keys, prohibited material, non-JSON values, excessive size/depth, and
   extension content used to alter route, amount, asset, payee, scheme,
   network, timeout, proof, settlement, or authorization behavior.
10. **Preserve output omission.** A valid challenge may produce the existing
    safe `payment_required` result, but raw body values, decoded requirements,
    header value, resource URL, amount, asset, payee, timeout, and extension
    contents must remain absent from `content[].text`, structured output,
    metadata, errors, logs, fixtures committed from live data, and files unless
    a later separately reviewed structured-value relay explicitly approves
    each field. PR #76 should reconcile acceptance, not begin proof forwarding.
11. **Preserve every existing capability boundary.** Keep the nine-route
    allowlist, GET-only policy, same-origin construction, one-attempt caps,
    consumed failure reservations, no retry, no API key, no outbound
    payment/proof header, no proof forwarding, no paid output, no dynamic
    registration, and separate API-key behavior unchanged.

## 13. Mock-test requirements for PR #76

All PR #76 network behavior must use injected mocked responses. Required tests:

1. Accept a synthetic compact-mode body that exactly matches
   `build_x402_challenge()` and a standard-base64 header encoding the same
   requirements object.
2. Accept a synthetic full/rich `extensions` variant without changing core
   semantics or outputting extension values.
3. Prove standard-base64 UTF-8 JSON decoding and structural equality; reject
   base64url-only syntax, malformed padding, invalid UTF-8, invalid JSON,
   non-object JSON, oversized encoded/decoded content, and body/header
   divergence at every core field.
4. Require `payment_required` as an object and reject the old boolean fixture
   on the live source-contract path.
5. Require exactly `["x402"]`; reject an object entry, missing `x402`, duplicate
   entries, non-string entries, and extra methods for this narrow contract.
6. Require `accepts.length === 1`; reject empty and multi-entry arrays. Validate
   entry zero at the canonical paths and prove no later entry can be selected.
7. Accept `payTo` and `maxTimeoutSeconds`; reject generic
   `recipient`/`address` and `expiry`/`expires_at` as substitutes or additions.
8. Accept bounded positive atomic integer strings; reject numeric atomic
   values, decimal strings, signs, exponent notation, empty/zero/negative
   values, leading-zero ambiguity, and excessive length.
9. Accept fixed-six positive `pricing.amount_usd`; reject numeric, exponent,
   wrong-precision, zero/negative, and excessive values.
10. Reject mismatches across pricing and the accepted requirement for network,
    token/asset, or scheme.
11. Test relative-path and exact configured-origin absolute resource URLs;
    reject wrong origin, wrong path, credentials, fragment, unapproved query,
    and disagreement among the three resource copies.
12. Accept `extra.assetTransferMethod` present or absent. Accept bounded unknown
    members only inside `extra` and `extensions`; reject the same unknown member
    at body, pricing, requirements, resource, or accepted-entry level.
13. Reject extension overflow, excessive nesting/member count, prohibited
    keys, proof/signature/auth/private-key/seed material, and any attempt to
    shadow or override core payment meaning.
14. Accept the seven-key core body without `stocktrends_preview`. If that known
    envelope extension is retained for compatibility, accept it only as an
    optional bounded ignored object and prove it supplies no required payment
    semantics; reject arbitrary other top-level fields.
15. Require `Payment-Required`; prove the four historically observed metadata
    headers are optional for source-contract validity and cannot replace the
    standard header.
16. Run all nine existing tool/route mappings through synthetic source-shaped
    challenges while proving no real fetch, resolver, catalog, public-resource,
    API-key paid path, proof forwarding, payment, spend, retry, or route
    expansion occurs.
17. Preserve regression tests for the 64-KiB streaming body cap, manual
    redirects, status handling, paid-output-without-proof, caps/reservations,
    symbol policy, and default-off/mode separation.
18. Use unique synthetic sentinels and prove raw header/body/requirements and
    conditional values never appear in structured output, text, errors, logs,
    snapshots, or repository artifacts.

No PR #76 test should call the Stock Trends API, a facilitator, the control
plane, a remote MCP, or MCP Inspector.

## 14. Remaining ambiguities

1. The exact compact and full Bazaar `extensions` schemas are unresolved
   because `discovery.endpoint_metadata` was not among the five supplied files.
2. The final HTTP response-assembly layer is absent. It is therefore unresolved
   where PR #64's `stocktrends_preview` and four non-standard relevant headers
   are added, whether they remain current, and whether any final decorator
   changes builder fields.
3. The supplied files do not identify the deployed API revision used by the
   PR #73 canary. Source comparison cannot prove the exact runtime rejection
   predicate.
4. `build_x402_requirements()` emits one accepted option, but
   `_extract_single_requirement()` tolerates multiple and selects the first.
   The wider protocol's multi-option legality and selection rules remain
   unresolved; PR #76 should remain single-entry.
5. Source sets `maxTimeoutSeconds=300` by default but specifies no maximum.
   PR #76's positive-safe-integer bound is a defensive MCP bound, not an API
   statement that all such values are operationally valid.
6. Network, asset, and payee inputs are environment-configurable and are not
   validated by the builder. The current defaults support an EVM-specific
   format rule; other network families require separate source confirmation.
7. The builder uses configured token decimals to create the atomic amount but
   does not include the decimals value in the requirements object. The MCP
   cannot independently prove conversion parity from `amount_usd` without
   importing or inventing API configuration.
8. Imported service metadata constants are placed into `ResourceInfo`, but
   their upstream declarations and bounds were not supplied.

None of these ambiguities requires generic validation loosening. The bounded
PR #76 rules above either accept the current builder output or fail closed.

## 15. Explicitly prohibited conclusions

This memo does **not** conclude or approve that:

- PR #73's exact rejected field or predicate is known;
- live x402 challenge relay is ready;
- the MCP supports transaction-complete or fulfilled x402;
- proof forwarding, payment-header construction, payment, settlement,
  facilitator verification, wallet custody, signing, or spending is supported;
- the API-key path changes or may fall back to x402;
- a remote or hosted MCP, OAuth, Bearer-token behavior, dynamic tool
  registration, new payment headers, or route promotion is approved;
- `/v1/cost-estimate` or any planning result authorizes a paid call;
- the nine-route allowlist may expand;
- marketplace, directory, package, or listing metadata may claim live x402
  support; or
- any output is investment advice.

MPP remains a separate control-plane-backed rail. `mpp.py` validates its own
Stock Trends payment headers, channel identifier, decimal STC-equivalent
amount, replay status, and control-plane authorization. `mpp_client.py` performs
MPP authorize/capture/void calls. `policy_provider.py` can make `x402` and `mpp`
available as endpoint rails and supplies policy/pricing-rule choices, but it
does not define or alias the x402 challenge body's canonical fields. None of
those modules justifies applying MPP headers or semantics to x402.

## 16. Readiness verdict and next step

**Verdict: READY FOR A NARROW, MOCK-ONLY PR #76 VALIDATOR RECONCILIATION; NOT
LIVE-X402 READY.**

The source-confirmed core mismatch is sufficient to replace the PR #72 live
validator's legacy value model with the canonical x402 v2 builder contract in a
separately reviewed implementation. PR #76 should implement only the rules and
mock tests in sections 12 and 13. It should not run another canary, add
diagnostic live telemetry, relay conditional values, forward proof, or change
payment/runtime capability.

PR #74 proposed a diagnostic step only if source confirmation remained
insufficient. This PR supplies source confirmation for the core requirements,
body, and encoded header relationship, so the safe next step can be mocked
contract reconciliation. The remaining extension and final-decoration
ambiguities are handled by narrow bounded containers and an optional known
envelope-extension rule; they do not authorize a live request. Any later live
revalidation remains a separately planned, separately reviewed, exactly
authorized task after PR #76 is merged and independently validated.
