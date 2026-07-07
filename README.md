# Stock Trends MCP Server

Architecture scaffold for an MCP server that will provide agent-native access to the Stock Trends API.

## Current Status

This repository currently contains architecture and preparation documentation only. There is no MCP server implementation yet, no runtime tool surface, and no package installation required for the current scaffold.

## Authority Boundary

The future server must be a thin adapter over the canonical Stock Trends API. It must not query Stock Trends databases directly, recompute ST-IM or indicators, create selections or rankings, generate research or guidance, bypass API authentication/pricing/metering/payment rules, or create a parallel intelligence layer.

Published Stock Trends API responses and API-served Intelligence Agent artifacts remain authoritative. The MCP adapter will only translate those API capabilities into MCP tools, resources, and prompts.

## Local Development

Work in a dedicated branch or worktree. Keep changes documentation-only until implementation is explicitly approved. Do not install packages or add runtime code as part of the architecture scaffold.

Never store API keys, bearer tokens, payment headers, wallet material, database credentials, or other secrets in this repository.

## Documentation

- [MCP Server Architecture](docs/MCP_SERVER_ARCHITECTURE.md)
- [API Capability Coverage Audit](docs/API_CAPABILITY_COVERAGE_AUDIT.md)
- [Security Model](docs/SECURITY_MODEL.md)
