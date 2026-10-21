# 26 · 跨视口几何实测批评（跨视口几何测量员）

> **所有数字来自 Chrome DevTools Protocol 的实测**：视口由 `Emulation.setDeviceMetricsOverride` 设定，页面由自建 `node:http` 静态服务器以 `http://` 打开。
> **本报告没有读一行 CSS 源码**。几何量全部来自渲染后的盒模型、`Range.getClientRects()`、`getComputedStyle()`、逐层计算样式 dump 与像素截图。
> 生成时间：2026-10-21 14:01:52（UTC）

- 覆盖 **36 个页面 × 4 档 = 144 个「案 × 档」测量点**，全部通过 `innerWidth` 断言（见 §0.2）
- 档位：390×844（`mobile:true`，与项目自带 `inspect.mjs` 的 `mobile: w<600` 一致）、768×1024、1024×768、1440×900
- 被测：S01–S30 原型 30 个、M01–M03 模板 3 个、选型台 `prototypes/_selection/index.html`、选型向导 `wizard.html`、仓库首页 `index.html`
- 辅助数据：1624 张按视口高分屏的截图（墨覆盖率）、144 个「案 × 档」的出血元素祖先链探查

## §0 方法与自检

### 0.1 链路

```
node _crit3/measure.mjs --shard N --of 4            # 4 分片并行，36 案 × 4 档
  ├─ _crit3/serve.mjs      node:http 静态服务器，站点根 = D:\Web\style
  │                        （file:// 下 CSS mask-image:url() 与 ../_fonts/ 会失效 → 必须 http）
  ├─ cdp.mjs               Browser.launch + newPage({width,height,mobile})
  │                        → Emulation.setDeviceMetricsOverride（CDP 真改视口；不用 --window-size）
  ├─ 断言                  window.innerWidth === 目标宽；不相等 → 该档作废并重试（最多 2 次）
  ├─ scrollPass            真实 Input.dispatchMouseEvent(mouseWheel) 把整页滚一遍触发入场动画，再滚回顶部等 1.4s
  ├─ _crit3/probe.mjs      页面内探针（序列化注入，无闭包依赖）
  └─ captureBands          Page.captureScreenshot + captureBeyondViewport + clip，按视口高分屏截 PNG（scale 0.4）
node _crit3/ink.py                                   # numpy 逐屏「众数底色法」算墨覆盖率
node _crit3/bleedcheck.mjs --shard N --of 2          # 出血元素 → 沿祖先找第一个裁剪/滚动容器，判可达性
```

**未使用** `chrome --headless --window-size=390,844`（Windows 上 Chrome 最小窗口宽约 500 CSS px，得到的是 500px 布局的左侧裁切），**未使用** `--virtual-time-budget`（会把 CSS 动画冻结在起点）。

### 0.2 `innerWidth` 断言结果

共 144 个「案 × 档」断言，**全部通过，失败 0 个**。逐条（格式为实测 `innerWidth`）：

| 案 | 390 | 768 | 1024 | 1440 |
| --- | --- | --- | --- | --- |
| S01 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S02 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S03 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S04 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S05 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S06 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S07 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S08 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S09 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S10 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S11 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S12 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S13 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S14 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S15 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S16 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S17 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S18 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S19 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S20 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S21 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S22 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S23 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S24 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S25 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S26 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S27 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S28 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S29 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| S30 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| M01 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| M02 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| M03 | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| SELECTOR | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| WIZARD | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |
| ROOTINDEX | ✅ 390 | ✅ 768 | ✅ 1024 | ✅ 1440 |

写进本报告的每一条数字，其所在「案 × 档」都通过了 `innerWidth === 目标宽`（且测量前后各读一次，无漂移）。

### 0.3 我自己工具里发现并修掉的四个缺陷

**（1）测量发生在入场动画起点 → 对比度与几何双假故障。** 第一版链路在 `Page.navigate` 后直接注入探针，量到的是 `opacity: 0` + `transform: matrix(1,0,0,1,-12,12)` 的入场前状态。用 S01 @1440 逐层 dump 计算样式取得对照：`section.state-band` 的 `opacity = 0`，自身 `background-color: rgb(193,18,31)`、文字 `rgb(239,231,215)`（真实对比度远高于 4.5），而我算出的是 **1:1**（前景 rgb(239,231,215) ／ 合成底色 rgb(239,231,215)）；`footer#foot` 同样 `opacity = 0`，其 `rect.left = -12` 被我误判成「左溢 12px」。根因：祖先链合成底色时按 `alpha × opacity` 把该元素背景整块丢弃，底色退回 `body` 浅色，而文字色仍是该元素声明的前景色 → 前景=底色。**修法**：测量前先用真实滚轮事件把整页滚一遍触发 IntersectionObserver，滚回顶部等 1.4s 再测量；同时给每条对比度记录加「祖先链 opacity 乘积」，分析时剔除乘积 <0.5 的条目（全库剔除 220 条）。

**（2）`getBoundingClientRect().height ÷ lineHeight` 不是这一格的行数。** 那算的是整行／整格高度（由该行最长的兄弟撑起）。我全程只用 `Range.getClientRects()` 圈住**每个文本节点自己**，数它返回的 line box 个数再相加。反例（S01 @1440 第 3 屏 `div.plate-grid > figure.plate > figcaption > span.plate-cap`）：格高 44px、`line-height: 22px`，「÷ 法」判 **2 行**；`Range.getClientRects()` 实测 **1 行**（`longestLine` 420px / 内容盒 609px）。

**（3）行内元素的 `clientWidth` 恒为 0 → 假「每行 0 字」。** `<code>`、`<span class="latin">` 这类行内元素的 `clientWidth` 是 0，不做过滤就会产出「内容盒 0px ÷ 15px = 0 汉字/行」的假缺陷（首版数据里这类有 167 条）。修法：**只统计 `clientWidth > 0` 且自身文字 ≥4 字的子格**，并在表里同时给出分母（该格单个汉字宽，px）。

**（4）末屏碎条被当成「空屏」。** 按「页高 ÷ 视口高」分屏时，最后一屏常常只有 3–206px 高。首版把这些碎条里的低墨条也报成「空屏」。现在每条都带 `bandH`，**只有 `bandH === 视口高` 的整屏才计入 §4**，碎条单列成 §5.8。

## §1 全库几何总表

### 1A 盒模型 / 列数 / 溢出 / 内容盒容量

`网格`/`flex`/`表` = 该档实测存在的 grid、flex、table 容器个数。`最大列数` = 按「同一视觉行分组（子项 `offsetTop` 容差 3px）」实测的最大同排子项数（**含 `caption`/`thead`/`figcaption`/`list-item` 等全部显示类型**，见 1C）。`最大轨道` = grid 解析后的 `grid-template-columns` 轨道数。`表列数` = 表内某行最多单元格数（含 colspan）。`溢出` = `scrollWidth − clientWidth`，以及「出血件数」（rect 超出视口、非屏外跳转链接的元素个数）。`真滚动条` = `window.scrollTo(999999,0)` 后 `scrollX` 是否 >0。`最小/中位 汉字·行` = 有 ≥4 字文字的子格中，内容盒宽 ÷ 该格单个汉字宽 的最小／中位值（只统计 `clientWidth>0` 的格）。

| 案 | 档 | 网格 | flex | 表 | 最大列数 | 最大轨道 | 表列数 | 页高 | 屏数 | 溢出 | 真滚动条 | 最小 汉字·行 | 中位 汉字·行 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | 390 | 4 | 2 | 1 | 4 | 1 | 3 | 6467 | 8 | 0（出血 13 件，含屏外跳转链接） | 无 | 4 | 5 |
| S01 | 768 | 4 | 2 | 1 | 4 | 3 | 3 | 5108 | 5 | 0 / 0 | 无 | 4 | 5 |
| S01 | 1024 | 5 | 2 | 1 | 5 | 5 | 3 | 5002 | 7 | 0 / 0 | 无 | 4 | 5 |
| S01 | 1440 | 4 | 2 | 1 | 7 | 7 | 3 | 5069 | 6 | 0 / 0 | 无 | 4 | 5 |
| S02 | 390 | 13 | 24 | 1 | 4 | 4 | 6 | 9268 | 11 | 0 / 0 | 无 | 2 | 5 |
| S02 | 768 | 13 | 32 | 1 | 5 | 6 | 6 | 6067 | 6 | 0 / 0 | 无 | 2 | 4 |
| S02 | 1024 | 13 | 32 | 1 | 5 | 6 | 6 | 5640 | 8 | 0 / 0 | 无 | 3 | 4 |
| S02 | 1440 | 13 | 36 | 1 | 5 | 6 | 6 | 6117 | 7 | 0 / 0 | 无 | 3 | 4 |
| S03 | 390 | 4 | 11 | 1 | 4 | 2 | 5 | 5814 | 7 | 0 / 0 | 无 | 4 | 18 |
| S03 | 768 | 3 | 11 | 1 | 5 | 2 | 5 | 5907 | 6 | 0 / 0 | 无 | 4 | 10 |
| S03 | 1024 | 3 | 11 | 1 | 5 | 2 | 5 | 4751 | 7 | 0 / 0 | 无 | 4 | 10 |
| S03 | 1440 | 3 | 11 | 1 | 5 | 3 | 5 | 4591 | 6 | 0 / 0 | 无 | 4 | 10 |
| S04 | 390 | 18 | 3 | 1 | 1 | 12 | 4 | 8955 | 11 | 0 / 0 | 无 | 19 | 19 |
| S04 | 768 | 18 | 3 | 1 | 1 | 12 | 4 | 10449 | 11 | 0 / 0 | 无 | 41 | 41 |
| S04 | 1024 | 19 | 3 | 1 | 3 | 12 | 4 | 5439 | 8 | 0 / 0 | 无 | 8 | 48 |
| S04 | 1440 | 18 | 3 | 1 | 2 | 12 | 4 | 4912 | 6 | 0 / 0 | 无 | 8 | 17 |
| S05 | 390 | 4 | 44 | 1 | 3 | 6 | 2 | 5473 | 7 | 0 / 0 | 无 | 2 | 9 |
| S05 | 768 | 4 | 44 | 1 | 3 | 2 | 2 | 4510 | 5 | 0 / 0 | 无 | 2 | 9 |
| S05 | 1024 | 4 | 44 | 1 | 3 | 8 | 2 | 3327 | 5 | 0 / 0 | 无 | 2 | 7 |
| S05 | 1440 | 4 | 54 | 1 | 3 | 8 | 2 | 3121 | 4 | 0 / 0 | 无 | 2 | 7 |
| S06 | 390 | 6 | 2 | 1 | 2 | 2 | 6 | 10873 | 13 | 0（出血 12 件，含屏外跳转链接） | 无 | 4 | 21 |
| S06 | 768 | 6 | 3 | 1 | 2 | 2 | 6 | 7133 | 7 | 0 / 0 | 无 | 4 | 31 |
| S06 | 1024 | 6 | 3 | 1 | 2 | 2 | 6 | 7170 | 10 | 0 / 0 | 无 | 4 | 31 |
| S06 | 1440 | 6 | 2 | 1 | 4 | 4 | 6 | 6150 | 7 | 0 / 0 | 无 | 4 | 36 |
| S07 | 390 | 53 | 5 | 0 | 3 | 3 | — | 8676 | 11 | 0 / 0 | 无 | 4 | 19 |
| S07 | 768 | 53 | 5 | 0 | 6 | 3 | — | 8461 | 9 | 0 / 0 | 无 | 4 | 40 |
| S07 | 1024 | 53 | 5 | 0 | 6 | 6 | — | 4473 | 6 | 0 / 0 | 无 | 4 | 15 |
| S07 | 1440 | 53 | 5 | 0 | 4 | 7 | — | 4146 | 5 | 0 / 0 | 无 | 1 | 13 |
| S08 | 390 | 7 | 24 | 1 | 5 | 1 | 5 | 7599 | 10 | 0（出血 80 件，含屏外跳转链接） | 无 | 4 | 6 |
| S08 | 768 | 8 | 24 | 1 | 5 | 2 | 5 | 6926 | 7 | 0（出血 65 件，含屏外跳转链接） | 无 | 4 | 6 |
| S08 | 1024 | 8 | 22 | 1 | 5 | 3 | 5 | 7064 | 10 | 0 / 0 | 无 | 4 | 6 |
| S08 | 1440 | 8 | 24 | 1 | 5 | 5 | 5 | 7421 | 9 | 0 / 0 | 无 | 4 | 6 |
| S09 | 390 | 7 | 12 | 0 | 2 | 2 | — | 7223 | 9 | 0 / 0 | 无 | 3 | 18 |
| S09 | 768 | 7 | 12 | 0 | 3 | 3 | — | 4291 | 5 | 0 / 0 | 无 | 3 | 8 |
| S09 | 1024 | 7 | 12 | 0 | 3 | 3 | — | 4609 | 7 | 0 / 0 | 无 | 3 | 8 |
| S09 | 1440 | 7 | 12 | 0 | 4 | 4 | — | 3886 | 5 | 0 / 0 | 无 | 5 | 8 |
| S10 | 390 | 109 | 3 | 1 | 3 | 2 | 5 | 10322 | 13 | 0 / 0 | 无 | 5 | 23 |
| S10 | 768 | 18 | 6 | 1 | 3 | 3 | 5 | 5562 | 6 | 0 / 0 | 无 | 5 | 16 |
| S10 | 1024 | 18 | 6 | 1 | 5 | 5 | 5 | 5225 | 7 | 0 / 0 | 无 | 5 | 21 |
| S10 | 1440 | 18 | 6 | 1 | 5 | 5 | 5 | 5132 | 6 | 0 / 0 | 无 | 5 | 18 |
| S11 | 390 | 4 | 10 | 0 | 12 | 1 | — | 13100 | 16 | 0 / 0 | 无 | 5 | 12 |
| S11 | 768 | 16 | 37 | 1 | 9 | 2 | 4 | 14144 | 14 | 0 / 0 | 无 | 5 | 6 |
| S11 | 1024 | 16 | 37 | 1 | 12 | 12 | 4 | 8184 | 11 | 0 / 0 | 无 | 5 | 6 |
| S11 | 1440 | 16 | 37 | 1 | 12 | 12 | 4 | 9435 | 11 | 0 / 0 | 无 | 5 | 6 |
| S12 | 390 | 14 | 11 | 1 | 7 | 2 | 7 | 7633 | 10 | 0 / 0 | 无 | 5 | 7 |
| S12 | 768 | 14 | 11 | 1 | 7 | 2 | 7 | 5114 | 5 | 0 / 0 | 无 | 6 | 16 |
| S12 | 1024 | 14 | 11 | 1 | 7 | 6 | 7 | 4707 | 7 | 0 / 0 | 无 | 5 | 14 |
| S12 | 1440 | 14 | 11 | 1 | 7 | 8 | 7 | 4562 | 6 | 0 / 0 | 无 | 5 | 21 |
| S13 | 390 | 12 | 15 | 2 | 3 | 3 | 5 | 8892 | 11 | 0（出血 2 件，含屏外跳转链接） | 无 | 3 | 11 |
| S13 | 768 | 12 | 15 | 2 | 4 | 4 | 5 | 5559 | 6 | 0（出血 2 件，含屏外跳转链接） | 无 | 3 | 10 |
| S13 | 1024 | 11 | 16 | 2 | 3 | 12 | 5 | 6489 | 9 | 0（出血 2 件，含屏外跳转链接） | 无 | 3 | 15 |
| S13 | 1440 | 11 | 16 | 2 | 5 | 16 | 5 | 4756 | 6 | 0（出血 2 件，含屏外跳转链接） | 无 | 3 | 13 |
| S14 | 390 | 5 | 16 | 1 | 4 | 1 | 7 | 12161 | 15 | 0 / 0 | 无 | 2 | 3 |
| S14 | 768 | 5 | 16 | 1 | 4 | 2 | 7 | 9250 | 10 | 0 / 0 | 无 | 2 | 3 |
| S14 | 1024 | 5 | 15 | 1 | 4 | 4 | 7 | 6966 | 10 | 0（出血 1 件，含屏外跳转链接） | 无 | 2 | 3 |
| S14 | 1440 | 5 | 15 | 1 | 4 | 4 | 7 | 7569 | 9 | 0（出血 1 件，含屏外跳转链接） | 无 | 2 | 3 |
| S15 | 390 | 13 | 14 | 3 | 4 | 1 | 7 | 15398 | 19 | 0 / 0 | 无 | 2 | 20 |
| S15 | 768 | 13 | 14 | 3 | 4 | 2 | 7 | 13354 | 14 | 0 / 0 | 无 | 2 | 43 |
| S15 | 1024 | 14 | 14 | 3 | 4 | 9 | 7 | 10195 | 14 | 0 / 0 | 无 | 2 | 26 |
| S15 | 1440 | 14 | 14 | 3 | 5 | 12 | 7 | 8790 | 10 | 0 / 0 | 无 | 2 | 24 |
| S16 | 390 | 3 | 17 | 0 | 1 | 2 | — | 9694 | 12 | 0 / 0 | 无 | 4 | 6 |
| S16 | 768 | 3 | 17 | 0 | 4 | 2 | — | 9989 | 10 | 0 / 0 | 无 | 4 | 6 |
| S16 | 1024 | 2 | 17 | 0 | 3 | 2 | — | 8996 | 12 | 0 / 0 | 无 | 4 | 6 |
| S16 | 1440 | 2 | 17 | 0 | 4 | 3 | — | 9506 | 11 | 0 / 0 | 无 | 4 | 6 |
| S17 | 390 | 4 | 3 | 1 | 2 | 1 | 5 | 8241 | 10 | 0 / 0 | 无 | 6 | 12 |
| S17 | 768 | 4 | 3 | 1 | 2 | 2 | 5 | 7447 | 8 | 0 / 0 | 无 | 6 | 14 |
| S17 | 1024 | 4 | 3 | 1 | 4 | 3 | 5 | 2927 | 4 | 0 / 0 | 无 | 6 | 14 |
| S17 | 1440 | 4 | 3 | 1 | 5 | 5 | 5 | 2358 | 3 | 0 / 0 | 无 | 6 | 14 |
| S18 | 390 | 5 | 17 | 1 | 2 | 1 | 2 | 16547 | 20 | 0 / 0 | 无 | 1 | 11 |
| S18 | 768 | 5 | 17 | 3 | 4 | 1 | 5 | 13347 | 14 | 0 / 0 | 无 | 1 | 18 |
| S18 | 1024 | 5 | 22 | 3 | 5 | 3 | 5 | 10736 | 14 | 0 / 0 | 无 | 3 | 17 |
| S18 | 1440 | 5 | 22 | 3 | 5 | 3 | 5 | 10846 | 13 | 0 / 0 | 无 | 3 | 18 |
| S19 | 390 | 15 | 31 | 1 | 6 | 1 | 5 | 16992 | 21 | 0 / 0 | 无 | 2 | 16 |
| S19 | 768 | 15 | 31 | 1 | 7 | 2 | 5 | 15881 | 16 | 0 / 0 | 无 | 2 | 30 |
| S19 | 1024 | 15 | 31 | 1 | 7 | 12 | 5 | 9987 | 14 | 0 / 0 | 无 | 2 | 15 |
| S19 | 1440 | 15 | 31 | 1 | 7 | 12 | 5 | 10801 | 13 | 0 / 0 | 无 | 2 | 22 |
| S20 | 390 | 11 | 13 | 3 | 8 | 1 | 7 | 13806 | 17 | 0 / 0 | 无 | 2 | 15 |
| S20 | 768 | 11 | 13 | 3 | 8 | 2 | 7 | 11470 | 12 | 0 / 0 | 无 | 2 | 7 |
| S20 | 1024 | 10 | 10 | 3 | 8 | 4 | 7 | 9363 | 13 | 0 / 0 | 无 | 2 | 7 |
| S20 | 1440 | 9 | 10 | 3 | 8 | 4 | 7 | 8834 | 10 | 0 / 0 | 无 | 2 | 7 |
| S21 | 390 | 8 | 27 | 0 | 14 | 3 | — | 9943 | 12 | 0 / 0 | 无 | 3 | 3 |
| S21 | 768 | 8 | 26 | 3 | 14 | 6 | 5 | 4706 | 5 | 0 / 0 | 无 | 3 | 14 |
| S21 | 1024 | 8 | 26 | 3 | 14 | 6 | 5 | 3861 | 6 | 0 / 0 | 无 | 3 | 14 |
| S21 | 1440 | 8 | 26 | 3 | 4 | 10 | 5 | 3857 | 5 | 0 / 0 | 无 | 3 | 14 |
| S22 | 390 | 17 | 0 | 2 | 6 | 6 | 5 | 14682 | 18 | 0 / 0 | 无 | 9 | 20 |
| S22 | 768 | 17 | 0 | 2 | 6 | 6 | 5 | 11842 | 12 | 0 / 0 | 无 | 21 | 38 |
| S22 | 1024 | 17 | 0 | 2 | 6 | 12 | 5 | 10633 | 14 | 0 / 0 | 无 | 27 | 29 |
| S22 | 1440 | 18 | 0 | 2 | 6 | 13 | 5 | 9943 | 12 | 0 / 0 | 无 | 27 | 37 |
| S23 | 390 | 25 | 26 | 1 | 9 | 3 | 5 | 13931 | 17 | 0（出血 16 件，含屏外跳转链接） | 无 | 4 | 19 |
| S23 | 768 | 14 | 29 | 1 | 9 | 37 | 5 | 12747 | 13 | 0 / 0 | 无 | 3 | 9 |
| S23 | 1024 | 14 | 29 | 1 | 9 | 37 | 5 | 12247 | 16 | 0 / 0 | 无 | 3 | 13 |
| S23 | 1440 | 17 | 33 | 1 | 9 | 37 | 5 | 9626 | 11 | 0 / 0 | 无 | 3 | 17 |
| S24 | 390 | 9 | 14 | 0 | 6 | 3 | — | 15388 | 19 | 0 / 0 | 无 | 4 | 6 |
| S24 | 768 | 8 | 12 | 1 | 6 | 1 | 2 | 14020 | 14 | 0 / 0 | 无 | 4 | 11 |
| S24 | 1024 | 8 | 15 | 1 | 6 | 8 | 2 | 9668 | 13 | 0 / 0 | 无 | 4 | 6 |
| S24 | 1440 | 8 | 15 | 1 | 6 | 8 | 2 | 10533 | 12 | 0 / 0 | 无 | 4 | 6 |
| S25 | 390 | 9 | 15 | 0 | 3 | 2 | — | 9735 | 12 | 0 / 0 | 无 | 6 | 14 |
| S25 | 768 | 9 | 15 | 0 | 4 | 3 | — | 8657 | 9 | 0 / 0 | 无 | 6 | 14 |
| S25 | 1024 | 9 | 15 | 1 | 4 | 4 | 5 | 7689 | 11 | 0 / 0 | 无 | 6 | 17 |
| S25 | 1440 | 8 | 15 | 1 | 4 | 5 | 5 | 6912 | 8 | 0 / 0 | 无 | 6 | 14 |
| S26 | 390 | 18 | 25 | 6 | 3 | 2 | 5 | 17446 | 21 | 0 / 0 | 无 | 2 | 18 |
| S26 | 768 | 17 | 26 | 6 | 6 | 1 | 5 | 17097 | 17 | 0 / 0 | 无 | 2 | 40 |
| S26 | 1024 | 17 | 26 | 6 | 8 | 2 | 5 | 17653 | 23 | 0（出血 39 件，含屏外跳转链接） | 无 | 2 | 28 |
| S26 | 1440 | 17 | 26 | 6 | 8 | 3 | 5 | 10916 | 13 | 0（出血 39 件，含屏外跳转链接） | 无 | 2 | 26 |
| S27 | 390 | 0 | 38 | 1 | 2 | — | 4 | 18220 | 22 | 0 / 0 | 无 | 4 | 7 |
| S27 | 768 | 0 | 38 | 1 | 4 | — | 4 | 17743 | 18 | 0 / 0 | 无 | 4 | 11 |
| S27 | 1024 | 13 | 39 | 1 | 5 | 9 | 4 | 17719 | 24 | 0 / 0 | 无 | 1 | 11 |
| S27 | 1440 | 13 | 39 | 1 | 7 | 9 | 4 | 11197 | 13 | 0 / 0 | 无 | 1 | 11 |
| S28 | 390 | 4 | 56 | 2 | 3 | 16 | 5 | 29189 | 35 | 0（出血 15 件，含屏外跳转链接） | 无 | 2 | 9 |
| S28 | 768 | 10 | 49 | 2 | 4 | 16 | 5 | 10981 | 11 | 0（出血 10 件，含屏外跳转链接） | 无 | 1 | 10 |
| S28 | 1024 | 13 | 61 | 2 | 5 | 16 | 5 | 9771 | 13 | 0（出血 5 件，含屏外跳转链接） | 无 | 1 | 9 |
| S28 | 1440 | 14 | 73 | 2 | 7 | 16 | 5 | 9949 | 12 | 0（出血 3 件，含屏外跳转链接） | 无 | 1 | 9 |
| S29 | 390 | 148 | 8 | 4 | 2 | 2 | 5 | 22877 | 28 | 0 / 0 | 无 | 11 | 22 |
| S29 | 768 | 6 | 9 | 6 | 4 | 1 | 5 | 15824 | 16 | 0 / 0 | 无 | 9 | 40 |
| S29 | 1024 | 6 | 9 | 6 | 4 | 2 | 5 | 12257 | 16 | 0 / 0 | 无 | 9 | 33 |
| S29 | 1440 | 6 | 9 | 6 | 4 | 2 | 5 | 12526 | 14 | 0 / 0 | 无 | 9 | 40 |
| S30 | 390 | 6 | 23 | 1 | 3 | 1 | 5 | 12725 | 16 | 0（出血 2 件，含屏外跳转链接） | 无 | 2 | 15 |
| S30 | 768 | 6 | 24 | 1 | 6 | 2 | 5 | 11698 | 12 | 0（出血 2 件，含屏外跳转链接） | 无 | 2 | 4 |
| S30 | 1024 | 7 | 25 | 1 | 6 | 12 | 5 | 10247 | 14 | 0（出血 2 件，含屏外跳转链接） | 无 | 2 | 4 |
| S30 | 1440 | 7 | 25 | 1 | 6 | 12 | 5 | 9841 | 11 | 0（出血 2 件，含屏外跳转链接） | 无 | 2 | 4 |
| M01 | 390 | 8 | 44 | 0 | 2 | 2 | — | 7698 | 10 | 0（出血 14 件，含屏外跳转链接） | 无 | 9 | 18 |
| M01 | 768 | 8 | 44 | 0 | 3 | 3 | — | 5768 | 6 | 0 / 0 | 无 | 9 | 21 |
| M01 | 1024 | 8 | 51 | 0 | 5 | 5 | — | 4496 | 6 | 0 / 0 | 无 | 9 | 21 |
| M01 | 1440 | 8 | 51 | 0 | 5 | 5 | — | 4607 | 6 | 0 / 0 | 无 | 9 | 21 |
| M02 | 390 | 7 | 55 | 0 | 2 | 1 | — | 8242 | 10 | 0 / 0 | 无 | 2 | 11 |
| M02 | 768 | 7 | 55 | 0 | 3 | 2 | — | 7779 | 8 | 0 / 0 | 无 | 2 | 11 |
| M02 | 1024 | 7 | 53 | 0 | 4 | 4 | — | 5659 | 8 | 0 / 0 | 无 | 2 | 11 |
| M02 | 1440 | 7 | 53 | 0 | 4 | 4 | — | 5870 | 7 | 0 / 0 | 无 | 2 | 11 |
| M03 | 390 | 6 | 15 | 0 | 1 | 1 | — | 4338 | 6 | 0 / 0 | 无 | 3 | 22 |
| M03 | 768 | 6 | 18 | 0 | 3 | 2 | — | 4860 | 5 | 0 / 0 | 无 | 3 | 25 |
| M03 | 1024 | 6 | 18 | 0 | 3 | 2 | — | 4634 | 7 | 0 / 0 | 无 | 3 | 20 |
| M03 | 1440 | 6 | 18 | 0 | 3 | 2 | — | 5527 | 7 | 0 / 0 | 无 | 3 | 25 |
| SELECTOR | 390 | 52 | 108 | 0 | 5 | 4 | — | 22682 | 27 | 0 / 0 | 无 | 2 | 6 |
| SELECTOR | 768 | 52 | 108 | 0 | 6 | 4 | — | 29448 | 29 | 0 / 0 | 无 | 2 | 6 |
| SELECTOR | 1024 | 52 | 108 | 0 | 4 | 4 | — | 14151 | 19 | 0 / 0 | 无 | 2 | 6 |
| SELECTOR | 1440 | 52 | 108 | 0 | 4 | 4 | — | 13635 | 16 | 0 / 0 | 无 | 2 | 6 |
| WIZARD | 390 | 5 | 1 | 0 | 1 | 1 | — | 922 | 2 | 0 / 0 | 无 | 19 | 23 |
| WIZARD | 768 | 5 | 1 | 0 | 1 | 1 | — | 1024 | 1 | 0 / 0 | 无 | 35 | 43 |
| WIZARD | 1024 | 5 | 1 | 0 | 1 | 1 | — | 1037 | 2 | 0 / 0 | 无 | 35 | 43 |
| WIZARD | 1440 | 5 | 1 | 0 | 1 | 2 | — | 1084 | 2 | 0 / 0 | 无 | 35 | 43 |
| ROOTINDEX | 390 | 52 | 108 | 0 | 5 | 4 | — | 22682 | 27 | 0 / 0 | 无 | 2 | 6 |
| ROOTINDEX | 768 | 52 | 108 | 0 | 6 | 4 | — | 29448 | 29 | 0 / 0 | 无 | 2 | 6 |
| ROOTINDEX | 1024 | 52 | 108 | 0 | 4 | 4 | — | 14151 | 19 | 0 / 0 | 无 | 2 | 6 |
| ROOTINDEX | 1440 | 52 | 108 | 0 | 4 | 4 | — | 13635 | 16 | 0 / 0 | 无 | 2 | 6 |

**全库结论（144 个「案 × 档」全部如此）**：`documentElement.scrollWidth === clientWidth` 在 **144/144** 个点上成立，**真滚动条 0 个，仅裁切 0 个**。即：没有任何一档产生横向滚动条，也没有任何一档被 `overflow` 截短 `scrollWidth`。

### 1B 质量计数

`正文最小px` = tag ∈ {P,LI,TD,DD,DT,BLOCKQUOTE,FIGCAPTION} 且自身文字 ≥20 字的最小实测字号。`<16px` = 所有 ≥12 字文字元素中字号 <16px 的条目数。`对比<4.5` = 剔除「祖先链 opacity 乘积 <0.5」与「链上有 background-image」后的不达标条数。`最差比` = 其中最差对比度。`点击<44` = 可见控件中 w 或 h <44px 的条数（行内正文链接与屏外跳转链接已剔除）。`最小边` = 其中最差的那个较小边。`op<1` = 计算 `opacity ≠ 1` 的容器数（未入场容器残留指标）。`不动/仅变换` = `opacity=1` 但带 `transform` 的容器数（多为设计上的旋转/倾斜，不应视为未入场）。`同色文本` = 合成后前景 ≈ 底色、且**未**被 opacity 剔除的条目数（工具盲区指示器，见 §5.7）。

| 案 | 档 | 正文最小px | <16px | 对比<4.5 | 最差比 | 点击<44 | 最小边 | 图 | 断图 | op<1 | 仅变换 | 同色文本 | 控制台 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | 390 | 15 | 19 | 2 | 2.89 | 5 | 27 | 6 | 0 | 0 | 0 | 0 | 0 |
| S01 | 768 | 15 | 19 | 2 | 2.89 | 5 | 28 | 6 | 0 | 0 | 0 | 0 | 0 |
| S01 | 1024 | 15 | 18 | 2 | 2.89 | 5 | 28 | 6 | 0 | 0 | 0 | 0 | 0 |
| S01 | 1440 | 15 | 18 | 2 | 2.89 | 4 | 28 | 6 | 0 | 0 | 0 | 0 | 0 |
| S02 | 390 | 15 | 25 | 0 | — | 2 | 29.6 | 5 | 0 | 0 | 12 | 0 | 0 |
| S02 | 768 | 15 | 26 | 0 | — | 2 | 29.6 | 5 | 0 | 0 | 16 | 0 | 0 |
| S02 | 1024 | 15 | 26 | 0 | — | 2 | 29.6 | 5 | 0 | 0 | 16 | 0 | 0 |
| S02 | 1440 | 15 | 26 | 0 | — | 2 | 29.6 | 5 | 0 | 0 | 18 | 0 | 0 |
| S03 | 390 | 13 | 35 | 0 | — | 4 | 18 | 12 | 0 | 0 | 0 | 0 | 0 |
| S03 | 768 | 13 | 42 | 0 | — | 4 | 18 | 12 | 0 | 0 | 0 | 0 | 0 |
| S03 | 1024 | 13 | 42 | 0 | — | 4 | 18 | 12 | 0 | 0 | 0 | 0 | 0 |
| S03 | 1440 | 13 | 42 | 0 | — | 4 | 18 | 12 | 0 | 0 | 0 | 0 | 0 |
| S04 | 390 | 16 | 16 | 0 | — | 0 | — | 9 | 0 | 0 | 0 | 0 | 0 |
| S04 | 768 | 16 | 16 | 0 | — | 0 | — | 9 | 0 | 0 | 0 | 0 | 0 |
| S04 | 1024 | 16 | 14 | 0 | — | 0 | — | 9 | 0 | 0 | 0 | 0 | 0 |
| S04 | 1440 | 16 | 14 | 0 | — | 0 | — | 9 | 0 | 0 | 0 | 0 | 0 |
| S05 | 390 | 16 | 0 | 0 | — | 3 | 19.2 | 6 | 0 | 7 | 0 | 0 | 0 |
| S05 | 768 | 16 | 0 | 0 | — | 2 | 19.2 | 6 | 0 | 7 | 0 | 0 | 0 |
| S05 | 1024 | 16 | 0 | 0 | — | 2 | 19.2 | 6 | 0 | 7 | 0 | 0 | 0 |
| S05 | 1440 | 16 | 0 | 0 | — | 2 | 19.2 | 6 | 0 | 9 | 0 | 0 | 0 |
| S06 | 390 | 15 | 60 | 0 | — | 1 | 30.4 | 7 | 0 | 0 | 1 | 0 | 0 |
| S06 | 768 | 15 | 64 | 0 | — | 1 | 30.4 | 7 | 0 | 0 | 1 | 0 | 0 |
| S06 | 1024 | 15 | 64 | 0 | — | 1 | 30.4 | 7 | 0 | 0 | 1 | 0 | 0 |
| S06 | 1440 | 15 | 57 | 0 | — | 1 | 30.4 | 7 | 0 | 0 | 1 | 0 | 0 |
| S07 | 390 | 16 | 0 | 0 | — | 5 | 28 | 7 | 0 | 0 | 0 | 0 | 0 |
| S07 | 768 | 16 | 0 | 0 | — | 5 | 28 | 7 | 0 | 0 | 0 | 0 | 0 |
| S07 | 1024 | 16 | 0 | 0 | — | 5 | 28 | 7 | 0 | 0 | 0 | 0 | 0 |
| S07 | 1440 | 16 | 0 | 0 | — | 5 | 28 | 7 | 0 | 0 | 0 | 0 | 0 |
| S08 | 390 | 15 | 2 | 0 | — | 10 | 28.8 | 4 | 0 | 0 | 7 | 0 | 0 |
| S08 | 768 | 15 | 2 | 0 | — | 10 | 28.8 | 4 | 0 | 0 | 7 | 0 | 0 |
| S08 | 1024 | 15 | 2 | 0 | — | 10 | 28.8 | 4 | 0 | 0 | 7 | 0 | 0 |
| S08 | 1440 | 15 | 2 | 0 | — | 10 | 28.8 | 4 | 0 | 0 | 7 | 0 | 0 |
| S09 | 390 | 16 | 0 | 0 | — | 2 | 40 | 12 | 0 | 0 | 0 | 0 | 0 |
| S09 | 768 | 16 | 0 | 0 | — | 2 | 40 | 12 | 0 | 0 | 0 | 0 | 0 |
| S09 | 1024 | 16 | 0 | 0 | — | 2 | 40 | 12 | 0 | 0 | 0 | 0 | 0 |
| S09 | 1440 | 16 | 0 | 0 | — | 2 | 40 | 12 | 0 | 0 | 0 | 0 | 0 |
| S10 | 390 | 15 | 63 | 0 | — | 3 | 34 | 6 | 0 | 0 | 24 | 0 | 0 |
| S10 | 768 | 15 | 63 | 0 | — | 3 | 34 | 6 | 0 | 0 | 8 | 0 | 0 |
| S10 | 1024 | 15 | 63 | 0 | — | 3 | 34 | 6 | 0 | 0 | 8 | 0 | 0 |
| S10 | 1440 | 15 | 63 | 0 | — | 3 | 34 | 6 | 0 | 0 | 8 | 0 | 0 |
| S11 | 390 | 15 | 30 | 1 | 4.15 | 13 | 19 | 8 | 0 | 0 | 0 | 0 | 0 |
| S11 | 768 | 15 | 30 | 1 | 4.15 | 13 | 19 | 8 | 0 | 0 | 0 | 0 | 0 |
| S11 | 1024 | 15 | 30 | 1 | 4.15 | 13 | 19 | 8 | 0 | 0 | 0 | 0 | 0 |
| S11 | 1440 | 15 | 30 | 1 | 4.15 | 13 | 19 | 8 | 0 | 0 | 0 | 0 | 0 |
| S12 | 390 | 15 | 17 | 1 | 3.91 | 0 | — | 6 | 0 | 0 | 8 | 0 | 0 |
| S12 | 768 | 15 | 17 | 1 | 3.91 | 0 | — | 6 | 0 | 0 | 8 | 0 | 0 |
| S12 | 1024 | 15 | 17 | 1 | 3.91 | 0 | — | 6 | 0 | 0 | 8 | 0 | 0 |
| S12 | 1440 | 15 | 17 | 1 | 3.91 | 0 | — | 6 | 0 | 0 | 8 | 0 | 0 |
| S13 | 390 | 13 | 36 | 0 | — | 2 | 13 | 5 | 0 | 0 | 0 | 0 | 0 |
| S13 | 768 | 14 | 36 | 0 | — | 2 | 13 | 5 | 0 | 0 | 0 | 0 | 0 |
| S13 | 1024 | 14 | 36 | 0 | — | 2 | 13 | 5 | 0 | 0 | 0 | 0 | 0 |
| S13 | 1440 | 14 | 36 | 0 | — | 2 | 13 | 5 | 0 | 0 | 0 | 0 | 0 |
| S14 | 390 | 13 | 25 | 0 | — | 9 | 19 | 10 | 0 | 0 | 1 | 0 | 0 |
| S14 | 768 | 13 | 25 | 0 | — | 9 | 19 | 10 | 0 | 0 | 1 | 0 | 0 |
| S14 | 1024 | 13 | 25 | 0 | — | 9 | 19 | 10 | 0 | 0 | 0 | 0 | 0 |
| S14 | 1440 | 13 | 25 | 0 | — | 9 | 19 | 10 | 0 | 0 | 0 | 0 | 0 |
| S15 | 390 | 13 | 12 | 0 | — | 12 | 19 | 8 | 0 | 0 | 1 | 0 | 0 |
| S15 | 768 | 13 | 12 | 0 | — | 10 | 19 | 8 | 0 | 0 | 1 | 0 | 0 |
| S15 | 1024 | 13 | 13 | 0 | — | 10 | 19 | 8 | 0 | 0 | 1 | 0 | 0 |
| S15 | 1440 | 13 | 13 | 0 | — | 10 | 19 | 8 | 0 | 0 | 1 | 0 | 0 |
| S16 | 390 | 16 | 6 | 0 | — | 10 | 13.3 | 6 | 0 | 0 | 2 | 0 | 0 |
| S16 | 768 | 17 | 6 | 0 | — | 10 | 13.3 | 6 | 0 | 0 | 2 | 0 | 0 |
| S16 | 1024 | 18 | 6 | 0 | — | 10 | 13.3 | 6 | 0 | 0 | 2 | 0 | 0 |
| S16 | 1440 | 18 | 6 | 0 | — | 10 | 13.3 | 6 | 0 | 0 | 2 | 0 | 0 |
| S17 | 390 | 15 | 9 | 0 | — | 1 | 25.6 | 5 | 0 | 0 | 0 | 0 | 0 |
| S17 | 768 | 15 | 9 | 0 | — | 1 | 25.6 | 5 | 0 | 0 | 0 | 0 | 0 |
| S17 | 1024 | 15 | 9 | 0 | — | 1 | 25.6 | 5 | 0 | 0 | 0 | 0 | 0 |
| S17 | 1440 | 15 | 9 | 0 | — | 1 | 25.6 | 5 | 0 | 0 | 0 | 0 | 0 |
| S18 | 390 | 14 | 36 | 8 | 3.21 | 6 | 20 | 6 | 0 | 6 | 1 | 0 | 0 |
| S18 | 768 | 14 | 36 | 8 | 3.21 | 6 | 20 | 6 | 0 | 6 | 1 | 0 | 0 |
| S18 | 1024 | 14 | 38 | 0 | — | 6 | 20 | 6 | 0 | 6 | 2 | 0 | 0 |
| S18 | 1440 | 14 | 38 | 0 | — | 6 | 20 | 6 | 0 | 6 | 2 | 0 | 0 |
| S19 | 390 | 13 | 56 | 0 | — | 10 | 19 | 11 | 0 | 0 | 0 | 0 | 0 |
| S19 | 768 | 13 | 54 | 0 | — | 11 | 19 | 11 | 0 | 0 | 0 | 0 | 0 |
| S19 | 1024 | 13 | 64 | 0 | — | 10 | 19 | 11 | 0 | 0 | 0 | 0 | 0 |
| S19 | 1440 | 13 | 64 | 0 | — | 11 | 19 | 11 | 0 | 0 | 0 | 0 | 0 |
| S20 | 390 | 13 | 39 | 0 | — | 3 | 24 | 7 | 0 | 0 | 0 | 0 | 0 |
| S20 | 768 | 13 | 42 | 0 | — | 3 | 24 | 7 | 0 | 0 | 0 | 0 | 0 |
| S20 | 1024 | 13 | 42 | 0 | — | 0 | — | 7 | 0 | 0 | 0 | 0 | 0 |
| S20 | 1440 | 13 | 42 | 0 | — | 0 | — | 7 | 0 | 0 | 0 | 0 | 0 |
| S21 | 390 | 16 | 0 | 1 | 2.02 | 19 | 16 | 6 | 0 | 0 | 0 | 15 | 0 |
| S21 | 768 | 16 | 0 | 1 | 2.02 | 19 | 16 | 6 | 0 | 0 | 0 | 15 | 0 |
| S21 | 1024 | 16 | 0 | 1 | 2.02 | 19 | 16 | 6 | 0 | 0 | 0 | 15 | 0 |
| S21 | 1440 | 16 | 0 | 1 | 2.02 | 19 | 16 | 6 | 0 | 0 | 0 | 15 | 0 |
| S22 | 390 | 13.5 | 43 | 3 | 4.32 | 8 | 14 | 8 | 0 | 0 | 6 | 0 | 0 |
| S22 | 768 | 14 | 54 | 3 | 4.32 | 8 | 14 | 8 | 0 | 0 | 6 | 0 | 0 |
| S22 | 1024 | 14 | 54 | 3 | 4.32 | 8 | 14 | 8 | 0 | 0 | 6 | 0 | 0 |
| S22 | 1440 | 14 | 54 | 3 | 4.32 | 8 | 14 | 8 | 0 | 0 | 6 | 0 | 0 |
| S23 | 390 | 13 | 35 | 0 | — | 1 | 19 | 10 | 0 | 0 | 0 | 0 | 0 |
| S23 | 768 | 13 | 34 | 0 | — | 1 | 19 | 10 | 0 | 0 | 0 | 0 | 0 |
| S23 | 1024 | 13 | 34 | 0 | — | 1 | 19 | 10 | 0 | 0 | 0 | 0 | 0 |
| S23 | 1440 | 13 | 35 | 0 | — | 1 | 19 | 10 | 0 | 0 | 0 | 0 | 0 |
| S24 | 390 | 14 | 34 | 0 | — | 11 | 18 | 6 | 0 | 0 | 0 | 0 | 0 |
| S24 | 768 | 14 | 29 | 0 | — | 9 | 18 | 6 | 0 | 0 | 0 | 0 | 0 |
| S24 | 1024 | 14 | 34 | 0 | — | 11 | 18 | 6 | 0 | 0 | 0 | 0 | 0 |
| S24 | 1440 | 14 | 34 | 0 | — | 11 | 18 | 6 | 0 | 0 | 0 | 0 | 0 |
| S25 | 390 | 16 | 0 | 1 | 4.29 | 9 | 30.4 | 5 | 0 | 0 | 10 | 0 | 0 |
| S25 | 768 | 16 | 0 | 1 | 4.29 | 9 | 30.4 | 5 | 0 | 0 | 10 | 0 | 0 |
| S25 | 1024 | 16 | 0 | 1 | 4.29 | 9 | 30.4 | 5 | 0 | 0 | 10 | 0 | 0 |
| S25 | 1440 | 16 | 0 | 1 | 4.29 | 9 | 30.4 | 5 | 0 | 0 | 10 | 0 | 0 |
| S26 | 390 | 13 | 52 | 1 | 4.29 | 20 | 19 | 6 | 0 | 0 | 9 | 0 | 0 |
| S26 | 768 | 13 | 52 | 1 | 4.29 | 20 | 19 | 6 | 0 | 0 | 9 | 0 | 0 |
| S26 | 1024 | 13 | 52 | 1 | 4.29 | 17 | 19 | 6 | 0 | 0 | 9 | 0 | 0 |
| S26 | 1440 | 13 | 52 | 1 | 4.29 | 20 | 19 | 6 | 0 | 0 | 9 | 0 | 0 |
| S27 | 390 | 13 | 21 | 0 | — | 13 | 17 | 7 | 0 | 0 | 0 | 0 | 0 |
| S27 | 768 | 13 | 21 | 0 | — | 14 | 17 | 7 | 0 | 0 | 0 | 0 | 0 |
| S27 | 1024 | 13 | 21 | 0 | — | 13 | 17 | 7 | 0 | 0 | 7 | 0 | 0 |
| S27 | 1440 | 13 | 21 | 0 | — | 14 | 17 | 7 | 0 | 0 | 7 | 0 | 0 |
| S28 | 390 | 13 | 45 | 0 | — | 19 | 16.6 | 15 | 0 | 0 | 3 | 0 | 0 |
| S28 | 768 | 13 | 43 | 0 | — | 18 | 23 | 15 | 0 | 0 | 9 | 0 | 0 |
| S28 | 1024 | 13 | 45 | 0 | — | 18 | 23 | 15 | 0 | 0 | 12 | 0 | 0 |
| S28 | 1440 | 13 | 46 | 0 | — | 18 | 19 | 15 | 0 | 0 | 15 | 0 | 0 |
| S29 | 390 | 16 | 16 | 0 | — | 36 | 22 | 6 | 0 | 0 | 0 | 0 | 0 |
| S29 | 768 | 16 | 7 | 0 | — | 15 | 24 | 6 | 0 | 0 | 0 | 0 | 0 |
| S29 | 1024 | 16 | 7 | 0 | — | 13 | 24 | 6 | 0 | 0 | 0 | 0 | 0 |
| S29 | 1440 | 16 | 7 | 0 | — | 13 | 24 | 6 | 0 | 0 | 0 | 0 | 0 |
| S30 | 390 | 13 | 22 | 0 | — | 5 | 13 | 7 | 0 | 0 | 2 | 0 | 0 |
| S30 | 768 | 13 | 22 | 0 | — | 5 | 13 | 7 | 0 | 0 | 0 | 0 | 0 |
| S30 | 1024 | 13 | 22 | 0 | — | 5 | 13 | 7 | 0 | 0 | 2 | 0 | 0 |
| S30 | 1440 | 13 | 22 | 0 | — | 5 | 13 | 7 | 0 | 0 | 2 | 0 | 0 |
| M01 | 390 | 15 | 20 | 0 | — | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| M01 | 768 | 15 | 20 | 0 | — | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| M01 | 1024 | 15 | 20 | 0 | — | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| M01 | 1440 | 15 | 20 | 0 | — | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| M02 | 390 | 16 | 0 | 0 | — | 15 | 21 | 0 | 0 | 0 | 0 | 0 | 0 |
| M02 | 768 | 16 | 0 | 0 | — | 15 | 21 | 0 | 0 | 0 | 0 | 0 | 0 |
| M02 | 1024 | 16 | 0 | 0 | — | 13 | 21 | 0 | 0 | 0 | 0 | 0 | 0 |
| M02 | 1440 | 16 | 0 | 0 | — | 15 | 21 | 0 | 0 | 0 | 0 | 0 | 0 |
| M03 | 390 | 16 | 0 | 0 | — | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| M03 | 768 | 16 | 0 | 0 | — | 3 | 34 | 0 | 0 | 0 | 0 | 0 | 0 |
| M03 | 1024 | 16 | 0 | 0 | — | 3 | 34 | 0 | 0 | 0 | 0 | 0 | 0 |
| M03 | 1440 | 16 | 0 | 0 | — | 3 | 34 | 0 | 0 | 0 | 0 | 0 | 0 |
| SELECTOR | 390 | 13 | 121 | 0 | — | 36 | 21 | 90 | 0 | 0 | 25 | 0 | 0 |
| SELECTOR | 768 | 13 | 121 | 0 | — | 36 | 21 | 90 | 0 | 0 | 25 | 0 | 0 |
| SELECTOR | 1024 | 13 | 121 | 0 | — | 36 | 21 | 90 | 0 | 0 | 25 | 0 | 0 |
| SELECTOR | 1440 | 13 | 121 | 0 | — | 36 | 21 | 90 | 0 | 0 | 25 | 0 | 0 |
| WIZARD | 390 | 14 | 3 | 0 | — | 1 | 35 | 0 | 0 | 0 | 0 | 0 | 0 |
| WIZARD | 768 | 14 | 3 | 0 | — | 1 | 35 | 0 | 0 | 0 | 0 | 0 | 0 |
| WIZARD | 1024 | 14 | 3 | 0 | — | 1 | 35 | 0 | 0 | 0 | 0 | 0 | 0 |
| WIZARD | 1440 | 14 | 3 | 0 | — | 1 | 35 | 0 | 0 | 0 | 0 | 0 | 0 |
| ROOTINDEX | 390 | 13 | 121 | 0 | — | 36 | 21 | 90 | 0 | 0 | 25 | 0 | 0 |
| ROOTINDEX | 768 | 13 | 121 | 0 | — | 36 | 21 | 90 | 0 | 0 | 25 | 0 | 0 |
| ROOTINDEX | 1024 | 13 | 121 | 0 | — | 36 | 21 | 90 | 0 | 0 | 25 | 0 | 0 |
| ROOTINDEX | 1440 | 13 | 121 | 0 | — | 36 | 21 | 90 | 0 | 0 | 25 | 0 | 0 |

合计：正文 <16px 条目 **4126**；对比度不达标 **56** 条（另有 220 条因未入场、1564 条因链上有 background-image 被剔除，**未测**）；点击区 <44px **1240** 条（另有 20 条屏外跳转链接被剔除，见 §5.9）；`opacity ≠ 1` 的容器 **54** 个；`opacity = 1` 但带 `transform` 的容器 **553** 个。

### 1C 容易被漏掉的显示类型：`caption` / `thead` / `figcaption` / `list-item` 有没有被当作格子在排

| 案 | 档 | 容器 | display | 实测列数 | 轨道数 | 异常子项显示类型 | 该类型子项数 | 子项总数 | 屏 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | 390 | body > div.sheet > header.masthead > div.masthead-left:nth-of-type(3) >  | flex | 3 | — | list-item | 4 | 4 | 1 |
| S01 | 390 | section#front:nth-of-type(1) > div.columns > article.col.col-4:nth-of-ty | flex | 4 | — | list-item | 4 | 4 | 4 |
| S01 | 768 | body > div.sheet > header.masthead > div.masthead-left:nth-of-type(3) >  | flex | 4 | — | list-item | 4 | 4 | 1 |
| S01 | 1024 | body > div.sheet > header.masthead > div.masthead-left:nth-of-type(3) >  | flex | 4 | — | list-item | 4 | 4 | 1 |
| S01 | 1440 | body > div.sheet > header.masthead > div.masthead-left:nth-of-type(3) >  | flex | 4 | — | list-item | 4 | 4 | 1 |
| S02 | 390 | html > body > main > section.sheet.plates-sheet:nth-of-type(4) > ul.plat | grid | 1 | 1 | list-item | 5 | 5 | 7 |
| S02 | 768 | html > body > main > section.sheet.plates-sheet:nth-of-type(4) > ul.plat | grid | 2 | 6 | list-item | 5 | 5 | 4 |
| S02 | 1024 | html > body > main > section.sheet.plates-sheet:nth-of-type(4) > ul.plat | grid | 2 | 6 | list-item | 5 | 5 | 4 |
| S02 | 1440 | html > body > main > section.sheet.plates-sheet:nth-of-type(4) > ul.plat | grid | 2 | 6 | list-item | 5 | 5 | 4 |
| S03 | 390 | html.js > body.developed > header.masthead > nav.bar > ul.bar-links | flex | 4 | — | list-item | 4 | 4 | 1 |
| S03 | 390 | section#records:nth-of-type(1) > div.wrap > div.chrono > aside.axis > ul | flex | 1 | — | list-item | 5 | 5 | 2 |
| S03 | 768 | html.js > body.developed > header.masthead > nav.bar > ul.bar-links | flex | 4 | — | list-item | 4 | 4 | 1 |
| S03 | 1024 | html.js > body.developed > header.masthead > nav.bar > ul.bar-links | flex | 4 | — | list-item | 4 | 4 | 1 |
| S03 | 1440 | html.js > body.developed > header.masthead > nav.bar > ul.bar-links | flex | 4 | — | list-item | 4 | 4 | 1 |
| S05 | 1440 | section.console.section:nth-of-type(2) > div.console-shell > div.console | flex | 1 | — | list-item | 4 | 4 | 2 |
| S06 | 390 | div.sheet > main > section.plates-section:nth-of-type(2) > div.wrap > ul | grid | 1 | 1 | list-item | 2 | 2 | 9 |
| S06 | 390 | main > section.vessels-section:nth-of-type(3) > div.band.band--ink > div | grid | 2 | 2 | list-item | 4 | 4 | 10 |
| S06 | 768 | div.sheet > main > section.plates-section:nth-of-type(2) > div.wrap > ul | grid | 2 | 2 | list-item | 2 | 2 | 4 |
| S06 | 768 | main > section.vessels-section:nth-of-type(3) > div.band.band--ink > div | grid | 2 | 2 | list-item | 4 | 4 | 5 |
| S06 | 1024 | div.sheet > main > section.plates-section:nth-of-type(2) > div.wrap > ul | grid | 2 | 2 | list-item | 2 | 2 | 6 |
| S06 | 1024 | main > section.vessels-section:nth-of-type(3) > div.band.band--ink > div | grid | 2 | 2 | list-item | 4 | 4 | 7 |
| S06 | 1440 | div.sheet > main > section.plates-section:nth-of-type(2) > div.wrap > ul | grid | 2 | 2 | list-item | 2 | 2 | 4 |
| S06 | 1440 | main > section.vessels-section:nth-of-type(3) > div.band.band--ink > div | grid | 4 | 4 | list-item | 4 | 4 | 5 |
| S10 | 390 | body > div#sheet:nth-of-type(1) > main > section.plates:nth-of-type(2) > | grid | 1 | 1 | list-item | 5 | 5 | 8 |
| S10 | 390 | body > div#sheet:nth-of-type(1) > main > section.motion:nth-of-type(3) > | grid | 1 | 1 | list-item | 4 | 4 | 11 |
| S10 | 768 | body > div#sheet:nth-of-type(1) > main > section.plates:nth-of-type(2) > | grid | 3 | 3 | list-item | 5 | 5 | 4 |
| S10 | 768 | body > div#sheet:nth-of-type(1) > main > section.motion:nth-of-type(3) > | grid | 1 | 1 | list-item | 4 | 4 | 5 |
| S10 | 1024 | body > div#sheet:nth-of-type(1) > main > section.plates:nth-of-type(2) > | grid | 5 | 5 | list-item | 5 | 5 | 5 |
| S10 | 1024 | body > div#sheet:nth-of-type(1) > main > section.motion:nth-of-type(3) > | grid | 1 | 1 | list-item | 4 | 4 | 6 |
| S10 | 1440 | body > div#sheet:nth-of-type(1) > main > section.plates:nth-of-type(2) > | grid | 5 | 5 | list-item | 5 | 5 | 4 |
| S10 | 1440 | body > div#sheet:nth-of-type(1) > main > section.motion:nth-of-type(3) > | grid | 1 | 1 | list-item | 4 | 4 | 5 |
| S11 | 390 | div.page > div.wrap:nth-of-type(3) > header.doc-head > div.cover:nth-of- | flex | 1 | — | list-item | 3 | 3 | 1 |
| S11 | 390 | div.sheet > div.page > div.wrap:nth-of-type(3) > nav.chapter-strip > ul | flex | 12 | — | list-item | 12 | 12 | 2 |
| S11 | 768 | div.page > div.wrap:nth-of-type(3) > header.doc-head > div.cover:nth-of- | flex | 2 | — | list-item | 3 | 3 | 1 |
| S11 | 768 | div.sheet > div.page > div.wrap:nth-of-type(3) > nav.chapter-strip > ul | flex | 9 | — | list-item | 12 | 12 | 1 |
| S11 | 1024 | div.page > div.wrap:nth-of-type(3) > header.doc-head > div.cover:nth-of- | flex | 3 | — | list-item | 3 | 3 | 1 |
| S11 | 1024 | div.sheet > div.page > div.wrap:nth-of-type(3) > nav.chapter-strip > ul | flex | 12 | — | list-item | 12 | 12 | 1 |
| S11 | 1440 | div.page > div.wrap:nth-of-type(3) > header.doc-head > div.cover:nth-of- | flex | 3 | — | list-item | 3 | 3 | 1 |
| S11 | 1440 | div.sheet > div.page > div.wrap:nth-of-type(3) > nav.chapter-strip > ul | flex | 12 | — | list-item | 12 | 12 | 1 |
| S12 | 390 | body > div.sheet > main > section.plates:nth-of-type(3) > ul.plates | grid | 1 | 1 | list-item | 6 | 6 | 4 |
| S12 | 390 | body > div.sheet > main > section.states:nth-of-type(4) > ul.states | grid | 1 | 1 | list-item | 4 | 4 | 8 |
| S12 | 768 | body > div.sheet > main > section.plates:nth-of-type(3) > ul.plates | grid | 2 | 2 | list-item | 6 | 6 | 3 |
| S12 | 768 | body > div.sheet > main > section.states:nth-of-type(4) > ul.states | grid | 2 | 2 | list-item | 4 | 4 | 4 |
| S12 | 1024 | body > div.sheet > main > section.plates:nth-of-type(3) > ul.plates | grid | 3 | 3 | list-item | 6 | 6 | 4 |
| S12 | 1024 | body > div.sheet > main > section.states:nth-of-type(4) > ul.states | grid | 3 | 3 | list-item | 4 | 4 | 5 |
| S12 | 1440 | body > div.sheet > main > section.plates:nth-of-type(3) > ul.plates | grid | 5 | 5 | list-item | 6 | 6 | 3 |
| S12 | 1440 | body > div.sheet > main > section.states:nth-of-type(4) > ul.states | grid | 4 | 4 | list-item | 4 | 4 | 5 |
| S14 | 390 | html.js > body > main > section.plates-sec:nth-of-type(3) > ul.plates | grid | 1 | 1 | list-item | 8 | 8 | 6 |
| S14 | 390 | html.js > body > main > section.paths-sec:nth-of-type(5) > ol.paths | grid | 1 | 1 | list-item | 4 | 4 | 12 |
| S14 | 390 | html.js > body > main > section.motion-sec:nth-of-type(6) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 13 |
| S14 | 768 | html.js > body > main > section.plates-sec:nth-of-type(3) > ul.plates | grid | 2 | 2 | list-item | 8 | 8 | 5 |
| S14 | 768 | html.js > body > main > section.paths-sec:nth-of-type(5) > ol.paths | grid | 1 | 1 | list-item | 4 | 4 | 8 |
| S14 | 768 | html.js > body > main > section.motion-sec:nth-of-type(6) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 9 |
| S14 | 1024 | html.js > body > main > section.plates-sec:nth-of-type(3) > ul.plates | grid | 4 | 4 | list-item | 8 | 8 | 5 |
| S14 | 1024 | html.js > body > main > section.paths-sec:nth-of-type(5) > ol.paths | grid | 1 | 1 | list-item | 4 | 4 | 7 |
| S14 | 1024 | html.js > body > main > section.motion-sec:nth-of-type(6) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 8 |
| S14 | 1440 | html.js > body > main > section.plates-sec:nth-of-type(3) > ul.plates | grid | 4 | 4 | list-item | 8 | 8 | 5 |
| S14 | 1440 | html.js > body > main > section.paths-sec:nth-of-type(5) > ol.paths | grid | 1 | 1 | list-item | 4 | 4 | 7 |
| S14 | 1440 | html.js > body > main > section.motion-sec:nth-of-type(6) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 8 |
| S15 | 390 | body > div.page-wrap:nth-of-type(2) > main > section#atlas:nth-of-type(1 | grid | 1 | 1 | list-item | 3 | 3 | 5 |
| S15 | 390 | main > section.year:nth-of-type(2) > div.folds:nth-of-type(2) > details: | grid | 1 | 1 | list-item | 4 | 4 | 6 |
| S15 | 390 | body > div.page-wrap:nth-of-type(2) > main > section.plates:nth-of-type( | grid | 1 | 1 | list-item | 6 | 6 | 10 |
| S15 | 390 | body > div.page-wrap:nth-of-type(2) > main > section.spec:nth-of-type(6) | grid | 1 | 1 | list-item | 5 | 5 | 13 |
| S15 | 390 | body > div.page-wrap:nth-of-type(2) > main > section.motion:nth-of-type( | grid | 1 | 1 | list-item | 5 | 5 | 15 |
| S15 | 768 | body > div.page-wrap:nth-of-type(2) > main > section#atlas:nth-of-type(1 | grid | 1 | 1 | list-item | 3 | 3 | 5 |
| S15 | 768 | main > section.year:nth-of-type(2) > div.folds:nth-of-type(2) > details: | grid | 1 | 1 | list-item | 4 | 4 | 6 |
| S15 | 768 | body > div.page-wrap:nth-of-type(2) > main > section.plates:nth-of-type( | grid | 2 | 2 | list-item | 6 | 6 | 8 |
| S15 | 768 | body > div.page-wrap:nth-of-type(2) > main > section.spec:nth-of-type(6) | grid | 1 | 1 | list-item | 5 | 5 | 11 |
| S15 | 768 | body > div.page-wrap:nth-of-type(2) > main > section.motion:nth-of-type( | grid | 1 | 1 | list-item | 5 | 5 | 12 |
| S15 | 1024 | body > div.page-wrap:nth-of-type(2) > main > section#atlas:nth-of-type(1 | grid | 2 | 2 | list-item | 3 | 3 | 4 |
| S15 | 1024 | main > section.year:nth-of-type(2) > div.folds:nth-of-type(2) > details: | grid | 1 | 1 | list-item | 4 | 4 | 5 |
| S15 | 1024 | body > div.page-wrap:nth-of-type(2) > main > section.plates:nth-of-type( | grid | 3 | 3 | list-item | 6 | 6 | 8 |
| S15 | 1024 | body > div.page-wrap:nth-of-type(2) > main > section.spec:nth-of-type(6) | grid | 2 | 2 | list-item | 5 | 5 | 11 |
| S15 | 1024 | body > div.page-wrap:nth-of-type(2) > main > section.motion:nth-of-type( | grid | 2 | 2 | list-item | 5 | 5 | 12 |
| S15 | 1440 | body > div.page-wrap:nth-of-type(2) > main > section#atlas:nth-of-type(1 | grid | 2 | 2 | list-item | 3 | 3 | 3 |
| S15 | 1440 | main > section.year:nth-of-type(2) > div.folds:nth-of-type(2) > details: | grid | 1 | 1 | list-item | 4 | 4 | 4 |
| S15 | 1440 | body > div.page-wrap:nth-of-type(2) > main > section.plates:nth-of-type( | grid | 3 | 4 | list-item | 6 | 6 | 6 |
| S15 | 1440 | body > div.page-wrap:nth-of-type(2) > main > section.spec:nth-of-type(6) | grid | 2 | 2 | list-item | 5 | 5 | 8 |
| S15 | 1440 | body > div.page-wrap:nth-of-type(2) > main > section.motion:nth-of-type( | grid | 2 | 2 | list-item | 5 | 5 | 9 |
| S16 | 390 | div.sheet > header.masthead > div.masthead-grid > div.masthead-left:nth- | flex | 1 | — | list-item | 5 | 5 | 1 |
| S16 | 768 | div.sheet > header.masthead > div.masthead-grid > div.masthead-left:nth- | flex | 4 | — | list-item | 5 | 5 | 1 |
| S16 | 1024 | div.sheet > header.masthead > div.masthead-grid > div.masthead-left:nth- | flex | 3 | — | list-item | 5 | 5 | 1 |
| S16 | 1440 | div.sheet > header.masthead > div.masthead-grid > div.masthead-left:nth- | flex | 4 | — | list-item | 5 | 5 | 1 |
| S17 | 390 | html > body > header.sheet-head > ul.doc-meta | flex | 1 | — | list-item | 4 | 4 | 1 |
| S17 | 390 | html > body > main > section:nth-of-type(2) > ul.plates | grid | 1 | 1 | list-item | 5 | 5 | 7 |
| S17 | 768 | html > body > header.sheet-head > ul.doc-meta | flex | 2 | — | list-item | 4 | 4 | 1 |
| S17 | 768 | html > body > main > section:nth-of-type(2) > ul.plates | grid | 1 | 1 | list-item | 5 | 5 | 5 |
| S17 | 1024 | html > body > header.sheet-head > ul.doc-meta | flex | 4 | — | list-item | 4 | 4 | 1 |
| S17 | 1024 | html > body > main > section:nth-of-type(2) > ul.plates | grid | 3 | 3 | list-item | 5 | 5 | 3 |
| S17 | 1440 | html > body > header.sheet-head > ul.doc-meta | flex | 4 | — | list-item | 4 | 4 | 1 |
| S17 | 1440 | html > body > main > section:nth-of-type(2) > ul.plates | grid | 5 | 5 | list-item | 5 | 5 | 2 |
| S19 | 390 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 2 |
| S19 | 390 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 3 |
| S19 | 390 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 4 |
| S19 | 390 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 4 |
| S19 | 390 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 5 |
| S19 | 390 | html.js > body > main > section#extract:nth-of-type(2) > ul.xg | grid | 1 | 1 | list-item | 4 | 4 | 7 |
| S19 | 390 | html.js > body > main > section#plates:nth-of-type(4) > ul.plates | grid | 1 | 1 | list-item | 6 | 6 | 12 |
| S19 | 390 | html.js > body > main > section#paths:nth-of-type(6) > ul.paths | grid | 1 | 1 | list-item | 4 | 4 | 17 |
| S19 | 390 | html.js > body > main > section#motion:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 18 |
| S19 | 768 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 2 |
| S19 | 768 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 2 |
| S19 | 768 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 3 |
| S19 | 768 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 4 |
| S19 | 768 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 1 | 1 | list-item | 4 | 4 | 4 |
| S19 | 768 | html.js > body > main > section#extract:nth-of-type(2) > ul.xg | grid | 1 | 1 | list-item | 4 | 4 | 5 |
| S19 | 768 | html.js > body > main > section#plates:nth-of-type(4) > ul.plates | grid | 2 | 2 | list-item | 6 | 6 | 11 |
| S19 | 768 | html.js > body > main > section#paths:nth-of-type(6) > ul.paths | grid | 1 | 1 | list-item | 4 | 4 | 14 |
| S19 | 768 | html.js > body > main > section#motion:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 14 |
| S19 | 1024 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 2 |
| S19 | 1024 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 2 |
| S19 | 1024 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 2 |
| S19 | 1024 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 3 |
| S19 | 1024 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 3 |
| S19 | 1024 | html.js > body > main > section#extract:nth-of-type(2) > ul.xg | grid | 2 | 12 | list-item | 4 | 4 | 4 |
| S19 | 1024 | html.js > body > main > section#plates:nth-of-type(4) > ul.plates | grid | 3 | 3 | list-item | 6 | 6 | 8 |
| S19 | 1024 | html.js > body > main > section#paths:nth-of-type(6) > ul.paths | grid | 1 | 1 | list-item | 4 | 4 | 11 |
| S19 | 1024 | html.js > body > main > section#motion:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 12 |
| S19 | 1440 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 2 |
| S19 | 1440 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 2 |
| S19 | 1440 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 2 |
| S19 | 1440 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 2 |
| S19 | 1440 | main > section#cabinet:nth-of-type(1) > div.rows:nth-of-type(1) > div.ro | grid | 4 | 12 | list-item | 4 | 4 | 3 |
| S19 | 1440 | html.js > body > main > section#extract:nth-of-type(2) > ul.xg | grid | 2 | 12 | list-item | 4 | 4 | 3 |
| S19 | 1440 | html.js > body > main > section#plates:nth-of-type(4) > ul.plates | grid | 3 | 3 | list-item | 6 | 6 | 8 |
| S19 | 1440 | html.js > body > main > section#paths:nth-of-type(6) > ul.paths | grid | 1 | 1 | list-item | 4 | 4 | 10 |
| S19 | 1440 | html.js > body > main > section#motion:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 11 |
| S20 | 390 | html > body > main > section.keys:nth-of-type(3) > ul.keys__list | grid | 1 | 1 | list-item | 5 | 5 | 8 |
| S20 | 390 | html > body > main > section.plates-sec:nth-of-type(4) > ul.plates | grid | 1 | 1 | list-item | 6 | 6 | 9 |
| S20 | 390 | html > body > main > section.motion-sec:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 15 |
| S20 | 768 | html > body > main > section.keys:nth-of-type(3) > ul.keys__list | grid | 1 | 1 | list-item | 5 | 5 | 6 |
| S20 | 768 | html > body > main > section.plates-sec:nth-of-type(4) > ul.plates | grid | 2 | 2 | list-item | 6 | 6 | 7 |
| S20 | 768 | html > body > main > section.motion-sec:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 11 |
| S20 | 1024 | html > body > main > section.keys:nth-of-type(3) > ul.keys__list | grid | 1 | 1 | list-item | 5 | 5 | 6 |
| S20 | 1024 | html > body > main > section.plates-sec:nth-of-type(4) > ul.plates | grid | 2 | 4 | list-item | 6 | 6 | 7 |
| S20 | 1024 | html > body > main > section.motion-sec:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 11 |
| S20 | 1440 | html > body > main > section.keys:nth-of-type(3) > ul.keys__list | grid | 1 | 1 | list-item | 5 | 5 | 5 |
| S20 | 1440 | html > body > main > section.plates-sec:nth-of-type(4) > ul.plates | grid | 2 | 4 | list-item | 6 | 6 | 6 |
| S20 | 1440 | html > body > main > section.motion-sec:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 5 | 5 | 9 |
| S21 | 390 | html > body > main > section.states:nth-of-type(4) > ul.states__grid | grid | 1 | 1 | list-item | 4 | 4 | 11 |
| S21 | 768 | html > body > main > section.states:nth-of-type(4) > ul.states__grid | grid | 2 | 2 | list-item | 4 | 4 | 5 |
| S21 | 1024 | html > body > main > section.states:nth-of-type(4) > ul.states__grid | grid | 3 | 3 | list-item | 4 | 4 | 5 |
| S21 | 1440 | html > body > main > section.states:nth-of-type(4) > ul.states__grid | grid | 4 | 4 | list-item | 4 | 4 | 4 |
| S22 | 390 | html.js > body > main > section#plates:nth-of-type(5) > ul.plates | grid | 1 | 6 | list-item | 6 | 6 | 11 |
| S22 | 390 | body > main > section#motion:nth-of-type(6) > div.timeline.in:nth-of-typ | grid | 2 | 2 | list-item | 6 | 6 | 14 |
| S22 | 390 | html.js > body > main > section#motion:nth-of-type(6) > ul.spec-list | grid | 1 | 6 | list-item | 6 | 6 | 14 |
| S22 | 390 | html.js > body > main > section#icons:nth-of-type(7) > ul.icons.in | grid | 1 | 6 | list-item | 3 | 3 | 16 |
| S22 | 768 | html.js > body > main > section#plates:nth-of-type(5) > ul.plates | grid | 1 | 6 | list-item | 6 | 6 | 7 |
| S22 | 768 | body > main > section#motion:nth-of-type(6) > div.timeline.in:nth-of-typ | grid | 2 | 2 | list-item | 6 | 6 | 10 |
| S22 | 768 | html.js > body > main > section#motion:nth-of-type(6) > ul.spec-list | grid | 1 | 6 | list-item | 6 | 6 | 10 |
| S22 | 768 | html.js > body > main > section#icons:nth-of-type(7) > ul.icons.in | grid | 1 | 6 | list-item | 3 | 3 | 11 |
| S22 | 1024 | html.js > body > main > section#plates:nth-of-type(5) > ul.plates | grid | 2 | 12 | list-item | 6 | 6 | 9 |
| S22 | 1024 | body > main > section#motion:nth-of-type(6) > div.timeline.in:nth-of-typ | grid | 2 | 2 | list-item | 6 | 6 | 11 |
| S22 | 1024 | html.js > body > main > section#motion:nth-of-type(6) > ul.spec-list | grid | 1 | 12 | list-item | 6 | 6 | 12 |
| S22 | 1024 | html.js > body > main > section#icons:nth-of-type(7) > ul.icons.in | grid | 1 | 12 | list-item | 3 | 3 | 13 |
| S22 | 1440 | html.js > body > main > section#plates:nth-of-type(5) > ul.plates | grid | 2 | 12 | list-item | 6 | 6 | 7 |
| S22 | 1440 | body > main > section#motion:nth-of-type(6) > div.timeline.in:nth-of-typ | grid | 3 | 3 | list-item | 6 | 6 | 9 |
| S22 | 1440 | html.js > body > main > section#motion:nth-of-type(6) > ul.spec-list | grid | 2 | 12 | list-item | 6 | 6 | 10 |
| S22 | 1440 | html.js > body > main > section#icons:nth-of-type(7) > ul.icons.in | grid | 2 | 12 | list-item | 3 | 3 | 11 |
| S23 | 390 | html.js > body > main > section.sec.wrap:nth-of-type(3) > ul.tools | flex | 1 | — | list-item | 4 | 4 | 9 |
| S23 | 390 | html.js > body > main > section.sec.wrap:nth-of-type(5) > ul.plates | grid | 1 | 3 | list-item | 6 | 6 | 12 |
| S23 | 390 | html.js > body > main > section.sec.wrap:nth-of-type(6) > ul.spec-list | grid | 1 | 1 | list-item | 6 | 6 | 15 |
| S23 | 768 | html.js > body > main > section.sec.wrap:nth-of-type(3) > ul.tools | flex | 2 | — | list-item | 4 | 4 | 6 |
| S23 | 768 | html.js > body > main > section.sec.wrap:nth-of-type(5) > ul.plates | grid | 1 | 3 | list-item | 6 | 6 | 8 |
| S23 | 768 | html.js > body > main > section.sec.wrap:nth-of-type(6) > ul.spec-list | grid | 1 | 1 | list-item | 6 | 6 | 12 |
| S23 | 1024 | html.js > body > main > section.sec.wrap:nth-of-type(3) > ul.tools | flex | 4 | — | list-item | 4 | 4 | 7 |
| S23 | 1024 | html.js > body > main > section.sec.wrap:nth-of-type(5) > ul.plates | grid | 1 | 3 | list-item | 6 | 6 | 8 |
| S23 | 1024 | html.js > body > main > section.sec.wrap:nth-of-type(6) > ul.spec-list | grid | 2 | 2 | list-item | 6 | 6 | 15 |
| S23 | 1440 | html.js > body > main > section.sec.wrap:nth-of-type(3) > ul.tools | flex | 4 | — | list-item | 4 | 4 | 6 |
| S23 | 1440 | html.js > body > main > section.sec.wrap:nth-of-type(5) > ul.plates | grid | 3 | 6 | list-item | 6 | 6 | 8 |
| S23 | 1440 | html.js > body > main > section.sec.wrap:nth-of-type(6) > ul.spec-list | grid | 2 | 2 | list-item | 6 | 6 | 10 |
| S24 | 390 | main > section#fork:nth-of-type(1) > div.fork__grid:nth-of-type(2) > div | flex | 1 | — | list-item | 4 | 4 | 8 |
| S24 | 768 | main > section#fork:nth-of-type(1) > div.fork__grid:nth-of-type(2) > div | flex | 1 | — | list-item | 4 | 4 | 6 |
| S24 | 1024 | main > section#fork:nth-of-type(1) > div.fork__grid:nth-of-type(2) > div | flex | 2 | — | list-item | 4 | 4 | 6 |
| S24 | 1440 | main > section#fork:nth-of-type(1) > div.fork__grid:nth-of-type(2) > div | flex | 1 | — | list-item | 4 | 4 | 6 |
| S26 | 390 | body > div.sheet > div.topbar > nav.idx > ol.idx__list | flex | 3 | — | list-item | 8 | 8 | 1 |
| S26 | 768 | body > div.sheet > div.topbar > nav.idx > ol.idx__list | flex | 6 | — | list-item | 8 | 8 | 1 |
| S26 | 1024 | body > div.sheet > div.topbar > nav.idx > ol.idx__list | flex | 8 | — | list-item | 8 | 8 | 1 |
| S26 | 1440 | body > div.sheet > div.topbar > nav.idx > ol.idx__list | flex | 8 | — | list-item | 8 | 8 | 1 |
| S27 | 390 | body > header#top > div.wrap > nav.acts-nav > ul | flex | 2 | — | list-item | 7 | 7 | 2 |
| S27 | 768 | body > header#top > div.wrap > nav.acts-nav > ul | flex | 4 | — | list-item | 7 | 7 | 2 |
| S27 | 1024 | body > header#top > div.wrap > nav.acts-nav > ul | flex | 5 | — | list-item | 7 | 7 | 3 |
| S27 | 1024 | body > main > section.plates-sec:nth-of-type(4) > div.wrap > ul.plates | grid | 2 | 9 | list-item | 6 | 6 | 14 |
| S27 | 1024 | body > main > section.motion-sec:nth-of-type(5) > div.wrap > ul.spec-lis | grid | 1 | 9 | list-item | 6 | 6 | 22 |
| S27 | 1440 | body > header#top > div.wrap > nav.acts-nav > ul | flex | 7 | — | list-item | 7 | 7 | 2 |
| S27 | 1440 | body > main > section.plates-sec:nth-of-type(4) > div.wrap > ul.plates | grid | 3 | 9 | list-item | 6 | 6 | 9 |
| S27 | 1440 | body > main > section.motion-sec:nth-of-type(5) > div.wrap > ul.spec-lis | grid | 2 | 9 | list-item | 6 | 6 | 12 |
| S28 | 390 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-01:nth-of-type(1) | flex | 2 | — | list-item | 3 | 3 | 4 |
| S28 | 390 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-02:nth-of-type(2) | flex | 2 | — | list-item | 3 | 3 | 5 |
| S28 | 390 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-03:nth-of-type(3) | flex | 3 | — | list-item | 3 | 3 | 6 |
| S28 | 390 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 6 |
| S28 | 390 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-05:nth-of-type(2) | flex | 2 | — | list-item | 3 | 3 | 7 |
| S28 | 390 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-06:nth-of-type(3) | flex | 2 | — | list-item | 3 | 3 | 8 |
| S28 | 390 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-07:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 9 |
| S28 | 390 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-08:nth-of-type(2) | flex | 3 | — | list-item | 3 | 3 | 9 |
| S28 | 390 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-09:nth-of-type(3) | flex | 2 | — | list-item | 3 | 3 | 10 |
| S28 | 390 | div.wrap > div.row.row--4:nth-of-type(5) > article#blk-10:nth-of-type(1) | flex | 2 | — | list-item | 3 | 3 | 11 |
| S28 | 390 | div.wrap > div.row.row--4:nth-of-type(5) > article#blk-11:nth-of-type(2) | flex | 2 | — | list-item | 3 | 3 | 12 |
| S28 | 390 | div.wrap > div.row.row--4:nth-of-type(5) > article#blk-12:nth-of-type(3) | flex | 2 | — | list-item | 3 | 3 | 12 |
| S28 | 390 | body > main > section.status:nth-of-type(3) > div.wrap > ul.checklist | flex | 2 | — | list-item | 16 | 16 | 28 |
| S28 | 390 | body > main > section.motion-sec:nth-of-type(5) > div.wrap > ul.spec-lis | grid | 2 | 16 | list-item | 7 | 7 | 32 |
| S28 | 768 | body > header#top > div.wrap > nav.idx > ul | flex | 3 | — | list-item | 12 | 12 | 2 |
| S28 | 768 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-01:nth-of-type(1) | flex | 2 | — | list-item | 3 | 3 | 3 |
| S28 | 768 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-02:nth-of-type(2) | flex | 1 | — | list-item | 3 | 3 | 3 |
| S28 | 768 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-03:nth-of-type(3) | flex | 2 | — | list-item | 3 | 3 | 3 |
| S28 | 768 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 3 |
| S28 | 768 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-05:nth-of-type(2) | flex | 1 | — | list-item | 3 | 3 | 4 |
| S28 | 768 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-06:nth-of-type(3) | flex | 2 | — | list-item | 3 | 3 | 4 |
| S28 | 768 | section.status:nth-of-type(3) > div.wrap > div.status__grid > div.status | grid | 2 | 2 | list-item | 6 | 6 | 6 |
| S28 | 768 | body > main > section.status:nth-of-type(3) > div.wrap > ul.checklist | flex | 4 | — | list-item | 16 | 16 | 8 |
| S28 | 768 | body > main > section.plates-sec:nth-of-type(4) > div.wrap > ul.plates | grid | 2 | 16 | list-item | 6 | 6 | 8 |
| S28 | 768 | body > main > section.motion-sec:nth-of-type(5) > div.wrap > ul.spec-lis | grid | 1 | 16 | list-item | 7 | 7 | 9 |
| S28 | 1024 | body > header#top > div.wrap > nav.idx > ul | flex | 4 | — | list-item | 12 | 12 | 2 |
| S28 | 1024 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-01:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 3 |
| S28 | 1024 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-02:nth-of-type(2) | flex | 1 | — | list-item | 3 | 3 | 3 |
| S28 | 1024 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-03:nth-of-type(3) | flex | 2 | — | list-item | 3 | 3 | 3 |
| S28 | 1024 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 3 |
| S28 | 1024 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-05:nth-of-type(2) | flex | 2 | — | list-item | 3 | 3 | 4 |
| S28 | 1024 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-06:nth-of-type(3) | flex | 2 | — | list-item | 3 | 3 | 4 |
| S28 | 1024 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-07:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 5 |
| S28 | 1024 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-08:nth-of-type(2) | flex | 1 | — | list-item | 3 | 3 | 5 |
| S28 | 1024 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-09:nth-of-type(3) | flex | 3 | — | list-item | 3 | 3 | 5 |
| S28 | 1024 | section.status:nth-of-type(3) > div.wrap > div.status__grid > div.status | grid | 2 | 2 | list-item | 6 | 6 | 7 |
| S28 | 1024 | body > main > section.status:nth-of-type(3) > div.wrap > ul.checklist | flex | 5 | — | list-item | 16 | 16 | 9 |
| S28 | 1024 | body > main > section.plates-sec:nth-of-type(4) > div.wrap > ul.plates | grid | 3 | 16 | list-item | 6 | 6 | 10 |
| S28 | 1024 | body > main > section.motion-sec:nth-of-type(5) > div.wrap > ul.spec-lis | grid | 2 | 16 | list-item | 7 | 7 | 11 |
| S28 | 1440 | body > header#top > div.wrap > nav.idx > ul | flex | 5 | — | list-item | 12 | 12 | 1 |
| S28 | 1440 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-01:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 3 |
| S28 | 1440 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-02:nth-of-type(2) | flex | 2 | — | list-item | 3 | 3 | 2 |
| S28 | 1440 | div.wrap > div.row.row--1:nth-of-type(2) > article#blk-03:nth-of-type(3) | flex | 3 | — | list-item | 3 | 3 | 3 |
| S28 | 1440 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 3 |
| S28 | 1440 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-05:nth-of-type(2) | flex | 3 | — | list-item | 3 | 3 | 4 |
| S28 | 1440 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-06:nth-of-type(3) | flex | 3 | — | list-item | 3 | 3 | 4 |
| S28 | 1440 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-07:nth-of-type(1) | flex | 3 | — | list-item | 3 | 3 | 4 |
| S28 | 1440 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-08:nth-of-type(2) | flex | 2 | — | list-item | 3 | 3 | 4 |
| S28 | 1440 | div.wrap > div.row.row--3:nth-of-type(4) > article#blk-09:nth-of-type(3) | flex | 3 | — | list-item | 3 | 3 | 4 |
| S28 | 1440 | div.wrap > div.row.row--4:nth-of-type(5) > article#blk-10:nth-of-type(1) | flex | 2 | — | list-item | 3 | 3 | 5 |
| S28 | 1440 | div.wrap > div.row.row--4:nth-of-type(5) > article#blk-11:nth-of-type(2) | flex | 3 | — | list-item | 3 | 3 | 5 |
| S28 | 1440 | div.wrap > div.row.row--4:nth-of-type(5) > article#blk-12:nth-of-type(3) | flex | 3 | — | list-item | 3 | 3 | 5 |
| S28 | 1440 | section.status:nth-of-type(3) > div.wrap > div.status__grid > div.status | grid | 2 | 2 | list-item | 6 | 6 | 7 |
| S28 | 1440 | body > main > section.status:nth-of-type(3) > div.wrap > ul.checklist | flex | 7 | — | list-item | 16 | 16 | 8 |
| S28 | 1440 | body > main > section.plates-sec:nth-of-type(4) > div.wrap > ul.plates | grid | 3 | 16 | list-item | 6 | 6 | 9 |
| S28 | 1440 | body > main > section.motion-sec:nth-of-type(5) > div.wrap > ul.spec-lis | grid | 2 | 16 | list-item | 7 | 7 | 10 |
| S29 | 390 | body > div.sheet > div.topbar:nth-of-type(2) > div.idx:nth-of-type(2) >  | flex | 2 | — | list-item | 4 | 4 | 1 |
| S29 | 768 | body > div.sheet > div.topbar:nth-of-type(2) > div.idx:nth-of-type(2) >  | flex | 4 | — | list-item | 4 | 4 | 1 |
| S29 | 1024 | body > div.sheet > div.topbar:nth-of-type(2) > div.idx:nth-of-type(2) >  | flex | 4 | — | list-item | 4 | 4 | 1 |
| S29 | 1440 | body > div.sheet > div.topbar:nth-of-type(2) > div.idx:nth-of-type(2) >  | flex | 4 | — | list-item | 4 | 4 | 1 |
| S30 | 390 | html.js > body > main > section#tear:nth-of-type(3) > ul.spec-list:nth-o | grid | 1 | 1 | list-item | 5 | 5 | 6 |
| S30 | 390 | html.js > body > main > section#motion:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 6 | 6 | 13 |
| S30 | 768 | html.js > body > main > section#tear:nth-of-type(3) > ul.spec-list:nth-o | grid | 1 | 1 | list-item | 5 | 5 | 5 |
| S30 | 768 | html.js > body > main > section#motion:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 6 | 6 | 10 |
| S30 | 1024 | html.js > body > main > section#tear:nth-of-type(3) > ul.spec-list:nth-o | grid | 1 | 1 | list-item | 5 | 5 | 7 |
| S30 | 1024 | html.js > body > main > section#motion:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 6 | 6 | 12 |
| S30 | 1440 | html.js > body > main > section#tear:nth-of-type(3) > ul.spec-list:nth-o | grid | 1 | 1 | list-item | 5 | 5 | 5 |
| S30 | 1440 | html.js > body > main > section#motion:nth-of-type(7) > ul.spec-list | grid | 1 | 1 | list-item | 6 | 6 | 10 |
| M01 | 390 | main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c | flex | 1 | — | list-item | 3 | 3 | 1 |
| M01 | 390 | body > main#main > section#clients:nth-of-type(3) > div.wrap > ul.logo-r | grid | 2 | 2 | list-item | 5 | 5 | 4 |
| M01 | 390 | body > main#main > section#results:nth-of-type(4) > div.wrap > ul.stats | grid | 1 | 1 | list-item | 4 | 4 | 4 |
| M01 | 390 | body > main#main > section#process:nth-of-type(5) > div.wrap > ol.steps | grid | 1 | 1 | list-item | 4 | 4 | 6 |
| M01 | 390 | html > body > footer.site-footer > div.wrap.footer-bottom:nth-of-type(2) | flex | 1 | — | list-item | 2 | 2 | 9 |
| M01 | 768 | main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c | flex | 2 | — | list-item | 3 | 3 | 1 |
| M01 | 768 | body > main#main > section#clients:nth-of-type(3) > div.wrap > ul.logo-r | grid | 3 | 3 | list-item | 5 | 5 | 2 |
| M01 | 768 | body > main#main > section#results:nth-of-type(4) > div.wrap > ul.stats | grid | 2 | 2 | list-item | 4 | 4 | 3 |
| M01 | 768 | body > main#main > section#process:nth-of-type(5) > div.wrap > ol.steps | grid | 2 | 2 | list-item | 4 | 4 | 4 |
| M01 | 768 | html > body > footer.site-footer > div.wrap.footer-bottom:nth-of-type(2) | flex | 2 | — | list-item | 2 | 2 | 6 |
| M01 | 1024 | body > header.site-header > div.wrap.header-inner > nav.site-nav > ul.si | flex | 5 | — | list-item | 5 | 5 | 1 |
| M01 | 1024 | main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c | flex | 1 | — | list-item | 3 | 3 | 1 |
| M01 | 1024 | body > main#main > section#clients:nth-of-type(3) > div.wrap > ul.logo-r | grid | 5 | 5 | list-item | 5 | 5 | 3 |
| M01 | 1024 | body > main#main > section#results:nth-of-type(4) > div.wrap > ul.stats | grid | 4 | 4 | list-item | 4 | 4 | 3 |
| M01 | 1024 | body > main#main > section#process:nth-of-type(5) > div.wrap > ol.steps | grid | 4 | 4 | list-item | 4 | 4 | 4 |
| M01 | 1024 | html > body > footer.site-footer > div.wrap.footer-bottom:nth-of-type(2) | flex | 2 | — | list-item | 2 | 2 | 6 |
| M01 | 1440 | body > header.site-header > div.wrap.header-inner > nav.site-nav > ul.si | flex | 5 | — | list-item | 5 | 5 | 1 |
| M01 | 1440 | main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c | flex | 1 | — | list-item | 3 | 3 | 1 |
| M01 | 1440 | body > main#main > section#clients:nth-of-type(3) > div.wrap > ul.logo-r | grid | 5 | 5 | list-item | 5 | 5 | 2 |
| M01 | 1440 | body > main#main > section#results:nth-of-type(4) > div.wrap > ul.stats | grid | 4 | 4 | list-item | 4 | 4 | 3 |
| M01 | 1440 | body > main#main > section#process:nth-of-type(5) > div.wrap > ol.steps | grid | 4 | 4 | list-item | 4 | 4 | 4 |
| M01 | 1440 | html > body > footer.site-footer > div.wrap.footer-bottom:nth-of-type(2) | flex | 2 | — | list-item | 2 | 2 | 6 |
| M02 | 390 | main#main > section#top:nth-of-type(1) > div.wrap > div.hero-band > ul.h | flex | 1 | — | list-item | 3 | 3 | 1 |
| M02 | 768 | main#main > section#top:nth-of-type(1) > div.wrap > div.hero-band > ul.h | flex | 3 | — | list-item | 3 | 3 | 1 |
| M02 | 1024 | body > header.site-head > div.wrap.site-head-in > nav.nav > ul.nav-list | flex | 4 | — | list-item | 4 | 4 | 1 |
| M02 | 1024 | main#main > section#top:nth-of-type(1) > div.wrap > div.hero-band > ul.h | flex | 3 | — | list-item | 3 | 3 | 1 |
| M02 | 1440 | body > header.site-head > div.wrap.site-head-in > nav.nav > ul.nav-list | flex | 4 | — | list-item | 4 | 4 | 1 |
| M02 | 1440 | main#main > section#top:nth-of-type(1) > div.wrap > div.hero-band > ul.h | flex | 3 | — | list-item | 3 | 3 | 1 |

补充一：**本库没有任何 grid/flex 容器的直接子项是 `caption` / `thead` / `figcaption`（即 `table-caption` / `table-header-group` / `table-row-group` / `table-footer-group`）——上表里出现的异常显示类型只有 `list-item`。** 也就是说：这批原型不存在「把 `<table>` 的 caption 塞进 grid」这种结构。
补充二：`<table>` 容器的实际列数（含 colspan）已逐档计入 1A 的 `表列数` 一栏；`<caption>` / `<thead>` 里的文字与 `<figcaption>` 一样，都照常进入正文级字号、行盒与对比度的检查范围，**不因显示类型被跳过**。
补充三：上表里 `实测列数` 与 `轨道数` 不等的情况要单独看——例如 S02 的 `section.plates-sheet > ul.plates-grid` 在 768/1024/1440 档 `轨道数 = 6` 但 `实测列数 = 2`（每 3 条轨道放 1 个子项，`grid-column: span 3`），而 390 档是 `轨道数 = 1 / 实测列数 = 1`。若只数轨道，会把它报成 6 列；只数子项排布，会报成 2 列。我在 1A 里两栏都给了。

### 1D 「每行能放几个汉字」——含我自己指标失效的完整交代

规则：`clientWidth > 0`、自身文字 ≥4 字、内容盒宽 ÷ 该格汉字宽 ≤2。**原始命中 351 个格**，逐类拆开：

| 类别 | 个数 | 是不是真事故 | 判据 |
| --- | --- | --- | --- |
| 纯拉丁/数字串（0 个汉字） | 302 | **不是，是我指标失效** | 分母「单个汉字宽」用在 `"¥108"` `"21:00"` `"P-03"` `"FAIL 0"` 这类串上没有意义 |
| 含 1–2 个汉字 | 33 | **不是，是我指标失效** | 同上，且这些格 `longestLine === 内容盒宽`，是 shrink-to-fit 盒 |
| 含 ≥3 个汉字，实测只有 1 行 | 16 | **不是，是竖排被我用横排指标量** | 见 §1D-2；`Range.getClientRects()` 只返回 1 个矩形，说明字的排布方向不是横的 |
| 含 ≥3 个汉字，实测折行 ≥2 行 | **0** | — | 这才是「横排中文被挤到每行 ≤2 字」的真事故 |

**结论：全库 351 个原始命中里，真正「每行 ≤2 个汉字」的横排事故是 0 个。** 这条修正把首版 §1D 里 351 个「点名」全部撤销，理由与逐类计数如上。细节见 §5.11。

### 1D-2 竖排文字（`writing-mode: vertical-*`）：换成「每列几个字」

竖排的「一行能放几个字」应该问「一列能放几个字」＝ `盒高 ÷ 该元素单个汉字宽`。全库共 **77** 个竖排文字元素（分布在 S01、S03、S06、S07、S18、S27、S28）。<br>注意：`Range.getClientRects()` 对竖排文本返回的是**竖列矩形**，我的字段名仍叫 `ownLines`。

| 案 | 档 | 元素 | 字号 | 盒 宽×高 | 汉字宽 | 列容量≈ | 矩形数 | longestLine | 文字 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | 1024 | html.is-landing > body > div.sheet > p.col-meter > code#colno | 14.1 | 17×10 | 14 | 0 | 1 | 17 | 3 |
| S01 | 1440 | html.is-landing > body > div.sheet > p.col-meter > code#colno | 14.1 | 17×10 | 14 | 0 | 1 | 17 | 1 |
| S18 | 390 | div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type( | 9 | 9×5 | 9 | 0 | 1 | 11 | 4 |
| S18 | 390 | div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type( | 9 | 9×5 | 9 | 0 | 1 | 11 | 2 |
| S18 | 390 | div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type( | 9 | 9×5 | 9 | 0 | 1 | 11 | 5 |
| S18 | 390 | div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type( | 9 | 9×5 | 9 | 0 | 1 | 11 | 0 |
| S18 | 390 | div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type( | 9 | 9×5 | 9 | 0 | 1 | 11 | 6 |
| S18 | 390 | div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type( | 9 | 9×5 | 9 | 0 | 1 | 11 | 8 |
| S18 | 390 | div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type( | 9 | 9×5 | 9 | 0 | 1 | 11 | 8 |
| S18 | 390 | div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type( | 9 | 9×5 | 9 | 0 | 1 | 11 | 7 |
| S28 | 768 | article#blk-04:nth-of-type(1) > div.slab.slab--onplum > ul.data > li:nth | 13 | 17×24 | 13 | 1 | 1 | 17 | 6px |
| S28 | 1024 | article#blk-04:nth-of-type(1) > div.slab.slab--onplum > ul.data > li:nth | 13 | 17×24 | 13 | 1 | 1 | 17 | 6px |
| S28 | 1440 | article#blk-04:nth-of-type(1) > div.slab.slab--onplum > ul.data > li:nth | 13 | 17×24 | 13 | 1 | 1 | 17 | 6px |
| S03 | 390 | div.chrono > aside.axis > ul.axis-years > li:nth-of-type(1) > samp | 13 | 17×31 | 14 | 2 | 1 | 17 | 1957 |
| S03 | 390 | div.chrono > aside.axis > ul.axis-years > li:nth-of-type(2) > samp | 13 | 17×31 | 14 | 2 | 1 | 17 | 1962 |
| S03 | 390 | div.chrono > aside.axis > ul.axis-years > li:nth-of-type(3) > samp | 13 | 17×31 | 14 | 2 | 1 | 17 | 1967 |
| S03 | 390 | div.chrono > aside.axis > ul.axis-years > li:nth-of-type(4) > samp | 13 | 17×31 | 14 | 2 | 1 | 17 | 1972 |
| S03 | 390 | div.chrono > aside.axis > ul.axis-years > li:nth-of-type(5) > samp | 13 | 17×31 | 14 | 2 | 1 | 17 | 1977 |
| S28 | 768 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S28 | 768 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S28 | 768 | article#blk-04:nth-of-type(1) > div.slab.slab--onplum > ul.data > li:nth | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S28 | 1024 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S28 | 1024 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S28 | 1024 | article#blk-04:nth-of-type(1) > div.slab.slab--onplum > ul.data > li:nth | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S28 | 1440 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S28 | 1440 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S28 | 1440 | article#blk-04:nth-of-type(1) > div.slab.slab--onplum > ul.data > li:nth | 13 | 17×32 | 13 | 2 | 1 | 17 | 24px |
| S18 | 390 | html.js > body > div.promptline:nth-of-type(3) > code > span.ps | 14 | 17×50 | 14 | 3 | 1 | 17 | pump-3 |
| S18 | 768 | html.js > body > div.promptline:nth-of-type(3) > code > span.ps | 14 | 17×50 | 14 | 3 | 1 | 17 | pump-3 |
| S28 | 768 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 25×48 | 13 | 3 | 1 | 17 | BLK-04 |
| S28 | 1024 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 25×48 | 13 | 3 | 1 | 17 | BLK-04 |
| S28 | 1440 | div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) > div.slab | 13 | 25×48 | 13 | 3 | 1 | 17 | BLK-04 |
| S06 | 1440 | section#river:nth-of-type(1) > div.wrap > div.river-row:nth-of-type(1) > | 21 | 25×87 | 21 | 4 | 1 | 27 | 当日特调 |
| S01 | 1024 | html.is-landing > body > div.sheet > p.col-meter | 15 | 26×78 | 15 | 5 | 1 | 21 | 当前栏 |
| S01 | 1440 | html.is-landing > body > div.sheet > p.col-meter | 15 | 26×78 | 15 | 5 | 1 | 21 | 当前栏 |
| S07 | 1440 | body > main > section.spread:nth-of-type(2) > div.folio:nth-of-type(2) > | 16 | 28×80 | 16 | 5 | 1 | 20 | 第 116 页 |
| S07 | 1440 | body > main > section.spread:nth-of-type(2) > div.folio:nth-of-type(2) > | 16 | 28×80 | 16 | 5 | 1 | 20 | 第 117 页 |
| S07 | 1440 | body > main > section.spread:nth-of-type(2) > div.folio:nth-of-type(2) > | 16 | 28×80 | 16 | 5 | 1 | 20 | 第 118 页 |
| S07 | 1440 | body > main > section.spread:nth-of-type(2) > div.folio:nth-of-type(2) > | 16 | 28×80 | 16 | 5 | 1 | 20 | 第 119 页 |
| S07 | 1440 | body > main > section.spread:nth-of-type(2) > div.folio:nth-of-type(2) > | 16 | 28×80 | 16 | 5 | 1 | 20 | 第 120 页 |
| S07 | 1440 | body > main > section.spread:nth-of-type(2) > div.folio:nth-of-type(2) > | 16 | 28×80 | 16 | 5 | 1 | 20 | 第 121 页 |
| S06 | 1440 | section#river:nth-of-type(1) > div.wrap > div.river-row:nth-of-type(1) > | 15 | 29×236 | 15 | 15 | 1 | 23 | 第六十七期 · 昭和五十七年霜月七日 |
| S18 | 390 | html.js > body > div.promptline:nth-of-type(3) > code | 14 | 22×227 | 14 | 16 | 1 | 17 | :~$ /tag pump-3 出口阀 |
| S18 | 768 | html.js > body > div.promptline:nth-of-type(3) > code | 14 | 22×227 | 14 | 16 | 1 | 17 | :~$ /tag pump-3 出口阀 |
| S27 | 1024 | section#dispatch:nth-of-type(1) > div.wrap > article#act-01:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1024 | section#dispatch:nth-of-type(1) > div.wrap > article#act-02:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1024 | section#dispatch:nth-of-type(1) > div.wrap > article#act-03:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1024 | section#dispatch:nth-of-type(1) > div.wrap > article#act-04:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1024 | section#dispatch:nth-of-type(1) > div.wrap > article#act-05:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1024 | section#dispatch:nth-of-type(1) > div.wrap > article#act-06:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1024 | section#dispatch:nth-of-type(1) > div.wrap > article#act-07:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1440 | section#dispatch:nth-of-type(1) > div.wrap > article#act-01:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1440 | section#dispatch:nth-of-type(1) > div.wrap > article#act-02:nth-of-type( | 13 | 24×309 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1440 | section#dispatch:nth-of-type(1) > div.wrap > article#act-03:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1440 | section#dispatch:nth-of-type(1) > div.wrap > article#act-04:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1440 | section#dispatch:nth-of-type(1) > div.wrap > article#act-05:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1440 | section#dispatch:nth-of-type(1) > div.wrap > article#act-06:nth-of-type( | 13 | 24×309 | 13 | 23 | 1 | 17 | 装订边距 |
| S27 | 1440 | section#dispatch:nth-of-type(1) > div.wrap > article#act-07:nth-of-type( | 13 | 24×304 | 13 | 23 | 1 | 17 | 装订边距 |
| S06 | 1440 | section#river:nth-of-type(1) > div.wrap > div.river-row:nth-of-type(1) > | 15 | 29×478 | 15 | 31 | 1 | 23 | 巴西喜拉多｜深焙｜静置六日｜水温 92℃｜粉量  |
| S28 | 768 | div.wrap > div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1) | 22 | 28×802 | 22 | 36 | 1 | 29 | 出血余量 |
| … | 其余 17 个见 `_crit3/out/*.json` 的 `texts[].writingMode` | | | | | | | | |

最紧的三个：S18@390 的 `code.tag__d`（**盒 9×5px，字号 9px**，4 档里只有 390 是竖排）、S28 的 `code`（盒 17×24px「6px」、17×32px「24px」）、S01@1024/1440 的 `code#colno`（盒 17×10px）。我用像素复核了 S18@390 这一个（放大 8 倍裁切 `_crit3/s18-tag.png`，裁切区 `x=24 y=2892 w=60 h=40`）：**9px 的旋转数字实测约 4–5 css px 宽、5 css px 高，字形完整、没有被框切掉** —— 盒 9×5 对竖排里的一个旋转拉丁数字是恰好合适的，**不是缺陷**。

### 1E 出血元素的可达性（rect 超出视口之后，用户还能不能看到）

方法：对每个 rect 超出视口的可见元素，沿祖先链找**第一个 `overflow-x` 不是 `visible` 的容器**，读它的 `clientWidth` / `scrollWidth`。若该容器 `overflow-x` 是 `auto|scroll` 且 `scrollWidth − clientWidth > 1`，判「可滚动到达」；否则判「被裁掉」。屏外无障碍跳转链接（`left: -9999px` 类）与 `|overLeft| > 900px` 的项已剔除。

| 案 | 档 | 超出件数 | 可滚动到达 | 被裁掉 | 无裁剪祖先 | 页 scrollWidth/clientWidth | 最右溢出件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | 390 | 8 | 8 | 0 | 0 | 390/390 | li R525 L-628 287×139 ← ol#fold-list.fold-list(auto 330/1184) |
| S06 | 390 | 12 | 0 | 12 | 0 | 390/390 | span.stain.stain--b R18 L-293 115×115 ← div.river-wrap(clip 390/404) |
| S08 | 390 | 80 | 0 | 80 | 0 | 390/390 | div.plate R155 L-195 350×54 ← div.stage-wrap(clip 350/525) |
| S08 | 768 | 40 | 0 | 40 | 0 | 768/768 | div.plate R323 L-384 707×54 ← div.stage-wrap(clip 707/1060) |
| S11 | 390 | 4 | 4 | 0 | 0 | 390/390 | li R553 L-645 298×40 ← ul(auto 358/3756) |
| S13 | 390 | 1 | 0 | 1 | 1 | 390/390 | div#cursorPress.cursorpress R-387 L3 6×6 |
| S13 | 768 | 1 | 0 | 1 | 1 | 768/768 | div#cursorPress.cursorpress R-765 L3 6×6 |
| S13 | 1024 | 1 | 0 | 1 | 1 | 1024/1024 | div#cursorPress.cursorpress R-1021 L3 6×6 |
| S13 | 1440 | 1 | 0 | 1 | 1 | 1440/1440 | div#cursorPress.cursorpress R-1437 L3 6×6 |
| S14 | 1024 | 1 | 0 | 1 | 0 | 1024/1024 | div#field.field R-2 L2 1024×1360 ← section#deck.deck(clip 1024/1024) |
| S14 | 1440 | 1 | 0 | 1 | 0 | 1440/1440 | div#field.field R-4 L4 1440×1700 ← section#deck.deck(clip 1440/1440) |
| S21 | 390 | 22 | 22 | 0 | 0 | 390/390 | li.lockbar R594 L-869 115×24 ← ol#rail.path__rail(auto 278/1625) |
| S21 | 768 | 6 | 6 | 0 | 0 | 768/768 | li.lockbar R161 L-833 96×24 ← ol#rail.path__rail(auto 656/1359) |
| S23 | 390 | 16 | 16 | 0 | 0 | 390/390 | div.rail__i.rail__i--9 R258 L-608 40×24 ← aside.rail(auto 358/632) |
| S24 | 1024 | 6 | 5 | 1 | 0 | 1024/1024 | li.leaf.leaf--b R172 L-646 550×454 ← ul.leaves(auto 880/2272) |
| S26 | 1024 | 39 | 0 | 39 | 0 | 1024/1024 | i R6 L6 1037×130 ← div.band.band--mast(clip 960/998) |
| S26 | 1440 | 39 | 0 | 39 | 0 | 1440/1440 | i R14 L14 1469×289 ← div.band.band--mast(clip 1360/1414) |
| S28 | 390 | 15 | 0 | 15 | 0 | 390/390 | img R4 L0 394×248 ← div.blk__frame.blk__frame--short(hidden 346/370) |
| S28 | 768 | 10 | 0 | 10 | 0 | 768/768 | img R35 L-419 384×242 ← div.blk__frame.blk__frame--short(hidden 336/360) |
| S28 | 1024 | 5 | 0 | 5 | 0 | 1024/1024 | img R98 L-738 384×242 ← div.blk__frame.blk__frame--short(hidden 336/360) |
| S28 | 1440 | 3 | 0 | 3 | 0 | 1440/1440 | ul.data R-1372 L13 81×810 ← section#wall.wall(clip 1440/1440) |
| S30 | 390 | 2 | 0 | 2 | 0 | 390/390 | span.cut__lower R3808 L94 4293×3247 ← section#cut.cut(clip 390/4198) |
| S30 | 768 | 2 | 0 | 2 | 0 | 768/768 | span.cut__lower R1526 L237 2531×3248 ← section#cut.cut(clip 768/2294) |
| S30 | 1024 | 2 | 0 | 2 | 0 | 1024/1024 | span.cut__lower R1735 L316 3075×3717 ← section#cut.cut(clip 1024/2759) |
| S30 | 1440 | 2 | 0 | 2 | 0 | 1440/1440 | span.cut__lower R1994 L379 3813×3958 ← section#cut.cut(clip 1440/3434) |
| M01 | 390 | 14 | 1 | 13 | 0 | 390/390 | svg R254 L-24 620×155 ← div.chart-scroll(auto 342/620) |

（上表只列有超出元素的点；另外 118 个「案 × 档」**一个超出视口的元素都没有**，未列。）

合计：**144 个「案 × 档」里，有 26 个存在 rect 超出视口且不是屏外跳转链接的元素，共 333 件；其中 62 件可由内部横向滚动容器到达，271 件被非滚动容器裁掉，4 件找不到任何裁剪祖先（说明其溢出不由 box 参与滚动区，例如 `position: fixed` 或被 transform 处理）。** 而所有 144 个点的 `scrollWidth === clientWidth`、`scrollX` 恒为 0 —— 也就是说**页面本身从不横向滚动**。

**被裁掉的超出件里，标签是文字承载标签（p/h1–h4/li/td/th/span/figcaption/a…）且右溢 >20px 的，共 8 件**，其中最严重的 12 件：

| 案 | 档 | 元素 | 右溢px | 宽×高 | 裁剪祖先 | 祖先 overflow-x | 祖先 clientW/scrollW |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S30 | 390 | span.cut__lower | 3808 | 4293×3247 | section#cut.cut | clip | 390/4198 |
| S30 | 1440 | span.cut__lower | 1994 | 3813×3958 | section#cut.cut | clip | 1440/3434 |
| S30 | 1024 | span.cut__lower | 1735 | 3075×3717 | section#cut.cut | clip | 1024/2759 |
| S30 | 768 | span.cut__lower | 1526 | 2531×3248 | section#cut.cut | clip | 768/2294 |
| S30 | 1440 | span.cut__band | 405 | 2249×1455 | section#cut.cut | clip | 1440/3434 |
| S30 | 1024 | span.cut__band | 337 | 1699×894 | section#cut.cut | clip | 1024/2759 |
| S30 | 768 | span.cut__band | 238 | 1244×609 | section#cut.cut | clip | 768/2294 |
| S30 | 390 | span.cut__band | 135 | 660×977 | section#cut.cut | clip | 390/4198 |

## §2 逐条问题

格式：【严重度｜现象｜测量值｜文件与档位与屏号｜置信度】。置信度：**高** = 像素与 DOM 两条独立链路互证；**中** = 只有 DOM 链路或依赖了我的判定规则；**低** = 规则边界上的判定。

| 严重度 | 条数（按「案 × 问题类型」聚合） |
| --- | --- |
| 高 | 44 |
| 中 | 84 |
| 低 | 14 |
| 信息 | 7 |
| **合计** | **149** |

### 2.1 严重度：高（44 条）

**1.【高｜空屏（同底色，整屏高）】M03**
- 测量值：
  - 1024 档 ／ 第 2 屏：第 2/7 屏墨覆盖 2.98%（整屏高 768px）；该屏众数底色 rgb(23,23,26)，整页众数底色 rgb(14,14,16)，色距 10；证据 _crit3/shots/M03/1024-02.png
  - 1440 档 ／ 第 2 屏：第 2/7 屏墨覆盖 2.72%（整屏高 900px）；该屏众数底色 rgb(23,23,26)，整页众数底色 rgb(14,14,16)，色距 10；证据 _crit3/shots/M03/1440-02.png
- 文件：`templates/M03-bold-creator/index.html`｜档位：1024、1440｜屏号：2、2｜置信度：高

**2.【高｜文字 <16px】ROOTINDEX**
- 测量值：
  - 390 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body > header.mast > div.mast-id > p.mast-kicker:nth-of-type(1)（第 1 屏，14 字："网站设计风格方案 · 选型台"）
  - 390 档 ／ 第 1 屏：13.00px × 118 处（正文级）；最小实例 body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，52 字："这一组会把一件事摆到台面上： ，而""）
  - 768 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body > header.mast > div.mast-id > p.mast-kicker:nth-of-type(1)（第 1 屏，14 字："网站设计风格方案 · 选型台"）
  - 768 档 ／ 第 1 屏：13.00px × 118 处（正文级）；最小实例 body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，52 字："这一组会把一件事摆到台面上： ，而""）
  - 1024 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body > header.mast > div.mast-id > p.mast-kicker:nth-of-type(1)（第 1 屏，14 字："网站设计风格方案 · 选型台"）
  - 1024 档 ／ 第 2 屏：13.00px × 118 处（正文级）；最小实例 body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 2 屏，52 字："这一组会把一件事摆到台面上： ，而""）
- 文件：`index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、1、1、1、1、2｜置信度：高

**3.【高｜正文级字号 <15px】ROOTINDEX**
- 测量值：
  - 390 档 ／ 第 1 屏：正文最小实测 13px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，"这一组会把一件事摆到台面上： ，而"中间"）
  - 768 档 ／ 第 1 屏：正文最小实测 13px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，"这一组会把一件事摆到台面上： ，而"中间"）
  - 1024 档 ／ 第 2 屏：正文最小实测 13px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 2 屏，"这一组会把一件事摆到台面上： ，而"中间"）
  - 1440 档 ／ 第 1 屏：正文最小实测 13px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，"这一组会把一件事摆到台面上： ，而"中间"）
- 文件：`index.html`｜档位：390、768、1024、1440｜屏号：1、1、2、1｜置信度：高

**4.【高｜390 档仍多于 2 列】ROOTINDEX**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 4 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 88px｜html > body > header.mast > dl#facts
  - 390 档 ／ 第 1 屏：实测 4 列 × 2 行；容器 clientWidth 358px；子项最小内容盒 51px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > div#flt-
  - 390 档 ／ 第 2 屏：实测 3 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 59px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(3) > div#flt-
  - 390 档 ／ 第 2 屏：实测 3 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 51px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(4) > div#flt-
  - 390 档 ／ 第 2 屏：实测 3 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 25px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(6) > div#flt-
  - 390 档 ／ 第 2 屏：实测 5 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 48px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(9) > div#flt-
- 文件：`index.html`｜档位：390、390、390、390、390、390｜屏号：1、1、2、2、2、2｜置信度：高

**5.【高｜390 档仍多于 2 列】S01**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 3 列 × 2 行；容器 clientWidth 358px；子项最小内容盒 74px｜body > div.sheet > header.masthead > div.masthead-left:nth-of-type(3) > 
  - 390 档 ／ 第 4 屏：实测 4 列 × 1 行；容器 clientWidth 330px；子项最小内容盒 287px｜section#front:nth-of-type(1) > div.columns > article.col.col-4:nth-of-ty
- 文件：`prototypes/S01-red-wedge-broadsheet/index.html`｜档位：390、390｜屏号：1、4｜置信度：高

**6.【高｜390 档仍多于 2 列】S02**
- 测量值：
  - 390 档 ／ 第 6 屏：实测 4 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 72px｜body > main > section.sheet:nth-of-type(3) > div.leak-row > div.leak-fie
  - 390 档 ／ 第 10 屏：实测 3 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 52px｜body > main > section.sheet:nth-of-type(5) > div#slots-view:nth-of-type(
- 文件：`prototypes/S02-gilded-symmetry-salon/index.html`｜档位：390、390｜屏号：6、10｜置信度：高

**7.【高｜正文级字号 <15px】S03**
- 测量值：
  - 390 档 ／ 第 2 屏：正文最小实测 13px｜main > section#records:nth-of-type(1) > div.wrap > figure.plate-open > f（第 2 屏，"1854 年，W. & F. Lange"）
  - 768 档 ／ 第 1 屏：正文最小实测 13px｜main > section#records:nth-of-type(1) > div.wrap > figure.plate-open > f（第 1 屏，"1854 年，W. & F. Lange"）
  - 1024 档 ／ 第 2 屏：正文最小实测 13px｜main > section#records:nth-of-type(1) > div.wrap > figure.plate-open > f（第 2 屏，"1854 年，W. & F. Lange"）
  - 1440 档 ／ 第 2 屏：正文最小实测 13px｜main > section#records:nth-of-type(1) > div.wrap > figure.plate-open > f（第 2 屏，"1854 年，W. & F. Lange"）
- 文件：`prototypes/S03-long-exposure-observatory/index.html`｜档位：390、768、1024、1440｜屏号：2、1、2、2｜置信度：高

**8.【高｜390 档仍多于 2 列】S03**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 4 列 × 1 行；容器 clientWidth 258px；子项最小内容盒 28px｜html.js > body.developed > header.masthead > nav.bar > ul.bar-links
  - 390 档 ／ 第 1 屏：实测 4 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 31px｜html.js > body.developed > header.masthead > div.wrap.hero > dl.plate
- 文件：`prototypes/S03-long-exposure-observatory/index.html`｜档位：390、390｜屏号：1、1｜置信度：高

**9.【高｜390 档仍多于 2 列】S08**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 5 列 × 1 行；容器 clientWidth 280px；子项最小内容盒 32px｜body > header.masthead > div.shell > div.masthead-row > nav
  - 390 档 ／ 第 1 屏：实测 4 列 × 1 行；容器 clientWidth 48px；子项最小内容盒 12px｜div.iso-stage > div#plane > div.plate:nth-of-type(1) > div.plate-face:nt
  - 390 档 ／ 第 1 屏：实测 4 列 × 1 行；容器 clientWidth 48px；子项最小内容盒 12px｜div.iso-stage > div#plane > div.plate:nth-of-type(2) > div.plate-face:nt
  - 390 档 ／ 第 1 屏：实测 4 列 × 1 行；容器 clientWidth 48px；子项最小内容盒 12px｜div.iso-stage > div#plane > div.plate:nth-of-type(3) > div.plate-face:nt
  - 390 档 ／ 第 2 屏：实测 4 列 × 1 行；容器 clientWidth 48px；子项最小内容盒 12px｜div.iso-stage > div#plane > div.plate:nth-of-type(4) > div.plate-face:nt
  - 390 档 ／ 第 2 屏：实测 4 列 × 1 行；容器 clientWidth 48px；子项最小内容盒 12px｜div.iso-stage > div#plane > div.plate:nth-of-type(5) > div.plate-face:nt
- 文件：`prototypes/S08-amber-overprint-lightbox/index.html`｜档位：390、390、390、390、390、390｜屏号：1、1、1、1、2、2｜置信度：高

**10.【高｜空屏（同底色，整屏高）】S08**
- 测量值：
  - 1440 档 ／ 第 6 屏：第 6/9 屏墨覆盖 2.67%（整屏高 900px）；该屏众数底色 rgb(18,12,8)，整页众数底色 rgb(18,12,8)，色距 0；证据 _crit3/shots/S08/1440-06.png
- 文件：`prototypes/S08-amber-overprint-lightbox/index.html`｜档位：1440｜屏号：6｜置信度：高

**11.【高｜390 档仍多于 2 列】S11**
- 测量值：
  - 390 档 ／ 第 2 屏：实测 12 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 298px｜div.sheet > div.page > div.wrap:nth-of-type(3) > nav.chapter-strip > ul
- 文件：`prototypes/S11-samizdat-typewriter/index.html`｜档位：390｜屏号：2｜置信度：高

**12.【高｜390 档仍多于 2 列】S12**
- 测量值：
  - 390 档 ／ 第 4 屏：实测 7 列 × 2 行；容器 clientWidth 342px；子项最小内容盒 17px｜body > div.sheet > main > section.levels:nth-of-type(2) > div.sig-rail.e
- 文件：`prototypes/S12-lime-knockout-wall/index.html`｜档位：390｜屏号：4｜置信度：高

**13.【高｜文字 <16px】S13**
- 测量值：
  - 390 档 ／ 第 1 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 body > header#top > div.letterhead__top > div.letterhead__inner > p.agen（第 1 屏，15 字："市立文书档案馆 · 徵信核验科"）
  - 390 档 ／ 第 2 屏：15.00px × 27 处（非正文级：标签/编号/注释）；最小实例 body > header#top > figure.plate.plate--hero:nth-of-type(1) > figcaption（第 2 屏，13 字："工艺参照一 · 凸版压印件"）
  - 390 档 ／ 第 9 屏：13.00px × 3 处（正文级）；最小实例 section#levels:nth-of-type(1) > table.levels__table > tbody > tr:nth-of-（第 9 屏，74 字："槽带内 55:45 的纸色与背光侧 "）
  - 768 档 ／ 第 1 屏：14.00px × 9 处（非正文级：标签/编号/注释）；最小实例 body > header#top > div.letterhead__top > div.letterhead__inner > p.agen（第 1 屏，15 字："市立文书档案馆 · 徵信核验科"）
  - 768 档 ／ 第 2 屏：15.00px × 27 处（非正文级：标签/编号/注释）；最小实例 body > header#top > figure.plate.plate--hero:nth-of-type(1) > figcaption（第 2 屏，13 字："工艺参照一 · 凸版压印件"）
  - 1024 档 ／ 第 1 屏：14.00px × 9 处（非正文级：标签/编号/注释）；最小实例 body > header#top > div.letterhead__top > div.letterhead__inner > p.agen（第 1 屏，15 字："市立文书档案馆 · 徵信核验科"）
- 文件：`prototypes/S13-blind-debossed-dispatch/index.html`｜档位：390、390、390、768、768、1024｜屏号：1、2、9、1、2、1｜置信度：高

**14.【高｜正文级字号 <15px】S13**
- 测量值：
  - 390 档 ／ 第 9 屏：正文最小实测 13px｜section#levels:nth-of-type(1) > table.levels__table > tbody > tr:nth-of-（第 9 屏，"槽带内 55:45 的纸色与背光侧 #D"）
  - 768 档 ／ 第 3 屏：正文最小实测 14px｜body > main.dossier > article#clauses > section.annex:nth-of-type(8) > p（第 3 屏，"附注：附件原件一律不外借，调阅须由复核科"）
  - 1024 档 ／ 第 4 屏：正文最小实测 14px｜body > main.dossier > article#clauses > section.annex:nth-of-type(8) > p（第 4 屏，"附注：附件原件一律不外借，调阅须由复核科"）
  - 1440 档 ／ 第 4 屏：正文最小实测 14px｜body > main.dossier > article#clauses > section.annex:nth-of-type(8) > p（第 4 屏，"附注：附件原件一律不外借，调阅须由复核科"）
- 文件：`prototypes/S13-blind-debossed-dispatch/index.html`｜档位：390、768、1024、1440｜屏号：9、3、4、4｜置信度：高

**15.【高｜正文级字号 <15px】S14**
- 测量值：
  - 390 档 ／ 第 2 屏：正文最小实测 13px｜html.js > body > header.masthead > figure.masthead__plate.in > figcaptio（第 2 屏，"舱壁参照照片：老式设备控制面板的拨动开关"）
  - 768 档 ／ 第 2 屏：正文最小实测 13px｜html.js > body > header.masthead > figure.masthead__plate.in > figcaptio（第 2 屏，"舱壁参照照片：老式设备控制面板的拨动开关"）
  - 1024 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > header.masthead > figure.masthead__plate.in > figcaptio（第 1 屏，"舱壁参照照片：老式设备控制面板的拨动开关"）
  - 1440 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > header.masthead > figure.masthead__plate.in > figcaptio（第 1 屏，"舱壁参照照片：老式设备控制面板的拨动开关"）
- 文件：`prototypes/S14-zero-g-launch-sequence/index.html`｜档位：390、768、1024、1440｜屏号：2、2、1、1｜置信度：高

**16.【高｜390 档仍多于 2 列】S14**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 4 列 × 1 行；容器 clientWidth 229px；子项最小内容盒 36px｜html.js > body > div.hud.hud--coord > p.hud__line:nth-of-type(2)
  - 390 档 ／ 第 4 屏：实测 3 列 × 1 行；容器 clientWidth 314px；子项最小内容盒 24px｜div#view > div#field > article#a1110:nth-of-type(4) > div.tag__in > p.ta
- 文件：`prototypes/S14-zero-g-launch-sequence/index.html`｜档位：390、390｜屏号：1、4｜置信度：高

**17.【高｜空屏（同底色，整屏高）】S15**
- 测量值：
  - 390 档 ／ 第 3 屏：第 3/19 屏墨覆盖 0.12%（整屏高 844px）；该屏众数底色 rgb(230,234,232)，整页众数底色 rgb(231,235,233)，色距 1；证据 _crit3/shots/S15/390-03.png
  - 768 档 ／ 第 3 屏：第 3/14 屏墨覆盖 0.01%（整屏高 1024px）；该屏众数底色 rgb(230,233,232)，整页众数底色 rgb(231,235,233)，色距 2；证据 _crit3/shots/S15/768-03.png
- 文件：`prototypes/S15-fishery-floor-ledger/index.html`｜档位：390、768｜屏号：3、3｜置信度：高

**18.【高｜正文级字号 <15px】S15**
- 测量值：
  - 390 档 ／ 第 18 屏：正文最小实测 13px｜html.js > body > div.page-wrap:nth-of-type(2) > footer > p.sig（第 18 屏，"方案 15 · 渔场平面簿（Fisher"）
  - 768 档 ／ 第 13 屏：正文最小实测 13px｜html.js > body > div.page-wrap:nth-of-type(2) > footer > p.sig（第 13 屏，"方案 15 · 渔场平面簿（Fisher"）
  - 1024 档 ／ 第 14 屏：正文最小实测 13px｜html.js > body > div.page-wrap:nth-of-type(2) > footer > p.sig（第 14 屏，"方案 15 · 渔场平面簿（Fisher"）
  - 1440 档 ／ 第 10 屏：正文最小实测 13px｜html.js > body > div.page-wrap:nth-of-type(2) > footer > p.sig（第 10 屏，"方案 15 · 渔场平面簿（Fisher"）
- 文件：`prototypes/S15-fishery-floor-ledger/index.html`｜档位：390、768、1024、1440｜屏号：18、13、14、10｜置信度：高

**19.【高｜390 档仍多于 2 列】S15**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 4 列 × 1 行；容器 clientWidth 144px；子项最小内容盒 26px｜html.js > body > div.strip:nth-of-type(1) > p.strip__item:nth-of-type(1)
  - 390 档 ／ 第 1 屏：实测 3 列 × 1 行；容器 clientWidth 156px；子项最小内容盒 30px｜html.js > body > div.strip:nth-of-type(1) > p.strip__item:nth-of-type(2)
  - 390 档 ／ 第 1 屏：实测 3 列 × 1 行；容器 clientWidth 227px；子项最小内容盒 7px｜html.js > body > div.strip:nth-of-type(1) > p.strip__item:nth-of-type(3)
- 文件：`prototypes/S15-fishery-floor-ledger/index.html`｜档位：390、390、390｜屏号：1、1、1｜置信度：高

**20.【高｜正文级字号 <15px】S18**
- 测量值：
  - 390 档 ／ 第 2 屏：正文最小实测 14px｜header#top > div.mast__grid > div.mast__col > figure.plate.plate--lead >（第 2 屏，"值班照：处理车间里那名技师正掀开检修口。"）
  - 768 档 ／ 第 2 屏：正文最小实测 14px｜header#top > div.mast__grid > div.mast__col > figure.plate.plate--lead >（第 2 屏，"值班照：处理车间里那名技师正掀开检修口。"）
  - 1024 档 ／ 第 2 屏：正文最小实测 14px｜header#top > div.mast__grid > div.mast__col > figure.plate.plate--lead >（第 2 屏，"值班照：处理车间里那名技师正掀开检修口。"）
  - 1440 档 ／ 第 2 屏：正文最小实测 14px｜header#top > div.mast__grid > div.mast__col > figure.plate.plate--lead >（第 2 屏，"值班照：处理车间里那名技师正掀开检修口。"）
- 文件：`prototypes/S18-phosphor-service-deck/index.html`｜档位：390、768、1024、1440｜屏号：2、2、2、2｜置信度：高

**21.【高｜文字 <16px】S19**
- 测量值：
  - 390 档 ／ 第 1 屏：13.00px × 26 处（正文级）；最小实例 html.js > body > div.hud > p.hud__line.hud__line--alert:nth-of-type(2)（第 1 屏，33 字："检索号 K-07-113 不在本柜，"）
  - 390 档 ／ 第 1 屏：15.00px × 30 处（正文级）；最小实例 html.js > body > header.mast > div.mast__text > p.mast__en:nth-of-type(1（第 1 屏，58 字："Copperplate Herbar"）
  - 768 档 ／ 第 1 屏：13.00px × 23 处（正文级）；最小实例 html.js > body > div.hud > p.hud__line.hud__line--alert:nth-of-type(2)（第 1 屏，33 字："检索号 K-07-113 不在本柜，"）
  - 768 档 ／ 第 2 屏：15.00px × 31 处（非正文级：标签/编号/注释）；最小实例 ul.row > li#d01:nth-of-type(1) > span.dw__card:nth-of-type(2) > span.dw_（第 2 屏，22 字："1884 · 邱园 3 号温室 · "）
  - 1024 档 ／ 第 1 屏：13.00px × 23 处（正文级）；最小实例 html.js > body > div.hud > p.hud__line.hud__line--alert:nth-of-type(2)（第 1 屏，33 字："检索号 K-07-113 不在本柜，"）
  - 1024 档 ／ 第 2 屏：15.00px × 41 处（非正文级：标签/编号/注释）；最小实例 ul.row > li#d01:nth-of-type(1) > span.dw__card:nth-of-type(2) > span.dw_（第 2 屏，22 字："1884 · 邱园 3 号温室 · "）
- 文件：`prototypes/S19-copperplate-herbarium-cabinet/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、1、1、2、1、2｜置信度：高

**22.【高｜正文级字号 <15px】S19**
- 测量值：
  - 390 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > div.hud > p.hud__line.hud__line--alert:nth-of-type(2)（第 1 屏，"检索号 K-07-113 不在本柜，18"）
  - 768 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > div.hud > p.hud__line.hud__line--alert:nth-of-type(2)（第 1 屏，"检索号 K-07-113 不在本柜，18"）
  - 1024 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > div.hud > p.hud__line.hud__line--alert:nth-of-type(2)（第 1 屏，"检索号 K-07-113 不在本柜，18"）
  - 1440 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > div.hud > p.hud__line.hud__line--alert:nth-of-type(2)（第 1 屏，"检索号 K-07-113 不在本柜，18"）
- 文件：`prototypes/S19-copperplate-herbarium-cabinet/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**23.【高｜390 档仍多于 2 列】S19**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 6 列 × 1 行；容器 clientWidth 273px；子项最小内容盒 8px｜html.js > body > div.hud > p.hud__line:nth-of-type(1)
- 文件：`prototypes/S19-copperplate-herbarium-cabinet/index.html`｜档位：390｜屏号：1｜置信度：高

**24.【高｜正文级字号 <15px】S20**
- 测量值：
  - 390 档 ／ 第 1 屏：正文最小实测 13px｜html > body > header.masthead > div.masthead__col > p#hold-note:nth-of-t（第 1 屏，"按下后图形锁定 3 秒：这 3 秒里滚动"）
  - 768 档 ／ 第 1 屏：正文最小实测 13px｜html > body > header.masthead > div.masthead__col > p#hold-note:nth-of-t（第 1 屏，"按下后图形锁定 3 秒：这 3 秒里滚动"）
  - 1024 档 ／ 第 1 屏：正文最小实测 13px｜html > body > header.masthead > div.masthead__col > p#hold-note:nth-of-t（第 1 屏，"按下后图形锁定 3 秒：这 3 秒里滚动"）
  - 1440 档 ／ 第 1 屏：正文最小实测 13px｜html > body > header.masthead > div.masthead__col > p#hold-note:nth-of-t（第 1 屏，"按下后图形锁定 3 秒：这 3 秒里滚动"）
- 文件：`prototypes/S20-plotter-soundfield/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**25.【高｜390 档仍多于 2 列】S20**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 7 列 × 2 行；容器 clientWidth 358px；子项最小内容盒 26px｜html > body > div.hud > p.hud__line:nth-of-type(1)
  - 390 档 ／ 第 1 屏：实测 8 列 × 1 行；容器 clientWidth 348px；子项最小内容盒 16px｜html > body > div.hud > p.hud__line:nth-of-type(2)
  - 390 档 ／ 第 1 屏：实测 4 列 × 2 行；容器 clientWidth 358px；子项最小内容盒 40px｜html > body > div.hud > p.hud__line:nth-of-type(3)
  - 390 档 ／ 第 3 屏：实测 4 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 32px｜main > section#soundfield:nth-of-type(1) > div.plot:nth-of-type(2) > div
- 文件：`prototypes/S20-plotter-soundfield/index.html`｜档位：390、390、390、390｜屏号：1、1、1、3｜置信度：高

**26.【高｜390 档仍多于 2 列】S21**
- 测量值：
  - 390 档 ／ 第 2 屏：实测 14 列 × 1 行；容器 clientWidth 278px；子项最小内容盒 115px｜main > section#board:nth-of-type(1) > div#board-grid:nth-of-type(2) > di
  - 390 档 ／ 第 12 屏：实测 3 列 × 1 行；容器 clientWidth 278px；子项最小内容盒 64px｜html > body > footer.ledger-foot > dl.foot__meta
- 文件：`prototypes/S21-interlocking-release-book/index.html`｜档位：390、390｜屏号：2、12｜置信度：高

**27.【高｜文字 <16px】S22**
- 测量值：
  - 390 档 ／ 第 1 屏：13.50px × 1 处（正文级）；最小实例 html.js > body > header.masthead > p.status（第 1 屏，49 字："中缝折痕未压实 · 折痕实测 ，触发"）
  - 390 档 ／ 第 1 屏：15.00px × 32 处（正文级）；最小实例 body > header.masthead > div.masthead__grid > div.masthead__col > p.lati（第 1 屏，25 字："Paper-Screen Folde"）
  - 390 档 ／ 第 2 屏：14.00px × 10 处（非正文级：标签/编号/注释）；最小实例 header.masthead > div.masthead__grid > figure.hero.in > figcaption > spa（第 2 屏，21 字："原件未标注作者 · 见来源页 · 原"）
  - 768 档 ／ 第 1 屏：14.00px × 20 处（正文级）；最小实例 html.js > body > header.masthead > p.status（第 1 屏，49 字："中缝折痕未压实 · 折痕实测 ，触发"）
  - 768 档 ／ 第 1 屏：15.00px × 34 处（正文级）；最小实例 body > header.masthead > div.masthead__grid > div.masthead__col > p.lati（第 1 屏，25 字："Paper-Screen Folde"）
  - 1024 档 ／ 第 1 屏：14.00px × 11 处（正文级）；最小实例 html.js > body > header.masthead > p.status（第 1 屏，49 字："中缝折痕未压实 · 折痕实测 ，触发"）
- 文件：`prototypes/S22-paper-screen-folded-sheet/index.html`｜档位：390、390、390、768、768、1024｜屏号：1、1、2、1、1、1｜置信度：高

**28.【高｜正文级字号 <15px】S22**
- 测量值：
  - 390 档 ／ 第 1 屏：正文最小实测 13.5px｜html.js > body > header.masthead > p.status（第 1 屏，"中缝折痕未压实 · 折痕实测 ，触发后加"）
  - 768 档 ／ 第 1 屏：正文最小实测 14px｜html.js > body > header.masthead > p.status（第 1 屏，"中缝折痕未压实 · 折痕实测 ，触发后加"）
  - 1024 档 ／ 第 1 屏：正文最小实测 14px｜html.js > body > header.masthead > p.status（第 1 屏，"中缝折痕未压实 · 折痕实测 ，触发后加"）
  - 1440 档 ／ 第 1 屏：正文最小实测 14px｜html.js > body > header.masthead > p.status（第 1 屏，"中缝折痕未压实 · 折痕实测 ，触发后加"）
- 文件：`prototypes/S22-paper-screen-folded-sheet/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**29.【高｜390 档仍多于 2 列】S22**
- 测量值：
  - 390 档 ／ 第 3 屏：实测 3 列 × 1 行；容器 clientWidth 354px；子项最小内容盒 36px｜html.js > body > main > section#grid:nth-of-type(1) > div.ruler.in:nth-o
  - 390 档 ／ 第 3 屏：实测 6 列 × 1 行；容器 clientWidth 145px；子项最小内容盒 13px｜body > main > section#grid:nth-of-type(1) > div.ruler.in:nth-of-type(2) 
  - 390 档 ／ 第 3 屏：实测 6 列 × 1 行；容器 clientWidth 145px；子项最小内容盒 13px｜body > main > section#grid:nth-of-type(1) > div.ruler.in:nth-of-type(2) 
- 文件：`prototypes/S22-paper-screen-folded-sheet/index.html`｜档位：390、390、390｜屏号：3、3、3｜置信度：高

**30.【高｜文字 <16px】S23**
- 测量值：
  - 390 档 ／ 第 1 屏：13.00px × 35 处（正文级）；最小实例 html.js > body > section.status > p.status__fault:nth-of-type(1)（第 1 屏，33 字："断面读取失败（错误码 ）：第 9 层"）
  - 768 档 ／ 第 1 屏：13.00px × 34 处（正文级）；最小实例 html.js > body > section.status > p.status__fault:nth-of-type(1)（第 1 屏，33 字："断面读取失败（错误码 ）：第 9 层"）
  - 1024 档 ／ 第 1 屏：13.00px × 34 处（正文级）；最小实例 html.js > body > section.status > p.status__fault:nth-of-type(1)（第 1 屏，33 字："断面读取失败（错误码 ）：第 9 层"）
  - 1440 档 ／ 第 1 屏：13.00px × 35 处（正文级）；最小实例 html.js > body > section.status > p.status__fault:nth-of-type(1)（第 1 屏，33 字："断面读取失败（错误码 ）：第 9 层"）
- 文件：`prototypes/S23-exposed-plaster-chronology-wall/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**31.【高｜正文级字号 <15px】S23**
- 测量值：
  - 390 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > section.status > p.status__fault:nth-of-type(1)（第 1 屏，"断面读取失败（错误码 ）：第 9 层剥落"）
  - 768 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > section.status > p.status__fault:nth-of-type(1)（第 1 屏，"断面读取失败（错误码 ）：第 9 层剥落"）
  - 1024 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > section.status > p.status__fault:nth-of-type(1)（第 1 屏，"断面读取失败（错误码 ）：第 9 层剥落"）
  - 1440 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > section.status > p.status__fault:nth-of-type(1)（第 1 屏，"断面读取失败（错误码 ）：第 9 层剥落"）
- 文件：`prototypes/S23-exposed-plaster-chronology-wall/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**32.【高｜390 档仍多于 2 列】S23**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 9 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 40px｜body > main > section#wall:nth-of-type(1) > div.wall:nth-of-type(2) > as
  - 390 档 ／ 第 7 屏：实测 3 列 × 1 行；容器 clientWidth 390px；子项最小内容盒 8px｜body > main > section.sec.wrap:nth-of-type(2) > ul.strata > li:nth-of-ty
  - 390 档 ／ 第 7 屏：实测 3 列 × 1 行；容器 clientWidth 390px；子项最小内容盒 8px｜body > main > section.sec.wrap:nth-of-type(2) > ul.strata > li:nth-of-ty
  - 390 档 ／ 第 7 屏：实测 3 列 × 1 行；容器 clientWidth 390px；子项最小内容盒 8px｜body > main > section.sec.wrap:nth-of-type(2) > ul.strata > li:nth-of-ty
  - 390 档 ／ 第 7 屏：实测 3 列 × 1 行；容器 clientWidth 390px；子项最小内容盒 8px｜body > main > section.sec.wrap:nth-of-type(2) > ul.strata > li:nth-of-ty
  - 390 档 ／ 第 7 屏：实测 3 列 × 1 行；容器 clientWidth 390px；子项最小内容盒 8px｜body > main > section.sec.wrap:nth-of-type(2) > ul.strata > li:nth-of-ty
- 文件：`prototypes/S23-exposed-plaster-chronology-wall/index.html`｜档位：390、390、390、390、390、390｜屏号：1、7、7、7、7、7｜置信度：高

**33.【高｜正文级字号 <15px】S24**
- 测量值：
  - 390 档 ／ 第 2 屏：正文最小实测 14px｜div.deck:nth-of-type(2) > header#top > div.masthead__text > figure.start（第 2 屏，"首屏是这张分叉图的开头：中轴落下去，左右"）
  - 768 档 ／ 第 1 屏：正文最小实测 14px｜div.deck:nth-of-type(2) > header#top > div.masthead__text > figure.start（第 1 屏，"首屏是这张分叉图的开头：中轴落下去，左右"）
  - 1024 档 ／ 第 2 屏：正文最小实测 14px｜div.deck:nth-of-type(2) > header#top > div.masthead__text > figure.start（第 2 屏，"首屏是这张分叉图的开头：中轴落下去，左右"）
  - 1440 档 ／ 第 2 屏：正文最小实测 14px｜div.deck:nth-of-type(2) > header#top > div.masthead__text > figure.start（第 2 屏，"首屏是这张分叉图的开头：中轴落下去，左右"）
- 文件：`prototypes/S24-cyanotype-rainforest-path/index.html`｜档位：390、768、1024、1440｜屏号：2、1、2、2｜置信度：高

**34.【高｜390 档仍多于 2 列】S24**
- 测量值：
  - 390 档 ／ 第 10 屏：实测 6 列 × 1 行；容器 clientWidth 354px；子项最小内容盒 58px｜main > section#ladder:nth-of-type(2) > div.ladder__grid > div:nth-of-typ
  - 390 档 ／ 第 11 屏：实测 3 列 × 2 行；容器 clientWidth 354px；子项最小内容盒 111px｜main > section#ladder:nth-of-type(2) > div.ladder__grid > div:nth-of-typ
- 文件：`prototypes/S24-cyanotype-rainforest-path/index.html`｜档位：390、390｜屏号：10、11｜置信度：高

**35.【高｜文字 <16px】S26**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 28 处（非正文级：标签/编号/注释）；最小实例 header#top > div.mast__head:nth-of-type(1) > div.mast__lead:nth-of-type(（第 1 屏，29 字："对照组固定两条：A 班 ，B 班 ，"）
  - 390 档 ／ 第 5 屏：13.00px × 24 处（正文级）；最小实例 section#p1:nth-of-type(1) > div.two.two--a > div.col.col--side:nth-of-ty（第 5 屏，63 字："铅活字：一色一版，一版一模，套印错位"）
  - 768 档 ／ 第 1 屏：15.00px × 28 处（非正文级：标签/编号/注释）；最小实例 header#top > div.mast__head:nth-of-type(1) > div.mast__lead:nth-of-type(（第 1 屏，29 字："对照组固定两条：A 班 ，B 班 ，"）
  - 768 档 ／ 第 4 屏：13.00px × 24 处（正文级）；最小实例 section#p1:nth-of-type(1) > div.two.two--a > div.col.col--side:nth-of-ty（第 4 屏，63 字："铅活字：一色一版，一版一模，套印错位"）
  - 1024 档 ／ 第 1 屏：15.00px × 28 处（非正文级：标签/编号/注释）；最小实例 header#top > div.mast__head:nth-of-type(1) > div.mast__lead:nth-of-type(（第 1 屏，29 字："对照组固定两条：A 班 ，B 班 ，"）
  - 1024 档 ／ 第 5 屏：13.00px × 24 处（正文级）；最小实例 section#p1:nth-of-type(1) > div.two.two--a > div.col.col--side:nth-of-ty（第 5 屏，63 字："铅活字：一色一版，一版一模，套印错位"）
- 文件：`prototypes/S26-geometric-collision-columns/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、5、1、4、1、5｜置信度：高

**36.【高｜正文级字号 <15px】S26**
- 测量值：
  - 390 档 ／ 第 5 屏：正文最小实测 13px｜section#p1:nth-of-type(1) > div.two.two--a > div.col.col--side:nth-of-ty（第 5 屏，"铅活字：一色一版，一版一模，套印错位在凸"）
  - 768 档 ／ 第 4 屏：正文最小实测 13px｜section#p1:nth-of-type(1) > div.two.two--a > div.col.col--side:nth-of-ty（第 4 屏，"铅活字：一色一版，一版一模，套印错位在凸"）
  - 1024 档 ／ 第 5 屏：正文最小实测 13px｜section#p1:nth-of-type(1) > div.two.two--a > div.col.col--side:nth-of-ty（第 5 屏，"铅活字：一色一版，一版一模，套印错位在凸"）
  - 1440 档 ／ 第 3 屏：正文最小实测 13px｜section#p1:nth-of-type(1) > div.two.two--a > div.col.col--side:nth-of-ty（第 3 屏，"铅活字：一色一版，一版一模，套印错位在凸"）
- 文件：`prototypes/S26-geometric-collision-columns/index.html`｜档位：390、768、1024、1440｜屏号：5、4、5、3｜置信度：高

**37.【高｜正文级字号 <15px】S27**
- 测量值：
  - 390 档 ／ 第 16 屏：正文最小实测 13px｜section.plates-sec:nth-of-type(4) > div.wrap > ul.plates > li.plate.plat（第 16 屏，"宣言单张封面：标题被拆成几块大小不等的字"）
  - 768 档 ／ 第 11 屏：正文最小实测 13px｜section.plates-sec:nth-of-type(4) > div.wrap > ul.plates > li.plate.plat（第 11 屏，"宣言单张封面：标题被拆成几块大小不等的字"）
  - 1024 档 ／ 第 16 屏：正文最小实测 13px｜section.plates-sec:nth-of-type(4) > div.wrap > ul.plates > li.plate.plat（第 16 屏，"宣言单张封面：标题被拆成几块大小不等的字"）
  - 1440 档 ／ 第 10 屏：正文最小实测 13px｜section.plates-sec:nth-of-type(4) > div.wrap > ul.plates > li.plate.plat（第 10 屏，"宣言单张封面：标题被拆成几块大小不等的字"）
- 文件：`prototypes/S27-hand-painted-bill-dispatch/index.html`｜档位：390、768、1024、1440｜屏号：16、11、16、10｜置信度：高

**38.【高｜正文级字号 <15px】S28**
- 测量值：
  - 390 档 ／ 第 2 屏：正文最小实测 13px｜div.wrap > div.head__grid:nth-of-type(2) > div.head__wall:nth-of-type(2)（第 2 屏，"拼贴一 活字盘。字面朝上分格排着，格子被"）
  - 768 档 ／ 第 1 屏：正文最小实测 13px｜div.wrap > div.head__grid:nth-of-type(2) > div.head__wall:nth-of-type(2)（第 1 屏，"拼贴一 活字盘。字面朝上分格排着，格子被"）
  - 1024 档 ／ 第 1 屏：正文最小实测 13px｜div.wrap > div.head__grid:nth-of-type(2) > div.head__wall:nth-of-type(2)（第 1 屏，"拼贴一 活字盘。字面朝上分格排着，格子被"）
  - 1440 档 ／ 第 1 屏：正文最小实测 13px｜div.wrap > div.head__grid:nth-of-type(2) > div.head__wall:nth-of-type(2)（第 1 屏，"拼贴一 活字盘。字面朝上分格排着，格子被"）
- 文件：`prototypes/S28-jazz-intaglio-wall/index.html`｜档位：390、768、1024、1440｜屏号：2、1、1、1｜置信度：高

**39.【高｜文字 <16px】S30**
- 测量值：
  - 390 档 ／ 第 1 屏：13.00px × 22 处（正文级）；最小实例 html.js > body > header.masthead > figure.masthead__plate > figcaption（第 1 屏，34 字："贴纸本体的来处：手动丝印台与晾架，抬"）
  - 768 档 ／ 第 2 屏：13.00px × 22 处（正文级）；最小实例 html.js > body > header.masthead > figure.masthead__plate > figcaption（第 2 屏，34 字："贴纸本体的来处：手动丝印台与晾架，抬"）
  - 1024 档 ／ 第 2 屏：13.00px × 22 处（正文级）；最小实例 html.js > body > header.masthead > figure.masthead__plate > figcaption（第 2 屏，34 字："贴纸本体的来处：手动丝印台与晾架，抬"）
  - 1440 档 ／ 第 1 屏：13.00px × 22 处（正文级）；最小实例 html.js > body > header.masthead > figure.masthead__plate > figcaption（第 1 屏，34 字："贴纸本体的来处：手动丝印台与晾架，抬"）
- 文件：`prototypes/S30-skate-sticker-split/index.html`｜档位：390、768、1024、1440｜屏号：1、2、2、1｜置信度：高

**40.【高｜正文级字号 <15px】S30**
- 测量值：
  - 390 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > header.masthead > figure.masthead__plate > figcaption（第 1 屏，"贴纸本体的来处：手动丝印台与晾架，抬臂轮"）
  - 768 档 ／ 第 2 屏：正文最小实测 13px｜html.js > body > header.masthead > figure.masthead__plate > figcaption（第 2 屏，"贴纸本体的来处：手动丝印台与晾架，抬臂轮"）
  - 1024 档 ／ 第 2 屏：正文最小实测 13px｜html.js > body > header.masthead > figure.masthead__plate > figcaption（第 2 屏，"贴纸本体的来处：手动丝印台与晾架，抬臂轮"）
  - 1440 档 ／ 第 1 屏：正文最小实测 13px｜html.js > body > header.masthead > figure.masthead__plate > figcaption（第 1 屏，"贴纸本体的来处：手动丝印台与晾架，抬臂轮"）
- 文件：`prototypes/S30-skate-sticker-split/index.html`｜档位：390、768、1024、1440｜屏号：1、2、2、1｜置信度：高

**41.【高｜文字 <16px】SELECTOR**
- 测量值：
  - 390 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body > header.mast > div.mast-id > p.mast-kicker:nth-of-type(1)（第 1 屏，14 字："网站设计风格方案 · 选型台"）
  - 390 档 ／ 第 1 屏：13.00px × 118 处（正文级）；最小实例 body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，52 字："这一组会把一件事摆到台面上： ，而""）
  - 768 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body > header.mast > div.mast-id > p.mast-kicker:nth-of-type(1)（第 1 屏，14 字："网站设计风格方案 · 选型台"）
  - 768 档 ／ 第 1 屏：13.00px × 118 处（正文级）；最小实例 body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，52 字："这一组会把一件事摆到台面上： ，而""）
  - 1024 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body > header.mast > div.mast-id > p.mast-kicker:nth-of-type(1)（第 1 屏，14 字："网站设计风格方案 · 选型台"）
  - 1024 档 ／ 第 2 屏：13.00px × 118 处（正文级）；最小实例 body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 2 屏，52 字："这一组会把一件事摆到台面上： ，而""）
- 文件：`prototypes/_selection/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、1、1、1、1、2｜置信度：高

**42.【高｜正文级字号 <15px】SELECTOR**
- 测量值：
  - 390 档 ／ 第 1 屏：正文最小实测 13px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，"这一组会把一件事摆到台面上： ，而"中间"）
  - 768 档 ／ 第 1 屏：正文最小实测 13px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，"这一组会把一件事摆到台面上： ，而"中间"）
  - 1024 档 ／ 第 2 屏：正文最小实测 13px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 2 屏，"这一组会把一件事摆到台面上： ，而"中间"）
  - 1440 档 ／ 第 1 屏：正文最小实测 13px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > p.rail-h（第 1 屏，"这一组会把一件事摆到台面上： ，而"中间"）
- 文件：`prototypes/_selection/index.html`｜档位：390、768、1024、1440｜屏号：1、1、2、1｜置信度：高

**43.【高｜390 档仍多于 2 列】SELECTOR**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 4 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 88px｜html > body > header.mast > dl#facts
  - 390 档 ／ 第 1 屏：实测 4 列 × 2 行；容器 clientWidth 358px；子项最小内容盒 51px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(2) > div#flt-
  - 390 档 ／ 第 2 屏：实测 3 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 59px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(3) > div#flt-
  - 390 档 ／ 第 2 屏：实测 3 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 51px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(4) > div#flt-
  - 390 档 ／ 第 2 屏：实测 3 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 25px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(6) > div#flt-
  - 390 档 ／ 第 2 屏：实测 5 列 × 1 行；容器 clientWidth 358px；子项最小内容盒 48px｜body > div.bench > aside.rail > div.rail-block:nth-of-type(9) > div#flt-
- 文件：`prototypes/_selection/index.html`｜档位：390、390、390、390、390、390｜屏号：1、1、2、2、2、2｜置信度：高

**44.【高｜正文级字号 <15px】WIZARD**
- 测量值：
  - 390 档 ／ 第 1 屏：正文最小实测 14px｜html > body.wz > main#quiz > div.wz-q:nth-of-type(1) > p.wz-hint:nth-of-（第 1 屏，"参照：全站正文从 179 字到 1212"）
  - 768 档 ／ 第 1 屏：正文最小实测 14px｜html > body.wz > main#quiz > div.wz-q:nth-of-type(1) > p.wz-hint:nth-of-（第 1 屏，"参照：全站正文从 179 字到 1212"）
  - 1024 档 ／ 第 1 屏：正文最小实测 14px｜html > body.wz > main#quiz > div.wz-q:nth-of-type(1) > p.wz-hint:nth-of-（第 1 屏，"参照：全站正文从 179 字到 1212"）
  - 1440 档 ／ 第 1 屏：正文最小实测 14px｜html > body.wz > main#quiz > div.wz-q:nth-of-type(1) > p.wz-hint:nth-of-（第 1 屏，"参照：全站正文从 179 字到 1212"）
- 文件：`prototypes/_selection/wizard.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

### 2.2 严重度：中（84 条）

**1.【中｜文字 <16px】M01**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 12 处（正文级）；最小实例 main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c（第 1 屏，35 字："【换成你的：行业标签，例如 企业法律"）
  - 390 档 ／ 第 8 屏：15.50px × 8 处（正文级）；最小实例 body > footer.site-footer > div.wrap.footer-grid:nth-of-type(1) > div.fo（第 8 屏，43 字："【换成你的：一句话公司介绍，和页面顶"）
  - 768 档 ／ 第 1 屏：15.00px × 12 处（正文级）；最小实例 main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c（第 1 屏，35 字："【换成你的：行业标签，例如 企业法律"）
  - 768 档 ／ 第 6 屏：15.50px × 8 处（正文级）；最小实例 body > footer.site-footer > div.wrap.footer-grid:nth-of-type(1) > div.fo（第 6 屏，43 字："【换成你的：一句话公司介绍，和页面顶"）
  - 1024 档 ／ 第 1 屏：15.00px × 12 处（正文级）；最小实例 main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c（第 1 屏，35 字："【换成你的：行业标签，例如 企业法律"）
  - 1024 档 ／ 第 6 屏：15.50px × 8 处（正文级）；最小实例 body > footer.site-footer > div.wrap.footer-grid:nth-of-type(1) > div.fo（第 6 屏，43 字："【换成你的：一句话公司介绍，和页面顶"）
- 文件：`templates/M01-clean-corporate/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、8、1、6、1、6｜置信度：高

**2.【中｜标题超 2 行】M01**
- 测量值：
  - 390 档 ／ 第 1 屏：H1 实测 3 行（内容盒 342px，每行 12 字）｜"【换成你的：主标题，一句话说清你为谁解决什么"｜main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c
  - 768 档 ／ 第 2 屏：H3 实测 3 行（内容盒 164px，每行 8 字）｜"【换成你的：服务名称一，例如 常年法律顾问】"｜section#services:nth-of-type(2) > div.wrap > div.grid.grid-3 > article.c
  - 768 档 ／ 第 2 屏：H3 实测 3 行（内容盒 164px，每行 8 字）｜"【换成你的：服务名称二，例如 品牌与视觉设计"｜section#services:nth-of-type(2) > div.wrap > div.grid.grid-3 > article.c
  - 768 档 ／ 第 2 屏：H3 实测 3 行（内容盒 164px，每行 8 字）｜"【换成你的：服务名称三，例如 系统运维与响应"｜section#services:nth-of-type(2) > div.wrap > div.grid.grid-3 > article.c
  - 1024 档 ／ 第 1 屏：H1 实测 3 行（内容盒 485px，每行 11 字）｜"【换成你的：主标题，一句话说清你为谁解决什么"｜main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c
  - 1440 档 ／ 第 1 屏：H1 实测 3 行（内容盒 547px，每行 12 字）｜"【换成你的：主标题，一句话说清你为谁解决什么"｜main#main > section#top:nth-of-type(1) > div.wrap.hero-grid > div.hero-c
- 文件：`templates/M01-clean-corporate/index.html`｜档位：390、768、768、768、1024、1440｜屏号：1、2、2、2、1、1｜置信度：高

**3.【中｜点击区 <44px】M02**
- 测量值：
  - 390 档 ／ 第 1 屏：15 处；最小 187×21px｜"【换成你的：订位电话】"｜div.book-col:nth-of-type(1) > ul.fact-list > li.fact-row:nth-of-type(1) 
  - 768 档 ／ 第 1 屏：15 处；最小 187×21px｜"【换成你的：订位电话】"｜div.book-col:nth-of-type(1) > ul.fact-list > li.fact-row:nth-of-type(1) 
  - 1024 档 ／ 第 1 屏：13 处；最小 187×21px｜"【换成你的：订位电话】"｜div.book-col:nth-of-type(1) > ul.fact-list > li.fact-row:nth-of-type(1) 
  - 1440 档 ／ 第 1 屏：15 处；最小 187×21px｜"【换成你的：订位电话】"｜div.book-col:nth-of-type(1) > ul.fact-list > li.fact-row:nth-of-type(1) 
- 文件：`templates/M02-warm-local/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**4.【中｜点击区 <44px】M03**
- 测量值：
  - 768 档 ／ 第 1 屏：3 处；最小 34×44px｜"作品"｜body#top > header.site-head > div.wrap.rail > nav#nav-menu > a:nth-of-ty
  - 1024 档 ／ 第 1 屏：3 处；最小 34×44px｜"作品"｜body#top > header.site-head > div.wrap.rail > nav#nav-menu > a:nth-of-ty
  - 1440 档 ／ 第 1 屏：3 处；最小 34×44px｜"作品"｜body#top > header.site-head > div.wrap.rail > nav#nav-menu > a:nth-of-ty
- 文件：`templates/M03-bold-creator/index.html`｜档位：768、1024、1440｜屏号：1、1、1｜置信度：中

**5.【中｜点击区 <44px】ROOTINDEX**
- 测量值：
  - 390 档 ／ 第 1 屏：36 处；最小 26×21px｜"排序"｜div.bench > main.main > div.bar > div.sort > label
  - 768 档 ／ 第 1 屏：36 处；最小 26×21px｜"排序"｜div.bench > main.main > div.bar > div.sort > label
  - 1024 档 ／ 第 1 屏：36 处；最小 26×21px｜"排序"｜div.bench > main.main > div.bar > div.sort > label
  - 1440 档 ／ 第 1 屏：36 处；最小 26×21px｜"排序"｜div.bench > main.main > div.bar > div.sort > label
- 文件：`index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**6.【中｜文字 <16px】S01**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 19 处（正文级）；最小实例 body > div.sheet > header.masthead > div.masthead-right:nth-of-type(4) >（第 1 屏，20 字："Red Wedge Broadshe"）
  - 768 档 ／ 第 1 屏：15.00px × 19 处（正文级）；最小实例 body > div.sheet > header.masthead > div.masthead-right:nth-of-type(4) >（第 1 屏，20 字："Red Wedge Broadshe"）
  - 1024 档 ／ 第 1 屏：15.00px × 18 处（非正文级：标签/编号/注释）；最小实例 section#front:nth-of-type(1) > div.columns > article.col.col-1:nth-of-ty（第 1 屏，14 字："栏 · 本栏 1 240 字"）
  - 1440 档 ／ 第 1 屏：15.00px × 18 处（非正文级：标签/编号/注释）；最小实例 section#front:nth-of-type(1) > div.columns > article.col.col-1:nth-of-ty（第 1 屏，14 字："栏 · 本栏 1 240 字"）
- 文件：`prototypes/S01-red-wedge-broadsheet/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**7.【中｜对比度 <4.5:1】S01**
- 测量值：
  - 390 档 ／ 第 4 屏：2.89:1｜"栏"｜前景 rgb(26,22,20) / 合成底色 rgb(193,18,31)｜15px w400｜阈值 4.5｜div.columns > article.col.col-4:nth-of-type(4) > div#fold-panel:nth-of-t
  - 390 档 ／ 第 4 屏：2.89:1｜"·"｜前景 rgb(26,22,20) / 合成底色 rgb(193,18,31)｜15px w400｜阈值 4.5｜div.columns > article.col.col-4:nth-of-type(4) > div#fold-panel:nth-of-t
  - 768 档 ／ 第 2 屏：2.89:1｜"栏"｜前景 rgb(26,22,20) / 合成底色 rgb(193,18,31)｜15px w400｜阈值 4.5｜div.columns > article.col.col-4:nth-of-type(4) > div#fold-panel:nth-of-t
  - 768 档 ／ 第 2 屏：2.89:1｜"·"｜前景 rgb(26,22,20) / 合成底色 rgb(193,18,31)｜15px w400｜阈值 4.5｜div.columns > article.col.col-4:nth-of-type(4) > div#fold-panel:nth-of-t
  - 1024 档 ／ 第 2 屏：2.89:1｜"栏"｜前景 rgb(26,22,20) / 合成底色 rgb(193,18,31)｜15px w400｜阈值 4.5｜div.columns > article.col.col-4:nth-of-type(4) > div#fold-panel:nth-of-t
  - 1024 档 ／ 第 2 屏：2.89:1｜"·"｜前景 rgb(26,22,20) / 合成底色 rgb(193,18,31)｜15px w400｜阈值 4.5｜div.columns > article.col.col-4:nth-of-type(4) > div#fold-panel:nth-of-t
- 文件：`prototypes/S01-red-wedge-broadsheet/index.html`｜档位：390、390、768、768、1024、1024｜屏号：4、4、2、2、2、2｜置信度：高

**8.【中｜点击区 <44px】S01**
- 测量值：
  - 390 档 ／ 第 1 屏：5 处；最小 224×27px｜"先读上一期那篇没登完的听证会"｜main > section.state-band.is-set:nth-of-type(2) > div.state-inner > div.
  - 768 档 ／ 第 1 屏：5 处；最小 224×28px｜"先读上一期那篇没登完的听证会"｜main > section.state-band.is-set:nth-of-type(2) > div.state-inner > div.
  - 1024 档 ／ 第 1 屏：5 处；最小 224×28px｜"先读上一期那篇没登完的听证会"｜main > section.state-band.is-set:nth-of-type(2) > div.state-inner > div.
  - 1440 档 ／ 第 1 屏：4 处；最小 224×28px｜"先读上一期那篇没登完的听证会"｜main > section.state-band.is-set:nth-of-type(2) > div.state-inner > div.
- 文件：`prototypes/S01-red-wedge-broadsheet/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**9.【中｜文字 <16px】S02**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 25 处（正文级）；最小实例 html > body > header.masthead > p.house:nth-of-type(1)（第 1 屏，33 字："Maison Dorure · 巴黎"）
  - 768 档 ／ 第 1 屏：15.00px × 26 处（正文级）；最小实例 html > body > header.masthead > p.house:nth-of-type(1)（第 1 屏，33 字："Maison Dorure · 巴黎"）
  - 1024 档 ／ 第 1 屏：15.00px × 26 处（正文级）；最小实例 html > body > header.masthead > p.house:nth-of-type(1)（第 1 屏，33 字："Maison Dorure · 巴黎"）
  - 1440 档 ／ 第 1 屏：15.00px × 26 处（正文级）；最小实例 html > body > header.masthead > p.house:nth-of-type(1)（第 1 屏，33 字："Maison Dorure · 巴黎"）
- 文件：`prototypes/S02-gilded-symmetry-salon/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**10.【中｜点击区 <44px】S02**
- 测量值：
  - 390 档 ／ 第 1 屏：2 处；最小 64×29.6px｜"量体地点"｜body > main > section.sheet:nth-of-type(5) > div.house-picker:nth-of-typ
  - 768 档 ／ 第 1 屏：2 处；最小 64×29.6px｜"量体地点"｜body > main > section.sheet:nth-of-type(5) > div.house-picker:nth-of-typ
  - 1024 档 ／ 第 1 屏：2 处；最小 64×29.6px｜"量体地点"｜body > main > section.sheet:nth-of-type(5) > div.house-picker:nth-of-typ
  - 1440 档 ／ 第 1 屏：2 处；最小 64×29.6px｜"量体地点"｜body > main > section.sheet:nth-of-type(5) > div.house-picker:nth-of-typ
- 文件：`prototypes/S02-gilded-symmetry-salon/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**11.【中｜390 档表格列数 ≥5】S02**
- 测量值：
  - 390 档 ／ 第 3 屏：表列数 6；容器 clientWidth 350px｜body > main > section#ledger:nth-of-type(2) > div.table-wrap > table.led
- 文件：`prototypes/S02-gilded-symmetry-salon/index.html`｜档位：390｜屏号：3｜置信度：高

**12.【中｜点击区 <44px】S03**
- 测量值：
  - 390 档 ／ 第 1 屏：4 处；最小 56×18px｜"观测记录"｜header.masthead > nav.bar > ul.bar-links > li:nth-of-type(1) > a
  - 768 档 ／ 第 1 屏：4 处；最小 56×18px｜"观测记录"｜header.masthead > nav.bar > ul.bar-links > li:nth-of-type(1) > a
  - 1024 档 ／ 第 1 屏：4 处；最小 56×18px｜"观测记录"｜header.masthead > nav.bar > ul.bar-links > li:nth-of-type(1) > a
  - 1440 档 ／ 第 1 屏：4 处；最小 56×18px｜"观测记录"｜header.masthead > nav.bar > ul.bar-links > li:nth-of-type(1) > a
- 文件：`prototypes/S03-long-exposure-observatory/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**13.【中｜390 档表格列数 ≥5】S03**
- 测量值：
  - 390 档 ／ 第 2 屏：表列数 5；容器 clientWidth 322px｜section#records:nth-of-type(1) > div.wrap > div.chrono > div.readouts:nt
- 文件：`prototypes/S03-long-exposure-observatory/index.html`｜档位：390｜屏号：2｜置信度：高

**14.【中｜点击区 <44px】S05**
- 测量值：
  - 390 档 ／ 第 1 屏：3 处；最小 48.5×19.2px｜"探头编号"｜div.console-shell > div.console-grid > article.panel.panel--probe:nth-of
  - 768 档 ／ 第 1 屏：2 处；最小 48.5×19.2px｜"探头编号"｜div.console-shell > div.console-grid > article.panel.panel--probe:nth-of
  - 1024 档 ／ 第 1 屏：2 处；最小 48.5×19.2px｜"探头编号"｜div.console-shell > div.console-grid > article.panel.panel--probe:nth-of
  - 1440 档 ／ 第 1 屏：2 处；最小 48.5×19.2px｜"探头编号"｜div.console-shell > div.console-grid > article.panel.panel--probe:nth-of
- 文件：`prototypes/S05-pixel-cold-storage-console/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**15.【中｜390 档仍多于 2 列】S05**
- 测量值：
  - 390 档 ／ 第 4 屏：实测 3 列 × 1 行；容器 clientWidth 314px；子项最小内容盒 60px｜section.console.section:nth-of-type(2) > div.console-shell > div.console
- 文件：`prototypes/S05-pixel-cold-storage-console/index.html`｜档位：390｜屏号：4｜置信度：高

**16.【中｜点击区 <44px】S06**
- 测量值：
  - 390 档 ／ 第 1 屏：1 处；最小 64×30.4px｜"翻到期号"｜main > section#river:nth-of-type(1) > div.wrap > div.issue-bar:nth-of-ty
  - 768 档 ／ 第 1 屏：1 处；最小 64×30.4px｜"翻到期号"｜main > section#river:nth-of-type(1) > div.wrap > div.issue-bar:nth-of-ty
  - 1024 档 ／ 第 1 屏：1 处；最小 64×30.4px｜"翻到期号"｜main > section#river:nth-of-type(1) > div.wrap > div.issue-bar:nth-of-ty
  - 1440 档 ／ 第 1 屏：1 处；最小 64×30.4px｜"翻到期号"｜main > section#river:nth-of-type(1) > div.wrap > div.issue-bar:nth-of-ty
- 文件：`prototypes/S06-showa-kissaten-ledger/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**17.【中｜390 档表格列数 ≥5】S06**
- 测量值：
  - 390 档 ／ 第 11 屏：表列数 6；容器 clientWidth 358px｜div.sheet > main > section.brew-section:nth-of-type(5) > div.wrap > tabl
- 文件：`prototypes/S06-showa-kissaten-ledger/index.html`｜档位：390｜屏号：11｜置信度：高

**18.【中｜点击区 <44px】S07**
- 测量值：
  - 390 档 ／ 第 1 屏：5 处；最小 350×28px｜"铅灰油墨目录"｜html > body > header.bar > a.wordmark:nth-of-type(1)
  - 768 档 ／ 第 1 屏：5 处；最小 728×28px｜"铅灰油墨目录"｜html > body > header.bar > a.wordmark:nth-of-type(1)
  - 1024 档 ／ 第 1 屏：5 处；最小 146.8×28px｜"铅灰油墨目录"｜html > body > header.bar > a.wordmark:nth-of-type(1)
  - 1440 档 ／ 第 1 屏：5 处；最小 146.8×28px｜"铅灰油墨目录"｜html > body > header.bar > a.wordmark:nth-of-type(1)
- 文件：`prototypes/S07-slate-ink-contents/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**19.【中｜390 档仍多于 2 列】S07**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 3 列 × 1 行；容器 clientWidth 350px；子项最小内容盒 32px｜html > body > header.bar > nav.bar-nav
  - 390 档 ／ 第 2 屏：实测 3 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 14px｜div.pages:nth-of-type(1) > div.page.page-recto:nth-of-type(1) > ol#toc-l
  - 390 档 ／ 第 2 屏：实测 3 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 14px｜div.pages:nth-of-type(1) > div.page.page-recto:nth-of-type(1) > ol#toc-l
  - 390 档 ／ 第 2 屏：实测 3 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 14px｜div.pages:nth-of-type(1) > div.page.page-recto:nth-of-type(1) > ol#toc-l
  - 390 档 ／ 第 2 屏：实测 3 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 14px｜div.pages:nth-of-type(1) > div.page.page-recto:nth-of-type(1) > ol#toc-l
  - 390 档 ／ 第 3 屏：实测 3 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 14px｜div.pages:nth-of-type(1) > div.page.page-recto:nth-of-type(1) > ol#toc-l
- 文件：`prototypes/S07-slate-ink-contents/index.html`｜档位：390、390、390、390、390、390｜屏号：1、2、2、2、2、3｜置信度：高

**20.【中｜文字 <16px】S08**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 1 处（正文级）；最小实例 body > header.masthead > div.shell > div.masthead-row > p.wordmark（第 1 屏，24 字："AMBER OVERPRINT LI"）
  - 390 档 ／ 第 3 屏：14.00px × 1 处（非正文级：标签/编号/注释）；最小实例 div.shell > div.spec-grid > div > p:nth-of-type(2) > button#offset-btn（第 3 屏，16 字："看 1.2mm 套印错位的对比图"）
  - 768 档 ／ 第 1 屏：15.00px × 1 处（正文级）；最小实例 body > header.masthead > div.shell > div.masthead-row > p.wordmark（第 1 屏，24 字："AMBER OVERPRINT LI"）
  - 768 档 ／ 第 2 屏：14.00px × 1 处（非正文级：标签/编号/注释）；最小实例 div.shell > div.spec-grid > div > p:nth-of-type(2) > button#offset-btn（第 2 屏，16 字："看 1.2mm 套印错位的对比图"）
  - 1024 档 ／ 第 1 屏：15.00px × 1 处（正文级）；最小实例 body > header.masthead > div.shell > div.masthead-row > p.wordmark（第 1 屏，24 字："AMBER OVERPRINT LI"）
  - 1024 档 ／ 第 3 屏：14.00px × 1 处（非正文级：标签/编号/注释）；最小实例 div.shell > div.spec-grid > div > p:nth-of-type(2) > button#offset-btn（第 3 屏，16 字："看 1.2mm 套印错位的对比图"）
- 文件：`prototypes/S08-amber-overprint-lightbox/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、3、1、2、1、3｜置信度：高

**21.【中｜点击区 <44px】S08**
- 测量值：
  - 390 档 ／ 第 1 屏：10 处；最小 32×28.8px｜"叠层"｜header.masthead > div.shell > div.masthead-row > nav > a:nth-of-type(1)
  - 768 档 ／ 第 1 屏：10 处；最小 32×28.8px｜"叠层"｜header.masthead > div.shell > div.masthead-row > nav > a:nth-of-type(1)
  - 1024 档 ／ 第 1 屏：10 处；最小 32×28.8px｜"叠层"｜header.masthead > div.shell > div.masthead-row > nav > a:nth-of-type(1)
  - 1440 档 ／ 第 1 屏：10 处；最小 32×28.8px｜"叠层"｜header.masthead > div.shell > div.masthead-row > nav > a:nth-of-type(1)
- 文件：`prototypes/S08-amber-overprint-lightbox/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**22.【中｜390 档表格列数 ≥5】S08**
- 测量值：
  - 390 档 ／ 第 5 屏：表列数 5；容器 clientWidth 286px｜main > section#spec:nth-of-type(3) > div.shell > div.panel > table.pp
- 文件：`prototypes/S08-amber-overprint-lightbox/index.html`｜档位：390｜屏号：5｜置信度：高

**23.【中｜点击区 <44px】S09**
- 测量值：
  - 390 档 ／ 第 1 屏：2 处；最小 171×40px｜"修鞋与换跟"｜div.stage > div.board > section#prices:nth-of-type(1) > div.cat-row:nth-
  - 768 档 ／ 第 1 屏：2 处；最小 112×40px｜"修鞋与换跟"｜div.stage > div.board > section#prices:nth-of-type(1) > div.cat-row:nth-
  - 1024 档 ／ 第 1 屏：2 处；最小 112×40px｜"修鞋与换跟"｜div.stage > div.board > section#prices:nth-of-type(1) > div.cat-row:nth-
  - 1440 档 ／ 第 1 屏：2 处；最小 112×40px｜"修鞋与换跟"｜div.stage > div.board > section#prices:nth-of-type(1) > div.cat-row:nth-
- 文件：`prototypes/S09-batik-price-board/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**24.【中｜文字 <16px】S10**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 63 处（正文级）；最小实例 body > div#sheet:nth-of-type(1) > header.masthead > div.masthead-top:nth（第 1 屏，45 字："GVS-10 · 平印打样稿 · 第"）
  - 768 档 ／ 第 1 屏：15.00px × 63 处（正文级）；最小实例 body > div#sheet:nth-of-type(1) > header.masthead > div.masthead-top:nth（第 1 屏，45 字："GVS-10 · 平印打样稿 · 第"）
  - 1024 档 ／ 第 1 屏：15.00px × 63 处（正文级）；最小实例 body > div#sheet:nth-of-type(1) > header.masthead > div.masthead-top:nth（第 1 屏，45 字："GVS-10 · 平印打样稿 · 第"）
  - 1440 档 ／ 第 1 屏：15.00px × 63 处（正文级）；最小实例 body > div#sheet:nth-of-type(1) > header.masthead > div.masthead-top:nth（第 1 屏，45 字："GVS-10 · 平印打样稿 · 第"）
- 文件：`prototypes/S10-grid-versus-sheet/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**25.【中｜点击区 <44px】S10**
- 测量值：
  - 390 档 ／ 第 1 屏：3 处；最小 103×34px｜"按到货周期"｜div#sheet:nth-of-type(1) > main > section#compare:nth-of-type(1) > div.g
  - 768 档 ／ 第 1 屏：3 处；最小 103×34px｜"按到货周期"｜div#sheet:nth-of-type(1) > main > section#compare:nth-of-type(1) > div.g
  - 1024 档 ／ 第 1 屏：3 处；最小 103×34px｜"按到货周期"｜div#sheet:nth-of-type(1) > main > section#compare:nth-of-type(1) > div.g
  - 1440 档 ／ 第 1 屏：3 处；最小 103×34px｜"按到货周期"｜div#sheet:nth-of-type(1) > main > section#compare:nth-of-type(1) > div.g
- 文件：`prototypes/S10-grid-versus-sheet/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**26.【中｜390 档仍多于 2 列】S10**
- 测量值：
  - 390 档 ／ 第 2 屏：实测 3 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 45px｜body > div#sheet:nth-of-type(1) > main > section#compare:nth-of-type(1) 
- 文件：`prototypes/S10-grid-versus-sheet/index.html`｜档位：390｜屏号：2｜置信度：高

**27.【中｜390 档表格列数 ≥5】S10**
- 测量值：
  - 390 档 ／ 第 2 屏：表列数 5；容器 clientWidth 350px｜div#sheet:nth-of-type(1) > main > section#compare:nth-of-type(1) > div.t
- 文件：`prototypes/S10-grid-versus-sheet/index.html`｜档位：390｜屏号：2｜置信度：高

**28.【中｜宽屏仍是单列网格】S10**
- 测量值：
  - 1440 档 ／ 第 5 屏：trackCount=1，实际列数 1，container clientWidth 1328px，4 个子项｜body > div#sheet:nth-of-type(1) > main > section.motion:nth-of-type(3) >
- 文件：`prototypes/S10-grid-versus-sheet/index.html`｜档位：1440｜屏号：5｜置信度：高

**29.【中｜文字 <16px】S11**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 30 处（正文级）；最小实例 div.page > div.wrap:nth-of-type(3) > header.doc-head > div.cover:nth-of-（第 1 屏，40 字："复写检修手册 · 第七联 · 全册十"）
  - 768 档 ／ 第 1 屏：15.00px × 30 处（正文级）；最小实例 div.page > div.wrap:nth-of-type(3) > header.doc-head > div.cover:nth-of-（第 1 屏，40 字："复写检修手册 · 第七联 · 全册十"）
  - 1024 档 ／ 第 1 屏：15.00px × 30 处（正文级）；最小实例 div.page > div.wrap:nth-of-type(3) > header.doc-head > div.cover:nth-of-（第 1 屏，40 字："复写检修手册 · 第七联 · 全册十"）
  - 1440 档 ／ 第 1 屏：15.00px × 30 处（正文级）；最小实例 div.page > div.wrap:nth-of-type(3) > header.doc-head > div.cover:nth-of-（第 1 屏，40 字："复写检修手册 · 第七联 · 全册十"）
- 文件：`prototypes/S11-samizdat-typewriter/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**30.【中｜对比度 <4.5:1】S11**
- 测量值：
  - 390 档 ／ 第 1 屏：4.15:1｜"色带在同一个字位被击打三次，纸背的字"｜前景 rgb(105,103,95) / 合成底色 rgb(220,221,210)｜18px w400｜阈值 4.5｜div.wrap:nth-of-type(3) > header.doc-head > div#carbon-proof:nth-of-type
  - 768 档 ／ 第 1 屏：4.15:1｜"色带在同一个字位被击打三次，纸背的字"｜前景 rgb(105,103,95) / 合成底色 rgb(220,221,210)｜20px w400｜阈值 4.5｜div.wrap:nth-of-type(3) > header.doc-head > div#carbon-proof:nth-of-type
  - 1024 档 ／ 第 1 屏：4.15:1｜"色带在同一个字位被击打三次，纸背的字"｜前景 rgb(105,103,95) / 合成底色 rgb(220,221,210)｜20px w400｜阈值 4.5｜div.wrap:nth-of-type(3) > header.doc-head > div#carbon-proof:nth-of-type
  - 1440 档 ／ 第 1 屏：4.15:1｜"色带在同一个字位被击打三次，纸背的字"｜前景 rgb(105,103,95) / 合成底色 rgb(220,221,210)｜20px w400｜阈值 4.5｜div.wrap:nth-of-type(3) > header.doc-head > div#carbon-proof:nth-of-type
- 文件：`prototypes/S11-samizdat-typewriter/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**31.【中｜点击区 <44px】S11**
- 测量值：
  - 390 档 ／ 第 1 屏：13 处；最小 139.5×19px｜"assets/CREDITS.md"｜footer > div.foot-grid > div:nth-of-type(3) > p > a.credits-link
  - 768 档 ／ 第 1 屏：13 处；最小 139.5×19px｜"assets/CREDITS.md"｜footer > div.foot-grid > div:nth-of-type(3) > p > a.credits-link
  - 1024 档 ／ 第 1 屏：13 处；最小 139.5×19px｜"assets/CREDITS.md"｜footer > div.foot-grid > div:nth-of-type(3) > p > a.credits-link
  - 1440 档 ／ 第 1 屏：13 处；最小 139.5×19px｜"assets/CREDITS.md"｜footer > div.foot-grid > div:nth-of-type(3) > p > a.credits-link
- 文件：`prototypes/S11-samizdat-typewriter/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**32.【中｜文字 <16px】S12**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 11 处（正文级）；最小实例 body > div.sheet > header.plate-head > div.plate-rail:nth-of-type(1) > p（第 1 屏，72 字："冲切样板 A 版 · 8 栏栅格 ·"）
  - 390 档 ／ 第 5 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 ul.plates > li.plate.enter:nth-of-type(1) > figure > figcaption > span.r（第 5 屏，38 字："Sailko · CC BY 3.0"）
  - 768 档 ／ 第 1 屏：15.00px × 11 处（正文级）；最小实例 body > div.sheet > header.plate-head > div.plate-rail:nth-of-type(1) > p（第 1 屏，72 字："冲切样板 A 版 · 8 栏栅格 ·"）
  - 768 档 ／ 第 3 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 ul.plates > li.plate.enter:nth-of-type(1) > figure > figcaption > span.r（第 3 屏，38 字："Sailko · CC BY 3.0"）
  - 1024 档 ／ 第 1 屏：15.00px × 11 处（正文级）；最小实例 body > div.sheet > header.plate-head > div.plate-rail:nth-of-type(1) > p（第 1 屏，72 字："冲切样板 A 版 · 8 栏栅格 ·"）
  - 1024 档 ／ 第 4 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 ul.plates > li.plate.enter:nth-of-type(1) > figure > figcaption > span.r（第 4 屏，38 字："Sailko · CC BY 3.0"）
- 文件：`prototypes/S12-lime-knockout-wall/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、5、1、3、1、4｜置信度：高

**33.【中｜对比度 <4.5:1】S12**
- 测量值：
  - 390 档 ／ 第 3 屏：3.91:1｜"错误码 MASK-05"｜前景 rgb(226,62,87) / 合成底色 rgb(24,34,38)｜17px w600｜阈值 4.5｜main > section#wall:nth-of-type(1) > div.wall-log:nth-of-type(2) > p.log
  - 768 档 ／ 第 2 屏：3.91:1｜"错误码 MASK-05"｜前景 rgb(226,62,87) / 合成底色 rgb(24,34,38)｜17px w600｜阈值 4.5｜main > section#wall:nth-of-type(1) > div.wall-log:nth-of-type(2) > p.log
  - 1024 档 ／ 第 3 屏：3.91:1｜"错误码 MASK-05"｜前景 rgb(226,62,87) / 合成底色 rgb(24,34,38)｜17px w600｜阈值 4.5｜main > section#wall:nth-of-type(1) > div.wall-log:nth-of-type(2) > p.log
  - 1440 档 ／ 第 2 屏：3.91:1｜"错误码 MASK-05"｜前景 rgb(226,62,87) / 合成底色 rgb(24,34,38)｜17px w600｜阈值 4.5｜main > section#wall:nth-of-type(1) > div.wall-log:nth-of-type(2) > p.log
- 文件：`prototypes/S12-lime-knockout-wall/index.html`｜档位：390、768、1024、1440｜屏号：3、2、3、2｜置信度：高

**34.【中｜390 档表格列数 ≥5】S12**
- 测量值：
  - 390 档 ／ 第 3 屏：表列数 7；容器 clientWidth 342px｜body > div.sheet > main > section.levels:nth-of-type(2) > table
- 文件：`prototypes/S12-lime-knockout-wall/index.html`｜档位：390｜屏号：3｜置信度：高

**35.【中｜宽屏仍是单列网格】S12**
- 测量值：
  - 1440 档 ／ 第 2 屏：trackCount=1，实际列数 1，container clientWidth 1328px，5 个子项｜body > div.sheet > main > section#wall:nth-of-type(1) > div.wall-log:nth
- 文件：`prototypes/S12-lime-knockout-wall/index.html`｜档位：1440｜屏号：2｜置信度：高

**36.【中｜点击区 <44px】S13**
- 测量值：
  - 390 档 ／ 第 1 屏：2 处；最小 13×13px｜"auto"｜main.dossier > aside#signature > fieldset.pressmode > label.pressmode__o
  - 768 档 ／ 第 1 屏：2 处；最小 13×13px｜"auto"｜main.dossier > aside#signature > fieldset.pressmode > label.pressmode__o
  - 1024 档 ／ 第 1 屏：2 处；最小 13×13px｜"auto"｜main.dossier > aside#signature > fieldset.pressmode > label.pressmode__o
  - 1440 档 ／ 第 1 屏：2 处；最小 13×13px｜"auto"｜main.dossier > aside#signature > fieldset.pressmode > label.pressmode__o
- 文件：`prototypes/S13-blind-debossed-dispatch/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**37.【中｜390 档仍多于 2 列】S13**
- 测量值：
  - 390 档 ／ 第 2 屏：实测 3 列 × 1 行；容器 clientWidth 342px；子项最小内容盒 42px｜body > main.dossier > article#clauses > section.clause.is-pressed:nth-of
  - 390 档 ／ 第 3 屏：实测 3 列 × 1 行；容器 clientWidth 342px；子项最小内容盒 42px｜body > main.dossier > article#clauses > section.clause.is-pressed:nth-of
  - 390 档 ／ 第 3 屏：实测 3 列 × 1 行；容器 clientWidth 342px；子项最小内容盒 42px｜body > main.dossier > article#clauses > section.clause.is-pressed:nth-of
  - 390 档 ／ 第 4 屏：实测 3 列 × 1 行；容器 clientWidth 342px；子项最小内容盒 42px｜body > main.dossier > article#clauses > section.clause.is-pressed:nth-of
  - 390 档 ／ 第 8 屏：实测 3 列 × 1 行；容器 clientWidth 342px；子项最小内容盒 56px｜body > main.dossier > aside#signature > ol.signchain > li.signchain__row
  - 390 档 ／ 第 8 屏：实测 3 列 × 1 行；容器 clientWidth 342px；子项最小内容盒 42px｜body > main.dossier > aside#signature > ol.signchain > li.signchain__row
- 文件：`prototypes/S13-blind-debossed-dispatch/index.html`｜档位：390、390、390、390、390、390｜屏号：2、3、3、4、8、8｜置信度：高

**38.【中｜390 档表格列数 ≥5】S13**
- 测量值：
  - 390 档 ／ 第 4 屏：表列数 5；容器 clientWidth 342px｜body > main.dossier > article#clauses > section.annex:nth-of-type(8) > t
  - 390 档 ／ 第 9 屏：表列数 5；容器 clientWidth 342px｜html > body > main.dossier > section#levels:nth-of-type(1) > table.level
- 文件：`prototypes/S13-blind-debossed-dispatch/index.html`｜档位：390、390｜屏号：4、9｜置信度：高

**39.【中｜点击区 <44px】S14**
- 测量值：
  - 390 档 ／ 第 1 屏：9 处；最小 137.3×19px｜"Wikimedia Commons"｜header.masthead > figure.masthead__plate.in > figcaption > span.ref > a
  - 768 档 ／ 第 1 屏：9 处；最小 137.3×19px｜"Wikimedia Commons"｜header.masthead > figure.masthead__plate.in > figcaption > span.ref > a
  - 1024 档 ／ 第 1 屏：9 处；最小 137.3×19px｜"Wikimedia Commons"｜header.masthead > figure.masthead__plate.in > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：9 处；最小 137.3×19px｜"Wikimedia Commons"｜header.masthead > figure.masthead__plate.in > figcaption > span.ref > a
- 文件：`prototypes/S14-zero-g-launch-sequence/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**40.【中｜390 档表格列数 ≥5】S14**
- 测量值：
  - 390 档 ／ 第 11 屏：表列数 7；容器 clientWidth 342px｜html.js > body > main > section#stations:nth-of-type(4) > table.stations
- 文件：`prototypes/S14-zero-g-launch-sequence/index.html`｜档位：390｜屏号：11｜置信度：高

**41.【中｜宽屏仍是单列网格】S14**
- 测量值：
  - 1440 档 ／ 第 7 屏：trackCount=1，实际列数 1，container clientWidth 1296px，4 个子项｜html.js > body > main > section.paths-sec:nth-of-type(5) > ol.paths
- 文件：`prototypes/S14-zero-g-launch-sequence/index.html`｜档位：1440｜屏号：7｜置信度：高

**42.【中｜点击区 <44px】S15**
- 测量值：
  - 390 档 ／ 第 1 屏：12 处；最小 137.3×19px｜"Wikimedia Commons"｜li.pl.pl--a:nth-of-type(1) > figure > figcaption > span.ref > a
  - 768 档 ／ 第 1 屏：10 处；最小 137.3×19px｜"Wikimedia Commons"｜li.pl.pl--a:nth-of-type(1) > figure > figcaption > span.ref > a
  - 1024 档 ／ 第 1 屏：10 处；最小 137.3×19px｜"Wikimedia Commons"｜header.masthead > figure.mount > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：10 处；最小 137.3×19px｜"Wikimedia Commons"｜header.masthead > figure.mount > figcaption > span.ref > a
- 文件：`prototypes/S15-fishery-floor-ledger/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**43.【中｜390 档表格列数 ≥5】S15**
- 测量值：
  - 390 档 ／ 第 8 屏：表列数 7；容器 clientWidth 342px｜body > div.page-wrap:nth-of-type(2) > main > section#zones:nth-of-type(4
- 文件：`prototypes/S15-fishery-floor-ledger/index.html`｜档位：390｜屏号：8｜置信度：高

**44.【中｜点击区 <44px】S16**
- 测量值：
  - 390 档 ／ 第 1 屏：10 处；最小 25.3×13.3px｜"01"｜main#track > section.slab.is-pressed:nth-of-type(1) > div.slab-in > h2#b
  - 768 档 ／ 第 1 屏：10 处；最小 25.3×13.3px｜"01"｜main#track > section.slab.is-pressed:nth-of-type(1) > div.slab-in > h2#b
  - 1024 档 ／ 第 1 屏：10 处；最小 25.3×13.3px｜"01"｜main#track > section.slab.is-pressed:nth-of-type(1) > div.slab-in > h2#b
  - 1440 档 ／ 第 1 屏：10 处；最小 25.3×13.3px｜"01"｜main#track > section.slab.is-pressed:nth-of-type(1) > div.slab-in > h2#b
- 文件：`prototypes/S16-velocity-slant-manifesto/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**45.【中｜文字 <16px】S17**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 8 处（正文级）；最小实例 html > body > header.sheet-head > ul.doc-meta > li:nth-of-type(1)（第 1 屏，24 字："1911 年 3 月 1 日至 3 "）
  - 390 档 ／ 第 6 屏：14.00px × 1 处（非正文级：标签/编号/注释）；最小实例 main > section:nth-of-type(1) > div.sheet:nth-of-type(2) > aside.stub-ce（第 6 屏，14 字："导出前按存根联编号连号校验。"）
  - 768 档 ／ 第 1 屏：15.00px × 8 处（正文级）；最小实例 html > body > header.sheet-head > ul.doc-meta > li:nth-of-type(1)（第 1 屏，24 字："1911 年 3 月 1 日至 3 "）
  - 768 档 ／ 第 5 屏：14.00px × 1 处（非正文级：标签/编号/注释）；最小实例 main > section:nth-of-type(1) > div.sheet:nth-of-type(2) > aside.stub-ce（第 5 屏，14 字："导出前按存根联编号连号校验。"）
  - 1024 档 ／ 第 1 屏：15.00px × 8 处（正文级）；最小实例 html > body > header.sheet-head > ul.doc-meta > li:nth-of-type(1)（第 1 屏，24 字："1911 年 3 月 1 日至 3 "）
  - 1024 档 ／ 第 2 屏：14.00px × 1 处（非正文级：标签/编号/注释）；最小实例 main > section:nth-of-type(1) > div.sheet:nth-of-type(2) > aside.stub-ce（第 2 屏，14 字："导出前按存根联编号连号校验。"）
- 文件：`prototypes/S17-revenue-stamp-stub/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、6、1、5、1、2｜置信度：高

**46.【中｜点击区 <44px】S17**
- 测量值：
  - 390 档 ／ 第 1 屏：1 处；最小 32×25.6px｜"账期"｜body > main > section:nth-of-type(1) > div.toolbar:nth-of-type(1) > labe
  - 768 档 ／ 第 1 屏：1 处；最小 32×25.6px｜"账期"｜body > main > section:nth-of-type(1) > div.toolbar:nth-of-type(1) > labe
  - 1024 档 ／ 第 1 屏：1 处；最小 32×25.6px｜"账期"｜body > main > section:nth-of-type(1) > div.toolbar:nth-of-type(1) > labe
  - 1440 档 ／ 第 1 屏：1 处；最小 32×25.6px｜"账期"｜body > main > section:nth-of-type(1) > div.toolbar:nth-of-type(1) > labe
- 文件：`prototypes/S17-revenue-stamp-stub/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**47.【中｜390 档表格列数 ≥5】S17**
- 测量值：
  - 390 档 ／ 第 1 屏：表列数 5；容器 clientWidth 334px｜main > section:nth-of-type(1) > div.sheet:nth-of-type(2) > div.main-cell
- 文件：`prototypes/S17-revenue-stamp-stub/index.html`｜档位：390｜屏号：1｜置信度：高

**48.【中｜宽屏仍是单列网格】S17**
- 测量值：
  - 1440 档 ／ 第 1 屏：trackCount=1，实际列数 1，container clientWidth 1440px，5 个子项｜html > body > header.sheet-head
- 文件：`prototypes/S17-revenue-stamp-stub/index.html`｜档位：1440｜屏号：1｜置信度：高

**49.【中｜对比度 <4.5:1】S18**
- 测量值：
  - 390 档 ／ 第 4 屏：3.21:1｜"4"｜前景 rgb(151,147,128) / 合成底色 rgb(72,66,53)｜9px w400｜阈值 4.5｜div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type(
  - 390 档 ／ 第 4 屏：3.21:1｜"2"｜前景 rgb(151,147,128) / 合成底色 rgb(72,66,53)｜9px w400｜阈值 4.5｜div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type(
  - 390 档 ／ 第 4 屏：3.21:1｜"5"｜前景 rgb(151,147,128) / 合成底色 rgb(72,66,53)｜9px w400｜阈值 4.5｜div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type(
  - 390 档 ／ 第 4 屏：3.21:1｜"0"｜前景 rgb(151,147,128) / 合成底色 rgb(72,66,53)｜9px w400｜阈值 4.5｜div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type(
  - 390 档 ／ 第 4 屏：3.36:1｜"6"｜前景 rgb(200,196,174) / 合成底色 rgb(110,99,80)｜9px w400｜阈值 4.5｜div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type(
  - 390 档 ／ 第 4 屏：3.36:1｜"8"｜前景 rgb(200,196,174) / 合成底色 rgb(110,99,80)｜9px w400｜阈值 4.5｜div.stream__grid:nth-of-type(2) > aside.hangrail > div.hang:nth-of-type(
- 文件：`prototypes/S18-phosphor-service-deck/index.html`｜档位：390、390、390、390、390、390｜屏号：4、4、4、4、4、4｜置信度：高

**50.【中｜点击区 <44px】S18**
- 测量值：
  - 390 档 ／ 第 1 屏：6 处；最小 42.5×20px｜"原件页"｜footer.foot > div.foot__in > ul.src:nth-of-type(1) > li:nth-of-type(1) >
  - 768 档 ／ 第 1 屏：6 处；最小 42.5×20px｜"原件页"｜footer.foot > div.foot__in > ul.src:nth-of-type(1) > li:nth-of-type(1) >
  - 1024 档 ／ 第 1 屏：6 处；最小 42.5×20px｜"原件页"｜footer.foot > div.foot__in > ul.src:nth-of-type(1) > li:nth-of-type(1) >
  - 1440 档 ／ 第 1 屏：6 处；最小 42.5×20px｜"原件页"｜footer.foot > div.foot__in > ul.src:nth-of-type(1) > li:nth-of-type(1) >
- 文件：`prototypes/S18-phosphor-service-deck/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**51.【中｜点击区 <44px】S19**
- 测量值：
  - 390 档 ／ 第 1 屏：10 处；最小 137.3×19px｜"Wikimedia Commons"｜header.mast > figure.mast__plate > figcaption > span.ref > a
  - 768 档 ／ 第 1 屏：11 处；最小 137.3×19px｜"Wikimedia Commons"｜header.mast > figure.mast__plate > figcaption > span.ref > a
  - 1024 档 ／ 第 1 屏：10 处；最小 124.7×19px｜"assets/CREDITS.md"｜li.plate:nth-of-type(1) > figure > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：11 处；最小 137.3×19px｜"Wikimedia Commons"｜header.mast > figure.mast__plate > figcaption > span.ref > a
- 文件：`prototypes/S19-copperplate-herbarium-cabinet/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**52.【中｜390 档表格列数 ≥5】S19**
- 测量值：
  - 390 档 ／ 第 16 屏：表列数 5；容器 clientWidth 342px｜html.js > body > main > section#cross:nth-of-type(5) > table.xr
- 文件：`prototypes/S19-copperplate-herbarium-cabinet/index.html`｜档位：390｜屏号：16｜置信度：高

**53.【中｜宽屏仍是单列网格】S19**
- 测量值：
  - 1440 档 ／ 第 2 屏：trackCount=1，实际列数 1，container clientWidth 1440px，5 个子项｜html.js > body > main > section#cabinet:nth-of-type(1) > div.rows:nth-of
  - 1440 档 ／ 第 10 屏：trackCount=1，实际列数 1，container clientWidth 1296px，4 个子项｜html.js > body > main > section#paths:nth-of-type(6) > ul.paths
- 文件：`prototypes/S19-copperplate-herbarium-cabinet/index.html`｜档位：1440、1440｜屏号：2、10｜置信度：高

**54.【中｜点击区 <44px】S20**
- 测量值：
  - 390 档 ／ 第 1 屏：3 处；最小 170×24px｜"220"｜section.bp-sec:nth-of-type(6) > div#sliders > div.sliders__rows > label.
  - 768 档 ／ 第 1 屏：3 处；最小 532×24px｜"220"｜section.bp-sec:nth-of-type(6) > div#sliders > div.sliders__rows > label.
- 文件：`prototypes/S20-plotter-soundfield/index.html`｜档位：390、768｜屏号：1、1｜置信度：中

**55.【中｜390 档表格列数 ≥5】S20**
- 测量值：
  - 390 档 ／ 第 13 屏：表列数 6；容器 clientWidth 358px｜html > body > main > section.maps-sec:nth-of-type(5) > table.maps
  - 390 档 ／ 第 14 屏：表列数 7；容器 clientWidth 358px｜html > body > main > section.bp-sec:nth-of-type(6) > table.bp
- 文件：`prototypes/S20-plotter-soundfield/index.html`｜档位：390、390｜屏号：13、14｜置信度：高

**56.【中｜宽屏仍是单列网格】S20**
- 测量值：
  - 1440 档 ／ 第 5 屏：trackCount=1，实际列数 1，container clientWidth 1296px，5 个子项｜html > body > main > section.keys:nth-of-type(3) > ul.keys__list
- 文件：`prototypes/S20-plotter-soundfield/index.html`｜档位：1440｜屏号：5｜置信度：高

**57.【中｜对比度 <4.5:1】S21**
- 测量值：
  - 390 档 ／ 第 11 屏：2.02:1｜"6"｜前景 rgb(228,220,201) / 合成底色 rgb(162,155,141)｜13px w400｜阈值 4.5｜main > section.states:nth-of-type(4) > ul.states__grid > li.state:nth-of
  - 768 档 ／ 第 5 屏：2.02:1｜"6"｜前景 rgb(228,220,201) / 合成底色 rgb(162,155,141)｜13px w400｜阈值 4.5｜main > section.states:nth-of-type(4) > ul.states__grid > li.state:nth-of
  - 1024 档 ／ 第 5 屏：2.02:1｜"6"｜前景 rgb(228,220,201) / 合成底色 rgb(162,155,141)｜13px w400｜阈值 4.5｜main > section.states:nth-of-type(4) > ul.states__grid > li.state:nth-of
  - 1440 档 ／ 第 4 屏：2.02:1｜"6"｜前景 rgb(228,220,201) / 合成底色 rgb(162,155,141)｜13px w400｜阈值 4.5｜main > section.states:nth-of-type(4) > ul.states__grid > li.state:nth-of
- 文件：`prototypes/S21-interlocking-release-book/index.html`｜档位：390、768、1024、1440｜屏号：11、5、5、4｜置信度：高

**58.【中｜点击区 <44px】S21**
- 测量值：
  - 390 档 ／ 第 1 屏：19 处；最小 16×16px｜"a"｜main > section#board:nth-of-type(1) > fieldset#slots > label.slot:nth-of
  - 768 档 ／ 第 1 屏：19 处；最小 16×16px｜"a"｜main > section#board:nth-of-type(1) > fieldset#slots > label.slot:nth-of
  - 1024 档 ／ 第 1 屏：19 处；最小 16×16px｜"a"｜main > section#board:nth-of-type(1) > fieldset#slots > label.slot:nth-of
  - 1440 档 ／ 第 1 屏：19 处；最小 16×16px｜"a"｜main > section#board:nth-of-type(1) > fieldset#slots > label.slot:nth-of
- 文件：`prototypes/S21-interlocking-release-book/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**59.【中｜对比度 <4.5:1】S22**
- 测量值：
  - 390 档 ／ 第 7 屏：4.32:1｜"页码索引 · 六页都在折过的这一张纸"｜前景 rgb(86,91,73) / 合成底色 rgb(205,203,195)｜15px w400｜阈值 4.5｜body > main > section#fold:nth-of-type(2) > div.band.band--index:nth-of-
  - 390 档 ／ 第 14 屏：4.32:1｜"动效时序 · 一次翻折从头到尾的六个"｜前景 rgb(86,91,73) / 合成底色 rgb(205,203,195)｜15px w400｜阈值 4.5｜body > main > section#motion:nth-of-type(6) > div.timeline.in:nth-of-typ
  - 390 档 ／ 第 17 屏：4.32:1｜"折痕与页码 · 本页全部冻结值"｜前景 rgb(86,91,73) / 合成底色 rgb(205,203,195)｜15px w400｜阈值 4.5｜html.js > body > footer > div.band.band--index:nth-of-type(1) > p.band__
  - 768 档 ／ 第 5 屏：4.32:1｜"页码索引 · 六页都在折过的这一张纸"｜前景 rgb(86,91,73) / 合成底色 rgb(205,203,195)｜15px w400｜阈值 4.5｜body > main > section#fold:nth-of-type(2) > div.band.band--index:nth-of-
  - 768 档 ／ 第 10 屏：4.32:1｜"动效时序 · 一次翻折从头到尾的六个"｜前景 rgb(86,91,73) / 合成底色 rgb(205,203,195)｜15px w400｜阈值 4.5｜body > main > section#motion:nth-of-type(6) > div.timeline.in:nth-of-typ
  - 768 档 ／ 第 11 屏：4.32:1｜"折痕与页码 · 本页全部冻结值"｜前景 rgb(86,91,73) / 合成底色 rgb(205,203,195)｜15px w400｜阈值 4.5｜html.js > body > footer > div.band.band--index:nth-of-type(1) > p.band__
- 文件：`prototypes/S22-paper-screen-folded-sheet/index.html`｜档位：390、390、390、768、768、768｜屏号：7、14、17、5、10、11｜置信度：高

**60.【中｜点击区 <44px】S22**
- 测量值：
  - 390 档 ／ 第 1 屏：8 处；最小 79×14px｜"CREDITS.md"｜div.masthead__grid > figure.hero.in > figcaption > span.ref > a
  - 768 档 ／ 第 1 屏：8 处；最小 79×14px｜"CREDITS.md"｜div.masthead__grid > figure.hero.in > figcaption > span.ref > a
  - 1024 档 ／ 第 1 屏：8 处；最小 79×14px｜"CREDITS.md"｜div.masthead__grid > figure.hero.in > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：8 处；最小 79×14px｜"CREDITS.md"｜div.masthead__grid > figure.hero.in > figcaption > span.ref > a
- 文件：`prototypes/S22-paper-screen-folded-sheet/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**61.【中｜390 档表格列数 ≥5】S22**
- 测量值：
  - 390 档 ／ 第 6 屏：表列数 5；容器 clientWidth 354px｜main > section#fold:nth-of-type(2) > div#sheet:nth-of-type(2) > article.
- 文件：`prototypes/S22-paper-screen-folded-sheet/index.html`｜档位：390｜屏号：6｜置信度：高

**62.【中｜点击区 <44px】S23**
- 测量值：
  - 390 档 ／ 第 1 屏：1 处；最小 183×19px｜"Wikimedia Commons "｜header.masthead > figure.masthead__plate.in > figcaption > span.ref > a
  - 768 档 ／ 第 1 屏：1 处；最小 183×19px｜"Wikimedia Commons "｜header.masthead > figure.masthead__plate.in > figcaption > span.ref > a
  - 1024 档 ／ 第 1 屏：1 处；最小 183×19px｜"Wikimedia Commons "｜header.masthead > figure.masthead__plate.in > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：1 处；最小 183×19px｜"Wikimedia Commons "｜header.masthead > figure.masthead__plate.in > figcaption > span.ref > a
- 文件：`prototypes/S23-exposed-plaster-chronology-wall/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**63.【中｜390 档表格列数 ≥5】S23**
- 测量值：
  - 390 档 ／ 第 8 屏：表列数 5；容器 clientWidth 390px｜html.js > body > main > section.sec.wrap:nth-of-type(2) > table.chrono.i
- 文件：`prototypes/S23-exposed-plaster-chronology-wall/index.html`｜档位：390｜屏号：8｜置信度：高

**64.【中｜标题超 2 行】S23**
- 测量值：
  - 1440 档 ／ 第 4 屏：H3 实测 3 行（内容盒 73px，每行 3 字）｜"1939 氧化铁黑"｜main > section#wall:nth-of-type(1) > div.wall:nth-of-type(2) > article#f
- 文件：`prototypes/S23-exposed-plaster-chronology-wall/index.html`｜档位：1440｜屏号：4｜置信度：高

**65.【中｜点击区 <44px】S24**
- 测量值：
  - 390 档 ／ 第 1 屏：11 处；最小 137.1×18px｜"Wikimedia Commons"｜header#top > figure.masthead__sheet.pluck > figcaption > span.ref > a
  - 768 档 ／ 第 1 屏：9 处；最小 86.5×18px｜"NASA 图像库"｜article.br.br--w:nth-of-type(2) > figure.pluck > figcaption > span.ref >
  - 1024 档 ／ 第 1 屏：11 处；最小 137.1×18px｜"Wikimedia Commons"｜header#top > figure.masthead__sheet.pluck > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：11 处；最小 86.5×18px｜"NASA 图像库"｜article.br.br--n:nth-of-type(2) > figure.pluck > figcaption > span.ref >
- 文件：`prototypes/S24-cyanotype-rainforest-path/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**66.【中｜对比度 <4.5:1】S25**
- 测量值：
  - 390 档 ／ 第 10 屏：4.29:1｜"第 4 期已售完"｜前景 rgb(107,98,90) / 合成底色 rgb(223,218,210)｜16px w400｜阈值 4.5｜div.sheet > main#main > section.order:nth-of-type(4) > form.order__form 
  - 768 档 ／ 第 8 屏：4.29:1｜"第 4 期已售完"｜前景 rgb(107,98,90) / 合成底色 rgb(223,218,210)｜16px w400｜阈值 4.5｜div.sheet > main#main > section.order:nth-of-type(4) > form.order__form 
  - 1024 档 ／ 第 9 屏：4.29:1｜"第 4 期已售完"｜前景 rgb(107,98,90) / 合成底色 rgb(223,218,210)｜16px w400｜阈值 4.5｜div.sheet > main#main > section.order:nth-of-type(4) > form.order__form 
  - 1440 档 ／ 第 7 屏：4.29:1｜"第 4 期已售完"｜前景 rgb(107,98,90) / 合成底色 rgb(223,218,210)｜16px w400｜阈值 4.5｜div.sheet > main#main > section.order:nth-of-type(4) > form.order__form 
- 文件：`prototypes/S25-spotcolor-contents-zine/index.html`｜档位：390、768、1024、1440｜屏号：10、8、9、7｜置信度：高

**67.【中｜点击区 <44px】S25**
- 测量值：
  - 390 档 ／ 第 1 屏：9 处；最小 33×30.4px｜"邮箱"｜div.sheet > main#main > section.order:nth-of-type(4) > form.order__form 
  - 768 档 ／ 第 1 屏：9 处；最小 33×30.4px｜"邮箱"｜div.sheet > main#main > section.order:nth-of-type(4) > form.order__form 
  - 1024 档 ／ 第 1 屏：9 处；最小 33×30.4px｜"邮箱"｜div.sheet > main#main > section.order:nth-of-type(4) > form.order__form 
  - 1440 档 ／ 第 1 屏：9 处；最小 33×30.4px｜"邮箱"｜div.sheet > main#main > section.order:nth-of-type(4) > form.order__form 
- 文件：`prototypes/S25-spotcolor-contents-zine/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**68.【中｜390 档仍多于 2 列】S25**
- 测量值：
  - 390 档 ／ 第 5 屏：实测 3 列 × 2 行；容器 clientWidth 340px；子项最小内容盒 19px｜main#main > section#contents:nth-of-type(2) > div.index:nth-of-type(2) >
- 文件：`prototypes/S25-spotcolor-contents-zine/index.html`｜档位：390｜屏号：5｜置信度：高

**69.【中｜对比度 <4.5:1】S26**
- 测量值：
  - 390 档 ／ 第 17 屏：4.29:1｜"这个区间还没有采样。接上 2 号电表"｜前景 rgb(72,82,112) / 合成底色 rgb(195,193,185)｜17px w400｜阈值 4.5｜section#p7:nth-of-type(7) > div.two.two--g:nth-of-type(2) > div.col.col-
  - 768 档 ／ 第 14 屏：4.29:1｜"这个区间还没有采样。接上 2 号电表"｜前景 rgb(72,82,112) / 合成底色 rgb(195,193,185)｜17px w400｜阈值 4.5｜section#p7:nth-of-type(7) > div.two.two--g:nth-of-type(2) > div.col.col-
  - 1024 档 ／ 第 19 屏：4.29:1｜"这个区间还没有采样。接上 2 号电表"｜前景 rgb(72,82,112) / 合成底色 rgb(195,193,185)｜17px w400｜阈值 4.5｜section#p7:nth-of-type(7) > div.two.two--g:nth-of-type(2) > div.col.col-
  - 1440 档 ／ 第 11 屏：4.29:1｜"这个区间还没有采样。接上 2 号电表"｜前景 rgb(72,82,112) / 合成底色 rgb(195,193,185)｜17px w400｜阈值 4.5｜section#p7:nth-of-type(7) > div.two.two--g:nth-of-type(2) > div.col.col-
- 文件：`prototypes/S26-geometric-collision-columns/index.html`｜档位：390、768、1024、1440｜屏号：17、14、19、11｜置信度：高

**70.【中｜点击区 <44px】S26**
- 测量值：
  - 390 档 ／ 第 1 屏：20 处；最小 131.9×19px｜"Wikimedia Commons"｜div.col.col--side:nth-of-type(2) > figure.fig.fold > figcaption > span.r
  - 768 档 ／ 第 1 屏：20 处；最小 131.9×19px｜"Wikimedia Commons"｜div.col.col--side:nth-of-type(2) > figure.fig.fold > figcaption > span.r
  - 1024 档 ／ 第 1 屏：17 处；最小 131.9×19px｜"Wikimedia Commons"｜div.col.col--side:nth-of-type(2) > figure.fig.fold > figcaption > span.r
  - 1440 档 ／ 第 1 屏：20 处；最小 131.9×19px｜"Wikimedia Commons"｜div.col.col--side:nth-of-type(2) > figure.fig.fold > figcaption > span.r
- 文件：`prototypes/S26-geometric-collision-columns/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**71.【中｜390 档仍多于 2 列】S26**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 3 列 × 3 行；容器 clientWidth 350px；子项最小内容盒 59px｜body > div.sheet > div.topbar > nav.idx > ol.idx__list
  - 390 档 ／ 第 6 屏：实测 3 列 × 2 行；容器 clientWidth 350px；子项最小内容盒 72px｜div.sheet > main > section#p2:nth-of-type(2) > div.band.band--r2:nth-of-
- 文件：`prototypes/S26-geometric-collision-columns/index.html`｜档位：390、390｜屏号：1、6｜置信度：高

**72.【中｜390 档表格列数 ≥5】S26**
- 测量值：
  - 390 档 ／ 第 3 屏：表列数 5；容器 clientWidth 350px｜main > section#p1:nth-of-type(1) > div.two.two--a > div.col.col--wide:nt
  - 390 档 ／ 第 9 屏：表列数 5；容器 clientWidth 350px｜main > section#p4:nth-of-type(4) > div.two.two--d > div.col.col--wide:nt
- 文件：`prototypes/S26-geometric-collision-columns/index.html`｜档位：390、390｜屏号：3、9｜置信度：高

**73.【中｜点击区 <44px】S27**
- 测量值：
  - 390 档 ／ 第 1 屏：13 处；最小 196.8×17px｜"原件页（Wikimedia Comm"｜ul.plates > li.plate.plate--f:nth-of-type(6) > figcaption > span.ref > a
  - 768 档 ／ 第 1 屏：14 处；最小 196.8×17px｜"原件页（Wikimedia Comm"｜ul.plates > li.plate.plate--a:nth-of-type(1) > figcaption > span.ref > a
  - 1024 档 ／ 第 1 屏：13 处；最小 196.8×17px｜"原件页（Wikimedia Comm"｜ul.plates > li.plate.plate--a:nth-of-type(1) > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：14 处；最小 196.8×17px｜"原件页（Wikimedia Comm"｜ul.plates > li.plate.plate--a:nth-of-type(1) > figcaption > span.ref > a
- 文件：`prototypes/S27-hand-painted-bill-dispatch/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**74.【中｜点击区 <44px】S28**
- 测量值：
  - 390 档 ／ 第 1 屏：19 处；最小 16.6×114.2px｜"盘标编号"｜div.wrap > div.status__grid > div.status__main > p.emptylab:nth-of-type(
  - 768 档 ／ 第 1 屏：18 处；最小 198.5×23px｜"BLK-01 凹版重压 错位 7px"｜div.wrap > nav.idx > ul > li:nth-of-type(1) > a
  - 1024 档 ／ 第 1 屏：18 处；最小 198.5×23px｜"BLK-01 凹版重压 错位 7px"｜div.wrap > nav.idx > ul > li:nth-of-type(1) > a
  - 1440 档 ／ 第 1 屏：18 处；最小 216.4×19px｜"原件页（Wikimedia Comm"｜li.plate.plate--p1:nth-of-type(1) > figure > figcaption > span.ref > a
- 文件：`prototypes/S28-jazz-intaglio-wall/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**75.【中｜390 档仍多于 2 列】S28**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 3 列 × 1 行；容器 clientWidth 116px；子项最小内容盒 8px｜body > header#top > div.wrap > div.bar:nth-of-type(1) > p.bar__i:nth-of-
  - 390 档 ／ 第 6 屏：实测 3 列 × 1 行；容器 clientWidth 354px；子项最小内容盒 60px｜div.wrap > div.row.row--1:nth-of-type(2) > article#blk-03:nth-of-type(3)
  - 390 档 ／ 第 6 屏：实测 3 列 × 1 行；容器 clientWidth 306px；子项最小内容盒 48px｜div.wrap > div.row.row--2:nth-of-type(3) > article#blk-04:nth-of-type(1)
  - 390 档 ／ 第 7 屏：实测 3 列 × 1 行；容器 clientWidth 344px；子项最小内容盒 20px｜div.wrap > div.row.row--2:nth-of-type(3) > article#blk-05:nth-of-type(2)
  - 390 档 ／ 第 7 屏：实测 3 列 × 1 行；容器 clientWidth 303px；子项最小内容盒 20px｜div.wrap > div.row.row--2:nth-of-type(3) > article#blk-06:nth-of-type(3)
  - 390 档 ／ 第 9 屏：实测 3 列 × 1 行；容器 clientWidth 353px；子项最小内容盒 68px｜div.wrap > div.row.row--3:nth-of-type(4) > article#blk-07:nth-of-type(1)
- 文件：`prototypes/S28-jazz-intaglio-wall/index.html`｜档位：390、390、390、390、390、390｜屏号：1、6、6、7、7、9｜置信度：高

**76.【中｜390 档表格列数 ≥5】S28**
- 测量值：
  - 390 档 ／ 第 13 屏：表列数 5；容器 clientWidth 118px｜section.press:nth-of-type(2) > div.wrap > div.press__grid > aside.press_
  - 390 档 ／ 第 22 屏：表列数 5；容器 clientWidth 118px｜section.status:nth-of-type(3) > div.wrap > div.status__grid > div.status
- 文件：`prototypes/S28-jazz-intaglio-wall/index.html`｜档位：390、390｜屏号：13、22｜置信度：高

**77.【中｜点击区 <44px】S29**
- 测量值：
  - 390 档 ／ 第 1 屏：36 处；最小 32.5×22px｜"零件 16 油视镜，跳到零件表第 1"｜main > section#ch3:nth-of-type(3) > figure.pump__fig.in > svg.diag > g.p
  - 768 档 ／ 第 1 屏：15 处；最小 161.5×24px｜"Wikimedia Commons"｜header#top > figure.fig.fig--cover > figcaption > span.ref > a
  - 1024 档 ／ 第 1 屏：13 处；最小 161.5×24px｜"Wikimedia Commons"｜header#top > figure.fig.fig--cover > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：13 处；最小 161.5×24px｜"Wikimedia Commons"｜header#top > figure.fig.fig--cover > figcaption > span.ref > a
- 文件：`prototypes/S29-wire-bound-safety-manual/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**78.【中｜390 档表格列数 ≥5】S29**
- 测量值：
  - 390 档 ／ 第 10 屏：表列数 5；容器 clientWidth 310px｜div.deck:nth-of-type(4) > main > section#ch3:nth-of-type(3) > div.partli
- 文件：`prototypes/S29-wire-bound-safety-manual/index.html`｜档位：390｜屏号：10｜置信度：高

**79.【中｜点击区 <44px】S30**
- 测量值：
  - 390 档 ／ 第 1 屏：5 处；最小 122.4×13px｜"Wikimedia Commons"｜header.masthead > figure.masthead__plate > figcaption > span.ref > a
  - 768 档 ／ 第 1 屏：5 处；最小 122.4×13px｜"Wikimedia Commons"｜header.masthead > figure.masthead__plate > figcaption > span.ref > a
  - 1024 档 ／ 第 1 屏：5 处；最小 122.4×13px｜"Wikimedia Commons"｜header.masthead > figure.masthead__plate > figcaption > span.ref > a
  - 1440 档 ／ 第 1 屏：5 处；最小 122.4×13px｜"Wikimedia Commons"｜header.masthead > figure.masthead__plate > figcaption > span.ref > a
- 文件：`prototypes/S30-skate-sticker-split/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**80.【中｜390 档仍多于 2 列】S30**
- 测量值：
  - 390 档 ／ 第 1 屏：实测 3 列 × 1 行；容器 clientWidth 68px；子项最小内容盒 13px｜html.js > body > div.bar > p.bi:nth-of-type(1)
- 文件：`prototypes/S30-skate-sticker-split/index.html`｜档位：390｜屏号：1｜置信度：高

**81.【中｜390 档表格列数 ≥5】S30**
- 测量值：
  - 390 档 ／ 第 12 屏：表列数 5；容器 clientWidth 350px｜html.js > body > main > section.breaks:nth-of-type(6) > table.bt.in
- 文件：`prototypes/S30-skate-sticker-split/index.html`｜档位：390｜屏号：12｜置信度：高

**82.【中｜内部横向裁剪：文字元素超出且容器不可滚】S30**
- 测量值：
  - 390 档 ／ 第 1 屏：span.cut__lower 右溢 3808px（宽 4293px）｜被 section#cut.cut 裁掉，overflow-x=clip，容器 clientWidth 390 / scrollWidth 4198
  - 390 档 ／ 第 1 屏：span.cut__band 右溢 135px（宽 660px）｜被 section#cut.cut 裁掉，overflow-x=clip，容器 clientWidth 390 / scrollWidth 4198
  - 768 档 ／ 第 1 屏：span.cut__lower 右溢 1526px（宽 2531px）｜被 section#cut.cut 裁掉，overflow-x=clip，容器 clientWidth 768 / scrollWidth 2294
  - 768 档 ／ 第 1 屏：span.cut__band 右溢 238px（宽 1244px）｜被 section#cut.cut 裁掉，overflow-x=clip，容器 clientWidth 768 / scrollWidth 2294
  - 1024 档 ／ 第 1 屏：span.cut__lower 右溢 1735px（宽 3075px）｜被 section#cut.cut 裁掉，overflow-x=clip，容器 clientWidth 1024 / scrollWidth 2759
  - 1024 档 ／ 第 1 屏：span.cut__band 右溢 337px（宽 1699px）｜被 section#cut.cut 裁掉，overflow-x=clip，容器 clientWidth 1024 / scrollWidth 2759
- 文件：`prototypes/S30-skate-sticker-split/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、1、1、1、1、1｜置信度：中

**83.【中｜点击区 <44px】SELECTOR**
- 测量值：
  - 390 档 ／ 第 1 屏：36 处；最小 26×21px｜"排序"｜div.bench > main.main > div.bar > div.sort > label
  - 768 档 ／ 第 1 屏：36 处；最小 26×21px｜"排序"｜div.bench > main.main > div.bar > div.sort > label
  - 1024 档 ／ 第 1 屏：36 处；最小 26×21px｜"排序"｜div.bench > main.main > div.bar > div.sort > label
  - 1440 档 ／ 第 1 屏：36 处；最小 26×21px｜"排序"｜div.bench > main.main > div.bar > div.sort > label
- 文件：`prototypes/_selection/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

**84.【中｜点击区 <44px】WIZARD**
- 测量值：
  - 390 档 ／ 第 1 屏：1 处；最小 48×35px｜"重来"｜html > body.wz > main#quiz > div.wz-actions:nth-of-type(6) > button#wz-r
  - 768 档 ／ 第 1 屏：1 处；最小 48×35px｜"重来"｜html > body.wz > main#quiz > div.wz-actions:nth-of-type(6) > button#wz-r
  - 1024 档 ／ 第 1 屏：1 处；最小 48×35px｜"重来"｜html > body.wz > main#quiz > div.wz-actions:nth-of-type(6) > button#wz-r
  - 1440 档 ／ 第 1 屏：1 处；最小 48×35px｜"重来"｜html > body.wz > main#quiz > div.wz-actions:nth-of-type(6) > button#wz-r
- 文件：`prototypes/_selection/wizard.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：中

### 2.3 严重度：低（14 条）

**1.【低｜文字 <16px】S03**
- 测量值：
  - 390 档 ／ 第 1 屏：14.00px × 9 处（非正文级：标签/编号/注释）；最小实例 html.js > body.developed > header.masthead > nav.bar > p.mark（第 1 屏，12 字："北纬 69° 极光观测站"）
  - 390 档 ／ 第 1 屏：15.00px × 5 处（非正文级：标签/编号/注释）；最小实例 body.developed > header.masthead > div.wrap.hero > p.hero-act:nth-of-typ（第 1 屏，21 字："调出 1972 至 1974 年的夜"）
  - 390 档 ／ 第 1 屏：13.00px × 21 处（非正文级：标签/编号/注释）；最小实例 body.developed > header.masthead > div.wrap.hero > p.hero-act:nth-of-typ（第 1 屏，26 字："当前区间：1957 至 1979，共"）
  - 768 档 ／ 第 1 屏：14.00px × 16 处（非正文级：标签/编号/注释）；最小实例 html.js > body.developed > header.masthead > nav.bar > p.mark（第 1 屏，12 字："北纬 69° 极光观测站"）
  - 768 档 ／ 第 1 屏：15.00px × 5 处（非正文级：标签/编号/注释）；最小实例 body.developed > header.masthead > div.wrap.hero > p.hero-act:nth-of-typ（第 1 屏，21 字："调出 1972 至 1974 年的夜"）
  - 768 档 ／ 第 1 屏：13.00px × 21 处（非正文级：标签/编号/注释）；最小实例 body.developed > header.masthead > div.wrap.hero > p.hero-act:nth-of-typ（第 1 屏，26 字："当前区间：1957 至 1979，共"）
- 文件：`prototypes/S03-long-exposure-observatory/index.html`｜档位：390、390、390、768、768、768｜屏号：1、1、1、1、1、1｜置信度：高

**2.【低｜文字 <16px】S04**
- 测量值：
  - 390 档 ／ 第 8 屏：15.00px × 2 处（非正文级：标签/编号/注释）；最小实例 div.archive__inner > table.table > tbody > tr.reveal.is-in:nth-of-type(1（第 8 屏，18 字："巡演海报第 7 版 · 不要票的二楼"）
  - 390 档 ／ 第 9 屏：14.00px × 14 处（非正文级：标签/编号/注释）；最小实例 main > section#who:nth-of-type(3) > ul.who__list > li.who__item.reveal:n（第 9 屏，12 字："OIT-1968-014"）
  - 768 档 ／ 第 9 屏：15.00px × 2 处（非正文级：标签/编号/注释）；最小实例 div.archive__inner > table.table > tbody > tr.reveal.is-in:nth-of-type(1（第 9 屏，18 字："巡演海报第 7 版 · 不要票的二楼"）
  - 768 档 ／ 第 9 屏：14.00px × 14 处（非正文级：标签/编号/注释）；最小实例 main > section#who:nth-of-type(3) > ul.who__list > li.who__item.reveal:n（第 9 屏，12 字："OIT-1968-014"）
  - 1024 档 ／ 第 6 屏：14.00px × 14 处（非正文级：标签/编号/注释）；最小实例 main > section#who:nth-of-type(3) > ul.who__list > li.who__item.reveal:n（第 6 屏，12 字："OIT-1968-014"）
  - 1440 档 ／ 第 5 屏：14.00px × 14 处（非正文级：标签/编号/注释）；最小实例 main > section#who:nth-of-type(3) > ul.who__list > li.who__item.reveal:n（第 5 屏，12 字："OIT-1968-014"）
- 文件：`prototypes/S04-mango-collage-wall/index.html`｜档位：390、390、768、768、1024、1440｜屏号：8、9、9、9、6、5｜置信度：高

**3.【低｜文字 <16px】S06**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 60 处（非正文级：标签/编号/注释）；最小实例 header.masthead > div.mast-copy > dl.mast-meta > div:nth-of-type(1) > dd（第 1 屏，16 字："第六十七期 · 昭和五十七年霜月"）
  - 768 档 ／ 第 1 屏：15.00px × 64 处（非正文级：标签/编号/注释）；最小实例 header.masthead > div.mast-copy > dl.mast-meta > div:nth-of-type(1) > dd（第 1 屏，16 字："第六十七期 · 昭和五十七年霜月"）
  - 1024 档 ／ 第 1 屏：15.00px × 64 处（非正文级：标签/编号/注释）；最小实例 header.masthead > div.mast-copy > dl.mast-meta > div:nth-of-type(1) > dd（第 1 屏，16 字："第六十七期 · 昭和五十七年霜月"）
  - 1440 档 ／ 第 1 屏：15.00px × 57 处（非正文级：标签/编号/注释）；最小实例 header.masthead > div.mast-copy > dl.mast-meta > div:nth-of-type(1) > dd（第 1 屏，16 字："第六十七期 · 昭和五十七年霜月"）
- 文件：`prototypes/S06-showa-kissaten-ledger/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**4.【低｜文字 <16px】S14**
- 测量值：
  - 390 档 ／ 第 1 屏：13.00px × 25 处（非正文级：标签/编号/注释）；最小实例 html.js > body > div.hud.hud--coord > p.hud__line:nth-of-type(1) > code#（第 1 屏，13 字："X-634 / Y-851"）
  - 768 档 ／ 第 1 屏：13.00px × 25 处（非正文级：标签/编号/注释）；最小实例 html.js > body > div.hud.hud--coord > p.hud__line:nth-of-type(1) > code#（第 1 屏，13 字："X-634 / Y-849"）
  - 1024 档 ／ 第 1 屏：13.00px × 25 处（非正文级：标签/编号/注释）；最小实例 html.js > body > div.hud.hud--coord > p.hud__line:nth-of-type(1) > code#（第 1 屏，13 字："X-621 / Y-869"）
  - 1440 档 ／ 第 1 屏：13.00px × 25 处（非正文级：标签/编号/注释）；最小实例 html.js > body > div.hud.hud--coord > p.hud__line:nth-of-type(1) > code#（第 1 屏，13 字："X-611 / Y-890"）
- 文件：`prototypes/S14-zero-g-launch-sequence/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**5.【低｜文字 <16px】S15**
- 测量值：
  - 390 档 ／ 第 1 屏：13.00px × 12 处（非正文级：标签/编号/注释）；最小实例 html.js > body > div.strip:nth-of-type(1) > p.strip__item:nth-of-type(3)（第 1 屏，18 字："层 可读 · 层 缺页 · 层 可读"）
  - 768 档 ／ 第 1 屏：13.00px × 12 处（非正文级：标签/编号/注释）；最小实例 html.js > body > div.strip:nth-of-type(1) > p.strip__item:nth-of-type(3)（第 1 屏，18 字："层 可读 · 层 缺页 · 层 可读"）
  - 1024 档 ／ 第 1 屏：13.00px × 12 处（非正文级：标签/编号/注释）；最小实例 html.js > body > div.strip:nth-of-type(1) > p.strip__item:nth-of-type(3)（第 1 屏，18 字："层 可读 · 层 缺页 · 层 可读"）
  - 1024 档 ／ 第 3 屏：11.00px × 1 处（非正文级：标签/编号/注释）；最小实例 div#stack:nth-of-type(1) > div.trace.trace--1934:nth-of-type(1) > div.tr（第 3 屏，20 字："基准面 −1.42m · 1938-"）
  - 1440 档 ／ 第 1 屏：13.00px × 12 处（非正文级：标签/编号/注释）；最小实例 html.js > body > div.strip:nth-of-type(1) > p.strip__item:nth-of-type(3)（第 1 屏，18 字："层 可读 · 层 缺页 · 层 可读"）
  - 1440 档 ／ 第 3 屏：11.00px × 1 处（非正文级：标签/编号/注释）；最小实例 div#stack:nth-of-type(1) > div.trace.trace--1934:nth-of-type(1) > div.tr（第 3 屏，20 字："基准面 −1.42m · 1938-"）
- 文件：`prototypes/S15-fishery-floor-ledger/index.html`｜档位：390、768、1024、1024、1440、1440｜屏号：1、1、1、3、1、3｜置信度：高

**6.【低｜文字 <16px】S16**
- 测量值：
  - 390 档 ／ 第 4 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 div.sheet > main#track > figure.plate.plate-lead:nth-of-type(1) > figcap（第 4 屏，39 字："Wikimedia Commons "）
  - 768 档 ／ 第 3 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 div.sheet > main#track > figure.plate.plate-lead:nth-of-type(1) > figcap（第 3 屏，39 字："Wikimedia Commons "）
  - 1024 档 ／ 第 4 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 div.sheet > main#track > figure.plate.plate-lead:nth-of-type(1) > figcap（第 4 屏，39 字："Wikimedia Commons "）
  - 1440 档 ／ 第 3 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 div.sheet > main#track > figure.plate.plate-lead:nth-of-type(1) > figcap（第 3 屏，39 字："Wikimedia Commons "）
- 文件：`prototypes/S16-velocity-slant-manifesto/index.html`｜档位：390、768、1024、1440｜屏号：4、3、4、3｜置信度：高

**7.【低｜文字 <16px】S18**
- 测量值：
  - 390 档 ／ 第 1 屏：14.00px × 36 处（非正文级：标签/编号/注释）；最小实例 header#top > div.mast__grid > div.mast__col > p.cue:nth-of-type(2) > spa（第 1 屏，19 字："进站的第一个动作是敲回车，不是读标题"）
  - 768 档 ／ 第 1 屏：14.00px × 36 处（非正文级：标签/编号/注释）；最小实例 header#top > div.mast__grid > div.mast__col > p.cue:nth-of-type(2) > spa（第 1 屏，19 字："进站的第一个动作是敲回车，不是读标题"）
  - 1024 档 ／ 第 1 屏：14.00px × 38 处（非正文级：标签/编号/注释）；最小实例 header#top > div.mast__grid > div.mast__col > p.cue:nth-of-type(2) > spa（第 1 屏，19 字："进站的第一个动作是敲回车，不是读标题"）
  - 1440 档 ／ 第 1 屏：14.00px × 38 处（非正文级：标签/编号/注释）；最小实例 header#top > div.mast__grid > div.mast__col > p.cue:nth-of-type(2) > spa（第 1 屏，19 字："进站的第一个动作是敲回车，不是读标题"）
- 文件：`prototypes/S18-phosphor-service-deck/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**8.【低｜文字 <16px】S20**
- 测量值：
  - 390 档 ／ 第 1 屏：13.00px × 39 处（非正文级：标签/编号/注释）；最小实例 html > body > div.hud > p.hud__line:nth-of-type(3)（第 1 屏，12 字："圈 0 每圈差 圈 22"）
  - 768 档 ／ 第 1 屏：13.00px × 42 处（非正文级：标签/编号/注释）；最小实例 html > body > div.hud > p.hud__line:nth-of-type(3)（第 1 屏，12 字："圈 0 每圈差 圈 22"）
  - 1024 档 ／ 第 1 屏：13.00px × 42 处（非正文级：标签/编号/注释）；最小实例 html > body > div.hud > p.hud__line:nth-of-type(3)（第 1 屏，12 字："圈 0 每圈差 圈 22"）
  - 1440 档 ／ 第 1 屏：13.00px × 42 处（非正文级：标签/编号/注释）；最小实例 html > body > div.hud > p.hud__line:nth-of-type(3)（第 1 屏，12 字："圈 0 每圈差 圈 22"）
- 文件：`prototypes/S20-plotter-soundfield/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**9.【低｜文字 <16px】S24**
- 测量值：
  - 390 档 ／ 第 1 屏：14.00px × 34 处（非正文级：标签/编号/注释）；最小实例 div.deck:nth-of-type(2) > header#top > div.masthead__text > p.masthead__（第 1 屏，18 字："进站第一个动作是选一支，不是读标题。"）
  - 768 档 ／ 第 1 屏：14.00px × 29 处（非正文级：标签/编号/注释）；最小实例 div.deck:nth-of-type(2) > header#top > div.masthead__text > p.masthead__（第 1 屏，18 字："进站第一个动作是选一支，不是读标题。"）
  - 1024 档 ／ 第 1 屏：14.00px × 34 处（非正文级：标签/编号/注释）；最小实例 div.deck:nth-of-type(2) > header#top > div.masthead__text > p.masthead__（第 1 屏，18 字："进站第一个动作是选一支，不是读标题。"）
  - 1440 档 ／ 第 1 屏：14.00px × 34 处（非正文级：标签/编号/注释）；最小实例 div.deck:nth-of-type(2) > header#top > div.masthead__text > p.masthead__（第 1 屏，18 字："进站第一个动作是选一支，不是读标题。"）
- 文件：`prototypes/S24-cyanotype-rainforest-path/index.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

**10.【低｜文字 <16px】S27**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 2 处（非正文级：标签/编号/注释）；最小实例 header#top > div.wrap > div.head:nth-of-type(1) > p.head__k.head__k--act（第 1 屏，13 字："ACT-01—ACT-07"）
  - 390 档 ／ 第 3 屏：13.00px × 19 处（非正文级：标签/编号/注释）；最小实例 div.wrap > article#act-01:nth-of-type(1) > div.act__sheet > div.act__sla（第 3 屏，12 字："孟买 一家老影院的木架上"）
  - 768 档 ／ 第 1 屏：15.00px × 2 处（非正文级：标签/编号/注释）；最小实例 header#top > div.wrap > div.head:nth-of-type(1) > p.head__k.head__k--act（第 1 屏，13 字："ACT-01—ACT-07"）
  - 768 档 ／ 第 3 屏：13.00px × 19 处（非正文级：标签/编号/注释）；最小实例 div.wrap > article#act-01:nth-of-type(1) > div.act__sheet > div.act__sla（第 3 屏，12 字："孟买 一家老影院的木架上"）
  - 1024 档 ／ 第 1 屏：15.00px × 2 处（非正文级：标签/编号/注释）；最小实例 header#top > div.wrap > div.head:nth-of-type(1) > p.head__k.head__k--act（第 1 屏，13 字："ACT-01—ACT-07"）
  - 1024 档 ／ 第 4 屏：13.00px × 19 处（非正文级：标签/编号/注释）；最小实例 div.wrap > article#act-01:nth-of-type(1) > div.act__sheet > div.act__sla（第 4 屏，12 字："孟买 一家老影院的木架上"）
- 文件：`prototypes/S27-hand-painted-bill-dispatch/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、3、1、3、1、4｜置信度：高

**11.【低｜空屏（换色场，整屏高）】S28**
- 测量值：
  - 390 档 ／ 第 16 屏：第 16/35 屏墨覆盖 2.52%（整屏高 844px）；该屏众数底色 rgb(174,115,189)，整页众数底色 rgb(11,13,18)，色距 171；证据 _crit3/shots/S28/390-16.png
  - 390 档 ／ 第 17 屏：第 17/35 屏墨覆盖 2.56%（整屏高 844px）；该屏众数底色 rgb(174,115,189)，整页众数底色 rgb(11,13,18)，色距 171；证据 _crit3/shots/S28/390-17.png
  - 390 档 ／ 第 20 屏：第 20/35 屏墨覆盖 2.57%（整屏高 844px）；该屏众数底色 rgb(174,115,189)，整页众数底色 rgb(11,13,18)，色距 171；证据 _crit3/shots/S28/390-20.png
- 文件：`prototypes/S28-jazz-intaglio-wall/index.html`｜档位：390、390、390｜屏号：16、17、20｜置信度：高

**12.【低｜文字 <16px】S28**
- 测量值：
  - 390 档 ／ 第 1 屏：13.00px × 39 处（非正文级：标签/编号/注释）；最小实例 header#top > div.wrap > div.bar:nth-of-type(1) > p.bar__i:nth-of-type(1)（第 1 屏，12 字："DET-1961-088"）
  - 390 档 ／ 第 1 屏：15.00px × 6 处（非正文级：标签/编号/注释）；最小实例 header#top > div.wrap > div.head__grid:nth-of-type(2) > div.head__main:n（第 1 屏，18 字："JAZZ INTAGLIO WALL"）
  - 768 档 ／ 第 1 屏：13.00px × 36 处（非正文级：标签/编号/注释）；最小实例 header#top > div.wrap > div.bar:nth-of-type(1) > p.bar__i:nth-of-type(1)（第 1 屏，12 字："DET-1961-088"）
  - 768 档 ／ 第 2 屏：15.00px × 7 处（非正文级：标签/编号/注释）；最小实例 body > header#top > div.wrap > nav.idx > p.idx__h（第 2 屏，12 字："十二块拼贴与它们的错位量"）
  - 1024 档 ／ 第 1 屏：13.00px × 38 处（非正文级：标签/编号/注释）；最小实例 header#top > div.wrap > div.bar:nth-of-type(1) > p.bar__i:nth-of-type(1)（第 1 屏，12 字："DET-1961-088"）
  - 1024 档 ／ 第 2 屏：15.00px × 7 处（非正文级：标签/编号/注释）；最小实例 body > header#top > div.wrap > nav.idx > p.idx__h（第 2 屏，12 字："十二块拼贴与它们的错位量"）
- 文件：`prototypes/S28-jazz-intaglio-wall/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、1、1、2、1、2｜置信度：高

**13.【低｜文字 <16px】S29**
- 测量值：
  - 390 档 ／ 第 1 屏：15.00px × 10 处（非正文级：标签/编号/注释）；最小实例 body > div.sheet > div.topbar:nth-of-type(2) > div.hud:nth-of-type(1) > （第 1 屏，13 字："扭矩未复位到 42 N·m"）
  - 390 档 ／ 第 4 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 div.ch__grid:nth-of-type(2) > div.col-b:nth-of-type(2) > div.panel.panel（第 4 屏，21 字："按对角分三遍拧紧，第二遍与第三遍只校"）
  - 768 档 ／ 第 1 屏：15.00px × 1 处（非正文级：标签/编号/注释）；最小实例 body > div.sheet > div.topbar:nth-of-type(2) > div.hud:nth-of-type(1) > （第 1 屏，13 字："扭矩未复位到 42 N·m"）
  - 768 档 ／ 第 3 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 div.ch__grid:nth-of-type(2) > div.col-b:nth-of-type(2) > div.panel.panel（第 3 屏，21 字："按对角分三遍拧紧，第二遍与第三遍只校"）
  - 1024 档 ／ 第 1 屏：15.00px × 1 处（非正文级：标签/编号/注释）；最小实例 body > div.sheet > div.topbar:nth-of-type(2) > div.hud:nth-of-type(1) > （第 1 屏，13 字："扭矩未复位到 42 N·m"）
  - 1024 档 ／ 第 2 屏：14.00px × 6 处（非正文级：标签/编号/注释）；最小实例 div.ch__grid:nth-of-type(2) > div.col-b:nth-of-type(2) > div.panel.panel（第 2 屏，21 字："按对角分三遍拧紧，第二遍与第三遍只校"）
- 文件：`prototypes/S29-wire-bound-safety-manual/index.html`｜档位：390、390、768、768、1024、1024｜屏号：1、4、1、3、1、2｜置信度：高

**14.【低｜文字 <16px】WIZARD**
- 测量值：
  - 390 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body.wz > header.mast.wz-mast > div.mast-id > p.mast-kicker:nth-o（第 1 屏，15 字："网站设计风格方案 · 选型向导"）
  - 768 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body.wz > header.mast.wz-mast > div.mast-id > p.mast-kicker:nth-o（第 1 屏，15 字："网站设计风格方案 · 选型向导"）
  - 1024 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body.wz > header.mast.wz-mast > div.mast-id > p.mast-kicker:nth-o（第 1 屏，15 字："网站设计风格方案 · 选型向导"）
  - 1440 档 ／ 第 1 屏：14.00px × 3 处（非正文级：标签/编号/注释）；最小实例 html > body.wz > header.mast.wz-mast > div.mast-id > p.mast-kicker:nth-o（第 1 屏，15 字："网站设计风格方案 · 选型向导"）
- 文件：`prototypes/_selection/wizard.html`｜档位：390、768、1024、1440｜屏号：1、1、1、1｜置信度：高

### 2.4 严重度：信息（7 条）

**1.【信息｜横向出血被裁（无滚动条，按规则不算缺陷）】M01**
- 测量值：
  - 390 档 ／ 第 1 屏：出血 14 件（其中 1 件是屏外跳转链接），页 scrollWidth 390 = clientWidth 390，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 section#results:nth-of-type(4) > div.wrap > figure.chart > div.chart-scr 右溢 254px、宽 620px，该元素自身 overflow-x=hidden
- 文件：`templates/M01-clean-corporate/index.html`｜档位：390｜屏号：1｜置信度：高

**2.【信息｜横向出血被裁（无滚动条，按规则不算缺陷）】S01**
- 测量值：
  - 390 档 ／ 第 1 屏：出血 13 件（其中 1 件是屏外跳转链接），页 scrollWidth 390 = clientWidth 390，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 div.columns > article.col.col-4:nth-of-type(4) > div#fold-panel:nth-of-t 右溢 525px、宽 287px，该元素自身 overflow-x=visible
- 文件：`prototypes/S01-red-wedge-broadsheet/index.html`｜档位：390｜屏号：1｜置信度：高

**3.【信息｜横向出血被裁（无滚动条，按规则不算缺陷）】S06**
- 测量值：
  - 390 档 ／ 第 1 屏：出血 12 件（其中 1 件是屏外跳转链接），页 scrollWidth 390 = clientWidth 390，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 div.river-row:nth-of-type(1) > div.river-wrap > div#river-rail > article 右溢 18px、宽 115px，该元素自身 overflow-x=visible
- 文件：`prototypes/S06-showa-kissaten-ledger/index.html`｜档位：390｜屏号：1｜置信度：高

**4.【信息｜横向出血被裁（无滚动条，按规则不算缺陷）】S08**
- 测量值：
  - 390 档 ／ 第 1 屏：出血 80 件（其中 1 件是屏外跳转链接），页 scrollWidth 390 = clientWidth 390，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 div.shell > div.stage-wrap:nth-of-type(2) > div.iso-stage > div#plane >  右溢 155px、宽 350px，该元素自身 overflow-x=visible
  - 768 档 ／ 第 1 屏：出血 65 件（其中 1 件是屏外跳转链接），页 scrollWidth 768 = clientWidth 768，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 div.shell > div.stage-wrap:nth-of-type(2) > div.iso-stage > div#plane >  右溢 323px、宽 707px，该元素自身 overflow-x=visible
- 文件：`prototypes/S08-amber-overprint-lightbox/index.html`｜档位：390、768｜屏号：1、1｜置信度：高

**5.【信息｜横向出血被裁（无滚动条，按规则不算缺陷）】S23**
- 测量值：
  - 390 档 ／ 第 1 屏：出血 16 件（其中 1 件是屏外跳转链接），页 scrollWidth 390 = clientWidth 390，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 main > section#wall:nth-of-type(1) > div.wall:nth-of-type(2) > aside.rai 右溢 258px、宽 40px，该元素自身 overflow-x=visible
- 文件：`prototypes/S23-exposed-plaster-chronology-wall/index.html`｜档位：390｜屏号：1｜置信度：高

**6.【信息｜横向出血被裁（无滚动条，按规则不算缺陷）】S26**
- 测量值：
  - 1024 档 ／ 第 1 屏：出血 39 件（其中 1 件是屏外跳转链接），页 scrollWidth 1024 = clientWidth 1024，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 div.sheet > header#top > div.band.band--mast:nth-of-type(2) > div.rules: 右溢 6px、宽 1037px，该元素自身 overflow-x=visible
  - 1440 档 ／ 第 1 屏：出血 39 件（其中 1 件是屏外跳转链接），页 scrollWidth 1440 = clientWidth 1440，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 div.sheet > header#top > div.band.band--mast:nth-of-type(2) > div.rules: 右溢 14px、宽 1469px，该元素自身 overflow-x=visible
- 文件：`prototypes/S26-geometric-collision-columns/index.html`｜档位：1024、1440｜屏号：1、1｜置信度：高

**7.【信息｜横向出血被裁（无滚动条，按规则不算缺陷）】S28**
- 测量值：
  - 390 档 ／ 第 1 屏：出血 15 件（其中 1 件是屏外跳转链接），页 scrollWidth 390 = clientWidth 390，window.scrollTo(999999) 后 scrollX 恒为 0 → 无滚动条；保留的前 10 件里最右一件 div.head__grid:nth-of-type(2) > div.head__wall:nth-of-type(2) > figure.m 右溢 4px、宽 394px，该元素自身 overflow-x=clip
- 文件：`prototypes/S28-jazz-intaglio-wall/index.html`｜档位：390｜屏号：1｜置信度：高

## §3 与 CSS 级联与声明顺序分析师的对账

### 3.1 对账前置状态

在生成这份报告的这一刻，**`deliverables/25-critique-cascade-analyst.md` 不存在**（`existsSync("D:\\Web\\style\\deliverables\\25-critique-cascade-analyst.md") === true`，检查时间 2026-10-21 14:01:52 UTC）。
按任务规定，我先做通用测绘，并**把全部可证伪量落成机器可读台账**，等 25 号文件出现即可机械对账：

- 台账文件：`_crit3/ledger.json`（逐「案 × 档」144 条，每条 30 个实测标量）
- 人读版本：本文 §1A（几何）、§1B（质量计数）、§1D/§1D-2（内容盒与竖排）、§1E（出血可达性）、§4（空屏）

### 3.2 对账规则（先定规则，再判对错）

| 判定 | 条件 |
| --- | --- |
| **对** | 台账里对应标量与它的预测在**同一口径**下数值相等（数值型）或同为真/假（布尔型）。 |
| **错** | 台账里的标量与它的预测在同一口径下不等。我会给出**我的实测值 + 我的口径定义 + 它的预测原文**，并指明它错在哪：是**口径错**（例如拿整格高 ÷ line-height 当格内行数、拿 `scrollWidth > clientWidth` 当有滚动条）、还是**数值错**（口径相同但数不同）。 |
| **无法判定** | 它给的是区间、趋势、因果关系，或指的是我没测的量（交互态、hover、reduced-motion、320px/1920px、打印、无障碍树、以及链上有 `background-image` 的对比度）。我会写明**缺什么证据才能定**。 |

我预先声明三条**口径分歧**，避免把口径差误判成它算错：

1. **行数**：我只认 `Range.getClientRects()` 圈住**单个文本节点自身**返回的矩形个数。任何「盒高 ÷ line-height」「整行高 ÷ 行高」得出的行数与我不在同一口径。
2. **列数**：我按「同一视觉行分组」（子项 `offsetTop` 容差 3px）取**同排子项数的最大值**，并把 `grid-template-columns` 解析后的轨道数另列一栏；两者不等是正常的（子项可跨轨）。`caption` / `thead` / `figcaption` / `list-item` 一律算作子项。
3. **滚动条**：我只认 `window.scrollTo(999999,0)` 之后的 `window.scrollX`。`scrollWidth > clientWidth` 在本库里出现 0 次，所以任何基于「overflow 属性推导出会横向滚动」的预测都会被判**错**（见 §5.2 的实测：144/144 个点 `scrollX` 恒为 0）。

### 3.3 已可预置的实测结论（无论它预测什么，这几条是我的定值）

| 命题 | 我的实测 |
| --- | --- |
| 存在横向滚动条的「案 × 档」数 | **0 / 144** |
| `documentElement.scrollWidth !== clientWidth` 的「案 × 档」数 | **0 / 144** |
| 有 rect 超出视口的元素的「案 × 档」数 | **26 / 144**（共 333 件；屏外跳转链接已剔除） |
| 整屏高且墨覆盖率 <3% 的屏 | **8** 个：S08@1440#6=2.67%、S15@390#3=0.12%、S15@768#3=0.01%、S28@390#16=2.52%、S28@390#17=2.56%、S28@390#20=2.57%、M03@1024#2=2.98%、M03@1440#2=2.72% |
| 竖排文字元素 | **77** 个（S01/S03/S06/S07/S18/S27/S28） |
| 「横排中文每行 ≤2 汉字」的真实事故 | **0** 个（原始命中 351 个全部撤回，理由见 §1D / §5.10） |
| 对比度不达标 | 原始 **56** 条（聚合为 §2 的 8 条「案 × 问题类型」）；**不可测** 1784 条（未入场 220 + 链上有背景图 1564） |
| 点击区 <44px 的独立控件 | **1240** 条（已剔除行内正文链接 303 条与屏外跳转链接 20 条） |
| 正文级字号最小值的全库下界 | **13px** |

### 3.4 等 25 号文件出现后的操作

把它的每条「若我推导正确，390 档应实测到 X」逐条对照 `_crit3/ledger.json`，按 §3.2 三条口径规则判对/错/无法判定，并把判定与我的实测值补进本节。**在它出现之前，本节只报告「不存在」这一事实，不做任何替代性推断。**

## §4 空屏点名（整屏高、墨覆盖率 <3%）

方法：`Page.captureScreenshot` + `captureBeyondViewport` 按视口高逐屏截图（scale 0.4），numpy 对每屏做**众数底色法**——先量化到 4bit/通道求出现最多的颜色作底色，再数与该底色最大通道差 >16 的像素占比。`modeDelta` = 该屏众数底色与整页众数底色的最大通道差，用来区分「故意换的色场」与「什么都没排」。**只列 `bandH === 视口高` 的整屏。**

共扫描 **1624 个屏**。整屏高且墨覆盖率 <3% 的：**8 个**；整屏高且 3–5% 的另有 11 个（同列在下）；末屏碎条中的低墨条 19 个（**我的分屏产物，不算页面缺陷**，见 §5.8）。

### 4.1 整屏高、墨覆盖率 <3%

| 严重度 | 案 | 档 | 屏号/总屏 | 墨覆盖率 | 该屏众数底色 | 整页众数底色 | 色距 | 证据图 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 高 | S15 | 768 | 3/14 | 0.01% | rgb(230,233,232) | rgb(231,235,233) | 2 | `_crit3/shots/S15/768-03.png` |
| 高 | S15 | 390 | 3/19 | 0.12% | rgb(230,234,232) | rgb(231,235,233) | 1 | `_crit3/shots/S15/390-03.png` |
| 低（换色场） | S28 | 390 | 16/35 | 2.52% | rgb(174,115,189) | rgb(11,13,18) | 171 | `_crit3/shots/S28/390-16.png` |
| 低（换色场） | S28 | 390 | 17/35 | 2.56% | rgb(174,115,189) | rgb(11,13,18) | 171 | `_crit3/shots/S28/390-17.png` |
| 低（换色场） | S28 | 390 | 20/35 | 2.57% | rgb(174,115,189) | rgb(11,13,18) | 171 | `_crit3/shots/S28/390-20.png` |
| 高 | S08 | 1440 | 6/9 | 2.67% | rgb(18,12,8) | rgb(18,12,8) | 0 | `_crit3/shots/S08/1440-06.png` |
| 高 | M03 | 1440 | 2/7 | 2.72% | rgb(23,23,26) | rgb(14,14,16) | 10 | `_crit3/shots/M03/1440-02.png` |
| 高 | M03 | 1024 | 2/7 | 2.98% | rgb(23,23,26) | rgb(14,14,16) | 10 | `_crit3/shots/M03/1024-02.png` |

### 4.2 整屏高、墨覆盖率 3–5%（临界，一并点名）

| 案 | 档 | 屏号/总屏 | 墨覆盖率 | 该屏众数底色 | 整页众数底色 | 色距 | 证据图 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S28 | 390 | 18/35 | 3.17% | rgb(174,115,189) | rgb(11,13,18) | 171 | `_crit3/shots/S28/390-18.png` |
| M03 | 1440 | 4/7 | 3.26% | rgb(14,14,16) | rgb(14,14,16) | 0 | `_crit3/shots/M03/1440-04.png` |
| S28 | 390 | 19/35 | 3.33% | rgb(174,115,189) | rgb(11,13,18) | 171 | `_crit3/shots/S28/390-19.png` |
| M03 | 768 | 2/5 | 3.80% | rgb(23,23,26) | rgb(14,14,16) | 10 | `_crit3/shots/M03/768-02.png` |
| S08 | 1024 | 6/10 | 3.81% | rgb(18,12,8) | rgb(18,12,8) | 0 | `_crit3/shots/S08/1024-06.png` |
| S25 | 1024 | 6/11 | 3.88% | rgb(232,228,222) | rgb(232,228,222) | 0 | `_crit3/shots/S25/1024-06.png` |
| S28 | 390 | 15/35 | 4.23% | rgb(174,115,189) | rgb(11,13,18) | 171 | `_crit3/shots/S28/390-15.png` |
| M03 | 768 | 3/5 | 4.44% | rgb(14,14,16) | rgb(14,14,16) | 0 | `_crit3/shots/M03/768-03.png` |
| M03 | 390 | 3/6 | 4.73% | rgb(23,23,26) | rgb(14,14,16) | 10 | `_crit3/shots/M03/390-03.png` |
| S06 | 1024 | 5/10 | 4.86% | rgb(227,212,186) | rgb(227,212,187) | 1 | `_crit3/shots/S06/1024-05.png` |
| M03 | 1024 | 5/7 | 4.96% | rgb(14,14,16) | rgb(14,14,16) | 0 | `_crit3/shots/M03/1024-05.png` |

像素复核（我逐张看过保留下来的证据图）：`_crit3/shots/S15/390-03.png` 该屏顶部只有一组极淡的表格网格线，其余整屏为空；`_crit3/shots/M03/1024-02.png` 是一块占位框（四角刻度 + 交叉细线），框内几乎没有内容，框的填充与底色通道差 <16 所以不计为墨；`_crit3/shots/S28/390-16.png` 是整片紫底 + 左缘一条约 1 汉字宽的文字列（该窄列已单独计入 §1D）。

## §5 我确认属于「工具/链路缺陷而非页面缺陷」的项

### 5.1 入场动画未触发 → 对比度与几何双假故障（已修）

详见 §0.3（1）。修好后全库仍有 **220** 条对比度记录因「祖先链 opacity 乘积 <0.5」被剔除；`opacity ≠ 1` 的容器 **54** 个。这 54 个里既有未触发入场的，也有设计上本来就是半透明叠层的——**我没有逐个人工区分**，因此它们**不出现在 §2**。

### 5.2 `scrollWidth > clientWidth` 不等于「有滚动条」

本库大量使用出血装饰（负 margin 色块、`width:100vw` 斜带、等距投影的板片）。判据是 `window.scrollTo(999999, 0)` 后读 `window.scrollX`：**恒为 0 就没有滚动条**。实测结果：**真滚动 0 个点，仅裁切 0 个点** —— 连一次「仅裁切」都没有发生，因为 `documentElement.scrollWidth` 在全部 144 个点上都等于 `clientWidth`。出血元素全部被中间层裁掉或本就不参与滚动区（§1E：333 件超出件里 4 件找不到裁剪祖先）。

另附一条容易犯的错：`--hide-scrollbars` 由 `cdp.mjs` 自带，所以 `documentElement.clientWidth === innerWidth`，**不能用 `clientWidth` 判断滚动条有无**；本报告的判据只有 `scrollX`。

### 5.3 `getBoundingClientRect().height ÷ lineHeight` 不是这一格的行数

详见 §0.3（2）。全库行盒数据只用 `Range.getClientRects()`。

### 5.4 行内元素的 `clientWidth` 为 0 → 假「每行 0 字」

详见 §0.3（3）。原始数据里这类假 0 有 **167** 条，全部剔除；可用的格 **6269** 个。

### 5.5 盲区：对比度无法合成 `background-image`

沿祖先链只要有一级带 `background-image`，我就放弃该条对比度（全库剔除 **1564** 条）。这批原型大量使用程序化纸纹/网点/渐变位图，所以「纹理上的文字对比度」**全库未测**。这是本报告最大的盲区，不是页面缺陷。

### 5.6 盲区：伪元素（`::before` / `::after`）画出来的背景

我用 DOM 祖先链合成底色，**看不到伪元素铺的底色**。这会产生「前景 = 合成底色 = 1:1」的假缺陷。全库筛出这种条目 **60** 条，全部落在 S21 的 `span.lockbar__no.face-data`（14 个序号 × 4 档，共 56 条 + 2 条 `／` 分隔符）。

**像素对照证据**（放大 8 倍裁切 `_crit3/s21-lockbar.png`，裁切区 `x=588 y=963 w=110 h=34`，@1440 档）：

| 路径 | 结果 |
| --- | --- |
| DOM 祖先链合成 | 前景 `rgb(228,220,201)` ／ 合成底色 `rgb(228,220,201)` → **1.00:1**（判为不合格） |
| 像素（裁切区主要色簇） | `rgb(62,58,52)` 占 54.51%、`rgb(228,220,201)` 占 16.55%、`rgb(220,213,194)` 占 5.70% → 暗条 vs 亮字 **8.27:1**（合格） |

裁切图里能直接看到浅色「1」压在深色锁条上；深色锁条由伪元素绘制，不在我的祖先链里。**结论：这 60 条是我的链路盲区，不是页面缺陷，已全部从 §2 排除。** 但因为这条盲区，我**无法声称「对比度不合规的条目只有 §2 里那些」**。

### 5.7 屏外无障碍跳转链接被误计为点击区与出血件

几乎每个页面都有一个 `a.skip` / `a.skip-link`，样式是 `left: -9999px`（实测 `overLeft = 9999~10000`），只在获得焦点时进入视口。它会被我的「rect 宽高 >0.5」可见性判据留下，于是：

- 在出血统计里**抢占「最右溢出件」的位置**（R 为负值、L 约 9999）→ 我已按 `class 含 skip` + `|overLeft|>900` 双重剔除；
- 在点击区统计里，`S04 a.skip 85×28`、`S07 a.skip 64×28`、`S09 a.skip 192×29` 这类会被判「高 <44px」→ 已剔除，全库共剔除 **20** 条。

剔除后点击区 <44px 剩 **1240** 条，全部是真正在版面上的控件。

### 5.8 末屏碎条（我的分屏产物）

按「页高 ÷ 视口高」分屏时最后一屏常常只有几像素到两百像素高。它们在「墨覆盖率 <3%」的原始名单里占多数。全部 19 条已从 §4.1 剔除，逐条列出：

| 案 | 档 | 屏号 | 碎条高(css px) | 墨覆盖率 | 色距 |
| --- | --- | --- | --- | --- | --- |
| S03 | 1440 | 6/6 | 91 | 0.00% | 0 |
| S08 | 390 | 10/10 | 3 | 0.00% | 0 |
| S12 | 390 | 10/10 | 37 | 0.00% | 1 |
| S12 | 1440 | 6/6 | 62 | 0.00% | 1 |
| S14 | 768 | 10/10 | 34 | 0.00% | 0 |
| S14 | 1024 | 10/10 | 54 | 0.00% | 0 |
| S15 | 768 | 14/14 | 42 | 0.00% | 0 |
| S18 | 768 | 14/14 | 35 | 0.00% | 1 |
| S18 | 1440 | 13/13 | 46 | 0.00% | 0 |
| S19 | 1024 | 14/14 | 3 | 0.00% | 1 |
| S21 | 1024 | 6/6 | 21 | 0.00% | 0 |
| S22 | 1440 | 12/12 | 43 | 0.00% | 0 |
| S25 | 1024 | 11/11 | 9 | 0.00% | 12 |
| S27 | 1024 | 24/24 | 55 | 0.00% | 198 |
| M03 | 1024 | 7/7 | 26 | 0.00% | 0 |
| WIZARD | 390 | 2/2 | 78 | 0.00% | 0 |
| WIZARD | 1440 | 2/2 | 184 | 0.30% | 0 |
| M03 | 1440 | 7/7 | 127 | 2.22% | 0 |
| WIZARD | 1024 | 2/2 | 269 | 2.91% | 0 |

### 5.9 点击区 <44px 里绝大多数是「行内链接」与「已由 label 放大的原生控件」

原始命中（w 或 h < 44px 的可见可交互元素）**1563** 条，拆开：行内正文链接 303 条、屏外无障碍跳转链接 20 条、**剩下的独立控件 1240 条**。独立控件按标签分：`A` 630、`BUTTON` 419、`LABEL` 64、`INPUT` 40、`CODE` 36、`g` 21、`SUMMARY` 16、`SELECT` 8、`SPAN` 4、`a` 2。

行内正文链接（WCAG 2.5.5 明确豁免）我按「祖先里有 `p`/`blockquote`/`td`/`dd`/`dt`/`figcaption`」筛出，共 303 条。**这一条是我的判定规则，不是标准原文**，所以 §2 里的「点击区 <44px」是扣掉它们的余数。剩下的 1240 条里，`INPUT` 类型几乎都是原生 `radio`/`checkbox`（最小实测 `S13` 的 `input` **13×13px**），真实命中区通常由外层 `label` 撑开——**我没有测外层 `label` 的 rect**，所以这部分严重度可能被高估（见 §6.3）。

### 5.10 「汉字·行」这个指标在本库 96% 的命中上是失效的（我的指标缺陷）

我用「内容盒宽 ÷ 该格单个汉字宽」表示「这一格一行能放几个汉字」。这个指标有三处失效，逐条给实测计数：

| 失效方式 | 计数 | 实测证据 |
| --- | --- | --- |
| **分母错**：格子里根本没有汉字 | 302 / 351 | M02@390 `span.menu-price` 文字 `¥108`，内容盒 42px，汉字宽 42÷2=21px → 算出「每行 2 字」；真值是 4 个西文数字排在 42px 里，`longestLine` 也是 42px（`longestLine === 内容盒宽`） |
| **忘了竖排**：横排指标量竖排文字 | 16（含 ≥3 汉字且只返回 1 个矩形） | S27@1024/1440 `p.act__bind` 文字「装订边距」，内容盒 20px、汉字宽 13px → 算出「每行 1 字」；`texts[]` 里同一元素 `writing-mode: vertical-rl`、盒 24×304px → 正确读法是「一列能放 23 字」 |
| **shrink-to-fit 被当成容量不足** | 同上（这些格 `longestLine === 内容盒宽`，盒宽就是内容宽） | S01 全档 `code` 内容盒与文字宽完全相等 |

修正后：**全库真正「横排中文每行 ≤2 汉字」的格 = 0 个。** 我在 §1D 保留了逐类计数，撤回了首版的全部点名。**这条修正影响的是我给别人的数据，所以必须在报告里明写。**

### 5.11 竖排里「字比盒高」不等于字被切掉（像素反证）

S18@390 的 `code.tag__d` 实测 **盒 9×5px、字号 9px**，按「盒高 < 字号」会判「文字被框切掉」。我做了一次像素复核（放大 8 倍裁切 `_crit3/s18-tag.png`，裁切区 `x=24 y=2892 w=60 h=40`）：竖排里的一个 9px 拉丁数字旋转后实测约 **4–5 css px 宽 × 5 css px 高**，**字形完整、没有被裁**。同一元素在 1024/1440 档是横排、盒 17×17px，正常。**结论：这条是我按盒高与字号粗比产生的假故障，不是缺陷。**

### 5.12 其余被排除或登记的项

- 断图：全库 **0** 张（`img.complete && naturalWidth===0`）。所有页面 0 断图。
- 页面 JS 异常：全库 **0** 条（`Runtime.exceptionThrown`）。不在几何职责内，仅登记。
- 分屏截图失败：**2** 条。（`_crit3/out/*.json` 的 `bandCapture.bands[].err`）
- 因超过 60 屏上限而被截断的「案 × 档」：**0** 个。
- 全库文字元素采样 **37623** 条（每页上限 900 条）；对比度节点采样上限每页 1200 条。**超限部分未测**，但超限页极少（页高最大的 S28@390 为 35 屏）。

## §6 我最不确定的 3 条

### 6.1 「被裁掉的超出元素」里，哪些是装饰、哪些是用户永远看不到的内容

§1E 给出 271 件被非滚动容器裁掉的超出件。我用「标签是文字承载标签且右溢 >20px」筛出 8 件（§1E 末表）。**这个规则本身不可靠**：`span`/`div` 既是装饰也是内容；`S08` 的等距板片、`S30` 的 `span.cut__lower`（390 档实测 **4293×3247px**，右溢 3808px）从几何上无法区分是"故意出血的底图"还是"错位的正文容器"。**需要的证据**：对被点名的每一件，取该元素的**文本内容长度**、**是否有可见字形落在视口内**（像素裁切），以及那个裁剪祖先的 `overflow-x` 到底是 `hidden` 还是 `clip`（两者语义不同，`clip` 连程序滚动都不允许）。我没有做这一步。

### 6.2 §4.1 的 8 个空屏是「真的空」还是「入场未滚到就截图」

我在截图前用真实滚轮把整页滚了一遍，但**滚回顶部之后才截图**；`Page.captureScreenshot` 的 `captureBeyondViewport` 不会重新触发视口内的 IntersectionObserver。如果某原型是「滚到该屏才展开、且展开态不保持」，我截到的就是未展开状态。**需要的证据**：对 §4.1 每一屏，把视口滚到该屏 `y` 后实时截**视口图**（不加 `captureBeyondViewport`），与该屏证据图逐像素比对；若实时图有内容而分屏图没有，就是我的链路缺陷。我只对 3 张做了人工目视（S15、M03、S28），**没有做这个对照**。

### 6.3 点击区 <44px 的 1240 条独立控件里，有多少的真实命中区其实够大

最典型的是 S13 的原生 `input`（实测 **13×13px**，4 档一致），它被包在 `label.pressmode__opt` 里。若 `label` 自身 ≥44px，则有效命中区是 `label`，不算缺陷；若 `label` 也 <44px，就是真缺陷。**我既没测外层 `label` 的 rect，也没做「点一下看谁响应」的事件测试**，所以这一类的严重度只能说"未定"。**需要的证据**：`elementFromPoint(该控件中心)` 返回的是谁，以及该元素链上第一个可点击祖先的 `getBoundingClientRect()`。

## §7 本次测绘的限制

1. **只测 4 档固定视口**：390×844、768×1024、1024×768、1440×900。没测 320px、1920px，也没测断点之间的宽度（431 / 820 / 1180 等）。断点 ±1px 的行为完全未覆盖。
2. **没有测交互态**：全部测量在「无 hover、无 focus、无 active、无展开、无表单填写」的初始态。悬停文字对比度、展开面板的列数、下拉菜单的点击区，全部未测。
3. **对比度是合成计算值，不是像素值**；链上有 `background-image` 的一律放弃（全库剔除 1564 条）→ **纹理上的文字对比度全库未测**。
4. **对比度不含 `filter`、`mix-blend-mode`、`backdrop-filter`、`background-clip: text`、伪元素背景**：伪元素背景这条已证实会造成假故障（§5.6）；其余四项我只在个别元素上做过逐层 dump 验证（均为 `none`/`normal`），**没有对 36 个页面逐页验证**。
5. **竖排文字（`writing-mode: vertical-*`）我做了专项，但仍不彻底**：`Range.getClientRects()` 对竖排返回竖列矩形，我在 §1D-2 改用「盒高 ÷ 汉字宽」算列容量，但数据字段名仍叫 `ownLines`；竖排元素的对比度照常算了（见 §2.2 第 49 条：S18 竖排 9px 数字给出 3.21:1），但**没有对竖排元素逐个做像素复核**。
6. **`position: fixed` / `sticky` 元素在分屏截图里的归属不可靠**：`captureBeyondViewport` 把 fixed 元素画在页面顶部那一屏，因此固定页眉/页码/进度条**只出现在第 1 屏**的墨覆盖率里，其余屏系统性偏低。
7. **分屏每案上限 60 屏**（本库触发 0 个点，见 §5.12）。
8. **每个「案 × 档」只测 1 次**：没有重复测量，因此**没有离散度/信噪比数据**。只有 `innerWidth` 是断言过的。
9. **没有测 `prefers-reduced-motion: reduce`**，也没测打印样式。
10. **没有用无障碍树**（`Accessibility.getFullAXTree`）：「这个元素算不算正文/控件」是我按标签名与 class 名判的，不是按语义判的。
11. **没有读一行 CSS 源码**（任务规定）：所以我只报「是什么」，不报「哪条声明导致的」。列数与断点的因果关系不在本报告内。
12. **对比度的「阈值」用的是 WCAG 2.x 常规文本 4.5:1 / 大字 3:1**；没有区分 AAA(7:1)、没有考虑 CJK 笔画密度对可读性的额外要求。
