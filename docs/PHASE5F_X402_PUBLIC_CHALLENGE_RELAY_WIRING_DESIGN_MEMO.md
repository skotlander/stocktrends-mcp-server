# Phase 5F x402 Public Challenge Relay Wiring Design Memo

Design date: 2026-07-13

This memo is PR #68. It is a docs-only design memo for how the internal
mock-only x402 challenge-relay helper added in PR #66 could become visible
through MCP clients in a later implementation PR, while preserving all current
Stock Trends MCP Server boundaries.

It does not implement public wiring. It does not approve live x402 behavior,
proof forwarding, payment, spend, remote MCP, package publication, directory
submission, or marketplace x402 claims.

## 1. Status

- Docs-only design memo.
- No implementation.
- No validation.
- No live Stock Trends API calls.
- No credential-free Stock Trends API calls.
- No API key use, request, inspection, printing, logging, or storage.
- No payment proof.
- No proof forwarding.
- No payment header.
- No payment.
- No spend.
- No wallet custody, private-key handling, seed phrase handling, signing, or
  payment verification.
- No remote or hosted MCP.
- No MCP Inspector session.
- No package publication.
- No directory submission.
- No marketplace launch or final x402 marketplace claim.

This memo is design input only. Every runtime change described here requires a
later reviewed implementation PR and a separate validation PR.

## 2. Evidence Base

This design builds on the reviewed Phase 5F chain and current source posture:

- PR #62 selected a non-custodial x402 relay architecture. The MCP adapter is a
  relay/protocol translator only. The Stock Trends API and payment facilitator
  remain authoritative for pricing, challenge issuance, settlement,
  verification, and metering.
- PR #63 planned challenge-only contract verification. It separated no-key
  challenge discovery from proof forwarding and required stronger authorization
  before any live proof-forwarding work.
- PR #64 verified shape-level no-key HTTP 402 payment-required challenges on
  the nine current auth-capable paid routes. It captured status, header names,
  top-level body keys, and field-category presence only. It did not verify
  challenge value safety or proof-forwarding requirements.
- PR #65 designed a mock-only implementation step, with proof forwarding
  disabled or fail-closed and live relay behavior deferred.
- PR #66 added internal mock-only x402 challenge-relay groundwork: strict
  default-off config, the nine-route allowlist, shape-only mock challenge
  normalization, proof-like input failure, paid-output-without-proof failure,
  and redaction hardening. It did not expose any public MCP tool, prompt, or
  resource.
- PR #67 validated PR #66 as safe internal groundwork and confirmed no public
  MCP exposure, no live calls, no proof forwarding, no payment, no spend, and no
  package or marketplace change.

The current baseline remains:

| Surface | Current count / posture |
| --- | --- |
| Default/free mode | 1 tool |
| Paid API-key exposed mode | 10 tools |
| Public resources | 10 |
| Prompts | 0 |
| Auth-capable paid routes | 9 |
| Transport | local stdio only |
| Current paid credential path | API key through `X-API-Key` only |
| x402 relay | default-off, internal mock-only helper |
| Proof forwarding | unimplemented and fail-closed |

## 3. Design Decision Needed

The exact gap after PR #66 and PR #67 is narrow:

- an internal mock helper exists;
- no public MCP exposure exists yet;
- no public paid tool calls can currently return an x402 payment-required
  result;
- no proof input schema exists;
- no proof forwarding exists;
- live no-key challenge relay has not been wired through MCP tools;
- live challenge values have not been classified as safe to relay;
- marketplace x402 claims remain blocked.

PR #68 therefore decides what the next public wiring step should be, not whether
live x402 or proof forwarding is ready. They are not ready.

## 4. Option Analysis

### Option A: Keep x402 helper internal-only for now

Keep PR #66 as internal-only and require another live-challenge design before
any MCP exposure.

| Dimension | Assessment |
| --- | --- |
| Tool count impact | No change. Default remains 1; API-key paid mode remains 10. |
| User/client ergonomics | No client-facing x402 behavior. Safest but gives clients nothing to integrate. |
| Discoverability impact | No improvement. x402 remains invisible to MCP clients. |
| Safety risk | Lowest immediate risk because no public path exists. |
| Implementation risk | None for now. It delays the next integration seam. |
| Validation burden | Minimal, but it also leaves the public seam unvalidated. |
| API-key paid path effect | None. |
| Proof boundary effect | Strongly preserved; proof remains impossible. |
| Marketplace/x402 discoverability | Does not help. Marketplace claims remain blocked. |

Option A is safe but stalls useful MCP-client integration. It is appropriate for
live/API-authored values, not for the next mock-only public wiring step.

### Option B: Expose mock-only x402 challenge behavior through existing paid tool names

Reuse the nine existing paid semantic tool names under explicit x402 relay
flags. A tool invocation returns a deterministic local `payment_required` result
from the PR #66 mock helper. It sends no network request, forwards no proof, and
creates no spend.

| Dimension | Assessment |
| --- | --- |
| Tool count impact | In x402 public mock mode, expose the same 10-tool total as API-key paid exposure: the planning tool plus the nine existing paid semantic tools. Default/free remains 1. |
| User/client ergonomics | Good. Clients see the same semantic operations and do not need duplicate x402-specific names. |
| Discoverability impact | Good for local client behavior and schema/result integration, but not a live x402 claim. |
| Safety risk | Low if default-off, no network, no proof schema, no API key, strict mixed-mode failure, and proof-like input rejection are preserved. |
| Implementation risk | Moderate and bounded. The main risk is accidentally changing existing paid tool schemas or behavior. |
| Validation burden | Mock-only validation: counts, result shape, fail-closed cases, no network, no resolver traffic, no proof, no package/source drift outside the intended implementation. |
| API-key paid path effect | Must be zero. Existing API-key paid mode remains unchanged when x402 flags are absent. |
| Proof boundary effect | Preserved. No proof input is added; proof-like input fails closed. |
| Marketplace/x402 discoverability | Helps internal/local integration only. Must not be marketed as live x402 support. |

Option B is the recommended next implementation step because it validates the
public MCP seam without live challenge values, proof forwarding, payment, or
spend.

### Option C: Expose no-key live challenge relay through existing paid tool names

Reuse the nine existing paid semantic tool names under explicit x402 relay flags
and make a no-key live request to the corresponding allowlisted paid route,
returning API-authored 402 payment-required material. Still no proof forwarding
and no spend.

| Dimension | Assessment |
| --- | --- |
| Tool count impact | Same 10-tool x402 mode if existing paid names are reused. Default/free remains 1. |
| User/client ergonomics | Strong. Clients see real API-authored challenge posture on the same semantic operations. |
| Discoverability impact | Better than mock-only and potentially useful for future x402 claims after validation. |
| Safety risk | Higher than Option B. PR #64 verified shape, not value safety. Live challenge values may include amount, asset, network, recipient, expiry, request identifiers, challenge identifiers, or accepted-method details. |
| Implementation risk | Higher. Needs no-key network path, value policy, resolver policy, challenge caps, loop controls, and live failure handling. |
| Validation burden | Requires a separate no-spend live challenge design/plan and controlled validation. Must prove no API key, no proof, no payment header, no spend, no paid data, and no resolver/catalog/public-resource drift. |
| API-key paid path effect | Must be zero. No silent fallback between API-key and x402. |
| Proof boundary effect | Preserved only if proof input remains absent and proof-like input still fails closed. |
| Marketplace/x402 discoverability | Could support future x402 capability language only after separate live no-key challenge validation, and still not transaction-complete x402 support. |

Option C is a plausible later stage, not the immediate next PR. It needs another
design/validation plan because live values and no-key network behavior are new
public surface.

### Option D: Create separate x402-specific MCP tools

Add new tool names dedicated to x402 challenge behavior.

| Dimension | Assessment |
| --- | --- |
| Tool count impact | Increases public tool count beyond the current 10-tool paid-exposed surface. Depending on design, it could add up to nine more tools. |
| User/client ergonomics | Clear separation, but more tool names and more client-side choice. |
| Discoverability impact | High visibility for x402, but risks fragmenting the semantic surface. |
| Safety risk | Mixed. Separation helps avoid accidental API-key path changes, but duplicate tools expand the public surface and documentation burden. |
| Implementation risk | Higher than reuse because every semantic operation gets parallel schemas, descriptions, tests, and future maintenance. |
| Validation burden | Higher because counts and behavior double for semantically identical operations. |
| API-key paid path effect | Easier to isolate, but duplication can drift from the existing paid semantics. |
| Proof boundary effect | Could preserve proof boundary, but separate names may create pressure to add proof inputs sooner. |
| Marketplace/x402 discoverability | Strong but premature. It suggests a distinct x402 product surface before live challenge and proof posture are settled. |

Option D should be deferred. Separate tools are justified only if reusing the
existing paid names creates an unavoidable safety ambiguity.

## 5. Recommended Path

Recommend a staged combination:

1. Adopt Option B for the next implementation PR.
2. Validate Option B in a no-spend, mock-only validation report.
3. Design Option C separately before any live no-key MCP challenge relay.
4. Keep proof forwarding blocked until API/server confirmation supplies the
   proof/envelope contract.
5. Keep marketplace x402 claims deferred until live challenge relay and proof
   posture are settled.

This path preserves existing public tool names, avoids increasing tool count,
keeps proof out of schemas, and lets MCP clients integrate with the future
payment-required result shape without touching live x402.

## 6. Tool Exposure Design

Future public wiring should reuse the existing semantic tools if possible:

- default/free mode remains exactly one tool:
  `stocktrends_estimate_workflow_cost`;
- API-key paid exposure remains exactly ten tools under the current paid
  exposure rules;
- x402 public mock exposure should also be exactly ten tools: the planning tool
  plus the same nine existing paid semantic tools;
- no separate x402-specific tools should be added in PR #69;
- no new prompts should be added;
- no new public resources should be added;
- the planning tool remains planning-only and never requests a challenge,
  signs, pays, or authorizes a paid endpoint call.

Recommended future flag posture:

- `STOCKTRENDS_ENABLE_X402_RELAY=true` should be the explicit x402 exposure
  posture for public wiring.
- `STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION=true` should be a second explicit
  challenge-behavior gate.
- Challenge execution without relay exposure should fail config validation.
- Relay exposure without challenge execution may list the nine semantic tools in
  x402 posture but invocations must fail closed locally with no network, proof,
  payment, or spend.
- Relay exposure plus challenge execution in PR #69 must still be mock-only and
  send no network request.
- API-key paid flags and active x402 relay posture must fail closed unless a
  later memo explicitly approves coexistence.
- Unknown proof-like input must fail closed. Because no proof schema is approved
  yet, proof-like fields should either be rejected by strict tool schemas or by
  the relay guard before any action.

When x402 flags are enabled without API-key paid flags, the server should enter
the explicit x402 public posture. It should not read or require an API key.

When API-key paid flags and x402 flags are mixed, startup should fail closed
before reading the API key. There is no precedence rule and no silent fallback.

## 7. Result Contract Design

The future public challenge-mode result should be machine-readable and
deterministic.

For PR #69 mock-only public wiring, the result should remain local and
shape-only:

- `status: "payment_required"`;
- `error_code: "x402_payment_required"`;
- `api_status: 402`;
- tool name;
- endpoint path;
- HTTP method `GET`;
- challenge header names present;
- top-level challenge body keys present;
- challenge field categories present;
- redacted or shape-only challenge values;
- no `api_data`;
- `paid_execution_authorized=false`;
- `paid_execution_occurred=false`;
- `api_request_sent=false`;
- `auth_header_sent=false`;
- `payment_header_sent=false`;
- `proof_forwarded=false`;
- `spend_occurred=false`;
- `paid_api_data_returned=false`;
- `automatic_paid_retries=false`;
- no auth header;
- no payment header;
- no wallet, signing, or verification behavior.

For a later live no-key challenge relay, a future memo may allow
`api_request_sent=true` for the single no-key challenge request only. Even then,
all spend-bearing, credential-bearing, proof-bearing, and paid-output booleans
must remain false, and `api_data` must remain absent.

The result contract must distinguish:

- mock-only public wiring: no network, redacted/shape-only values;
- live no-key challenge relay: a no-key request may occur only after a separate
  design/validation plan, and returned values must be API-authored and
  classified safe before relay.

## 8. Challenge Value Policy

This is the critical unresolved boundary.

PR #64 verified only shape:

- HTTP 402 status;
- relevant header-name presence;
- top-level body-key presence;
- field-category presence for amount, asset, network, recipient/address,
  expiry, challenge/correlation identifiers, accepted methods, and pricing
  rule/family.

PR #64 did not verify that returning actual values is safe. It did not verify
which values are public, replay-sensitive, proof-binding, privacy-sensitive, or
needed by x402 client libraries.

Recommended staged value policy:

| Stage | Values returned |
| --- | --- |
| PR #69 mock-only public wiring | Shape-only metadata and redacted placeholders only. No API-authored live values. |
| PR #71 live no-key design/plan | Decide value classes explicitly: shape-only, redacted, or relayable. Require API/server confirmation where needed. |
| PR #72+ live no-key implementation | Return only API-authored live values that the approved design classifies as necessary and safe. Never invent challenge values locally. |

Future x402 payment clients may eventually need amount, asset, network,
recipient, expiry, accepted-method details, and challenge or correlation
identifiers. That need is real, but it is not enough to relay values before
value safety is confirmed.

Rules that must hold in every stage:

- raw proof, payment proof, wallet, private key, seed phrase, signing, and
  payment-header material must never be accepted or returned;
- live challenge values, if later allowed, must be API-authored and tied to the
  exact route/tool invocation;
- the MCP must not synthesize amount, asset, network, recipient, expiry,
  accepted methods, pricing, or challenge identifiers;
- any value with uncertain sensitivity remains redacted or omitted;
- raw payload dumps remain forbidden;
- proof forwarding remains unresolved and blocked.

## 9. Config and Mixed-Mode Policy

The PR #66 config posture should be preserved for public wiring:

- x402 flags default off;
- only literal `true` enables x402 relay flags;
- explicit off values `false`, `0`, `no`, and `off` disable them;
- ambiguous truthy values such as `1`, `yes`, `on`, or arbitrary non-empty
  strings fail config validation;
- proof-forwarding true fails closed because proof forwarding is unsupported;
- x402 challenge execution without relay enabled fails closed;
- active x402 relay posture plus API-key paid mode fails closed unless a later
  memo explicitly approves coexistence;
- mixed-mode failure must happen before reading the API key;
- no silent fallback from API-key mode to x402;
- no silent fallback from x402 to API-key mode;
- no OAuth or Bearer fallback;
- no API key plus proof combination;
- no payment header is constructed.

The API-key paid path remains current and preserved when x402 flags are absent.

## 10. Allowlist Policy

Public x402 wiring must be limited to exactly the nine current auth-capable paid
routes:

1. `/v1/stim/latest`
2. `/v1/stim/history`
3. `/v1/indicators/latest`
4. `/v1/indicators/history`
5. `/v1/selections/latest`
6. `/v1/market/regime/latest`
7. `/v1/market/regime/history`
8. `/v1/breadth/sector/latest`
9. `/v1/leadership/summary/latest`

Do not include:

- public resources;
- pricing catalog;
- instrument lookup or resolve;
- deferred routes;
- POST routes;
- decision or portfolio routes;
- Intelligence Agent routes or artifacts;
- directory, package, marketplace, or metadata routes.

Every non-allowlisted route fails closed before any request, proof, payment
header, auth header, or paid output.

## 11. Symbol and Resolver Policy

Symbol-dependent tools need a tighter x402 boundary than the current API-key
paid path.

Recommended policy:

- prefer canonical `symbol_exchange` for x402 public wiring;
- for the first mock-only public wiring, do not run any resolver or network
  call;
- for the first live no-key challenge relay, require canonical
  `symbol_exchange` unless a later memo explicitly approves resolver traffic;
- raw symbol lookup or resolve must not introduce unintended credential-free
  calls in x402 mode;
- if raw symbol support is retained for x402 later, it needs a separate
  fail-closed resolver design covering ambiguity, resolver route scope, no API
  key, no proof, no payment header, no paid output, no retries, and no silent
  default exchange selection;
- existing API-key paid resolver behavior remains unchanged when x402 flags are
  absent.

For PR #69, a safe public mock result can be produced without resolving a
symbol because no live route is called and no paid data is returned.

## 12. Secret-Safety and Redaction Policy

The PR #66 redaction/scanning posture must be preserved and extended to public
wiring:

- recursive key/value fixture scanning remains required;
- proof-like, payment-like, header-like, auth-like, wallet-like, private-key,
  seed-phrase, recipient/address-like, and raw EVM-shaped address values fail
  closed when unsafe;
- bare `ADDRESS` label values remain redacted or blocked when unsafe;
- raw EVM-shaped address values remain rejected in mock fixtures;
- approved redacted placeholders may be used for mock-only tests;
- raw payload dumps are forbidden;
- header values are not logged;
- secret values are not logged;
- unsafe values are not echoed in denial output;
- challenge/proof/payment values of uncertain sensitivity are redacted or
  omitted;
- secret-shaped scans must be run over changed files in implementation and
  validation PRs.

Allowed documentation mentions of boundary terms are not secrets. Populated
credential, proof, payment, wallet, private-key, seed, or full address values
are forbidden.

## 13. Proof-Forwarding Boundary

Proof forwarding remains blocked.

Future public wiring must not add:

- proof input schema;
- proof storage;
- proof forwarding;
- proof verification;
- payment header construction;
- payment signing;
- wallet custody;
- private-key handling;
- seed phrase handling;
- spend;
- paid output after proof.

Proof-like input must fail closed. Unknown proof-like keys must not be accepted
silently. If a client tries to supply proof-shaped material before a proof
schema is approved, the tool must return a deterministic local denial and send
no request.

Proof forwarding requires separate API/server confirmation and a later design
covering proof shape, header/body mapping, challenge binding, expiry, replay
behavior, redaction, success shape, rejection shape, and validation limits.

## 14. Spend, Retry, and Loop Controls

Public mock-only wiring has no spend path:

- no live fetch;
- no API key;
- no proof;
- no payment header;
- no paid output;
- no cap debit;
- no spend.

Live no-key challenge relay, if later implemented, still has no spend path until
proof forwarding is separately approved. A 402 challenge is not paid data and is
not transaction-complete x402 support.

Required controls:

- no automatic retries;
- no automatic second call;
- no background, scheduled, CI, unattended, bulk, pagination, sweep, or
  exchange-iteration behavior;
- no fallback to API-key mode;
- no fallback to public data;
- unexpected paid output without proof fails closed;
- repeated-identical public challenge posture must be defined before public
  wiring.

Recommended repeated-call posture:

- PR #69 should reserve a normalized x402 challenge signature per tool/input
  before returning a mock challenge result;
- an identical repeated challenge invocation in the same server session should
  fail closed with a deterministic loop-denial code, even though no spend is
  possible;
- live no-key challenge relay should add explicit per-session and per-tool
  challenge caps before any networked challenge request is allowed.

## 15. API-Key Paid Path Preservation

Future implementation and validation must prove:

- default/free mode remains exactly one tool;
- API-key paid mode remains exactly ten tools when existing paid exposure gates
  are satisfied;
- existing API-key paid execution behavior is unchanged when x402 flags are
  absent;
- x402 public wiring does not alter current paid pricing, caps, repeated-call
  gates, resolver behavior, auth target allowlist, or result wrapping;
- no silent fallback occurs between API-key and x402 modes;
- mixed mode fails closed before API key read;
- package files remain unchanged unless a later implementation genuinely needs
  a dependency, which this design does not recommend.

## 16. Validation Plan for the Next Implementation

PR #69, if it implements mock-only public MCP wiring, should be validated by a
separate PR #70 no-spend report.

Implementation tests should cover:

- default/free count remains one tool;
- API-key paid count remains ten tools;
- x402 public mock count is ten tools if relay exposure is enabled;
- public resources remain ten;
- prompts remain zero;
- no new prompts/resources;
- no live calls;
- no credential-free Stock Trends calls;
- no API key;
- no proof input;
- no proof forwarding;
- no payment header;
- no payment;
- no spend;
- no resolver/network calls in mock-only x402 mode;
- result shape for each of the nine existing semantic tools;
- deterministic `payment_required` result;
- no `api_data`;
- all mock-only safety booleans false, including request/auth/payment/proof/spend
  booleans;
- strict config parsing;
- relay-without-challenge fail-closed;
- challenge-without-relay fail-closed;
- x402/API-key mixed mode fail-closed before API key read;
- proof-like input fail-closed;
- non-allowlisted route fail-closed;
- unknown input fail-closed;
- paid-output-without-proof fail-closed;
- redaction and secret-safety cases;
- repeated-identical challenge posture;
- `src/`, `tests/`, `package.json`, and `package-lock.json` scope checked
  according to the actual implementation PR;
- package files unchanged unless explicitly justified and reviewed.

The PR #70 validation report should also run a changed-file secret-shaped scan
and confirm no live calls, no credential-free calls, no MCP Inspector, no paid
validation, no live x402 execution, no proof, no payment, no spend, no remote
MCP, no package publication, and no commit-time artifacts.

## 17. Marketplace and Discoverability Posture

Mock-only public wiring may improve local client behavior because clients can
see the existing semantic paid tools under an explicit x402 posture and receive
a deterministic payment-required result. That is not live x402 enablement.

Marketplace posture:

- no marketplace or directory claim should say live x402 is enabled after mock
  wiring only;
- no claim should imply transaction-complete x402 support before proof
  forwarding is designed, implemented, and validated;
- live no-key challenge relay may support future "challenge relay" language only
  after separate validation;
- proof forwarding and fulfilled paid x402 responses need more work and API
  confirmation;
- final marketplace submission remains deferred.

## 18. Non-Approvals

This memo does not approve:

- implementation;
- live x402 relay;
- live challenge calls;
- proof forwarding;
- payment;
- spend;
- wallet custody;
- private keys;
- seed phrases;
- signing;
- payment verification;
- remote or hosted MCP;
- autonomous paid execution;
- unattended, scheduled, CI, background, bulk, sweep, or pagination behavior;
- deferred routes;
- decision or portfolio routes;
- Intelligence Agent artifacts;
- investment advice;
- package publication;
- directory submission;
- marketplace launch;
- final x402 marketplace claims.

## 19. Recommended PR Sequence

Recommended exact sequence after PR #68:

1. PR #69: implement mock-only public MCP wiring through existing paid tool names
   under explicit x402 relay flags. No network, no resolver traffic, no proof,
   no payment header, no spend, no API-key path change.
2. PR #70: no-spend validation report for PR #69. Validate counts, result
   shape, fail-closed cases, secret safety, and docs/source/package scope. No
   live calls.
3. PR #71: live no-key challenge-relay design and validation plan. Resolve
   challenge value policy, live no-key request caps, resolver posture, response
   value redaction, and exact authorization for any no-key live validation.
4. PR #72: live no-key challenge-relay implementation only if PR #71 is
   approved and explicitly authorizes the narrow implementation. Still no proof
   forwarding and no spend.
5. PR #73: no-spend live challenge relay validation report, only under the
   approved plan and with no API key, no proof, no payment, no spend, no paid
   output, and no raw payload dumps.
6. Later PR: proof-forwarding design only after API/server confirmation of the
   proof/envelope contract.
7. Later PRs: proof-forwarding implementation and validation, if separately
   approved.
8. Later PR: marketplace/listing readiness update only after the actual x402
   posture is true, validated, and accurately described.

## 20. Final Recommendation

Proceed next with Option B: mock-only public MCP challenge wiring through the
existing nine paid semantic tool names, exposed only under explicit x402 relay
flags, preserving the ten-tool paid-style surface and the one-tool default/free
surface.

Do not add separate x402 tool names in the next step. Do not add proof inputs.
Do not add prompts. Do not add remote MCP. Do not relay live challenge values
yet. Do not make marketplace x402 claims.

After mock-only public wiring is validated, design live no-key challenge relay
as a separate step. Keep proof forwarding, payment, spend, wallet custody,
private-key handling, signing, verification, package publication, directory
submission, and marketplace launch blocked until separately reviewed and
validated.
