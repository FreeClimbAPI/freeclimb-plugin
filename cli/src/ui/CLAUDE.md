# UI Components

Terminal UI system for CLI output.

## Files
- banner.ts: CLI greeting/header
- format.ts: Topic-specific string-based output formatters (non-TTY fallback)
- spinner.ts: Loading indicators (ora)
- select.ts: Interactive selection prompts
- components.ts: Reusable UI elements (string-based)
- theme.ts: Color theming (chalk), TTY/color detection
- chars.ts: Unicode character utilities

## ink/ - Ink (React for CLIs) Components
- renderer.tsx: Bridge between Output.render() and Ink components
- table.tsx: Data table with borders, status colors, auto-sizing
- json-view.tsx: Syntax-highlighted JSON display
- key-value.tsx: Aligned key-value pair display
- error-box.tsx: Red-bordered error display with suggestions
- success-message.tsx: Green success banner (204 responses)
- pagination-bar.tsx: Page status + next page hint
- status-badge.tsx: Colored status icon + text
- bordered-box.tsx: Generic bordered container with title

## Usage Pattern
1. Commands call `out.render(data, { topic, command })` for human output
2. In TTY mode → Ink components render via renderer.tsx
3. In non-TTY mode → falls back to string formatters from format.ts
4. JSON/quiet/fields modes bypass Ink entirely
