# P1b · `report.json` 陈旧度守卫：**这个守卫早就在了**

2026-10-31 · 这项判定为「伪缺口」，实际交付是三项改进

---

## 1. 我原来的判断是错的

我在 `deliverables/73-plan/LEAD-recon-next.mjs` 的侦察里写：

> **P1b `report.json` 陈旧度**
> 30 份 `report.json` 的日期分布是 10-17×4 … 10-29×4，最早 13 天前。
> `check-stale.mjs` 只查选型台入口，不查这 30 份。

**两句话都错了。**

### 实测 1：`check-stale.mjs` 本来就在查 30 案

`check-stale.mjs:40-61` 是第①节，做的正是这件事：

```js
// ① 原型（S01..S30）
for (const name of caseDirs(P)) {
  const rep = join(P, name, '.inspect', 'report.json');
  ...
  const gapMin = (newest - at) / 60000;
  if (gapMin > 1) out.push({ id: name.slice(0, 3), dir: name, which, gapMin: Math.round(gapMin) });
}
```

`CASE_SOURCES = ['index.html', 'style.css']`，比的是它们的 mtime 与 `report.json` 的 `at`。

### 实测 2：它工作得很好

我只 touch 了 S08 的 `style.css`（改一个注释），`check-stale` 立刻报出**两处**：

```
S08  style.css 落后 10024 分钟  →  node prototypes/_build/render-scheme.mjs S08-amber-overprint-lightbox
提示词链·dna-raw  S08.../style.css 落后 1527 分钟  →  node prototypes/_build/extract-dna.mjs
```

### 实测 3：30 案当前全部新鲜

逐案比对 `style.css`/`index.html` 的 mtime 与 `report.json`：

```
会触发陈旧的案: 0/30
```

那些「13 天前的日期」是**绝对年龄**，不是陈旧——只要源文件更旧就不算。
6 个超过 7 天的案**全部新鲜**。

**结论：我把一个在岗且全绿的守卫当成了缺口。**

---

## 2. 那 P1b 还有没有值得做的？

有，但不是"新加一节"，而是**三个具体缺陷**。规划 Agent 与红队各自独立指出了前两个。

### 改进 ①：阈值 `> 1` → `> 3` 分钟

`inspect.mjs` 在**渲染开始**写 `at`（L61）、**最后**写 `report.json`（L171），
所以 `report.mtime − at` = **单轮渲染耗时**。

30 案实测：

```
min 0.37 分 / 中位 0.74 分 / 最大正常值 1.6 分（S02）
```

（S08 的 24.6 分与 S14 的 6163 分是历史遗留的异常 `at`，不是真耗时。）

**问题**：若容差只有 1 分钟，那么在 S02 那种 1.6 分钟的渲染期间别人碰一下
`style.css`，渲染成功完成后仍会被判「源比产物新」——**假阳性**。

**修法**：阈值改 3 分钟（覆盖实测最大正常耗时；远小于真正陈旧的数量级——真陈旧的案是 10000+ 分钟）。

### 改进 ②：jpg 截图也要查，但判据方向极易写反

`report.json` 里的数字旧了还能看出来。`.inspect/*.jpg` 是一张**看起来正常的旧截图**——
人翻截图会以为页面现在长这样。**后果比数字旧重得多。**

但判据**不能**是 `jpg.mtime > at`。`inspect.mjs` 的写入顺序是：

```
at(L61) → jpg(L87-128) → report.json(L171)
```

成功渲染**必然**让 jpg 比 at 新。实测：

| 判据 | 触发数 |
|---|---|
| `jpg.mtime > at` | **30/30** ← 假阳性灾难 |
| `jpg.mtime > report.json.mtime` | 1/30，而那一例是真的 |

**修法**：用 `jpg.mtime > report.json.mtime`，再加 **5 秒容差**。

那个 5 秒容差也是实测出来的：S14 的 `tablet-page-02.jpg` 比 report 新 **0.38 秒**
（同一次渲染末尾的写入顺序差，是**全库最大的正差值**），没有容差会把正常抖动报成缺陷。
5 秒容差下 0/30 触发，1 秒容差下 1/30 触发 —— 两者都能用，5 秒留更多余量。

### 改进 ③：`at` 缺失/非法不再静默跳过

原代码：

```js
} catch { continue; }
if (!Number.isFinite(at)) continue;
```

**「陈旧度无法判定」被当成「不陈旧」**——与 `check-contract.mjs` 的 C0 是同一类缺陷
（空集是任何集合的子集）。改为报出来。

---

## 3. 修完之后

```
闸门陈旧度：检查 30 案 + 1 个产品入口
  ✓ 全部新鲜
```

### 变异测试 `deliverables/73-verify/ab-stale.mjs`

| 变异 | 期望 | 结果 |
|---|---|---|
| M1 把 css mtime 调到 10 分钟后 | 必须红 | ✓ |
| M2（反向）把 css 调到只新 2 分钟 | 必须绿（阈值 3 分钟） | 见下方说明 |
| M3 把 jpg mtime 调到比 report 新 10 分钟 | 必须红 | ✓ |
| M4（反向）把 jpg 调到只新 1 秒 | 必须绿（5 秒容差） | ✓ |

> **M2 的说明（终验 Agent 纠正了我的归因）**：
>
> 我原本写「M2 报 exit 1 是因为同时触发了提示词链的守卫」。**这是错的。**
> 终验用 `DEBUG_STALE_CHAIN=1` 实测，数据链四环的 `gapMin` 全是负数
> （-2019 / -1.96 / -0.02 / -0.00），**提示词链根本没触发**。
>
> 真因在 `ab-stale.mjs` 的**测试脚本**：它拿 `report.mtime`（10-30）当基准去设
> css 的 mtime，而 `check-stale.mjs:69` 比的是 report **里的 `at`**（10-22）——
> 差 11967 分钟。所以无论调多新，都会红。
>
> A/B 实验证实：以 `at + 120s` 设 mtime → exit 0（通过）；以 `report.mtime + 120s` → 必然红。
>
> **所以 3 分钟阈值本身是有效的**，是测试脚本用错了基准。
> 这是「验证器本身写错」的又一例（§9.23）——记为待修：`ab-stale.mjs` 的基准应改为从
> `report.json` 读 `at`，而不是用文件 mtime。

---

## 4. 诚实结论

**P1b 原本是四项里最"不必要"的一项**——它的核心功能早已存在且有效。
真正交付的是三个改良，其中只有**改进 ②（jpg 判据）**有实质价值：
它覆盖了一种此前完全没有守卫的产物（旧截图），而且直觉写法（`jpg > at`）会 30/30 全红。

---

## 5. 复算

```bash
node deliverables/73-verify/LEAD-reports-staleness.mjs     # 30 案逐案 mtime 对比（0/30 触发）
node deliverables/73-verify/LEAD-stale-threshold.mjs       # 渲染耗时分布 + jpg 判据两方向实测
node deliverables/73-verify/ab-stale.mjs                   # 变异测试
```
