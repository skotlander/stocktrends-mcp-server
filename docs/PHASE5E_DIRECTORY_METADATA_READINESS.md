# Phase 5E Directory/Marketplace Metadata Readiness

Date: 2026-07-12

Status: **Documentation / metadata-readiness only (PR #58). No submission is
performed.** This document prepares reviewed, reusable *content* for a
possible future MCP directory/marketplace/registry listing of this server,
per the Phase 5E launch/distribution readiness design memo §8. It is a
readiness document only: **no directory, marketplace, or registry submission
is performed; no manifest file is created; no `package.json` field is
changed; no package or registry publication occurs or is approved.** Any
actual submission, manifest artifact, package-metadata change, or publication
is a separate, later, individually reviewed step (§11).

The PR that creates this document performs no live endpoint call of any kind
(paid or credential-free), uses no API key (none is used, requested,
inspected, printed, logged, or stored), runs no MCP Inspector session, and
performs no paid validation. Every fact below comes from the merged
Phase 4–5E document set and read-only inspection of the source tree.

This document builds on and does not supersede:

- [`PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md`](PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md)
  (PR #56) — the §8 metadata design (M1–M10) this document implements.
- [`PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md)
  (PR #54) — the controlled-local-stdio-only scope and §8 non-approvals every
  metadata field below must preserve.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — the posture the §8 safety notes
  summarize.
- [`README.md`](../README.md) — the canonical install path and the free/paid
  contract the descriptions below mirror.

## 1. Status and scope

- **Readiness content only.** The descriptions, capability block, and
  inventories below are reviewed content a future submission may reuse —
  after re-verification (§10/§11). Nothing is published by this document.
- **No submission** to any directory, marketplace, or registry is performed.
- **No manifest** file, registry artifact, or listing entry is created.
- **No package change** — `package.json` and `package-lock.json` are
  untouched; no npm publication occurs or is approved.
- **No remote MCP claim.** The server is local-stdio-only; nothing below
  states or implies a hosted or remote endpoint, and no future listing may
  either (§9).
- **Counts drift-guarded.** Every count below reflects the 1/10/10/0/9
  surface at the time of writing; §10/§11 require re-verification against the
  then-current README and source before any actual submission.

## 2. Identity

Only facts the repository already records; this document invents nothing.

- **Server name:** `stocktrends-mcp-server` (the `name` in `package.json`
  and the `SERVER_NAME` constant in `src/server.ts`).
- **Repository URL:** `https://github.com/skotlander/stocktrends-mcp-server`
  (the checkout's `origin` remote at the time of writing; re-verify at
  submission time per §11).
- **Maintainer / contact:** the repository's controlled validation reports
  record the operator/maintainer as Skot Kortje / Stock Trends
  (`skortje@stocktrends.com`) — see the Phase 5D controlled validation
  report. No other contact is asserted.
- **License:** **MIT.** `package.json` carries `"license": "MIT"`, and a
  canonical MIT `LICENSE` artifact exists at the repository root, with
  copyright holder "Stocktrends Publications" (2026). This resolves the
  license inconsistency this section previously disclaimed; see the
  [Package Identity and License Decision Record](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md)
  for the full decision record. A future submission must still re-verify
  this status against the then-current `package.json` and `LICENSE` before
  reuse (§11).

## 3. Short human-readable description

Reviewed short description (one to two sentences) for listing use:

> Local stdio MCP server for the Stock Trends API: credential-free public
> market-methodology resources and a free planning tool by default, with
> strictly gated optional paid tools for ST-IM, weekly indicators, the base
> selection universe, and weekly market context. Forwards published API data
> verbatim — market context, not investment advice.

## 4. Long human-readable description

Reviewed long description (one paragraph) for listing use:

> `stocktrends-mcp-server` is a thin local adapter over the front-facing
> Stock Trends API. Authority flows in one direction only — Stock Trends
> dataset → Stock Trends API → published Stock Trends API
> responses/artifacts → MCP adapter → external MCP clients/agents — and the
> adapter performs no recomputation, no ranking, no forecasting, and no
> advice: the API authors every output and the adapter forwards it verbatim.
> It is credential-free-first: the default mode requires no API key, exposes
> exactly one free planning tool and ten public market-methodology resources,
> registers zero prompts, and cannot spend. Paid tool *exposure* (making
> paid tool definitions visible) and paid *execution* (an actual authorized,
> billable call) are two separate gates: exposure requires an explicit flag
> plus a configured key, and execution additionally requires a distinct
> runtime flag, a mandatory pricing preflight, explicit nonzero call caps,
> and a covering budget — otherwise every paid invocation fails closed with
> no request and no auth header. The server runs over local stdio only, for
> controlled, operator-supervised use; it is not a hosted or remote service.

## 5. Machine/agent-readable capability block

Reviewed capability block for listing use. Counts must be re-verified against
the then-current README and source before any submission (§10/§11). Pricing
amounts are deliberately absent: pricing is STC-denominated and resolved at
call time through the credential-free `/v1/pricing/catalog` reconciliation —
the catalog is authoritative, so this metadata embeds no amounts that could
drift.

```json
{
  "name": "stocktrends-mcp-server",
  "transport": "stdio",
  "remote": false,
  "hosted": false,
  "prompts": 0,
  "tools_default": 1,
  "tools_paid_exposed": 10,
  "resources": 10,
  "auth": "X-API-Key (optional; paid exposure only; never for resources)",
  "payment_rails": "x402 challenge-validation-only, default-off; no proof forwarding, payment, settlement, paid output, or spend; no wallet; no OAuth; no Bearer",
  "investment_advice": false,
  "autonomous_use_approved": false,
  "install": "git clone + npm install + npm run build (repository checkout, primary); or a locally built/validated npm package artifact (local .tgz, not registry-published) — see README",
  "paid_execution": "controlled local operator only; disabled by default",
  "surface_counts": {
    "tools_default": 1,
    "tools_paid_exposed": 10,
    "public_resources": 10,
    "prompts": 0,
    "auth_capable_paid_routes": 9
  }
}
```

## 6. Authority boundary

The controlling authority chain, reproduced exactly:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

The adapter performs **no recomputation** of any kind — no local regime,
breadth, leadership, indicator, ST-IM, or selection calculation, no ranking,
no thresholding, no forecasting, no summarization — and **forwards the
published API payload verbatim** (`api_data` preserved exactly as returned,
with provenance metadata alongside). Any listing text must preserve this
framing.

## 7. Surface inventory

**Public resources — exactly 10, credential-free in every mode,
fetch-on-request, never keyed:**

1. `stocktrends://api/openapi`
2. `stocktrends://ai/context`
3. `stocktrends://ai/tools`
4. `stocktrends://workflows`
5. `stocktrends://methodology/stim`
6. `stocktrends://methodology/indicators`
7. `stocktrends://methodology/inference`
8. `stocktrends://pricing/catalog`
9. `stocktrends://proof/market-edge`
10. `stocktrends://leadership/definitions`

**Free/default tool — exactly 1:** `stocktrends_estimate_workflow_cost`, the
credential-free workflow cost-estimate planning tool (always present in every
mode).

**Paid tool families — nine paid tool definitions, visible only in
paid-exposed mode (total tools then exactly 10):**

- **ST-IM latest/history** (`stocktrends_get_stim_latest`,
  `stocktrends_get_stim_history`) — symbol-keyed ST-IM values, forwarded
  verbatim; symbol context, not a rating to act on.
- **Indicators latest/history** (`stocktrends_get_indicators_latest`,
  `stocktrends_get_indicators_history`) — weekly indicator rows behind a
  credential-free instrument resolver; indicator context, not signals.
- **Selections latest** (`stocktrends_get_selections_latest`) — the base
  ST-IM selection universe (not the published STIM Select list, which is a
  separate, non-promoted endpoint); universe context, not picks.
- **Market regime latest/history** (`stocktrends_get_market_regime_latest`,
  `stocktrends_get_market_regime_history`) — API-authored regime labels;
  market context, not a trading recommendation.
- **Breadth sector latest** (`stocktrends_get_breadth_sector_latest`) —
  sector participation rows; participation context, not confirmation signals
  to act on.
- **Leadership summary latest**
  (`stocktrends_get_leadership_summary_latest`) — API-ranked leadership
  tables (interpreted via the credential-free
  `stocktrends://leadership/definitions` resource); rotation context, not
  picks.

**Pricing:** deliberately **not** stated here. Paid calls are STC-denominated
and every execution requires a family-scoped, fail-closed reconciliation of
the server's static mirrors against the credential-free live
`/v1/pricing/catalog` metadata — **the catalog is authoritative**. No listing
may embed hardcoded prices (§9).

## 8. Safety notes

Reviewed safety framing for listing use:

- **Placeholders only.** Documentation and examples use the literal
  placeholder `<your-api-key>`; no real credential ever appears in the
  repository, its docs, or any listing content.
- **Free mode requires no key.** The default surface (1 tool, 10 resources,
  0 prompts) is fully functional credential-free and cannot spend.
- **Exposure is not execution.** Making the nine paid tool definitions
  visible (flag + key) never sends a request or spends; execution is a
  separate gate.
- **Execution fails closed** behind the distinct
  `STOCKTRENDS_ENABLE_PAID_EXECUTION` flag, a mandatory family-scoped pricing
  preflight/catalog reconciliation, explicit nonzero call caps, and a
  covering budget cap — any missing gate denies with no request and no auth
  header.
- **Single fetch, no retries.** Exactly one `GET` per authorized invocation;
  no automatic retry, pagination, sweeping, or bulk assembly.
- **Repeated-identical-call gates.** Repeated identical paid calls within a
  session fail closed rather than silently re-billing.
- **Context, not advice.** Every paid output is API-authored market context
  forwarded verbatim; the server produces no
  buy/sell/hold/allocation/risk/suitability output.

## 9. Non-approvals and forbidden claims

The PR #54 §8 non-approvals stand unchanged: this server is approved for
**controlled local stdio operator use only** — no remote MCP, no hosted MCP,
no autonomous agent use, no unattended/scheduled/CI/background/bulk use, no
deferred routes (`/v1/market/regime/forecast`, `/v1/breadth/sector/history`,
`/v1/leadership/rotation/history`), no decision/portfolio endpoints, no
Intelligence Agent artifact endpoints, no
x402/wallet/OAuth/`Authorization: Bearer`/payment-header behavior, and no
investment advice.

Accordingly, no listing, description, tag, or metadata field derived from
this document may ever claim:

- **"autonomous-agent-ready"**, agent-autonomy fitness, or any framing that
  invites unsupervised paid use;
- **"set-and-forget"**, background, scheduled, or unattended operation;
- **remote or hosted availability** — no URL endpoint, no SSE/HTTP transport,
  no multi-user service;
- **x402 or any payment-rail support** — no wallet, no machine payments;
- **OAuth or `Authorization: Bearer` support** — the only credential is an
  optional `X-API-Key`, and only for promoted paid routes;
- **trading signals** — no output is a signal, alert, or trigger;
- **buy/sell/hold, allocation, risk, or suitability advice** of any kind;
- **performance or returns** claims — no backtest, track-record, or
  profitability language;
- **uptime or SLA promises** — a local stdio process has none to offer;
- **endorsement by any client vendor** (Anthropic, Claude Desktop, Claude
  Code, or any other MCP client maker);
- **tools, resources, prompts, or endpoints that do not exist** on the §5/§7
  surface — counts and names must match the shipped surface exactly;
- **hardcoded prices** — pricing statements defer to the authoritative
  catalog;
- **npm/registry publication or packaged availability** — unless and until an
  actual, separately reviewed publication step has occurred.

## 10. Installation and documentation references

- **Canonical install path:** the repository
  [`README.md`](../README.md) — `git clone` + `npm install` +
  `npm run build`, then a local stdio client configuration per the README's
  "Connect a local stdio MCP client" section (Claude Desktop, Claude Code
  free-mode, or the generic stdio template). This remains the primary
  supported install channel.
- **Local package-artifact install path:** a second, distinct install path —
  installing from a locally built and validated npm package artifact (a
  local `.tgz`) — has since been validated cross-platform; see the README's
  [Local Package Artifact Installation](../README.md#local-package-artifact-installation-validated-not-published)
  section and the
  [Cross-Platform Package Install / Stdio Validation Report](CROSS_PLATFORM_PACKAGE_INSTALL_STDIO_VALIDATION_REPORT.md).
  **This is not a registry install and not registry publication** — no
  `npm install stocktrends-mcp-server` by name is possible; the consumer
  must possess or build the reviewed local artifact themselves. There is no
  npm registry publication and no hosted endpoint.
- **Security model:** [`SECURITY_MODEL.md`](SECURITY_MODEL.md).
- **Operator smoke-test runbook (current surface, no-spend):**
  [`PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md`](PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md).
- **Release checklist:**
  [`PHASE5E_LAUNCH_RELEASE_CHECKLIST.md`](PHASE5E_LAUNCH_RELEASE_CHECKLIST.md).
- **Launch-readiness signoff:**
  [`PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md`](PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md)
  — merged (PR #60); see also its dated addendum recording the subsequent
  package-artifact validation (PR #90) and this documentation refresh
  (PR-5).

**Drift note:** any future submission must re-verify every count, name, URI,
and reference in this document against the then-current README and source —
this document records the surface at its own HEAD, and the repository's phase
cadence may move the surface later.

## 11. Future submission checklist

Any actual directory/marketplace/registry submission is its own separately
reviewed step. Before performing one:

- [ ] **Re-verify counts** — tools (default and paid-exposed), resources,
  prompts, and auth-capable routes against the then-current source and
  README; update §5/§7 content if the surface moved.
- [ ] **Re-verify the README install path** — the documented
  `git clone` + `npm install` + `npm run build` + client-configuration flow
  still works as written (a runbook or PR #59-style execution at the
  submission HEAD).
- [ ] **Re-run the secret-safety scan** over every artifact to be submitted
  (Phase 5A §6 terms plus the runbook S8 additions) — placeholders only, no
  findings.
- [ ] **Confirm no hardcoded prices** anywhere in the submitted content — the
  pricing catalog remains authoritative.
- [ ] **Confirm the §9 non-claims** — the submitted content contains none of
  the forbidden claims, and the §2 identity facts (including a resolved
  license status) are current and accurate.
- [ ] **Open a separate reviewed PR** for the submission itself and for any
  manifest file, `package.json` metadata change, or package/registry
  publication it requires — none of those is created or approved by this
  document.

---

**Reminder:** This document is metadata readiness only. It performs no
submission, creates no manifest, changes no package metadata, publishes
nothing, performs no live call, uses no API key, and approves nothing beyond
the reviewed content above — which itself grants no scope beyond controlled
local stdio operator use.
