# 一个「文档说不会藏、代码藏了两层」的元素：29 个未支持行业词

> 执行 Agent · 2026-10-27 · 写作用域：`prompt-copy.js` 的 `mountSceneChips` note 一行 + `README.md`/`README-EN.md` L78
> 一句话：README 承诺「不藏起来」的那 29 个词，在代码里被 `display:none` 叠了两层，**一次都没被画出来过**。本轮让它第一次可见。

---

## 1. 复现证据（改前）

### 1.1 代码事实：两层 `display:none`，零处复原

全文件 grep `display:none`，改前正好 2 处，就是这两层：

```
835: moreHost.style.cssText = "margin-top:8px;display:none"     ← 第 1 层（折叠容器）
901: note.style.cssText = "margin-top:8px;font-size:12px;opacity:.72;display:none"   ← 第 2 层
```

展开按钮只动第 1 层：

```js
toggle.addEventListener("click", function () {
  expanded = !expanded;
  moreHost.style.display = expanded ? "" : "none";   // ← 只切这里
  ...
});
```

`note` 是 `moreHost.appendChild(note)` 的子节点，它自己的 `display:none` 从头到尾没有任何一处被改回来。
所以「展开」这个动作对它是无效的：**父容器展开了，它自己还是 none。**

### 1.2 CDP 实测：点开之后 display 仍是 none

`deliverables/66-exec/unsupported-probe.mjs`，真 Chrome（CDP），1440×900 与 390×844 两档各跑一遍。改前输出（原文）：

```
== 复现/验收：29 个未支持行业词的可发现性 ==

-- 1440x900 --
   展开前 note.display = none，尺寸 0×0
   展开后 note.display = none，尺寸 0×0，more.display = block
  ✗ 1440x900：点开展开后 note 仍不可见（display=none）
  ✓ 1440x900：29/29 个词都在 note 文本里（文本层）
  ✗ 1440x900：note 文本存在但没有被渲染（祖先或自身 display:none）—— 文本层命中不算数

-- 390x844 --
   展开前 note.display = none，尺寸 0×0
   展开后 note.display = none，尺寸 0×0，more.display = block
  ✗ 390x844：点开展开后 note 仍不可见（display=none）
  ✓ 390x844：29/29 个词都在 note 文本里（文本层）
  ✗ 390x844：note 文本存在但没有被渲染（祖先或自身 display:none）—— 文本层命中不算数

✗ 4 项不通过
```

关键对照在第二行：**`more.display = block`（父容器确实展开了，214×287），而 `note.display = none`（0×0）**。
父可见、子不可见 —— 这就是"藏了两层"的直接证据。

### 1.3 为什么这个 bug 能骗过历次审查

上面那组输出里有一对必须并排看的行：

```
✓ 29/29 个词都在 note 文本里（文本层）      ← textContent 说"在"
✗ note 文本存在但没有被渲染                 ← getBoundingClientRect 说 0×0
```

`display:none` 的元素**文本节点仍然在 DOM 里**，`textContent` / `innerHTML` / `querySelector` 全都能命中。
任何只读文本的检查（本轮之前所有探针都属于这一类）都会给出"29 个词都在"的绿色结论。
**判据必须是「calculated display 沿祖先链全程不是 none」且「rect 有面积」，两者都要。**
这一点写进了修好后的探针，也写进了 `prompt-copy.js` 的注释里。

### 1.4 截图存证

| 文件 | 内容 |
| --- | --- |
| `deliverables/66-exec/shots-unsupported/before-1440x900.png` | 展开前（note 不在画面上） |
| `deliverables/66-exec/shots-unsupported/before-390x844.png` | 展开前（390 档） |
| `deliverables/66-exec/shots-unsupported/after-1440x900.png` | 修后展开，note 在 rail 底部可见 |
| `deliverables/66-exec/shots-unsupported/after-390x844.png` | 修后展开，390 档 note 完整可见 |
| `deliverables/66-exec/shots-unsupported/note-crop-1440x900.png` | note 局部 230×209，29 个词可逐字核对 |
| `deliverables/66-exec/shots-unsupported/note-crop-390x844.png` | note 局部 374×123 |

> ⚠️ 局部裁图第一版裁错了区域：`getBoundingClientRect` 是**视口坐标**，而 `screenshot({clip})` 用**页面坐标**，
> `scrollIntoView` 之后两者差一个滚动量。裁出来的是旁边那片芯片（图看着"有东西"，实际不是 note）。
> 已加上 `window.scrollX/Y` 修正。记在这里是因为"截图看着对"同样会骗人。

---

## 2. 三个候选的取舍

| | 做法 | 语义 | 代价 |
| --- | --- | --- | --- |
| **甲** | 去掉 note 的 `display:none`，跟着 `moreHost` 显隐 | 点开「还有 28 个」→ 同时看到 28 个近似芯片 + 29 个未支持词 | 两批词混在一个展开区；README 不用改位置描述 |
| **乙** | 把 note 移出 `moreHost`，单挂自己的开关或常驻 | 28 与 29 分开呈现 | README **必须**改（位置变了）；多一个常驻控件 |
| **丙** | 见下 | — | — |

### 选了甲。四条理由，每条都能核

**1. README 描述的就是甲的形态。** 原句是「29 个如实标为"没有"，**收在「还有 28 个只有近似的 →」里**」——
"收在……里"说的就是"在那个展开区内部"。甲让代码追上文档；乙要让文档改口描述一个新位置。
在"修 bug"和"改承诺措辞"之间，优先修 bug。

**2. 混在一起会不会误导？判据是"这段字自己有没有说清"，而它说清了。**
29 个词与 28 个近似词是**互不相交**的两批，实测：

```
sceneTerms 44  direct 16  near 28  unsupported 29
total distinct 73
overlap near∩un 0
near only 28   un only 29
un: 电商,网店,服装,乐队,家教,培训,独立开发者,个人主页,简历,社团,捐款,甜品,酒吧,美甲,展会,政务,金融,医疗,地产,旅游,汽车,母婴,儿童,时尚,美妆,数码,家居,农业,物流
near: 茶饮,餐厅,书店,博客,播客,戏剧,影展,文化节,快闪,工业设备,说明书,开发者工具,运维,数据看板,档案,科普,教育,花店,民宿,婚礼,摄影,健身,宠物,诊所,律师,会计,招聘,非营利
```

零重叠，所以"混"只是视觉上相邻，不存在"一个词既是近似又是没有"的语义冲突。
而且这两批在**形态上就不同**：28 个是可点的描边芯片（`<button>`），29 个是一段不可点的灰字（`<p>`），
第一句就写着「目前没有对应风格的行业（共 29 个）」。读错的前提是"没写清"，这里写清了。
真正会误导的写法是让它看起来**也像可以点**——它没有。

**3. 首屏密度已经实测紧张，加控件是往回退。**
`prompt-copy.js:823-828` 记着实测：44 个芯片全展开时该区高 716px，把后面 10 组筛选全挤出首屏
（实测"首屏完整可见的筛选组 0/11"）。折叠本身就是为了这件事。乙要多挂一个常驻开关，方向相反。

**4. 不选丙，是因为丙只能改善、不能解决。** 想到过"把 29 个词也做成芯片（不可点、`disabled`）"
——那样可发现性最好，但它会破掉 `#flt-scene button, .scene-more button` 这个选择器的计数（16+28=44），
而 reset 逻辑（`prompt-copy.js` 第 1068 行附近）和多个探针都依赖这个数。为一个可发现性问题
去动一个被 4 处依赖的计数契约，风险与收益不成比例。本轮不做，留作后续。

### 顺带修的一件事：对比度

既然这段字**第一次**真的要被人读，它原来的配色就必须一起验。原内联样式是 `font-size:12px;opacity:.72`。
真浏览器实测（`.rail` 的 background 是 `rgba(0,0,0,0)`，必须往上找第一个不透明祖先才是真底色）：

| | 字号 | opacity | 对比度 |
| --- | --- | --- | --- |
| 改前 | 12px | 0.72 | **3.36 : 1**（WCAG AA 正文要求 4.5:1，不达标） |
| 改后 | 13px | 1 | **6.19 : 1** |

去掉这两个覆盖后走 `.rail-hint` 自带的 13px / `--ink-3`，与它上面那句「实心＝有直连方案…」完全同款。
（`deliverables/66-exec/_note-contrast.txt` 与 `_note-contrast-after.txt` 是两次实测原文。）

> 第一版对比度算出来是 2.73:1，因为直接拿了透明的 `.rail` 当底色 —— 那其实是"#56534b 对纯黑"的值。
> 修正后才是 6.19:1。记在这里：**对比度算错通常不是公式错，是底色取错。**

---

## 3. 代码改动（全文）

只有一行实质改动 + 一段注释。`mountSceneChips` 里其余部分（提示词生成、芯片点击逻辑）一字未动。

```diff
-    // 如实列出没有对应风格的行业（默认收起，点开才看）
+    /* 如实列出没有对应风格的行业（跟着「还有 28 个只有近似的 →」一起展开）
+     * ...（长注释，见文件）...
+     */
     if (P.unsupported && P.unsupported.length) {
       var note = document.createElement("p");
       note.className = "rail-hint scene-unsupported";
-      note.style.cssText = "margin-top:8px;font-size:12px;opacity:.72;display:none";
+      note.style.cssText = "margin-top:8px";
       note.textContent = ...;
       moreHost.appendChild(note);
     }
```

### 我怎么证明自己没碰别人的地盘

写作用域只有 note 那一行，而同文件里另有两个 Agent 在改提示词正文和芯片点击逻辑。
所以不能只靠"我记得没动"，要做**逐行差分**。把 `mountSceneChips` 整段（从 `function mountSceneChips()`
到模板层注释）单独切出来，与 `git show HEAD:` 的同一段对比，只统计非空行的增删：

```
HEAD mountSceneChips 长度 4077   NOW 5831

--- 只在 HEAD 里（被我删/改掉的行）---
  -     // 如实列出没有对应风格的行业（默认收起，点开才看）
  -       note.style.cssText = "margin-top:8px;font-size:12px;opacity:.72;display:none";

--- 只在 NOW 里（我新增的行）---
  +     /* 如实列出…（长注释 39 行）*/
  +       note.style.cssText = "margin-top:8px";
```

实质改动 = 2 行删除 + 1 行新增（另加注释）。芯片 click handler、`toggle` 逻辑、`directTerms`/`nearTerms`
分流、模板角标全部零变化。

---

## 4. README 改前 / 改后原文

### 4.1 中文 `README.md` L78

**改前：**

```
选型台左侧第一组是**「你是做什么的」**——44 个行业词，点一下就能反查出对口方案（16 个有直连方案，28 个只有近似，29 个如实标为"没有"，收在「还有 28 个只有近似的 →」里，不藏起来）。
```

**改后：**

```
选型台左侧第一组是**「你是做什么的」**——44 个行业词，点一下就能反查出对口方案（16 个有直连方案，28 个只有近似，收在「还有 28 个只有近似的 →」里）。这 44 个之外另有 29 个词，连芯片都没有：展开同一个按钮时一并列出，29 个如实标为"没有"——不是「还没做」，是这套图集的机制撑不起来，不藏起来。
```

### 4.2 英文 `README-EN.md` L78

**改前：**

```
The first group in the left rail is **"What do you do?"** — 44 trade terms that reverse-look-up matching schemes (16 have direct matches, 28 approximate only, 29 are honestly labelled "none" and tucked behind a "28 more approximate →" toggle rather than hidden).
```

**改后：**

```
The first group in the left rail is **"What do you do?"** — 44 trade terms that reverse-look-up matching schemes (16 have direct matches, 28 approximate only, tucked behind a "28 more approximate →" toggle). Beyond those 44 there are 29 more terms with no chip at all: the same toggle lists them, and all 29 are honestly labelled "none" — not "not built yet", but that this collection's mechanisms cannot carry them. Not hidden.
```

### 4.3 算术为什么原来不自洽、现在自洽

**改前那组数描述的是三个互不相交的集合，却写成了并列的枚举：**

```
16 个有直连 + 28 个只有近似 = 44        ← 44 个芯片已经用尽
29 个如实标为"没有"                     ← 第三个数，无处安放
实测：near ∩ unsupported = 0
      只在 near 不在 unsupported：28
      只在 unsupported 不在 near：29
```

读者会自然读成 `16 + 28 + 29 = 73`，但主语明明是"44 个行业词" —— 多出来的 29 个没有归属。

**改后把两个层级分开说：**

```
44 个芯片词 = 16 直连 + 28 近似          ← 闭合，44 用尽
另有 29 个词，连芯片都没有                ← 明确标为"44 之外"
44 + 29 = 73 = 全部词                     ← 与 P.sceneIndex ∪ P.unsupported 的实测一致
```

关键词是「这 44 个之外另有 29 个词，连芯片都没有」——"之外"和"连芯片都没有"两句一起，
把 29 从 44 的枚举里摘出来，变成另一层的陈述。

---

## 5. 七条验收（原文输出）

### 验收 1：`node --check`

```
$ node --check prototypes/_selection/prompt-copy.js
node --check exit=0
```

### 验收 2：CDP 实测，展开后 note 可见、29 词全在

```
== 复现/验收：29 个未支持行业词的可发现性 ==

-- 1440x900 --
   展开前 note.display = block，尺寸 0×0
   展开后 note.display = block，尺寸 214×193，more.display = block
  ✓ 1440x900：点开展开后 note 真的可见（display=block，有面积）
  ✓ 1440x900：29/29 个词都在 note 文本里（文本层）
  ✓ 1440x900：note 整棵祖先链都可见，文本层命中 = 视觉命中

-- 390x844 --
   展开前 note.display = block，尺寸 0×0
   展开后 note.display = block，尺寸 358×107，more.display = block
  ✓ 390x844：点开展开后 note 真的可见（display=block，有面积）
  ✓ 390x844：29/29 个词都在 note 文本里（文本层）
  ✓ 390x844：note 整棵祖先链都可见，文本层命中 = 视觉命中

[
 { "tag": "P.rail-hint",     "ok": true, "display": "block" },
 { "tag": "DIV.scene-more",  "ok": true, "display": "block" },
 { "tag": "DIV.rail-block",  "ok": true, "display": "block" },
 { "tag": "ASIDE.rail",      "ok": true, "display": "block" },
 { "tag": "DIV.bench",       "ok": true, "display": "grid"  },
 { "tag": "BODY",            "ok": true, "display": "block" },
 { "tag": "HTML",            "ok": true, "display": "block" }
]

✓ 全部通过
```

> 「展开前 note.display = block 但 0×0」是甲的**正确**表现：note 自己不再隐藏，收起时由祖先
> `moreHost` 的 `display:none` 让它不可见。判据因此必须是"祖先链 + 面积"，不是"自身 display"。
> 我的回归脚本第一版正是拿自身 display 当判据，把正确的收起判成了失败（见 §7）。

**逐词核对**用 29 个词的外部基准（写死在探针里，不从 `P.unsupported` 现读 —— 否则就是拿被测对象
证明被测对象）：电商 网店 服装 乐队 家教 培训 独立开发者 个人主页 简历 社团 捐款 甜品 酒吧 美甲
展会 政务 金融 医疗 地产 旅游 汽车 母婴 儿童 时尚 美妆 数码 家居 农业 物流。
两档均 `29/29`。

**回归**（`unsupported-regress.mjs`，证明没碰坏周边）：

```
== 折叠态 ==
  ✓ 收起时 note 不可见（自身 display=block，被祖先 moreHost 收起，面积 0）
  ✓ 收起时 moreHost 不可见

== 芯片计数（note 不得混进 button 计数）==
  ✓ `#flt-scene button, .scene-more button` = 44（16 直连 + 28 近似）
  ✓ .scene-more button[data-scene] = 28
  ✓ note 是 <p> 不是 button（不会被当成芯片）

== 展开 / 收起 / 再展开 ==
  ✓ 第 1 轮展开：note 可见（block，41289px²）
  ✓ 第 1 轮展开：按钮文案 = 「收起近似项 ←」
  ✓ 第 1 轮收起：note 一起收起（自身 display=block，被祖先收起）
  ✓ 第 1 轮收起：按钮文案复位 = 「还有 28 个只有近似的 →」
  ✓ 第 2 轮展开：note 可见（block，41289px²）
  ✓ 第 2 轮展开：按钮文案 = 「收起近似项 ←」
  ✓ 第 2 轮收起：note 一起收起（自身 display=block，被祖先收起）
  ✓ 第 2 轮收起：按钮文案复位 = 「还有 28 个只有近似的 →」

== 点一颗近似芯片（只测我碰过的那层没挡住点击）==
  ✓ 「餐厅」近似芯片点击后 aria-pressed=true（点击链路没被 note 干扰）

✓ 全部通过
```

### 验收 3：README 中英双语数字自洽

见 §4.1 / §4.2 的改前改后原文。当前 L78 的数字提取：

```
L78 里出现的数字：
  44 个行业词
  16 个有直连方案
  28 个只有近似
  28 个只有近似       ← 按钮文案「还有 28 个…」
  29 个词
  29 个如实标为

自洽性：16 + 28 = 44 ⇔ 芯片用尽；29 是另一批（44 之外），44 + 29 = 73 = 全部词
```

### 验收 4：`check-docs.mjs` → 0 FAIL / 0 WARN，exit 0

```
文档一致性：README.md ↔ data.js / prompts.js / prompt-copy.js
  ✓ ids/exist            文档提到的方案编号全部存在（data.js 30 案）
  ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数
  ✓ nums/gate            闸门 FAIL=0 的案数 = 26，与实测一致
  ✓ nums/warn-axes       警告两轴：hard 4 / degrades 13 / 并集 14，文档口径一致
  ✓ nums/prompt-len      提示词长度 = 1639–1998，中位 1829，文档一致
  ✓ nums/scenes          场景词 44 / 直连 16 / 近似 28 / 标为没有 29，文档一致
  ✓ status/fixed-claims  没有把已修项写成未修
  ✓ status/layout-fix    layout 抽取 30/30 有值，S12/S15/S19 = 549/640/420 字
  ✓ panel/fields         12 段字段（field() 11 + auditFold 1），audit 30/30 有值（276–444，中位 324，合计 10065），顺序 audit → risk，S13 = 306 字且无评审工件
  ✓ i18n/facts           中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）
  ✓ paths/exist          文档里 15 条仓库路径全部存在
  ✓ paths/templates      文档提到的模板编号都存在
  ✓ regression/banned    6 条已腐化原话均未回归

README.md: 0 FAIL / 0 WARN / 13 PASS
exit=0
```

**`nums/scenes` 没有变红** —— 新的表述方式它认得出。它要的三条断言都在：

| 断言 | 正则 | 命中文本 |
| --- | --- | --- |
| 行业词总数 = 44 | `\b(4[0-9])\s*(?:个行业词…)` | 「44 个行业词」 |
| 有直连 = 16 | `([\d]{1,3})\s*个有直连方案` | 「16 个有直连方案」 |
| 只有近似 = 28 | `([\d]{1,3})\s*个只有近似` | 「28 个只有近似」 |
| 标为没有 = 29 | `([\d]{1,3})\s*个如实标为` | 「29 个如实标为"没有"」 |

英文侧同样四条（`trade terms` / `have direct matches` / `approximate only` / `are honestly labelled`）也都命中，
所以 `i18n/facts` 绿。**没有改 `check-docs.mjs`。**

> **关于 `nums/prompt-len`**：本轮进行中它一度红过（区间上限写 1920，实测 1998），但**不是我造成的** ——
> 另一个 Agent 在改提示词正文，长度在我跑测试的十几分钟里从 1946 漂到 1998。我写了
> `_prompt-identity.mjs` 来证明这一点：把当前文件里我改的那行 cssText 换回改前值，其余一字不动，
> 再跑 30 案提示词逐字节比对：
>
> ```
> == 我的改动对提示词的贡献 ==
>   ✓ 30/30 案提示词逐字节相同（改前 cssText ↔ 改后 cssText）
>     实测长度 min 1639 / median 1821.5 / max 1998
>     ↑ 这组数与 check-docs 的 nums/prompt-len 是同一组口径，说明漂移来自本文件之外
> ```
>
> 也就是说：**我的改动对提示词长度贡献 0 字节。** 随后那个 Agent 把 README L80 的区间同步成
> 1639–1998 / 中位 1829，`nums/prompt-len` 自然转绿。这条 FAIL 的来去都不属于本轮写作用域。

### 验收 5：`verify-prototype.mjs --all` → 26/4/30

```
✓ S30 S30-skate-sticker-split   html 27.5K / css 24.7K / FAIL 0 / WARN 2 (no-footage measure) / 真图 8 / 11 屏 / 截图 10

达标 26 / 不达标 4 / 共 30
exit=1
```

4 个不达标（**与本轮无关**，都是各案自身闸门，全部在 `prototypes/S*/` 内，本轮的写作用域一个都不涉及）：

```
✗ S07 S07-slate-ink-contents            闸门 FAIL=1：mono
✗ S08 S08-amber-overprint-lightbox      闸门 FAIL=2：palette-terracotta font-count
✗ S13 S13-blind-debossed-dispatch       闸门 FAIL=4：mono shadow button-fx empty-screens
✗ S21 S21-interlocking-release-book     闸门 FAIL=1：mono
```

### 验收 6：`git diff --stat`

```
 README-EN.md                         |   4 +-
 README.md                            |   4 +-
 prototypes/_selection/app.js         | 328 ++++++++++++++++++++++++++++++-
 prototypes/_selection/prompt-copy.js | 370 +++++++++++++++++++++++++++++++++--
 4 files changed, 681 insertions(+), 25 deletions(-)
```

⚠️ **多出一个 `app.js`，不是我改的。** 证据：

- 内容全是 `qParked: null` + `parkQuery()`，属于**芯片点击逻辑**（任务书明说那由另一个 Agent 负责）
- mtime `2026/10/27 18:10:03`，在我开始写 README 之后、我最后一次改 prompt-copy 之前
- 我的 `prompt-copy.js` 差分（§3）里 `mountSceneChips` 的芯片 click handler 零变化

我**没有动过 `app.js`**，也没有权限/意图去回滚它 —— 那是并发 Agent 的在途工作，回滚会破坏别人的成果。
同理 `prompt-copy.js` 的 370 行改动里，属于我的只有 2 删 1 增（见 §3 差分），其余是另两个 Agent 的。

**严格属于本轮的写作用域**：

```
README.md     1 行（L78）
README-EN.md  1 行（L78）
prompt-copy.js  mountSceneChips 内 note 的 cssText 一行 + 一段注释
```

（`README.md`/`README-EN.md` 的 diff 各显示 4 行变化，因为 `-1+1` 计 2 行；L80 的提示词区间是另一个 Agent 改的。）

### 验收 7：编码（无 BOM / LF）

```
prototypes/_selection/prompt-copy.js     BOM=false CRLF=0 LF=1493 bytes=99028
README.md                                BOM=false CRLF=0 LF=488  bytes=44060
README-EN.md                             BOM=false CRLF=0 LF=492  bytes=49718
```

三文件全部 `BOM=false`、`CRLF=0`、纯 LF。全程用 `edit` 工具，**没有用过 PowerShell `Set-Content` 写这三个文件**
（`Set-Content` 在 Windows PowerShell 5.1 下会写 BOM + CRLF，本轮只在临时目录的对照副本上用过一次，
且当场发现它污染了内容、改用 Node 重写 —— 见 §7 第 2 条）。

---

## 6. 复现命令

```powershell
# 验收 2（可见性，两档 + 逐词 + 截图）
node deliverables/66-exec/unsupported-probe.mjs

# 回归（折叠循环 / 芯片计数 / 点击链路）
node deliverables/66-exec/unsupported-regress.mjs

# 证明我的改动对提示词 0 字节贡献
node deliverables/66-exec/_prompt-identity.mjs

# 对比度（改前/改后各一份）
node deliverables/66-exec/_note-contrast.mjs

# 验收 4 / 5
node prototypes/_build/check-docs.mjs
node prototypes/_build/verify-prototype.mjs --all
```

---

## 7. 我可能弄坏的地方

按"最可能真的坏"排序。这一节不是免责声明，是给出**下一步该查什么**。

### 7.1 （已发生并修）我的回归判据一开始是错的

第一版 `unsupported-regress.mjs` 拿「note 自身 `display === 'none'`」当"收起成功"的判据，
跑出 3 项 `✗ 收起时 note 仍可见：display=block`。**代码是对的，断言是错的** ——
甲的做法就是让 note 自身恒为 `block`，由祖先收起。改成"祖先链 + 面积"后全绿。
记在这里是因为：如果下一个人照着那份红输出改代码（比如给收起逻辑加 `note.style.display='none'`），
就会把甲改成"两层手动同步"，正是这个 bug 的原始形态。**红的不一定是代码。**

### 7.2 （已发生并修）`Set-Content -Encoding utf8` 污染了对照副本

为了跑"改前基线"，我用 `git show HEAD:README.md | Set-Content -Encoding utf8` 写了个临时副本，
结果 Windows PowerShell 5.1 写出 BOM + 把整份文件并成一行，`check-docs` 在这个副本上报了一条假 FAIL
（`nums/warn-axes` 说出现了 hard 旧名单，其实是首行被拼接后把 `<div align="center">` 和后面的文字连起来了）。
改用 Node 显式 `writeFileSync(..., 'utf8')` 重写副本后，基线才是 `0 FAIL / 1 WARN / 12 PASS`。

**教训**：验收 7 点名"不要用 `Set-Content`"不是洁癖 —— 它会直接制造假红，而且假红得很像真红。

### 7.3 README L78 现在是三段式长句，可能读起来比原来重

原句一句话讲完 44，新句拆成"44 个芯片（16+28）"+"44 之外 29 个"两段。
信息更准，但句子长了约 40 字。如果有人觉得 rail 说明不该这么长，压缩的**唯一**安全方向是
保留"44 之外另有 29"这个层级词，别再退回并列枚举 —— 那样算术又不自洽了。

### 7.4 29 个词仍然不可搜索、不可点

本轮只解决"能不能看见"，没解决"点了有没有用"。它们是一段 `<p>` 灰字，用户读到「电商」之后
**没有任何可点的东西**。`deliverables/66-audit/template-layer.md` 的 P1（`TPL_ADJACENT` 补 11 条）
处理的是"这些词能不能给出一句有用的替代建议"，与本轮正交，仍未做。
**用户现在的体验是：终于知道自己被拒绝了，但拒绝之后无路可走。**

### 7.5 我把 12px 改成了 13px，rail 底部高度变了

note 从 12px/0.72 变成 13px/1，且 1440 档宽度只有 214px（rail 窄），文字行数变多：
改前 0 高（不可见），改后 193px（1440 档）/ 107px（390 档）。
这 193px 只在**展开态**出现，收起态仍是 0。但它确实让"展开后的 rail"更长了一点 ——
如果有人按"展开后 rail 总高"做过断言（本轮没找到这样的断言），那个数会变。

### 7.6 并发环境下的最终数字可能与我记录的不同

我在 18:06–18:20 之间跑验收，期间 `prompt-copy.js` 被其他 Agent 改了至少 3 次
（mtime 18:06:15 → 18:14:56 → 18:18:14）。我贴的 `check-docs` 是 `0 FAIL / 0 WARN / 13 PASS`，
`verify-prototype` 是 `26/4/30`。**如果你复跑时这两个数不同，先看 `git diff --stat` 里
`prompt-copy.js` 是不是又长了** —— 那多半是提示词正文又变了，与本轮的 note 一行无关（用
`_prompt-identity.mjs` 可以一分钟证伪）。

### 7.7 我没做的事

- 没 `git commit`（硬约束）
- 没派生子 Agent（硬约束）
- 没改 `check-docs.mjs`、`app.js`、`data.js`、`prompts.js`、`style.css`、`collect-schemes.mjs`、
  `prototypes/S*/`、`templates/`
- 没动提示词生成逻辑、没动芯片点击逻辑（只动 note 的 cssText）
- 没修那 4 个不达标的原型（S07/S08/S13/S21 的闸门 FAIL，属于各案自身）
