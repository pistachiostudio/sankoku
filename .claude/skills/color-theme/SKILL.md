---
name: color-theme
description: Propose and apply site-wide color theme changes for the 糞取山酷会 (sankoku) static site. Use whenever the user asks for color palette ideas ("配色アイデア出して", "配色案", "テーマ変えたい"), asks to switch the site's colors/theme, or says something is hard to see / too washed out on the site (e.g. a logo blending into the background) and wants a color fix. Covers the full color system in one pass — the shared static/css/theme-vars.css variables, the dot-art icon, the two logo SVGs, the activity log viewer (log.html), and the member bio pages — so nothing gets missed and no hardcoded color re-appears after a theme switch.
---

# Color theme switching for sankoku

This site's colors all come from ONE file: `static/css/theme-vars.css`. It
holds a single `:root { --main-bg-color: ...; ... }` block, and every other
page/stylesheet either `@import`s or `<link>`s it instead of declaring its
own copy. A "theme" is just a full set of values for those variables.
**Editing colors always means editing `theme-vars.css`, and only
`theme-vars.css`** — if a task seems to need editing a hex code somewhere
else, that's almost certainly a bug (a stray duplicate or a genuinely
hardcoded value), not a normal part of switching themes. See "Why this
matters" below for how this file came to exist.

## The color system, in full

`static/css/theme-vars.css` → `:root` block:

| Variable | What it colors |
|---|---|
| `--main-bg-color` | page background |
| `--main-font-color` | body text |
| `--title-color` | the "Next Mission" top title link |
| `--logo-fill-color` / `--logo-stroke-color` | the big outlined kanji logo (`#logo-slot`, `sankoku-logo-shake.svg`) |
| `--logo-fill-color-2` / `--logo-stroke-color-2` | the smaller solid "糞取山酷会" kanji logo (`#logo-slot-2`, `sankoku-logo.svg`) |
| `--link-color` / `--link-hover-color` | body links |
| `--social-button-color` / `--social-button-hover-color` | social icons |
| `--selection-text-color` / `--selection-bg-color` | text selection highlight |
| `--doggo-color` | the "*" doggo accent mark near the top |
| `--accent-color` | same accent, used by name on the member bio pages |
| `--hr-line-color` | horizontal rule lines |
| `--muted-text-color` | secondary/de-emphasized text (e.g. countdown unit labels) |

`static/css/style.css` still has its own `:root` block too, but by design it
only holds non-color layout variables now (`--main-font-size`, `--logo-width`,
`--logo-width-2`, `--align-left`, `--drop-shadow-*`, `--social-font-size`).
Those are sizing, not color — leave them alone for a color-only theme change.

### Who consumes theme-vars.css, and how

- `static/css/style.css` — `@import url(theme-vars.css);` near the top (this
  is what makes the main site, and everything `layouts/default.html` styles
  inline, pick up the theme).
- `static/css/log-viewer.css` — same `@import`, used by `static/log.html`
  (the activity log / climb list page).
- `static/bio/*.html` (member bio pages) — each links it directly:
  `<link rel="stylesheet" href="../css/theme-vars.css" />`. There are
  currently two of these (`shigebayashi.html`, `ryu_wakimoto.html`); if a new
  bio page is added, it needs this same link, not a copy-pasted `:root`.
- `static/js/log-viewer.js` — draws Leaflet map markers/tracks and a Chart.js
  elevation graph. Neither Leaflet's SVG renderer nor Chart.js's canvas can
  resolve a CSS `var(--x)` reference the way a plain DOM element can, so this
  file reads the *resolved* value at runtime instead, via two small helpers
  defined near the top of the file: `themeColor('--name')` (returns the
  current hex string) and `themeColorAlpha('--name', 0.3)` (same, as an
  `rgba(...)` string for translucent fills). Use these helpers for any new
  theme-dependent color in this file — never hardcode a hex value here.

### Colors that are intentionally NOT theme-controlled

A few colors in this codebase are semantic (they mean something specific
regardless of theme) and should stay fixed even during a full theme switch:
- The "urgent" countdown blink in the info banner (`#ff3333` /
  `rgba(255, 51, 51, ...)` in `layouts/default.html`) — always red, it's a
  warning.
- In `static/css/log-viewer.css`: `.gpx-stat-box.hr` (heart rate, red),
  `.gpx-stat-box.pace` (pace, green), `.gpx-stat-box.cadence` (cadence, blue),
  and the `.chart-toggle-label.pace/.hr/.cadence` colors — these are a
  data-type legend (like traffic-light colors), not page decoration.
- In `static/js/log-viewer.js`: the "G" end-of-track marker (fixed red,
  matches the `.gpx-stat-box.hr` red) and the yellow (`#ffff00`) live-position
  markers/playback line — an "attention" marker, always yellow.

Don't "fix" these into theme variables unless the user specifically asks —
they're supposed to stay put while everything else changes around them.

`layouts/default.html` also has its own inline `<style>` block (search for
`INFO Banner`) that styles the "Next Mission" info banner and its countdown.
It already uses `var(--main-font-color)`, `var(--link-color)`,
`var(--link-hover-color)`, `var(--hr-line-color)`, and `var(--muted-text-color)`
— just double check it after a switch, since it's easy to forget this block
exists (it lives in the HTML layout file, not in a `.css` file, so grepping
`static/css/` alone won't surface it).

Both logo SVGs (`static/sankoku-logo.svg`, `static/sankoku-logo-shake.svg`) use
`fill="currentColor"` and get their actual color entirely from the
`--logo-fill-color*` / `--logo-stroke-color*` variables via the `#logo-slot
svg` / `#logo-slot-2 svg` rules in `style.css`. **Never edit the SVG files to
change color** — always go through the CSS variables.

`static/css/dot/cc_cat_dot_style.css` draws the small pixel-art icon in the
top-left corner using a `box-shadow` grid of dots (10x10 dots, 4px each — do
not change the grid size or dot count unless the user explicitly asks for
that; a past attempt to enlarge the grid to fit a "better" design was
rejected). It references `var(--logo-stroke-color)` for the fur/main color
and `transparent` for empty/eye cells (so the page background shows through
and the icon automatically matches any theme); the nose is a fixed black
`#000000` by design (the user asked for a 2-color icon, fur + black, no
theme-following accent color on the nose). If you ever find a *different*
hardcoded hex color in this file, that's a bug left over from an old theme —
replace it with the variable.

### Why this matters (read if you're tempted to add a new hardcoded color)

Before `theme-vars.css` existed, `static/css/style.css`,
`static/css/log-viewer.css`, and both bio pages each had their OWN
copy-pasted `:root` block with the same variable names. A color theme switch
touched `style.css` and looked done — but `log.html` and the bio pages kept
showing the old theme, because their color values lived in a completely
separate, easy-to-forget copy. That's exactly the bug this file structure
exists to prevent. Any time a new page needs the site's colors, link
`theme-vars.css` — never paste a new `:root` block.

## Workflow

### 1. Proposing palettes

When the user asks for ideas, come up with 3-5 distinct, cohesive full palettes
— give every variable in the table above a value for each one, don't leave any
at their old value by omission. Think about the site's identity (a hiking/
mountaineering club, retro pixel/CRT aesthetic, VT323 monospace font) when
naming and designing them, but feel free to range across moods (warm/dark,
cool/night, light/bright, etc.) so the options are genuinely different from
each other, not five shades of the same idea.

Show them before asking the user to pick — don't just describe hex codes in
text. Use the `visualize` MCP's `show_widget` tool to render a mockup of the
real layout for each candidate: the title, both logo colors, a body sentence,
a link, an hr line, the social icon dots, and the dot-icon pattern. Reuse the
actual dot pattern from `cc_cat_dot_style.css` (read the file to get the
current 10x10 pattern) so the preview matches what's actually in the repo, not
a placeholder. Screenshots from the built-in Browser pane are not a reliable
substitute for this step — a past session confirmed the user could not
actually see Browser-pane screenshots in chat, so the visualize widget is the
primary way the user evaluates options, not a nice-to-have.

After showing the mockups, ask which one to apply (AskUserQuestion works well
here, one option per palette).

### 2. Applying the chosen palette

Edit the `:root` block in `static/css/theme-vars.css` in one pass, setting
every variable in the table above to the chosen palette's values. That's it —
because every other file imports/links this one, nothing else needs editing
for a pure color change. Don't touch `style.css`'s own `:root` (layout-only
vars) unless the user asked to change sizing too.

If anything still has a hardcoded color instead of pulling from
`theme-vars.css` (check the "who consumes" list above), fix that at the same
time — don't leave it for a future session to rediscover as a bug.

### 3. Verifying

Build and preview via the project's `sankoku-serve` launch config
(`preview_start` with `name: "sankoku-serve"`), which runs `make serve-win`.
Check at least the homepage, `log.html`, and one bio page under `static/bio/`
— they're the three places that used to drift out of sync before
`theme-vars.css` existed, so they're the highest-value spots to confirm.

The built-in Browser pane in this project aggressively caches CSS across
reloads — a plain reload or even `location.reload()` can still show stale
colors even though the file on disk (and `dist/`) is correct. After
rebuilding, bust the cache before screenshotting:

```js
document.querySelectorAll('link[rel=stylesheet]').forEach(l => {
  if (l.href.includes('localhost')) l.href = l.href.split('?')[0] + '?v=' + Date.now();
});
```

Wait about a second for the stylesheet to actually load before taking a
screenshot or reading computed styles. If you need to double check a color
landed, read `getComputedStyle(document.documentElement).getPropertyValue('--main-bg-color')`
(or the relevant variable) rather than trusting a screenshot taken too early.
Note this cache-busting trick only refreshes `<link>` tags — `theme-vars.css`
is pulled in via `@import` inside `style.css`/`log-viewer.css` on most pages,
so busting those two `<link>` hrefs is what actually forces a fresh fetch of
the imported file too; a full `navigate()` to the URL (not just a reload) is
the most reliable way to pick up changes to inline `<style>` blocks in the
HTML itself (like the info banner).

To inspect the tiny 10x10 dot icon closely, temporarily scale it up in the
page instead of trying to zoom the screenshot (region-crop zoom isn't
supported in this Browser pane):

```js
const el = document.querySelector('.cc_cat_dot_mforblue');
el.style.transform = 'scale(6)';
el.style.transformOrigin = 'top left';
el.style.position = 'relative';
el.style.zIndex = 9999;
```

Reset those inline styles afterward (set them back to `''`) — this is purely
for your own inspection and must never end up committed.

**Always also show the final result with `visualize`'s `show_widget`**, as a
faithful mockup using the real applied hex values (same approach as the
proposal step) — don't rely on the Browser pane alone to communicate the
result back to the user, since they may not be able to see it there.

### 4. Committing

Don't run `git commit` or `git push` just because a theme was applied —
applying a theme and committing it are separate approvals. Ask first, the same
way you would for any other change in this repo.
