# W5 回归防线评审

复核方式：本机实跑 `check-ui-copy`（FAIL 0 / WARN 0）、`probe-ui --verbose`（8 PASS），并逐条读三个文件。
**过程中我自己的 `--selftest` 跑超时被 kill，结果在 `app.js` / `prompt-copy.js` 上留下了未还原的变异**（见 §2.1，我已 `git checkout` 还原并验证 `node --check` 通过；`data.js` 的改动是你开工前就有的，未动）。

## 一、致命

**1. 静态兜底值就是那两个错数字，而闸门刻意把它抹掉了。**
`index.html:153` 写着 `<span data-derived="chip-groups">11</span> 组 <span data-derived="chip-count">45</span> 颗`。
实测真值（`probe-ui --verbose`）：**10 组 73 颗**。
`fillDerived()`（`app.js:1718`）一旦不跑（脚本 404、JS 抛错、无 JS 抓取、首屏早于 DOMContentLoaded），用户看到的就是 **11 组 45 颗** —— 正是 W5 存在要消灭的那个缺陷，一字不差。
而 `check-ui-copy.mjs:104` 在校验前先把整个 span 抹成 `<DERIVED/>`，所以这道闸门**结构上不可能发现它**。`app.js:1712` 的注释还写着「实际渲染 45 颗」—— 注释也是错的。
→ 修：兜底文本改为 `—`；并加一条断言：`data-derived` span 的静态文本必须为空或 `—`。

**2. `--selftest` 直接改写被 git 跟踪的源文件，且没有信号保护。**
`probe-ui.mjs:346` `fs.writeFileSync(path, src.replace(...))`，还原靠 `:357` 的 `finally`。`SIGTERM`/`SIGINT` 不跑 `finally`：我实跑超时被 kill 后，`app.js` 里留下了 `'field-count': 10` 和一个 `throw new Error("__crash_test__")`，`prompt-copy.js` 里留下了 `if (false) {`。
更糟的是 `src` 是**循环开始时读的快照**，`:358` 用 `src` 覆盖写回 —— 开发者在 selftest 跑的三分钟里保存的任何编辑会被静默回滚。CI 上无影响（容器丢弃），本地是真丢代码。

复现记录（本次评审）：两次 kill 都留下残留 —— 第一次是 `'field-count': 10` + `throw new Error("__crash_test__")` + `if (false) {`；第二次是 `throw new Error("x")` + `if (false) {`。两次都已 `git checkout` 还原并 `node --check` 验证。**当前工作区只剩你开工前就有的 `data.js` 改动。**
→ 修：改到临时副本上跑（`mkdtempSync`）或先 `git stash`；无论如何加 `process.on('SIGINT'|'SIGTERM', restore)`。

## 二、严重：自检层自己没被检

**3. 7/7 里有 2 条是同义反复，判据从未被调用。**
`probe-ui.mjs:363-368`：eval 里 `removeAttribute('aria-live')` 然后 `return getAttribute('aria-live')`，判 `=== null`。这是「我刚删的东西确实没了」，**没有一次调用 `check('count-aria-live', …)`**。`:370-376` 的 `scenes-no-rendered` 同理。两条都打印「→ 红」，但「红」从未被观察到。
→ 修：改走 `check()` + `__selftestSink`，与文件变异那 5 条同构。

**4. 唯一漏掉变异的，正是逻辑上最可能恒真的那条。**
`CASES`（`:297-333`）5 条 + 运行时 2 条 = 7，缺 `chip-count-derived`。`:285` 自己承认「未单独跑，同 3 的机制」—— 是猜的。
而它的判据 `probe-ui.mjs:119` 与实现 `app.js:1722` 是**逐字节相同的选择器**：
```js
document.querySelectorAll('#flt-scene button, .scene-more button, .rail-block .chips button').length
```
把实现抄一份跟自己对答案：选择器漏掉一类芯片时两边一起偏移，断言照样绿。`field-count`（`:137` vs `app.js:1727`）同样同源。
→ 修：`chip-count` 加进 `CASES`（`'chip-count': chipCount` → `: 47`）；判据改为数真实可点元素，不要复述实现选择器。

## 三、中：闸门可被绕过

**5. `check-ui-copy.mjs:17` 宣传的 `--selftest` 不存在。**
`grep argv` 只有 `--quiet`（`:34`）。`node check-ui-copy.mjs --selftest` 会静默跑正常闸门并 **exit 0**。本仓反复治的「闸门看起来跑了其实没跑」，出现在 W5 自己的新文件里。
→ 5 分钟内可做：删掉第 17 行，或实现它。

**6. `guard-anchor-missing` 只报 WARN（`:102`）。** 删掉整个 `<summary class="rail-fold-sum">` → WARN、exit 0、覆盖面归零。同理 `:91` 只认 `N组/N颗`，改写成「45 个芯片」即绕过（`index.html:153` 目前还带个「·」变体，见下）。

**7. `aria-live="off"` 两道闸门都算通过。** `check-ui-copy.mjs:137` 的 `/id="count"[^>]*aria-live/` 与 `probe-ui.mjs:195` 的 `if (!r.live)` —— `"off"` 是真值。显式静音的 live region 能全绿。

**8. `field-no-consumer` 被注释满足（`:157`）。** `\bscenesNo\b` 在 `app.js:1418` 的**注释**里出现（恰好是一句讲 `scenesNo` 零命中的注释），grep 到注释即算有消费者。

**9. `#7 no-hidden-screenshot-downloads` 在空 DOM 上真空通过（`:215-217`）。** `rows === 0` 时两个分支都假 → PASS。同处 `loaded`（`:214`）算出来只打印、从不参与判定。本次实测 30 行 / 30 张，但 CI 上若 600ms 没铺完就直接绿。
→ `if (r.rows === 0) return {ok:false, …}`，或断言 `loaded > 0`。

**10. `#4 copy-restores-focus` 依赖 `#3` 留下的状态。** `:146` 自己不导航，`.prompt-copy` 只存在于 `#3` 打开的 `#S07` 面板里。另外 `:151` 把 `writeText` 打桩成成功；若实现改走「不建临时 textarea」分支，焦点从未被偷，bug 存在时断言也绿（`:168` 只判 `!== body`）。

## 四、CI（`gates.yml`）—— 基本没问题

- 变量：无未定义/未使用。`servedImages` 在探针内用，CI 不多传参。**无发现。**
- `set -e` + `[ -x "$p" ] && … && exit 0` 循环：**我原先怀疑会提前中止，实测不会**（bash 对非末位 `&&` 列表成员豁免 errexit，全不存在时正确落到 `:82 exit 1`）。**撤回该怀疑。**
- `continue-on-error: true`（`:96`）：用法正确，但被 `:105`/`:108` 的 `|| true` 架空——advisory job 在 CI 上**永远显示成功**，原本「红但不阻塞」的可见性消失。建议删两个 `|| true`，保留 `continue-on-error`。
- `check-docs --selftest` 在 ubuntu：用 `mkdtempSync(tmpdir())`（`:151`），我本机实跑通过，无平台问题。**无发现。**
- 机制断言：`:40` 跑整个 `check-prompts.mjs`，W4 的机制块（`:413`）在里面，确实会跑。**无发现。**

## 五、W5 完全没覆盖的

- **W1** `vendor/inspect.mjs:63`「先 launch 再删旧图」的修复，0 测试。有人把 unlink 挪回 `:57` 之前，8 张已入库截图会再次静默蒸发而全绿（`verify-prototype:124` 只 `existsSync`，`check-stale:113` 的 `if (jpgs.length)` 会跳过）。
- **W2** `app.js:1744-1748` 的 `fillDerived()` 三处调用**无 try/catch**，抛错即回落到错数字（§1.1）。
- **W3** CREDITS 无内容闸门：`verify-prototype.mjs:124` 只查文件存在，不查「列出的每个素材存在」也不查「每个素材都有条目」。上一提交刚把 46 张收敛到 7 张。
- **W4** `check-prompts.mjs:413` 机制块**无 `--selftest`**（全仓仅 check-docs / check-ui-copy / probe-ui 有）。`jsBareNumbers` 若退化成「什么数都算找到」，闸门立刻恒绿，`check-prompts.mjs:607` 只 `exit(FAILS.length ? 1 : 0)`，静默跳过与真通过无法区分。

## the single biggest hole in W5

**W5 守的是「机制跑了」，不是「数字对」——而唯一在 JS 失败时还能到达用户的表面（静态兜底）里，正躺着 W5 要消灭的那个错数字。**
`index.html:153` 的 `11 组 45 颗` 是错的（真值 10 组 73 颗），`check-ui-copy.mjs:104` 在校验前把它整段抹成 `<DERIVED/>`，所以闸门结构上不可能报它；`app.js:1712` 的注释还复述了同一个错数。
配合 §2.3/§2.4（自检有 2 条同义反复、唯一漏检的那条判据与实现同源），W5 现在的可信度是「证明了自己跑起来了」，不是「证明了界面不说谎」。

## 30 分钟

| 分钟 | 动作 | 文件 |
|---|---|---|
| 0-6 | 兜底文本改 `—`，加断言「data-derived 的静态文本必须为空或 `—`」——一条堵住 §1.1 | `index.html:153`、`check-ui-copy.mjs` |
| 6-12 | selftest 改临时副本 + `SIGINT/SIGTERM` 还原——这条今天已经证明会丢代码 | `probe-ui.mjs:346-358` |
| 12-18 | 两条运行时变异改走 `check()`；`chip-count` 加进 `CASES` | `probe-ui.mjs:362-376, 297-333` |
| 18-22 | 删或实现 `--selftest` 宣传；`guard-anchor-missing` WARN→FAIL；`aria-live="off"` 判负 | `check-ui-copy.mjs:17,102,137`、`probe-ui.mjs:195` |
| 22-25 | `#7` 空 DOM 判红；`#4` 自己 `goto('#S07')` | `probe-ui.mjs:215,146` |
| 25-27 | 删两个冗余 `|| true` | `gates.yml:105,108` |
| 27-30 | 记 TODO（下一个 W）：CREDITS 内容闸门、`check-prompts --selftest` | — |

不做：重写 `chip-count` 的独立取数（先靠 `CASES` 变异兜住）。
