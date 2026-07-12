# Phase 5E Next-Capability Selection Memo

Design date: 2026-07-12

Status: **Selection / architecture memo only (PR #55). Documentation-only.**
This memo decides the next phase after the merged Phase 5D market-context
production-readiness signoff (PR #54). It authorizes **no implementation**. No
`src/` change, no `tests/` change, no `package.json` / `package-lock.json`
change, no MCP tool added, no MCP resource added, no MCP prompt added, no
auth-capable allowlist promotion, no pricing-mirror change, no route promotion,
no dynamic registration, no live endpoint call of any kind (paid or
credential-free), no paid validation, no MCP Inspector session, and no API key
used, requested, inspected, printed, logged, or stored is performed or
authorized by this memo. The only non-`docs/` change is one
documentation-index link in `README.md`, which changes no runtime behavior.

Unlike the PR #49 and PR #50 memos, this memo performed **no network request
at all** — not even a credential-free metadata read. Every fact below is drawn
from the merged Phase 4–5D document set and a read-only inspection of the
source tree at HEAD `8869fa7` (`Add market context production readiness
signoff (#54)`).

This memo makes **no production-readiness claim** for Phase 5E or for any
future capability, and it makes **no implementation commitment beyond this
memo**: the selected track proceeds only through its own later, separately
reviewed PR sequence (§6), each step gated by Codex review, exactly as in
Phases 4, 5B, 5C, and 5D.

This memo builds on and does not supersede:

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — §5/§7/§8 (paid-call safety,
  runaway-loop and broad-sweep controls, rate/spend control), §15 (paid ST-IM
  and indicators live execution), §15.7 (the narrowed credential-bearing
  allowlist, now nine routes), §16 (paid `selections/latest` live execution),
  and §17 (paid market-context live execution).
- [`PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md`](PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md)
  (PR #49) — the launch objective, the candidate-family assessment method this
  memo reuses, and the later-subphase sketch (§7) that this memo explicitly
  revisits in §5.
- The completed Phase 5D market-context evidence chain (PRs #49–#54):
  [`PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md),
  [`PHASE5D_MARKET_CONTEXT_IMPLEMENTATION_NOTES.md`](PHASE5D_MARKET_CONTEXT_IMPLEMENTATION_NOTES.md),
  [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_PLAN.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_PLAN.md),
  [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
  (verdict **PASS WITH DEVIATIONS**), and
  [`PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md).
- [`PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md)
  and
  [`PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md)
  — the selection-memo cadence and the narrow-signoff pattern.
- [`PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
  — the first narrow signoff in the proven chain.
- [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  and
  [`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)
  — the existing operator-readiness documentation, whose Phase 4-era surface
  counts are material evidence for the §5 recommendation.
- [`README.md`](../README.md) — the free/paid mode contract, the quickstart,
  and the environment-variable table.

## 1. Status

- **Docs-only selection memo.** This PR creates this document and one README
  documentation-index link; nothing else changes.
- **No implementation** — no code, no tool/resource/prompt registration, no
  allowlist promotion, no pricing-mirror change, no runtime behavior change.
- **No live validation** — no endpoint of any kind is called by this memo.
- **No API key** — none is used, requested, inspected, printed, logged, or
  stored.
- **No paid calls** — no spend or usage of any kind is created.
- **No MCP Inspector** session is run.
- **No production-readiness claim** — for Phase 5E, for any candidate track,
  or for any future capability. Readiness for the selected track is decided
  only by that track's own later evidence chain and signoff.
- **No implementation commitment beyond this memo** — the §6 PR sequence is a
  proposal to be executed as separate, individually reviewed PRs; any of them
  may be revised or stopped by review.

## 2. Current MCP surface after Phase 5D

The controlling authority boundary is unchanged and controls every candidate
track evaluated below:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin local stdio adapter over the front-facing Stock
Trends API. It recomputes nothing, ranks nothing, forecasts nothing, and
advises nothing; the API authors every output and the adapter forwards it
verbatim.

Surface contract, confirmed from the merged PR #54 signoff §4 and re-confirmed
read-only against the source at HEAD `8869fa7` (`src/server.ts`,
`src/paidPolicy.ts`, `src/paidPricing.ts`, `src/tools/`,
`src/resources/index.ts`):

- **Default/free mode: exactly 1 tool** — `stocktrends_estimate_workflow_cost`
  (credential-free planning tool). No paid tool is ever visible in free mode.
- **Paid-exposed mode: exactly 10 tools** — the planning tool plus
  `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`,
  `stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history`,
  `stocktrends_get_selections_latest`, `stocktrends_get_market_regime_latest`,
  `stocktrends_get_market_regime_history`,
  `stocktrends_get_breadth_sector_latest`, and
  `stocktrends_get_leadership_summary_latest`. Exposure requires **both**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** a configured
  `STOCKTRENDS_API_KEY`; neither alone exposes anything. The execution flag
  changes call behavior, never tool count.
- **Public resources: exactly 10 in every mode**, all credential-free and
  fetch-on-request (`stocktrends://api/openapi`, `ai/context`, `ai/tools`,
  `workflows`, `methodology/stim`, `methodology/indicators`,
  `methodology/inference`, `pricing/catalog`, `proof/market-edge`,
  `leadership/definitions`).
- **MCP prompts: exactly 0 in every mode.**
- **Auth-capable paid allowlist: exactly 9 routes**
  (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`): `/v1/stim/latest`,
  `/v1/stim/history`, `/v1/indicators/latest`, `/v1/indicators/history`,
  `/v1/selections/latest`, `/v1/market/regime/latest`,
  `/v1/market/regime/history`, `/v1/breadth/sector/latest`,
  `/v1/leadership/summary/latest`. Every other route is denied
  `endpoint_not_allowlisted` before any auth header or fetch.
- **Phase 5D market-context is production-ready only for controlled local
  stdio operator use** (PR #54): manual, operator-initiated,
  operator-supervised runs over local stdio, under the existing exposure/
  execution split, mandatory family-scoped pricing preflight, default-deny
  caps, covering STC budget, single-fetch/no-retry rules, and the
  repeated-identical-call loop gate.
- **Explicitly NOT approved by Phase 5D** (PR #54 §8), and unchanged by this
  memo: remote MCP, hosted MCP, autonomous agent use, unattended/scheduled/
  bulk use, the deferred routes (`/v1/market/regime/forecast`,
  `/v1/breadth/sector/history`, `/v1/leadership/rotation/history`),
  decision/portfolio endpoints, Intelligence Agent artifact endpoints,
  x402/wallet/OAuth/`Authorization: Bearer`/payment-header behavior, and
  investment advice.

The Phase 5D chain (PRs #49–#54) is fully merged; the controlled live
validation (PR #53) consumed `0.75 STC` across exactly four bounded calls and
rolled back cleanly. One operator-side hygiene item from that chain remains
open outside the repository: the PR #53 report §11 / PR #54 signoff §9
parent-shell cleanup (unsetting the pre-provisioned `STOCKTRENDS_*` variables
from the operator's shell). It is an operator action, not a repository change;
§6 places it in the Phase 5E operator runbook so the launch documentation
absorbs it permanently.

## 3. Candidate tracks evaluated

Six candidate tracks were evaluated for Phase 5E. Each is assessed against the
launch objective established by PR #49 §3 — *complete and launch the MCP as
soon as possible with currently available high-value Stock Trends endpoints,
prioritizing the market-context thesis and agentic discoverability, while
preserving governance* — and against the eight §4 criteria.

### 3.A MCP launch/distribution readiness

**What it is.** Make the existing, signed-off surface *launchable and
discoverable* without adding any new runtime capability: package/distribution
readiness assessment, install instructions for local stdio MCP clients, safe
client configuration examples (placeholder-only, free-mode-first), an operator
smoke-test runbook for the current surface, a launch release checklist, and
marketplace/directory metadata readiness. No new paid surface, no new routes,
no live validation unless separately planned as a credential-free/no-spend
docs-usability check.

**Why it fits now.** PR #49 §3/§5 defined the launch-quality first surface as:
planning tool → market context (regime/breadth/leadership) → symbol context
(ST-IM, indicators) → universe context (selections) — "a launch-quality
surface on its own." With PR #54 merged, that surface now **exists and is
signed off**. The launch objective's remaining gap is not capability — it is
launchability: a user or agent still cannot adopt the server from the public
documentation alone without archaeology through the phase trail.

**Concrete, verifiable documentation gap.** The operator-facing launch
documentation lags the shipped surface by three phases. The Phase 5A operator
safety and release checklist still gates releases on a **"1 free /
3 paid-exposed"** tool count and a "three-tool exposure surface"
(`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md` §4/§5), and the Phase 5A
MCP Inspector runbook validates a "three-tool surface" (§5) — all written in
the Phase 4 era, before the indicators, selections, and market-context
families brought the paid-exposed surface to ten tools, the resources to ten,
and the allowlist to nine routes. Those documents remain accurate as
*historical records* and must not be rewritten, but no current-surface
operator runbook, release checklist, or client-installation guide exists. The
README quickstart is strong but documents only the MCP Inspector path; no
end-user MCP client (e.g. Claude Desktop, Claude Code, or a generic stdio
client) has a documented, safe configuration example, and no controlled
validation has ever exercised the documentation against a consumer MCP client.

**Risks and costs.** Lowest of any track: docs and metadata only, no runtime
diff, no key, no spend. The one real hazard is documentation drift toward a
live-execution recipe — launch docs must preserve the Phase 5A posture
(free-mode-first, exposure ≠ execution, no live paid call commands, eligibility
checklists rather than runbooks for paid execution). A secondary hazard is
overpromising in directory/marketplace metadata; metadata must carry the
thin-adapter, context-not-advice, credential-free-first framing.

**Verdict: recommended primary track (§5).**

### 3.B Additional local-stdio data capability (one bounded GET-only family)

**What it is.** Add one more tightly bounded, `GET`-only endpoint family to the
paid surface, continuing the proven gated-adapter cadence. The available
candidates are exactly the three routes Phase 5D deferred, each with recorded
reasons (PR #50 §4.C/§4.E/§4.H, §6) that a new design memo would have to
discharge:

- **`/v1/market/regime/forecast`** — deferred because its verified OpenAPI
  summary is literally "Forward-looking market regime forecast": the most
  advice-adjacent route in the market-context layer and the costliest market
  rule (`market_regime_forecast`, `0.35 STC`). Its parameter surface is small
  and bounded (`lookback` 2–13, default 5), so the mechanical risk is low; the
  deferral is purely for a dedicated forecast-framing design pass (API-authored
  forward-looking regime context, never an MCP prediction, signal, or advice).
- **`/v1/breadth/sector/history`** — deferred because its verified API `limit`
  default/max is **`200000`/`500000`** — the largest broad-sweep surface
  observed anywhere, orders of magnitude beyond any MCP cap. PR #50 §4.E
  recorded a design floor for any future inclusion: always-send `limit`
  (default ≤`100`, hard max ≤`500`), a mandatory bounded `start`+`end` window
  (≤26 weeks), `group_by_week` fixed `true`, and the API default never
  reachable.
- **`/v1/leadership/rotation/history`** — deferred for three verified contract
  facts: it has **no `limit` parameter at all** (row count bounded only by
  `top_k × weeks-in-range`), `top_k` is **nullable with omit-means-all
  semantics** (the exact sentinel/sweep pattern §16.3 forbids), and the default
  date window is **not determinable credential-free**. Safety would require a
  new date-window bounding control kind, designed and tested on its own. These
  facts must be re-verified at design time in case the contract has changed.

**Why it could be next.** It is the smallest delta from the five-times-proven
pattern, stays local stdio, and modestly deepens the market-context story.

**Why it should not be next.** Every candidate carries a recorded,
qualitatively real deferral reason — one advice-adjacency framing problem and
two new control-kind problems — so "one more family" is *not* a low-design
increment this time. More decisively: the launch objective's binding
constraint is discoverability and adoption, and an eleventh tool does not
move that constraint at all. Adding paid surface before launch readiness
increases operator/validation complexity (a new pricing family or promotion,
a new controlled live validation with real STC) without increasing discovery.

**Verdict: deferred secondary track — the natural data-capability follow-on
after Phase 5E, entered only through its own design/contract memo. No
implementation is approved by this memo.**

### 3.C Intelligence Agent artifact surface

**What it is.** Research/editorial/guidance artifact surfaces authored by the
Stock Trends Intelligence Agent — strategically important and possibly central
to Stock Trends' long-term differentiated value.

**Why it could be next.** Editorial/research artifacts are a product surface
generic data feeds cannot replicate, and the artifact envelope concepts
(provenance, content hashes, by-id canonicality) are already sketched in the
governing docs.

**Why it should not be next.** Two independent blockers. First,
**availability**: the free discovery/editorial-preview routes returned `503`
at the last credential-free checks (2026-07-07) and remain on the excluded
list in `src/resources/index.ts`; the paid guidance/research artifact surface
depends on Intelligence Agent artifact production that has not stabilized
(PR #49 §4.G). Building against an unstable pipeline burns launch time on a
surface that may change. Second, **authority-boundary weight**: artifacts are
natural-language, editorial-voiced content, so this track needs
artifact-specific design — an access policy, provenance-intact forwarding, and
rigorous no-advice framing — that deserves its own dedicated phase, not a slot
in the launch window.

**Verdict: not next. Deferred until the Intelligence Agent produces stable API
artifacts and the free surfaces re-verify healthy credential-free — unchanged
from PR #49.**

### 3.D Decision/portfolio POST endpoints

**What it is.** `POST /v1/decision/evaluate-symbol` (`0.5 STC`) and the
portfolio family (`POST /v1/portfolio/evaluate` `0.75 STC`, `/compare`
`1.25 STC`, `/construct` `1.0 STC`).

**Why it could be next.** PR #49 §7 sketched decision/evaluate-symbol as the
tentative Phase 5E, on the logic that decisions should land on top of the
context layer — which now exists.

**Why it should not be next.** These are the highest-risk available data
surfaces on three axes at once: **POST semantics** (the first body-bearing
paid routes, breaking §15.5's `GET`-only/no-request-body posture and requiring
an explicit security-model extension), **action-like evaluation** (a
decision-shaped output sits closest to the advice line and invites exactly the
siloed/autonomous usage the context thesis warns against), and
**advice-adjacent interpretation** (portfolio outputs read as allocation
guidance; portfolio inputs are user-supplied position lists with their own
logging-sensitivity and bounded-input requirements, SECURITY_MODEL §9). The
costs are also the highest observed (up to `1.25 STC` per call), raising
live-validation exposure. Doing this immediately after the local-stdio signoff
— and before the existing surface is launchable — would maximize new risk
while contributing nothing to the discoverability constraint. If any Phase 5E+
work touches this family early, it should be **design-only exploration** of
the body-bearing security-model extension, not implementation.

**Verdict: not next. Remains the leading later data-capability candidate
(after B or alongside a later selection), entered only through its own
security-model-extension design memo. §5 explicitly revises the PR #49 §7
sketch on this point.**

### 3.E Remote MCP / hosted MCP / x402 architecture

**What it is.** The hosted/remote transport and machine-payment architecture
track: HTTP/SSE/Streamable HTTP hosting, multi-tenant auth, x402/wallet
payment rails.

**Why it could be next.** Strategically important for agentic discovery at
scale — a hosted MCP is how most agent platforms would eventually reach the
server without local installation.

**Why it should not be next.** It is **explicitly not approved by Phase 5D**
(PR #54 §8) and explicitly deferred by SECURITY_MODEL §4/§12/§15.6. It
requires a separate architecture-first program: threat model, client
authentication/authorization, auth/payment model, tenancy model, distributed
rate limiting, server-side secret handling, abuse prevention (sweep/loop
detection at scale), audit/retention, incident response, and a deployment
model — none of which exists today, and none of which should be bolted onto
the subscription path. Rushing it directly after the local-stdio signoff is
the highest-risk move available. It should be **design-only before any
implementation**, as its own track — and launch/distribution readiness (A)
is genuinely useful *input* to it: directory metadata, install docs, and a
local validation baseline make the later remote architecture memo concrete
rather than speculative.

**Verdict: deferred secondary track — scheduled as a separate,
architecture-first, design-only sequence after Phase 5E; never an incremental
add-on. No implementation, and no design commitment, is made by this memo.**

### 3.F Operator/launch readiness plus discovery metadata (narrow variant of A)

**What it is.** A narrower reading of track A: local stdio release packaging
plus the public-facing documentation/metadata that helps human and agent
discovery, with no new runtime behavior.

**Assessment.** F is a strict subset of A as scoped in §3.A — A already
excludes new runtime behavior, new paid surface, and new routes, which is
F's entire distinguishing discipline. Selecting them separately would create
two names for one docs-only track.

**Verdict: subsumed into A.** The recommended track adopts F's discipline
(docs/metadata only, no runtime behavior) with A's full deliverable list; F is
neither deferred nor rejected but merged.

## 4. Comparative assessment

Scores use High/Med/Low relative to the Phase 5E decision. For the three
columns marked (↓), **lower is better**. "Readiness" means readiness to start
an immediate PR sequence without unresolved external dependencies.

| Track | Strategic value | User/acquisition value | Agentic discoverability | Complexity (↓) | Security risk (↓) | Live-validation cost/risk (↓) | Local-stdio alignment | Readiness | Rank |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **A. Launch/distribution readiness** | High (launch is the stated objective) | High (installability) | High (docs + directory metadata) | Low (docs/metadata only) | Low (no new surface) | None planned (credential-free docs check only) | Direct (packages exactly this scope) | High | **1** |
| B. One more bounded GET family | Med | Med | Low–Med (more tools ≠ more discovery) | Med (each candidate has a recorded hard problem) | Med (new promotion/mirror/controls) | Med (new live probes, real STC) | High | Med (new design memo required first) | 2 (deferred) |
| E. Remote MCP / x402 architecture | Very high (later) | High (later) | Very high (later) | Highest | Highest boundary (even design is heavy) | None as design-only; highest later | Out of scope by design | Med (design-only is possible) | 3 (deferred, design-only) |
| D. Decision/portfolio POST | High (later) | High (later) | Med (unsafe without context framing) | Med–High (first body-bearing routes) | High (advice-adjacent, action-like) | Med–High (highest per-call costs) | Strained (invites autonomous patterns) | Low (security-model extension must be designed first) | 4 |
| C. Intelligence Agent artifacts | High (later) | Med–High (later) | Med | High (artifact-specific design) | Med–High (authority boundary) | Unknown (pipeline unstable; free surfaces last `503`) | Med | Blocked (external dependency) | 5 |
| F. Narrow launch readiness | — | — | — | — | — | — | — | — | Subsumed into A |

**Tradeoffs in words.** A is the only track that addresses the binding
constraint (discoverability/adoption) at essentially zero new risk; its cost is
that it adds no new data capability for one phase. B adds capability but not
discovery, and this round's candidates are the three routes Phase 5D deferred
*for cause* — each needs genuine new design work, so B is not the cheap
increment it was in Phases 5B–5D. E is where the discoverability story
ultimately leads, but it is the largest possible boundary change, is
explicitly unapproved, and benefits from A's outputs; sequencing it
immediately after the local-stdio signoff would trade a proven surface's
launch for an unbounded design program. D inverts the context-before-decision
doctrine less than it did before Phase 5D (the context layer now exists), but
it remains the highest advice-adjacency and the first POST surface, and it
does nothing for adoption. C is blocked on an external dependency that the
launch objective explicitly refuses to wait for.

## 5. Recommended Phase 5E track

**Recommended Phase 5E track: A — MCP launch/distribution readiness**
(absorbing F), executed as the docs-only PR sequence in §6.

**Why it is next:**

- **Phase 5D completed the launch-quality surface; Phase 5E should launch
  it.** PR #49's own launch objective ("complete and launch the MCP as soon
  as possible") and its own definition of the launch-quality first surface
  (planning + market context + symbol context + universe context) are now
  satisfied in capability terms. The remaining gap between "signed off" and
  "launched" is documentation, packaging, and discovery metadata — exactly
  track A.
- **The strategic need is agentic discoverability and adoption.** Ten paid
  tools nobody can find or configure produce no adoption. Launch/distribution
  readiness improves usability and discovery **without expanding the
  auth-capable surface** — the highest-leverage move per unit of new risk
  available to this repository today.
- **Adding more paid endpoints first would raise complexity without raising
  discovery.** Every §3.B candidate carries a recorded deferral reason
  requiring real new design work; landing that before the existing surface is
  even installable inverts the priority order.
- **Remote MCP / x402 must not be rushed directly after the local-stdio
  signoff.** It remains explicitly unapproved, needs its own
  architecture-first design program (§3.E), and is better entered *after*
  launch readiness has produced accurate public metadata, install docs, and a
  local validation baseline for the architecture memo to build on.
- **The verifiable documentation gap makes this track concrete, not
  cosmetic.** The operator/release documentation still gates on the Phase 4
  three-tool surface (§3.A); no consumer-client install path is documented; no
  controlled validation has ever exercised the docs against a real end-user
  MCP client. These are auditable deliverables with clear completion criteria
  (§9).

**Why it is safer and higher-leverage than the alternatives:** it is the only
track with no new paid surface, no new routes, no live paid validation, no new
credential path, and no security-model change — while directly serving the
launch objective every prior memo has been building toward. Its worst-case
failure mode is unclear documentation; every alternative's worst-case failure
mode involves real spend, a new control gap, or an advice-boundary incident.

**Explicit revision of the PR #49 §7 sketch.** The Phase 5D roadmap sketched
"Phase 5E — decision/evaluate-symbol" as a later-subphase projection. That
sketch was directional, not an authorization: in this repository's cadence,
each phase begins with its own selection memo (PR #36, #43, #49 precedents),
and this document is that memo for Phase 5E. Re-evaluated against the launch
objective with the market-context layer now signed off, launch/distribution
readiness dominates decision/evaluate-symbol on risk, leverage, and the
discoverability constraint (§4). Nothing is cancelled: decision/
evaluate-symbol remains the leading later data-capability candidate, still
gated behind its own body-bearing security-model-extension design memo, and
the rest of the PR #49 later-subphase ordering (5F portfolio evaluate/compare,
5G construct-if-still-desired, artifacts-when-stable, remote-as-separate-track)
is unchanged in relative order — it simply follows the launch-readiness phase
instead of preceding it.

## 6. Proposed PR sequence

Docs-only throughout. Every PR requires Codex review before merge (the proven
Phase 4/5B/5C/5D gate). No PR in this sequence requires live paid validation,
an API key, remote MCP work, a new tool/resource/prompt, a new paid route, or
a `package.json`/`package-lock.json` change. Each PR is a separate, reviewable
step; this memo commits none of them.

| PR | Scope | Codex review checkpoint |
| --- | --- | --- |
| **PR #55** | Phase 5E next-capability selection memo (this document). Docs-only; one README documentation-index link. | Review this memo's §11 checklist. |
| **PR #56** | **Phase 5E launch/distribution readiness design memo.** Decides the exact deliverable set and shape: README install/quickstart structure for local stdio MCP clients; which clients get worked configuration examples (e.g. Claude Desktop, Claude Code, generic stdio client — placeholder-only, free-mode-first); operator smoke-test runbook scope for the current 1/10/10/0/9 surface; launch release checklist contents (superseding the Phase 5A three-tool-era checklist *for release use* while leaving historical docs untouched); marketplace/directory metadata fields and framing (thin-adapter, context-not-advice, credential-free-first); and the PR #59 validation scope (credential-free/no-spend only). Explicitly flags anything that would require `package.json`, packaging/registry publication, or runtime changes as **out of Phase 5E scope**, deferred to its own reviewed step. | Design boundaries: no runtime behavior, no live-execution recipes, no key, metadata accuracy. |
| **PR #57** | **README client-installation and local stdio configuration improvements.** The free-mode-first installation guide and the safe client configuration examples approved by PR #56, including the known config-parser facts operators need (e.g. only `true` is truthy for the paid flags; the execution variable's exact name). No change to the free-mode one-tool contract, the zero-prompt contract, or any count. | Secret safety (placeholders only), exposure ≠ execution preserved, no live paid commands. |
| **PR #58** | **Operator smoke-test runbook and launch release checklist** (plus the directory/marketplace metadata readiness document from PR #56's design). Runbook covers the current surface end-to-end without spend: default/free listing (1 tool / 10 resources / 0 prompts), credential-free resource reads, paid-exposed listing with placeholder key only, fail-closed execution-disabled checks, rollback, and the secret-safety scan — absorbing the open operator-shell hygiene step from PR #53 §11 / PR #54 §9 as a permanent checklist item. Release checklist records the tag/release-notes decision per the Phase 5A pattern. **No live-execution recipe; paid execution remains eligibility-checklist-only.** | No live-execution recipe introduced; counts correct; rollback and hygiene steps complete. |
| **PR #59** | **Controlled local client validation report (credential-free, no-spend).** Follows the merged docs as written against at least one real end-user local stdio MCP client: free-mode listing and resource readability with no key; paid-exposed listing with a **placeholder key only** (10 tools visible, execution disabled, fail-closed denial observed); rollback to the free surface. **Zero paid calls, zero real keys, zero STC — by design, not by budget.** Any future live paid validation would be a separately planned and separately authorized plan/report pair outside this sequence; none is proposed. | Confirm no spend, no real key, no live paid call; docs-vs-observed discrepancies recorded. |
| **PR #60** | **Phase 5E launch-readiness signoff.** Narrow, docs-only declaration that the launch/distribution documentation and metadata are ready **for the controlled local stdio scope only**, with explicit non-approvals preserved (no remote/hosted MCP, no autonomous/unattended/scheduled/bulk use, no deferred routes, no decision/portfolio, no artifacts, no x402/wallet/OAuth/Bearer/payment headers, no advice). Makes no claim about any future capability. | Signoff scope matches evidence; non-approvals complete; no boundary weakened. |

If PR #56's design finds that a specific deliverable (e.g. an actual registry
manifest file or npm packaging) cannot be delivered docs-only, that deliverable
is deferred to its own separately reviewed step — the Phase 5E sequence itself
stays docs-only.

## 7. Deferred tracks

**Deferred secondary tracks (recommended nearest-next, in order):**

1. **B — one additional bounded GET-only data capability.** The natural
   data-capability follow-on once the surface is launchable. Entry condition:
   its own design/contract memo that re-verifies the candidate contracts
   credential-free and discharges the recorded deferral reasons —
   forecast-framing design for `/v1/market/regime/forecast`, the §4.E
   bounded-window/tiny-cap floor for `/v1/breadth/sector/history`, or the new
   date-window bounding control for `/v1/leadership/rotation/history`. This
   memo approves no implementation and does not pre-select among the three.
2. **E — remote MCP / hosted MCP / x402 architecture, design-only.** The
   strategic discoverability endgame, entered as a separate architecture-first,
   design-only sequence (threat model, auth/payment model, tenancy, rate
   limiting, secret handling, abuse prevention, deployment model) after
   Phase 5E, using Phase 5E's metadata and validation baseline as input.
   Implementation remains explicitly unapproved.

**Why the remaining tracks are not next:**

- **C — Intelligence Agent artifacts:** blocked on external artifact-pipeline
  stability (free surfaces last returned `503` credential-free, 2026-07-07);
  requires artifact-specific access-policy/provenance/no-advice design that
  deserves its own phase. Deferred until artifacts are stable and the free
  surfaces re-verify healthy — unchanged from PR #49.
- **D — decision/portfolio POST endpoints:** first body-bearing paid routes
  (security-model extension to §15.5 required), action-like/advice-adjacent
  outputs, highest per-call costs, and no contribution to the adoption
  constraint. Remains the leading later data candidate; any early work should
  be design-only exploration of the body-bearing extension.
- **F — narrow launch readiness:** subsumed into the selected track A (§3.F);
  not separately deferred.

## 8. Security posture

Phase 5E preserves every existing constraint unchanged. Specifically, the
selected track and its §6 sequence:

- **Change no runtime behavior** — no `src/`, `tests/`, `package.json`, or
  `package-lock.json` change anywhere in PRs #55–#60.
- **Preserve the surface contract** — exactly 1 free tool, 10 paid-exposed
  tools, 10 public resources, 0 prompts, 9 auth-capable routes, before and
  after every PR in the sequence.
- **No remote/autonomous/bulk/deferred/advice approval** — remote MCP, hosted
  MCP, autonomous agent use, unattended/scheduled/CI/background use,
  bulk/sweep usage, the deferred routes, decision/portfolio endpoints,
  Intelligence Agent artifacts, and investment advice all remain unapproved
  and unchanged by Phase 5E.
- **No x402/wallet/OAuth/`Authorization: Bearer`/payment headers** — no
  payment rail of any kind appears in any Phase 5E document, example, or
  metadata; `X-API-Key`-only remains the sole credential path, and only where
  already promoted.
- **No route promotion** — the auth-capable allowlist is untouched; deferred
  routes stay denied `endpoint_not_allowlisted`.
- **No dynamic registration** — nothing is registered from `/v1/ai/tools` or
  `/v1/workflows`; discovery metadata is authored, reviewed, static content.
- **No new credential exposure** — launch docs are free-mode-first and
  placeholder-only; the PR #59 validation uses no real key and creates no
  spend; the exposure/execution split, mandatory preflight, default-deny caps,
  covering-budget requirement, single-fetch/no-retry rules, and
  repeated-identical-call gates are documented as-is, never weakened.
- **No live-execution runbook** — paid execution remains
  eligibility-checklist-only in operator docs (the Phase 5A posture); live
  paid runs remain one-off, operator-authorized, separately planned events.
- **Historical documents are records** — Phase 4/5A/5B/5C/5D documents are
  superseded for operational use by current-surface documents where needed,
  never rewritten.

## 9. Success criteria

Phase 5E is complete when all of the following are true:

1. **Install-from-README works credential-free:** a new operator can go from
   `git clone` to inspecting the default/free surface (1 tool, 10 resources,
   0 prompts) using only the merged documentation, with no API key and no
   spend.
2. **Safe client configuration examples exist** for the client set PR #56
   selects (at least two named local stdio MCP clients plus a generic
   template), placeholder-only, free-mode-first, with the paid
   exposure-vs-execution distinction stated wherever paid config appears.
3. **A current-surface operator smoke-test runbook exists** covering the
   1/10/10/0/9 surface with fail-closed checks, rollback, the secret-safety
   scan, and the operator-shell hygiene step — and containing no live paid
   execution recipe.
4. **A launch release checklist exists** that reflects the current surface
   counts and supersedes the Phase 5A three-tool-era checklist for release
   use, recording the tag/release-notes decision.
5. **Directory/marketplace metadata is drafted and reviewed** with accurate
   counts and thin-adapter, context-not-advice, credential-free-first framing
   (publication itself, if it requires non-docs changes, is explicitly a
   separate later step).
6. **The PR #59 controlled local client validation passed** — the docs were
   followed as written against a real local stdio MCP client, credential-free,
   with zero paid calls, zero real keys, and zero STC, and any doc/observation
   mismatches were fixed or recorded.
7. **The PR #60 launch-readiness signoff is merged** with its explicit
   non-approvals, after Codex review.
8. **The surface contract is unchanged** — 1 free tool, 10 paid-exposed tools,
   10 public resources, 0 prompts, 9 auth-capable routes; `src/`, `tests/`,
   `package.json`, and `package-lock.json` untouched across the entire
   sequence.
9. **Codex review completed on every PR** in the sequence.

## 10. Non-goals

Phase 5E, as selected here, explicitly does **not** include:

- **No implementation of any new MCP tool, resource, or prompt** — the counts
  are frozen for the phase.
- **No new paid routes and no allowlist promotion** — the nine-route
  allowlist is unchanged; deferred routes stay denied.
- **No pricing-mirror changes** and no pricing/catalog behavior changes.
- **No `src/`, `tests/`, `package.json`, or `package-lock.json` changes.**
- **No npm publication, registry publication, or packaging/deployment
  changes** — readiness is assessed and documented; any actual
  packaging/publication step is a separate, later, reviewed decision.
- **No live paid validation** — the Phase 5E sequence plans zero paid calls;
  any future live paid validation is a separately planned, separately
  authorized plan/report pair outside this phase.
- **No API keys** — no key is used, requested, inspected, printed, logged, or
  stored anywhere in the sequence; placeholders only.
- **No MCP Inspector requirement** — PR #59 targets a real end-user client;
  Inspector remains documented as an option, not re-run as a gate.
- **No remote MCP / hosted MCP** — no transport work of any kind.
- **No x402 / wallet / OAuth / `Authorization: Bearer` / payment-header
  behavior.**
- **No decision/portfolio endpoints, no Intelligence Agent artifact
  endpoints, no `selections/history`, no `selections/published/*`, no
  regime-forecast/breadth-history/rotation-history work** — all remain
  deferred behind their own future memos.
- **No autonomous, unattended, scheduled, CI, background, or bulk usage** —
  and no documentation that normalizes any of them.
- **No investment advice** — no buy/sell/hold/allocation/risk/suitability
  output, and launch metadata must carry the context-not-advice framing.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No production-readiness claim in this memo** — for Phase 5E or anything
  else; PR #60 is the only document in the sequence that may declare
  launch-readiness, for the controlled local stdio scope only, after review.
- **No rewriting of historical phase documents** — supersede for current use;
  never alter the record.

## 11. Codex review checklist (for this memo)

Codex review of PR #55 should verify:

1. **Surface facts:** the §2 counts (1 free tool / 10 paid-exposed tools /
   10 public resources / 0 prompts / 9 auth-capable routes) match the source
   at HEAD `8869fa7` (`src/paidPolicy.ts`, `src/resources/index.ts`,
   `src/server.ts`, `src/tools/`) and the merged PR #54 signoff §4.
2. **Authority boundary:** the §2 boundary statement matches ADR-002 /
   README / PR #49 §8 exactly, and nothing in the memo weakens it.
3. **Docs-only posture:** the PR changes only this document and one README
   documentation-index link; no `src/`, `tests/`, `package.json`,
   `package-lock.json`, script, runtime-artifact, log, or output-file change.
4. **No forbidden actions performed:** no live endpoint call (paid or
   credential-free), no API key used/requested/inspected/printed/logged/
   stored, no MCP Inspector session, no paid validation, no route promotion,
   no pricing-mirror change — and the memo states its facts come from merged
   documents and read-only source inspection, not fresh API checks.
5. **Fair candidate evaluation:** the §3 track assessments accurately reflect
   the recorded evidence — in particular the PR #50 deferral reasons for the
   three §3.B candidates (§4.C/§4.E/§4.H), the PR #49 §4.G artifact-stability
   record for §3.C, and the PR #54 §8 non-approvals for §3.D/§3.E.
6. **Roadmap revision is explicit and non-destructive:** the §5 revision of
   the PR #49 §7 sketch (Phase 5E = decision/evaluate-symbol → Phase 5E =
   launch/distribution readiness) is clearly stated, justified against the
   launch objective, and cancels nothing — the decision family remains a
   deferred candidate with its security-model-extension precondition intact.
7. **Exactly one primary track** is recommended (A, absorbing F), with one or
   two secondary deferrals (B, E) and explicit not-next reasoning for the
   rest.
8. **The proposed sequence is safe:** PRs #56–#60 are docs-only, require no
   key, no live paid call, no new tools/resources/prompts/routes/promotions,
   and no package/deployment changes; PR #59 is specified as
   credential-free/no-spend with placeholder-key-only exposure checks; paid
   execution remains eligibility-checklist-only in all proposed docs.
9. **Security posture completeness:** §8 preserves every existing constraint
   (remote/autonomous/bulk/deferred/advice non-approvals, no x402/wallet/
   OAuth/Bearer/payment headers, no route promotion, no dynamic registration)
   with no weakening or reinterpretation.
10. **No production-readiness claim** is made anywhere in the memo, and no
    implementation commitment beyond the memo exists.
11. **Secret safety:** no key-shaped string, no populated auth-header value,
    and no realistic-looking credential appears anywhere in the diff;
    placeholders only.
12. **README change:** exactly one documentation-index link was added, in the
    existing list style, with no other README modification.

## 12. Final recommendation

**Select track A — MCP launch/distribution readiness (absorbing track F) — as
the single primary Phase 5E track**, executed as the docs-only PR sequence
#56–#60 (design memo → README/client-install docs → operator runbook +
release checklist + directory metadata → credential-free local client
validation report → narrow launch-readiness signoff), each PR Codex-reviewed.

**Defer** track B (one bounded GET-only data family — forecast, breadth
history, or rotation history, each behind its recorded deferral reasons and a
fresh design/contract memo) and track E (remote MCP / hosted MCP / x402 — a
separate architecture-first, design-only sequence) as the recommended
follow-on tracks after Phase 5E. **Do not schedule next** track C
(Intelligence Agent artifacts — blocked on pipeline stability) or track D
(decision/portfolio POST — first body-bearing routes, highest
advice-adjacency, requires a security-model extension); this explicitly
revises the PR #49 §7 sketch that had penciled decision/evaluate-symbol in as
Phase 5E, without cancelling that family as a later candidate.

This memo authorizes no implementation, performs and authorizes no live call
or paid validation, uses no API key, changes no runtime behavior, and makes no
production-readiness claim for Phase 5E or any future capability. The next
step, if this memo is approved, is PR #56 — the Phase 5E launch/distribution
readiness design memo — as a separate, Codex-reviewed, docs-only step.
