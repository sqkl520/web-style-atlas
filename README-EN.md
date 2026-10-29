**English** · [简体中文](README.md)

<div align="center">

# Web Style Atlas

> *"30 runnable styles, not mockups."*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Schemes: 30](https://img.shields.io/badge/Schemes-30-blue)](#what-you-get-30-schemes-30-prototypes-3-templates)
[![Build: none](https://img.shields.io/badge/Build-none-green)](#install-and-open-it-over-http)
[![Static-only: no backend](https://img.shields.io/badge/Static--only-no%20backend-brightgreen)](#static-only-nothing-leaves-your-machine)

<br>

**A style specimen library: 30 schemes, each with an HTML prototype you can open, plus 3 templates you can take and use.**

<br>

<sub>Pure static —— no build step, no backend, deploys on any static host.</sub>

You have a site to ship, and the client wants "a premium look".
You scroll your bookmarked design galleries and the longer you go the more it repeats — warm beige ground, terracotta accent, serif headline — the same page you saw last month.
That is not a taste problem. Every sample you looked at is a render: it never tells you how the layout collapses between 1440 and 390, how long copy breaks the grid, or what the page looks like when the photography is missing.
This specimen library exists for one reason: every scheme here opens, runs, and comes apart into fields.

```bash
npx serve . -l 8080                # or: python -m http.server 8080
```

Works everywhere —— any browser, any static host, nothing to install.

[See the proof](#see-the-proof-272-real-screenshots-on-one-bench) · [Install](#install-and-open-it-over-http) · [Content](#what-you-get-30-schemes-30-prototypes-3-templates) · [Mechanism](#how-this-atlas-is-built-four-hard-rules) · [Limits](#limitations-what-this-atlas-cannot-do)

<br>

</div>

---

## See the proof: 272 real screenshots on one bench

There is no GIF here, and nothing is borrowed from another project. What this repository can hand you is **a file you can open right now**.

```bash
git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l    # 272 real renders at three viewports
```

Start the server (next section) and open `prototypes/_selection/`:

```
http://localhost:8080/prototypes/_selection/
```

All 30 schemes on one screen. Each row shows structure type / cognitive threshold / tone, the one-line definition (in plain words, not the spec jargon), colour swatches, the error code, the content-capacity badge, the gate result, and a **real desktop 1440 render**.

```
S07  Slate-Ink Contents        F-type · medium threshold · tone: academic archive / serious print
     ┌────────────────────────────────┐
     │  [real desktop 1440 render]    │
     └────────────────────────────────┘
     items are add/removable (46 at design time)
     gate FAIL 1 (mono) · error code MIR-47 · 5 screens / 6 real pictures · [expand 12 fields]
```

> **Why only one picture on the row**: it used to show three viewports side by side (1440 / 768 / 390), but at a 1440 row width each one rendered at 155×97px — too small to read anything, a "there is a picture" placeholder that stretched the row to 434px and made it **impossible to fit even one complete scheme card above the fold**. The three-viewport comparison moved into the detail panel as a clickable viewport switcher; the row keeps one desktop render you can actually see. Row height 434px → 277px, complete cards above the fold 0 → 1.

The ASCII is only the shape. The page holds pixels.

Click a row to expand it: the **copy-AI-prompt button** sits at the top, followed by the viewport switcher (step through `desktop-fold` / `page-01`…) and all 12 fields.
`#S07` deep-links to a single scheme.
The keyboard covers everything: `J`/`K` moves between schemes, `1`/`2`/`3` switches viewport, `/` focuses search, `Esc` closes.

**The 12th field, "anti-AI-cliché review points", is collapsed**: `data.js` carries it for **30 of 30 schemes** (shortest 276 characters, longest 444, 10,065 in total, median 324), and until now it existed only in the data — not a character of it was on the page. It is closed by default; the summary reads "anti-AI-cliché review points (N)" where N is counted live from the numbered markers in the text (`①②③` / `第一，第二，` / `（1）（2）` — the largest of the three conventions wins; never hard-coded), and nothing is truncated once you open it. It sits **before "anti-AI-cliché risks and how they are avoided"**: the review points say *which AI clichés this scheme deliberately defies* (each tied to a `C-x.y` clause number), the risks say *so what you are most likely to get wrong when you copy it* — the former is the premise of the latter. Read in the other order, the "don't turn X into Y" lines in the risks have nothing to point back at.

### How you take it away: copy the AI prompt

The first group in the left rail is **"What do you do?"** — 44 trade terms that reverse-look-up matching schemes (16 have direct matches, 28 approximate only, tucked behind a "28 more approximate →" toggle). Beyond those 44 there are 29 more terms with no chip at all: the same toggle lists them, and all 29 are honestly labelled "none" — not "not built yet", but that this collection's mechanisms cannot carry them. Not hidden.

Pick a scheme and the detail panel opens with a **"Copy AI prompt"** button at the very top. Press it and you get **1,814–2,138 characters** of Chinese prose (30 schemes measured; median 1,988) to paste straight into ChatGPT / Claude / v0, which will build the whole site in that style. It is not boilerplate — every value is **extracted from the actual `style.css`**:

| What goes into the prompt | Where it comes from |
| --- | --- |
| Palette (4–5 values) | the variables actually declared in `:root`, with `var()` references resolved |
| Fonts (display / body / numeric) | real `font-family` values, resolved back through `:root` (never emits `var(--f-text)`, which no AI can read) |
| Radius, shadow philosophy, stroke widths | counted across the whole file: 18 schemes use no shadow, 6 inset only, 6 drop-shadow only, **0 use an outer glow** |
| Signature mechanism (one sentence) | one structural move per scheme, with concrete numbers |
| Content capacity | the same `minItems` / `degrades` data as the badge on the row |

Same skeleton, only the DNA swaps:

```
I run a small pour-over coffee shop with five single-origin beans; orders come through WeChat, no online payment.
Please build the page in this style: an old bookshop's specimen cabinet, drawers receding into the wall.
Hard visual constraints (follow each one; do not change colours or fonts):
1. Use only these colours: #E4DECD #D8CFB6 #4A5C3A #2A241C #7C7460. No sixth colour.
2. Fonts: headings Spectral, body Noto Serif SC. Do not use Playfair Display, Inter, Roboto…
…
```

**Why not one long hand-written prompt per scheme**: the longer a prompt gets, the more it describes *that specific page* instead of *that style*. A shared skeleton plus measured DNA transfers better. **Why not four separate prompts for four AIs**: divergence is the hardest lesson in this repo (M01's `box-shadow` once had the Chinese and English docs claiming opposite things — see [the template layer](#the-template-layer-change-12-variables-and-it-is-yours)). One trunk, one sentence of adaptation.

Copying also works when you double-click the files over `file://` (both `writeText` and `execCommand` verified); if both paths fail you get a select-all textarea instead — never a "copied!" message with an empty clipboard.

**Its limit**: this transfers a *style*, it does not take over your business. **14 of the 30 schemes** carry a `⚠` right next to the button, because they degrade on ordinary content — better to know before you paste than after. The two criteria are kept apart (`riskyTopic || riskyCount` in `prompt-copy.js`):

- **4 schemes have a mechanism bolted to a specific subject** (`S15` `S18` `S21` `S29`, the `hardIds` in `prompts.js`): "the mechanism is tied to a specific subject; it degrades on ordinary content".
- **13 schemes lay their units out by hand** (`S02` `S04` `S05` `S08` `S12` `S14` `S15` `S18` `S19` `S20` `S22` `S23` `S29`, i.e. `capacity.degrades === "yes"`): "unit positions are hand-set; fewer than N items leaves holes", where N is that scheme's `minItems`.

The axes are orthogonal and overlap on only 3 schemes (`S15` `S18` `S29`); `S21` sits on the subject axis alone, 10 more sit on the count axis alone, and the **union is 14**. When a scheme hits both, the warning joins the two sentences with a semicolon.

Next to it stands the **selection wizard** (`prototypes/_selection/wizard.html`). Five questions about **your situation**, not "what style do you like": content load, picture load, how quiet you want it to look, whether a first-time visitor should know where to look in three seconds, and what you fear more — getting it wrong or being forgettable. (⚠️ This line used to read "whether you need guidance, whether you fear retro" — `git grep` confirms those two questions never existed in the wizard; caught by bilingual-drift audit 51 as **invented dimensions**, now corrected to the actual `load/img/loud/guide/fear` five.)
It outputs **3 recommendations and 3 explicit exclusions**, and every "why" is read from **measured values** —— body word count, real picture count, highest saturation in the palette, declared cognitive threshold, and a memorability proxy built from tone and chroma. It never assigns a subjective score.
Answers replay from the URL: `?load=2&img=2&loud=2&guide=0&fear=2`.

---

## Install and open it over HTTP

The whole repository is **pure static**: no backend, no build, no dependency installation.

```bash
# pick one
npx serve . -l 8080                  # Node (no prior install; npx fetches it; -l 8080 matches the URLs below)
python -m http.server 8080           # Python 3
php -S localhost:8080                # PHP
```

Then open:

```
http://localhost:8080/prototypes/_selection/               # the selection bench (main entry)
http://localhost:8080/prototypes/_selection/wizard.html    # the selection wizard
http://localhost:8080/templates/M01-clean-corporate/       # one mainstream template
http://localhost:8080/prototypes/S14-zero-g-launch-sequence/   # one prototype
```

**Open it over HTTP. Do not double-click the file.**
Under `file://` the CSS `mask-image: url(...)` is rejected by CORS and the whole chain fails: double-clicking `S04` or `S07` turns their paper blocks and deckled book edges into a blank wall —— it looks like a broken page. A same-page, same-size http/file comparison measured that region at **5818 distinct colours vs 2**. That is a functional precondition, not a style suggestion.

The repository is **about 180 MB** (photos, rendered screenshots, self-hosted fonts), so prefer a shallow clone:

```bash
git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
```

If you only want to look at screenshots without cloning, browse `prototypes/<scheme>/` on the GitHub web UI.

Check your clone afterwards: `prototypes/_selection/index.html` opens, `prototypes/_selection/data.js` is non-empty, and `prototypes/S01-*/index.html` exists —— if any of the three is missing, the clone was interrupted.

---

## What you get: 30 schemes, 30 prototypes, 3 templates

**30 design schemes** —— not a colour skin but a complete **design argument**, written across 12 fields:
a one-line visual definition, aesthetic family and references, a colour system (with area ratios and mood), a type strategy, layout and grid (with behaviour at three breakpoints), key visual elements, motion and interaction (with a reduced-motion fallback), anti-AI-cliché review points, risks and how they are avoided, suitable uses (plus what it is *not* for), implementation notes (with a performance budget), and one **signature quirk of the designer**.
All 12 are **rendered in the selection bench** (30 of 30, not a sample); the "anti-AI-cliché review points" one is collapsed, because it is the longest and the most "written for a reviewer" —— how to open it is under [See the proof](#see-the-proof-272-real-screenshots-on-one-bench).

**30 runnable prototypes** —— real typography, real copy, real assets, real error states, real `prefers-reduced-motion` fallbacks.
**29 pass the gate with FAIL = 0.** The 2 remaining failures in the one remaining scheme are listed one by one under [Limitations](#limitations-what-this-atlas-cannot-do).

**15 F-type / 15 R-type** —— F-type has a fixed skeleton, so a visitor knows what to look at and click within three seconds; R-type organises its content around one physical mechanism. All 30 aesthetic families are **mutually distinct**.

**3 mainstream templates** —— a separate layer with different rules, each documenting the scope of its exemptions in its own README. See [The template layer](#the-template-layer-change-12-variables-and-it-is-yours).

**Browsing and choosing** —— the selection bench, the wizard and full keyboard control, covered in the section above.

**Toolchain** (all in `prototypes/_build/`, plain Node + Python, no npm dependencies):

| Script | What it owns |
| --- | --- |
| `render-scheme.mjs` | Render one prototype and print the gate result (real screenshots at three viewports). ⚠️ Depends on `tools/` outside the repository — see [Rendering and verification](#rendering-and-verification) |
| `verify-prototype.mjs` | Mechanical check: remote resources, banned font stacks, emoji, broken images, real-picture count, horizontal overflow, gate counts |
| `check-docs.mjs` / `check-stale.mjs` / `check-anchors.mjs` | Three checks for defects **a page cannot show you**: the **docs drifting from the code** (IDs / numbers / paths vs `data.js`), **stale artefacts** (edited but never re-rendered), and **in-page anchors that scroll nowhere**. All three exit 1 on FAIL |
| `check-prompts.mjs` | **Independent reconciliation of the prompt text**: the colours / line widths / type sizes each of the 30 prompts claims must match what `style.css` actually declares. Why it exists: rewriting S19's primary colour to `#FF00FF` leaves `check-docs` reporting **PASS 11 / FAIL 0 / exit 0 unchanged**, while the text the user copies has already changed |
| `check-twolines.mjs` | The **relationship between the two data chains**: `data.js` (what the picker displays — the 4 declared palette colours from spec field 3) must be a **subset** of `prompts.js` (what the prompt carries — plus CSS-derived shades), and `palette[0]===bg`, `palette[1]===primary`. It deliberately does **not** assert equality: measurement confirms the two carry different semantics and both are correct — one states design intent, the other construction detail |
| `shot.mjs` + `shot-page.py` | A **zero-dependency screenshot tool** (no third-party design tooling, no CDP): full-page capture, slicing by viewport, per-screen pixel statistics (dominant colour share, mean luminance, blank-screen detection) |
| `fetch-fonts.mjs` / `selfhost-fonts.mjs` | Fetch fonts for self-hosting and rewrite a page's external font links to local ones |
| `assign-assets.mjs` / `make-textures.py` | An asset fallback (cross-assign real photos from the existing corpus by subject) plus **14 deterministic texture generators** (parameters written to disk, byte-reproducible) |
| `collect-schemes.mjs` / `summarize-all.mjs` | Generate `data.js` for the bench, and summarise render reports across the repository |

---

## The template layer: change 12 variables and it is yours

All three templates are **runnable from two files** (`index.html` + `style.css`) with **zero external dependencies**: no image files, no JS libraries, no CDN, no build step.
Image slots are **inline SVG placeholder frames** (greyscale, with aspect ratio and suggested pixel size).
Copy uses **placeholder markers** `【换成你的：…】` (the markers are in Chinese —— search for `换成你的` to find every slot to fill).
Fonts use a **system font stack** —— correct on any machine, instantly, with no flash of missing text.

| Template | For | Look | Theming |
| --- | --- | --- | --- |
| **M01 Clean Corporate** | Professional service firms: law, consulting, software services, design studios, agencies | White ground + deep indigo brand colour + sans-serif; clean and trustworthy | 12 CSS variables, including 3 contrast-checked recolouring recipes (brick red / deep green / charcoal) |
| **M02 Warm Local** | Local premises: restaurants, cafés, bakeries, guesthouses, barbers, florists | Off-white ground + deep warm brown; **serif headings + sans-serif body**; photography-first | 12 CSS variables |
| **M03 Bold Creator** | Portfolios, freelancers, small creative studios, photographers, designers | Near-black ground + near-white text + a single orange; **very large type**, disciplined by typography alone | 12 CSS variables |

Four files per template:

```
templates/M01-clean-corporate/
├── index.html     complete and usable, with placeholder markers and semantic markup
├── style.css      12 CSS variables gathered at the top — change those to recolour and re-measure
├── README.md      for people who do not write code: how to open it, which variables to change,
│                  how to swap copy and images, and which rules this layer is exempt from, and why
└── TOKENS.md      the 12 variables explained one by one (what it does / default / what changing it does)
```

**Why does this layer have different rules from the 30 schemes?**
The 30 schemes follow a strict "anti-AI-cliché" specification that bans, among other things: a centred headline with three equal cards and a bottom CTA; alternating white / light-grey section backgrounds; pure white ground with pure black text and a single accent; floating cards with soft shadows; `Inter`/`system-ui` as the primary face; purple-blue gradients; frosted-glass sticky navigation.
**Those bans are precisely what makes a "mainstream template" work.**
So this layer **exempts itself explicitly**. Keep the two standards apart: **the 30-scheme layer aims to be remembered; this layer aims not to put a foot wrong and to be usable the moment you pick it up.**
Each README lists the exact scope of the exemption with a **use-level** justification (never "because it is mainstream"), and lists what it still holds to (`gradient: 0`, `backdrop-filter: 0`, zero emoji, no empty marketing words).

> ⚠️ **`box-shadow: 0` is not actually held**: M01 has 3 occurrences and M03 has 1 (using `box-shadow` to draw the two bars of a hamburger).
> **And M01's own `README.md` admits this is a deliberate exemption** —— the two documentation layers have given opposite conclusions about the same declaration.

---

## How this atlas is built: four hard rules

This section answers "how does it produce that". Four hard rules, each with a place you can point at.

**One: the specification comes before the pixels.** Every scheme is written out in a 12-field spec (`prototypes/_specs/Sxx.md`) before any HTML is touched.
Colour, type, breakpoints and the degradation path are **declared values**, not a feel you dialled in.

**Two: the gate only accepts what a machine can decide.** Remote resources, banned font stacks, emoji, broken images, real picture count and horizontal overflow are recomputed by `prototypes/_build/verify-prototype.mjs`; ⚠️ but `box-shadow`／`mono`／`button-fx` are **not in that script** (`shadow` appears 0 times in it) — they are decided by the **out-of-repo** `tools/taste-skill/…/rules.mjs`, so a cloner must supply `tools/` to recompute those items:

```bash
node prototypes/_build/verify-prototype.mjs --all
```

**Three: rendering is the last word, not decoration.** Every scheme is captured at 1440 / 768 / 390, and pixel statistics flag blank screens. The captures are the evidence: all **272** of them are in the repository and you can count them with `git ls-files`.

**Four: origin and correction live in separate files.** `_specs/Sxx.md` holds the pre-correction text; the currently valid colours, fonts and error codes are governed by **`_specs/_CURRENT-VALUES.md`** —— across several review rounds, more than twenty background colours, brand colours and typefaces were replaced. If anyone asks "how did you get this number", those two files together are the chain.

---

## Deployment: four stages, and one file you must keep

**Any static host works with no configuration and no environment variables. The site root is the repository root.**

### Stage 1: push to your own repository

```bash
git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
cd web-style-atlas
git remote set-url origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### Stage 2: enable Pages

Repository page → **Settings → Pages** → set **Source** to `Deploy from a branch` → **Branch** `main`, directory `/ (root)` → Save.
A minute or two later, open `https://<user>.github.io/<repo>/`. The `index.html` in the repository root redirects to the selection bench.

Command-line equivalent:

```bash
gh api -X POST repos/:owner/:repo/pages -f 'source[branch]=main' -f 'source[path]=/'
```

> **You must keep the `.nojekyll` file in the repository root.** Pages builds with Jekyll by default, and **Jekyll drops every directory whose name starts with an underscore** —— which is exactly where this site's content lives (`prototypes/_selection/`, `_fonts/`, `_specs/`, `_build/`). Delete it and the whole site returns 404.

### Stage 3: other hosts

| Platform | Build command | Output / Publish directory | Environment variables |
| --- | --- | --- | --- |
| Cloudflare Pages | **leave empty** | repository root `/` | none |
| Netlify | **leave empty** | repository root | none |
| Vercel | **leave empty** | repository root | none |
| Nginx / Caddy / Apache | —— | drop the repository into the site root | none |

Optional long-lived caching for fonts and images:

```nginx
location ~* \.(woff2|jpg|jpeg|png|webp)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### Stage 4: using a single prototype on its own

No `prototypes/<scheme>/` directory references any remote URL (contract §4), so it **runs in place — but "take it away" is harder than "run it": these are specimens, not components**.

- To run one standalone you must also bring **`prototypes/_fonts/`** (each scheme references `../_fonts/css/*.css`) and fix the relative paths.
- **⚠️ Four schemes carry private fonts inside their own directory**: `S04`/`S07`/`S08` keep them in `<scheme>/assets/fonts/` (4 + 4 + 1 woff2), and `S21` keeps 71 woff2 slices of WenJin Fang OldSong (CJK chunks) in `<scheme>/fonts/` — all 71 of its `@font-face` rules point there. Bringing only `_fonts/` leaves these schemes with missing glyphs; move the in-directory fonts along too.
- Measured take-away cost (portability audit 50, rates in `deliverables/50-critique-portability.md` §0): swapping copy as a static page ≈ 1–2 h; extracting into your own framework **8–16.5 h per scheme** (median 10.9 h — the bulk is that there are no component boundaries to lift).

**The mainstream templates (`templates/M0x/`) have none of these constraints** —— system font stacks, zero third-party assets; copy one directory and go.

---

## Rendering and verification

```bash
# render one prototype: real screenshots at three viewports + gate result
# ⚠️ It still depends on tools/taste-skill/…/inspect.mjs outside prototypes/_build/ — tools/ is
#    .gitignore-excluded, so it is not in the repository; a cloner must obtain that tool first.
#    The scripts themselves need no editing — the repo root is derived from the script location
#    (the hardcoded ROOT was removed in the toolchain T0 batch). For screenshots only, use shot.mjs
#    below, which has no such dependency.
node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence

# mechanical check (no arguments checks everything)
node prototypes/_build/verify-prototype.mjs --all

# document consistency: do the IDs, numbers and paths in this README still equal the values
# measured out of data.js and prompts.js? (the two checks above only look at pages, never at docs —
# so a README that has drifted from the code passes both of them silently)
node prototypes/_build/check-docs.mjs
node prototypes/_build/check-docs.mjs --selftest   # prove it works: revert three known decayed lines and watch it fail

# zero-dependency screenshot capture: full page + per-screen slices + pixel statistics
node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ --out .shots --widths 1440,768,390 --name S14
```

⚠️ **A trap that will fool you**: `chrome --headless=new --window-size=390,844` **does not give you a 390 viewport**.
On Windows, Chrome enforces a **minimum window width of about 500 CSS px**; the layout is computed at 500 while the screenshot is written 390 wide —— so what you get is a **left-hand crop of a 500px layout**, and you will see **phantom defects** such as "the text is truncated" or "the hamburger menu has disappeared".
`--window-size=768,1024` actually yields an `innerWidth` of only 752.

**For narrow-viewport verification, use `shot.mjs` above** (its 390 tier builds a real viewport with an iframe) or any tool that goes through CDP `Emulation.setDeviceMetricsOverride`. `--window-size` is fine at 1440.

---

## The selection bench's own gate account (every line recomputable)

The bench is not one of the 30 schemes, but it is the only way in, so it faces the same gate. What follows is **its own account** — including a debt it carried for six days.

### Account 1: its gate report was six days old

`prototypes/_selection/.inspect/report.json` was committed on 2026-10-21. Its source files were then edited by thousands of lines, and **no checker ever looked at it**: `verify-prototype.mjs`, `check-anchors.mjs` and `check-stale.mjs` each carried their own copy of the same `S\d{2}-` directory selector, and the product is not in that pattern.
The consequence was not "a slightly stale report" but **a report that said the opposite of the page**: the committed copy claimed `FAIL 0`; re-running `inspect.mjs` on 2026-10-28 measured `FAIL 2` (`body-size` / `hairline`).
`check-stale.mjs` now covers the product entry (all 9 sources of `_selection` are listed), so that debt cannot silently return.

### Account 2: four of the seven self-claims did not match repository history

`style.css` used to open with seven prose lines ("what was changed when it went through the gate"). Checked commit by commit with `git log --reverse -- prototypes/_selection/style.css`, four of the seven described changes that never happened:

| Claim as written | What the repository shows | Verdict |
| --- | --- | --- |
| Tertiary text contrast 4.2:1 → 5.6:1 | Old `#6f6c64` was 4.23:1 on the ground and 5.58:1 on the new ground; the current `#56534b` is **6.19:1** | Right direction, wrong end value |
| Small type floor raised to 13px (11/12px appeared 115 times) | The first commit's `style.css` had **one** `font-size: 11px` and zero 12px; no commit in the repository's history ever had 115 | **Never happened** |
| Headline 3.8vw → 5.2vw | `3.8vw` appears only inside that claim, never as a computed value; the real pre-change value was the literal `clamp(30px, 4vw, 56px)` | **Never happened** (but `d49ed74` on 2026-10-28 did connect `var(--s-h1)`: at 1440 the h1 measures 74px / 5.14vw) |
| Header label from an all-caps 11px micro-label → 14px sentence case | `.mast-kicker` was `var(--s-14)` from the first commit; `text-transform: uppercase` appears **zero** times in the file | **Never happened**; the style was always right, the class name was the rot |
| Row dividers 1px → 2px | Only partly true: decorative rules are 2px, but five single-side 1px rules remain on real list and field rows | Claim was imprecise |
| Screenshot thumbnails no longer use a 1px outline | `.shot` indeed has none; but `.fold-thumb` keeps `outline: 1px`, which is an image boundary, not a decorative rule | Literally true |
| Toolbar no longer sticky | `.bar` was never sticky in any commit; what is sticky is `.rail` and `.detail-head`, and **both are correct** (a sticky `.bar` would cover the headline; the filter rail and the panel head are sticky for navigation) | Literally true |

The lesson is not "the author lied"; it is that **a prose checklist has no reconciliation mechanism**. One of the four fixes it recorded (`--s-h1` was referenced nowhere) was real, while the three numbers it printed itself (115 occurrences, 3.8vw, an all-caps 11px label) never existed. So the checklist moved here — this README is watched by `check-docs.mjs`; a CSS comment is watched by nothing.

### Account 3: the 1px rules that remain are real list rows and real control edges

`lint.mjs`'s `hairline` message reads "lines belong to real tables and form fields", and the rule explicitly exempts selectors containing `input` / `select` / `textarea` / `table` / `tr` / `td` / `th` / `fieldset`. The runtime probe `probe.mjs` does the same (its `formish()` passes `input` / `select` / `table` / `hr` and `data-ui` fragments).
So the right fix is not "turn every 1px into 2px" but **deciding, one by one, whether it is a real list row**. Five stay, each traceable to meaning:

| Where | Why it stays |
| --- | --- |
| `.tpl-card` top edge | Template-card list-row separator. The proof is the very next rule: `.tpl-card:first-child { border-top: none }` — only a list row needs "no rule on the first item" |
| `.viewer-tabs button` right edge | Control edge of a tab button (the button itself is a full 1px box) |
| `.field` bottom edge | One field per row in the detail panel (a `dt`/`dd` definition list) |
| `.field-fold` bottom edge | Same, for a collapsed field row |
| `.parts li` bottom edge | The portable-parts list (`li`) row separator |

Decorative section rules are 2px without exception. This round pulled the three stragglers into line: `.mast-fold` and `.mast-facts` (≤980px — together they were the bench's only two runtime `hairline` FAILs, since the rule is `hairlines >= 2` → FAIL) and `.prompt-fill`.

### Account 4: `mast-kicker` was class-name rot, not a real violation

`.mast-kicker` never had kicker styling (14px, no `uppercase`, no `letter-spacing`), but `lint.mjs`'s `eyebrow` rule matches **the class name only**, so its static scan failed forever.
It is now `.mast-label` (not `.mast-eyebrow`, which would match the same rule head-on): one occurrence each in `index.html` and `wizard.html`, none in `wizard.css`.
Note: `lint.mjs` lives under `tools/`, and `.gitignore` line 2 excludes `tools/` — so a `taste-skill-ignore` exemption comment **does not exist for anyone who clones this repo** (`git check-ignore -v` hits `.gitignore:2`). Renaming the class is the only fix that helps downstream.

### Recomputing these accounts

`lint.mjs` and `inspect.mjs` live in `tools/` outside the repository, so a cloner must obtain them first (see the previous section). Once you have them:

```bash
# 1. exactly which 1px rules remain (should be 5, all on real list/field rows)
node tools/taste-skill/skills/taste-skill/scripts/lint.mjs prototypes/_selection/ \
  | grep -A6 '\[hairline\]'

# 2. the class-name rot is gone (eyebrow should be 0, down from 2)
node tools/taste-skill/skills/taste-skill/scripts/lint.mjs prototypes/_selection/ \
  | grep -c '\[eyebrow\]'    # prints 0

# 3. runtime gate: hairline should be 0 at all three widths
#    (before this change 768 and 390 had 2 each — and the rule is >=2 means FAIL, so it was failing)
node tools/taste-skill/skills/taste-skill/scripts/inspect.mjs prototypes/_selection/index.html \
  --out /tmp/sel --widths 1440,768,390 --json | grep -o '"hairlines": [0-9]*'

# 4. the product entry's gate report is no longer stale
node prototypes/_build/check-stale.mjs
```

One finding is still open on purpose: `body-size` reports "body text is 13px". That is **a choice, not an oversight** — the running text of this page is mostly scheme-card metadata (30 cards × a dozen 13px field labels and readouts), and lifting all of it to 16px would drop the list's first screen from one complete card to zero (exactly what the `67-exec` round spent tens of pixels recovering). Leaving it as a FAIL in `inspect.mjs` is the honest outcome; it is not silenced with `--allow`.

---

## Static only: nothing leaves your machine

The pages are HTML/CSS/JS, the assets are in the repository, the fonts are self-hosted. Nothing goes out.

- Browsing is **dependency-free** and makes **no network requests**: no CDN, no remote API, no analytics.
- No accounts, no login, no backend, no `npm install`.
- There is no install step, so there is no telemetry either.

Recompute it yourself (the first command should print **nothing**):

```bash
# the page loads no remote resource: no <script src=http>, no external font link, no url(http), no fetch
grep -rEn 'src="https?://|url\("https?://|<link[^>]+href="https?://|@import url|fetch\(|XMLHttpRequest' prototypes/S14-zero-g-launch-sequence/

# the only http(s) strings in the page are attribution links (9 in S14, all inside figcaption <a> tags)
grep -rEo '<a href="https?://[^"]+"' prototypes/S14-zero-g-launch-sequence/index.html | wc -l
```

Those are links for a human to click, not things the page fetches while running.

---

## Limitations: what this atlas cannot do

When not to use it, written out.

- ❌ **Four older prototypes still have gate failures —— 8 in total**: `S07` `mono` (1); `S08` `palette-terracotta` + `font-count` (2); `S13` `mono` + `shadow` (17 occurrences) + `button-fx` + `empty-screens` (4); `S21` `mono` (1).
  `S21`'s `few-pictures` and `empty-screens` **are now fixed** (six of the 28 on-subject photos in its own `assets/_cand/` are wired up; real pictures went 0 → 6).
  The `mono` in `S07`/`S08`/`S13`/`S21` and `S08`'s amber brand colour are **known exemptions** (see `prototypes/_CONTRACT.md` §9.15).
  **`S13`'s `shadow` (17 occurrences) and `button-fx` have no exemption record** —— the 30-scheme layer mandates `box-shadow: 0`, so those two are genuinely unresolved.
- ❌ **Ground-colour homogeneity is real**: **18 / 30 = 60% sit in a warm pale band** (criterion: `hue 28–72° and lightness ≥78`). Two findings say more than the percentage does: **12 schemes (40%) form a single connected block under the wide criterion ΔH ≤ 3° and ΔL ≤ 3°** (largest single step on the chain: ΔE76 = 4.39); **83% of schemes have no navigation links on the first screen and 97% use zero border-radius** (denominators now stated: the first is `metrics.nav.links=0` in each scheme's `.inspect/report.json`, measured **25/30 = 83.3%** — ⚠️ that metric only counts `<a>` inside `<nav>`/`header` and **cannot see in-page anchor index systems**; audit 56 measured S07/S15/S27 at 52/40/38 in-page anchors, so "missing perceivable progress feedback" is the more accurate charge than "missing nav links"; the second is `roundedBoxes>0` — only S14 has any radius ⇒ 29/30 = 96.7%. Both are `report.json` mechanical readings; grepping `<nav>` instead yields 76.7% — that is a different criterion, not drift). See [deliverables/29-critique-homogeneity.md](deliverables/29-critique-homogeneity.md).
  > ⚠️ **Any homogeneity figure must state its criterion.** Under ΔE76 ≤ 5 the largest connected component is **19 schemes (63%)**, so "12" only holds under the criterion above.
  > This project has mixed three numbers —— **17% / 60% / 73%** —— which measure "strictest paper family", "warm pale ground" and "including a warm tint from the brand colour"; **their denominators differ by four cases**. "12 strict / 22 loose near-identical pairs" comes from **rounding hue and lightness before comparing**; comparing the continuous values directly gives 8 / 17. The provenance of all three is reconstructed in [deliverables/29](deliverables/29-critique-homogeneity.md) §1.
- ❌ **Two further homogeneities beyond ground colour**: on the **quietness axis** (`axes.loud`, derived from the palette's highest chroma), **only 2 schemes are "very quiet"** while 19 (63%) are "loud" —— do not read this as `tone`; `tone` is a different set of seven phrases ("chaotic street energy" and so on), the largest of which covers 5 schemes.
  Of 36 ten-degree hue buckets only 11 are used —— **the entire purple→magenta 110° stretch is empty**; the **whole lightness range 20–60 has zero schemes**.
  In other words: **the dimensions a user can actually filter on (content volume, complexity) are precisely the ones invisible at thumbnail scale.**
- ❌ **The bench used to under-extract three schemes —— fixed, and the root cause stays documented here**: `S12`, `S15` and `S19` once expanded to 9 sections instead of 10. **The reason was not a missing spec field**: all three `_specs/*.md` do have section 5, layout and grid, on line 25, reading "8 columns, 6px baseline…", "12 columns, 8px baseline…" —— not a word missing.
  The defect was in the convention-A field regex in `_build/collect-schemes.mjs`: the separator `[.．]` was written as **optional**, so the **first sentence** of those three schemes' layout body happened to **start with a digit** —— `8 栏，基线 6px（对齐街机像素栅格），栏间距 0。不对称方式：` —— and the whole line was read as a field heading named "8". Section 5 was truncated to length 0 on the spot, and its body was attached to a field name nothing ever reads. Across all 30 schemes only these 3 lines start with a digit and carry no separator, which is exactly why it was these three.
  The fix makes the separator **mandatory**: `[.．]?` → `(-附|[.．])` (`-附` and a full stop are two parallel legal separators and neither can be dropped —— demanding "must have a dot" would reject the `1-附（…）：` route and swallow 10 schemes' mechanism sentences back into field 1). Measured after the fix, `layout` is **549 / 640 / 420 characters** for the three, and **all 30 schemes now carry a value** (`layout` length min 242 / median 413 / max 865) —— all three expand as fully as the other 27.
  **Kept rather than deleted**, because this repository's style is to leave its mistakes where they happened: a defect where "the spec plainly has it and the extractor ate it" can never be caught by reading the spec.
- ❌ **Subject gaps**: the available corpus contains no jazz records themselves; what stands in for `S28 "Jazz Intaglio Wall"` is **print-shop material (type cases ×2, metal type, a silkscreen bench, a Riso duplicator) plus a Marble Madness arcade cabinet (appearing twice, the largest block) — zero jazz, zero records, not even a turntable**; `S22`/`S23` replacements are on-subject (paper and binding; a 1902 newspaper plus archives). Gaps are documented in the relevant `CREDITS.md`. Wikimedia is reachable again (contract §10.1); swapping in on-subject public-domain covers (Reid Miles / Blue Note) is a product decision.
- ❌ **The `#888888` grey block is specific to the `inspect.mjs` pipeline**: a few desktop scrolled captures under `.inspect/` contain a large patch of exact neutral grey (`desktop-page-03` in S08 at 49.86%, `desktop-page-01` in S17 at 24.27%). **That is a defect in `inspect.mjs`'s own scroll stitching, not grey that exists in the page** —— characterised in `deliverables/16-render-look-audit.md`. **Corroboration**: an independent audit scanned all 246 PNGs produced by the `shot.mjs` / bare CDP / Pillow pipeline and found **not one where that grey exceeded 2%** (the highest was 0.236%, an anti-aliased edge). It does not occur with other capture methods.
- ❌ **The `measure` rule is a false positive for Chinese**: it estimates character width at 0.5em while CJK glyphs are about 1.0em, so **divide the reported number by two** to get the real characters per line.
- ❌ **Double-clicking gives you the wrong result**: under `file://`, CSS `mask-image: url(...)` fails entirely (rejected by CORS → fully transparent). Affected prototypes: `S04` and `S07` —— **their paper blocks and deckled edges become a blank wall**, worse than any defect in the pages themselves, and it **looks like the page is broken**. Same page, same size, http vs file: **5818 distinct colours vs 2**.
- ❌ **13/30 prototypes have an `index.html` of 30–48.4 KB** (the largest is S29 at 49,512 B), above the contract §2 target band of 18–27 KB. ⚠️ This line used to say "a few prototypes" — measured it is 13/30 = 43%, not a few (caught by commitment audit 51). Chinese prose alone eats a lot of bytes (four thousand CJK characters ≈ 14 KB); shrinking it would mean cutting content.
- ❌ **This is not a design system**: no component library, no token deliverable, no reusable CSS framework. Anyone who treats it as one will be disappointed by day three.

A self-deprecating calibration: **this is an 80-point specimen library, not a 100-point product site.** (Those two scores are a positioning line, not a measured grade —— the measured conclusions are the 9 items above.) For someone who needs to see enough real approaches before deciding what their own site should look like, an 80-point specimen library beats a 100-point product site.

---

## Repository layout

```
.
├── index.html                  # redirects to the selection bench (entry point for static hosting)
├── README.md / README-EN.md    # bilingual, translated section by section
├── LICENSE
├── .nojekyll                   # must be kept (see Deployment, stage 2)
├── templates/                  # ★ the 3 mainstream templates (M01 / M02 / M03)
├── prototypes/
│   ├── _selection/             # ★ selection bench + selection wizard
│   ├── _fonts/                 # self-hosted fonts (48 stylesheets + woff2 slices)
│   ├── _specs/                 # each scheme's fields + _CURRENT-VALUES.md (authoritative current values)
│   ├── _build/                 # all tool scripts (render / verify / fetch fonts / assign assets / generate textures / staleness check)
│   ├── _CONTRACT.md            # the construction specification (at the prototypes/ root, NOT under _build/)
│   └── S01-… S30-…/            # the 30 prototypes (index.html + style.css + assets/ + .inspect/)
└── deliverables/               # the full document chain, from the brief and research to review records
```

---

## Dependencies

- Browsing and deployment: **none** (pure static)
- Rendering and verification tools: Node.js 18+, Python 3.8+ (Pillow), Google Chrome
- **No third-party design review tooling is used**; `prototypes/_build/shot.mjs` is entirely dependency-free

---

## How this atlas was made

Three sources, stated plainly.

**One: external rule sets, replayed against the work.** The anti-AI-cliché clauses were not improvised. `taste-skill` (MIT) and `impeccable` (Apache-2.0) were taken as real rule sets and replayed scheme by scheme; the verdicts live in `deliverables/12-*` through `16-*`.
The two rule sets **do not cover each other**, so both have to run. Every hit is adjudicated into three classes: `earned` (the committed visual world paid for it), `habit` (a reflex), `indefensible` (no reason given).
**Neither tool is inside this repository** —— see clause 4 of `LICENSE`; running and deploying this repository does not depend on them either.

**Two: the review chain.** `deliverables/` runs from brief 00 to report 40: research briefs, the rule codex, red-team critiques, and a batch of defences of conclusions already on record. Every boundary figure above points back to a numbered document.

**Three: how this README is written.** The structure, tone and evidence devices come from a public README methodology in the style of Huashu (the `write-attractive-readme` skill; every sample repository is MIT-licensed). The style is borrowed, the evidence is not —— every number in this file was measured inside this repository, and none of the sentence patterns are this project's claims about anyone else.

In one line: **every number here carries its criterion and its denominator where it can; the few that cannot be recomputed statically — or whose line references drifted — are now named** (texture parameters in `build/texture-job.json` are unverifiable for a cloner; derived-asset provenance has to be read out of the generator, not the filename). This line used to read "**not one assertion here was estimated**" — an immunity pass for the document itself; the bilingual audit caught drifted line numbers and two invented claims, and the absolutist self-oath was itself the most auditable assertion, so it has been replaced with the honest version.

---

## Feedback and contributions

What counts as a bug: a script that will not run, an anchor that jumps nowhere, a gate count that disagrees with a number in this README, a path that does not match the tree.
Run these three commands first and paste the raw output:

```bash
git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l     # this README says 272
node prototypes/_build/verify-prototype.mjs --all        # this README says 26 schemes at FAIL = 0
ls prototypes/_selection/                                # the bench + wizard files
```

What counts as a proposal: a new aesthetic family has to name the closest of the existing 30 families and say how it differs. If it cannot, it is a skin, not a family.
Attach a 12-field specification, not a mood board.

No CLA is required. If you change `_specs/` or `_CONTRACT.md`, update `_CURRENT-VALUES.md` in the same commit.

## License and attribution: MIT covers code, not fonts or photos

Three parts, three different licences —— please treat them separately:

| Content | Licence |
| --- | --- |
| **Code and documentation in this repository** (`index.html` / `style.css` / `app.js` / `templates/` / `_build/` scripts / `deliverables/` / README) | **MIT**, see [LICENSE](LICENSE) |
| **Fonts** (`prototypes/_fonts/`) | Their own licences, overwhelmingly **SIL OFL 1.1** (Noto / IBM Plex / Archivo / Oswald / Syne / Space Mono and others). Source and licence appear in the header comment of each `_fonts/css/*.css` |
| **Photographs** (each prototype's `assets/`) | **Third-party material, not licensed by this repository.** Mostly Wikimedia Commons under **CC BY / CC BY-SA / CC0 / public domain**, plus some **NASA imagery** (public domain) |

**Every photograph is registered image-by-image in each prototype's `assets/CREDITS.md` — but field completeness varies**: all schemes except the four named below carry the full "author + licence + source URL" triple, while `S04`/`S07`/`S08`/`S17` admit in their own tables that the author and licence were never preserved; `S13` used to be on that list too and was completed on 2026-10-25 (below). Before reusing any of them, check that table and comply with its licence (CC BY and CC BY-SA require attribution; some also require share-alike).

> ⚠️ **That sentence has known exceptions —— do not read it as a whole-repository fact.**
> The `CREDITS.md` of `S04` / `S07` / `S08` / `S17` **admits that the per-image author and licence were not preserved** (those fields were never written down when the assets were fetched), covering **46 bitmap files** (the "on disk but absent from the attribution table" lists add up: S04 26, S07 9, S08 6, S17 5 —— all 46 exist on disk).
> ✅ **`S13` completed (2026-10-25)**: it used to be part of that all-10-unrecorded set. Its `assets/credits.json` was rewritten as a flat array with `file` set to the final on-disk names and licences/source pages filled in per image — VIGNERON (CC BY 3.0), Royal Botanic Gardens Melbourne specimen sheet (public domain), Met seal and clay impression (CC0 ×2), Jim.henderson (CC0) — then `write-credits.mjs` regenerated `CREDITS.md`, so all 5 in-use plates now carry attribution. The repository-wide figure therefore drops from **56 to 51**: S13's remaining 5 are **`src-*` leftovers that no page references** (`src-embossstamp` / `src-paraguay` / `src-shelving` / `src-storagebw` / `src-washi`), still honestly listed under "on disk but absent from the attribution table".
> 📷 **Three S13 plates were replaced in the same batch** (their content contradicted their captions — an accessibility defect and a visual one): `plate-letterpress-tan.jpg` used to be a 1901 Mexican Our Lady of Guadalupe broadside, `plate-laid-paper.jpg` an Indian temple elevation drawing (captioned "laid lines and watermark"), `plate-type-metal.jpg` an execution broadside. They are now a **typecase** (Grandjean, musée Champollion), **laid paper with a Pro Patria watermark** (transmitted light, left-right reversed as stated in both captions), and a **cast-iron book embosser** (Huntington). All three were baked into the paper/ink duotone **before** entering the repository with canvas (`style.css` states "the two tones are already baked into the image, no filter is added on the page", so this has to be done offline); script: `deliverables/59-scratch/s13-duotone.mjs`.
> **"43 unique images" is a different measure and both must be reported**: 43 only holds if S04's 26 files are folded as 13 stems × {png, webp}; de-duplicated by sha256 these 51 files are 51 distinct byte objects. The earlier wording here and in `LICENSE` ("about 38") could not be reproduced and has been corrected to the measured figures ("56" was the pre-S13 value).
> And across the repository **11 rows** record the licence as "见来源页" (“see source page”) while all three URL fields — `page`, `source`, `original` — are empty (spread across `assets/credits*.json` in `S20`/`S21`(credits-unused)/`S22`/`S23`/`S24`; the per-row list lives in `deliverables/30-critique-assets-license.md`).
> ⚠️ **This passage used to carry line numbers into `assign-assets.mjs` (`:228`, `:300`, `:359`…) — they have all been deleted.** The toolchain T0 batch added over 40 lines to that file and every line number drifted; worse, one of the described mechanisms (“`if (Array.isArray) out.push(...arr)` swallows S13's `{value,Count}` wrapper as one normal record with every field empty”) **never existed** — verified against the full history with `git log -S`. Documenting a code path that does not exist is worse than a drifted line number. The bilingual discipline only checks “are the two files consistent with each other”, not “is each file true” — which is how this false mechanism survived 40+ commits in both languages. **Line numbers are perishable references; mechanisms are what a document should keep.** Look them up live when you need a location.
> **The root cause is not “fields dropped while copying an asset across schemes”** — `assign-assets.mjs` never discards a matched `artist`/`license`/`page`. The real mechanisms are six (locate them by function, not by line): a **size gate** (two byte-size thresholds — one to enter the corpus, one to qualify for scoring — silently skip smaller files); a **hard-coded fallback** that writes “见来源页” and **does not write `page` at all** (the `build`-directory fallback likewise writes only `artist`/`license`, no URL); the **default branch recognises only the names `artist`/`license`/`page`/`original`** — never the museum schema's `creator`/`licenseUrl`/`image`, and never `source`, so Met-style records read as entirely empty; reuse records **carry only 6 fields** (`file`/`title`/`artist`/`license`/`page`/`origin` — `width`/`height`/`bytes`/`query` are dropped and `original` is overwritten with `page`); the **lookup stage scans only 5 sub-paths** (`assets/`, `build/raw/`, `build/raw-s01/`, `build/`, `build/raw/credits-raw.json` — the attributions of S01/S04/S07/S08/S17 live elsewhere); and **the true story of S13**: its `credits.json` top level is an array, but its first element is a PowerShell `ConvertTo-Json` wrapper `{value:[…],Count:5}` **with no `file` key** — when indexing by filename it contributes 0 entries and **the 5 inner records are never read** (not “inserted as an empty record”); the other 2 real records index normally.
> **7 of those rows were never recorded rather than lost after recording**: S07 has no `assets/credits.json`; S13's 2 real records are `src-embossing-tools.jpg` (photographed by **Lewis Hine**, public domain, Wikimedia Commons) and `src-stamp-press.jpg` (Auckland Museum object `AM 1965.78.13-5`, author recorded as `not researched`, CC BY 4.0) —— both carry `creator`/`license`/`licenseUrl` and a direct `upload.wikimedia.org` link; **only `page` is empty and their `file` names do not exist on disk** (disk holds baked `plate-*` names). **The accurate statement is “filename/disk mismatch, so on-disk presence cannot be verified”**; the earlier wording (“author and licence cannot be established”) overstated it, and this round it was briefly mis-stated as “no author and no URL either” before the fields were actually measured — corrected. Both records were kept in `credits.json` during the 2026-10-25 rewrite with notes attached rather than silently deleted.
> ✅ **The S13 mechanism described above is fixed (2026-10-25)**: the `{value:[…],Count:5}` wrapper and its 5 inner records were rewritten as a flat array with `file` keys matching disk, so `write-credits.mjs` can now index all 5 in-use plates by basename —— measured output went from “photos 10 / listed 0” to “photos 10 / listed 5”. The lesson stands: this was never “the assets were never captured”, it was **an index-key mismatch**, and the old documentation recorded it as “fields never written”.
> **5 further rows carry a licence name but no URL anywhere** (`S22`, `S28`, `S30`; upstream `S25/assets/credits.json` does have a `source` link, but downstream only accepts `page`/`original`, so the URL is lost). **Photographs in those schemes must not be reused** until their attribution tables are complete.
> Also: the "where it is used on the page" column in the `CREDITS.md` of `S14` / `S15` is **unrefreshed placeholder text** (28 occurrences in S14) —— do not use it to judge whether an image is used.

**The procedural textures are not photographs**: produced by `_build/make-textures.py`, parameters written to disk (each scheme's `build/texture-job.json`), byte-reproducible, carrying no third-party rights.

> ✅ **Fixed in `7585040`**: those 12 parameter sheets now live on a tracked path, `prototypes/_build/textures/` (12 JSON files — exactly the schemes that have a job on disk), verified by re-baking S18's three textures **byte-identical by SHA-256** to the shipped ones.
> The "byte-reproducible" claim is now **verifiable from a cloner perspective** (it is the basis on which `LICENSE` declares "no third-party rights"). ⚠️ Two gaps remain: the other 18 schemes have no parameter file on disk at all, and the generators still write `jobFile` into the ignored `build/`, so **a rerun will fork from the snapshot** — a full fix needs 4 coordinated edits; see `prototypes/_build/textures/README.md`.
> (This line used to say the tables must be moved to a non-ignored path — that path now exists, so it stands only as history; measured coverage is 19.6%, and S15 alone — 78.9% of the bytes — is not covered.)

> ⚠️ **The licence of "derivative works" needs saying separately.** Clause 3 of `LICENSE` delimits the MIT scope by **filename** (`assets/texture-*.png`) while clause 2 delimits third-party material by **directory** —— and the **derivatives in between** (`halftone-*.png`, `*-dither.png`, `plate-*.jpg`, `photo-*.jpg`; roughly **183 of the 287 referenced bitmaps**) **fall into the complement of both clauses, and the repository previously said nothing about their licence** (only `S02` stated that "derivatives inherit the source licence"). A **`2bis`** clause has now been added to `LICENSE`.

**The mainstream templates contain no third-party assets at all** —— image slots are inline SVG placeholder frames, so there is nothing to clear.

In plain words: **take the code and the docs, use them, change them, ship them; the fonts and the photographs answer to their own licences, so read `CREDITS.md` first.**

---

## 中文

**网站设计风格图集** —— 30 个网站设计风格方案，每个都配一个可直接打开、可运行的 HTML/CSS 原型；另有 3 个大众化模板、一张可筛选的选型台和一个五问选型向导。

纯静态：没有构建、没有后端、没有依赖安装。通过 HTTP 打开 `prototypes/_selection/`，30 个案子摊在一页，附 1440／768／390 三档真实渲染截图（**272 张**，`git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l`）。

29 个原型机械闸门 FAIL=0。做不到的部分 —— 剩余 2 条 FAIL、底色同质（18/30 = 60% 落在暖浅色带）、`file://` 下 `mask-image` 失效、署名表不完整 —— 全部列在[做不到与已知边界](README.md#做不到与已知边界)。

完整中文版： **[README.md](README.md)**（与本文逐节对译）。

---

<div align="center">

**Web Style Atlas** turns styles into specimens you can open, run, and take apart into fields.<br>
*"30 runnable styles, not mockups."*

</div>
