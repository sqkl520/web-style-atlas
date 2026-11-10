# S31 静灰尺规页：当前状态与剩余待办

> 2026-11-10　已落盘、已渲染、已进 data.js，**未达发布线**

## 一、它做到了什么（实测）

| 项 | 值 | 与 30 案对比 |
|---|---|---|
| 底色 | `#5F5B55`（中性中带，HSL 36°/6%/35%） | **全库第一个中间明度带案子**（此前 HSL 口径 1 案、Lab 口径 0 案） |
| chroma（调色板最高饱和） | **6** | 此前最低 12（S15/S22）→ **全库最安静** |
| 调性 | 很安静 | 很安静从 2 → **3** |
| minPics | **1** | 此前全库最小 4 → **第一个真正"少图"的案** |
| 结构标签 | **SIGNAL-BOARD**（新） | 22 → 23 个标签，**未新增撞车对**（仍是 8 对） |
| 渲染 | 3 档完成，`report.json` 有值 | — |

它进入了 `data.js`（31 案），选型台能显示它，分布闸门的三个缺口被它补了一个半：
`low-photo`（0→1，地板是 2）、`very-quiet`（2→3，地板是 5）、`mid-lightness`（1→1，
因为 `axes.band` 走 HSL，`#5F5B55` 的 HSL l=35 仍是"中间明度带"——这是对的）。

## 二、还差什么（8 个闸门里 4 个红，全是真待办）

### 2.1 `check-contract`：两条 FAIL 不在允许表 —— **需要你裁定**

```
S31  FAIL `hairline`     不在 §9.15 允许表里
S31  FAIL `few-pictures` 不在 §9.15 允许表里
```

这正是 `02-CONTRACT-CONFLICT.md` 记的那个冲突。`few-pictures` 要求 ≥4 图，
而本案的设计目标就是「给只有 1–2 张图的人用」——两者定义上互斥。

`hairline` 是同一个问题的另一面：本页用 1px 线替代图片来分区（11 条），
而规则说「线只用于真表格与表单」。

**这一条我没有自行绕过，也不会绕。** 三条出路写在 `02-CONTRACT-CONFLICT.md` 里。

### 2.2 `check-docs`：三处数字必须跟着 30→31 改

```
✗ nums/schemes   文档里 6 处写「30 个方案」，实测 31
✗ nums/gate      文档写「29 个闸门 FAIL=0 / 剩 2 条」，实测 29 / 5（S08 + S31 的 4 条）
✗ panel/fields   README 写 audit 合计 10065 字，实测 10419
```

这三条是**闸门正确地抓住了「新增案之后文档没同步」**。
修法不是改数字，是按 `_det/01-thirty-parameterization.md` 的清单一次性把所有位置改对——
那份清单列了 15 处必改 + 10 处「漏改不报红」的。

### 2.3 `check-prompts` / `check-twolines`：S31 还没有提示词

```
✗ [coverage] 只生成了 30/31 条提示词
✗ [prompt-missing] S31 提示词缺失
✗ [missing-in-prompts] data.js 有 S31，prompts.js 没有
```

S31 的提示词要走完整生成链：`extract-dna.mjs` → `clean-dna.mjs` → `build-prompts.mjs`。
而 `build-prompts.mjs` 的 `CAPACITY` 表（`:135-170`）也是**手写 30 条**——
这是新增案的**第五个静默阻塞**，与 `bg` 那个同类：新案的 `minItems`/`minPics` 会回退到 `HUMAN` 表，
而 `HUMAN` 也只有 30 条，最终回退到硬编码的 `3`。

## 三、所以 S31 现在不能发布

按 `_CONTRACT.md §7` 的完成判据，它缺：

1. 提示词（生成链没跑）；
2. 文档数字没同步（4 处）；
3. 两条 FAIL 未获豁免（需你裁定）。

**它现在在 `data.js` 里的状态是"有页面、闸门 FAIL=3"，这一状态是诚实的**——
选型台上它会显示 FAIL=3，不会被伪装成达标。

## 四、我建议的下一步顺序

1. **你先裁定 `02-CONTRACT-CONFLICT.md` 里那两条**（few-pictures / hairline）——
   这决定 S31 这条路要不要继续走；
2. 若继续：修 `build-prompts.mjs` 的 CAPACITY 手写表（第五个静默阻塞），
   跑生成链给 S31 出提示词；
3. 然后一次性同步全部文档数字（按 `01-thirty-parameterization.md` 的 15 处清单）。

如果第 1 步的裁定是「不豁免」，那 S31 应该被改成 4 张图（放弃少图缺口），
或者撤掉——**我不会在没得到裁定前自己选一条**。
