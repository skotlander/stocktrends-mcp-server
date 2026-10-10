# Security Policy

## Supported versions

Security updates are generally applied to the current supported release line. The current public release line is `1.0.x`. There is no long-term support commitment beyond the current release line.

## Reporting a vulnerability

If you believe you have found a security vulnerability in this project, please report it privately to:

**skortje@stocktrends.com**

Please do not report unresolved security vulnerabilities through public GitHub issues.

When reporting, please include as much of the following as you can:

- Affected version
- Relevant component
- Reproduction steps
- Observed behavior
- Expected behavior
- Potential impact
- Suggested mitigation, if known

Do not include credentials, private keys, payment proofs, wallet material, authentication tokens, seed phrases, API keys, or any other secrets in your report.

## Security scope

This repository contains the Stock Trends MCP server and its public adapter behavior. Relevant security boundaries include:

- Paid execution is disabled by default.
- Enabling paid execution requires explicit, governed configuration: nonzero per-call or call-count caps (as applicable) and a nonzero covering budget or spending cap. Caps default-deny, so a paid call with no covering budget cap is denied before execution.
- For the deployed Remote MCP, x402 V2 payment authorization supplied by a payment-capable client in `x402/payment` is validated, bound to the challenged request, forwarded only to the allowlisted Stock Trends API endpoint as `PAYMENT-SIGNATURE`, and confirmed settlement is returned in `x402/payment-response`. The server does not control wallets, hold private keys, sign authorizations, or initiate spending. Local stdio's default-off x402 challenge relay remains separate: it does not forward proof or payment headers, return paid data, or spend.
- Cost estimation does not execute a paid request or make a payment.
- The optional Streamable HTTP transport is loopback-bound by default, uses SDK Host and Origin validation before MCP dispatch, accepts no-Origin server-to-server requests, and has no CORS policy. It rejects incompatible API-key, paid-execution, and x402 configuration before listening.

This security policy covers the Stock Trends MCP server as implemented in this repository. Not every upstream Stock Trends system is open source or within this repository's security scope; upstream backend services are out of scope for reports made here.

## Disclosure expectations

We ask that reporters practice coordinated, private disclosure and avoid publicly discussing a suspected vulnerability while it is being investigated. We do not commit to a specific response time, and there is no bug bounty program associated with this project.
