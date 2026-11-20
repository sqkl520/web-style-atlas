[简体中文](CONTRIBUTING.md) | English

# Contributing

## What kinds of changes are accepted

**The style schemes themselves** (`style.css` / `index.html` under
`prototypes/S01…S35/`) are not open to change — every scheme was measured
case by case, and editing one invalidates the baseline of 20+ gates.

Directions that are welcome:

- Fixing bugs in the **toolchain** (`prototypes/_build/`)
- Fixing bugs or accessibility issues in the **selection console / wizard**
  (`prototypes/_selection/`)
- Fixing places where the **docs** disagree with the code
- Fixing self-hosted font subsets or loading

If you want a new style scheme, please open an issue first — adding one has to
satisfy the constraints in `_CONTRACT.md`, the distribution requirements in
`check-distribution.mjs`, and pass every gate. It is not just "add a directory".

## Requirements

- **Node 18+**
- No `npm install` — the whole repository is dependency-free and uses only
  `node:` built-ins
- Some screenshot scripts need Chrome / Edge installed (they drive it over CDP,
  without pulling in Playwright)

## Running the gates

Run this both before and after your change. It is the full self-check, 17 steps:

```bash
node prototypes/_build/quarter.mjs
```

To run a single check:

```bash
node prototypes/_build/check-docs.mjs      # README numbers/IDs vs data.js
node prototypes/_build/check-prompts.mjs   # prompt colours/sizes vs style.css
node prototypes/_build/check-anchors.mjs   # in-page anchors have matching ids
node prototypes/_build/check-stale.mjs     # rendered artifacts newer than sources
```

**Do not bypass a red gate.** Every gate ships a `--selftest` that
deliberately breaks something and re-runs itself, proving the assertion can
actually fail. When you see red, run `--selftest` first to confirm the check
itself is not broken:

```bash
node prototypes/_build/check-docs.mjs --selftest
node prototypes/_build/check-prompts.mjs --selftest
```

### After changing sources

After editing `style.css` / `index.html` / data files, you must re-render the
gate report for that scheme, otherwise `check-stale` will fail (it checks
whether the source is newer than `.inspect/report.json`):

```bash
node prototypes/_build/render-scheme.mjs S19            # one scheme
node prototypes/_build/render-scheme.mjs _selection     # the console
```

After changing the data `data.js` is generated from, re-run the generation chain:

```bash
node prototypes/_build/collect-schemes.mjs    # regenerate data.js for the console
node prototypes/_prompts/build-prompts.mjs    # regenerate prompts.js
```

## Opening a PR

1. Branch from `main`, named `fix/xxx` or `docs/xxx`
2. Change only what you set out to change — no unrelated reformatting
3. **Update the matching docs in the same commit.** If behaviour changed, the
   README changes too — "merge the code now, fix the docs later" is not accepted
4. Confirm `node prototypes/_build/quarter.mjs` is fully green before pushing
5. Commit messages use `type(scope): description` and explain **why**, not just what

```
fix(build): check-stale missed _specs, so spec-only edits stayed green
docs: document the direct/near chip badges on the console
```

## Screenshots and images

The repository ships real photographs (`assets/`). **Do not add images of
unknown provenance** — copyright and likeness are hard constraints here, see
`prototypes/_CONTRACT.md` §10. Open an issue explaining the source first.

## Language

Public documentation is bilingual. Shipping only one side creates a one-way
link that cannot be navigated back:

| Chinese | English |
| --- | --- |
| `README.md` | `README-EN.md` |
| `CONTRIBUTING.md` | `CONTRIBUTING-EN.md` |

New documents need both sides, with a language link on the first line.

> This repository has no `SECURITY.md`: it is a purely static site with no
> backend, no accounts and no user input — it only serves static files.
> For a security concern, open an issue describing it.
