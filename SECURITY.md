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
- For x402, challenge validation does not authorize spending. The MCP server must not forward payment proof or initiate spending unless a separately reviewed future implementation explicitly establishes that authority.
- Cost estimation does not execute a paid request or make a payment.

This security policy covers the Stock Trends MCP server as implemented in this repository. Not every upstream Stock Trends system is open source or within this repository's security scope; upstream backend services are out of scope for reports made here.

## Disclosure expectations

We ask that reporters practice coordinated, private disclosure and avoid publicly discussing a suspected vulnerability while it is being investigated. We do not commit to a specific response time, and there is no bug bounty program associated with this project.
