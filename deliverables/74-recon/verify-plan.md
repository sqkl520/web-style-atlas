# Verification Plan / Findings (74-recon)

Independent re-derivation of D1–D4. Written incrementally so a crash loses nothing.
All commands run from D:/Web/style, Git Bash, node v26.12.1, wall clock 2026-11-04 ~01:10–02:30 local.

---

## D1 — "verify-prototype --all exits 1, 28/2, S02 is a FALSE POSITIVE caused by a CSS comment"

### D1a — reproduction (CONFIRMED)
```
EXIT=1
WALL_MS=12129
✗ S02 S02-gilded-symmetry-salon
    html 25.7K / css 21.1K / FAIL 0 / WARN 2 / 真图 7 / 截图 8
    · body 规则挂了背景图 → 对比度检查会静默跳过
✗ S08 S08-amber-overprint-lightbox
    html 20.2K / css 15.4K / FAIL 2 / WARN 2 / 真图 6 / 截图 10
    · 闸门 FAIL=2：palette-terracotta font-count
达标 28 / 不达标 2 / 共 30
```
Exactly 28 / 2, S02 + S08, exit 1, ~12 s. Sub-claim confirmed verbatim.

### D1b — how it extracts the body/html block: it does NOT strip comments
`prototypes/_build/verify-prototype.mjs:75-78`:
```js
  // 4 body 不得挂背景图（契约 §9.2：会让对比度检查整条静默跳过）
  for (const m of C.matchAll(/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g)) {
    if (/background-image|background\s*:[^;]*url\(/.test(m[2])) out.problems.push(`${m[1]} 规则挂了背景图 → 对比度检查会静默跳过`);
  }
```
The file *does* have a comment-stripper (`stripNonRendered`, lines 18-25: `<!-- -->`, `/* */`, `<script>`, `<style>`, `//`),
but it is applied **only** to the Emoji rule (line 69). Rule 4 matches the raw file `C`.
The regex is `/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g` — it takes everything up to the first `}`, comments included.

### D1c — the comment that trips it
`prototypes/S02-gilded-symmetry-salon/style.css:52-63`, inside the `body { }` block (lines 49-70):
```
52    /* 炭黑卡纸的纤维纹理**不在这里** —— 见下方 body::before。
54     * 2026-10-31 修（`check-texture.mjs` 抓到的唯一真实违规）：
55     * 原本 `background-image: url("assets/card-grain.png")` 直接挂在 body 上，
...
63     * 挪到伪元素后闸门恢复视力，结论才可信。 */
```
Reproduced raw match (throwaway script, exact same regex):
```
--- match #2 tag=body startsAtLine=47 capturedBlockLines=47..70 VERDICT_HIT=true
RAW MATCH >>>"}\n\nbody {\n  margin: 0;\n  background-color: var(--card);\n  /* 炭黑卡纸的纤维纹理**不在这里** ...
 ...
HIT text="background-image" at absolute line 55
```
Line 55 is a **comment line**. The real `background-image` declaration in this file is at line 44 on
`body::before` (lines 39-47), which is exactly what `_CONTRACT.md` §9.2/§9.16 recommends.

### D1d — check-texture.mjs says S02 clean, and it DOES strip comments (CONFIRMED)
```
EXIT=0
纹理载体闸门：31 个 style.css（30 案 + 产品入口）
  已检查 style.css        31
  body/html 规则数        85
  违规                     0
合计 FAIL 0 / WARN 0
```
`check-texture.mjs:47` `const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');`
applied at `:126` before `parseRules()` (a brace-state-machine parser, `:67-92`).
Its header comment (`:56-61`) even records that an older regex version of *this same check* had skipped S02's body rule.
So two gates in the same directory disagree about the same bytes, and the one that strips comments is the one that is right.

### D1e — history (nuanced; the claim's premise is WRONG)
- `git blame -L 49,64`: the comment block 52-63 was added by **ab02f43 (2026-10-31)**.
- `git log --oneline -- prototypes/_build/check-texture.mjs` → **1 commit: ab02f43**. The gate was born in that commit.
- Pre-fix S02 (`git show ab02f43^:…style.css`): the declaration really was on `body`:
  ```
  31:body {
  32-  margin: 0;
  33-  background-color: var(--card);
  34-  /* 炭黑卡纸的纤维：程序化生成的 128px 平铺位图，不是渐变 */
  35-  background-image: url("assets/card-grain.png");
  ```
  Counterfactual against that pre-fix CSS:
  - verify-prototype's rule-4 regex → **`blocks=1 hits=[]`  (0 hits — it MISSED the real violation)**
  - check-texture (run against a reconstructed pre-fix tree) → `违规 1`, `✗ [T1-body-background-image] S02`, EXIT=1
- The S02 report.json at `ab02f43^` (`at 2026-10-29T16:38:09.386Z`) still read `WARN:font-count, WARN:no-footage` —
  i.e. no contrast finding, the documented "gate went blind" symptom.
- Counterfactual on HEAD with all comments stripped → `blocks=2 hits=[]` (no problem).

**Therefore: the check did NOT "pass before that commit" — it was green on S02 only because it could not see the
real violation, and it is red now only because it cannot tell a comment from a declaration. It has never been
correct on S02. Both its old green and its new red are wrong.**

### D1f — S08 is a real defect, not a false positive (CONFIRMED as real)
`prototypes/S08-amber-overprint-lightbox/.inspect/report.json` (`at 2026-10-30T18:26:37.942Z`, `allow: []`):
```
FAIL palette-terracotta  "Terracotta / rust-orange accent (button #c46a1f)." alsoAt [768,390]
FAIL font-count          "4 typefaces in use (Source Serif 4, Noto Serif SC, Overprint Numerals, Gloock)." alsoAt [768,390]
WARN no-footage / WARN card-rows
```
`#c46a1f` really is in the page (style.css ×2, index.html ×3). `colourFamily()` in
`tools/taste-skill/.../lib/rules.mjs:12` is `inRange(h,6,30) && s>=0.38 && s<=0.85 && l>=0.42 && l<=0.72`;
`#c46a1f` is h≈23.7 / s≈0.73 / l≈0.44 → inside the banned window.
**The exemption exists:** `prototypes/_CONTRACT.md:201` registers `palette-terracotta` for S08 in the §9.15 allow-table
(added 2026-10-24 after an audit found the README had been citing an exemption row that did not exist), together with
`_CONTRACT.md:117` allowing 4 type families when four genuinely distinct roles are declared.
`check-contract.mjs` (run: `EXIT=0`, `C1 FAIL 全在允许表内 2/2`) confirms S08's 2 FAILs are inside the allowed table.
So: **S08's two FAILs are real measurements, correctly reported, and validly exempted by the contract — not a
false positive, and not unexamined debt.** `verify-prototype --all` is *designed* to report raw FAILs regardless of
§9.15 (`:143-158` comment says so); it is `check-contract` that judges excusability.

**D1 verdict: PARTLY TRUE.**
- TRUE: exit 1 / 28-2 / S02+S08 (verbatim reproduced); S02 *is* a checker bug (comment-blind regex, line 76);
  check-texture on the same file says clean *because* it strips comments.
- TRUE: S08 is a genuine defect state (real palette + real 4-font count), validly exempted — not a false positive.
- FALSE: "S02 is a false positive" framed as "the check passed before that commit". It never passed correctly;
  pre-fix it missed the very violation it exists to catch. The bug is older than the comment (regex landed in `caefdd9`).

---

## D2 — "README claims the bench deliberately keeps a body-size FAIL; false, and never true"

### D2a — the exact text
`README.md:393` (blame: `9d842c7`, 2026-10-29):
> 已知仍未清零的一条：`body-size` 判「正文 13px」。这是**选的**，不是漏的——本页正文主体是方案卡的元数据（30 案 × 十几个 13px 字段名与读数），把整页正文抬到 16px 会让列表页首屏从 1 张完整卡掉到 0 张（这正是 `67-exec` 那一轮花几十像素救回来的东西）。这一条在 `inspect.mjs` 里保持 FAIL 是诚实的，不靠 `--allow` 放行。

EN twin `README-EN.md:397` says the same.

### D2b — `grep -rn "body-size"` (all files, not just the report)
Only two *live claims* about the bench: `README.md:331` ("`FAIL 2`（`body-size` / `hairline`）") and `README.md:393`.
The `_selection` report itself contains zero.

### D2c — `git log --all -S"body-size" -- prototypes/_selection/.inspect/report.json`
**Empty output (zero commits).** I went further and decoded every one of the 15 committed revisions of that file:
```
caefdd9 2026-10-19T14:40:39Z bodySize=16 WARN:no-footage,WARN:measure
7710187 2026-10-20T17:39:00Z bodySize=16 ...
b2e0ea8 2026-10-21T15:31:38Z bodySize=16 ...
bce1814 2026-10-21T18:45:09Z bodySize=16 ...
1f30e7d 2026-10-21T19:51:17Z bodySize=16 ...
9d842c7 2026-10-28T16:11:15Z bodySize=16 WARN:no-footage
03f6fd4 … ab02f43 2026-10-30T21:07:40Z bodySize=16 WARN:no-footage
```
`type.body.size` is **16 at 1440, 768 and 390** in the committed report; `allow: []`; findings = `WARN no-footage` only.
The CSS agrees: `prototypes/_selection/style.css:119` `font-size: var(--s-16)` and `:85  --s-16: 16px` —
and that has been true in **every** commit that touched `_selection/style.css` (12 commits checked).

### D2d — threshold & arithmetic
`tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs:106-107`:
```js
if (m.type.body && m.type.body.size < 15) add('FAIL','body-size', `Body text is ${m.type.body.size}px …`);
else if (m.type.body && m.type.body.size < 16 && !mobile) add('WARN','body-size', `Body text is ${m.type.body.size}px.`);
```
With `size = 16`, both branches are unreachable. FAIL is arithmetically impossible at HEAD.

### D2e — was it ever true? YES — for one commit, and the README describes a *different* cause
- Before `9d842c7`, `span.row-family` had **no** `font-size` and inherited 13px; it carried 96.1 % of qualifying
  running text. Commit `9d842c7` changed it to `font-size: var(--s-16)` (`style.css:506-516`) and recorded the
  measurement: `body-size FAIL @1440/768/390`, "6,958 / 7,236 字符 = 96 %" (`deliverables/68-exec/EXEC-row-family.md:82`).
  `03f6fd4` also records `body-size | FAIL ×1「Body text is 13px」| 仍在` (`67-exec/EXEC-rules-compliance.md:20`).
  So a 13px body FAIL did exist through 2026-10-28.
- **But the README's stated reason is wrong twice over:** it says the 13px is "方案卡的元数据（字段名与读数）", when the
  measurement says all 13px field labels contribute **0** (`chars >= 60` filter excludes them; 6958 of 7236 chars came
  from `.row-family` alone — `deliverables/68-plan/LEAD-body-size-verdict.md:30-52`). And it claims the FAIL is
  "还在、是选的", when the very same commit `9d842c7` **fixed it**.
- Divergence evidence: all 15 committed report.json files were regenerated at times that predate every relevant CSS
  change (the last one committed, `ab02f43`, carries `at 2026-10-30T21:07:40Z`, whereas the 16px fix landed 2026-10-29),
  while record-keeping docs (`deliverables/68-*`) say `body-size` disappeared, and the live metrics show 16px.

**D2 verdict: CONFIRMED (the claim is false at HEAD, and was never true in the form stated).**
Sharpened: the sentence is stale by one commit *and* mis-attributes the cause. Its 13px figure was true up to
`9d842c7`, which fixed the very thing the sentence still calls a deliberate, standing FAIL. And line 331 of the same
README still cites a `FAIL 2 (*body-size*/hairline)` re-run that no committed report contains.
Highest-severity part: the README tells a reader that a passing gate is failing, "by choice", citing a fix commit as
evidence for keeping it — an un-falsifiable excuse for a non-existent defect.

---

## D3 — "22 of 30 schemes show 4 swatches in the bench but their prompt demands 4-7 colours"

Script: `/c/Users/Administrator/AppData/Local/Temp/d3.mjs` and `d3b.mjs`, `d3c.mjs` (outside the repo, per instructions).
Loads `data.js` + `prompts.js` with `vm` in `{window:{}}`, then calls the real `window.buildStylePrompt(id)` from
`prompt-copy.js` to confirm the rendered prompt line.

```
id  bench_swatches  prompt_colours
S01   4   4
S02   4   7  <-- MISMATCH
S03   4   7  <-- MISMATCH
S04   4   4
S05   4   7  <-- MISMATCH
S06   4   7  <-- MISMATCH
S07   4   4
S08   4   6  <-- MISMATCH
S09   4   4
S10   4   5  <-- MISMATCH
S11   4   4
S12   4   7  <-- MISMATCH
S13   4   4
S14   4   7  <-- MISMATCH
S15   4   4
S16   4   5  <-- MISMATCH
S17   3   7  <-- MISMATCH
S18   4   6  <-- MISMATCH
S19   4   7  <-- MISMATCH
S20   4   4
S21   4   5  <-- MISMATCH
S22   3   4  <-- MISMATCH
S23   4   7  <-- MISMATCH
S24   4   7  <-- MISMATCH
S25   4   6  <-- MISMATCH
S26   4   7  <-- MISMATCH
S27   3   6  <-- MISMATCH
S28   3   4  <-- MISMATCH
S29   4   6  <-- MISMATCH
S30   3   6  <-- MISMATCH
```
- **bench distribution: `{3: 5, 4: 25}`  (I verified in `app.js:518` / `wizard.js:192`: both do `.slice(0, 4)`)**
- **prompt distribution: `{4: 10, 5: 3, 6: 6, 7: 11}`**
- **mismatch count: 22 / 30** — ids exactly: S02 S03 S05 S06 S08 S10 S12 S14 S16 S17 S18 S19 S21 S22 S23 S24 S25 S26 S27 S28 S29 S30
- every prompt count is 4–7 (30/30), so "their prompt demands 4-7 colours" is exact.
- bench==4 & prompt>4: **17**; bench==3 & prompt>3: **5** → the split of the 22.

### Is it a defect or a documented display limit?
- All 30 bench palettes are a **subset** of the prompt hex list (`30/30`), so the bench never shows a colour the
  prompt omits. The discrepancy is pure truncation.
- It **is** documented, twice, as intentional: `prompts.js:8-11` ("dna.palette 由最多 5 色放宽到最多 7 色 … 提示词里的
  「配色只用这几个值」照列全"), and `build-prompts.mjs:250-258` (why it stopped slicing at 5 — S19's and S24's primary
  colours were being cut out of the prompt).
- So the bench shows 4 of N **because the row card is 4 slots wide**, and the prompt lists all N **on purpose**.
- Collision note: `data.js` mtime moved during my session (`01:02:54` → `01:51:02`), `prompts.js` mtime `00:52:20` —
  a generator was rewriting them concurrently. However my numbers were reproduced identically before and after,
  and `git status --porcelain | grep -v '^??'` is empty, so the tracked contents were equivalent at both reads.

**D3 verdict: CONFIRMED** (22/30 exactly; distributions as stated). Caveat framing: the 22-案 gap is real and
*intentional on both sides* (4-swatch card vs. full 4-7 colour prompt). It is a **display/data mismatch the bench never
explains to the user**, not evidence that either file is wrong. The user-visible risk (real): a reader sees 4 chips and
the prompt he copies says "use only these values: 7 of them".

---

## D4 — "templates/ is covered by no gate except a path-exists check; M01/M02 READMEs contradict root README about box-shadow"

### D4a — what actually touches templates/
`grep -rn templates prototypes/_build/*.mjs` → **only `check-docs.mjs`**, and only in the doc-path checker:
- `:859` `PREFIXES` includes `'templates/'` → `:877-897` "documented path exists" (`paths/exist`)
- `:905-912` `templates/(M\d{2})` → "documented template number exists" (`paths/templates`)
No gate reads `templates/*/style.css`, `index.html`, or the template READMEs. `_entries.mjs` contains no `M0`/`templates`
entry, so `verify-prototype --all`, `check-stale`, `check-anchors`, `check-texture`, `check-twolines`, `check-prompts`,
`check-contract` all skip the three templates. `git log --all -- 'templates/*/.inspect/*'` is **empty** — templates have
never been rendered through `inspect.mjs` in the repo.
**→ CONFIRMED: path-exists is the only templates coverage.** (HTML/CSS are completely unguarded.)

### D4b — actual box-shadow counts
```
templates/M01-clean-corporate/style.css: 3   (L204 .site-nav dropdown, L284 .card, L560 none-reset inside @media)
templates/M02-warm-local/style.css:      0
templates/M03-bold-creator/style.css:    1   (L122 hamburger bars, 0 ±5px 0 currentColor)
```
These match the root README's stated counts exactly (M01 3, M03 1).

### D4c — the two claims, read fairly
- **Root `README.md:215-216`**: "⚠️ `box-shadow` 0 其实没守住：M01 有 3 处、M03 有 1 处 … 而 M01 自己的 `README.md` 就承认这是有意豁免——两层文档对同一处声明给过相反结论。"
- **Root `README.md:213`** (the sentence the warning annotates) now lists only `gradient` 0、`backdrop-filter` 0、Emoji 0
  — I checked those three: `gradient=0 backdrop=0 emoji=0` in **all three** templates. So the *held list at HEAD* is true.
- **`templates/M01-clean-corporate/README.md:162`** is the exemption row for `R-16 / C-2.11`, and it states the shadows
  openly: `--radius:10px` + "一段很浅的两层阴影 `0 1px 2px` + `0 16px 30px -24px`" — matching `style.css:284` verbatim.
  M01 also documents its dropdown shadow via `TOKENS.md:176`.
- **`templates/M02-warm-local/README.md:188`**: "圆角只有 `8px`，**全站零 `box-shadow`**" — and M02's CSS really has 0.
  `M02 → README.md:277` also states `shadow` had no findings under `inspect.mjs`.
- **`templates/M03-bold-creator/README.md:160`** discloses its 1 exception by file line ("style.css L122 … 与根 README 的披露一致").

**So: is it a contradiction?** The *current* pair (root README + M01/M02/M03 READMEs) is one deliberate **exemption**, not
a contradiction, and it is mutual and accurate: root says "the 0 claim is not held; here are the counts"; M01 says
"we exempt R-16 and use exactly these shadows"; M03 says "1 exception, at L122". The older *contradiction* is real history
and is so recorded. Verified commit sequence and exact diff (`git merge-base --is-ancestor 68f949e 5c4209d` → **yes**):
- `68f949e` (2026-10-20, templates introduced) `README.md:53` held-list read
  `仍然守住的条款（`box-shadow` 0、`gradient` 0、`backdrop-filter` 0、Emoji 0、无空洞营销词）` → **contradiction live**.
- **`5c4209d` (2026-10-22, "补上文档准确性终版另三处：… box-shadow 0 是假声明 …") is the fixer.** Its README hunk:
  ```
  -… 并列出仍然守住的条款（`box-shadow` 0、`gradient` 0、`backdrop-filter` 0、Emoji 0、无空洞营销词）。
  +… 并列出仍然守住的条款（`gradient` 0、`backdrop-filter` 0、Emoji 0、无空洞营销词）
  +> ⚠️ **`box-shadow` 0 其实没守住**：M01 有 3 处、M03 有 1 处 … 本条已从上一句里删掉。。
  ```
  i.e. the claim was pulled from the held-list and re-stated as an explicit warning *because it was a false claim*.
  (`d27497d5` 2026-10-24 later rewrote both READMEs and kept the corrected form; it did not remove it.)
("this item has been removed from the preceding sentence") — i.e. the contradiction was already noted and fixed on
2026-10-24, and the warning block at 215-216 is the residue kept for the history.

**D4 verdict: PARTLY TRUE.**
- TRUE: templates/ (HTML+CSS+READMEs) are covered by no gate beyond path-exists. Reproduced by grep and by the absence
  of any `templates` entry in `_entries.mjs` / any `.inspect` history.
- FALSE (as stated for HEAD): root README vs M01/M02 README do **not** contradict each other now. They are an
  *exemption* that is recorded on both sides with matching numbers — M01 3 / M03 1 / M02 0 in root README:215 =
  M01 README:162 + M03 README:160 + M02 README:188. The contradiction existed **before `d27497d5`** and root README:215-216
  is the explicit tombstone for it. Taking line 216 ("给过相反结论", *past tense*) literally makes the README correct;
  reading it as "still contradict now" is what's false. The real remaining hole is D4a: nothing machine-checks
  those numbers, so the README's M01-3/M03-1 disclosure is itself unguarded — it can drift silently.

---

## Verdict table

| Claim | Verdict | One-line reason |
| --- | --- | --- |
| D1 gate exits 1 / 28-2 / S08 real | **CONFIRMED** | verbatim reproduced, 12.1 s, exit 1 |
| D1 S02 is a false positive from a comment | **CONFIRMED** | `verify-prototype.mjs:76` regex has no comment strip; match is line 55, a comment; `check-texture.mjs:47` strips and says clean |
| D1 (implied) "it passed before that commit" | **FALSE** | pre-`ab02f43` CSS had the texture on `body`; the same regex returned 0 hits then — it never caught it |
| D2 README's deliberate body-size FAIL is false at HEAD | **CONFIRMED** | body 16px at all 3 viewports in every committed report; <15 FAIL unreachable |
| D2 "never been true" | **PARTLY TRUE** | 13px `body-size` FAIL was real through 2026-10-28; `9d842c7` fixed it and the same commit wrote the sentence; its stated cause (card metadata) is also wrong |
| D3 22/30 show 4 swatches vs 4-7 colour prompt | **CONFIRMED** | exact 22/30; bench {3:5,4:25} via `.slice(0,4)`, prompt {4:10,5:3,6:6,7:11} |
| D4 templates covered by no gate but path-exists | **CONFIRMED** | only `check-docs.mjs` refs; zero `.inspect` history |
| D4 M01/M02 READMEs contradict root README on box-shadow | **PARTLY TRUE / FALSE at HEAD** | today it's a mutually-recorded exemption with matching counts; the contradiction was real from `68f949e` (2026-10-20) and was already removed by `5c4209d` (2026-10-22) |

**Most serious: D1's S02 half.** Not because the gate is red, but because of *what the red and the preceding green
prove*: the check that is supposed to guarantee "the page's own texture never blinds the contrast probe" has been
wrong in **both** directions on the same file — 0 hits while the violation was real (`ab02f43^`), 1 false hit while the
page is compliant (HEAD). Every report.json S02 shipped during the green period had contrast computed under the
documented `bgBehind()` short-circuit. That is the one defect class this repo says is unforgivable
("会伪造通过" — fakes a pass), and it is the only claim here where a currently-green number is untrustworthy rather than
merely a stale sentence.

Note on D2 severity: it is not merely stale prose either. `README.md:393` in the *current* tree tells a reader that a
gate finding is FAILing "by choice" and that lifting it would cost the first screen its complete card — a rationale that
was measured against a **different** selector, and that stopped being true when `9d842c7` fixed `.row-family` to 16px.
A false refusal to fix is cheaper than a false pass, but it is the same species: a claim that no script checks.

## Commands / exit codes used
```
node prototypes/_build/verify-prototype.mjs --all                     EXIT=1  (12129 ms)
node prototypes/_build/check-texture.mjs                             EXIT=0  (0 fails / 31 files)
node prototypes/_build/check-contract.mjs                            EXIT=0  (C1 2/2, C2 5/5, WARN 1 = C4 no claims)
git status --porcelain | grep -v '^??'                                (empty — no tracked modifications)
```
No tracked file was modified by me. All scratch scripts live outside the repo
(`C:/Users/Administrator/AppData/Local/Temp/d1probe/…`, `d3.mjs`, `d3b.mjs`, `d3c.mjs`, `d1c.mjs`, `d1f.mjs`).

## Final tree state

`git status --porcelain | grep -v "^??"` -> **0 lines** (exit 1 from grep = no match). No tracked file was modified by me.
Only addition: this plan file under the already-untracked `deliverables/74-recon/`.
