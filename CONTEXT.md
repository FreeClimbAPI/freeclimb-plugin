# Context Glossary

Domain language for the FreeClimb Cursor plugin monorepo. This is a glossary, not a spec. Implementation decisions live in `docs/adr/`. The bundled CLI has its own glossary at [`cli/CONTEXT.md`](cli/CONTEXT.md).

## Plugin

The Cursor plugin defined by `.cursor-plugin/plugin.json`. Ships skills, rules, commands, an agent, hooks, and an MCP server entry. Distributed by a Cursor team admin adding the repository in team settings.

## CLI

The FreeClimb command-line tool whose source lives in `cli/`. Provides FreeClimb provisioning, local dev tunneling, diagnostics, authentication, and the MCP server. This monorepo is its canonical home.

## MCP server

The Model Context Protocol server started by `freeclimb mcp:start`. Exposes FreeClimb operations to the agent as tools. It is how the agent navigates the platform without ever handling raw credentials.

## Onboarding / Setup

The one-time, per-machine flow that installs and authenticates the CLI so the MCP server works. Driven by the `/freeclimb-setup` command and `freeclimb-onboarding` skill.

## Keyring

The operating system credential store where the CLI keeps the Account ID and API Key after `freeclimb login`. The single source of truth for credentials; never duplicated into chat, files, or MCP config.

## Account

A FreeClimb customer account, identified by an Account ID and authenticated with an API Key.

## Application

A FreeClimb webhook configuration that tells FreeClimb where to send call and SMS events (for example a `voiceUrl`).

## Number

A FreeClimb phone number owned by an Account and assigned to an Application to receive or place calls and SMS.

## PerCL

FreeClimb's call-control language, expressed as JSON command arrays returned by a webhook to drive a call flow.

## Trial account

A FreeClimb account that can only place outbound calls or send SMS to pre-verified numbers. Inbound calls are unrestricted, making them the safest demo centerpiece.
