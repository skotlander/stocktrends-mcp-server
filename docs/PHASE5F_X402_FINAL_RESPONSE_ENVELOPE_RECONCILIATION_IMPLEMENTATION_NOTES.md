# Phase 5F x402 Final-Response-Envelope Reconciliation Implementation Notes

Date: 2026-07-14

## 1. Problem addressed

The merged MCP validator accepted the compact x402 core challenge but did not accept the current final HTTP 402 envelope authored by the API middleware. The final middleware replaces the compact builder's one-element outer payment-method list with the effective endpoint rail policy and adds the registered route's rich `stocktrends_preview`. The MCP rejected the outer list first and, after a synthetic list correction, rejected the preview through generic extension semantics.

This change reconciles only that final-response envelope. It does not add payment execution, proof forwarding, another rail, another route, retry behavior, or paid-output handling.

## 2. PR #78 source findings

PR #78 established from current local source that:

- `payments/x402.py` authors compact core metadata with `accepted_payment_methods: ["x402"]`;
- `middleware/metering.py` replaces that outer field with the effective route-policy rail list before serializing the final response;
- the default policy for every one of the nine MCP-paid routes is the deterministic ordered tuple `subscription`, `x402`, `mpp`;
- the same final middleware adds the rich `stocktrends_preview` built from registered endpoint metadata;
- the outer rail list describes endpoint capabilities only;
- `payment_required.accepts` remains the executable x402 requirement; and
- the source-confirmed incompatibilities do not prove which exact field caused the PR #77 live rejection.

The API source inspected for this implementation was local revision `6b9ee57fa4216754bfe0d9892d83a48c01d57fef` in `<private-stocktrends-api>`. No remote repository or deployment source was queried.

## 3. Outer rail metadata authority boundary

`accepted_payment_methods` is validated as route-bound descriptive metadata. It is never consulted to choose a request route, HTTP method, credential mode, header, proof, payment mechanism, settlement path, retry, fallback, or output path.

The array does not authorize MPP or subscription execution. It cannot create a second executable requirement. The relay still executes only its separately bound one-attempt no-key `GET`, and only the inner `payment_required.accepts[0]` x402 requirement is treated as challenge authority.

## 4. Exact route-specific rail contracts

Current source establishes one deterministic form for all nine routes:

| MCP-bound route | Exact accepted outer array |
|---|---|
| `/v1/stim/latest` | `["subscription", "x402", "mpp"]` |
| `/v1/stim/history` | `["subscription", "x402", "mpp"]` |
| `/v1/indicators/latest` | `["subscription", "x402", "mpp"]` |
| `/v1/indicators/history` | `["subscription", "x402", "mpp"]` |
| `/v1/selections/latest` | `["subscription", "x402", "mpp"]` |
| `/v1/market/regime/latest` | `["subscription", "x402", "mpp"]` |
| `/v1/market/regime/history` | `["subscription", "x402", "mpp"]` |
| `/v1/breadth/sector/latest` | `["subscription", "x402", "mpp"]` |
| `/v1/leadership/summary/latest` | `["subscription", "x402", "mpp"]` |

`isApprovedDescriptivePaymentMethodsForRoute()` first enforces array type, non-empty content, maximum length 3, non-empty string elements, uniqueness, and required `x402` membership. It then compares the complete array, including order, with the exact contract for the invoked allowlisted route. Subsets, supersets, aliases, whitespace variants, case variants, unknown rails, and reordering fail closed. No current route has a second legitimate deterministic form or a different route policy.

## 5. Inner x402 executable-authority invariant

The existing inner requirement validation is unchanged:

- `payment_required.x402Version` is exactly integer `2`;
- `payment_required.accepts` contains exactly one entry;
- scheme, network, token/asset, and resource values remain exactly cross-bound;
- the network remains a supported canonical `eip155` identifier;
- amount remains a positive canonical atomic-unit string;
- asset and `payTo` remain exact EVM-address-shaped strings;
- `maxTimeoutSeconds` remains a positive safe integer;
- the resource object and its accepted-entry copy remain structurally identical;
- the top-level resource remains bound to the configured origin and invoked route;
- the decoded standard header remains structurally identical to body `payment_required`; and
- compact Bazaar requirements remain bounded and path-aware.

The outer rail list cannot widen `accepts`, change its cardinality, or grant MPP/subscription authority.

## 6. Current preview source trace

The final challenge branch in `middleware/metering.py` calls `get_endpoint_preview()`. That compatibility wrapper calls `build_endpoint_preview()` in `discovery/endpoint_metadata.py`. The builder reads the exact registered route entry, adds query-source annotations to input descriptors, copies the safe request, response-shape and symbolic example metadata, injects resolved pricing-rule and fixed-six cost strings, and adds only route-declared optional cognition/provenance branches.

The source trace included the directly invoked preview, route-policy, resource, requirements, compact Bazaar, pricing, and enforcement helpers, plus `tests/test_402_preview.py`. A local offline bridge imported only the data-only endpoint-preview builder and printed structural summaries and bounds. It used symbolic pricing inputs, made no network request, read no secret or environment value, printed no full final envelope, created no committed fixture, and left no temporary artifact. The final core fixtures were mirrored manually with symbolic values because importing the payment builder would initialize environment-derived payment configuration.

## 7. Exact preview schema and bounds

Every accepted preview must contain the following common root keys with exact spelling:

- `endpoint`
- `investment_agent_value`
- `supported_rails`
- `input_rule`
- `input_location`
- `parameter_source`
- `required_inputs`
- `optional_inputs`
- `safe_example_request`
- `response_shape`
- `example_object`
- `output_summary`
- `notes`
- `related_endpoints`
- `next_recommended_calls`
- `pricing`
- `analytical_role`

Route-specific mandatory additions are:

| Route family | Additional mandatory roots |
|---|---|
| ST-IM latest/history | `interpretation_dependency`, `interpretation_guidance`, `required_interpretation_steps`, `inference_contract`, `inference_provider`, `cognition_architecture` |
| Selections latest | `inference_contract`, `inference_provider`, `cognition_architecture`, `provenance_reference` |
| Market regime latest/history | `interpretation_guidance`, `provenance_reference` |
| Indicators, breadth, leadership | `provenance_reference` |

The route contract closes endpoint keys, pricing keys, input names, input-descriptor key sets, safe-query keys and scalar types, response-shape entries and order, symbolic example-object structure and values, related/next endpoint lists, analytical role, pricing-rule identity, cognition/provenance branches, and current closed vocabularies. `input_rule` is a bounded string only on the four symbol-input routes and is exactly `null` on the other five routes.

The dedicated iterative preview scan enforces:

| Bound | Limit | Current-source maximum |
|---|---:|---:|
| Depth | 4 | 4 |
| Members in one object | 23 | 23 |
| Aggregate object entries plus array elements | 224 | 224 |
| Array length | 27 | 27 |
| UTF-8 bytes in one string | 256 | 231 |
| UTF-8 bytes in one key | 32 | 31 |
| Validator-normalized serialized preview bytes | 8,192 | 7,726 |

Traversal is iterative and rejects non-finite numbers, non-plain objects, prototype-pollution keys, invalid JSON-like values, and any cap excess without recursion.

The 7,726-byte maximum is the serialized preview size measured by the validator after JSON parsing and JavaScript `JSON.stringify`. The observed compact Python API wire serialization for `/v1/stim/history` is 7,730 bytes. Numeric normalization can account for the difference, for example Python `0.0` becoming JavaScript `0` after parsing and reserialization. The validator limit remains 8 KiB, and both observed forms are below it. The validator measurement is not claimed to be an exact byte-for-byte measurement of the wire body.

## 8. Narrow descriptive-role allowances

Potentially authority-adjacent words are accepted only at exact source roles and expected types:

- `endpoint.method` is exactly `GET`;
- `endpoint.path` is exactly the invoked route;
- `endpoint.requires_payment` is exactly boolean `true`;
- `supported_rails` is exactly `["subscription", "x402", "mpp"]`;
- `safe_example_request.method` and `.path` are exactly `GET` and the invoked route;
- `pricing` has the exact five source keys, route-bound pricing-rule id, positive fixed-six cost strings, unit `request`, and catalog source;
- ST-IM's interpretation dependency has the exact descriptive endpoint/method/cognition roles;
- market-regime confirmation endpoints are exactly the two source-authored descriptive routes; and
- paid-output-like keys are allowed only inside the exact source symbolic `example_object`, whose complete route-specific object must match the approved template.

Pricing has an additional identity invariant. Outer `body.pricing.amount_usd` is validated first as the canonical positive fixed-six USD string, and that exact canonical string is passed unchanged into `stocktrends_preview` validation. `stocktrends_preview.pricing.stc_cost` and `stocktrends_preview.pricing.effective_price_usd` must each independently be canonical positive fixed-six strings. Exact string equality is then required:

```text
stocktrends_preview.pricing.stc_cost
=== stocktrends_preview.pricing.effective_price_usd
=== body.pricing.amount_usd
```

The comparison is literal. No alternate representation is accepted. Preview pricing cannot alter request execution, atomic amount, asset, payee, network, timeout, route, proof, payment, retry, fallback, second route, or paid-output handling. No trimming, normalization, rounding, floating-point conversion, or reformatting is performed. The MCP does not infer a USD-to-atomic conversion or identity. The inner x402 atomic amount remains separately validated by the existing canonical atomic-unit contract.

Preview pricing remains descriptive only. It cannot change payment execution, atomic amount, asset, payee, network, timeout, route, proof, payment, retry, or paid-output behavior. Pricing values remain omitted from MCP output, errors, metadata, and logs.

These roles are ignored after validation and do not influence execution.

## 9. Universal prohibitions retained

Unknown preview keys fail the closed schema. Proof, signature, authorization, authentication, credential, secret, private-key, wallet-seed, payment-execution, settlement, transaction/hash, facilitator, authority, override, amount/price, asset/token, recipient/address, network/chain, scheme, and timeout/expiry concepts outside the exact roles above retain prohibited-material classification.

The preview does not create a generic payment-word, confirmation-word, method/path, schema, example, or subtree exemption. Generic extension/Bazaar prohibitions elsewhere are unchanged.

## 10. Paid-output boundary

The whole-response scan remains earlier than safe-result construction. It now recognizes `stocktrends_preview.example_object` and preview-specific result carriers as output-sensitive. Only the complete route-specific source symbolic example is exempted. Changed example values, actual market-regime values, unknown `api_data`/`data`/`results`/`rows`/`records`, result sets, or arbitrary output objects remain classified as paid output without proof or fail the closed preview schema.

Response-shape strings remain descriptive schema metadata only. No paid API response is accepted or returned.

## 11. Safe omission

Outer rail values, preview values, pricing, amount, asset, payee, network, scheme, timeout, resource URL, header value, raw body, and rejected values are omitted from MCP text, structured output, metadata, errors, and logs. Public errors remain the existing stable coarse codes; no path or rejected value was added.

## 12. Source-shaped fixture strategy

`tests/x402Relay.test.ts` now constructs symbolic final-envelope fixtures for all nine exact tool/route bindings. They combine:

- symbolic canonical resources bound to each invoked route;
- symbolic `eip155` network and EVM addresses;
- positive symbolic atomic and fixed-six amounts;
- the exact current outer route-policy array;
- the existing compact Bazaar fixture;
- exact header/body requirements identity; and
- route-specific rich previews with symbolic descriptive strings and source-derived closed structure.

The tests invoke the merged production relay validator. They do not reimplement it and do not use production amounts, addresses, origins, credentials, or captured responses.

## 13. Tests added

Focused coverage now proves:

- exact ordered outer arrays pass on all nine routes;
- missing `x402`, unknown, duplicate, reordered, subset, superset, scalar, object, null, empty, excessive, case, separator, and whitespace variants fail;
- nested preview rails cannot repair the outer contract or widen the inner requirement;
- a second inner accepted entry still fails;
- all nine route previews and all four structural families pass;
- all nine exact-route positive fixtures pass with exact three-way string equality among outer `amount_usd`, preview `stc_cost`, and preview `effective_price_usd`;
- pricing-identity mismatch coverage rejects `stc_cost` alone, `effective_price_usd` alone, both preview values equal to each other but different from the outer value, and all three values pairwise inconsistent;
- representative pricing mismatches cover all four preview families;
- pricing-identity rejection coverage confirms no price or sentinel leakage and one request to the invoked route, with no retry, fallback, or second route;
- exact method, path, rail, pricing, confirmation, inference, and provenance roles pass;
- unknown/missing/mis-cased/mis-separated/misplaced preview roles fail;
- wrong scalar/container types and every dedicated bound fail;
- proof, payment, settlement, transaction, credential, secret, facilitator, authority, and override aliases fail;
- paid-output carriers and actual market-regime-shaped example values fail;
- preview/rail values remain omitted; and
- every route still performs one mocked/injected bound `GET` with no retry or second route.

The existing compact Bazaar, method/output-role, authority/transaction-state, URL, header, amount, network, route, stack, API-key, mock, cap/reservation, redirect, and proof-forwarding regressions remain in the same focused suite.

## 14. Capability boundaries unchanged

The server remains local stdio MCP only. The exact nine paid routes, `GET` only, no new parameters, one request, no retry, no fallback, no second route, literal-`true` flags, API-key mode, mixed-mode early failure, and no-key behavior are unchanged.

No MPP or subscription execution was added. No `Payment-Signature`, `X-PAYMENT`, Authorization/Bearer, cookie, payment body, signing, wallet custody, facilitator/control-plane call, settlement, metering claim, payment, spend, paid output, MCP Inspector, remote MCP, OAuth, dynamic registration, route promotion, marketplace-readiness claim, or investment-advice behavior was added.

`STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING` remains unsupported and fail-closed.

## 15. Known limitations

- This implementation is bound to current local API source revision `6b9ee57f...`.
- A runtime policy overlay could author a different outer rail array; any unreviewed form fails closed.
- All nine current routes have the same rail form, so there is no current wrong-route/different-policy positive control to encode. The route-bound map is still explicit and will fail closed until a changed route is separately reviewed.
- Preview source changes require an MCP contract update; unknown keys, changed closed vocabularies, array changes, and changed symbolic example objects fail closed.
- Preview production contracts and source-shaped fixtures are manually maintained, so future API changes require deliberate MCP review. A deterministic offline parity manifest or generator is a potential later improvement, not a requirement for this reconciliation or the next separately authorized canary.
- Deployed-source alignment remains unknown.
- This PR does not prove the exact field or branch rejected in PR #77.

## 16. No-live validation statement

No live canary occurred. No Stock Trends API call, API key, proof, payment header, payment, spend, paid-output request, facilitator/control-plane call, MCP Inspector, remote MCP, AWS/deployment query, Git fetch, or external network request occurred. All HTTP behavior was mocked or injected.

## 17. Required next step

The required next step is independent code review, mocked validation confirmation, and merge review. Another live canary requires that review and merge plus a new exact authorization. PR #77's consumed authorization and this implementation do not authorize a canary.

MPP and subscription rails remain descriptive only and are not executable by this MCP path. Proof forwarding and payment remain unsupported.
