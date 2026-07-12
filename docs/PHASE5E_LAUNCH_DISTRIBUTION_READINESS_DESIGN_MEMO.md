# Phase 5E Launch/Distribution Readiness Design Memo

Design date: 2026-07-12

Status: **Design memo only (PR #56). Documentation-only.** This memo executes
the track selected by the merged Phase 5E next-capability selection memo
(PR #55): it designs the remaining docs-only launch/distribution readiness
sequence (PRs #57–#60) for the already signed-off controlled local stdio MCP
surface. It authorizes **no implementation**. No `src/` change, no `tests/`
change, no `package.json` / `package-lock.json` change, no MCP tool added, no
MCP resource added, no MCP prompt added, no auth-capable allowlist promotion,
no pricing-mirror change, no route promotion, no dynamic registration, no live
endpoint call of any kind (paid or credential-free), no paid validation, no
MCP Inspector session, and no API key used, requested, inspected, printed,
logged, or stored is performed or authorized by this memo. The only non-`docs/`
change is one documentation-index link in `README.md`, which changes no runtime
behavior.

Like the PR #55 memo, this memo performed **no network request at all** — not
even a credential-free metadata read. Every fact below is drawn from the merged
Phase 4–5E document set and a read-only inspection of the source tree at HEAD
`97f1f07` (`Add Phase 5E next capability selection memo (#55)`).

This memo makes **no production-readiness claim** and **no launch-readiness
claim**. Launch readiness may be declared only by PR #60, after the PR #57–#59
evidence exists and is Codex-reviewed. This memo also makes **no implementation
commitment beyond itself**: each of PRs #57–#60 is a separate, individually
Codex-reviewed step that review may revise or stop.

This memo builds on and does not supersede:

- [`PHASE5E_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5E_NEXT_CAPABILITY_SELECTION_MEMO.md)
  (PR #55) — the selection of track A (launch/distribution readiness) and the
  §6 PR sequence this memo now designs in detail.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — §2 (secret handling), §5/§7/§8
  (paid-call safety, runaway-loop and broad-sweep controls, rate/spend
  control), §11 (local stdio risks), §15–§17 (the paid ST-IM, indicators,
  selections, and market-context execution models and the nine-route
  auth-capable allowlist).
- [`PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md)
  (PR #54) — the controlled-local-stdio-only scope, the §8 non-approvals this
  sequence must preserve verbatim, and the §9 operator requirements (including
  the parent-shell hygiene item absorbed by §7 below).
- [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
  (PR #53) — the current-surface observation baseline (counts, startup
  warnings, fail-closed denial shapes, rollback evidence) that the PR #58
  runbook and PR #59 validation reuse without spend.
- [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  and
  [`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)
  — the Phase 4-era operator documentation whose release checklist and
  three-tool-era counts PR #58 supersedes *for current release use* while
  leaving the historical documents untouched.
- [`PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md)
  and
  [`PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
  — the narrow-signoff pattern PR #60 will extend.
- [`README.md`](../README.md) — the free/paid mode contract, quickstart,
  secret-safety rules, and environment-variable table that PR #57 builds on.

## 1. Status

- **Docs-only design memo.** This PR creates this document and one README
  documentation-index link; nothing else changes.
- **No implementation** — no code, no tool/resource/prompt registration, no
  allowlist promotion, no pricing-mirror change, no runtime behavior change.
- **No live validation** — no endpoint of any kind is called by this memo,
  paid or credential-free.
- **No API key** — none is used, requested, inspected, printed, logged, or
  stored; only the literal placeholder `<your-api-key>` appears in this
  document.
- **No paid calls** — no spend or usage of any kind is created.
- **No MCP Inspector** session is run.
- **No production-readiness or launch-readiness claim** — readiness is decided
  only by PR #60 on the PR #57–#59 evidence, after Codex review.
- **Surface facts verified read-only** at HEAD `97f1f07` against
  `src/server.ts`, `src/config.ts`, `src/tools/index.ts`, `src/paidPolicy.ts`,
  `src/paidPricing.ts`, `src/resources/index.ts`,
  `src/tools/marketContextTools.ts`, and `src/tools/selectionsTools.ts`, and
  against the merged PR #54 signoff §4.

## 2. Design objective

**Make the signed-off controlled local stdio MCP surface launchable and
discoverable without expanding risk.** After PR #54, the capability gap is
closed; the adoption gap is not. A new user or agent platform cannot today go
from the public repository to a working local free-mode MCP client
configuration without reading the phase trail, no end-user MCP client has a
documented configuration example, the operator/release documentation still
gates on Phase 4-era counts, and no reviewed directory/marketplace description
of the server exists.

Phase 5E closes exactly that gap with documentation and metadata only:

1. **PR #57** makes the README a complete, safe, free-mode-first installation
   and client-configuration guide.
2. **PR #58** gives operators a current-surface (1/10/10/0/9), no-spend
   smoke-test runbook, a launch release checklist that supersedes the Phase 5A
   three-tool-era checklist for release use, and reviewed directory/marketplace
   metadata content.
3. **PR #59** proves the documentation works by following it as written
   against a real end-user local stdio MCP client — credential-free, zero paid
   calls, zero real keys, zero STC.
4. **PR #60** narrowly declares the launch/distribution documentation and
   metadata ready for the controlled local stdio operator scope only.

Every deliverable preserves the Phase 5D safety boundaries unchanged (§11).

## 3. Current surface and constraints

The controlling authority boundary is unchanged and controls every deliverable
below:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

Surface contract, confirmed from the merged PR #54 signoff §4 and re-confirmed
read-only against the source at HEAD `97f1f07`:

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
  fetch-on-request: `stocktrends://api/openapi`, `stocktrends://ai/context`,
  `stocktrends://ai/tools`, `stocktrends://workflows`,
  `stocktrends://methodology/stim`, `stocktrends://methodology/indicators`,
  `stocktrends://methodology/inference`, `stocktrends://pricing/catalog`,
  `stocktrends://proof/market-edge`, `stocktrends://leadership/definitions`.
- **MCP prompts: exactly 0 in every mode.**
- **Auth-capable paid allowlist: exactly 9 routes**
  (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`): `/v1/stim/latest`,
  `/v1/stim/history`, `/v1/indicators/latest`, `/v1/indicators/history`,
  `/v1/selections/latest`, `/v1/market/regime/latest`,
  `/v1/market/regime/history`, `/v1/breadth/sector/latest`,
  `/v1/leadership/summary/latest`. Every other route is denied
  `endpoint_not_allowlisted` before any auth header or fetch.
- **Phase 5D production readiness is limited to controlled local stdio
  operator use only** (PR #54 §2): manual, operator-initiated,
  operator-supervised runs over local stdio, under the exposure/execution
  split, mandatory family-scoped pricing preflight, default-deny caps,
  covering STC budget, single-fetch/no-retry rules, and the
  repeated-identical-call loop gates.
- **Explicitly NOT approved** (PR #54 §8), unchanged by every Phase 5E PR:
  remote MCP, hosted MCP, autonomous agent use, unattended/scheduled/bulk use,
  the deferred routes (`/v1/market/regime/forecast`,
  `/v1/breadth/sector/history`, `/v1/leadership/rotation/history`),
  decision/portfolio endpoints, Intelligence Agent artifact endpoints,
  x402/wallet/OAuth/`Authorization: Bearer`/payment-header behavior, and
  investment advice.

Two operational facts recorded by the merged evidence chain shape this design:

- **The config parser is strict** (`src/config.ts`): for
  `STOCKTRENDS_ENABLE_PAID_TOOLS` and `STOCKTRENDS_ENABLE_PAID_EXECUTION`,
  only the literal `true` enables; `false`, `0`, `no`, and `off` disable; any
  other value — including `1`, `yes`, and `on` — fails server startup with
  `invalid_config`. The execution variable's exact name is
  `STOCKTRENDS_ENABLE_PAID_EXECUTION` (`STOCKTRENDS_ALLOW_PAID_EXECUTION` does
  not exist). PR #57 must state these facts wherever paid configuration is
  shown.
- **One operator-side hygiene item remains open outside the repository**: the
  PR #53 report §11 / PR #54 signoff §9 parent-shell cleanup (unsetting
  pre-provisioned `STOCKTRENDS_*` variables from the operator's shell). §7
  absorbs it into the PR #58 runbook as a permanent precondition step, so the
  launch documentation carries it forever.

## 4. Deliverables by PR

Docs-only throughout. Every PR requires Codex review before merge. No PR in
this sequence requires an API key, a live paid call, MCP Inspector, a new
tool/resource/prompt/route/promotion, or a `package.json` /
`package-lock.json` change.

| PR | Deliverable | Files changed | Codex review checkpoint |
| --- | --- | --- | --- |
| **#56** | This design memo. | `docs/PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md` + one README documentation-index link. | §13 checklist. |
| **#57** | README client-installation and local stdio configuration improvements: the §5 requirements and the §6 client example set. | `README.md` only (no new doc file; installation guidance stays in one place). | Secret safety (placeholders only), free-mode-first ordering, exposure ≠ execution beside every key placeholder, exact env names and parser facts, no live paid recipes, no remote MCP, counts unchanged. |
| **#58** | Operator smoke-test runbook (§7.1), launch release checklist (§7.2), and directory/marketplace metadata readiness document (§8). | `docs/PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md`, `docs/PHASE5E_LAUNCH_RELEASE_CHECKLIST.md`, `docs/PHASE5E_DIRECTORY_METADATA_READINESS.md` + three README documentation-index links. | Runbook is no-spend with correct current counts and a fail-closed stop rule; checklist supersedes Phase 5A §5 for release use without editing historical docs; metadata carries accurate counts and the §8 non-claims. |
| **#59** | Controlled local client validation report (credential-free, no-spend), per the §9 design. | `docs/PHASE5E_CONTROLLED_LOCAL_CLIENT_VALIDATION_REPORT.md` + one README documentation-index link. | Zero paid calls, zero real keys, zero STC confirmed; a real end-user client was the primary evidence; docs-vs-observed mismatches recorded with dispositions. |
| **#60** | Phase 5E launch-readiness signoff, per the §10 design. | `docs/PHASE5E_LAUNCH_READINESS_SIGNOFF.md` + one README documentation-index link. | Signoff scope matches the PR #56–#59 evidence; the §10.3 non-approvals are complete; no boundary weakened; no publication approval implied. |

Sequencing and scope rules:

- **Order is #57 → #58 → #59 → #60.** PR #59 validates the merged #57/#58
  documents as written, so they must land first. If PR #59 records doc
  defects, they are fixed by a small follow-up docs PR (or accepted with
  rationale) before PR #60.
- **No separate validation-plan PR exists for PR #59, by design.** The
  Phase 5B/5C/5D plan→report pairs existed because those validations spent
  real STC under an exact operator authorization phrase. PR #59 spends
  nothing, uses no real key, and needs no authorization phrase (the
  exact-phrase doctrine governs live paid execution only); its procedure is
  fully specified by §9 of this memo plus the PR #58 runbook. Any future
  *live paid* validation of the launch docs would be a separately planned,
  separately authorized plan/report pair outside Phase 5E; none is proposed.
- **Packaging and publication artifacts are out of Phase 5E scope.** Anything
  that cannot be delivered as `docs/` content plus README text — an npm
  publication, a `package.json` field change, a registry/marketplace manifest
  file, a one-click installer bundle, or an actual directory submission — is
  explicitly deferred to its own separately reviewed step. PR #58's metadata
  document prepares reviewed *content* for such a step; it performs no
  submission.

## 5. README / client documentation design (PR #57)

### 5.1 Current README gaps

Concrete, auditable gaps in the README at HEAD `97f1f07`:

- **G1 — No end-user client configuration exists.** The only documented way to
  connect anything to the server is MCP Inspector. Claude Desktop, Claude
  Code, and generic stdio clients have no worked configuration example
  anywhere in the repository.
- **G2 — POSIX-only examples.** The README's paid-exposure example uses
  `export`; PowerShell equivalents exist only inside the Phase 5A runbook.
  Windows users get no `$env:` syntax, no `Remove-Item Env:` cleanup, no
  guidance on Windows paths inside JSON client configs (backslash escaping or
  forward slashes), and no config-file location note.
- **G3 — Stale phase lead-in.** The *Current Status* section opens with
  "Phase 4 implements…" although it correctly describes the ten-tool surface.
  A minor accuracy fix is in scope for PR #57 provided no count or contract
  statement changes.
- **G4 — No orientation for new users.** The Documentation list is a flat
  40-entry phase history with no "start here" signpost. PR #57 may add a
  one-or-two-line pointer (quickstart → client configuration → security
  model); it must not restructure or rewrite the historical list.
- **G5 — Historical runbook links lack a counts caveat.** The README links the
  Phase 5A Inspector runbook, whose §5 validates a three-tool paid-exposed
  surface and nine resources (correct when written; the surface is now ten
  tools and ten resources). PR #57 adds a short parenthetical note at those
  link sites that the runbook's counts are Phase 4-era history and the README
  itself documents the current counts; PR #58's runbook then becomes the
  current-surface procedure. The Phase 5A documents themselves are never
  edited.
- **G6 — Install channel is implicit.** Nothing states that the supported
  installation channel is `git clone` + `npm install` + `npm run build` and
  that no npm package or registry listing exists. Making that explicit stops
  users from hunting a nonexistent package and marks packaging as a deliberate
  deferral, not an omission.

### 5.2 Design requirements for PR #57

- **R1 — Free-mode-first ordering.** A new README section, **"Connect a local
  stdio MCP client"**, is inserted directly after the *Default / Free Mode
  Quickstart* and before *Paid Mode Configuration*. Every client's primary
  worked configuration is free mode (no `STOCKTRENDS_*` variable at all, no
  key, no spend possible). Paid-exposure material appears only after the free
  path, and only per the §6 per-client rules.
- **R2 — Exact environment variable naming.** Every variable name is written
  exactly as `src/config.ts` reads it: `STOCKTRENDS_API_BASE_URL`,
  `STOCKTRENDS_MCP_TRANSPORT`, `STOCKTRENDS_MCP_LOG_LEVEL`,
  `STOCKTRENDS_ENABLE_PAID_TOOLS`, `STOCKTRENDS_API_KEY`,
  `STOCKTRENDS_ENABLE_PAID_EXECUTION`,
  `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, `STOCKTRENDS_MAX_STC_PER_SESSION`,
  `STOCKTRENDS_MAX_USD_PER_SESSION`. Wherever paid configuration is shown, the
  parser facts from §3 are stated: only the literal `true` enables the two
  paid flags; `1`, `yes`, and `on` fail startup with `invalid_config`; the
  execution variable's exact name is `STOCKTRENDS_ENABLE_PAID_EXECUTION`.
- **R3 — Placeholders only.** The only credential-shaped string permitted
  anywhere is `<your-api-key>`. Paths use placeholders such as
  `<absolute-path-to-checkout>`. No real key, no realistic-looking fake, no
  populated `X-API-Key:`/`Authorization:` header value, ever.
- **R4 — Exposure ≠ execution beside every key placeholder.** Every subsection
  that shows a key placeholder restates, in place, that exposure (tools flag +
  key → ten definitions visible) and execution (separate
  `STOCKTRENDS_ENABLE_PAID_EXECUTION` flag + mandatory preflight + nonzero
  caps + covering budget) are separate gates, and that exposure alone can
  never send a request or spend.
- **R5 — Safe Windows PowerShell guidance.** PowerShell parity for every shell
  example: `$env:NAME = "value"` for per-session variables,
  `Remove-Item Env:NAME` for cleanup,
  `Get-ChildItem Env: | Where-Object { $_.Name -like 'STOCKTRENDS_*' }` as the
  names-only hygiene check (prints variable *names*, never values). JSON
  client configs document Windows path escaping (double backslashes or forward
  slashes). Machine-persistent mechanisms (`setx`, system environment
  settings) are explicitly discouraged for any paid variable and forbidden for
  the key.
- **R6 — No live paid command recipes.** No example sets
  `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`, sets any cap or budget value, or
  shows a paid tool invocation or its output. Paid execution references point
  to the Phase 5A §4 eligibility checklist (and, once merged, the PR #58
  release checklist) — eligibility preconditions only, never a runbook.
- **R7 — No remote MCP.** No HTTP/SSE/Streamable HTTP configuration, no
  URL-based server entry, no hosted or multi-user setup, no reverse proxy or
  tunnel guidance. Local stdio (`command` + `args`) only.
- **R8 — No packaging or deployment changes.** The documented install channel
  is `git clone` + `npm install` + `npm run build` (G6 made explicit). No npm
  publication instructions, no registry manifest, no `package.json` change.
  Anything requiring more is named as deferred, out of Phase 5E.
- **R9 — Counts and names verbatim.** Every count (1 free tool / 10
  paid-exposed tools / 10 resources / 0 prompts) and every tool/resource name
  matches §3 exactly. PR #57 changes no count and no contract statement.
- **R10 — Persisted-config credential warning.** Wherever a client
  configuration *file* could carry the key (e.g. Claude Desktop's JSON
  config), the README warns that such files are persistent plaintext on disk:
  a real key must not be left there; per the Secret Safety section,
  session-scoped provisioning is preferred, any key placed in a config file
  for a deliberate operator session is removed immediately afterward, and the
  free-mode configuration is restored.
- **R11 — Free mode needs no environment at all.** Each free-mode client
  example demonstrably contains no `env` entries (or an empty `env` block),
  making "credential-free by default" visible in the config itself.
- **R12 — Client-side facts verified at write time.** Client-specific facts
  this memo cannot verify without network access — Claude Desktop's config
  file locations (`%APPDATA%\Claude\claude_desktop_config.json` on Windows,
  `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS),
  the `mcpServers` schema, and the exact `claude mcp add` syntax — are
  verified by the PR #57 author against the clients' current documentation
  before merge, and the review confirms this.

## 6. Client configuration example design (PR #57)

Selected client/example set — exactly four items:

| # | Client / example | Location | Mode | May mention paid execution? | Placeholders allowed? |
| --- | --- | --- | --- | --- | --- |
| 1 | **Claude Desktop** (local stdio) | README → "Connect a local stdio MCP client" → *Claude Desktop* | Free-mode primary; **paid-exposure-capable** via one clearly separated optional variant | Only the R4 split statement plus a pointer to the eligibility checklist — no recipe | Yes — `<your-api-key>`, path placeholders |
| 2 | **Claude Code** (local stdio) | README → same section → *Claude Code* | **Free-mode-only** (worked example); paid configuration deliberately not worked | Only a boundary note (see below) — no paid env block at all | Path placeholders only (no key placeholder appears) |
| 3 | **Generic MCP stdio client template** | README → same section → *Generic stdio client* | Free-mode primary; **paid-exposure-capable** placeholder variant | Only the R4 split statement plus a pointer — no recipe | Yes — `<your-api-key>`, path placeholders |
| 4 | **MCP Inspector reference** | README quickstart (existing text, repositioned wording only) + existing links to the Phase 5A runbook | n/a (diagnostic) | No | n/a |

Per-example constraints:

1. **Claude Desktop.** The primary worked example is a free-mode `mcpServers`
   entry (`command: "node"`, `args: ["<absolute-path-to-checkout>/dist/server.js"]`,
   no env), preceded by `npm install` / `npm run build`. An optional,
   clearly separated paid-*exposure* variant may add
   `STOCKTRENDS_ENABLE_PAID_TOOLS: "true"` and
   `STOCKTRENDS_API_KEY: "<your-api-key>"` to `env` — with the execution flag
   absent and stated to stay disabled, the R10 persisted-config warning, and
   the R4 split statement in the same subsection. **Forbidden content:** a
   real key; `STOCKTRENDS_ENABLE_PAID_EXECUTION` set `true`; any cap/budget
   value; any paid tool invocation or transcript; any remote/HTTP entry; any
   auto-start, scheduled, or background configuration.
2. **Claude Code.** The worked example is free-mode-only, using the client's
   documented local-stdio registration mechanism (per R12: `claude mcp add
   stocktrends -- node <absolute-path-to-checkout>/dist/server.js`, or a
   project-scoped `.mcp.json` entry of the same shape — exact syntax verified
   at write time). It must carry an explicit boundary note: **Claude Code is
   an agentic client, and Phase 5D approval does not extend to autonomous
   agent paid execution** (PR #54 §8) — so the documented Claude Code path is
   free mode, where the only tool is credential-free and no spend is possible;
   paid exposure/execution remains a separate, operator-shell,
   operator-supervised procedure under the README paid section and the
   eligibility checklist, and is deliberately not given a Claude Code recipe.
   **Forbidden content:** any paid environment block, key placeholder,
   execution flag, cap value, or wording that normalizes unattended/background
   agent use of paid tools.
3. **Generic MCP stdio client template.** A client-agnostic JSON shape
   (`{"command": "node", "args": ["<absolute-path-to-checkout>/dist/server.js"], "env": {}}`)
   documenting the free-mode default, plus a paid-*exposure* placeholder
   variant under the same rules as Claude Desktop (R3/R4; execution absent).
   This is also the configuration shape the PR #58 runbook and any
   SDK-harness fallback in PR #59 use, keeping docs and validation aligned.
   **Forbidden content:** same list as Claude Desktop.
4. **MCP Inspector reference.** The Inspector remains documented as a
   **historical/operator diagnostic, not the only path**: the README's
   existing Inspector quickstart stays (it is accurate), reworded only as
   needed to present client configuration as the primary end-user path, and
   the existing Phase 5A runbook links gain the G5 historical-counts note.
   No new Inspector procedure is written in PR #57 (the current-surface
   procedure is PR #58's runbook). **Forbidden content:** presenting
   Inspector as required for installation; rewriting the Phase 5A runbook.

## 7. Operator smoke-test runbook and launch release checklist design (PR #58)

### 7.1 Operator smoke-test runbook (`docs/PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md`)

A current-surface, **no-spend-by-design** procedure an operator can run before
any release or demonstration. The runbook document itself performs nothing;
executing it requires **no real key, never sets the execution flag, never sets
caps, and creates zero spend**. The only network activity in a full execution
is credential-free public-resource reads. It contains **no live paid execution
recipe of any kind** — paid execution remains eligibility-checklist-only.

Required step design:

- **S0 — Parent-shell hygiene precondition (absorbs PR #53 §11 / PR #54 §9
  permanently).** Before starting, run the names-only presence check
  (PowerShell: `Get-ChildItem Env: | Where-Object { $_.Name -like 'STOCKTRENDS_*' }`;
  POSIX: `env | grep '^STOCKTRENDS_'` — names printed, values never inspected
  or recorded). It must print nothing. If any `STOCKTRENDS_*` variable is
  present, unset every one (both shells' commands provided), then re-check.
  This step is mandatory on every execution, closing the open Phase 5D
  operator hygiene item as a permanent checklist behavior.
- **S1 — Build preflight.** `npm install`, `npm run build` succeed;
  `dist/server.js` exists. `npm run typecheck` / `npm test` are optional for a
  docs-only release and recorded if run.
- **S2 — Default/free listing.** With no `STOCKTRENDS_*` variables: exactly
  **1 tool** (`stocktrends_estimate_workflow_cost`), **10 resources** (the §3
  URI list verbatim), **0 prompts**. Any paid tool visible → stop, S7
  rollback, investigate.
- **S3 — Credential-free resource reads.** In the same free session, read
  `stocktrends://api/openapi` and `stocktrends://leadership/definitions`
  successfully with no credential configured. Record status and top-level
  shape only — no payload dumps.
- **S4 — Exposure matrix spot-checks (recommended).**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true` with no key → still 1 tool (plus the
  blocked-missing-key startup warning); placeholder key with no flag → still
  1 tool. Listing-only; nothing invoked.
- **S5 — Paid-exposed listing (placeholder key only).**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true` + `STOCKTRENDS_API_KEY=<your-api-key>`
  (literal placeholder); execution flag unset; caps unset. **Before any
  invocation**, confirm the stderr startup warning states paid tools are
  exposed but execution is **NOT enabled**. If the banner ever reports
  execution ENABLED, **stop immediately — do not invoke anything — run S7
  rollback**. Then confirm exactly **10 tools** (names verbatim), 10
  resources, 0 prompts.
- **S6 — Execution-disabled fail-closed probe.** In the S5 session, invoke
  exactly one paid tool once — `stocktrends_get_market_regime_latest` with
  `{}` — and confirm the deterministic denial: `paid_execution_disabled`;
  `paid_execution_authorized`/`paid_execution_occurred` `false`;
  `api_request_sent`, `auth_header_sent`, `payment_header_sent` all `false`;
  no cap debit; pricing reconciliation `not_evaluated`. No request of any kind
  leaves the machine. No other paid tool is invoked.
- **S7 — Rollback to the free surface.** Unset every `STOCKTRENDS_*` variable
  (both shells' commands), restart, re-verify 1 tool / 10 resources /
  0 prompts, and re-run the S0 names-only check (prints nothing).
- **S8 — Secret-safety scan and record.** Run the Phase 5A §6 secret-scan term
  list over anything captured; record results and any deviation secret-free
  (`REDACTED` placeholders only; no payload dumps; no key names' values).

Runbook global rules: no real key ever; `STOCKTRENDS_ENABLE_PAID_EXECUTION`
never set; no cap or budget variable ever set; exactly one paid-boundary
invocation in a full execution (S6, which sends nothing); deviations recorded,
never worked around; the Phase 5A troubleshooting table (§3) remains the
referenced troubleshooting companion.

### 7.2 Launch release checklist (`docs/PHASE5E_LAUNCH_RELEASE_CHECKLIST.md`)

Used before tagging or announcing a documentation/readiness release. Every
item is a docs/readiness check; none requires a live paid call.

- **C1 — Surface counts verified** via a completed S0–S7 runbook execution (or
  the merged PR #59 report for the same HEAD): 1 free tool / 10 paid-exposed
  tools / 10 resources / 0 prompts / 9 auth-capable routes.
- **C2 — Docs completeness.** README quickstart, client-configuration section
  (§6 set), environment-variable table, and Secret Safety rules present and
  current; runbook and metadata documents merged; signoff status recorded.
- **C3 — Secret-safety scan completed** (Phase 5A §6 terms) with no findings.
- **C4 — Docs-only diff confirmed.** `src/`, `tests/`, `package.json`,
  `package-lock.json` unchanged for the release; `git status` clean.
- **C5 — Build/test status recorded if run** (docs-only prose changes may not
  require them; record results when run).
- **C6 — Tag / release-notes decision recorded** — whether this milestone is
  tagged now or deferred, per the Phase 5A §7 pattern (`CHANGELOG.md` adoption
  remains an open, separate decision; the `docs/` phase trail remains the
  record).
- **C7 — Directory/marketplace metadata readiness confirmed** — the §8
  document is merged and its counts/non-claims re-checked against the README
  at release HEAD; any actual submission remains a separate reviewed step.
- **C8 — Codex review completed** on every Phase 5E PR merged to date.
- **C9 — Rollback and hygiene confirmed** — the S7 rollback and S0 hygiene
  check were part of the runbook execution in C1.
- **C10 — No live paid validation required or performed** for a docs-only
  release; paid execution remains eligibility-checklist-only
  (Phase 5A §4), one-off, operator-authorized, separately planned.
- **C11 — Supersession statement.** This checklist **supersedes the Phase 5A
  release checklist (§5) for current release use** — its counts (1 free /
  3 paid-exposed, nine resources) were correct for the Phase 4 era and remain
  accurate history. The Phase 5A document is not edited; its §3
  troubleshooting table and §4 paid-execution eligibility checklist remain in
  force and are referenced, not duplicated.
- **C12 — Non-approvals restated** — the release changes nothing about the §3
  non-approved surfaces, and no announcement wording claims otherwise.

## 8. Directory/marketplace metadata design (PR #58)

`docs/PHASE5E_DIRECTORY_METADATA_READINESS.md` prepares reviewed, reusable
*content* for any future MCP directory/marketplace/registry listing. It is a
readiness document: **no submission is performed, and no manifest,
`package.json` field, or registry artifact is created** — those are separate,
later, reviewed steps (§4).

Required fields and content:

- **M1 — Identity.** Server name (`stocktrends-mcp-server`), repository URL,
  and maintainer contact. Only facts already recorded by the repository;
  metadata invents nothing (including license status).
- **M2 — Human-readable short description** (one or two sentences). Draft to
  refine in PR #58: *"Local stdio MCP server for the Stock Trends API:
  credential-free public market-methodology resources and a free planning
  tool by default, with strictly gated optional paid tools for ST-IM, weekly
  indicators, the base selection universe, and weekly market context.
  Forwards published API data verbatim — market context, not investment
  advice."*
- **M3 — Human-readable long description.** One paragraph covering: thin
  local adapter over the front-facing Stock Trends API; the one-direction
  authority chain (§3) with no recomputation, no ranking, no forecasting, no
  advice; credential-free-first (default mode needs no key and cannot spend);
  the exposure/execution two-gate split with fail-closed defaults; local
  stdio, controlled operator use only.
- **M4 — Machine/agent-readable capability block.** A fenced, copyable block
  (JSON) stating: transport `stdio` (only), `remote: false`, `prompts: 0`,
  `tools_default: 1`, `tools_paid_exposed: 10`, `resources: 10`,
  `auth: "X-API-Key (optional; paid exposure only; never for resources)"`,
  `payment_rails: "none (no x402, no wallet, no OAuth, no Bearer)"`,
  `investment_advice: false`, `autonomous_use_approved: false`,
  `install: "git clone + npm install + npm run build"`. Counts must match §3
  verbatim.
- **M5 — Authority boundary statement.** The §3 chain reproduced verbatim,
  with the no-recomputation / verbatim-forwarding sentence.
- **M6 — Surface inventory.** The ten resource URIs; the paid tool families
  summarized (ST-IM pair, indicators pair, base selections, four
  market-context tools) with the context-not-advice framing per family.
  **No hardcoded prices**: pricing is described as STC-denominated,
  resolved through the credential-free `/v1/pricing/catalog` reconciliation —
  the catalog is authoritative, so metadata never embeds amounts that could
  drift.
- **M7 — Safety notes.** Placeholder-only key handling; free mode requires no
  key; exposure ≠ execution; execution fail-closed behind flag + mandatory
  preflight + nonzero caps + covering budget; single fetch, no retries; the
  repeated-identical-call loop gates.
- **M8 — Non-approvals / forbidden claims.** The metadata must state the §3
  non-approvals (controlled local stdio operator use only; no remote/hosted
  MCP; no autonomous/unattended/scheduled/bulk use; no
  x402/wallet/OAuth/Bearer/payment headers; no investment advice) and must
  never contain: autonomous-agent-ready or set-and-forget claims; remote or
  hosted availability claims; x402/payment-rail support claims; trading
  signal, buy/sell/hold, allocation, performance, or returns language;
  uptime/SLA promises; endorsement claims by any client vendor; or any tool,
  resource, prompt, or endpoint that does not exist on the §3 surface.
- **M9 — Installation and documentation references.** Repository README as
  the canonical install path, plus the runbook, security model, and signoff
  (once merged).
- **M10 — Review coupling.** The document states that any future submission
  must re-verify M4/M6 counts against the then-current README and source, and
  is itself a separately reviewed step.

## 9. Controlled local client validation design (PR #59)

**Purpose:** prove the merged PR #57/#58 documentation works as written for a
real end user, credential-free.

Design principles:

- **P1 — No-spend by design, not by budget.** No real API key exists anywhere
  in the validation environment (the S0 names-only presence check is recorded
  at start); the only credential-shaped value used is the literal placeholder;
  the execution flag is never set; no cap variable is set. Zero paid calls,
  zero STC — structurally impossible, not merely capped.
- **P2 — A real end-user client is the primary evidence.** Primary target:
  **Claude Desktop** (local stdio). Acceptable alternate if Desktop is
  unavailable in the validation environment: **Claude Code in free mode**.
  The generic-template SDK harness (Phase 5B/5C/5D pattern) is a fallback
  only, used solely if neither named client is available, with the reason
  recorded — and at least one named end-user client remains the Phase 5E
  success-criterion target (§12). **MCP Inspector may be used only as a
  supplemental diagnostic**, never as the primary evidence.
- **P3 — Docs as written.** The validator follows the merged README text
  literally (fresh clone → `npm install` → `npm run build` → client
  configuration exactly as documented). Any step that fails, ambiguously
  branches, or requires undocumented knowledge is recorded as a
  doc/observation mismatch — the finding this validation exists to produce.
- **P4 — Bounded network surface.** The only live network activity permitted
  is the credential-free public-resource reads that are explicitly part of
  the test (free-mode resource readability is a documented claim), plus
  whatever credential-free reads the client itself performs when listing is
  exercised. **No paid endpoint payload call of any kind**; the fail-closed
  probe sends no request at all.
- **P5 — Rollback.** The validation ends by restoring the free/default
  surface (S7) and re-running the S0 names-only check.
- **P6 — Secret-free reporting.** `REDACTED` placeholders only; no payload
  dumps; counts, names, booleans, and shape summaries only.

Procedure outline (report records each step as observed):

1. Environment record (OS, Node version, client + version, HEAD commit);
   S0 hygiene check prints nothing.
2. Fresh install per README: clone, `npm install`, `npm run build`.
3. **Free mode via the client, as documented:** configure the free-mode
   client entry exactly as the README shows; observe **1 tool / 10 resources
   / 0 prompts**; read one public resource through the client
   (`stocktrends://api/openapi` or `stocktrends://leadership/definitions`)
   with no credential configured.
4. **Paid-exposed listing via the client, placeholder key only:** apply the
   documented paid-exposure variant with the literal placeholder; confirm the
   execution-NOT-enabled startup warning where observable; observe **10 tools
   / 10 resources / 0 prompts**.
5. **Execution-disabled fail-closed denial observed through the client:**
   invoke `stocktrends_get_market_regime_latest` `{}` once; confirm the
   `paid_execution_disabled` denial with `api_request_sent: false` and
   `auth_header_sent: false`, and no cap debit.
6. **Rollback:** remove the paid variant, restore the free-mode entry,
   restart, re-observe 1/10/0; S0 check prints nothing; remove any
   placeholder key from the client config file (R10).
7. Doc/observation mismatch log: table of *doc said / observed / severity /
   disposition*. Secret-safety scan of the report.

Verdict rules: **PASS** (all counts and behaviors as documented, no
mismatches), **PASS WITH DEVIATIONS** (safe behavior, procedural deviations
or doc mismatches recorded with dispositions), **FAIL** (any spend, any real
key, any paid request sent, or a safety-relevant doc error). Doc mismatches
that do not touch safety are fixed by a follow-up docs PR or accepted with
rationale before PR #60; safety-relevant mismatches block the sequence.

## 10. Launch-readiness signoff design (PR #60)

`docs/PHASE5E_LAUNCH_READINESS_SIGNOFF.md` — a narrow, docs-only declaration
in the Phase 5B/5C/5D signoff pattern.

**10.1 Scope of the declaration.** The launch/distribution documentation and
metadata — the merged PR #57 README/client docs, the PR #58 runbook, release
checklist, and metadata document, validated by the PR #59 report — are ready
**for controlled local stdio operator use only**.

**10.2 Evidence it must cite.** PR #56 (this design and its boundaries);
PR #57 (merged, with the §5/§6 requirements met); PR #58 (merged, with the
§7/§8 designs met); PR #59 (merged report, verdict PASS or PASS WITH
DEVIATIONS with every deviation dispositioned); a read-only surface-count
reconfirmation (1/10/10/0/9) against the source at the signoff HEAD; and the
Codex review record for each PR.

**10.3 What it may not approve.** The signoff grants **no runtime approval
beyond the existing Phase 5D scope** — it approves documentation and metadata
readiness, not any new execution behavior, cap value, or usage pattern. It
explicitly does **not** approve: remote MCP; hosted MCP; autonomous agent
use; unattended/scheduled/CI/background/bulk use; the deferred routes;
decision/portfolio endpoints; Intelligence Agent artifact endpoints;
x402/wallet/OAuth/`Authorization: Bearer`/payment-header behavior; investment
advice; **and no package/registry/marketplace publication** — any actual
packaging, npm publication, manifest artifact, or directory submission
requires its own separately reviewed step. It makes no claim about any future
capability, weakens no gate, raises no cap, and edits no historical document.

**10.4 After the signoff.** Tagging/announcing follows the PR #58 release
checklist (C6 decision) as a maintainer action; the next capability phase
begins, per repository cadence, with its own selection or design memo.

## 11. Security controls and non-goals

Every Phase 5E PR preserves all of the following, unchanged:

- **No new tools, resources, or prompts** — counts frozen at 1 free tool /
  10 paid-exposed tools / 10 public resources / 0 prompts.
- **No route promotions** — the nine-route auth-capable allowlist is
  untouched; deferred routes stay denied `endpoint_not_allowlisted`.
- **No pricing-mirror changes** and no pricing/catalog behavior changes.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows` —
  discovery metadata is authored, reviewed, static content.
- **No API key use in PR #56** (this PR), and no real key anywhere in the
  sequence — placeholders only; PR #59's exposure checks use the literal
  placeholder.
- **No paid validation and no live endpoint calls in PR #56** — this memo
  made no network request; across the sequence the only live traffic is the
  credential-free public-resource reads specified in §7.1 S3 and §9 P4.
- **No remote MCP, no hosted MCP** — local stdio only, in every document,
  example, and metadata field.
- **No x402, wallet, OAuth, `Authorization: Bearer`, or payment headers** —
  no payment rail appears in any Phase 5E document, example, or metadata.
- **No investment advice** — context-not-advice framing carries into every
  client doc and metadata field; no buy/sell/hold/allocation/risk/suitability
  wording anywhere.
- **Paid execution remains eligibility-checklist-only** — no Phase 5E
  document is or contains a live paid execution runbook; all paid execution
  remains one-off, operator-authorized, operator-supervised, and separately
  planned outside this sequence.
- **Historical documents are records** — Phase 4/5A/5B/5C/5D documents are
  superseded for current operational use where stated (§7.2 C11), never
  rewritten.

Explicit non-goals for Phase 5E (nothing below is designed, authorized, or
scheduled by this memo):

- Runtime changes of any kind (`src/`, `tests/`, `package.json`,
  `package-lock.json`).
- npm publication, registry publication, packaging, manifest artifacts, or
  any directory/marketplace submission.
- Remote MCP or hosted MCP transports.
- x402 / wallet / OAuth / `Authorization: Bearer` / payment-header behavior.
- New tools, resources, prompts, paid endpoints, or allowlist promotions.
- The deferred routes (`/v1/market/regime/forecast`,
  `/v1/breadth/sector/history`, `/v1/leadership/rotation/history`),
  decision/portfolio endpoints, and Intelligence Agent artifact endpoints.
- Live paid validation, real API keys, or any spend.
- Autonomous, unattended, scheduled, CI, background, or bulk usage — and any
  documentation that normalizes them.
- Investment advice.
- Production-readiness claims for any future capability.

## 12. Success criteria

Phase 5E is complete when all of the following are true:

1. **Install-from-README works credential-free:** a new operator goes from
   `git clone` to a working free-mode client configuration showing 1 tool /
   10 resources / 0 prompts using only the merged README, with no key and no
   spend.
2. **The §6 client example set is merged:** Claude Desktop (free-mode primary
   + placeholder-only exposure variant), Claude Code (free-mode-only with the
   agentic-client boundary note), the generic stdio template, and the
   Inspector repositioned as diagnostic — each obeying its per-example
   constraints.
3. **Free/default usage is explained clearly** — the free path is fully
   usable with the README alone, and the exposure-vs-execution distinction
   appears beside every key placeholder (R4).
4. **Paid exposure and paid execution are safely separated everywhere** — no
   live paid command recipe exists in any merged Phase 5E document.
5. **The current-surface runbook exists and is no-spend** (§7.1), including
   the S0 parent-shell hygiene step and the S6 fail-closed probe.
6. **The launch release checklist exists** (§7.2), supersedes the Phase 5A §5
   checklist for release use without editing it, and records the
   tag/release-notes decision item.
7. **Directory/marketplace metadata is drafted and reviewed** (§8) with
   accurate counts, no hardcoded prices, and the M8 non-claims.
8. **The PR #59 validation passed** against at least one real end-user local
   stdio MCP client with **zero paid calls, zero real keys, zero STC**, and
   every doc/observation mismatch dispositioned.
9. **The PR #60 signoff is merged** with the §10.3 non-approvals intact.
10. **The surface contract is unchanged** — 1/10/10/0/9 before and after
    every PR; `src/`, `tests/`, `package.json`, `package-lock.json` untouched
    across the sequence; **Codex review completed on every PR**.

## 13. Codex review checklist (for this memo)

Codex review of PR #56 should verify:

1. **Docs-only diff:** exactly this document plus one README
   documentation-index link; no `src/`, `tests/`, `package.json`,
   `package-lock.json`, script, runtime-artifact, log, or output-file change.
2. **Surface facts:** the §3 counts (1 free tool / 10 paid-exposed tools /
   10 public resources / 0 prompts / 9 auth-capable routes) and every
   tool/resource/route name match the source at HEAD `97f1f07` and the merged
   PR #54 signoff §4.
3. **Parser facts:** the §3/§5 R2 statements about
   `STOCKTRENDS_ENABLE_PAID_TOOLS` / `STOCKTRENDS_ENABLE_PAID_EXECUTION`
   truthiness (`true` only; `1`/`yes`/`on` → `invalid_config`) match
   `src/config.ts`.
4. **No forbidden actions performed:** no live endpoint call (paid or
   credential-free), no API key used/requested/inspected/printed/logged/
   stored, no MCP Inspector session, no paid validation — and the memo states
   its facts come from merged documents and read-only source inspection.
5. **Design completeness:** PRs #57–#60 each have a defined deliverable, file
   set, and review checkpoint (§4), and the §5–§10 designs cover every item
   the PR #55 §6 table assigned to them.
6. **Client-set safety:** the §6 set is exactly four items with per-example
   mode, location, paid-mention, placeholder, and forbidden-content rules;
   Claude Code is free-mode-only with the agentic-client boundary note; no
   example contains an execution recipe, cap value, or real-key pattern.
7. **Runbook/checklist safety:** §7.1 is no-spend by design (placeholder key
   only, execution flag never set, caps never set, one fail-closed probe that
   sends nothing, S5 stop rule before any invocation), absorbs the
   parent-shell hygiene item as S0, and §7.2 supersedes Phase 5A §5 for
   release use without editing historical documents.
8. **Metadata non-claims:** §8 requires accurate counts, forbids hardcoded
   prices, and lists the M8 forbidden claims (no autonomous/remote/x402/advice
   or performance wording).
9. **PR #59 design:** credential-free/no-spend **by design**; a real end-user
   client as primary evidence with Inspector supplemental-only; the bounded
   P4 network surface; verdict and mismatch-disposition rules; and the
   explicit no-plan-PR rationale.
10. **PR #60 design:** the §10 scope grants nothing beyond documentation/
    metadata readiness for controlled local stdio operator use, and §10.3
    withholds publication approval and every Phase 5D non-approval.
11. **Security posture completeness:** §11 preserves every existing
    constraint with no weakening or reinterpretation, and the non-goals cover
    runtime/package/publication/remote/x402/advice/autonomous surfaces.
12. **Secret safety:** no key-shaped string, no populated auth-header value,
    and no realistic-looking credential anywhere in the diff; `<your-api-key>`
    and `REDACTED` placeholders only.
13. **README change:** exactly one documentation-index link added, in the
    existing list style, with no other README modification.

## 14. Final recommendation

**Adopt this design for Phase 5E and proceed to PR #57 (README
client-installation and local stdio configuration improvements) if Codex
approves this memo and PR #56 merges.** The sequence then continues
#58 → #59 → #60 exactly as designed in §4–§10, each PR docs-only and
individually Codex-reviewed, preserving the 1/10/10/0/9 surface contract and
every Phase 5D non-approval unchanged throughout.

This memo authorizes no implementation, performs and authorizes no live call
or paid validation, uses no API key, changes no runtime behavior, and makes
no production-readiness or launch-readiness claim; launch readiness is
decided only by PR #60 on the evidence PRs #57–#59 produce.
