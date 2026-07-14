# Phase 5F x402 Value-Policy Mismatch Investigation

Date: 2026-07-14

## 1. Executive conclusion

The live PR #77 failure does not identify a rejected live field, path, value, or type. The code `x402_live_challenge_value_not_approved` is emitted by seventeen validation branches, so it must not be treated as a root-cause code.

Current local API source does, however, expose a concrete source/validator mismatch before any live observation is needed. The compact core builder in `payments/x402.py` creates the canonical seven-key challenge shape expected by the merged MCP validator. The final response assembly in `middleware/metering.py` then replaces `accepted_payment_methods: ["x402"]` with the route policy's full enabled-rail list. Under the repository's default route policy for `GET /v1/market/regime/latest`, that list contains three rail identifiers. The MCP validator requires the array to contain exactly one element, `"x402"`, and therefore returns `x402_live_challenge_value_not_approved` at `src/x402Relay.ts:1150-1158` before it examines the rest of the challenge.

That final-response mismatch is confirmed from current source, while existing API tests independently confirm the default multi-rail condition on other registered paid routes. The tests do not prove the target route's exact final list, and the mismatch is not proven to be the field rejected in PR #77. The deployed API revision and effective runtime policy are not identified by any local deployment marker. A runtime policy overlay can also alter the enabled-rail list.

There is a second current-source incompatibility behind the first one. For a registered route, final response assembly adds the rich `stocktrends_preview` object even when the payment requirements use compact Bazaar metadata. If the outer payment-method list were synthetically narrowed to `["x402"]`, the current MCP generic-extension rules would reject that rich preview as `x402_live_challenge_prohibited_material`, including because its descriptive preview keys contain payment and HTTP-method semantics outside the explicitly allowed compact Bazaar paths.

The narrowest justified next PR is one MCP final-response-envelope reconciliation: add exact synthetic fixtures for the current API-authored outer payment-method metadata and bounded rich preview, then permit only those descriptive forms while keeping the x402 requirement, payment, proof, route, resource, and paid-output controls unchanged. A diagnostic-stage refinement is feasible and can remain value-free, but it is not the first correction justified by this investigation.

## 2. Known live facts and strict limitations

The consumed PR #77 authorization established only these live facts:

- exactly one no-key `GET` was sent to `/v1/market/regime/latest`;
- the response status was HTTP `402`;
- the standard `Payment-Required` header name was present;
- a body was present and stayed within the configured cap;
- the MCP returned `x402_live_challenge_value_not_approved`;
- no raw or decoded challenge value was retained; and
- there was no retry, second route, proof, payment, spend, paid output, or paid-output request.

The following are not known from that observation:

- which of the seventeen branches emitted the coarse code;
- the rejected field path, value, JSON type, or semantic category;
- the deployed API source revision;
- the effective deployed payment-policy overlay;
- the deployed x402 challenge mode or environment-derived builder inputs; or
- whether the deployed response exactly matched either current local source or any historical local revision.

This investigation did not retrieve the previous response, inspect logs containing live values, or reuse the consumed authorization.

## 3. Investigation scope

The investigation was source-first and offline. It covered:

- the governing Phase 5F MCP reports and plan;
- the merged MCP client, validator, policy, configuration, tool, and tests;
- local MCP history covering PR #72 through PR #77;
- the authoritative local API route, policy, pricing, x402 builders, endpoint metadata, response middleware, serialization, and tests;
- local API Git history affecting those seams; and
- local deployment-related documentation and revision markers.

It did not modify runtime code, tests, packages, configuration, fixtures, snapshots, deployment files, or registrations.

## 4. Source repositories and revisions inspected

| Repository | Checkout | Revision inspected | State used |
|---|---|---|---|
| `stocktrends-mcp-server` | `C:\Users\skort\Projects\stocktrends-mcp-server` | `78409c721e33cdfdf56d9b4646c5f44bb391c229` | branch `docs/phase5f-x402-value-policy-investigation`; local `main` and local `origin/main` refs resolved to the same revision without fetching |
| `stocktrends_api` | `C:\Users\skort\Projects\stocktrends_api` | `6b9ee57fa4216754bfe0d9892d83a48c01d57fef` | clean detached checkout; local `main` resolved to the same revision |

The MCP local history inspected for the requested PR interval was:

| PR | Local merge revision |
|---|---|
| #72 | `5b44662d736586c0fe7e39fdc41393c1f396fd00` |
| #73 | `0500074769f39c9ba143270d4bfd7fb9249b75f0` |
| #74 | `cef08e1753b53e31ddf78c45c3b7e6b91752851e` |
| #75 | `8f69e5c5ab4c78593d771670f88f19c23fa1a073` |
| #76 | `487865e2a49a4cf1e511b82922e308f6d20a6051` |
| #77 | `78409c721e33cdfdf56d9b4646c5f44bb391c229` |

No remote ref was refreshed and no external repository was queried.

## 5. Current MCP error-emission map

All production emissions of `x402_live_challenge_value_not_approved` are in `validateCanonicalLiveChallenge()` in `src/x402Relay.ts`. The function is reached after response/header parsing and bounded-tree checks through the production relay call chain. Seventeen return sites collapse semantically different failures into this one code.

| Location | Validation stage and input subtree | Exact rejected condition | Possible rejected value categories |
|---|---|---|---|
| `src/x402Relay.ts:1144` | challenge root | any top-level body key outside the seven canonical keys plus optional `stocktrends_preview` | unknown key; alias; middleware-added field |
| `src/x402Relay.ts:1158` | challenge root literals and methods | wrong `error`, `detail`, or `protocol`; `accepted_payment_methods` not an array; not exactly one element; or element not `"x402"` | string, array cardinality, non-string element, multi-rail array |
| `src/x402Relay.ts:1162` | `pricing` structure | not a plain object or keys not exactly `amount_usd`, `unit`, `network`, `token`, `scheme` | null, array, omitted key, extra key, alias |
| `src/x402Relay.ts:1172` | `pricing` values | amount not a positive fixed-six string; unit not `"request"`; network/scheme not bounded identifiers; token not an EVM-address-shaped string | number, zero/negative/malformed string, empty/oversized identifier, malformed address |
| `src/x402Relay.ts:1176` | `payment_required` root | not a plain object | null, array, string, scalar |
| `src/x402Relay.ts:1180` | requirements structure | keys not exactly `x402Version`, `resource`, `accepts`, `extensions` | older v2 shape, omitted key, alias, extra key |
| `src/x402Relay.ts:1183` | requirements version | `x402Version` is not the integer protocol version `2` | numeric string, fractional number, other integer, boolean |
| `src/x402Relay.ts:1186` | `payment_required.resource` | not a plain object with exactly the six ResourceInfo keys or any field has the wrong approved type/value class | legacy string resource, missing/extra key, non-string field, non-array tags |
| `src/x402Relay.ts:1189` | `payment_required.accepts` | not an array of exactly one requirement | null, object, empty array, multiple requirements |
| `src/x402Relay.ts:1194` | accepted requirement structure | first entry not a plain object with exactly `scheme`, `network`, `amount`, `asset`, `payTo`, `maxTimeoutSeconds`, `extra` | older key name, omitted/extra key, scalar entry |
| `src/x402Relay.ts:1197` | accepted scheme/network syntax | either value is not a bounded identifier | non-string, empty, malformed, oversized identifier |
| `src/x402Relay.ts:1211` | accepted payment values | atomic amount not a positive canonical integer string; asset/payee not EVM-address-shaped; timeout not a positive safe integer JSON number; or `extra` not a plain object | number versus string, zero, leading zero, malformed address, string/fractional/zero timeout, null/array extra |
| `src/x402Relay.ts:1219` | pricing/requirement equality | pricing network, token, or scheme differs from the accepted requirement | structurally valid but unequal strings, including case differences |
| `src/x402Relay.ts:1228` | accepted `extra` | required extra keys/types, copied resource, bounds, or unknown benign extension content is invalid without being prohibited | missing `name`/`version`/`resource`, null optional field, resource mismatch, oversized/deep content |
| `src/x402Relay.ts:1240` | structural equality and route binding | copied resource objects differ; outer `resource` is not the same string; or resource is neither the exact route path nor the exact canonical route URL for the configured origin | relative/absolute mismatch, wrong origin/path, query/fragment, serialization or copy drift |
| `src/x402Relay.ts:1251` | requirements extensions | extension object is structurally invalid, over bounds, or contains an unapproved non-prohibited shape | null/array root, excessive depth/size/members, malformed compact Bazaar shape |
| `src/x402Relay.ts:1260` | optional `stocktrends_preview` | preview is structurally invalid or over bounds without a prohibited semantic key | null/array root, excessive depth/size/members, invalid key/value type |

Related failures use distinct adjacent classifications:

- a successful `2xx` response without proof, or a response whose bounded-tree scan detects paid-output carriers without proof, uses `x402_live_challenge_paid_output_without_proof`;
- a transport failure before any response is received and a received non-`402` status not already classified by the earlier paid-output branch are grouped under `x402_live_challenge_unexpected_status`; the transport case has no HTTP response status to report;
- an oversized response body, missing canonical root keys, a non-object body, or another invalid bounded JSON tree uses `x402_live_challenge_unexpected_shape`;
- invalid bounded tool input uses `x402_tool_input_invalid` before signature reservation and before any outbound request;
- a malformed or missing standard header and decoded header/body inequality have their own header classifications;
- prohibited proof, authorization, payment, settlement, transaction, facilitator, method-authority, or protected shadow-key material uses `x402_live_challenge_prohibited_material`;
- a syntactically valid but unsupported accepted network uses `x402_live_challenge_network_unsupported`; and
- canonical value-policy failures remain `x402_live_challenge_value_not_approved` at the seventeen production return sites mapped above.

The whole-response bounded scan does not emit `x402_live_challenge_value_not_approved`. It supplies shape, prohibited-material, and paid-output classifications before or around canonical validation. Therefore the live code proves that a value-policy branch was reached, but it does not identify a subtree.

## 6. Current API contract reconstruction

### Final response body

For this registered route, current local source assembles the following response shape. All value-bearing entries below are symbolic categories, not observed or production values.

```text
{
  error: "payment_required",
  detail: "Payment is required to access this endpoint.",
  protocol: "x402",
  resource: <canonical-resource-url-or-route-path>,
  pricing: {
    amount_usd: <runtime-fixed-six-usd-string>,
    unit: "request",
    network: <canonical-eip155-network>,
    token: <evm-address>,
    scheme: <bounded-scheme-identifier>
  },
  accepted_payment_methods: ["subscription", "x402", "mpp"],
  payment_required: <requirements-object>,
  stocktrends_preview: <registered-route-rich-preview-object>
}
```

The first seven keys are mandatory at the core-builder boundary. The core builder initially authors `accepted_payment_methods: ["x402"]`; current final-response middleware replaces it with the exact default-policy array shown above. A runtime policy overlay can change that final array. `stocktrends_preview` is optional in the general response contract, but current final-response middleware adds it for a route found in the endpoint registry. Unknown routes omit it.

### Requirements and accepted entry

```text
payment_required: {
  x402Version: 2,
  resource: {
    url: <canonical-resource-url-or-route-path>,
    description: <bounded-route-description-string>,
    mimeType: "application/json",
    serviceName: <bounded-service-name-string>,
    tags: [<bounded-tag-string>, ...],
    iconUrl: <bounded-icon-url-string>
  },
  accepts: [{
    scheme: <bounded-scheme-identifier>,
    network: <canonical-eip155-network>,
    amount: <runtime-atomic-unit-string>,
    asset: <evm-address>,
    payTo: <evm-address>,
    maxTimeoutSeconds: <positive-integer-json-number>,
    extra: {
      name: <bounded-token-name-string>,
      version: <bounded-token-version-string>,
      assetTransferMethod: <optional-bounded-transfer-method-string>,
      resource: <structural-copy-of-resource-object>
    }
  }],
  extensions: <compact-bazaar-extension-object>
}
```

`assetTransferMethod` is optional and omitted when the source configuration is empty. The other three `extra` keys are mandatory in the current builder. The MCP contract requires both runtime amount strings to represent positive values, but the API formatter and converter do not themselves establish that positivity.

### Compact Bazaar extension

`build_compact_bazaar_extension()` supplies a Bazaar extension object for the route and method. Its source-authored route metadata includes these paths and JSON types:

| Path category | Source-authored type/shape |
|---|---|
| extension root | object with exactly `bazaar` |
| `bazaar` | object with exactly `info` and `schema` |
| compact info identity | string `title`, `description`, `category`, `family`, `tools_manifest`, `metadataUrl`, `schemaUrl`; route-specific string `role` |
| `input` | object with `type: "http"`, `method: "GET"`, and empty-object `queryParams` |
| input schema | object-schema tree with string `$schema`/`type`, object `properties`, array `required`, and boolean `additionalProperties` |
| `output` | object with `type: "json"`, `format: "application/json"`, and a synthetic example object |
| output schema | object-schema tree with string `$schema`/`type`, object `properties`, array `required`, and boolean `additionalProperties` |
| pricing catalog reference | string metadata reference; it does not copy a live price into the extension |

For this no-input route, the compact input schema has an empty properties object, an empty required array, and `additionalProperties: false`. The compact output example is schema-oriented synthetic metadata, not paid output.

### Rich preview added outside the compact builder

`build_endpoint_preview()` creates the separately injected `stocktrends_preview`. Its current roots are:

- `endpoint`: object of string route descriptors plus boolean `requires_payment`;
- `investment_agent_value`, `input_rule`, `input_location`, `parameter_source`, `output_summary`: string or nullable descriptive values according to registry metadata;
- `supported_rails`: array of strings;
- `required_inputs` and `optional_inputs`: objects;
- `safe_example_request`, `response_shape`, `example_object`: objects;
- `notes`, `related_endpoints`, `next_recommended_calls`: arrays;
- `pricing`: object with string or nullable pricing-rule/cost categories and string unit/catalog reference; and
- route-specific analytical or interpretation metadata when present.

This rich preview is not created by `build_compact_bazaar_extension()` and is not carried inside `payment_required.extensions`.

## 7. `/v1/market/regime/latest` builder trace

1. **Route registration.** `routers/market.py:14-28` registers `GET /market/regime/latest` on the market router. `main.py:389-424` includes that router in the v1 application and mounts it at `/v1`, producing `/v1/market/regime/latest`.
2. **Endpoint metadata lookup.** `discovery/endpoint_metadata.py:1067-1088` contains the route registry entry. The compact and rich builders resolve this entry through the registry lookup functions.
3. **Pricing resolution.** `payments/policy_provider.py:281-287` maps the exact method/path to pricing rule `market_regime_latest` and the default enabled rails. `pricing/classifier.py:253-275` selects an agent-payment decision for an unauthenticated request when agent pay is enabled. `middleware/metering.py:257-323` resolves the runtime unit price from `api_pricing_rules`; missing or failed pricing resolution produces a zero-valued source result rather than a source-static route amount. `safe_decimal()` preserves a successfully parsed negative `Decimal` and does not enforce positivity.
4. **Resource construction.** `payments/x402.py:272-329` joins the configured API base with the route when a base is configured, resolves the route description, and constructs the six-key ResourceInfo object. It copies that object into accepted `extra.resource`.
5. **Compact Bazaar construction.** The same requirements builder normalizes challenge mode and calls `build_compact_bazaar_extension()` for compact mode. `discovery/endpoint_metadata.py:2726-2798` builds the registry-backed compact object and schemas.
6. **Requirements construction.** `build_x402_requirements()` creates the exact four-key requirements object and the one-entry accepted array shown above. `_to_atomic_units()` produces an integer string but does not reject zero or negative input.
7. **Challenge body construction.** `payments/x402.py:356-399` formats the USD amount as a six-decimal string and creates the canonical seven-key outer body with `accepted_payment_methods: ["x402"]`; that formatting also preserves a negative sign.
8. **Standard header construction.** The same function serializes the requirements object as compact JSON, UTF-8 bytes, then base64 for the standard payment-required header. The header represents the same requirements object placed in the body.
9. **Enforcement response construction.** `payments/enforcement.py:46-90` calls the challenge builder when the payment material is absent and returns the body/header pair to metering middleware.
10. **Final middleware and serialization.** `middleware/metering.py:1239-1298` shallow-copies the body, replaces the outer accepted-method list with the effective route-policy list, injects the rich route preview, constructs `JSONResponse`, attaches `PAYMENT-REQUIRED`, and adds pricing/accepted-method response headers. Request-ID middleware adds a request-ID header after the response; the MCP relay retains only its presence, never its value.

Environment-dependent source inputs include challenge mode, network, scheme, token identity metadata, asset-transfer method, decimal conversion, payee, and API base URL. Payment-policy configuration can also be loaded through a runtime overlay. No environment values were inspected.

Symbolically, for a runtime price `p < 0`, the source can produce a negative fixed-six USD string from `f"{p:.6f}"` and a negative atomic-unit string from `str(int((p * 10^d).quantize(1)))`. The MCP rejects that result at its positive pricing predicate under `x402_live_challenge_value_not_approved` before reaching the accepted atomic-amount predicate. A zero runtime price is rejected by the same pricing predicate. Neither zero nor negative runtime pricing can be confirmed or excluded without operational pricing data.

## 8. Offline source-generated compact fixture result

The result has two boundaries that must not be conflated:

1. **Core builder boundary: compatible.** The exact compact core shape from `build_x402_challenge()` matches the source-shaped compact fixture already exercised through the actual merged MCP relay validator in `tests/x402Relay.test.ts`. That existing injected-seam test passes the canonical seven-key body, header/body requirements equality, ResourceInfo, accepted entry, copied resource, and compact Bazaar validation. Source comparison found no current core-builder field that differs from that accepted contract.
2. **Final route response boundary: incompatible.** Current local default final-response source replaces the one-element outer methods array with the route policy's three enabled rail identifiers. `tests/test_402_preview.py:527-535` independently confirms inclusion of the default rails on the registered paid route `/v1/indicators/latest`; because it converts the list to a set and uses a subset assertion, it does not prove exact cardinality, exact ordering, or the target route's final list. The exact default rail list for `/v1/market/regime/latest` is established by its `EndpointPaymentPolicy` in `payments/policy_provider.py:281-287`, the effective-policy return path in `get_accepted_payment_methods_for_path()`, and final-response assembly in `middleware/metering.py:1261-1274`. The MCP's first applicable check is `src/x402Relay.ts:1150-1158`, so the deterministic first rejection category is `challenge-root-value`, path `accepted_payment_methods`, value category `multi-element array of bounded rail strings`, coarse result `x402_live_challenge_value_not_approved`.

A temporary, untracked bridge test was prepared to invoke the actual Python builder and feed only its synthetic output into the actual TypeScript relay seam. The managed execution policy did not authorize running a newly created unsandboxed cross-repository harness. The harness was deleted immediately and was not replaced with an indirect workaround. It printed no challenge object and made no network request.

Consequently, this report does not claim a newly executed one-process API-builder-to-MCP-validator fixture. The pass statement for the core boundary rests on exact source equivalence plus the existing merged MCP source-shaped test. The final-response failure rests on exact current target-route policy and final-assembly source plus exact validator precedence; the API test independently confirms the default-rail/multi-element condition on another registered paid route without proving the target route's exact cardinality or ordering. This limitation does not make the rejected category in the current local final source ambiguous, but it prevents describing the result as a fresh cross-repository execution.

The PR #77 live failure was **not** reproduced in a way tied to the deployed response. The same coarse code is deterministically reached by the current local final-response shape under source/validator analysis, but deployment-source alignment is unknown.

## 9. Synthetic candidate matrix

The matrix is bounded to candidates derived from current source, current validator branches, existing tests, or relevant local history. “Outcome” is either covered by an existing test or derived from the exact validator predicate and precedence; no arbitrary JSON search was used.

| Candidate and source basis | Synthetic mutation/category | MCP outcome | Same coarse code? | Plausible for deployed route | Confidence |
|---|---|---|---|---|---|
| Current compact core builder; MCP source-shaped fixture | canonical seven-key body, positive symbolic values, compact Bazaar, one x402 method | pass | no | yes as the enforcement boundary | confirmed |
| Current final middleware and target route's effective default policy; API default-rail inclusion test on another paid route | replace outer methods with the three enabled target route-policy rails | `x402_live_challenge_value_not_approved` at root literals/methods | yes | yes; exact current default source | confirmed |
| Current final middleware with an x402-only overlay | retain `["x402"]` and omit preview for component isolation | pass | no | possible only if effective policy and route registration produce that shape | plausible |
| Current rich preview with methods synthetically narrowed | add current registered-route rich preview outside Bazaar | `x402_live_challenge_prohibited_material` | no | yes in current final source, but masked by the earlier methods failure under default policy | confirmed |
| Runtime pricing lookup failure/default | zero fixed-six price and corresponding zero atomic amount | `x402_live_challenge_value_not_approved` at pricing before accepted amount | yes | source-derived possible on a missing/failed pricing row; cannot be confirmed or excluded without operational pricing data | weak |
| Negative runtime pricing row | for symbolic `p < 0`, a negative fixed-six USD string and negative atomic-unit string | `x402_live_challenge_value_not_approved` at pricing before accepted amount | yes | current `safe_decimal()` and `_to_atomic_units()` do not reject the negative value; cannot be confirmed or excluded without operational pricing data | weak |
| USD JSON type/format mutation | JSON number, inappropriate numeric precision, or malformed fixed-six formatting introduced outside the source formatter | `x402_live_challenge_value_not_approved` | yes | current builder always emits a fixed-six string | excluded current source |
| Atomic amount format mutation | JSON number, invalid leading-zero string, decimal string, or other malformed integer string | `x402_live_challenge_value_not_approved` | yes | current converter emits a base-ten integer string; runtime-price sign/value cases are classified separately above | excluded current source |
| Payee configuration category | empty or non-address-shaped payee string | `x402_live_challenge_value_not_approved` | yes | environment-dependent source path exists; value not inspected | plausible |
| Network spelling/configuration | syntactically valid but noncanonical network | `x402_live_challenge_network_unsupported` | no | environment-dependent source path exists | plausible, different code |
| Pricing/accepted network disagreement | individually valid unequal identifiers | `x402_live_challenge_value_not_approved` | yes | current builder passes one variable into both positions; no current post-builder mutation found | excluded in current source |
| Address casing | mixed-case hexadecimal address characters | pass address-shape checks | no | possible but not a mismatch cause by itself | excluded |
| Timeout type/value | string, fractional number, zero, or negative number | `x402_live_challenge_value_not_approved` | yes | current enforcement path supplies a positive integer source default; no overlay was found | weak |
| Optional transfer method | omit key | pass | no | current source-supported | confirmed |
| Optional transfer method | explicit null or non-string | `x402_live_challenge_value_not_approved` | yes | current source emits a non-empty string or omits the key | excluded |
| Unknown accepted `extra` content | bounded benign field | pass generic extension validation | no | no current route source adds one | weak |
| Protected/shadow accepted `extra` content | proof/payment/authority field | `x402_live_challenge_prohibited_material` | no | no current route source adds one | excluded current source |
| Resource form | exact route path or exact configured-origin route URL | pass | no | current source-supported | confirmed |
| Resource normalization drift | wrong origin/path, query, fragment, slash difference, or inconsistent copies | `x402_live_challenge_value_not_approved` | yes | configured origin can affect the builder; no post-builder resource mutation found | plausible |
| Unknown outer response key | middleware-added non-allowlisted root | `x402_live_challenge_value_not_approved` | yes | no current source path found beyond the allowlisted preview | weak |
| Response/header requirements divergence | mutate requirements after header serialization | `x402_live_challenge_header_body_mismatch` | no | current middleware mutates only outer fields and preview | excluded current source |
| Historical pre-canonical-v2 requirements | requirements without current ResourceInfo/extensions shape; accepted entry with older keys | `x402_live_challenge_value_not_approved` at requirements or accepted exact-key checks | yes | possible only if an older revision remains deployed | confirmed historical, deployment unknown |
| Historical pre-`ef3799e...` ResourceInfo | omit the later-added ResourceInfo service fields | `x402_live_challenge_value_not_approved` at original `payment_required.resource` validation | yes | possible only if an older revision remains deployed | confirmed historical, deployment unknown |
| Historical pre-`a4630dc...` accepted extra | omit or incompatibly shape the copied `accepted[0].extra.resource` | `x402_live_challenge_value_not_approved` at accepted-extra validation | yes | possible only if an older revision remains deployed | confirmed historical, deployment unknown |
| Rich challenge mode selection | select full/rich Bazaar instead of compact | bounded Bazaar-specific outcome depends on exact selected source revision and object | not established by a fresh bridge | environment-selectable, but local operations guidance specifies compact for production | weak |

## 10. Relevant API Git-history findings

Local history shows multiple contract transitions relevant to the same coarse validator code:

| Revision | Source change | Relevance to current MCP |
|---|---|---|
| `84c77e8039500b111bd6211edc78acb62ef5baba` (2026-04-18) | final middleware began replacing the builder's selected-rail list with the endpoint policy's full accepted-method list | establishes the current outer multi-rail source path that reaches the root value-policy branch |
| `5affe2cac1230da7393559f924ce2a038b01287b` (2026-04-25) | final middleware added endpoint preview injection | establishes the separately validated rich preview outside requirements extensions |
| `8c05813b532db692d4607537a54ffdbd0b4175c5` (2026-05-04) | introduced the canonical v2 ResourceInfo/extensions direction | its parent used an older requirements/accepted shape that current exact-key checks reject with the same coarse value code |
| `5a369b023bc4cdc2f8991751249fa7f0c5a33200` (2026-05-08) | added registry-backed endpoint metadata including the market-regime route | supplies the route-specific preview and Bazaar metadata source |
| `ad4246e695916df7c96f71fd435964f18c7b4f0a` (2026-05-16) | introduced compact challenge mode | created the compact Bazaar selection now expected by MCP |
| `cb2146078e6da7a595c8fda70a03f23204c995ab` (2026-05-20) | made compact mode the default while preserving rich final preview injection | explains why “compact requirements” does not imply a compact-only outer response |
| `b31b869c1ccce3e0a44a08c37c6b5bff068f24a1` (2026-05-20) | normalized compact schema construction | relevant to exact compact Bazaar paths and boolean/array/object types |
| `ef3799e45fa357e9e047ee5b3392af67438bec65` (2026-05-22) | introduced the ResourceInfo service fields `serviceName`, `tags`, and `iconUrl` | its parent has an older three-field ResourceInfo shape that would fail the current MCP's exact top-level/requirement `resource` validation |
| `a4630dc99d833a98d513e462cd2da3519d2a4d8d` (2026-06-02) | refactored the already-six-field ResourceInfo into a reusable object and added a structural copy under `accepted[0].extra.resource` | absence or incompatible shape of that copied resource reaches accepted-extra validation, not the original top-level/requirement ResourceInfo branch |

These are distinct validator boundaries: `payment_required.resource` is checked as the original top-level/requirement ResourceInfo before the accepted entry, while `accepted[0].extra.resource` is checked later as a required structural copy during accepted-extra validation. The historical shapes demonstrate that source/version drift can reproduce the coarse error, but they do not prove that either historical revision was deployed.

## 11. Deployment-source alignment assessment

Classification: **unknown**.

Evidence inspected locally:

- no Git tag identifies a deployed revision;
- no checked-in container manifest, release manifest, deployment SHA, image digest, or environment-specific revision marker was found for this route;
- the API's application version string is generic and does not bind to a Git commit;
- `run_api.bat` is local-development guidance, not production revision evidence; and
- `docs/operations/stim_policy.md` states that compact challenge mode is the production default and warns against full/rich mode except for debugging, but does not identify a deployed commit or effective environment.

The current local source can itself reach the observed coarse code, so deployed-source drift is not required as an explanation. That is an inference about sufficiency, not evidence that the deployed service is aligned. No local artifact directly confirms alignment or proves drift.

## 12. Confirmed findings

1. Seventeen production branches emit `x402_live_challenge_value_not_approved`.
2. Semantically distinct root, pricing, requirements, accepted-extra, extension, and structural-equality failures collapse into that code.
3. Whole-response prohibited-material and paid-output scans normally use different codes.
4. The current API compact core builder authors the exact canonical requirements shape represented by the existing passing MCP source-shaped fixture.
5. Current final middleware changes the outer accepted-method array after the challenge/header pair is built.
6. The default route policy for `GET /v1/market/regime/latest` contains three enabled rails, and current final-response assembly writes that effective policy list into the body. An existing API test independently confirms inclusion of the default rails on another registered paid route, but does not assert exact cardinality, exact ordering, or the target route's final list.
7. That current final source shape first reaches the MCP root value-policy branch and returns the same coarse code as PR #77.
8. Current final source also injects a rich preview outside compact Bazaar requirements; if reached after correcting the methods mismatch, current generic-extension policy classifies it as prohibited material.
9. The standard header remains a serialization of the original requirements object; current outer-method and preview mutations do not create a header/body requirements mismatch.
10. Local history contains older requirements and resource-copy shapes that also reach the same coarse value code.
11. No local deployment marker identifies the deployed API revision.

## 13. Excluded hypotheses

The following are excluded as explanations arising from the current local builder path, though malformed synthetic objects can still make the validator reject them:

- a malformed JSON-number type, inappropriate numeric precision, or malformed fixed-six `pricing.amount_usd` string introduced by the current builder; it formats a fixed-six string explicitly;
- an invalid leading-zero, decimal, malformed, or JSON-number atomic amount introduced by the current converter; it emits a base-ten integer string;
- address letter casing alone; the validator accepts either hexadecimal letter case;
- a timeout string or fractional number from the current enforcement call; current source supplies an integer default;
- explicit null for the optional transfer method; current source emits a non-empty string or omits it;
- pricing/accepted network, token, or scheme inequality introduced by the core builder; it writes the same inputs into both places;
- header/body requirements divergence from current final middleware; the middleware mutates only outer fields and preview;
- an extra live retry, payment, proof, paid-output request, or second route in PR #77; the retained omission-only evidence already excludes them.

An unsupported network is not excluded as a possible deployment configuration issue, but it would normally produce `x402_live_challenge_network_unsupported`, not the observed coarse value-policy code.

## 14. Remaining plausible hypotheses

The live field remains unknown. Source-derived hypotheses that can still fit the observed code include:

- the deployed final response used a multi-rail outer `accepted_payment_methods` array, as current default local source does;
- deployed pricing resolution produced a zero value, or a negative runtime pricing row passed through `safe_decimal()` and `_to_atomic_units()`, reaching the positive-price check; both are weak source-derived hypotheses that cannot be confirmed or excluded without operational pricing data;
- an environment-derived payee or resource-origin category failed its shape/binding predicate;
- a policy overlay changed the final enabled-rail list or otherwise changed route response metadata;
- the deployed service used an older requirements or ResourceInfo revision still rejected by current exact-key rules;
- an untracked deployment/middleware difference added an unknown outer key or altered a copied resource; or
- challenge-mode or serializer behavior differed from the current local source.

The first hypothesis has the strongest current-source basis. It is not labeled the PR #77 root cause because no deployment revision or rejected live category was retained.

## 15. What remains unknowable

Without another separately authorized observation or direct non-network deployment-revision evidence, this investigation cannot determine:

- the exact live rejected branch, path category, JSON type, or value category;
- whether the live response used the current default three-rail outer list;
- the effective deployed policy overlay, challenge mode, pricing result, payee category, network, resource origin, or serializer behavior;
- whether the deployed API was at the current local revision or one of the historical shapes; or
- whether a current-source correction alone would make the deployed response pass every later validator stage.

No inference from `x402_live_challenge_value_not_approved` can resolve those unknowns.

## 16. Recommended next PR

Recommend exactly one next PR: **MCP final-response-envelope reconciliation for the current authoritative API shape, with synthetic fixtures.**

That PR should:

- add an exact synthetic final-response fixture for `/v1/market/regime/latest` using symbolic non-production values;
- distinguish the descriptive outer enabled-rail list from the single x402 requirement in `payment_required.accepts`;
- validate only the exact current enabled-rail vocabulary and bounded array form rather than permitting arbitrary outer methods;
- add an exact bounded schema for the current route preview, or an equally narrow descriptive-preview policy, without granting payment, proof, request, route-override, settlement, transaction, facilitator, or paid-output authority; and
- prove that all existing prohibited-material, resource-binding, header/body equality, no-proof, and no-paid-output controls remain fail-closed.

This is one seam and one agenda: reconcile the MCP validator with the authoritative API's final response envelope. It should not change relay execution, payment behavior, route policy, client headers, retries, or live diagnostics.

A diagnostic-stage refinement is not recommended *before this source-confirmed correction*. If a later offline fixture passes and another canary is separately authorized, diagnostic refinement may still be valuable, but it is not the narrowest next implementation PR established here.

## 17. Requirements before another live canary

Before any separately authorized live canary:

1. Land and test the final-response-envelope reconciliation described above.
2. Exercise a complete symbolic final-response fixture through the production MCP call chain offline, including standard header/body equality and the rich preview.
3. Keep the live operation one no-key GET, one approved route, no redirect follow, no retry, no payment/proof material, no paid-output request, and no second route.
4. Reconfirm names-only environment hygiene before the request; do not inspect values.
5. Reconfirm response-size caps, header-name-only retention, body-key-name-only retention, and fixed safe-text output.
6. Obtain fresh, explicit authorization. PR #77's authorization is consumed and cannot be reused.

### Omission-only diagnostic design assessment

A future diagnostic can identify a rejected category more precisely without retaining the rejected value. The validator can return a fixed internal enum such as:

- `challenge-root-value`;
- `pricing-value`;
- `requirement-value`;
- `accepted-extra-value`;
- `extension-value`;
- `bazaar-value`; or
- `response-value`.

A bounded validation-stage identifier is safer than a raw JSON path. It can remain stable, avoid identifiers embedded in dynamic paths, avoid values entirely, and be mapped to fixed safe text only. Implementing it would require runtime code and tests. It should preserve the existing public coarse error or expose only the fixed category under a separately reviewed omission-only contract. This design is feasible, but it is not implemented in this PR.

## 18. No-live/no-value-retention confirmation

This investigation made no live call and no external network request. It did not use an API key, retrieve a previous live response, inspect environment values or secrets, contact the deployed API, query a remote Git repository, query a deployment control plane or registry, contact a facilitator, access remote MCP, use MCP Inspector, send proof or payment material, make a payment or spend, or request paid output.

No raw or decoded live challenge was available or retained. The report contains symbolic value categories only and does not reproduce a production address, amount, origin, identifier, credential, or raw challenge object. The temporary untracked diagnostic file was removed before documentation changes were finalized.
