# Phase 5F x402 Live Challenge Contract-Drift Diagnosis

Diagnosis date: 2026-07-13

This document is PR #74. It diagnoses the meaning of PR #73's safely stopped
live canary and defines a bounded reconciliation plan. It does not widen
validation, change runtime behavior, or authorize another request.

## 1. Status

- Docs-only diagnosis and reconciliation plan.
- No implementation.
- No live Stock Trends API calls.
- No credential-free Stock Trends API calls.
- No API key used, requested, inspected, printed, logged, or stored.
- No proof created, accepted, forwarded, inspected, logged, or stored.
- No payment header, payment, or spend.
- No paid output.
- No raw payload, response body, response header value, challenge value, or
  request-identifier value captured or reported.
- No MCP Inspector.
- No remote or hosted MCP.
- No package publication, directory submission, marketplace launch, or x402
  marketplace claim.

PR #74 changes no runtime contract. Every future implementation and every
future live or credential-free request remains a separate reviewed and, where
applicable, exactly authorized step.

## 2. Evidence base

The diagnosis is bounded to the reviewed Phase 5F evidence chain:

- **PR #64 established no-key HTTP 402 challenge shape only.** Its separately
  authorized probes found HTTP `402` and a consistent header-name,
  top-level-key, and field-category shape across the nine reviewed paid routes.
  It captured no response values and did not establish that any conditional
  challenge value was safe to relay.
- **PR #71 required a strict value policy and structured-only relay.** It
  required exact path, type, format, size, route-binding, and provenance checks;
  uncertain or unapproved material had to fail closed. Conditional values were
  forbidden from text, logs, errors, dumps, screenshots, and validation
  artifacts.
- **PR #72 implemented a default-off live no-key challenge path.** The path has
  exact shape and value validators, bounded streaming and declared-length caps,
  manual redirect handling, no credentials, no proof, no payment header, no
  retry, consumed failure reservations, and mocked-network automated tests.
- **PR #73 authorized one canary and stopped safely.** Exactly one no-key
  `GET /v1/market/regime/latest` returned HTTP `402`; the MCP then rejected the
  challenge material as `x402_live_challenge_value_not_approved`. It returned
  no challenge values, paid data, or `api_data`, and made no retry or second
  route call.

Current posture: the guardrails held. Live x402 challenge-relay readiness was
not established.

## 3. Interpretation of PR #73

PR #73 supports the following interpretation, and no broader one:

- HTTP `402` confirms that the API can return a payment-required status for the
  canary route.
- `x402_live_challenge_value_not_approved` means the MCP could not safely map
  and approve the API-authored challenge material under the current exact
  contract.
- The result identifies contract drift or contract incompleteness between the
  live challenge and the MCP validator. It is not a payment success.
- It is not live x402 readiness.
- It is not proof-forwarding readiness.
- It is not marketplace or directory-claim readiness.
- The correct response is diagnosis and contract reconciliation, not loosening
  validators or expanding route validation.

The code intentionally uses the same error for several safe rejection points,
including an unapproved top-level field, an unexpected nested field, a missing
required nested field, a type or format mismatch, or a forbidden value class.
Because PR #73 retained no raw value or rejected path, the exact rejection point
is intentionally unknown.

## 4. Likely mismatch classes

The following are possible mismatch classes, not findings about the live
response. PR #73 supports none of them individually because it preserved no raw
value, body snippet, header value, or rejected path.

| Possible mismatch class | Diagnostic meaning |
| --- | --- |
| Live body/header value path differs from PR #64 shape assumptions | PR #64 recorded names and category presence, not the exact nested value paths required by PR #72. A category may be present but located somewhere the validator does not approve. |
| Field name differs from the MCP allowlist | The API may use a contract name such as `payTo` rather than `recipient`/`address`, `maxAmountRequired` rather than `amount`, or `accepts` rather than `accepted_payment_methods`. These are examples only, not observed live facts. |
| Expiry representation differs | A value may use a different field name, numeric epoch, offset timestamp, fractional precision, or other format rather than the validator's strict calendar-valid UTC `Z` timestamp policy. |
| Amount unit or format differs | A value may be an integer-like string, decimal, numeric value, nested quantity/unit pair, atomic-unit amount, or differently named maximum amount that does not match the current bounded positive-number policy. |
| Accepted-payment-method structure differs | The API may return a differently nested object, different required fields, an object instead of an array, or additional method metadata not admitted by the current exact field map. |
| Pricing or preview object differs | Required fields, nesting, alternatives, or field names may differ from the current `pricing` and `stocktrends_preview` validators. |
| Challenge, correlation, or nonce identifiers use unexpected paths | Identifiers may be absent, combined, renamed, nested elsewhere, use a non-string type, or use a format outside the current identifier policy. |
| API response contains extra fields | The MCP deliberately rejects extra top-level or nested material rather than assuming it is safe. A harmless new API field can therefore produce the same fail-closed code as a sensitive or malformed field. |
| API shape changed since PR #64 | The API contract may have evolved after the shape-only verification snapshot. PR #64 cannot establish current value-path parity. |
| MCP validator is too narrow for the actual API contract | The validator may accurately implement the approved PR #71 policy yet still encode field names, alternatives, or formats that are narrower than the current server contract. |

The current MCP contract helps bound the investigation but does not identify the
live mismatch. It requires the exact reviewed top-level keys; exact approved
nested fields; required/alternative recipient, expiry, pricing, and identifier
fields; strict amount, identifier, address-like, and UTC timestamp formats; and
no unexpected nested material. Any reconciliation must compare those rules to
a confirmed API contract without exposing live values.

## 5. Non-negotiable safety constraints

Contract reconciliation must preserve all of the following:

- Do not broaden validators generically.
- Do not accept arbitrary scalars, arbitrary object members, or unknown paths.
- Do not log or save raw bodies, raw headers, body snippets, or header values.
- Do not return unapproved values through structured content, text, metadata,
  errors, logs, reports, screenshots, or artifacts.
- Do not add proof forwarding.
- Do not add payment-header construction.
- Do not add wallet, signing, payment, settlement, or payment-verification
  behavior.
- Do not retry and do not expand route validation.
- Do not claim live x402 support.
- Do not use API keys.
- Do not use remote MCP.

A future value-policy change must be field-specific, contract-evidenced,
route-bound where needed, format- and size-bounded, fully mocked in tests, and
independently reviewed. Compatibility pressure is not evidence.

## 6. Preferred reconciliation source

The safest source-of-truth order is:

1. **First preference: API/server-side contract confirmation or source
   review.** Review the authoritative API implementation, schema, or maintained
   contract documentation for the HTTP `402` challenge object. Confirm field
   names, paths, required/optional status, alternatives, types, formats, and
   whether extra fields are permitted without making a live call or copying
   production values.
2. **Second preference: a narrowly designed shape-only diagnostic path.** If
   authoritative source or documentation cannot resolve the mismatch, a later
   implementation may report path names, field names, type classes,
   presence/absence, coarse format classes, and the rejection reason only. It
   must never report values.

Live probing remains canary-only until the contract is reconciled. Server-side
or documentation evidence should be exhausted before another live diagnostic
canary is considered.

## 7. Proposed diagnostic output policy

A future diagnostic capability, if needed, should be a separate implementation
with this contract:

- Default off behind a distinct explicit diagnostic flag.
- Local, supervised, and single-session only.
- No API key.
- No proof.
- No payment header, payment, or spend.
- No paid output.
- No route expansion.
- Same canary route only unless a later review separately approves another
  route.
- No persistence, generic serialization, screenshots, raw-output files, or
  diagnostic artifacts containing response values.

It may report only:

- route and method;
- HTTP status;
- top-level schema key names;
- approved response header names present, never header values;
- rejected path names;
- field/category names;
- observed type class: `string`, `number`, `boolean`, `object`, `array`, or
  `null`;
- coarse string-length bucket: `empty`, `short`, `medium`, or `long`, never an
  exact length;
- format class: `iso_utc_like`, `digit_string`, `address_like`,
  `identifier_like`, or `unknown`;
- presence/absence of expected fields; and
- the deterministic rejection code.

Schema key and path reporting must itself fail closed: a dynamic or
value-shaped object key must not be emitted as a field name. The diagnostic may
report only that a `dynamic_or_value_shaped_key` category was observed.

It must never report:

- raw values or transformed/reversible encodings of values;
- full addresses;
- amounts or exact length/count values;
- recipient, `payTo`, or equivalent destination values;
- challenge, nonce, or correlation identifiers;
- `x-request-id` values;
- response header values;
- raw body snippets;
- request URLs or query strings; or
- any copied live response body or header value.

Format and length classifiers must return only their fixed enum label and must
not include the source value in errors, logs, test snapshots, or result text.
Automated tests for a future implementation must use synthetic fixtures only
and prove that unique sentinels never escape into text, errors, logs, or files.

## 8. Proposed next PR sequence

Recommended sequence after PR #74:

1. **PR #75, preferred:** a docs-only API-contract confirmation memo based on
   server/API source or maintained challenge-schema documentation, with no live
   calls.
2. **Or PR #75, only if source confirmation is unavailable:** implement
   diagnostic-only rejection telemetry behind an explicit default-off
   diagnostic flag. Tests must be fully mocked; PR #75 itself makes no live
   call.
3. **PR #76:** an authorized single-canary diagnostic validation report only
   if the confirmed contract remains insufficient and only after new exact
   authorization. No route expansion.
4. **PR #77:** field-specific validator reconciliation based on the confirmed
   contract and diagnostic evidence, with mocked tests and no live calls.
5. **PR #78:** a separately authorized, no-spend live canary revalidation after
   reconciliation.
6. **Only later:** consider route expansion, after the canary produces a safely
   mapped challenge under the reconciled contract.

Proof forwarding remains a separate future design only after challenge relay
works. Nothing in PR #74 or this sequence approves its implementation or
validation.

## 9. Future authorization policy

If a future diagnostic live canary is still necessary after source-first
reconciliation, the operator must provide this exact phrase as one unbroken
line:

```text
AUTHORIZED: run Phase 5F x402 live challenge diagnostic canary with no API key, no proof, no payment, no spend, no paid output, no raw values, and no route expansion
```

No diagnostic live call may run without that exact phrase supplied for that
specific future validation. Plan approval, implementation approval, a
paraphrase, a partial phrase, or inferred intent does not count.

## 10. Do not reuse PR #73 authorization

- PR #73's authorization was single-purpose and expired when the PR #73 canary
  completed and stopped.
- It does not authorize PR #74, a diagnostic implementation, or any future
  diagnostic probe.
- No prior approval, prior-session authorization, paraphrase, or general request
  to investigate is sufficient.
- PR #74 performs no live or credential-free request and grants no future
  request authority.

## 11. Readiness implications

- Default-off mock x402 remains safe and unchanged.
- The default-off live no-key path exists, but the actual canary challenge
  currently fails closed at the value-policy boundary.
- Live x402 challenge relay is not operationally ready.
- Marketplace or directory claims must not mention live x402 support yet.
- Directory/marketplace submission remains blocked for x402 claims.
- The API-key local stdio paid path is separate and unaffected by this result
  and by PR #74.

An HTTP `402` plus a safe validator rejection is useful security evidence, but
it is not a successful relay and must not be presented as one.

## 12. Security model impact

- PR #74 changes no runtime, tool, resource, prompt, route, pricing, config, or
  transport behavior.
- PR #72's guardrails were validated by PR #73 as fail-closed: the challenge
  values and paid output stayed withheld, the reservation was consumed, and no
  retry occurred.
- Future work must preserve the no-key, no-proof, no-payment-header, no-payment,
  no-spend, no-paid-output boundaries.
- Any value-policy widening requires authoritative evidence, field-specific
  policy, synthetic tests, secret-safety checks, and independent review.
- A diagnostic mode must be less capable than the relay path: it classifies
  shape only and cannot return a usable challenge value.

## 13. Validation checklist for PR #74

Because PR #74 is docs-only, acceptance requires:

- `git diff --check` passes.
- Only this new diagnosis document and one README documentation-index link are
  changed.
- `src/`, `tests/`, `package.json`, and `package-lock.json` remain unchanged.
- A secret-shaped scan is run over the changed files.
- No live Stock Trends API call occurs.
- No credential-free Stock Trends API call occurs.
- No API key is used, requested, inspected, printed, logged, or stored.
- No MCP Inspector or paid validation occurs.
- No live x402 validation occurs.
- No proof, payment header, payment, or spend activity occurs.
- No remote MCP is used.
- No commit or push occurs.

The secret-shaped scan must cover API-key-looking strings, populated auth or
payment headers, Bearer tokens, private-key and seed material, wallet material,
environment-file content, realistic credentials, proof-like values, raw
payloads, populated response-header values, copied live response values, full
raw address-shaped values, and live challenge values. Boundary terms, field
names, prohibition language, and the exact future authorization phrase are not
secret values.

## 14. Final recommendation

Approve PR #74 as a docs-only diagnosis and reconciliation plan. The next safe
step is source-first API/server contract confirmation in PR #75, without live
calls. Compare the confirmed challenge schema to the current exact validator and
change nothing until the mismatch is evidenced.

Only if authoritative contract review cannot identify the rejected shape should
a later PR implement default-off, shape-only rejection telemetry with fully
mocked tests. Any live diagnostic use then requires the new exact authorization
phrase and remains restricted to the same single canary. Do not loosen
validators generically, repeat PR #73, expand routes, add proof or payment
behavior, or claim live x402 readiness.
