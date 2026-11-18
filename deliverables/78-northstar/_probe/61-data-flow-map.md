# data.js 的 33 个字段里，只有 5 个能直接影响提示词

> 2026-11-17　主线程
> 这轮本来想查「有没有数据被静默丢弃」。结论比预想的更根本：
> **大部分 data.js 字段本来就不该进提示词** —— 它们是选型台 UI 的数据。

---

## 一、哨兵测试的结果

方法：把 data.js 里 `window.SCHEMES` 的每个字段改成哨兵值，看 35 案提示词是否变化。

```
id               ✓ 35/35 案受影响
tone             ✓ 35/35
layout           ✓ 2/35
audit            ✓ 2/35
quirk            ✓ 3/35
                                     ← 以上 5 个字段能影响提示词
其余 28 个        ✗ 不影响提示词
```

那 28 个包括：`dir / cn / en / fr / structure / threshold / def / family /
fontsSpec / visuals / motion / risk / landing / scenes / copy / copyParts /
bg / primary / buttonText / errorCode / errorCodeSource / palette /
built / gate / shots / axes / scenesYes / scenesNo`

---

## 二、这不是缺陷，是架构

`pick(id)` 的实现（`prompt-copy.js:20` 附近）：

```js
function pick(id) {
  for (var i = 0; i < P.schemes.length; i++) {
    if (P.schemes[i].id === id) return P.schemes[i];
  }
  return null;
}
```

它返回的是 **`prompts.js`** 的记录，而那条记录只有 9 个字段：

```
id / dir / plain / scenes / minItems / minPics / hard / capacity / dna
```

**data.js 的 33 个字段里，绝大部分只服务于选型台 UI**（中文名、英文名、截图、
闸门结果、场景标签…），它们从来不该进提示词。

所以「28 个字段不影响提示词」是**正确的**，不是「数据被丢弃」。

---

## 三、但我差点把它写成缺陷

第一版我用字符串匹配（取字段值前 10 字，看是否出现在提示词里），
结论是 `risk` / `landing` 都「没进提示词」——

**那也是错的。** 我读过提示词，risk 段明明在里面。

错因：`prompt-copy.js` 读的是 `s.dna.risk`（来自 prompts.js），
而我改的是 `SCHEMES[id].risk`（来自 data.js）。**两份数据内容相同但是两个副本。**

实测确认：

```
S13  data.js risk    : 最易滑向「苹果式同色系软挤出」…
S13  prompts dna.risk: 最易滑向「苹果式同色系软挤出」…
     两份相同: true
```

所以 data.js 的 risk 改了不会影响提示词 —— 因为提示词读的是 prompts.js 那份。
**但这是「两份数据同源」，不是「risk 丢丢失」**：`build-prompts.mjs` 生成 prompts.js 时
就是从 data.js 抄过去的。

---

## 四、真正值得问的问题

既然 data.js 和 prompts.js 是两份数据，那：

> **它们会不会漂移？**

查已有的守卫：`check-prompts.mjs` 的 `stale-vs-dna-clean` 比的是
`dna-clean.json` ↔ `prompts.js`，**没有一条比 `data.js` ↔ `prompts.js`**。

而 `build-prompts.mjs` 是从 data.js 生成 prompts.js 的。所以：
- 有人改了 data.js 但没重跑生成 → 两份漂移
- `check-stale.mjs` 抓不抓得到？

这是这一轮真正该验证的事。

---

## 五、验证：data.js 改了不重跑，闸门会不会响

（见下一节的实测）

---

## 六、方法上的教训

**两版探针都给了错的结论，原因不同：**

| 版本 | 方法 | 错在哪 |
|---|---|---|
| v1 | 取字段值前 10 字，看是否出现在提示词里 | `risk` 被截去了导语，前 10 字对不上；判成「没进」 |
| v2 | 改 `SCHEMES` 字段，看提示词变不变 | 提示词读的是 `prompts.js` 的副本，改 data.js 当然不变 |

v2 的方法本身是对的（测行为而不是测字符串），错在**我没先查清「提示词到底读哪份数据」**。

这印证了本仓库那条：**分析之前先确认你分析的是产品实际用的那个对象。**
