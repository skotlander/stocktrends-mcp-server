# Phase 5A Operational Hardening and Public Readiness Design Memo

Design date: 2026-07-09

Status: **Documentation / operator-readiness design only.** No runtime code, no
`src/` changes, no `tests/` changes, no `package.json` / `package-lock.json`
changes, no `README.md` change yet, no MCP tools added, no MCP prompts added, no
endpoint calls, no API keys used/requested/inspected/printed/logged/stored, no
x402/wallet/OAuth/Bearer/remote/database/control-plane work. This memo defines
the documentation and operator-readiness sequence for Phase 5A **before** any
README update or runtime change is made. It authorizes no behavior change; it
plans the docs work that later, separately reviewed PRs will implement.

This memo builds on and does not supersede:

- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) — the accepted ADRs
  that constrain the design (source authority, authority boundary, thin-adapter
  posture, disabled-by-default paid surface).
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — the conservative security model,
  including §15 paid ST-IM live execution flags, caps, and secret handling.
- [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) — the local stdio
  server architecture.
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the approved paid ST-IM design, gate policy, and live-validation policy.
- [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)
  — the completed, operator-supervised controlled live validation run.
- [`PHASE4_CLOSEOUT_PHASE5_ARCHITECTURE_CHECKPOINT.md`](PHASE4_CLOSEOUT_PHASE5_ARCHITECTURE_CHECKPOINT.md)
  — the Phase 4 closeout that recommended Phase 5A as the next phase.

## 0. Architecture boundary (unchanged)

Phase 5A preserves — and must document without weakening — the controlling
authority boundary:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a **thin local stdio adapter over the front-facing Stock
Trends API**. Phase 5A adds documentation and operator-readiness material around
that adapter. It does not turn the adapter into a second source of truth, a
pricing or payment authority, a database or control-plane client, a recomputation
layer, or an advice generator. Every deliverable in this memo describes the
existing surface; none extends it.

## 1. Purpose and scope

Phase 5A is **documentation and operator-readiness only**. Its purpose is to make
the already-proven server easier and safer to install, inspect, configure,
validate, and demonstrate — without adding capability.

Phase 5A **does not**:

- add MCP tools or change the tool count in any mode;
- change runtime behavior, gates, caps, or preflight logic;
- add x402, wallet, or payment handling;
- add OAuth, `Authorization: Bearer` auth, or any credential path beyond the
  existing `X-API-Key`;
- add remote/hosted MCP transport;
- add database or control-plane access;
- add dynamic registration from `/v1/ai/tools` or `/v1/workflows`;
- add MCP prompts;
- generate investment advice, guidance, or recommendations.

Phase 5A **does** prepare the server for:

- safer installation and startup by a new user;
- safe inspection of the tool surface by an operator;
- configuration validation that cannot accidentally perform a live paid call;
- clearly-bounded, operator-authorized demonstration of the paid path;
- a taggable release with explicit preflight checks.

The scope is deliberately narrow: it turns the operational knowledge already
recorded across the Phase 1–4 `docs/` trail into user-facing and operator-facing
documentation, with hard secret-safety rules.

## 2. Inputs and governing documents

Phase 5A docs must remain consistent with, and cite where relevant, the existing
governing documents:

| Document | What Phase 5A takes from it |
| --- | --- |
| [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) | Authority boundary (ADR-002), source authority (ADR-001), disabled-by-default paid surface (ADR-005/006/012), stdio-only posture, default API base URL and its `STOCKTRENDS_API_BASE_URL` override (ADR-008). |
| [`SECURITY_MODEL.md`](SECURITY_MODEL.md) | Secret handling (§2/§3/§9), disabled-by-default paid tools (§5/§11), the paid-enablement flag split and cap defaults (§15), logging policy, and the "never commit secrets / no secrets in docs examples" rule (§2). |
| [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) | The local stdio architecture and public-resource model that the free-mode quickstart describes. |
| [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md) | The exposure-vs-execution gate split, mandatory preflight, cap semantics, and the mock-only-tests / operator-authorized-live-validation posture that the paid-mode docs and safety checklists must reflect. |
| [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md) | The one recorded controlled live run; the template for how an exceptional supervised validation is documented and rolled back. |
| [`PHASE4_CLOSEOUT_PHASE5_ARCHITECTURE_CHECKPOINT.md`](PHASE4_CLOSEOUT_PHASE5_ARCHITECTURE_CHECKPOINT.md) | The Phase 5A scope sketch (§8), non-goals (§9), and the decision to harden before adding paid surface or payment. |

Phase 5A docs must not contradict any of these. Where a doc deliverable would
imply a behavior not already present (for example, a dry-run flag), it must be
written as *documentation of existing behavior only* and must not assert a
capability the current build does not have.

## 3. Phase 5A target outcome

The desired operator/user end state after Phase 5A docs land:

- **A new user can understand default/free mode** — that the server runs locally
  over stdio, exposes exactly one credential-free planning tool plus the public
  resources, needs no API key, and never spends.
- **A subscriber can understand paid mode without exposing secrets** — how to
  enable the paid ST-IM tool surface and (separately) paid execution, which
  environment variables matter, and how caps and preflight protect them, all
  using placeholders only.
- **An operator can inspect the tool surface safely** — list tools/resources in
  both default and paid-exposed modes via MCP Inspector without performing any
  live paid call.
- **An operator can validate configuration without accidentally performing live
  paid execution** — the difference between exposure and execution is explicit,
  and the documented validation path stops before any credential-bearing fetch.
- **A supervised live validation path is documented as exceptional** —
  operator-authorized, operator-supervised, one-off, not recurring, not
  automated, and always followed by rollback to default free mode.
- **A release can be tagged with clear preflight checks** — a release checklist
  exists so a maintainer can confirm surfaces, secret-safety, and rollback docs
  before tagging.

## 4. Existing state (surfaces to be documented, not changed)

The current `main` includes `bac73f7` (#30) and is clean. The surfaces Phase 5A
documents are:

- **Default (free) mode exposes exactly one tool:**
  `stocktrends_estimate_workflow_cost` (workflow-level `GET /v1/cost-estimate`,
  credential-free, `paid_execution_authorized` always `false`).
- **Paid tools mode exposes exactly three tools** (when
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** `STOCKTRENDS_API_KEY` is
  configured):
  - `stocktrends_estimate_workflow_cost`
  - `stocktrends_get_stim_latest`
  - `stocktrends_get_stim_history`
- **Execution-enabled paid mode changes call behavior, not tool count.** Enabling
  `STOCKTRENDS_ENABLE_PAID_EXECUTION` (plus the required caps and passing
  preflight) changes whether the two paid ST-IM tools perform a live authorized
  `X-API-Key` fetch or fail closed. The three-tool surface is identical with or
  without the execution flag.
- **Public resources are credential-free** and remain so in every mode.
- **Zero MCP prompts.**
- **No dynamic registration** — no tool or resource is registered from
  `/v1/ai/tools` or `/v1/workflows`; tool/endpoint/pricing metadata is static.
- **Local stdio transport only.** No remote HTTP/SSE/Streamable HTTP hosting.
- **Defense-in-depth build-level kill switch** exists alongside the runtime
  gates (compile-time `PHASE4_PAID_EXECUTION_ENABLED` /
  `paidCallsAuthorizedInThisBuild`), so an older non-execution build can never
  execute regardless of environment.

Phase 5A documents this surface exactly as-is. No deliverable in §5 alters any of
the above.

## 5. Documentation deliverables proposed for Phase 5A

These are the docs/README changes Phase 5A will produce in **later** PRs. This
memo defines them; it does **not** implement any of them here. Each is
docs-only and must respect the secret-safety rules in §6.

1. **README free-mode quickstart.** Install, run locally over stdio, and confirm
   default mode exposes exactly `stocktrends_estimate_workflow_cost` plus the
   public resources. No API key. No spend. Includes the architecture-boundary
   summary from §0.
2. **README paid-mode quickstart.** How to enable the three-tool paid surface
   (`STOCKTRENDS_ENABLE_PAID_TOOLS` + `STOCKTRENDS_API_KEY`) and, separately, how
   paid execution is gated (`STOCKTRENDS_ENABLE_PAID_EXECUTION` + nonzero caps +
   preflight). Emphasizes exposure ≠ execution, using placeholders only.
3. **Environment variable matrix.** A single reference table of every relevant
   variable — `STOCKTRENDS_API_BASE_URL`, `STOCKTRENDS_ENABLE_PAID_TOOLS`,
   `STOCKTRENDS_API_KEY`, `STOCKTRENDS_ENABLE_PAID_EXECUTION`,
   `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
   `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, `STOCKTRENDS_MAX_STC_PER_SESSION`,
   `STOCKTRENDS_MAX_USD_PER_SESSION`, `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` —
   with default, effect, and whether it affects exposure vs execution. Defaults
   only; no example secret values.
4. **MCP Inspector usage recipe.** How to launch the server under MCP Inspector,
   list tools/resources, and confirm the default (1-tool) and paid-exposed
   (3-tool) surfaces **without** performing a paid call.
5. **Claude Desktop / Claude Code local MCP config examples.** Copy-pasteable
   local stdio config blocks for both clients, using placeholder values for any
   secret (e.g. `"STOCKTRENDS_API_KEY": "<your-api-key>"`) and defaulting to
   free mode.
6. **Default-mode rollback checklist.** Ordered steps to return a paid-configured
   or paid-executed session to default free mode (disable execution, disable paid
   tools, remove the key from the session environment, restart, confirm the
   1-tool listing) — mirroring the rollback recorded in the Phase 4 validation
   report.
7. **Paid execution safety checklist.** The operator-facing preconditions and
   guardrails before any live paid call: exposure vs execution understood, caps
   set to explicit nonzero values, budget cap set, preflight required, one-off
   operator-supervised run, immediate rollback after.
8. **Troubleshooting table.** Common install/start/inspect failures mapped to
   likely causes and safe resolutions (e.g. "paid tools not appearing" →
   exposure flag/key not both set; "call fails closed" → caps unset or
   execution flag off), with no secret-bearing examples.
9. **Release checklist.** Preflight checks before tagging: surfaces confirmed
   (1/3/0/resources), secret-safety scan of docs, rollback docs present, tests
   green if any doc change touched runnable examples, and version/notes updated.
10. **Optional CHANGELOG or release-notes guidance.** If adopted (see §11 open
    questions), a lightweight convention for recording doc/release changes.

## 6. Secret-safety rules for public docs (hard rules)

These are non-negotiable for every Phase 5A doc deliverable, consistent with
[`SECURITY_MODEL.md`](SECURITY_MODEL.md) §2/§3/§9:

- **Never include a real API key** anywhere in docs, examples, config blocks, or
  fixtures.
- **Never include full auth headers.** Do not print a populated `X-API-Key:`
  value or any credential-bearing header.
- **Use placeholders only** — e.g. `<your-api-key>`, `<STOCKTRENDS_API_KEY>`,
  `xxxxxxxx` — clearly marked as placeholders.
- **Prefer shell-session / per-session examples over persistent machine-wide
  secrets** where appropriate, so a reader is not nudged into writing a key into
  a globally-persisted file or a committed config.
- **No screenshots containing secrets.** Any MCP Inspector or client screenshot
  must have credentials absent or redacted.
- **Do not imply keys are needed for public/free mode.** Free mode must be
  documented as fully functional with no API key.
- **Do not encourage users to enable paid execution just to test installation.**
  Installation and tool-listing verification must be demonstrable entirely in
  free mode and in paid-*exposed* mode without execution.
- **Docs must never instruct a reader to commit a key**, place it in the repo,
  or paste it into a shared/checked-in config.

A Phase 5A PR that would introduce a secret-bearing example — even a
plausible-looking fake one presented as real — is out of policy and must be
revised to use an explicit placeholder.

## 7. Validation philosophy

Phase 5A validation is layered, and the layers are ordered from safest to most
privileged. Nothing beyond static/free layers runs by default.

1. **Static documentation checks.** Markdown builds/renders; internal doc links
   resolve; no secret-shaped strings present; surface claims (1/3/0/resources)
   match the code and the Phase 4 record.
2. **`npm test` / build** — run **only if** a later README/docs change introduces
   or modifies a runnable example, snippet, or config that warrants it. Doc-only
   prose changes do not require it, but the release checklist should confirm the
   suite is green before tagging.
3. **Free/default MCP Inspector tool listing.** Confirm default mode lists
   exactly `stocktrends_estimate_workflow_cost` plus public resources, no key.
4. **Paid-tool listing without paid execution.** With exposure enabled
   (paid-tools flag + key) but execution **not** enabled, confirm the 3-tool
   surface lists correctly and that invocation fails closed — no live fetch.
5. **Paid execution only under explicit operator authorization.** A live paid
   call happens **only** when an operator deliberately enables execution with
   nonzero caps and supervises the run, exactly as in the Phase 4 controlled
   validation.
6. **No automated or recurring live paid validation.** There is no scheduled,
   unattended, CI-driven, or autonomous live paid call. Live validation is
   one-off and operator-supervised, never a Phase 5A default or a repeating job.

## 8. Recommended PR sequence for Phase 5A

Small, incremental, reviewable PRs. Names may be adjusted, but the sequence stays
incremental and each PR remains independently reviewable:

| PR | Scope |
| --- | --- |
| **PR 31** | Phase 5A design memo (this document). Docs-only; no README change. |
| **PR 32** | README free/default-mode quickstart + architecture-boundary summary. No paid content beyond a forward pointer. |
| **PR 33** | README paid-mode configuration + secret-safety notes + environment variable matrix. Placeholders only. |
| **PR 34** | MCP Inspector validation runbook (free listing + paid-exposed listing without execution) and default-mode rollback checklist. |
| **PR 35** | Troubleshooting table + paid execution safety checklist + release checklist (and optional CHANGELOG/release-notes guidance if adopted). |

Sequencing rationale: free-mode first (PR 32) so the lowest-risk, most-common
path is documented before any paid material; paid configuration and secret-safety
together (PR 33) so caps and placeholder rules land with the paid flags they
govern; inspection/rollback (PR 34) before the safety/release material (PR 35)
so operators can verify surfaces before the release checklist references those
checks. Each PR is doc-only unless a runnable example forces a `npm test` gate
(§7, layer 2).

## 9. Acceptance criteria for Phase 5A

Phase 5A is complete when:

- **README clearly explains default/free mode** — local stdio, one credential-
  free planning tool, public resources, no key, no spend.
- **README clearly explains paid tools and paid execution gates** — the 3-tool
  exposure surface and the separate execution gate (flag + nonzero caps +
  preflight), with exposure ≠ execution stated explicitly.
- **No secret-bearing examples** exist anywhere in the docs — placeholders only,
  verified by a static secret-shape check.
- **Users can verify tool listing without paid execution** — the Inspector
  runbook demonstrates default (1-tool) and paid-exposed (3-tool) listings with
  no live paid call.
- **Rollback / default-mode instructions are clear** — an operator can return to
  the 1-tool free surface deterministically.
- **A release checklist exists** covering surface confirmation, secret-safety,
  rollback docs, test/build state, and versioning.
- **No runtime/source changes** were made — `src/`, `tests/`, `package.json`,
  and `package-lock.json` are untouched — unless a later, separately authorized
  memo approves them.

## 10. Non-goals

Phase 5A explicitly excludes:

- **No new paid tools** (tool count unchanged in every mode).
- **No x402 / wallet.**
- **No OAuth / `Authorization: Bearer` auth.**
- **No remote / hosted MCP transport.**
- **No database / control-plane access.**
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No Intelligence Agent recomputation** or reinterpretation.
- **No investment advice generation** — no buy/sell/hold/allocation/risk output.
- **No unattended, scheduled, autonomous, or recurring live validation.**
- **No source or runtime changes** unless a separate design memo authorizes them.

## 11. Open questions

Documentation decisions to resolve before README edits begin:

1. **Config-example placement.** Include Claude Desktop / Claude Code local MCP
   config examples directly in the README, or in a separate runbook doc the
   README links to? (Leaning: a short free-mode example in README, fuller paid
   examples in a linked runbook, to keep the README approachable.)
2. **Release tagging after Phase 5A docs.** Tag a release (e.g. a docs/readiness
   milestone) once the Phase 5A docs land, or defer tagging until a later
   capability phase?
3. **CHANGELOG adoption.** Add a `CHANGELOG.md` (or release-notes convention)
   now, or continue relying on the `docs/` phase trail and PR history?
4. **Install-instruction assumption.** Should public install instructions assume
   a future published npm package, or document local-clone install only for now?
   (Leaning: local-clone only until/unless packaging is separately decided, to
   avoid documenting a distribution path that does not yet exist.)

These are documentation-scope decisions only; none changes runtime behavior, and
each can be answered without touching `src/`, `tests/`, or packaging.

## 12. Final recommendation

Proceed with Phase 5A as a documentation-first hardening sequence. The next
implementation PR should update README free/default-mode quickstart only, without
adding runtime behavior.
