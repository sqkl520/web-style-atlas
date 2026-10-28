# 本轮最高优先级修复：让 `check-stale` 覆盖产品（已完成）

- 修复时刻：2026-10-28 23:31 (Asia/Shanghai)
- 改动文件：`prototypes/_build/check-stale.mjs`（+66 / −14 行）
- 这是规划 Agent 和红队 Agent **各自独立得出的同一结论**（两边都把它列为「如果只能做一件事」）

---

## 病是什么

`check-stale.mjs` 的文件头注释自己写着它是为这个病写的：

> // 为什么需要它：这是 **AH-11 与 AH-14、N1 三次缺陷的共同根因** ——
> // 改了原型之后忘了重渲染，于是选型台展示的是**旧修订的闸门结果与截图**。
> // 它不会被任何闸门规则发现（闸门只查当前 report.json 的内容，不查它有多旧）。

**作者已经诊断出这个病、写了药，然后药只喂给了 30 个原型，没喂给产品。**

三处脚本复制了同一个目录选择器 `/^S\d{2}-/`：
- `check-stale.mjs:23`
- `verify-prototype.mjs:144`
- `check-anchors.mjs`（同类）

于是 `prototypes/_selection/`（用户主入口）被系统性地漏掉。

## 后果有多大（实测）

```
$ node prototypes/_build/check-stale.mjs     # 改前
闸门陈旧度：检查 30 案
  ✓ 全部新鲜
exit=0
```

而实际上 `_selection` 的报告是 **2026-10-21T19:51:17Z** 的，之后它的源文件被改了：

| 文件 | 提交次数 | 行数变化 |
|---|---|---|
| app.js | 9 | +1118 / −42 |
| prompt-copy.js | 8 | +1590 / −91 |
| prompts.js | 8 | +2152 / −421 |
| style.css | 7 | +842 / −36 |
| index.html | 10 | +228 / −35 |
| data.js | 11 | +216 / −150 |
| **合计** | | **+6214 / −783 行** |

**用户看到的「闸门 FAIL 0 / WARN 2」，是 6 天前、7000 行改动之前的结论。**

我用真闸门重跑（`inspect.mjs`，53.6 秒）得到的是 **FAIL 2**：

```
[FAIL] body-size  w=1440  Body text is 13px (the size most of the running text is set in).
[FAIL] hairline   w=768   2 thin rule(s): details#mast-fold | dl#facts
[WARN] no-footage w=1440
[WARN] measure    w=1440
```

## 怎么修的

不改那 30 个原型的选择器（那是正确的），而是加一个**显式的产品入口表**：

```js
const EXTRA = [
  {
    dir: '_selection',
    label: '选型台',
    render: 'node prototypes/_build/render-scheme.mjs _selection',
    sources: [
      'index.html', 'style.css', 'app.js',
      'prompt-copy.js', 'data.js', 'prompts.js',
      'wizard.html', 'wizard.css', 'wizard.js',
    ],
  },
];
```

**为什么源文件列表是逐项列的，不是 `index.html + style.css` 一刀切**：原型是「一个 html + 一个 css」，而产品是一堆 js 协作——`app.js` / `prompt-copy.js` / `data.js` / `prompts.js` 任何一处改了，渲染结果都可能变。**少列一个文件 = 那个文件的改动永远不会让报告变陈旧 = 这个脚本对它失效。**

## 修复立刻生效

```
$ node prototypes/_build/check-stale.mjs     # 改后（重渲染之前）
闸门陈旧度：检查 30 案 + 1 个产品入口
  ⚠️ 1 项陈旧（源文件比 report.json 新，说明改了没重渲染）：
     选型台(_selection)  app.js 落后 8562 分钟  →  node prototypes/_build/render-scheme.mjs _selection
  陈旧的后果：选型台与 data.js 展示的是**旧修订**的闸门结果与截图。
exit=1
```

**8562 分钟 = 5.94 天。** 这个数字第一次出现在任何检查器的输出里。

## 修复命令验证可用

```
$ node prototypes/_build/render-scheme.mjs _selection
用时 56.9 秒，exit=1
…
合计 FAIL=2  WARN=2
```

`render-scheme.mjs` 接受任意目录名（`process.argv[2]`），无需改动。

## 重渲染后闭环

```
$ node prototypes/_build/check-stale.mjs
闸门陈旧度：检查 30 案 + 1 个产品入口
  ✓ 全部新鲜
exit=0
```

新报告 `at: 2026-10-28T15:30:43.404Z`，`findings` 4 条，**如实记录 2 条 FAIL**。

产品从「谎报 FAIL 0」变成「如实报 FAIL 2」。

## 为什么这是本轮第一优先

规划 Agent 的论证（我认同）：

> 其它所有工作都是在「把闸门造得更准」，而这一件是「让闸门说的话还有人信」。
> 数据上，产品当前**唯一确定说错的话**就是陈旧造成的（`闸门 FAIL=0`），
> 而它恰好是用户第一眼看到的那行字。

红队的论证（我认同）：

> 补守门员这件事，补的那一层恰好是已经失效的那一层。
> 静态 lint 在真注释上误报 15/30、在数据文件上误报 85 条；
> 渲染闸门在 30 案上把 `focal-point`/`few-pictures` 判 0 次（从未触发过）。
> 补上之后 `_selection` 会从「1 条真缺陷」变成「30 条 FAIL」，其中 28 条需要注释掩盖。
> 而产品真正的病——报告冻结 6 天——两套规则都查不到。

## 成本

- 代码：+66 / −14 行
- 验证：`render-scheme.mjs _selection` 56.9 秒（一次性）
- 常态化成本：这个脚本只 stat 文件 mtime，**毫秒级**，可以进 CI

## 遗留

1. **`body-size` FAIL 仍未修**（执行 Agent 在处理）
2. **`hairline` FAIL 仍未修**（同上）
3. `wizard.html` 有自己的入口，但共用 `index.html` 的 `.inspect/`？需要核实它是否也该有独立报告
4. `templates/M01..M03` **确实从未被渲染过**（无 `.inspect/` 目录）—— 但红队论证过：给模板补渲染收益为负（`headline-lines` 等规则会判占位符模板 FAIL，而模板不是品牌页）
