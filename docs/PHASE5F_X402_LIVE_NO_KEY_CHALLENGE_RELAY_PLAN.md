# Phase 5F x402 Live No-Key Challenge Relay Plan

Plan date: 2026-07-13

This document is PR #71. It is a security-sensitive, docs-only design and
validation plan for a possible future live no-key x402 challenge-relay step.
It follows the validated mock-only public wiring in PR #69 and PR #70. It does
not implement that step, execute validation, or authorize any live request.

## 1. Status

- Docs-only design and validation plan.
- No implementation.
- No validation executed.
- No live Stock Trends API calls.
- No credential-free Stock Trends API calls.
- No API key used, requested, inspected, printed, logged, or stored.
- No payment proof created, accepted, forwarded, inspected, logged, or stored.
- No proof forwarding.
- No payment header.
- No payment.
- No spend.
- No paid output.
- No MCP Inspector.
- No remote or hosted MCP.
- No package publication, directory submission, or marketplace launch.

PR #71 approves no runtime change. Every future implementation and every future
live call remains a separate reviewed step.

## 2. Evidence base

This plan builds on the reviewed Phase 5F sequence:

- **PR #64: no-key 402 challenge verification.** The separately authorized,
  no-spend verification found a consistent HTTP `402` challenge shape across
  the nine current paid routes. It recorded status, header names, top-level body
  key names, and field-category presence only. It did not capture or approve
  live values and did not verify proof forwarding.
- **PR #65: relay implementation design.** It separated challenge relay from
  unresolved proof/envelope forwarding and selected a mock-first approach.
- **PR #66: internal mock helper.** It added strict default-off x402 flags, the
  nine-route allowlist, local shape normalization, proof-like input rejection,
  paid-output-without-proof failure, and redaction guards. It made no network
  request and exposed no public x402 tool surface.
- **PR #67: internal mock validation.** It validated PR #66 as safe internal,
  mock-only groundwork with no public exposure, live calls, proof, payment, or
  spend.
- **PR #68: public wiring design.** It selected reuse of the existing nine paid
  semantic tool names for mock-only public x402 wiring and deferred live
  no-key challenge relay to this PR #71 plan.
- **PR #69: mock-only public wiring.** It exposed those nine semantic tool names
  behind explicit x402 flags, using deterministic local challenge results, no
  resolver or network path, and same-session repeated-identical denial.
- **PR #70: no-spend public mock validation.** It validated the PR #69 surface
  and result contract as safe local/mock groundwork only. It explicitly found
  the implementation not live-challenge, proof-forwarding, or marketplace-
  claim ready.

The current validated baseline is **1/10/10/0/9**:

| Surface | Current count / posture |
| --- | --- |
| Default/free mode | 1 tool |
| API-key paid mode | 10 tools |
| x402 mock mode | 10 tools |
| Public resources | 10 |
| Prompts | 0 |
| x402/auth-capable paid-route allowlist | 9 `GET` routes |
| Transport | local stdio only |
| Proof forwarding | absent and fail-closed |

## 3. Exact design gap

The current gap is narrow and explicit:

- Public mock wiring exists through the nine existing paid semantic tool names.
- No MCP tool currently makes a live no-key challenge request.
- No API-authored challenge value is currently relayed. The mock returns only
  approved names/categories and redacted placeholders.
- Proof input, proof storage, proof forwarding, payment-header construction,
  payment, and spend remain absent.
- The current marketplace posture cannot claim live x402 support. Mock-only
  payment-required metadata is not live challenge relay and is not
  transaction-complete x402 support.

PR #71 closes only the design/validation-plan gap. It does not close the runtime
or validation gap.

## 4. Proposed live no-key challenge mode

A future implementation may add a distinct live challenge mode with all of the
following boundaries:

- Local stdio only.
- No API key.
- No proof input or proof schema.
- No payment header.
- No authorization credential.
- No payment and no spend.
- No paid `api_data`.
- At most exactly one no-key `GET` request per accepted invocation, to the
  corresponding allowlisted paid route, solely to obtain the API's HTTP `402`
  payment-required challenge.
- The MCP returns only approved API-authored challenge material plus approved
  shape and safety metadata.
- A response containing paid output without proof fails closed and the paid
  content is neither returned nor logged.
- No automatic retry, second call, mode switch, or payment attempt.
- No instrument lookup/resolve or other resolver call unless a later plan
  separately approves it. The first live no-key implementation must make none.

This mode is challenge relay only. `api_request_sent=true` would mean only that
the one no-key challenge request was sent; it would not mean paid execution was
authorized or occurred.

## 5. New explicit live flag policy

Recommend the new flag:

`STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY`

The name is deliberately additive and explicit. Existing
`STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION` currently means deterministic
mock challenge behavior. Silently changing that flag into network permission
would violate the reviewed PR #66-#70 contract.

Required policy:

- Default is off.
- Only literal `true` enables the future live path.
- `false`, `0`, `no`, and `off` disable it.
- Ambiguous truthy values, including `1`, `yes`, `on`, `enabled`, and arbitrary
  non-empty strings, fail configuration.
- Live mode requires both `STOCKTRENDS_ENABLE_X402_RELAY=true` and
  `STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION=true`.
- A live flag set to `true` without either prerequisite fails startup with
  `invalid_config` and denial reason `x402_live_challenge_not_enabled` before
  tool registration or network access.
- If the live flag is absent or disabled, relay plus challenge execution remains
  exactly the existing mock-only mode.
- `STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING=true` remains unsupported and fails
  closed.
- Any active x402 posture combined with API-key paid mode remains invalid and
  fails with `x402_mixed_mode_invalid` before `STOCKTRENDS_API_KEY` is read.
- No silent fallback or precedence exists among default/free, API-key, x402
  mock, and x402 live challenge modes.

The future implementation should extend the config type with a distinct live
mode rather than changing `mockOnly: true` in place. Existing mock config and
error behavior must remain backward-compatible when the live flag is absent.

## 6. Tool exposure policy

The public surface remains count-stable:

| Mode | Tools | Resources | Prompts |
| --- | ---: | ---: | ---: |
| Default/free | 1 | 10 | 0 |
| API-key paid | 10 | 10 | 0 |
| x402 mock | 10 | 10 | 0 |
| Future x402 live challenge | 10 | 10 | 0 |

The x402 modes reuse the nine existing paid semantic names plus the public
planning tool. They add no duplicate x402-specific tools, prompts, resources,
or proof inputs. Existing strict tool schemas remain the input boundary. The
API-key paid registrations, pricing mirrors, resolver behavior, and result
contract remain unchanged when x402 flags are absent.

## 7. Allowlist policy

The future live no-key challenge path is restricted to exactly these nine
current paid `GET` routes:

1. `/v1/stim/latest`
2. `/v1/stim/history`
3. `/v1/indicators/latest`
4. `/v1/indicators/history`
5. `/v1/selections/latest`
6. `/v1/market/regime/latest`
7. `/v1/market/regime/history`
8. `/v1/breadth/sector/latest`
9. `/v1/leadership/summary/latest`

The allowlist should continue to derive from the reviewed paid endpoint
policies while tests pin the exact nine-route list. Method must be `GET`.
Everything else fails before network access.

Explicitly excluded:

- public resources;
- `/v1/pricing/catalog` and other pricing/catalog routes;
- `/v1/instruments/lookup` and `/v1/instruments/resolve`;
- deferred routes;
- all `POST` routes;
- decision or portfolio routes;
- Intelligence Agent routes or artifacts; and
- package, directory, registry, listing, or marketplace routes.

PR #71 approves no route promotion and no pricing-mirror change.

## 8. Symbol and resolver policy

For the first live no-key challenge relay:

- The four symbol-dependent ST-IM and indicators tools require a canonical
  `symbol_exchange` input.
- A raw `symbol`, or `symbol` plus `exchange`, fails closed with
  `x402_symbol_exchange_required` before any resolver or network call.
- No instrument lookup or resolve call is allowed.
- No default exchange is selected or inferred.
- The future request may translate the already-validated canonical underscore
  form into the API's existing route-query representation, but it must not
  discover or change the identity.
- Existing API-key resolver behavior remains unchanged when x402 flags are
  absent.

## 9. Challenge value policy

PR #64 verified challenge **shape only**, not live value safety. A live response
therefore passes through a provenance-aware, allowlisted extractor; it is never
returned wholesale.

### Always allowed as metadata

These are non-value observations and may be returned when derived from the
exact route response:

- HTTP status code;
- tool name;
- endpoint path;
- method;
- approved response header names, never their values;
- approved top-level body key names; and
- approved field-category names.

### Conditionally relayable only after explicit plan and implementation approval

The following value categories may be necessary for an x402 client, but are not
blanket-approved by PR #64 or by their mere presence:

- amount;
- asset;
- network;
- recipient/address;
- expiry or expiration time;
- accepted payment methods;
- pricing rule or family; and
- challenge, correlation, or nonce identifiers.

PR #71 classifies these as conditional candidates only. PR #72 may relay a
candidate only when its reviewed implementation provides an exact response-field
mapping, strict type/size/format checks, route binding, API-response provenance,
structured-result-only handling, and tests proving omission on ambiguity. An
unknown location, extra field, unexpected type, unapproved category, or failed
safety check returns `x402_live_challenge_value_not_approved`; it is not passed
through.

### Never relayable or accepted

- payment proof or proof envelopes;
- private keys or seed phrases;
- wallet signing or custody material;
- `Authorization`, Bearer, or API-key values;
- any payment header supplied by a client;
- raw paid data or `api_data` from a no-proof response;
- full raw response bodies or headers; and
- raw payload dumps in files, logs, errors, screenshots, or reports.

Non-negotiable rules:

- The MCP never invents amount, asset, network, recipient, expiry, accepted
  method, pricing, challenge, correlation, or nonce values.
- A relayable value must be API-authored in the exact response to the exact
  allowlisted route invocation.
- Uncertain values are redacted or omitted; uncertainty never widens relay.
- No raw payload is logged or persisted.
- No response header value is logged. Header values are omitted unless a later
  reviewed field-specific policy explicitly classifies one as safe to return.
- The initial `x-request-id` value is **omitted/redacted**. Only the header name
  and presence may be returned. Relaying its value requires a later explicit
  safe-value classification.
- Values required by an x402 client are transmitted only inside the structured
  MCP result, never in text logs, startup output, exception text, or validation
  artifacts.

## 10. Result contract for live no-key challenge

A successful future live challenge relay returns a structured result with:

- `status: payment_required`;
- `error_code: x402_payment_required`;
- `api_status: 402`;
- `tool_name`;
- `endpoint_path`;
- `method: GET` (and the existing `http_method: GET` alias if compatibility
  requires it);
- `challenge_source: api_no_key_live`;
- approved header names present;
- approved top-level body keys present;
- approved field categories present;
- only approved, API-authored challenge values, in a dedicated structured
  challenge-values object;
- no `api_data` field;
- `paid_execution_authorized=false`;
- `paid_execution_occurred=false`;
- `api_request_sent=true`;
- `auth_header_sent=false`;
- `payment_header_sent=false`;
- `proof_forwarded=false`;
- `spend_occurred=false`;
- `paid_api_data_returned=false`; and
- `automatic_paid_retries=false`.

The result must distinguish live challenge relay from the existing mock result.
It must not claim payment authorization, payment completion, settlement, or
paid execution. Missing conditional values are omitted, never synthesized as
defaults or redacted strings that a client could mistake for usable values.

### Structured-versus-text serialization boundary

The dedicated structured challenge-values object is the only approved MCP
serialization location for conditional live values. Conditional live values
must never be copied into MCP `content[].text`, generic text serialization,
error text, logs, validation artifacts, screenshots, dumps, or output files.

The current PR #69 mock handler serializes its full local/redacted result with
`JSON.stringify` into `content[].text`. PR #72 must not reuse that boundary for
a live result containing approved conditional values. The live handler must
instead return conditional values only in structured content/result metadata
and use either no text content, if MCP-compatible, or a fixed/redacted text
summary containing no conditional value. If the target MCP client/runtime
cannot preserve structured content without duplicating those values into text,
the live path must omit the conditional values or fail closed; compatibility
must never justify text leakage.

### Registration truthfulness and mode separation

PR #72 must use live-specific registration descriptions, annotations, and
`_meta` rather than reusing the current mock-only registration claims:

- the live description must state that one external no-key Stock Trends API
  request may occur after all live gates pass;
- it must also state that no API key is used, no proof is forwarded, no payment
  header is sent, no payment or spend occurs, and no paid data is returned;
- live annotations must use an open-world/external-call posture and must not set
  `openWorldHint: false` for the live no-key path;
- live `_meta` must distinguish live no-key challenge mode from mock challenge
  mode and must not advertise `apiRequestSent: false`; static registration
  metadata should truthfully describe a possible single external request, while
  the invocation result records whether the request was actually sent; and
- existing mock registrations remain unchanged: their descriptions stay
  mock-only/no-request, their `_meta` continues to advertise no request, and
  their closed-world annotations remain appropriate for local behavior.

API-key paid registrations also remain unchanged when x402 flags are absent.

## 11. Request policy

The future challenge request must satisfy every rule below:

- No API key.
- No `Authorization` or Bearer credential.
- No payment header.
- No cookies or ambient credentials; the request must explicitly omit
  credentials.
- No proof or proof-like material.
- `GET` only.
- Same reviewed Stock Trends API origin as the current client configuration;
  no caller-supplied host or absolute URL.
- Existing HTTPS origin validation and exact origin/path coupling preserved.
- No public resource, pricing/catalog, resolver, or other side call.
- No request body.
- No retry and no automatic second request.
- Redirects are not followed; any redirect fails closed before an untrusted
  origin can be contacted.
- Only safe `Accept` and `User-Agent` headers, if needed.
- Query parameters come only from validated non-secret tool inputs and current
  bounded schemas.
- Neither logs nor errors print the full request URL or its query string.
  Endpoint path is the maximum request identity recorded. Secret query
  parameters are forbidden by design.

The response may be parsed in memory only long enough to validate status, exact
shape, value provenance, and approved fields. It is never dumped or persisted.

## 12. Spend, cap, and loop policy

No proof means no payment or spend is expected. The implementation must still
defend against unexpected behavior:

- HTTP success or paid-data-shaped output without proof fails closed with
  `x402_live_challenge_paid_output_without_proof`; paid content is discarded.
- A per-tool live challenge cap and a total per-session live challenge cap are
  mandatory before network access.
- Recommended conservative defaults are **one live challenge per tool per
  server session** and **three live challenges total per server session**.
- A normalized signature contains tool, route, method, and recursively
  key-sorted validated input. It is reserved synchronously before network
  access.
- A repeated identical invocation fails before network with
  `x402_live_challenge_repeated_call`.
- A request consumes its cap/signature reservation immediately before its one
  network attempt. The reservation remains consumed for that server session
  even if the API returns an unexpected status or shape, preventing a retry
  loop. State is in-memory only and resets on restart.
- No background, scheduled, CI, unattended, bulk, pagination, sweep, exchange
  iteration, or date-walking behavior.
- No automatic retry on timeout, network error, `402`, `429`, or `5xx`.
- No fallback to API-key mode.
- No fallback to a fabricated mock challenge after a live failure. A local,
  deterministic denial may be returned, but it must remain an error result and
  must not masquerade as an API-authored challenge.

The challenge caps are request-safety controls, not spend caps and not payment
authorization.

## 13. Error model

The future live path uses deterministic, secret-free errors:

| Code | Meaning / fail-closed point |
| --- | --- |
| `x402_live_challenge_disabled` | Live flag is absent or explicitly off. A direct live-helper request sends no network call. Normal public behavior remains the existing mock path when its flags are enabled. |
| `x402_live_challenge_not_enabled` | Live flag is true but required relay/challenge gates are not both true; configuration fails before registration or network. |
| `x402_live_challenge_cap_exceeded` | Per-tool or per-session live cap would be exceeded; no network call. |
| `x402_live_challenge_repeated_call` | Same normalized live challenge signature was already reserved/used; no network call. |
| `x402_live_challenge_unexpected_status` | The one request returned a status other than the approved `402` challenge status, excluding the special paid-output case; no retry or fallback. |
| `x402_live_challenge_unexpected_shape` | The `402` headers/body do not match the exact approved shape; no values relayed. |
| `x402_live_challenge_value_not_approved` | A value/category/path/type is not explicitly approved; uncertain material is omitted and the result fails closed. |
| `x402_live_challenge_paid_output_without_proof` | A no-proof request returned success or paid-data-shaped output; paid output is discarded. |
| `x402_route_not_allowlisted` | Reuse the existing code for a route/method outside the nine `GET` routes; no network call. |
| `x402_symbol_exchange_required` | Reuse the existing code for non-canonical symbol input; no resolver or network call. |
| `x402_proof_forwarding_not_enabled` | Reuse the existing code for proof-like input or proof-forwarding configuration; no proof or request. |
| `x402_mixed_mode_invalid` | Reuse the existing code for API-key/x402 mixed posture; fail before API-key read. |

Existing mock codes remain unchanged, including `x402_challenge_unavailable`,
`x402_repeated_challenge_call`, `x402_challenge_unexpected_shape`, and
`x402_paid_output_without_proof`. `x402_payment_required` remains the successful
payment-required result code in both mock and live challenge modes, with
`challenge_source` distinguishing them.

## 14. Secret-safety and redaction policy

The current default-deny redaction posture remains in force:

- Recursive key and value scanning is required.
- Proof-, payment-, header-, auth-, wallet-, private-key-, seed-, and
  address-like material fails closed unless an exact API-authored challenge
  field has been explicitly approved for structured relay.
- Bare `ADDRESS` assignment values remain redacted.
- Unsafe values are never echoed in denial text.
- Raw payload dumps and raw header dumps are forbidden.
- Header values are never logged.
- Conditional live values are forbidden from MCP `content[].text`, errors,
  logs, generic serialization, validation artifacts, screenshots, dumps, and
  output files. They may appear only in the approved structured challenge-values
  object after every provenance and classification gate passes.
- Changed-file secret-shaped scanning is required for PR #72 and PR #73.

Recipient/address handling requires a narrow provenance exception, not a global
redaction weakening:

- Client-supplied, mock, fixture, test, log, error, or unclassified raw
  address-shaped values remain rejected/redacted, including raw EVM-shaped
  values.
- An API-authored recipient value may be considered only when extracted from an
  explicitly approved response field for the exact route response, validated
  under a reviewed format/length rule, and placed only in the dedicated
  structured challenge-values object.
- That exception never permits the value in logs, errors, fixtures, snapshots,
  raw dumps, or generic serialization.
- If provenance or classification cannot be proven, return
  `x402_live_challenge_value_not_approved` and omit the value.

PR #72 must preserve the generic redactor and add a typed, provenance-aware
allow path rather than teaching the global redactor that address-shaped values
are generally safe.

## 15. Validation plan for future implementation

### PR #72: live no-key challenge-relay implementation

PR #72 is allowed only after PR #71 approval. Its automated tests remain fully
mocked and must prove:

- default/free tool count remains one;
- API-key paid tool count remains ten;
- x402 mock tool count remains ten;
- x402 live challenge tool count remains ten;
- resources remain ten and prompts remain zero;
- no new prompts or resources;
- live flag absent preserves exact mock-only behavior;
- live flag present with both prerequisite flags allows the no-key live
  challenge code path;
- strict live-flag parsing and prerequisite failure;
- mixed x402/API-key mode fails before API-key read;
- all nine semantic tools map only to their exact allowlisted `GET` routes;
- canonical `symbol_exchange` is required for symbol-dependent tools;
- raw symbol input makes no resolver or network call;
- no resolver, pricing/catalog, or public-resource side call occurs;
- repeated-identical calls fail before network;
- per-tool and per-session cap failures occur before network;
- no proof input exists in any public schema;
- proof-like input fails before network;
- no payment header;
- no auth header;
- no cookies or ambient credentials;
- exactly one mocked `GET` at most, with manual redirect handling and no body;
- paid output without proof fails closed and is not returned;
- unexpected status, shape, and value classes fail closed;
- `x-request-id` value is omitted/redacted;
- only typed, approved, API-authored fixture values enter structured output;
- approved conditional live values are present only in the dedicated structured
  challenge-values object and are absent from every `content[].text` item;
- the live serialization boundary does not stringify the full result into text
  when that result contains conditional live values; any live text content is a
  fixed/redacted summary with no conditional value;
- unique synthetic conditional-value sentinels from mocked responses are absent
  from error text and captured logs on both success and failure paths;
- those sentinels are absent from validation artifacts, screenshots, dumps, and
  output files, with repository/output scanning included in acceptance;
- a sentinel approved by the typed value policy is present in the approved
  structured result field only, proving structured relay without generic text
  serialization;
- mock-mode registration descriptions remain mock-only and no-request, mock
  `_meta` continues to advertise no request, and mock annotations remain
  appropriate for no-network behavior;
- live-mode registration descriptions truthfully disclose the possible single
  external no-key Stock Trends API request and the no-key/no-proof/no-payment-
  header/no-payment/no-spend/no-paid-data boundaries;
- live `_meta` identifies live no-key challenge mode, does not advertise
  `apiRequestSent: false`, and is distinct from mock `_meta`;
- live annotations use an open-world/external-call posture and do not use
  `openWorldHint: false`;
- the live result contract and every required safety boolean;
- no `api_data`;
- existing mock codes, mock registration metadata, and API-key paid
  registrations/behavior remain unchanged; and
- all live network behavior is represented by injected/mock fetches only.

PR #72 validation must not call a live or credential-free Stock Trends endpoint,
run MCP Inspector, forward proof, pay, spend, or return paid output.

### PR #73: separately authorized no-spend live validation report

PR #73 is a later docs-only report over the merged PR #72 implementation. It
may run only with the exact authorization in section 16 and must remain:

- no API key;
- no proof;
- no payment header;
- no payment;
- no spend;
- no paid output;
- no raw response or header dump;
- no saved raw body or header value;
- no MCP Inspector; and
- local, supervised, and canary-first.

The first and recommended canary is `/v1/market/regime/latest`, because it is a
strict empty-input snapshot and requires no symbol or resolver. Expansion is
allowed only if the canary returns the expected `402`, the approved shape, and
no paid data. The report may make at most one no-key live call per approved
route, or stop after a smaller canary-first route set if that is safer. Session
caps remain enforced; validation may not weaken them to sweep the route list.

The report records status/shape, approved names/categories, and which conditional
value classes were present and safely relayed. It does not save raw bodies,
headers, request URLs, or unapproved values. Values remain redacted in the
report unless separately classified safe for documentation, which is a stricter
decision than safe structured relay.

Any unexpected paid output, status, shape, value, redirect, secret-like
material, or need for proof stops validation immediately with no further route
calls.

## 16. Authorization phrase for future live validation

PR #73 may make a live no-key validation request only after the operator supplies
this exact source-verbatim phrase as one unbroken line:

```text
AUTHORIZED: run Phase 5F live no-key x402 challenge-relay validation with no API key, no proof, no payment, no spend, no paid output, and no raw payload dumps
```

Without this exact authorization, no PR #73 live validation may run. A
paraphrase, partial phrase, prior-session authorization, plan approval, PR #72
approval, or inferred intent does not count.

## 17. Non-approvals

This plan does not approve:

- implementation in PR #71;
- any live or credential-free call in PR #71;
- proof forwarding;
- payment;
- spend;
- wallet custody;
- private keys or seed phrases;
- signing;
- payment verification or settlement adjudication;
- remote or hosted MCP;
- autonomous paid execution;
- background, scheduled, unattended, CI, bulk, pagination, or sweep behavior;
- deferred routes;
- decision or portfolio routes;
- Intelligence Agent routes or artifacts;
- investment advice;
- package or registry publication;
- directory submission;
- marketplace launch; or
- final or transaction-complete x402 claims.

PR #71 also does not approve PR #72 merely by being written. PR #72 requires
review and approval of this plan first. PR #73 separately requires the exact
section 16 authorization.

## 18. Recommended PR sequence

1. **PR #72: live no-key challenge-relay implementation**, only after PR #71 is
   approved. Keep it local stdio, default-off, no-key, no-proof, no-payment,
   no-spend, and live-network-mocked in automated tests.
2. **PR #73: no-spend live validation report**, only after PR #72 is approved
   and merged and the exact section 16 authorization is supplied. Canary first;
   no API key, proof, payment, spend, paid output, or raw payload dumps.
3. **Later proof-forwarding design**, only after API/server confirmation of the
   proof/envelope header/body mapping, challenge binding, expiry, replay, and
   success/error contract.
4. **Later proof-forwarding implementation and validation**, only if separately
   planned, approved, and authorized. Nothing in PR #71-#73 supplies that
   approval.
5. **Later marketplace/listing update**, only after the actual posture is true,
   implemented, and validated, with language limited to the capability that
   genuinely exists.

## 19. Rollback and operator safety

- Removing or disabling `STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY` returns
  relay-plus-challenge configuration to the existing mock-only behavior.
- Removing all x402 flags returns to the current default/free path, or to the
  separately configured API-key path under its existing gates.
- No API key is needed or persisted for live no-key challenge mode.
- Live flags and live caps remain per-session unless an operator deliberately
  chooses otherwise; persistent configuration is not recommended.
- Before any future validation, perform parent-shell names-only hygiene for
  `STOCKTRENDS_*` and proof/payment/wallet/private-key/seed-like variable names.
  Never inspect or print values. Any sensitive-looking name is a stop condition
  until the operator clears it.
- Do not recommend or use `setx` or other persistent environment mechanisms for
  live x402 flags.
- Shut down the local server after a supervised validation and re-run the
  names-only hygiene check.
- No runbook, autonomous scheduling, background process, or unattended use is
  approved.

## 20. Final recommendation

Approve PR #71 only as the docs-only design and validation plan for a future
live no-key challenge-relay step.

If PR #71 is approved, proceed next to PR #72 as a narrow, default-off
implementation using the new explicit live flag, the existing semantic tool
surface and nine-route allowlist, canonical-symbol/no-resolver policy, exactly
one no-key `GET`, typed API-authored challenge-value extraction, structured-only
conditional-value serialization, truthful live/open-world registration
metadata, conservative caps, and deterministic fail-closed results. Preserve
the existing mock and API-key registration metadata. Keep all automated network
behavior mocked.

Do not run PR #73 without the exact authorization phrase. Keep proof forwarding,
payment, spend, remote MCP, publication, marketplace launch, and final x402
claims blocked until their own evidence and approvals exist.
