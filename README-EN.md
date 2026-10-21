English | [简体中文](README.md)

> ⚠️ **This is neither a ready-to-launch website nor a design system.** It is a **style specimen library**: 30 mutually distinct design schemes, each with a runnable prototype, plus **3 mainstream templates** (take one and use it) and **a selection bench + a selection wizard** (to help you pick from the 30). Pure static — no build step, no backend.

# Web Style Atlas

30 website design schemes, each with a **real, runnable HTML/CSS prototype** you can open directly; plus 3 **mainstream templates** (self-contained — change a few variables and it becomes your site); all collected into **a filterable selection bench** and **a five-question selection wizard**.

## Features

**Content**

- **30 design schemes** — each is a complete **design argument**, not a colour skin. Twelve fields cover: a one-line visual definition, aesthetic family and references, a colour system (with area ratios and mood), a type strategy, layout and grid (with behaviour at three breakpoints), key visual elements, motion and interaction (with a reduced-motion fallback), anti-AI-cliché review points, risks and how they are avoided, suitable uses (plus what it is *not* for), implementation notes (with a performance budget), and one **signature quirk of the designer**
- **30 runnable prototypes** — real typography, real copy, real assets, real error states, real `prefers-reduced-motion` fallbacks; **26 pass the gate with FAIL=0**, producing 272 rendered screenshots
- **15 F-type / 15 R-type** — F-type has a fixed skeleton (a visitor knows what to look at and click within three seconds); R-type is *mechanism-driven* (one physical mechanism organises the content). All 30 aesthetic families are **mutually distinct**
- **3 mainstream templates** — see the next section. They are **a separate layer** with different rules, and each one documents the scope of its exemptions in its own README

**Browsing and choosing**

- **Selection bench** (`prototypes/_selection/`) — all 30 schemes on one page: each row shows structure type / cognitive threshold / tone, the one-line definition, colour swatches, the error code, gate results, and **real renders at three viewports: desktop 1440, tablet 768, mobile 390**. Filter, search, sort; click a row to expand the full twelve fields and a paged full-page view; `#S07` deep-links to a single scheme
- **Selection wizard** (`prototypes/_selection/wizard.html`) — five questions about **your situation**, not "what style do you like". It outputs **3 recommendations and 3 explicit exclusions**, and every "why" is read from **measured values** (body word count, real picture count, highest saturation in the palette, declared cognitive threshold, and a memorability proxy built from tone and chroma). It never assigns a subjective score to a scheme. Answers replay from the URL (`?load=2&img=2&loud=2&guide=0&fear=2`)
- **Keyboard accessible** — on the bench, `J`/`K` moves between schemes, `1`/`2`/`3` switches viewport, `/` focuses search, `Esc` closes

**Toolchain (all in `prototypes/_build/`, plain Node + Python, no npm dependencies)**

- **`render-scheme.mjs`** — render one prototype and print the gate result (real screenshots at three viewports)
- **`verify-prototype.mjs`** — mechanical check: remote resources, banned font stacks, emoji, broken images, real-picture count, horizontal overflow, gate counts
- **`shot.mjs` + `shot-page.py`** — a **zero-dependency screenshot tool** (no third-party design tooling, no CDP): full-page capture, slicing by viewport, and per-screen pixel statistics (dominant colours, mean luminance, blank-screen detection)
- **`fetch-fonts.mjs` / `selfhost-fonts.mjs`** — fetch fonts for self-hosting and rewrite a page's external font links to local ones
- **`assign-assets.mjs` / `make-textures.py`** — an asset fallback (cross-assign real photos from the existing corpus by subject) and **14 deterministic texture generators** (parameters are written to disk and are byte-reproducible)
- **`collect-schemes.mjs` / `summarize-all.mjs`** — generate `data.js` for the bench, and summarise render reports across the repository

## The 3 mainstream templates (`templates/`)

All three are **runnable from two files** (`index.html` + `style.css`) with **zero external dependencies**: no image files, no JS libraries, no CDN, no build step. Image slots are **inline SVG placeholder frames** (greyscale, with aspect ratio and suggested pixel size), and copy uses **placeholder markers** `【replace with: …】` so you can search for exactly what to fill in. Fonts use a **system font stack**, so they render correctly and instantly on any machine with no flash of missing text.

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

> **Why does this layer have different rules from the 30 schemes?** The 30 schemes follow a strict "anti-AI-cliché" specification that bans, among other things: a centred headline with three equal cards and a bottom CTA; alternating white / light-grey section backgrounds; pure white ground with pure black text and a single accent; floating cards with soft shadows; `Inter`/`system-ui` as the primary face; purple-blue gradients; and frosted-glass sticky navigation. **Those bans are precisely what makes a "mainstream template" work.** So this layer **explicitly exempts itself** from them — keeping the two standards apart: **the 30-scheme layer aims to be remembered; this layer aims not to put a foot wrong and to be usable the moment you pick it up.** Each README lists the exact scope of the exemption with a **use-level** justification (never "because it is mainstream"), and also lists what it still holds to (`gradient: 0`, `backdrop-filter: 0`, zero emoji, no empty marketing words)
> ⚠️ **`box-shadow: 0` is not actually held**: M01 has 3 and M03 has 1 (using `box-shadow` to draw the hamburger bars). **And M01's own `README.md` admits this is a deliberate exemption**, so the two documentation layers have given opposite conclusions about the same declaration..

## Quick start

The whole repository is **pure static**: no backend, no build, no dependency installation. The only requirement is to open it **over HTTP** rather than double-clicking a file (the prototypes reference fonts and screenshots by relative path, and some browsers block that under `file://`).

```bash
# pick one
npx serve .                          # Node (no prior install; npx fetches it)
python -m http.server 8080           # Python 3
php -S localhost:8080                # PHP
```

Then open:

```
http://localhost:8080/prototypes/_selection/             # the selection bench (main entry)
http://localhost:8080/prototypes/_selection/wizard.html  # the selection wizard
http://localhost:8080/templates/M01-clean-corporate/     # one mainstream template
http://localhost:8080/prototypes/S14-zero-g-launch-sequence/  # one prototype
```

> **The repository is about 180 MB** (photos, rendered screenshots, self-hosted fonts), so prefer a shallow clone: `git clone --depth 1 <repo-url>`
> If you only want to look at screenshots without cloning, browse `prototypes/<scheme>/` on the GitHub web UI.

## Deployment

**Any static host works with no configuration and no environment variables. The site root is the repository root.**

### Step 1: push to your own repository

```bash
git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
cd web-style-atlas
git remote set-url origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### Step 2: enable Pages

Repository page → **Settings → Pages** → set **Source** to `Deploy from a branch` → **Branch** `main`, directory `/ (root)` → Save. A minute or two later, open `https://<user>.github.io/<repo>/`. The `index.html` in the repository root redirects to the selection bench.

Command-line equivalent:

```bash
gh api -X POST repos/:owner/:repo/pages -f 'source[branch]=main' -f 'source[path]=/'
```

> **You must keep the `.nojekyll` file in the repository root.** Pages builds with Jekyll by default, and **Jekyll drops every directory whose name starts with an underscore** — which is exactly where this site's content lives (`prototypes/_selection/`, `_fonts/`, `_specs/`, `_build/`). Delete it and the whole site returns 404.

### Step 3: other hosts

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

### Step 4: using a single prototype on its own

Each `prototypes/<scheme>/` directory is **self-contained** (`index.html` + `style.css` + `assets/`). To run one standalone you must also bring **`prototypes/_fonts/`**, because it references `../_fonts/css/*.css`. Put both parts under the same parent directory.

**The mainstream templates (`templates/M0x/`) have no such constraint** — they use system font stacks, so you can copy a single directory and go.

## Rendering and verification

```bash
# render one prototype: real screenshots at three viewports + gate result
# ⚠️ This command only runs as-is on the original development machine: its ROOT is hardcoded to
#    D:/Web/style, and it depends on tools/taste-skill/…/inspect.mjs — but tools/ is excluded by
#    .gitignore and is NOT in the repository. A cloner must obtain that tool and edit ROOT in line 16,
#    or use shot.mjs below, which has no such dependency.
node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence

# mechanical check (no arguments checks everything)
node prototypes/_build/verify-prototype.mjs --all

# zero-dependency screenshot capture: full page + per-screen slices + pixel statistics
node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ --out .shots --widths 1440,768,390 --name S14
```

⚠️ **A trap that will fool you**: `chrome --headless=new --window-size=390,844` **does not give you a 390 viewport**. On Windows, Chrome enforces a **minimum window width of about 500 CSS px**; the layout is computed at 500 while the screenshot is written 390 wide — so what you get is a **left-hand crop of a 500px layout**, and you will see **phantom defects** such as "the text is truncated" or "the hamburger menu has disappeared". Likewise `--window-size=768,1024` actually yields an `innerWidth` of only 752.

**For narrow-viewport verification, use `shot.mjs` above** (its 390 tier builds a real viewport with an iframe) or any tool that goes through CDP `Emulation.setDeviceMetricsOverride`. `--window-size` is fine at 1440.

## Licensing and attribution

Three parts, three different licences — please treat them separately:

| Content | Licence |
| --- | --- |
| **Code and documentation in this repository** (`index.html` / `style.css` / `app.js` / `templates/` / `_build/` scripts / `deliverables/` / README) | **MIT**, see [LICENSE](LICENSE) |
| **Fonts** (`prototypes/_fonts/`) | Their own licences, overwhelmingly **SIL OFL 1.1** (Noto / IBM Plex / Archivo / Oswald / Syne / Space Mono and others). Source and licence appear in the header comment of each `_fonts/css/*.css` |
| **Photographs** (each prototype's `assets/`) | **Third-party material, not licensed by this repository.** Mostly Wikimedia Commons under **CC BY / CC BY-SA / CC0 / public domain**, plus some **NASA imagery** (public domain) |

**The author, licence and source URL of every single photograph are listed per image in each prototype's `assets/CREDITS.md`.** Before reusing any of them, check that table and comply with its licence (CC BY and CC BY-SA require attribution; some also require share-alike).

> ⚠️ **That sentence has two known exceptions — do not read it as a whole-repository fact.**
> The `CREDITS.md` of `S04` / `S07` / `S08` / `S13` / `S17` **admits that the per-image author and licence were not preserved** (those fields were never written down when the assets were fetched), covering roughly **38 third-party photographs**; and across the repository **11 rows** record the licence as "see source page" while the source page is empty — the root cause being that `_build/assign-assets.mjs` copies only the filename when reusing an asset across schemes, dropping `page` / `artist` / `license` (the source scheme does have those fields). **Photographs in those five schemes must not be reused** until their attribution tables are complete.
> Also: the "where it is used on the page" column in the `CREDITS.md` of `S14` / `S15` is **unrefreshed placeholder text** (28 occurrences in S14) — do not use it to judge whether an image is used.

**The procedural textures are not photographs**: they are produced by `_build/make-textures.py`, their parameters are written to disk (each scheme's `build/texture-job.json`), and they are byte-reproducible. They carry no third-party rights.

> ⚠️ **But those parameter files are not in the repository**: `.gitignore` excludes `prototypes/*/build/`, and only **12 of 30 schemes** have a `build/texture-job.json` on disk. So "byte-reproducible" **cannot be checked by anyone who clones this** — and it is the basis on which `LICENSE` declares "no third-party rights", so today **that basis is unverifiable**. Making it verifiable means moving the 14 generators' parameter tables to a path that is not ignored (e.g. `prototypes/_build/textures/`).

> ⚠️ **The licence of "derivative works" needs saying separately.** Clause 3 of `LICENSE` delimits the MIT scope by **filename** (`assets/texture-*.png`) while clause 2 delimits third-party material by **directory** — and the **derivatives in between** (`halftone-*.png`, `*-dither.png`, `plate-*.jpg`, `photo-*.jpg`; roughly **183 of the 287 referenced bitmaps**) **fall into the complement of both clauses, and the repository previously said nothing about their licence** (only `S02` stated that "derivatives inherit the source licence"). A **`2bis`** clause has now been added to `LICENSE`.

**The mainstream templates contain no third-party assets at all** — image slots are inline SVG placeholder frames, so there is nothing to clear.

## Dependencies

- Browsing and deployment: **none** (pure static)
- Rendering and verification tools: Node.js 18+, Python 3.8+ (Pillow), Google Chrome
- **No third-party design review tooling is used**; `prototypes/_build/shot.mjs` is entirely dependency-free

## Known gaps

- **Four older prototypes still have gate failures — 8 in total**: `S07` `mono` (1); `S08` `palette-terracotta` + `font-count` (2); `S13` `mono` + `shadow` (17 occurrences) + `button-fx` + `empty-screens` (4); `S21` `mono` (1). **`S21`'s `few-pictures` and `empty-screens` are now fixed** (six of the 28 on-subject photos in its own `assets/_cand/` are wired up; real pictures went 0 → 6). The `mono` in `S07`/`S08`/`S13`/`S21` and `S08`'s amber brand colour are **known exemptions** (see `prototypes/_CONTRACT.md` §9.15); **`S13`'s `shadow` (17 occurrences) and `button-fx` have no exemption record** — the 30-scheme layer mandates `box-shadow: 0`, so those two are genuinely unresolved
- **Ground-colour homogeneity is real**: **18 / 30 = 60% sit in a warm pale band** (criterion: `hue 28–72° and lightness ≥78`). Two findings say more than the percentage does: **12 schemes (40%) form a single connected block under the wide criterion ΔH ≤ 3° and ΔL ≤ 3°** (largest single step on the chain: ΔE76 = 4.39) — **mind the criterion**: under ΔE76 ≤ 5 the largest connected component is **19 schemes (63%)**, so "12" only holds under the first criterion, and **83% of schemes have no navigation links on the first screen while 97% use zero border-radius**. See [deliverables/29-critique-homogeneity.md](deliverables/29-critique-homogeneity.md)
  > ⚠️ **Any homogeneity figure must state its criterion.** This project has mixed three numbers — **17% / 60% / 73%** — which respectively measure "strictest paper family", "warm pale ground" and "including a warm tint from the brand colour"; **their denominators differ by four cases**. Likewise "12 strict / 22 loose near-identical pairs" comes from **rounding hue and lightness before comparing**; comparing the continuous values directly gives 8 / 17. The provenance of all three is reconstructed in [deliverables/29](deliverables/29-critique-homogeneity.md) §1.
- **Two further homogeneities beyond ground colour**: on the **quietness axis** (`axes.loud`, derived from the palette's highest chroma), **only 2 schemes are "very quiet"** while 19 (63%) are "loud" — do not read this as `tone`; `tone` is a different set of seven phrases ("chaotic street energy" and so on), the largest of which covers 5 schemes; and of 36 ten-degree hue buckets only 11 are used — **the entire purple→magenta 110° stretch is empty**, as is **the whole lightness range 20–60**. In other words: **the dimensions a user can actually filter on (content volume, complexity) are precisely the ones invisible at thumbnail scale.**
- **Subject gaps**: the available corpus contains no jazz records themselves, so `S28 "Jazz Intaglio Wall"` substitutes record players and printing material; `S22` and `S23` have similar compromises. All are documented in the relevant `CREDITS.md`
- **The `#888888` grey block is specific to the `inspect.mjs` pipeline**: a few desktop scrolled captures under `.inspect/` contain a large patch of exact neutral grey (`desktop-page-03` in S08 at 49.86%, `desktop-page-01` in S17 at 24.27%). **That is a defect in `inspect.mjs`'s own scroll stitching, not grey that exists in the page** — characterised in `deliverables/16-render-look-audit.md`. **Corroboration**: an independent audit scanned all 246 PNGs produced by the `shot.mjs` / bare CDP / Pillow pipeline and found **not one where that grey exceeded 2%** (the highest was 0.236%, an anti-aliased edge on a grey-toned page). So it does not occur with other capture methods.
- **The `measure` rule is a false positive for Chinese**: it estimates character width at 0.5em, while CJK glyphs are about 1.0em, so **divide the reported number by two to get the real character count per line**
- **Under `file://`, CSS `mask-image: url(...)` fails entirely** (rejected by CORS → fully transparent). The affected prototypes are `S04` and `S07`: **double-clicking `index.html` turns their paper blocks and book-edge deckle into a blank wall** — worse than any defect in the pages themselves, and it **looks like the page is broken**. A same-page, same-size http/file comparison measured that region at **5818 distinct colours vs 2**. **This is why the repository requires opening over HTTP** — it is a functional precondition, not a style suggestion.
- A few prototypes have an `index.html` of 30–48.4 KB (the largest is S29 at 49,512 B), above the internal specification's target band. Chinese body copy alone is large (about 14 KB for four thousand characters), and the only way down is to delete content

## Repository layout

```
.
├── index.html                  # redirects to the selection bench (entry point for static hosting)
├── README.md / README-EN.md    # bilingual, translated section by section
├── LICENSE
├── .nojekyll                   # must be kept (see Deployment, step 2)
├── templates/                  # ★ the 3 mainstream templates (M01 / M02 / M03)
├── prototypes/
│   ├── _selection/             # ★ selection bench + selection wizard
│   ├── _fonts/                 # self-hosted fonts (48 stylesheets + woff2 slices)
│   ├── _specs/                 # each scheme's twelve fields + _CURRENT-VALUES.md (authoritative current values)
│   ├── _build/                 # all tool scripts (render / verify / fetch fonts / assign assets / generate textures / staleness check)
│   ├── _CONTRACT.md            # the construction specification (at the prototypes/ root, NOT under _build/)
│   └── S01-… S30-…/            # the 30 prototypes (index.html + style.css + assets/ + .inspect/)
└── deliverables/               # the full document chain, from the brief and research to review records
```

**`_specs/Sxx.md` holds the pre-correction text**; the currently valid colours, fonts and error codes are governed by **`_specs/_CURRENT-VALUES.md`** — across several review rounds more than twenty background colours, brand colours and typefaces were replaced.
