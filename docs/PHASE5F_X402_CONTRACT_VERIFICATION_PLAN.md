# Phase 5F x402 Contract Verification Plan

Plan date: 2026-07-12

Status: **Docs-only verification plan (PR #63). Documentation-only.** This
document defines *how* a future, separately reviewed PR will verify the Stock
Trends API's actual x402 payment contract before any relay implementation
begins. It is the planning step after the Phase 5F x402 relay architecture memo
(PR #62). It **verifies nothing itself**: it runs no verification, executes no
x402 flow, and touches no live endpoint. It exists so that PR #64 — the contract
verification *report* — can execute a safe, bounded, separately authorized
procedure, and so that no relay field name, header, or status is treated as
final until that report is completed and reviewed.

Like the PR #55, PR #61, and PR #62 memos, this plan performed **no network
request at all** — not even a credential-free metadata read. Every fact below is
drawn from the merged Phase 4–5F document set and a read-only inspection of the
source tree at HEAD `3c47829` (`Add Phase 5F x402 relay architecture memo
(#62)`): `src/config.ts`, `src/server.ts`, `src/resources/index.ts`,
`src/paidPolicy.ts`, `src/tools/index.ts`, `src/tools/marketContextTools.ts`,
`src/stocktrendsClient.ts`, and `src/redaction.ts`.

This plan makes **no production-readiness claim**, **no implementation
commitment**, and **no launch/listing claim**. It authorizes no verification by
itself: PR #64 runs only after the exact authorization phrase in §11 is supplied.

This plan builds on and does not supersede:

- [`PHASE5F_X402_RELAY_ARCHITECTURE_MEMO.md`](PHASE5F_X402_RELAY_ARCHITECTURE_MEMO.md)
  (PR #62) — the architecture decision (non-custodial x402 relay), whose §16
  contract-verification requirements and §17 implementation sequence this plan
  operationalizes (§17: **PR #63 is the contract verification plan; PR #64 is
  the contract verification report**).
- [`PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md`](PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md)
  (PR #60) and
  [its §11/§12 roadmap] — the merged local stdio launch-readiness posture the
  relay track is additive to, and the entry boundaries the architecture memo
  starts from.
- [`PHASE5E_CONTROLLED_LOCAL_CLIENT_VALIDATION_REPORT.md`](PHASE5E_CONTROLLED_LOCAL_CLIENT_VALIDATION_REPORT.md)
  (PR #59) — the credential-free / no-spend validation discipline (S0 hygiene,
  curated child environments, status/shape-only capture, secret-safety scan)
  this plan's PR #64 phases reuse.
- [`PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md`](PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md)
  (PR #58) — the S0–S8 no-spend structure and stop/fail conditions the §9
  phases mirror.
- [`PHASE5E_DIRECTORY_METADATA_READINESS.md`](PHASE5E_DIRECTORY_METADATA_READINESS.md)
  and
  [`PHASE5E_LAUNCH_RELEASE_CHECKLIST.md`](PHASE5E_LAUNCH_RELEASE_CHECKLIST.md)
  (PR #58) — the `payment_rails: "none"` fact and the forbidden-claims list that
  keep any x402 claim out of any listing until it is true and validated.
- [`PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md)
  (PR #54) and
  [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
  (PR #53) — the controlled-local-stdio-only runtime scope, the exact-phrase
  live-validation doctrine, the minimal-input probes, and the §8 non-approvals
  this plan preserves.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — §2 secret handling, §4 x402/wallet
  deferral, §5/§7/§8 paid-call/loop/spend controls, §9 logging, §11 local stdio
  risks, §12 remote-MCP deferral, and §15–§17 the paid execution models and the
  nine-route auth-capable allowlist.
- [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  and
  [`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)
  — the §4 paid-execution *eligibility* posture and the secret-safety scan any
  future relay verification inherits.

## 1. Status

- **Docs-only verification plan.** This PR creates this document and one README
  documentation-index link; nothing else changes.
- **No implementation** — no code, no tool/resource/prompt registration, no
  allowlist promotion, no pricing-mirror change, no config flag, no runtime
  behavior change.
- **No validation executed** — this plan runs no verification of any kind; it
  only defines a future one.
- **No live calls** — no Stock Trends endpoint is contacted, paid **or
  credential-free**.
- **No credential-free calls** — not even a metadata/catalog read is performed
  by this plan.
- **No API key** — none is used, requested, inspected, printed, logged, or
  stored.
- **No x402 execution** — no payment challenge is requested, no payment proof is
  obtained, forwarded, or verified; nothing is signed, paid, settled, or
  retried.
- **No wallet** — no wallet, private keys, or seed phrases appear or are
  designed into the repository.
- **No payment proof** — none is created, captured, forwarded, stored, or
  logged.
- **No payment header** — no payment/`X-Payment`/settlement header is
  constructed or sent.
- **No remote MCP** — no HTTP/SSE/Streamable HTTP transport appears or is
  approved.
- **No MCP Inspector** session is run.
- **No package publication** — no npm/registry publication occurs or is
  approved.
- **No directory submission** — no directory/marketplace/registry submission
  occurs or is approved.
- **No marketplace launch** — final launch/listing remains deferred (§16).

## 2. Objective

The objective of the future PR #64 contract verification report is to **verify
the Stock Trends API's actual x402 contract before any relay implementation
begins**, specifically to:

- verify the **payment-required challenge shape** the API returns (HTTP status
  class, headers, top-level body keys) when a paid route is called without an
  API key;
- verify the **proof / envelope forwarding requirements** — what the API expects
  on a second (proof-carrying) call, and where (headers, body, or both);
- verify the **errors, statuses, replay behavior, correlation support, and
  per-route x402 support** across the currently promoted paid routes;
- do all of this **before implementation**, so that no relay tool contract,
  header, field name, config flag, or fail-closed rule is finalized on
  assumptions; and
- **maintain the non-custodial relay posture** throughout — the Stock Trends API
  / payment facilitator remain the payment authority, and the MCP remains a
  future relay / protocol translator only, holding no funds, no keys, and no
  payment source-of-truth state.

Verification is **plan first, report second**: this document is the plan; PR #64
is the report; neither is implementation.

## 3. Decision context

- **PR #62 selected the non-custodial x402 relay architecture** as the next MCP
  track (architecture memo §2), with the first target being MCP-as-relay /
  protocol translator: the MCP relays the API's payment-required challenge to
  the client/agent and relays the client-supplied payment proof back to the same
  API endpoint, forwarding API-authored results verbatim.
- **PR #62 requires contract verification before implementation** (architecture
  memo §16): the exact x402 challenge schema, accepted proof/envelope shape,
  required headers/body fields, error statuses, and settlement/verification
  fields are all **to-be-verified**, not assumed. This plan fills that gap by
  defining how PR #64 will verify them.
- **The current repository holds only limited, x402-adjacent facts, and no x402
  contract:**
  - the credential-free planning tool `stocktrends_estimate_workflow_cost`
    accepts `x402` as one of the `rail_preference` values
    (`COST_ESTIMATE_RAIL_PREFERENCES = ["subscription", "x402", "mpp", "auto"]`
    in `src/tools/index.ts`) but **performs no payment** — it explicitly records
    that "[r]ail planning for x402 or MPP does not trigger payment signing,
    wallet handling, or payment retry," and that "[a]ctual payment challenge
    amounts, if any, are determined later by the Stock Trends API/payment rail";
  - the paid client (`src/stocktrendsClient.ts`) **reads** two non-secret
    response-metadata headers on a paid response —
    `x-stocktrends-payment-required` and
    `x-stocktrends-accepted-payment-methods` (alongside
    `x-stocktrends-pricing-rule`, `x-stocktrends-quota-limit`,
    `x-stocktrends-quota-period`) — and **maps a `402` safely** to a
    deterministic error surfaced as safe metadata, but it does **not pay,
    forward, or retry**; `payment_header_sent` is a constant `false` in every
    paid tool result.
- **The exact x402 contract remains unverified.** These currently-observed
  header names are the only x402-adjacent contract detail present, and even they
  are treated as to-be-verified for relay purposes — not the full challenge /
  proof contract.

## 4. Current approved baseline

The surface this plan starts from is the **1/10/10/0/9 contract**, confirmed by
the merged PR #60 signoff §4 and re-confirmed read-only against the source at
HEAD `3c47829` (no live call needed or permitted):

- **1 default/free tool** — `stocktrends_estimate_workflow_cost` (credential-free
  planning tool). No paid tool is ever visible in free mode.
- **10 paid-exposed tools** — the planning tool plus the nine paid tool
  definitions, visible only when **both** `STOCKTRENDS_ENABLE_PAID_TOOLS=true`
  **and** a configured `STOCKTRENDS_API_KEY` are present.
- **10 public resources** — credential-free and fetch-on-request in every mode.
- **0 prompts** — no prompts capability is registered in any mode
  (`prompts/list` → `-32601`).
- **9 auth-capable paid routes** (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` in
  `src/paidPolicy.ts`) — see §7. Every other route is denied
  `endpoint_not_allowlisted` before any auth header or fetch.
- **Local stdio only** — `STOCKTRENDS_MCP_TRANSPORT=stdio` is the sole accepted
  value in `src/config.ts`.
- **`X-API-Key` is the current paid path** — built only inside the coupled paid
  boundary (`buildPaidAuthHeaders`), only for the approved origin plus an exact
  promoted path, only after every gate passes. No `Authorization: Bearer`, no
  OAuth, no payment header.
- **No x402 relay currently** — `payment_rails: "none (no x402, no wallet, no
  OAuth, no Bearer)"` in the reviewed directory metadata (PR #58). Nothing is
  signed, paid, forwarded, or retried today.
- **No final marketplace listing / submission yet** — the reviewed directory
  metadata is approved as reusable content only, and explicitly carries no x402
  claim.

## 5. Verification principles

The PR #64 verification is governed by these principles, extending
`SECURITY_MODEL.md` §2/§4/§5/§7/§8/§9:

- **Plan first, report second.** This document plans; PR #64 reports. No
  implementation happens in either.
- **No implementation during verification.** PR #64 verifies API behavior only;
  it adds no relay tool, config flag, header, or code path.
- **No real payment unless separately authorized later.** The default is
  challenge-only, no-spend. Any live payment is a separate, stronger-authorized
  step (§10, §11).
- **No wallet custody.** No wallet, funds, or signing client enters the
  verification.
- **No private keys.** No key material or seed phrases are introduced or handled.
- **No API key required for challenge discovery** unless future evidence proves
  otherwise. Challenge-only discovery is designed as a **no-key** probe; if the
  API turns out to require a key even to return a challenge, that is itself a
  recorded finding, not a licence to introduce a key.
- **No proof material stored.** No payment proof, envelope, nonce, or
  settlement token is captured, cached, or persisted.
- **No payload dumps in repo.** No raw response body is written to the
  repository — statuses, header names, and top-level keys only.
- **Redact all challenge/proof-like material** if any is captured. The existing
  redaction layer (`src/redaction.ts`) already covers `X-API-Key`,
  `Authorization`/`Bearer`, `X-Payment` / `PAYMENT-SIGNATURE` / `PAYMENT_HEADER`,
  and `WALLET_PRIVATE_KEY` / `PRIVATE_KEY` patterns; PR #64 treats any
  challenge/proof field of uncertain sensitivity as redacted.
- **Status / shape-only reporting where possible.** Prefer HTTP status class,
  boolean header-presence flags, and top-level body key names over values.
- **Fail closed on ambiguity.** Any uncertain, malformed, or unexpected outcome
  stops the phase rather than proceeding.
- **Preserve the Stock Trends API as authority.** Pricing, challenge issuance,
  settlement, verification, and metering stay upstream; the verification never
  adjudicates or originates any of them.

## 6. Scope of future verification

PR #64 should verify the following against the API's current x402 behavior
(architecture memo §16, §19). Each item is **to-be-verified**, not assumed:

- whether a **no-key request to a paid endpoint returns an x402 payment-required
  challenge** (the expected outcome) rather than paid data or an unrelated error;
- the **actual HTTP status** (expected `402`-class) and the **top-level body
  shape** of the challenge;
- the **relevant response headers** present on the challenge (including whether
  the currently-read `x-stocktrends-payment-required` /
  `x-stocktrends-accepted-payment-methods` headers are the whole contract or
  only part of it);
- the **amount / asset / network / recipient / expiry** fields, **if present**
  in the challenge — recorded as presence/shape, never as authoritative values
  the MCP would originate;
- the **accepted payment-proof / envelope location and shape** the API expects on
  the second call;
- the **required forwarding headers / body fields** for a proof;
- the **success status after proof**, *if and only if* a live proof step is ever
  separately authorized (§10) — otherwise inferred from documentation, not
  executed;
- the **error status for missing / malformed / stale / reused proof**;
- whether the API **supports challenge correlation** (binding a proof to the
  specific challenge it answers);
- the **challenge expiry behavior** (nonces, single-use, TTL);
- whether **all nine currently promoted paid routes support x402 or only a
  subset**;
- whether **API-key mode and x402 challenge mode are mutually exclusive**, or can
  coexist;
- whether the **pricing catalog and the challenge amount can be reconciled
  safely** (whether a cross-check is meaningful and supported);
- whether the **existing client metadata-header handling is sufficient or needs
  expansion** for relay purposes;
- whether the API returns **safe, non-secret error details** suitable for MCP
  relay tool output.

## 7. Route inventory and test matrix

The nine current auth-capable paid routes (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`
in `src/paidPolicy.ts`), each paired to its tool and pricing rule:

| # | Route | Tool | Pricing rule (family) |
| --- | --- | --- | --- |
| 1 | `/v1/stim/latest` | `stocktrends_get_stim_latest` | `stim_latest_paid` (`stim`) |
| 2 | `/v1/stim/history` | `stocktrends_get_stim_history` | `stim_history_paid` (`stim`) |
| 3 | `/v1/indicators/latest` | `stocktrends_get_indicators_latest` | `indicators_latest_paid` (`indicators`) |
| 4 | `/v1/indicators/history` | `stocktrends_get_indicators_history` | `indicators_history_paid` (`indicators`) |
| 5 | `/v1/selections/latest` | `stocktrends_get_selections_latest` | `selections_latest_paid` (`selections`) |
| 6 | `/v1/market/regime/latest` | `stocktrends_get_market_regime_latest` | `market_regime_latest` (`market`) |
| 7 | `/v1/market/regime/history` | `stocktrends_get_market_regime_history` | `market_regime_history` (`market`) |
| 8 | `/v1/breadth/sector/latest` | `stocktrends_get_breadth_sector_latest` | `breadth_sector_latest_paid` (`breadth`) |
| 9 | `/v1/leadership/summary/latest` | `stocktrends_get_leadership_summary_latest` | `leadership_summary_latest_paid` (`leadership`) |

For **each** route, PR #64's verification intent is identical and bounded:

- **challenge-only / no-key check** — issue a single credential-free `GET`
  (`Accept` + `User-Agent` only; **no `X-API-Key`, no `Authorization`, no
  payment header**) to elicit the API's payment-required challenge;
- **minimal safe parameters** — the smallest well-formed request per §8;
- **no payment** — no proof is created or forwarded;
- **no proof forwarding** unless a separate, stronger authorization (§10, §11) is
  in force;
- **record status, headers present, and top-level body keys only** — status
  class, a boolean presence matrix of response headers, and the top-level JSON
  key names of the challenge body;
- **no payload dumps** — no field values, no rows, no raw body.

The deferred routes (`/v1/market/regime/forecast`, `/v1/breadth/sector/history`,
`/v1/leadership/rotation/history`), the credential-free
`/v1/leadership/definitions` resource route, the instrument-discovery routes
(`/v1/instruments/lookup`, `/v1/instruments/resolve`), and any other
non-allowlisted route are **out of scope** and are never targeted (§14).

## 8. Minimal parameter strategy

Safe minimal parameters for the future challenge-only checks. All exact values
below are validated against `src/paidPolicy.ts`, `src/tools/marketContextTools.ts`,
and the current tool schemas, and **must be re-reviewed against the API docs /
source before execution** in PR #64:

- **`market/regime/latest`** — no arguments (snapshot; strict empty input, unknown
  keys rejected).
- **`market/regime/history`** — `limit=1` (schema bound `1`–`52`, MCP default
  `12`).
- **`breadth/sector/latest`** — `limit=1` (bound `1`–`250`); `group_level=sector`
  is always sent by the tool.
- **`leadership/summary/latest`** — `limit_overall=1` and `limit_bucket=1` (bounds
  `1`–`200` and `1`–`50` respectively).
- **`selections/latest`** — `limit=1` (bound `1`–`250`, MCP default `50`).
- **`stim/latest` / `stim/history`** — require a **symbol identity**
  (`symbol_exchange` canonical form, or `symbol` + `exchange` with exchange in
  `N,Q,A,B,T,I`); history adds `limit=1` (bound `1`–`2600`).
- **`indicators/latest` / `indicators/history`** — same symbol identity; history
  adds `limit=1`. Note the indicators tools run an **internal credential-free
  instrument resolver** before any paid boundary; a challenge-only probe should
  prefer a **canonical `symbol_exchange`** (trusted directly, no discovery call)
  to avoid unnecessary resolver traffic.
- **Symbol / identifier choice.** Any required symbol/identifier must be **chosen
  in PR #64 with explicit rationale**, favouring a widely-known, stable,
  certainly-existing instrument in canonical form, and **must not be decided
  here** unless the API docs/source support a specific choice. Because the
  expected outcome of a no-key call is a `402` challenge **before** any paid
  output, no paid row is returned regardless of the symbol; if a no-key call
  instead returns paid data, that is a stop condition (§12, §14), not a result to
  keep.

For history endpoints the smallest safe limit (`limit=1`) is preferred wherever
supported; for `latest`/snapshot endpoints minimal or default args are used. All
parameters are chosen to keep any *eventual* paid output trivially small, but the
challenge-only phase expects **no** paid output at all.

## 9. No-spend verification phases

PR #64 should proceed through these phases in order, stopping at the first
failure. They mirror the PR #58 runbook's S0–S8 no-spend discipline:

- **A. Environment hygiene / names-only checks.** Confirm the branch is clean and
  no `STOCKTRENDS_*` secret is present in the parent shell — names-only, values
  never inspected (runbook S0). Confirm no API key, no execution flag, no caps,
  and no wallet/proof material anywhere (§12).
- **B. No-key challenge discovery on one safest canary route.** Issue a single
  credential-free `GET` to the **canary** — `market/regime/latest` (snapshot, no
  parameters, not symbol-keyed, weekly-cadence market context; the same tool used
  as the fail-closed probe in prior validations). Record status class, header
  presence, and top-level body keys only.
- **C. Expand to remaining routes only if the canary behaves safely.** If and
  only if the canary returns a payment-required challenge (or a documented safe
  status) with no paid data and no side effect, extend the same no-key,
  minimal-parameter check to the other eight routes.
- **D. Capture status and top-level shape only.** For every route, record the HTTP
  status class, a boolean header-presence matrix, and the top-level JSON key names
  of the challenge body. No values, no rows, no dumps.
- **E. Record whether the challenge schema is consistent across routes.** Note
  whether the status, header set, and top-level body keys are the same across all
  routes or differ.
- **F. Record whether only a route subset supports x402.** Note per-route whether
  a challenge was returned, so the report states clearly which of the nine routes
  are x402-capable.
- **G. Stop before payment proof / spend.** The no-spend phases end here. No proof
  is created, forwarded, or verified, and no spend occurs, in phases A–F.
- **H. Rollback / cleanup.** Restart to the default/free surface, re-run the S0
  names-only check (prints nothing), and confirm no key/flag/cap/proof state
  persists.
- **I. Secret-safety scan.** Scan every captured artifact for secret-shaped
  content per §13 before storing the report.

If challenge-only verification (phases A–F) yields enough to design the relay
contract, **no live payment is performed at all** — that is the preferred
outcome.

## 10. Live payment / proof-forwarding policy

- **PR #64 does not perform live payment by default.** The default and expected
  path is challenge-only, no-spend (§9).
- **Proof-forwarding requires a separate, explicit, stronger authorization**
  (§11) and likely its own plan/report pair — it is not authorized by this plan
  or by the challenge-only authorization phrase.
- **No wallet or private key may be introduced** into the MCP or its runtime
  under any circumstance, consistent with `SECURITY_MODEL.md` §4 and architecture
  memo §10.
- **If future proof-forwarding is ever needed**, the proof should be obtained and
  supplied by the **client / agent / facilitator outside the MCP**, and any
  live-forwarding test should run only after separate authorization, with an
  approved wallet/facilitator, an approved maximum spend, and approved redaction
  rules.
- **No proof values may be committed or logged** — a proof is forwarded (if ever)
  for exactly one call and never persisted, cached, or reused (architecture memo
  §7, §11).
- **If challenge-only verification is sufficient for implementation design, do
  not do live payment.** Live payment is a last resort, not a default step.

## 11. Authorization phrase

**No verification is run without the exact authorization phrase.** Consistent
with the exact-phrase live-validation doctrine (PR #52/#53; a paraphrase,
truncation, prior-session authorization, or inferred intent does not count),
PR #64 executes **any** network verification only after the operator supplies,
verbatim as its own line:

> **`AUTHORIZED: run Phase 5F x402 contract challenge verification with no API
> key, no payment proof, no spend, and no paid output`**

Any future **live proof-forwarding / live x402 test** requires a **separate,
stronger** authorization, verbatim as its own line, and does not follow from the
challenge-only phrase above:

> **`AUTHORIZED: run Phase 5F controlled live x402 proof-forwarding validation
> for the approved route(s), with the approved wallet/facilitator, approved
> maximum spend, and approved redaction rules`**

Without the exact applicable phrase, **no verification is run**: the procedure
stops at its no-network planning boundary, exactly as PR #53 stopped at the
no-spend boundary when its phrase was absent.

## 12. Safety gates

Every one of these gates must hold throughout PR #64; any breach stops the run
(§14):

- **clean branch and clean working tree** before any check;
- **no `STOCKTRENDS_*` secrets in the parent env** (names-only S0 check prints
  nothing);
- **no API key configured** in any verification session (challenge-only is a
  no-key probe);
- **no `STOCKTRENDS_ENABLE_PAID_EXECUTION`** set — not even to `false`;
- **no wallet / private-key / seed-phrase environment variables** of any kind;
- **no payment-proof / envelope values** present, captured, or forwarded;
- **no remote MCP** — local stdio (or a direct credential-free probe of the
  approved origin) only; no HTTP/SSE/Streamable HTTP MCP transport;
- **no MCP Inspector** unless explicitly included and separately noted;
- **no paid output accepted** in the challenge-only phase — a challenge is
  expected, not data;
- **stop if the API returns data instead of a `402`-class challenge** in no-key
  mode;
- **stop if any response appears to contain secret-like material**;
- **stop if any request would require real payment** to proceed;
- **stop if any route behaves differently from this plan** (unexpected status,
  side effect, or charge).

## 13. Data capture and redaction policy

PR #64's report captures **shape, not content**:

- **capture** HTTP statuses / status classes, response **header names** (boolean
  presence matrix), top-level JSON **key names**, and boolean presence flags for
  fields of interest (amount / asset / network / recipient / expiry / correlation
  / accepted-methods);
- **do not capture** full response bodies or field values;
- **do not capture** payment-proof values, envelopes, nonces, or settlement
  tokens;
- **do not capture** wallet or facilitator data of any kind;
- **redact addresses / recipients** if treated as sensitive;
- **redact any payment-challenge value** whose sensitivity is uncertain
  (fail-closed redaction);
- **do not write raw responses to the repository** — no payload dumps;
- **no screenshots, logs, or runtime artifacts** are added to the repository;
- the **final report presents shape-only tables** (per-route status, header
  presence, top-level body keys, consistency and subset findings), reusing the
  redaction layer (`src/redaction.ts`) and the runbook S8 secret-scan discipline.

## 14. Failure conditions

Any of the following **fails the run immediately** — stop, invoke/forward
nothing further, run the §9.H rollback, and record the outcome secret-free
(FAIL unless a hygiene finding that S0 cleanup fully resolves, per the PR #58
runbook §12 disposition rule):

- **any API key used** at any step;
- **any real payment requested** beyond challenge-only;
- **any payment proof generated**;
- **any payment proof forwarded**;
- **any spend** of STC / USD / USDC or any asset;
- **any paid data returned** in a no-key challenge-only check (route returns
  content instead of a challenge);
- **any auth / payment header sent** unexpectedly;
- **any route returns non-`402` paid data without proof**;
- **any secrets in output** (a real key, populated auth header, or realistic
  credential);
- **any unredacted challenge / proof material captured**;
- **any route not in the §7 allowlist targeted**;
- **any remote MCP or hosted transport used**.

## 15. Expected outputs of the PR #64 report

The PR #64 report must produce, all shape-only and secret-free:

- a **route-by-route challenge support matrix** (which of the nine routes returned
  a payment-required challenge);
- the **observed HTTP status class** per route;
- a **response header presence matrix** (which headers appeared on the challenge);
- a **top-level body key matrix** (top-level JSON key names of each challenge
  body);
- whether the **challenge schema appears consistent** across routes;
- whether the **proof / envelope requirements can be inferred safely** from the
  challenge (headers, body, or both) without a live proof step;
- whether **further API documentation or server-side confirmation** is needed
  before implementation design;
- whether **implementation design may proceed** (PR #65) on the verified facts;
- a **deviations** section (any procedural departure, disclosed and
  dispositioned);
- **non-approvals preserved** (the §18 non-goals restated);
- the **secret-safety scan outcome** (terms searched, findings, resolution);
- a **recommendation** (proceed to PR #65 design, seek more documentation, or
  adjust the relay design).

## 16. How findings feed implementation design

- **PR #65 (implementation design / contract memo) depends on the PR #64
  findings.** No relay tool contract is designed until the report is reviewed.
- **No field / header / env-var / tool contract is finalized before PR #64.**
  Every provisional name in the architecture memo §8/§9 stays provisional until
  the verified facts land.
- **If the API does not support a no-key challenge safely**, the relay design
  must adjust — for example a different discovery mechanism, or a documentation-
  based contract rather than a probed one.
- **If only a subset of routes supports x402**, the implementation must expose
  only the approved subset or fail closed for the rest; no route silently gains
  a relay path.
- **If proof correlation is missing or unclear**, the design must fail closed or
  require API-side changes rather than forward an unbound proof (architecture
  memo §9, §10).
- **If the challenge schema differs across routes**, the design must handle the
  differences explicitly or restrict the relay to the routes it can safely serve.

## 17. Open questions

Recorded for PR #64 to resolve (architecture memo §19):

- Does **each paid route return a `402` challenge without an API key**, or only
  some?
- What **exact headers / body fields** are returned in the challenge?
- Is **challenge correlation** supported (binding a proof to a challenge)?
- Is **expiry** included (nonce / single-use / TTL)?
- Are **recipient / address fields** present and stable?
- Are **accepted payment methods** listed (and where)?
- Is there a **safe challenge-only mode** that returns a challenge without any
  side effect or charge?
- Does **proof forwarding require headers, body, or both**?
- Can the **pricing catalog and the x402 challenge amount be reconciled** safely?
- How are **replay / stale proofs rejected** (error status, nonce reuse)?
- What **error codes** are stable enough to surface in MCP tool output?

## 18. Non-goals

This plan explicitly does **not** approve, and nothing in it may be read as
approving:

- **implementation** of any part of the relay;
- **x402 execution** — no challenge request, proof forwarding, or paid relay
  call is performed by this plan;
- **proof forwarding** of any kind;
- **payment** of any amount;
- **wallet custody** — no wallet, no funds held;
- **private keys** — no key material, seed phrases, or signing clients;
- **payment signing** — the MCP signs nothing;
- **payment verification** — the MCP verifies / settles nothing;
- **API-key use** — the challenge-only verification is a no-key probe;
- **remote / hosted MCP** — no transport work of any kind;
- **autonomous paid execution** — no agent-initiated paid execution;
- **unattended / scheduled / bulk use** of any paid, credential-bearing, or relay
  surface;
- **deferred routes** — `/v1/market/regime/forecast`, `/v1/breadth/sector/history`,
  `/v1/leadership/rotation/history` remain non-promoted and denied
  `endpoint_not_allowlisted`;
- **decision / portfolio endpoints** — no `POST` / body-bearing decision or
  portfolio surface;
- **Intelligence Agent artifacts** — no research / editorial / guidance artifact
  surface;
- **investment advice** — no buy/sell/hold/allocation/risk/suitability output; the
  context-not-advice framing stands;
- **package publication** — no npm/registry publication;
- **directory submission** — no directory/marketplace/registry submission;
- **final marketplace launch** — final launch/listing remains deferred.

The PR #54 §8 / PR #60 §8 / PR #62 §18 non-approvals stand unchanged and are
preserved here with no weakening.

## 19. Recommendation

- **After Codex approval and merge, the next step is PR #64 — the x402 contract
  verification report** — not implementation.
- **PR #64 should execute challenge-only verification only after the exact §11
  authorization phrase** is supplied verbatim; without it, no verification runs.
- **Do not implement the relay until PR #64 is reviewed.** No relay field name,
  header, config flag, or tool contract is finalized before the verified facts
  land (§16).
- **Keep final marketplace x402 claims deferred** — no listing may claim x402
  support until a real relay is implemented and validated (PR #62 §15).
- **Keep the return to the Stock Trends Intelligence Agent deferred** until the
  MCP x402 relay path is completed (PR #60 §11 roadmap).

## 20. Codex review checklist (for PR #63)

Codex review of PR #63 should verify:

1. **Docs-only scope** — no `src/`, `tests/`, `package.json`, `package-lock.json`,
   script, runtime-artifact, log, or output-file change.
2. **One new plan document plus exactly one README documentation-index link**, and
   no other README change.
3. **No src/tests/package changes** — `git status` for those paths is empty.
4. **No verification executed** — the PR performs no endpoint call of any kind,
   paid or credential-free, and runs no verification.
5. **No API key / live calls / payment / proof / x402 execution** by the PR
   itself, and no MCP Inspector session.
6. **Current baseline accurate** — the §4 counts (1/10/10/0/9), tool names,
   resource facts, and route list match the source at HEAD `3c47829` and the
   merged PR #60 signoff §4.
7. **Route inventory accurate** — the §7 nine routes, tools, and pricing rules
   match `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` in `src/paidPolicy.ts`.
8. **Authorization phrases clear** — the §11 challenge-only phrase and the
   stronger live proof-forwarding phrase are exact and distinct, and "no phrase →
   no run" is explicit.
9. **Challenge-only scope safe** — §6/§7/§9 keep the default verification no-key,
   no-spend, no-proof, status/shape-only.
10. **Proof-forwarding requires separate stronger authorization** — §10/§11 keep
    live payment behind its own phrase and likely its own plan/report.
11. **Failure conditions complete** — §14 covers key use, any payment/proof/spend,
    paid data on a no-key check, unexpected headers, non-allowlisted routes, and
    remote transport.
12. **Capture / redaction policy adequate** — §13 is shape-only, no payload dumps,
    fail-closed redaction, no proof/wallet capture.
13. **Non-goals preserved** — §18 restates the PR #54/#60/#62 non-approvals with
    no weakening.
14. **Next step is the report, not implementation** — §16/§19 make PR #64 the next
    step and gate all design on it.
15. **No secrets** — no key-shaped string, no populated `X-API-Key:` /
    `Authorization:` header value, no `Bearer`, no private key / seed phrase /
    wallet material, no `.env` content, no realistic credential, and no
    payment-proof-shaped string anywhere in the diff.

---

**Reminder:** This plan is documentation only. It performs no verification and no
implementation, makes no live API call (paid or credential-free), uses no API
key, creates no payment and no payment proof, adds no payment header, introduces
no wallet or private-key handling, runs no MCP Inspector session, initiates no
x402 flow, adds no remote MCP, adds no runtime change, and approves nothing
beyond recording the safe, bounded, separately authorized future verification
procedure above. Every x402 contract detail remains provisional and
to-be-verified until PR #64 is completed and reviewed.
