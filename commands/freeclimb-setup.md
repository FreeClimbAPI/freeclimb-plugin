---
name: freeclimb-setup
description: First-time setup - install the bundled FreeClimb CLI and authenticate so the MCP tools work.
---

# /freeclimb-setup

Run the FreeClimb first-time setup. Load and follow the `freeclimb-onboarding` skill, which:

1. Checks whether the `freeclimb` CLI is already installed and authenticated.
2. If not, locates the bundled CLI under the plugin's `cli/` directory and installs it.
3. Walks the user through `freeclimb login` in their own terminal. Credentials never go through chat.
4. Verifies the setup and tells the user to reload Cursor so the FreeClimb MCP server starts.

Never request, display, or write the user's Account ID or API Key. Authentication happens only in the user's terminal.
