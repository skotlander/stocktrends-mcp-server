# Phase 5A MCP Inspector Validation Runbook

Date: 2026-07-09

Status: **Documentation / operator-readiness only.** This runbook adds no runtime
code, no `src/` changes, no `tests/` changes, no `package.json` /
`package-lock.json` changes, no MCP tools, and no MCP prompts. It documents how an
operator safely inspects the *existing* tool and resource surface with the MCP
Inspector. It authorizes no behavior change and performs no live paid call.

This runbook builds on and does not supersede:

- [`PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md`](PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md)
  — the Phase 5A scope (§5 deliverable 4, MCP Inspector usage recipe; §5
  deliverable 6, default-mode rollback checklist) and the hard secret-safety
  rules (§6) this runbook obeys.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — secret handling and the
  disabled-by-default paid surface (§15).
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the exposure-vs-execution gate split this runbook stops short of exercising.
- [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)
  §10 — the rollback that the default-mode rollback checklist here mirrors.

## 1. Purpose and scope

This runbook is Phase 5A operator-readiness **documentation only**. Its purpose is
to let an operator confirm the MCP tool and resource surface with the
[MCP Inspector](https://github.com/modelcontextprotocol/inspector) in two safe
modes — default/free and paid-*exposed* — and then roll back to default/free
mode.

MCP Inspector validation here is strictly for **tool/resource listing and safe
boundary inspection**. Specifically, this runbook:

- performs **no live paid execution** of any kind;
- makes **no API call to paid ST-IM endpoints** (`GET /v1/stim/latest`,
  `GET /v1/stim/history`);
- includes **no MCP tool invocation of the paid ST-IM tools**
  (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`);
- prints, logs, or commits **no secrets** — only variable *names* and explicit
  placeholders ever appear.

It stops at confirming that the expected tools and resources are *visible*. It
never invokes a paid tool and never sends a credential-bearing request. The live
paid path is out of scope here and is exercised only under the separate,
exceptional, operator-supervised process recorded in
[`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md).

## 2. Safety rules

These rules are non-negotiable for every step below, consistent with
[`PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md`](PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md)
§6 and [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §2.

- **Free/default validation must be performed with no API key.** Do not set
  `STOCKTRENDS_API_KEY` at all for §4.
- **Paid-exposed validation may reference an API key placeholder conceptually,
  but this runbook must never show or record a real key.** Use `<your-api-key>`.
- **Do not paste a real key** into terminal logs, screenshots, chats, README
  examples, or issue reports. Placeholders only.
- **Do not enable `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`** for this runbook.
  Leave it `false` or unset throughout.
- **Do not set nonzero paid execution caps** for this runbook
  (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, `STOCKTRENDS_MAX_STC_PER_SESSION`,
  `STOCKTRENDS_MAX_USD_PER_SESSION`). Leaving caps at their `0`/unset defaults is
  part of what keeps this runbook execution-free.
- **Do not invoke `stocktrends_get_stim_latest`.**
- **Do not invoke `stocktrends_get_stim_history`.**
- **Stop after confirming tool/resource visibility.** Do not proceed to any
  paid call.

If any step would require pasting a real key, invoking a paid tool, enabling
execution, or setting a nonzero cap, that step is out of policy for this runbook —
stop instead.

## 3. Preconditions

- Node dependencies installed (`npm install`).
- Build completed with `npm run build`, producing `dist/server.js`.
- The current shell has **no paid environment variables set** for the
  default/free validation in §4 — no `STOCKTRENDS_ENABLE_PAID_TOOLS`, no
  `STOCKTRENDS_API_KEY`, no `STOCKTRENDS_ENABLE_PAID_EXECUTION`, no caps.
- MCP Inspector is available on demand through
  `npx @modelcontextprotocol/inspector` (no global install or persisted state
  required).
- No persistent secrets are required. Nothing in this runbook is written to a
  persistent, machine-wide, or committed location.

If a paid variable is already set in the current shell (for example from a prior
session), clear it using the rollback steps in §6 **before** starting §4, so the
default/free check is not contaminated.

## 4. Default/free mode Inspector validation

Goal: confirm the credential-free default surface — exactly one tool, the public
resources, zero prompts, no key, no spend.

First confirm no paid variables are set, then launch the Inspector against the
compiled stdio server. Use the actual server command from the README.

**Windows PowerShell:**

```powershell
# Confirm no paid variables are set for the free-mode check (should print nothing).
Get-ChildItem Env: | Where-Object { $_.Name -like 'STOCKTRENDS_*' }

# Launch MCP Inspector against the compiled stdio server, no paid env vars set.
npx @modelcontextprotocol/inspector node dist/server.js
```

**POSIX shell (bash/zsh):**

```sh
# Confirm no paid variables are set for the free-mode check (should print nothing).
env | grep '^STOCKTRENDS_' || echo "no STOCKTRENDS_* variables set"

# Launch MCP Inspector against the compiled stdio server, no paid env vars set.
npx @modelcontextprotocol/inspector node dist/server.js
```

In the Inspector UI, confirm the default/free boundary:

- **Exactly one MCP tool is listed:** `stocktrends_estimate_workflow_cost`.
- **The paid ST-IM tools are not visible:** `stocktrends_get_stim_latest` and
  `stocktrends_get_stim_history` do **not** appear.
- **Zero MCP prompts** — the prompts list is empty, if the client exposes a
  prompts panel.
- **Public resources are visible credential-free** — the nine public resources
  are listed and readable without any credential configured (for example
  `stocktrends://api/openapi`, `stocktrends://ai/context`,
  `stocktrends://pricing/catalog`).
- **No API key is required** — nothing prompts for or needs a credential.
- **No spend is possible** — the only tool present is the credential-free
  planning tool; there is no paid tool to invoke.

Stop here. This confirms the free/default boundary with no key configured and no
paid execution triggered.

## 5. Paid-tool exposure validation without execution

Goal: confirm that enabling paid *exposure* makes the three-tool surface visible —
**without** running any paid call. This documents how to expose the paid tool
*definitions* only. It does **not** run paid calls, and it must not be used to
perform one.

Set the placeholder-only exposure configuration. Exposure requires the paid-tools
flag plus a configured `STOCKTRENDS_API_KEY`; execution stays disabled and no caps
are set, so no paid request can occur.

**Windows PowerShell:**

```powershell
# Exposure only: makes the two paid ST-IM tool definitions visible.
# This does NOT authorize or perform any paid API call.
$env:STOCKTRENDS_ENABLE_PAID_TOOLS = "true"
$env:STOCKTRENDS_API_KEY = "<your-api-key>"          # placeholder — never paste a real key
$env:STOCKTRENDS_ENABLE_PAID_EXECUTION = "false"     # execution stays disabled
# Do NOT set nonzero caps. Do NOT set the execution flag to true.

npx @modelcontextprotocol/inspector node dist/server.js
```

**POSIX shell (bash/zsh):**

```sh
# Exposure only: makes the two paid ST-IM tool definitions visible.
# This does NOT authorize or perform any paid API call.
export STOCKTRENDS_ENABLE_PAID_TOOLS=true
export STOCKTRENDS_API_KEY="<your-api-key>"          # placeholder — never paste a real key
export STOCKTRENDS_ENABLE_PAID_EXECUTION=false       # execution stays disabled
# Do NOT set nonzero caps. Do NOT set the execution flag to true.

npx @modelcontextprotocol/inspector node dist/server.js
```

Notes on the placeholder configuration:

- **It must not show a real key.** `<your-api-key>` is a literal placeholder.
- **It must not instruct anyone to persist the key.** Use a per-session shell
  variable only; do not write it to a file, a committed config, or a machine-wide
  location.
- **It must not set nonzero paid caps** — leave all caps at their `0`/unset
  defaults.
- **It must not set `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`** — execution stays
  `false`.

In the Inspector UI, confirm the paid-*exposed* surface:

- **Exactly three MCP tools are listed:**
  - `stocktrends_estimate_workflow_cost`
  - `stocktrends_get_stim_latest`
  - `stocktrends_get_stim_history`
- **Public resources are still visible** (the same nine credential-free
  resources as in §4).
- **Zero MCP prompts.**
- **No paid tool is invoked** — confirm the tool *definitions* are listed, then
  stop. Do not click Run on either paid tool.
- **No live paid API request is made** — listing tool definitions sends no
  request to `GET /v1/stim/latest` or `GET /v1/stim/history` and attaches no
  credential.
- **No payment/x402/wallet/OAuth/Bearer behavior** occurs — none of that exists
  on this surface; exposure only makes definitions visible.

Stop here. The three-tool surface is confirmed visible without any paid
execution.

## 6. Default-mode rollback checklist

Goal: return a paid-exposed session to the default/free surface. These steps
mirror the rollback recorded in
[`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)
§10.

1. **Stop the MCP Inspector / server session** (Ctrl+C in the Inspector terminal;
   close the Inspector UI).
2. **Remove `STOCKTRENDS_API_KEY` from the current shell/session** so no credential
   remains set.
3. **Disable paid tools** by unsetting `STOCKTRENDS_ENABLE_PAID_TOOLS` (or setting
   it `false`) so the paid tool definitions are no longer exposed.
4. **Set `STOCKTRENDS_ENABLE_PAID_EXECUTION=false` or unset it** (it should already
   be `false` for this runbook).
5. **Unset any paid caps/budgets** if they were set (they should not have been set
   for this runbook): `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
   `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, `STOCKTRENDS_MAX_STC_PER_SESSION`,
   `STOCKTRENDS_MAX_USD_PER_SESSION`.
6. **Restart the Inspector/server** against the compiled stdio server.
7. **Confirm default/free mode shows exactly one tool:**
   `stocktrends_estimate_workflow_cost`.
8. **Confirm the paid ST-IM tools are not visible:** `stocktrends_get_stim_latest`
   and `stocktrends_get_stim_history` no longer appear.

**Windows PowerShell:**

```powershell
# 2-5: clear paid variables from the current session.
Remove-Item Env:STOCKTRENDS_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_ENABLE_PAID_TOOLS -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_ENABLE_PAID_EXECUTION -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_MAX_STC_PER_SESSION -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_MAX_USD_PER_SESSION -ErrorAction SilentlyContinue

# Confirm nothing remains (should print nothing), then restart.
Get-ChildItem Env: | Where-Object { $_.Name -like 'STOCKTRENDS_*' }
npx @modelcontextprotocol/inspector node dist/server.js
```

**POSIX shell (bash/zsh):**

```sh
# 2-5: clear paid variables from the current session.
unset STOCKTRENDS_API_KEY
unset STOCKTRENDS_ENABLE_PAID_TOOLS
unset STOCKTRENDS_ENABLE_PAID_EXECUTION
unset STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION
unset STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL
unset STOCKTRENDS_MAX_STC_PER_SESSION
unset STOCKTRENDS_MAX_USD_PER_SESSION

# Confirm nothing remains (should print nothing), then restart.
env | grep '^STOCKTRENDS_' || echo "no STOCKTRENDS_* variables set"
npx @modelcontextprotocol/inspector node dist/server.js
```

After restart, the surface must match §4 exactly: one tool, no paid tools, zero
prompts, public resources visible, no key required.

## 7. What this runbook does not validate

This runbook validates tool/resource *visibility* only. It explicitly **does
not**:

- validate live paid execution;
- validate API key authorization against paid endpoints;
- validate billing, settlement, or `observed_cost`;
- validate x402, wallet, or payment headers;
- validate remote MCP transport;
- validate database or control-plane behavior;
- validate investment advice or Intelligence Agent recomputation.

Those surfaces are either out of the product scope entirely (x402/wallet, OAuth,
remote MCP, database/control-plane, advice/recomputation — see
[`README.md`](../README.md) *Current Status* → Excluded) or are exercised only
under the separate, exceptional, operator-supervised live-validation process in
[`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md).

## 8. Failure modes / troubleshooting

If any observed behavior differs from the expected surface, stop and use the safe
next action below. Do not "work around" an unexpected result by invoking a paid
tool or enabling execution.

| Symptom | Likely cause | Safe next action |
| --- | --- | --- |
| **Inspector shows no tools.** | Build not run, `dist/server.js` missing, or the Inspector launched against the wrong path. | Stop. Run `npm run build`, confirm `dist/server.js` exists, and relaunch with the exact §4 command. |
| **Paid tools visible in default mode.** | A paid variable (`STOCKTRENDS_ENABLE_PAID_TOOLS` + a key) is still set in the shell from a prior session. | Stop. Run the §6 rollback to clear all `STOCKTRENDS_*` variables, restart, and re-verify the one-tool surface before continuing. |
| **Paid tools not visible in paid-exposed mode.** | Exposure needs **both** `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** `STOCKTRENDS_API_KEY` set; one is missing or the shell was not re-launched. | Set both (placeholder key only), relaunch the Inspector, and re-check. Do not enable execution or set caps to force visibility. |
| **Prompts appear unexpectedly.** | The server registers zero MCP prompts; a non-empty prompts panel is unexpected. | Stop and report. Do not proceed; capture the discrepancy (no secrets) for review against the documented zero-prompt surface. |
| **Execution flag was accidentally set true.** | `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` was set, contrary to this runbook. | Stop immediately. Do **not** invoke a paid tool. Run §6 rollback (execution `false`/unset, caps unset, key removed) and restart before any further inspection. |
| **Public resources not visible.** | Server did not start cleanly, or the Inspector connected before the server was ready. | Stop the session, re-launch with the §4 command, and confirm the server started without error before re-checking the resource list. |
| **A suspicious secret appears in a terminal, log, or screenshot.** | A real key was pasted or captured, contrary to the placeholder-only rule. | Stop. Treat the key as compromised: rotate/revoke it out of band, delete the offending log/screenshot, and never commit it. Re-run using a placeholder only. |

---

**Reminder:** This runbook stops at tool/resource visibility. It documents no live
paid execution, invokes neither `stocktrends_get_stim_latest` nor
`stocktrends_get_stim_history`, sets no nonzero caps, never enables
`STOCKTRENDS_ENABLE_PAID_EXECUTION`, and uses placeholder credentials only.
