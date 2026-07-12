# Phase 5F x402 Relay Architecture Memo

Design date: 2026-07-12

Status: **Architecture memo only (PR #62). Documentation-only.** This memo
selects and designs, at the architecture level only, the next MCP track after
the merged Phase 5E local stdio launch-readiness signoff (PR #60) and its
evidence-base clarification (PR #61): a **non-custodial x402 relay**. It
authorizes **no implementation**. No `src/` change, no `tests/` change, no
`package.json` / `package-lock.json` change, no `.env` change, no MCP tool
added, no MCP resource added, no MCP prompt added, no auth-capable allowlist
promotion, no pricing-mirror change, no route promotion, no dynamic
registration, no wallet code, no private-key handling, no payment
verification, no payment header, no OAuth/Bearer behavior, no remote MCP, no
live endpoint call of any kind (paid or credential-free), no paid validation,
no MCP Inspector session, and no API key used, requested, inspected, printed,
logged, or stored is performed or authorized by this memo. The only non-`docs/`
change is one documentation-index link in `README.md`, which changes no runtime
behavior.

Like the PR #55 and PR #61 memos, this memo performed **no network request at
all** — not even a credential-free metadata read. Every fact below is drawn
from the merged Phase 4–5E document set and a read-only inspection of the
source tree at HEAD `d183708` (`Clarify Phase 5E signoff evidence base (#61)`).

This memo makes **no production-readiness claim**, **no implementation
commitment**, and **no launch/listing claim**. The x402 relay track proceeds
only through its own later, separately reviewed PR sequence (§17), each step
gated by review, exactly as in Phases 4, 5B, 5C, 5D, and 5E. Nothing in this
memo may be read as approving x402 execution, a wallet, a payment header, a
payment verification, a remote transport, or a marketplace claim of x402
support.

This memo builds on and does not supersede:

- [`PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md`](PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md)
  (PR #60) — the merged local stdio launch-readiness signoff whose §11
  post-signoff roadmap names this track ("the next MCP track is the x402 relay
  architecture — design-first") and whose §12 sets the entry boundaries this
  memo starts from.
- [`PHASE5E_CONTROLLED_LOCAL_CLIENT_VALIDATION_REPORT.md`](PHASE5E_CONTROLLED_LOCAL_CLIENT_VALIDATION_REPORT.md)
  (PR #59) — the credential-free / no-spend validation evidence (verdict
  **PASS WITH DEVIATIONS**) and the current-surface observation baseline.
- [`PHASE5E_DIRECTORY_METADATA_READINESS.md`](PHASE5E_DIRECTORY_METADATA_READINESS.md)
  (PR #58) — the reviewed listing content whose capability block records
  `"payment_rails": "none (no x402, no wallet, no OAuth, no Bearer)"` and whose
  §9 forbidden-claims list keeps any x402 claim out of any listing until it is
  true.
- [`PHASE5E_LAUNCH_RELEASE_CHECKLIST.md`](PHASE5E_LAUNCH_RELEASE_CHECKLIST.md)
  and
  [`PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md`](PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md)
  (PR #58) — the current-surface, no-spend operator/release documentation the
  relay must not silently invalidate.
- [`PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md`](PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md)
  (PR #56) — the launch/distribution readiness design whose §10.3 non-approvals
  this memo preserves.
- [`PHASE5E_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5E_NEXT_CAPABILITY_SELECTION_MEMO.md)
  (PR #55) — the §3.E deferral of "Remote MCP / hosted MCP / x402 architecture"
  as a **design-only** track, which this memo enters at the architecture level
  (and only the x402-relay portion of, not remote/hosted transport).
- [`PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md)
  (PR #54) and
  [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
  (PR #53) — the controlled-local-stdio-only runtime scope and §8 non-approvals
  this memo preserves verbatim.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — §4 (x402 and wallet handling
  deferred), §5/§7/§8 (paid-call safety, runaway-loop and broad-sweep controls,
  rate/spend control), §9 (logging policy), §11 (local stdio risks), §12
  (future remote MCP risks), and §15–§17 (the paid execution models and the
  nine-route auth-capable allowlist).
- [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  and
  [`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)
  — the operator record whose §4 paid-execution *eligibility* posture (not a
  live runbook) any future relay validation inherits.

## Three-layer posture (read this first)

This memo deliberately separates three things that must never be conflated:

1. **The current local stdio, `X-API-Key`-only MCP surface** — already
   launch-readiness-signed-off for controlled local stdio operator use after
   PR #60/#61. It has **no** payment rail
   (`payment_rails: "none"`). This memo changes nothing about it.
2. **The future x402 relay architecture** — the subject of this memo. A
   design-only, non-custodial relay/protocol-translator posture between MCP
   clients/agents and the Stock Trends API's existing x402 flow. Nothing here
   is built, promoted, or validated.
3. **Future x402 implementation, validation, and listing** — **not approved by
   this memo.** Implementation, mock testing, no-spend validation, any live
   x402 validation, production/readiness signoff, and any marketplace claim of
   x402 support are each their own separately reviewed step (§16, §17), gated
   by contract verification (§16) first.

## 1. Status

- **Docs-only architecture memo.** This PR creates this document and one README
  documentation-index link; nothing else changes.
- **No implementation** — no code, no tool/resource/prompt registration, no
  allowlist promotion, no pricing-mirror change, no runtime behavior change.
- **No validation** — no endpoint of any kind is called by this memo, and no
  validation run is performed.
- **No live calls** — no Stock Trends endpoint is contacted, paid **or
  credential-free**.
- **No API key** — none is used, requested, inspected, printed, logged, or
  stored.
- **No x402 execution** — no payment challenge is requested, no payment proof
  is obtained, forwarded, or verified; nothing is signed, paid, settled, or
  retried.
- **No wallet** — no wallet, no private keys, no seed phrases, no signing
  client appears or is designed into the repository.
- **No payment header** — no payment/`X-Payment`/settlement header is
  constructed or sent.
- **No remote MCP** — no HTTP/SSE/Streamable HTTP transport appears or is
  approved.
- **No package publication** — no npm/registry publication occurs or is
  approved.
- **No directory submission** — no directory/marketplace/registry submission
  occurs or is approved.
- **No final marketplace launch** — final launch/listing remains deferred
  (§15).

## 2. Decision summary

**Architecture decision:** adopt the **x402 relay** as the next MCP track, and
set its **first architecture target** to be **MCP-as-relay / protocol
translator** — nothing more.

- **Adopt x402 relay as the next MCP track**, design-first, as the PR #60 §11
  roadmap directs.
- **First architecture target is MCP-as-relay / protocol-translator**: the MCP
  adapter relays the Stock Trends API's existing x402 payment-required
  challenge to the client/agent, and relays the client/agent-supplied payment
  proof back to the same API endpoint — translating between the MCP tool
  protocol and the API's x402 flow, and forwarding API-authored results
  verbatim.
- **Stock Trends API remains the payment authority.** The API and its payment
  facilitator remain the source of truth for pricing, the payment challenge,
  settlement, verification, and metering.
- **The MCP must not be a wallet custodian, payer, signer, settlement verifier,
  or payment source of truth.** It holds no funds, holds no keys, signs
  nothing, verifies no payment, and adjudicates no settlement.
- **The exact relay contract must be verified before any implementation.** The
  precise x402 challenge schema, the accepted payment-proof/envelope shape, the
  required headers/body fields, the error statuses, and the settlement/
  verification response fields are treated as **to-be-verified** against the
  Stock Trends API's current x402 behavior in a later, separate contract
  verification PR (§16) — not assumed here.

This is an architecture decision, not an authorization to build. Nothing is
implemented, promoted, or validated by this memo.

## 3. Strategic rationale

Why the x402 relay is the right next step now:

- **Phase 5E made local stdio launch-ready.** PR #60 declared the current
  1/10/10/0/9 surface (§4) ready for controlled local stdio operator use, with
  the install path, client documentation, no-spend operator runbook, release
  checklist, and directory-metadata content all reviewed. The capability
  surface is complete for that scope; what remains for broader agentic value is
  the transaction path.
- **Stock Trends' agentic emphasis requires both discoverability and ease of
  transaction.** For agentic trading applications, a data surface is only half
  the story: an agent must be able to *find* the right tool and *pay for* the
  data it needs without a human minding a subscription key.
- **MCP alone improves semantic / tool discovery.** The existing MCP surface
  already gives agents typed tools, public methodology resources, and a
  planning tool — strong discovery ergonomics.
- **x402 improves the machine-payable execution path.** x402 is the Stock
  Trends API's existing payment rail; exposing it through the MCP lets an
  agent's own wallet/facilitator settle a payment challenge and obtain paid
  data in-flow, rather than requiring a pre-provisioned operator API key.
- **The product needs both.** Discovery without a machine-payable path forces
  every paid agent back onto operator-supervised `X-API-Key` sessions;
  payability without discovery has nothing to sell. The relay track pairs the
  two.
- **The relay approach aligns with the existing Stock Trends API payment rail
  without moving custody into the MCP.** The API already speaks x402; the MCP
  can translate that flow to MCP clients without becoming a wallet, a payer, or
  a verifier. Custody, pricing, and verification stay where they already are.
- **This is more aligned with trading agents than API-key-only local stdio.**
  The current `X-API-Key` path is an operator-supervised, human-in-the-loop
  posture (see the README "exposure ≠ execution" gating and the Claude Code
  free-mode-only boundary note). A non-custodial relay lets an agent transact
  with its own funds under its own controls, which is the posture agentic
  trading applications actually need.

Grounding note: the repository already anticipates this direction without
acting on it. The credential-free planning tool
`stocktrends_estimate_workflow_cost` already accepts an `x402` **rail
preference** among `["subscription", "x402", "mpp", "auto"]`
(`COST_ESTIMATE_RAIL_PREFERENCES` in `src/tools/index.ts`) and explicitly
disclaims that "[r]ail planning for x402 or MPP does not trigger payment
signing, wallet handling, or payment retry," recording that "[a]ctual payment
challenge amounts, if any, are determined later by the Stock Trends
API/payment rail." The planning tool models the *concept* of a downstream
payment rail; it authorizes nothing. This memo designs the relay that would,
in a later reviewed track, connect that concept to the API's real x402 flow.

## 4. Current baseline

The surface this memo starts from is the **1/10/10/0/9 contract**, confirmed by
the merged PR #60 signoff §4 and re-confirmed read-only against the source at
HEAD `d183708` (`src/paidPolicy.ts`, `src/config.ts`, `src/server.ts`,
`src/resources/index.ts`, `src/tools/`, `src/stocktrendsClient.ts` — no live
call needed or permitted):

- **Default / free mode: exactly 1 tool** — `stocktrends_estimate_workflow_cost`
  (credential-free planning tool). No paid tool is ever visible in free mode.
- **Paid-exposed mode: exactly 10 tools** — the planning tool plus the nine
  paid tool definitions (`stocktrends_get_stim_latest`,
  `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`,
  `stocktrends_get_indicators_history`, `stocktrends_get_selections_latest`,
  `stocktrends_get_market_regime_latest`,
  `stocktrends_get_market_regime_history`,
  `stocktrends_get_breadth_sector_latest`,
  `stocktrends_get_leadership_summary_latest`). Exposure requires **both**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** a configured
  `STOCKTRENDS_API_KEY`; neither alone exposes anything.
- **Public resources: exactly 10 in every mode**, all credential-free and
  fetch-on-request.
- **MCP prompts: exactly 0 in every mode.**
- **Auth-capable paid allowlist: exactly 9 routes**
  (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` in `src/paidPolicy.ts`): `/v1/stim/latest`,
  `/v1/stim/history`, `/v1/indicators/latest`, `/v1/indicators/history`,
  `/v1/selections/latest`, `/v1/market/regime/latest`,
  `/v1/market/regime/history`, `/v1/breadth/sector/latest`,
  `/v1/leadership/summary/latest`. Every other route is denied
  `endpoint_not_allowlisted` before any auth header or fetch.
- **Local stdio only** — the only transport
  (`STOCKTRENDS_MCP_TRANSPORT=stdio` is the sole accepted value in
  `src/config.ts`).
- **`X-API-Key` only** — the sole credential path, built only inside the
  coupled paid boundary (`buildPaidAuthHeaders`), only for the approved origin
  plus an exact promoted path, only after every gate passes. No
  `Authorization: Bearer`, no OAuth, no payment header.
- **No x402 in the current surface.** No payment rail of any kind exists:
  `payment_rails: "none"` in the reviewed directory metadata. The current paid
  client already *reads* two non-secret response-metadata headers on a paid
  response — `x-stocktrends-payment-required` and
  `x-stocktrends-accepted-payment-methods` (surfaced as `payment_required` /
  `accepted_payment_methods`) — and maps a `402` to safe `api_payment_required`
  metadata, but **nothing is signed, paid, forwarded, or retried**;
  `payment_header_sent` is a constant `false` in every paid tool result. These
  currently-observed header names are the only x402-adjacent contract detail
  present in the repository, and even they are treated as **to-be-verified**
  for relay purposes (§16), not as the full challenge/proof contract.
- **No remote MCP.** No HTTP/SSE/Streamable HTTP transport exists or is
  approved.
- **Phase 5E local stdio launch-readiness is signed off** (PR #60) for
  controlled, operator-supervised local stdio use only; the Phase 5D runtime
  scope (controlled local stdio operator use) is unchanged.
- **Final listing / submission deferred** — the reviewed directory metadata is
  approved as reusable content only, not a submission, and explicitly carries
  no x402 claim.

## 5. Architecture principle

The controlling authority chain is unchanged and governs the relay:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API response / payment challenge -> MCP relay -> MCP client/agent
```

The MCP adapter remains a thin translator with no independent authority. It
recomputes nothing, ranks nothing, forecasts nothing, prices nothing, and
advises nothing; the API authors every output — including every payment
challenge — and the adapter forwards it verbatim.

Payment authority, stated as a chain:

```text
MCP client / agent / facilitator  --supplies-->  payment proof
Stock Trends API / payment facilitator  --verifies / settles / meters-->  payment
MCP relay  --relays only, never adjudicates-->  challenge and proof
```

- **The MCP client / agent / facilitator supplies the payment proof.** The
  wallet, the signing, and the funds live entirely on the client/agent side (or
  its own facilitator), outside the MCP.
- **The Stock Trends API / payment facilitator verifies and settles.** Pricing,
  challenge issuance, verification, settlement, and metering are all upstream
  authority.
- **The MCP relays only.** It forwards the API's payment-required challenge to
  the client and forwards the client's payment proof/envelope back to the same
  API endpoint. It makes no payment decision of its own.
- **The MCP never becomes the payment source of truth.** No local ledger, no
  local settlement state, no local "is this paid?" adjudication ever becomes
  authoritative; the API's response is authoritative.

## 6. Target x402 relay flow (conceptual)

The conceptual two-call flow, without hardcoding any unverified field names.
Every field, header, and status named as a placeholder below is **provisional**
and requires contract verification (§16) before implementation.

- **A.** A client calls an MCP paid-capable tool **without an API key**, or
  with an explicit **x402 relay mode** selected (§8). (In API-key mode, the
  current `X-API-Key` behavior is unchanged.)
- **B.** The MCP calls the corresponding Stock Trends API endpoint in **relay
  mode** — the same allowlisted paid endpoint the tool already targets — with
  no API key and no invented payment material.
- **C.** The API returns a **payment-required challenge / requirements** (an
  x402 `402`-class response conveying what payment the API requires). The exact
  schema is to be verified (§16).
- **D.** The MCP returns a **structured payment-required tool result** to the
  client/agent — a machine-readable representation of the API's challenge,
  clearly marked as "payment required, not yet paid," carrying the API's
  challenge fields verbatim where safe.
- **E.** The client / agent obtains a **payment proof** from **its own wallet /
  facilitator, entirely outside the MCP**. The MCP performs no wallet action,
  no signing, and no key handling in this step or any other.
- **F.** The client / agent calls the MCP tool **again**, supplying the
  **payment proof / payment envelope** as an explicit input.
- **G.** The MCP **forwards** the proof / envelope to the **same Stock Trends
  API endpoint** (origin- and path-coupled; §7, §10), attaching only what the
  verified x402 contract requires and only the client-supplied proof material.
- **H.** The API **verifies, settles, and meters** the payment upstream. The
  MCP does not verify or settle.
- **I.** The API returns the **paid response**.
- **J.** The MCP returns the **API-authored data verbatim** (`api_data`
  preserved exactly, provenance metadata alongside), with **no recomputation**,
  no re-ranking, and no advice transformation.

Explicitly, and repeated because it is the crux of the design:

- **This is conceptual.** It is a target shape for a later reviewed
  architecture/implementation memo, not a specification to build from.
- **Exact fields require contract verification.** The challenge schema, the
  proof/envelope shape, the headers/body, and the response statuses are all
  §16 work.
- **No automatic wallet payment happens in the MCP.** The MCP never pays on its
  own; a paid call only ever proceeds because the client/agent supplied proof.
- **No private keys are in the MCP.** No key material of any kind enters the
  repository or its runtime.
- **No payment verification happens in the MCP.** The MCP never decides whether
  a payment is valid; only the API/facilitator does.

## 7. Relay contract boundaries

**What the future MCP relay MAY relay** (all API-authored or client-supplied,
none invented by the MCP):

- the **API payment-required challenge / requirements** as returned by the API;
- the **endpoint identifier / tool family** the challenge and payment pertain
  to (so the client knows what it is paying for);
- **amount / network / asset / recipient / expiry** fields **if and only if the
  API provides them** in its challenge — forwarded verbatim, never computed or
  defaulted by the MCP;
- the **payment proof / envelope supplied by the client** — forwarded to the
  same endpoint, unmodified except as the verified contract requires;
- the **API settlement / verification response status** **if the API provides
  it** — forwarded as safe metadata;
- the **API-authored paid response** — preserved verbatim in `api_data`.

**What the future MCP relay MUST NOT relay, store, or do:**

- hold or relay **private keys** or **seed phrases**;
- hold or relay **wallet credentials** of any kind;
- **persist payment proofs** beyond the single forwarding of a single call
  (no proof store, no proof cache, no reuse ledger);
- store or emit **raw secrets** of any kind;
- hold **payment source-of-truth state** — no authoritative local record of
  what is paid;
- **sign** anything;
- perform **settlement verification** — no adjudication of payment validity;
- keep **local balance accounting** as payment truth (local spend *telemetry*
  for safety caps is distinct and addressed in §11);
- **invent prices** — the MCP never originates or defaults an amount;
- apply **advice / recommendation transformations** — no output becomes a
  buy/sell/hold/allocation/suitability signal; the context-not-advice framing
  stands.

## 8. Mode design (design-only)

Future modes, at the design level only:

- **Default / free mode remains unchanged.** Exactly one credential-free
  planning tool, ten public resources, zero prompts, no spend — untouched by
  the relay track.
- **API-key paid mode remains supported as the current path.** The existing
  `X-API-Key` exposure/execution split, mandatory family-scoped pricing
  preflight, default-deny caps, covering budget, single-fetch/no-retry rules,
  and repeated-identical-call gates continue exactly as signed off. The relay
  track does not remove or weaken it.
- **x402 relay mode is separate and explicit.** It is its own mode, selected
  explicitly, never implied by the presence or absence of an API key alone.
- **No automatic mixed mode** unless a later reviewed design approves one.
  API-key mode and x402 relay mode do not silently interoperate.
- **x402 relay exposure must not accidentally enable paid execution.** Making a
  relay-capable tool or mode *visible* must remain distinct from *executing* a
  paid relay call — the same exposure-≠-execution discipline the current
  surface enforces.
- **x402 relay mode must have its own environment / config flags**, distinct
  from the API-key exposure/execution flags, so relay capability is
  independently gated and independently auditable.
- **Invalid or contradictory mixed config must fail closed.** A configuration
  that enables both API-key execution and x402 relay in an ambiguous way must
  deny (fail closed), not guess a precedence (§13).
- **No mode may increase the tool count** unless separately approved. Whether
  x402 relay is expressed as new inputs on existing tools, a mode flag, or new
  tools is itself a §16/§17 design decision; this memo approves no count
  change.

Provisional configuration candidates (illustrative only — **not final names**,
subject to §16/§17 design and review; do not implement): a distinct relay
enable flag conceptually analogous to today's `STOCKTRENDS_ENABLE_PAID_TOOLS` /
`STOCKTRENDS_ENABLE_PAID_EXECUTION` split, e.g. a provisional
`STOCKTRENDS_ENABLE_X402_RELAY` (candidate name only). The final flag names,
defaults, and fail-closed matrix are deferred to the implementation-design PR
and must follow the strict-parsing, default-off posture of the existing flags
in `src/config.ts`.

## 9. Tool contract design candidates (provisional)

Candidate shapes only — **not implementation**, and **every field name below is
provisional until contract verification** (§16):

- **Payment-required result shape** — a structured tool result that clearly
  signals "payment required, not yet paid," carries the API's challenge fields
  verbatim where safe, names the endpoint/tool the challenge pertains to, and
  marks itself as non-final (the call did not return paid data).
- **Second-call payment-proof input shape** — an explicit tool input that
  carries the client-supplied payment proof / envelope for forwarding, and
  nothing the MCP itself originates.
- **Correlation / challenge binding** — a way to bind the second (proof) call
  to the specific first (challenge) call, so a proof is only ever forwarded for
  the challenge it answers (subject to whether the API supports correlation at
  all — §16, §19).
- **Expiry / stale-challenge handling** — a way to treat an expired or stale
  challenge as fail-closed rather than forwarding a proof against a challenge
  the API no longer honors.
- **Endpoint / tool identity binding** — the proof forwarding is coupled to the
  exact endpoint and tool the challenge came from; a proof can never be
  forwarded to a different or non-allowlisted route.
- **Response status fields** — safe, API-authored settlement/verification
  status surfaced as metadata (never fabricated by the MCP).
- **Error codes** — deterministic, secret-free relay error codes (e.g.
  conceptually analogous to the existing `api_payment_required` /
  `paid_execution_disabled` families), distinguishing "challenge returned,"
  "proof rejected by API," "stale/expired challenge," "endpoint not
  allowlisted," and "relay not enabled."

All of these names and shapes are **provisional** and are settled only by the
§16 contract verification plus the §17 implementation-design memo.

The design must preserve, non-negotiably:

- **one tool call cannot silently become paid** without the user/agent
  supplying payment proof — a challenge result is not a payment;
- **no automatic retry after a payment-required** result — the client must make
  an explicit second call;
- **no repeated-identical paid loop** — the existing repeated-identical-call
  fail-closed posture extends to relay calls;
- **no payment proof is sent to any non-allowlisted route** — proof forwarding
  is origin- and path-coupled to the same allowlisted endpoint;
- **no auth / payment header is sent before an explicit proof envelope is
  supplied** — the first (challenge) call carries no payment material at all.

## 10. Security model

The relay track extends, and never relaxes, the existing security model
(`SECURITY_MODEL.md` §2–§17). Its posture:

- **No wallet custody.** The MCP holds no funds and no wallet.
- **No private keys.** No key material, seed phrases, or signing clients enter
  the repository or its runtime — consistent with `SECURITY_MODEL.md` §4.
- **No payment signing.** The MCP signs nothing; signing is a client/wallet
  responsibility outside the MCP.
- **No payment verification.** The MCP never adjudicates payment validity; the
  API/facilitator verifies.
- **No persistent proof storage.** A payment proof is forwarded for exactly one
  call and never persisted, cached, or re-used by the MCP.
- **No logs containing proof material.** Payment proofs, envelopes, and any
  secret-bearing challenge fields are never logged.
- **Redaction requirements.** The redaction layer must cover payment-proof and
  payment-envelope material as it already covers `X-API-Key`, `Authorization`,
  `X-Payment` / payment-header, and wallet/private-key patterns (see
  `src/redaction.ts`); the §16 contract verification must enumerate the exact
  proof fields so redaction is complete before any implementation.
- **Replay-prevention posture.** Because proofs are not persisted or re-used by
  the MCP, and forwarding is single-shot with no automatic retry, the MCP does
  not itself create a replay surface; whether the *API* requires challenge
  nonces / single-use proofs is a §16 verification item, and the relay must
  respect whatever the API requires (fail closed if unknown).
- **Correlation / challenge binding.** Where the API supports it, a proof is
  bound to the challenge it answers; where it does not, the relay must fail
  closed rather than forward an unbound proof (§16, §19).
- **Endpoint allowlist.** Relay calls (both the challenge call and the proof
  forwarding) may target **only** an explicitly promoted, reviewed allowlist —
  the same discipline as `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`. No relay call
  reaches a non-allowlisted route.
- **Origin / path coupling.** A proof is forwarded only to the exact approved
  origin and the exact endpoint path the challenge came from — the same
  coupling `isApprovedAuthTarget` enforces today.
- **No remote transport yet.** The relay is designed for local stdio first
  (§14); no HTTP/SSE/Streamable HTTP transport is introduced or approved.
- **Local stdio risks.** The `SECURITY_MODEL.md` §11 risks (any connected
  client can invoke enabled tools; a compromised local client can act through
  configured capability) apply to relay mode; the mitigation is that the MCP
  holds no funds/keys, so a compromised client can still only present *its own*
  proof, and every relay call remains explicit and single-shot.
- **User / agent consent boundary.** The client/agent (and, in a supervised
  session, the operator) is the party that decides to pay; the MCP never
  decides to pay. A payment-required result must make the "not yet paid" state
  unmistakable so consent is explicit.
- **Agentic runaway-spend controls.** The `SECURITY_MODEL.md` §7 runaway-loop
  controls extend to relay: no automatic retry after a payment-required, no
  background/scheduled relay calls, repeated-identical-call fail-closed, and no
  silent second call (§11).

## 11. Spend and retry controls

Design principles for relay spend safety, extending `SECURITY_MODEL.md`
§7/§8:

- **No automatic paid retries.** A payment-required result never triggers an
  automatic re-call; the client must call again explicitly with proof.
- **No background calls.** No relay call happens outside an explicit tool
  invocation.
- **No scheduled calls.** No timer, cron, or unattended trigger initiates a
  relay call.
- **No bulk / sweep use.** No pagination, offset walking, exchange iteration,
  or universe assembly through the relay path — the existing single-fetch,
  bounded-limit posture applies.
- **No proof reuse** unless the API explicitly authorizes it **and** a later
  reviewed architecture approves it — the default is single-use, forward-once.
- **Per-session and per-tool caps remain relevant.** The existing default-deny
  call caps and covering-budget requirement continue to apply as a local safety
  net even though the API/facilitator is the metering authority.
- **Payment-required challenges should not debit local caps** unless a later
  design approves it — a challenge is not a spend; only a *fulfilled paid
  response* represents value received.
- **Fulfilled paid responses should be accounted for in local telemetry if
  safe** — local, in-memory, non-authoritative spend telemetry (as today's
  `PaidUsageTracker` records) may record a fulfilled relay call for cap safety,
  but such telemetry is never the payment source of truth (§7).
- **Zero hidden paid execution.** No relay call ever spends without the client
  having supplied proof in an explicit call; there is no path from a single
  no-proof call to a completed payment.

## 12. Pricing and catalog reconciliation

- **The API remains authoritative for pricing.** The catalog and the API's own
  challenge are the pricing truth.
- **The MCP must not hardcode x402 prices.** No static x402 price mirror
  originates or defaults an amount; any amount comes from the API.
- **The existing pricing-catalog reconciliation pattern should be adapted where
  appropriate.** The current family-scoped, fail-closed reconciliation of
  static mirrors against the credential-free `/v1/pricing/catalog` metadata
  (`SECURITY_MODEL.md` §15.3/§16.4/§17.3) is a proven pattern; a relay design
  may reuse its *shape* (fail-closed, family-scoped, catalog-authoritative)
  without importing subscription STC amounts as x402 amounts.
- **A payment challenge should be reconciled against the catalog only if safe
  and supported** — whether the x402 challenge amount can or should be
  cross-checked against the catalog is a §16 verification item, not assumed.
- **Mismatch must fail closed.** Any pricing/challenge inconsistency the relay
  can detect denies rather than proceeding.
- **Exact policy is deferred** to the §16 contract verification and the §17
  implementation-design refinement.

## 13. API-key path coexistence

- **The existing `X-API-Key` path remains valid.** Subscription/API-key users
  are unaffected by the relay track.
- **x402 relay does not replace API-key users immediately.** Both paths may
  exist; the relay is additive, not a migration.
- **Config must prevent accidental dual credentials.** A configuration must not
  let a single call carry both an API key and an x402 proof ambiguously.
- **If both API key and x402 relay are configured, the architecture must define
  precedence or fail closed.** The default posture is **fail closed** on
  ambiguous dual configuration; any explicit precedence rule is a later
  reviewed design decision, never an implicit one.
- **No silent fallback** from a failed API-key call to an x402 payment, or from
  a failed x402 relay call to an API-key call, without an explicit reviewed
  design. A failure in one mode never silently switches modes.

## 14. Local stdio vs future remote MCP

- **The first x402 relay may be designed for local stdio.** The relay track
  starts on the existing, signed-off local stdio transport.
- **Remote / hosted MCP remains not approved.** No HTTP/SSE/Streamable HTTP
  transport is introduced or approved by this memo (PR #54 §8; PR #60 §8;
  `SECURITY_MODEL.md` §12).
- **Remote MCP would require its own separate architecture** for tenancy,
  client authentication/authorization, abuse controls, distributed rate limits,
  user identity, payment delegation, server-side secret handling, deployment,
  and audit logging — none of which this memo designs.
- **Do not couple local relay design to hosted launch** unless a later reviewed
  architecture approves it. The local relay must stand on its own; it must not
  bake in assumptions that only make sense for a hosted, multi-tenant service.

## 15. Marketplace / listing implications

- **Current final listing remains deferred.** The reviewed directory metadata
  (PR #58) is approved as reusable content only, not a submission, and its §9
  forbidden-claims list already bars any x402 claim.
- **After x402 relay architecture → implementation → validation, metadata may
  be updated to claim x402 relay support — only if true.** No listing may claim
  x402 support until the relay is implemented and validated.
- **Until implementation / validation, listings must not claim x402 support.**
  The `payment_rails: "none"` capability fact stands until a real, validated
  relay exists.
- **Final marketplace launch requires a separate reviewed submission step** —
  unchanged from the PR #60 §10 posture.
- **A local stdio x402 relay may still improve agentic discoverability and
  transaction ease** — and that is its point — **but it must be described
  accurately**: local stdio, non-custodial relay, API-as-payment-authority, no
  wallet in the MCP.

## 16. Contract verification requirements

A **future PR, before any implementation**, must verify the Stock Trends API's
actual x402 behavior (no secrets, no real payment, no spend unless separately
authorized):

- verify the API's **actual x402 `402` payment-required response shape**
  (headers and body), rather than assuming the currently-observed
  `x-stocktrends-payment-required` / `x-stocktrends-accepted-payment-methods`
  metadata headers are the whole contract;
- verify the **accepted payment-proof / envelope shape** the API expects on the
  second call;
- verify the **required headers / body fields** for forwarding proof;
- verify the **error statuses** for rejected, malformed, stale, or expired
  proofs;
- verify the **settlement / verification response status fields** the API
  returns on success;
- verify **replay / stale-challenge behavior** (nonces, single-use, expiry);
- verify whether the API **supports challenge correlation** (binding a proof to
  a specific challenge);
- verify whether **x402 is available on all currently promoted paid routes or
  only a subset** — the nine auth-capable routes may not all be x402-capable;
- verify whether a **no-API-key relay call can safely trigger a payment
  challenge** without side effects or unexpected charges;
- perform all of the above with **no secrets, no real payment, and no spend
  unless separately authorized** in its own plan/report pair.

Until §16 is complete and reviewed, no relay field name, header, or status in
this memo may be treated as final.

## 17. Implementation sequence (proposed, not binding)

A proposed future reviewed PR sequence. **Numbers are approximate** and the
sequence is a proposal, not an authorization; each PR is its own separately
reviewed step, and review may revise, reorder, or stop any of them:

- **PR #63** — x402 relay **contract verification plan** (how the API's x402
  behavior will be verified; no secrets, no spend).
- **PR #64** — x402 relay **contract verification report** (the verified §16
  facts).
- **PR #65** — x402 relay **implementation design / contract memo** (the
  concrete tool contract, config flags, headers/fields, and fail-closed matrix,
  built on the verified contract).
- **PR #66** — **mock-only implementation** (relay behavior exercised entirely
  against mocks; no live call).
- **PR #67** — **no-spend relay validation** (credential-free / no-proof
  fail-closed checks, mirroring the PR #59 no-spend discipline).
- **PR #68** — **controlled live x402 relay validation plan**, if needed and
  separately authorized.
- **PR #69** — **controlled live x402 relay validation report**, only if
  authorized.
- **PR #70** — x402 relay **production / readiness signoff** (narrow, for the
  validated scope only).
- **PR #71** — **listing / submission readiness update** (only then may
  metadata claim x402 relay support, and only if true).

No PR in this sequence is approved by this memo; PR #62 commits none of them.

## 18. Non-goals

This memo explicitly does **not** approve, and nothing in it may be read as
approving:

- **implementation** of any part of the relay;
- **x402 execution** — no challenge request, proof forwarding, or paid relay
  call;
- **wallet custody** — no wallet, no funds held;
- **private keys** — no key material, seed phrases, or signing clients;
- **payment signing** — the MCP signs nothing;
- **payment verification** — the MCP verifies/settles nothing;
- **remote / hosted MCP** — no transport work of any kind;
- **autonomous paid execution** — no agent-initiated paid execution outside an
  explicit, supervised, proof-carrying call;
- **unattended / scheduled / bulk use** of any paid or relay surface;
- **deferred routes** — `/v1/market/regime/forecast`,
  `/v1/breadth/sector/history`, `/v1/leadership/rotation/history` remain
  non-promoted and denied `endpoint_not_allowlisted`;
- **decision / portfolio endpoints** — no `POST`/body-bearing decision or
  portfolio surface;
- **Intelligence Agent artifacts** — no research/editorial/guidance artifact
  surface;
- **investment advice** — no buy/sell/hold/allocation/risk/suitability output;
  the context-not-advice framing stands;
- **package publication** — no npm/registry publication;
- **directory submission** — no directory/marketplace/registry submission;
- **final marketplace launch** — final launch/listing remains deferred.

The PR #54 §8 / PR #60 §8 non-approvals stand unchanged and are preserved by
this memo with no weakening.

## 19. Open questions

Recorded for the §16 contract verification and §17 design to resolve:

- the **exact Stock Trends API x402 challenge schema** (headers and body);
- the **exact payment-proof / envelope forwarding schema** the API accepts;
- whether the **payment proof should be a tool argument, a resource-like
  object, or a structured envelope** input;
- whether **all currently promoted paid routes support x402**, or only a
  subset;
- how **challenge correlation** should be represented (and whether the API
  supports it at all);
- how to **represent a payment-required result** across differing MCP clients
  (some may not render rich structured results);
- whether **API-key mode and x402 relay mode should be mutually exclusive**, or
  coexist with an explicit precedence (§13);
- what **metadata / listing language** should be used after implementation
  (accurate, non-overclaiming);
- what **level of live validation** is required before claiming x402 support
  (and whether any live validation is required at all before a mock-validated
  signoff).

## 20. Recommendation

- **Proceed next to contract verification planning (§16 / PR #63), not
  implementation.** The immediate next step is to verify the API's real x402
  behavior, not to build a relay.
- **Keep the current local stdio signoff intact.** The PR #60/#61 local stdio
  launch-readiness posture is unchanged; the relay track is additive and
  design-first.
- **Do not list a final marketplace claim as x402-enabled yet.** No listing may
  claim x402 support until a real relay is implemented and validated (§15).
- **x402 relay is strategically critical and should be completed before
  returning to the Stock Trends Intelligence Agent** — consistent with the
  PR #60 §11 roadmap, work does not return to the Intelligence Agent until the
  MCP is live and x402 relay-enabled.
- **The first target should be a non-custodial x402 relay, not MCP-as-wallet.**
  The MCP relays the API's payment authority; it never becomes the wallet,
  payer, signer, verifier, or payment source of truth.

---

**Reminder:** This memo is documentation only. It performs no implementation
and no validation, makes no live API call (paid or credential-free), uses no
API key, runs no MCP Inspector session, performs no paid validation, executes
no x402 flow, adds no wallet or private-key or payment-header behavior,
introduces no remote MCP, adds no runtime change, and approves nothing beyond
recording the design-only architecture direction above. Every x402 contract
detail herein is provisional and to-be-verified (§16) before any
implementation.
