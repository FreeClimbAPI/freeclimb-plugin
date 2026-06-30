# Vail Systems — Brand & Slide Design Guide

A practical guide for building **generic, Vail-branded slide decks with [reveal.js](https://revealjs.com)**. This is not FreeClimb-specific. It exists so any deck reads unmistakably as Vail: confident, enterprise, telecom — never busy, never trendy.

> **Scope:** This is a **logo-only** brand guide. Every decision below is derived from the three official Vail logo files and direct pixel-sampling of them. No external brand/marketing site was used, by direction. The result is intentionally tight: a monochrome system anchored by a single brand red.

---

## 1. Source

This guide is derived **solely** from the three provided official Vail logos plus direct pixel-sampling of them. No external brand or marketing website was consulted, by direction.

- **Three official Vail logo lockups** (stored in `assets/`), pixel-sampled locally with Pillow to extract exact hex values:
  - `assets/vail-logo-red-on-black.png` — full-color red `VAIL` wordmark + chevron on black (note the dot in the "A").
  - `assets/vail-logo-red.png` — red `VAIL` wordmark on light/transparent ground.
  - `assets/vail-logo-white-on-dark.png` — white `VAIL` wordmark on dark-gray ground.

### Sampled values (measured, not guessed)

| Source file | What was sampled | Measured hex | RGB |
| --- | --- | --- | --- |
| `vail-logo-red-on-black.png` | Red wordmark (dominant, cleanest red) | `#D13139` | 209, 49, 57 |
| `vail-logo-red-on-black.png` | Background | `#000000` | 0, 0, 0 |
| `vail-logo-red.png` | Red wordmark (anti-aliased over white, runs darker) | `#A5363C` | 165, 54, 60 |
| `vail-logo-red.png` | Background | `#FFFFFF` | 255, 255, 255 |
| `vail-logo-white-on-dark.png` | Wordmark | `#FFFFFF` | 255, 255, 255 |
| `vail-logo-white-on-dark.png` | Background (dark gray) | `#282828` | 40, 40, 40 |

**Canonical red = `#D13139`.** The red-on-black file is the cleanest, fully-opaque source for the wordmark color; the `#A5363C` reading from the light-background file is just anti-aliasing blending the same ink with white and should be ignored.

---

## 2. Brand essence / voice

Recommended working tone for slide copy: **professional, concrete, and confident** — the register of an enterprise communications / telephony company. State capabilities plainly, lead with outcomes for large organizations (reliability, scale, security), and let the engineering credibility speak for itself.

- **Do:** plain declaratives, specific numbers, calm authority.
- **Avoid:** hype words ("revolutionary," "magical," "game-changing"), exclamation points, startup-casual tone, emoji.

---

## 3. Color

Vail's identity is **monochrome + one strong red**. The discipline is the brand: a near-black or true-black ground, generous white/neutral space, and red used sparingly as the single accent. Red is a spice, not a wall.

### Core palette (logo-derived, final)

| Name | Hex | RGB | Role |
| --- | --- | --- | --- |
| **Vail Red** | `#D13139` | 209, 49, 57 | Primary accent only — wordmark, key highlights, one emphasis per slide, rules/underlines, active states. |
| **Pure Black** | `#000000` | 0, 0, 0 | Maximum-contrast ground (matches red-on-black lockup). |
| **Vail Ink** | `#282828` | 40, 40, 40 | Dark-gray ground (matches white-on-dark lockup). Softer than pure black; preferred dark slide background. |
| **Pure White** | `#FFFFFF` | 255, 255, 255 | Light ground; primary text on dark grounds. |

### Supporting neutrals (derived ramp for UI structure)

These extend `#282828`→`#FFFFFF` for borders, panels, captions, and secondary text. They are neutral grays (no hue) to stay true to the monochrome identity.

| Name | Hex | Role |
| --- | --- | --- |
| **Ink 900** | `#1A1A1A` | Deepest panel fill on near-black decks. |
| **Ink 800** | `#282828` | Primary dark ground (= Vail Ink). |
| **Ink 700** | `#3A3A3A` | Raised panels / hairline borders on dark. |
| **Gray 500** | `#6B6B6B` | Muted body text / captions on light; secondary text on dark. |
| **Gray 300** | `#C9C9C9` | Borders / dividers on light. |
| **Gray 100** | `#F2F2F2` | Light secondary background / panel fill. |

### Accents

**There is no secondary accent color.** The palette is **monochrome + red**, on purpose. `Vail Red` is the only accent; everything else is black, white, ink, or a neutral gray. Do not introduce a second hue (blue, green, etc.) — restraint is the brand.

### Usage rules

- **Backgrounds:** `#282828` (preferred dark) or `#000000` (max drama) for dark decks; `#FFFFFF` or `#F2F2F2` for light decks.
- **Text:** `#FFFFFF` / `#F2F2F2` on dark; `#1A1A1A` on light. Use `Gray 500` for de-emphasized/caption text.
- **Accent:** `Vail Red` for at most one focal element per slide — a stat, a keyword, a rule, the logo. Never as a large fill behind body text (contrast + fatigue).
- **Contrast targets:** body text ≥ 7:1, large headings ≥ 4.5:1. White on `#282828` ≈ 13:1 ✓. `#D13139` on `#282828` ≈ 3.6:1 — **acceptable for large display type only, not for body copy.**

### Dark-theme vs. light-theme decks

- **Dark deck (default, most on-brand):** ground `#282828` (or `#000000` for title/section dividers), text white, accent `#D13139`, logo = `vail-logo-white-on-dark.png` (or `vail-logo-red-on-black.png` on true black).
- **Light deck:** ground `#FFFFFF`/`#F2F2F2`, text `#1A1A1A`, accent `#D13139`, logo = `vail-logo-red.png`. Use sparing red rules and dark headings; keep it airy.

---

## 4. Logo usage

Three approved lockups ship in `assets/`. Pick by background contrast — the wordmark must always sit on a ground it was made for.

| Variant | File | Use on | Pairs with |
| --- | --- | --- | --- |
| Red on black | `assets/vail-logo-red-on-black.png` | True-black grounds | `#000000` backgrounds, title/section dividers for maximum drama |
| Red on light | `assets/vail-logo-red.png` | White / light grounds | `#FFFFFF`, `#F2F2F2` light decks |
| White on dark | `assets/vail-logo-white-on-dark.png` | Dark-gray / colored dark grounds | `#282828` Vail Ink, photos with dark overlay |

### Clear space & sizing

- **Minimum clear space:** keep a margin of at least the height of the "V" (≈ one cap-height) on all sides. Nothing — text, edges, other logos — intrudes into this zone.
- **Minimum size:** never render the wordmark below ~24px tall on screen; the dot in the "A" and chevron detail must stay legible.
- **Placement:** one logo per slide. Standard spot is top-left or bottom-left of content slides; centered and larger on title/closing slides.

### Do-nots

- **Don't recolor.** Red is `#D13139`; white is `#FFFFFF`. No gradients, no alternate hues.
- **Don't stretch, squash, skew, or rotate.** Scale proportionally only.
- **Don't add effects** — no drop shadows, glows, outlines, bevels, or blurs.
- **Don't place on low-contrast grounds** (e.g. red logo on dark gray, white logo on white). Match the variant to its intended ground.
- **Don't crop, recompose, or separate the chevron from the wordmark.**
- **Don't put two Vail logos on the same slide.**

---

## 5. Typography

**Canonical deck typeface: a clean cross-platform system-font stack.** It renders crisply everywhere, needs no web-font download, and stays neutral so the brand red and layout do the talking:

```css
--vail-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

The `VAIL` wordmark itself is a **geometric, rounded sans**. If a closer web-font match to the wordmark is ever wanted, a geometric Google Font such as **Poppins** or **Montserrat** is a reasonable optional upgrade (import it and swap it into `--vail-font-sans` ahead of the system stack). This is optional only — **the default and canonical choice is the system stack above.**

**Sizing/weight system:**

| Element | Size (16px base / em) | Weight | Notes |
| --- | --- | --- | --- |
| Title slide H1 | 3.0–3.75em | 700 | One line ideally; tight leading (~1.05). |
| Section divider | 2.5em | 700 | Often with a short red rule above. |
| Slide H2 (heading) | 1.6–2.0em | 600–700 | One idea per slide. |
| Subhead / eyebrow | 0.85em | 600, uppercase, +0.08em tracking | Use sparingly (not on every slide). |
| Body | 1.0–1.2em | 400 | Short lines, ≤ ~45 chars where possible. |
| Caption / footnote | 0.75em | 400, `Gray 500` | Sources, slide numbers. |
| Code | 0.9em | 400, monospace | Only for actual code/commands. |

---

## 6. Composition / slide layout

- **One dominant idea per slide.** If a slide has two ideas, it's two slides.
- **Generous spacing.** Large margins, lots of negative space; let black/ink ground breathe. Crowding is off-brand.
- **Left-aligned** body and headings by default; center only title/section/closing slides.
- **Grid:** keep content within ~80% width; consistent left margin aligned with the logo.

### Slide patterns

- **Title slide:** dark/black ground, centered Vail logo, large H1, optional one-line subtitle, optional thin red rule. No clutter.
- **Section divider:** ink or black ground, short uppercase eyebrow or a `#D13139` rule, large section title. Signals a gear change.
- **Content slide:** logo top-left, H2 heading, one idea, supporting visual or short list. Footer with slide number.

### Logo placement & footer

- Logo: top-left (content) or centered (title/closing); never duplicated.
- **Footer/slide number:** bottom-right, `Gray 500`, `0.75em`. Optionally `Vail` or confidentiality tag bottom-left in the same muted gray. Keep it quiet.

---

## 7. Components

Reusable, brand-consistent slide elements. Keep them flat and monochrome — **no generic SaaS card grids, no soft shadows, no rounded "feature tiles."**

- **Pills / tags:** small uppercase labels for short capability tags. Outline style (`1px` `Gray 300` on light / `Ink 700` on dark); active/featured pill uses `Vail Red` border or fill.
- **Bordered panels:** flat rectangles with a `1px` hairline border (no shadow) to group related points. Optional `4px` left border in `Vail Red` for an emphasized panel.
- **Stat callouts:** very large number (display weight) in white or `Vail Ink`, with a short caption beneath in `Gray 500`. The number is the hero; red optional on a single key digit/unit.
- **Quote slides:** large quote set in the heading weight, attribution in `Gray 500` below, optional oversized red quotation mark or a short red rule. No portrait-card chrome.
- **Simple lists:** short, scannable. Use a red tick/dash marker rather than default bullets. Numbered lists only when the content is genuinely sequential.

---

## 8. reveal.js specifics

Drop-in tokens and theme overrides. These map the Vail palette onto reveal.js's built-in CSS custom properties (`--r-*`).

### `:root` brand tokens (copy-paste)

```css
:root {
  /* Vail core palette (logo-derived) */
  --vail-red: #D13139;
  --vail-black: #000000;
  --vail-ink: #282828;
  --vail-white: #FFFFFF;

  /* Neutral ramp */
  --vail-ink-900: #1A1A1A;
  --vail-ink-800: #282828;
  --vail-ink-700: #3A3A3A;
  --vail-gray-500: #6B6B6B;
  --vail-gray-300: #C9C9C9;
  --vail-gray-100: #F2F2F2;

  /* Type — canonical system-font stack */
  --vail-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
```

### Wiring to reveal.js variables

reveal.js themes are driven by `--r-*` properties. Set them from the Vail tokens. **Dark theme (default, most on-brand):**

```css
.reveal {
  --r-background-color: var(--vail-ink);     /* #282828 ground */
  --r-main-color: var(--vail-white);         /* body text */
  --r-heading-color: var(--vail-white);      /* headings */
  --r-link-color: var(--vail-red);           /* links / accents */
  --r-link-color-hover: #E4565C;             /* lighter red on hover */
  --r-selection-background-color: var(--vail-red);
  --r-main-font: var(--vail-font-sans);
  --r-heading-font: var(--vail-font-sans);
  --r-main-font-size: 38px;
}
```

**Light theme** (swap the grounds and text):

```css
.reveal.vail-light {
  --r-background-color: var(--vail-white);
  --r-main-color: var(--vail-ink-900);
  --r-heading-color: var(--vail-ink-900);
  --r-link-color: var(--vail-red);
}
```

### Font import

No web-font import is required — the canonical `--vail-font-sans` system stack is available on every platform. **Optional** geometric upgrade to sit closer to the wordmark: add a Google Font import at the top of the theme CSS and prepend it to the stack, e.g.

```css
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap");
:root { --vail-font-sans: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
```

### Example custom theme override snippet

```css
/* vail.css — load AFTER a reveal base theme (e.g. white.css or black.css) */
/* No @font-face / import needed: --vail-font-sans is a system stack.
   Optionally prepend a geometric Google Font (Poppins/Montserrat) per the Font import section. */

.reveal { font-family: var(--vail-font-sans); background-color: var(--vail-ink); }

.reveal h1, .reveal h2, .reveal h3 {
  text-transform: none;
  letter-spacing: -0.01em;
  font-weight: 700;
}

/* Brand accent rule used on title/section slides */
.reveal .vail-rule {
  width: 64px;
  height: 4px;
  background: var(--vail-red);
  border: 0;
  margin: 0 0 1rem 0;
}

/* Stat callout */
.reveal .vail-stat { font-size: 4em; font-weight: 700; line-height: 1; color: var(--vail-white); }
.reveal .vail-stat small { display: block; font-size: 0.22em; font-weight: 400; color: var(--vail-gray-500); letter-spacing: 0.06em; }

/* Outline pill */
.reveal .vail-pill {
  display: inline-block; padding: 0.25em 0.8em;
  border: 1px solid var(--vail-ink-700); border-radius: 999px;
  font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.08em;
}
.reveal .vail-pill--active { border-color: var(--vail-red); color: var(--vail-red); }

/* Quiet footer / slide number */
.reveal .slide-number { color: var(--vail-gray-500); background: transparent; }
```

### Transitions / config

```js
Reveal.initialize({
  transition: 'fade',        // subtle; see Motion
  transitionSpeed: 'default',
  controlsLayout: 'edges',
  slideNumber: 'c/t',
  hash: true,
});
```

---

## 9. Motion

- **Subtle only.** Prefer `fade` (or `slide`) at default speed. No spins, zooms, flips, or bouncy easing.
- **One transition style** for the whole deck — consistency over variety.
- **Respect reduced motion.** reveal.js honors the OS setting, but guard custom animations too:

```css
@media (prefers-reduced-motion: reduce) {
  .reveal .slides section, .reveal [class*="fragment"] {
    transition: none !important;
    animation: none !important;
  }
}
```

- Use fragments to reveal one point at a time only when it aids comprehension — not as decoration.

---

## 10. Anti-patterns

- **Overusing red.** Red is a single accent per slide, never a body-text background or a wall of color.
- **Recoloring / altering the logo.** No new hues, gradients, shadows, glows, stretching, or rotation.
- **Gradient text** and **glassmorphism** — both off-brand; keep surfaces flat and solid.
- **Glossy SaaS card grids** of rounded, shadowed feature tiles.
- **Dense diagrams** and tiny text — if it needs zoom, it's not a slide.
- **Repeated tiny eyebrow labels** as the main page structure.
- **Adding a second accent color** — the palette is monochrome + red by design; no blue, green, or other hue.
- **Hype copy, emoji, and exclamation points** — keep it enterprise and confident.
- **Multiple logos / clutter** in the clear-space zone.
