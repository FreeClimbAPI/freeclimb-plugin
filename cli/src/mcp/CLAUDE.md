# MCP Server

Model Context Protocol server for AI agent integration.

## Files
- server.ts: JSON-RPC server over stdio
- tools.ts: Tool definitions (15+ tools)

## Running
freeclimb mcp:server

## Tool Categories
- Call operations: make, list, get, update
- SMS: send, list, get
- Numbers: list, get, search available
- Applications: CRUD operations
- Conferences/Queues: management tools

## Protocol
Uses simplified JSON-RPC over stdio.
Each tool maps to a FreeClimb API operation.
