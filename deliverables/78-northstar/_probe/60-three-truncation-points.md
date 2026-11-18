# 三处截断点全查完：两处有缺陷、一处是健全的

> 2026-11-17　主线程
> 上轮修了 risk 段的硬截断。那是「截断」这一类缺陷的一个实例，
> 所以这轮我把 `prompt-copy.js` 里所有 `slice()` 截断点都查了一遍。

---

## 一、三处截断点

```
$ grep -n "slice(0," prototypes/_selection/prompt-copy.js
98:    return t.length > 80 ? t.slice(0, 80) : t;          ← cleanField（用户输入）
372-386: trimStack 的字体链截断                            ← 按数组元素，不切字符
1080-1093: risk 段截到 220 字                              ← 上轮已修
```

| 位置 | 截断对象 | 判据 | 结论 |
|---|---|---|---|
| `cleanField` | 用户填的 biz/action | 硬切 80 字符 | **有缺陷，已修** |
| `trimStack` | 字体链数组 | 截到 4 款，但保证中文字族不被切掉 | **健全，不改** |
| risk 段 | 作者写的 risk 原文 | 硬切 220 字符 | **有缺陷，上轮已修** |

---

## 二、`cleanField`：切断词还补句号（这轮修）

### 2.1 实测

输入 102 字：

```
一家只做手冲的咖啡店，专门进云南保山、普洱、孟连三个产区的日晒豆，
每批只烘 12 公斤，每周三下午出豆，只做浅烘，夏天会加两款冷萃，
店里有一面墙贴着每个产区的海拔和杯测分数，欢迎来店里先喝一杯再决定买不买
```

旧实现无条件 `slice(0, 80)`，加上模板补的句号，用户拿到：

```
我经营一家只做手冲的咖啡店，…，店里有一面墙贴着每个产区的海。
```

**「海」是「海拔」被切了一半**，而且句号让它看起来像一个完整的短句。

### 2.2 为什么比 risk 那处更糟

| | risk 截断 | cleanField 截断 |
|---|---|---|
| 痕迹 | 末尾有「…」 | **无痕迹** |
| 用户能不能看出没说完 | 能 | **不能** |
| 读起来像什么 | 系统没做完 | **作者的原话** |

risk 那处至少诚实。这处是**把系统的残缺伪装成用户的话**。

### 2.3 修法

```js
if (t.length <= 80) return t;
var head = t.slice(0, 80);
var lastSep = -1;
for (var i = head.length - 1; i >= 40; i--) {
  if ("，。；！？、 ".indexOf(head.charAt(i)) >= 0) { lastSep = i; break; }
}
return lastSep >= 40 ? head.slice(0, lastSep).replace(/[，、\s]+$/, "") : head;
```

两个细节：

- **回退到最后一个分隔符**，而不是硬切字符
- **只在 40 字之后允许回退** —— 否则一句话很长的用户（前 40 字没标点）会被削得几乎没内容

### 2.4 实测

| 输入 | 结果 |
|---|---|
| 102 字长输入 | 切在「夏天会加两款冷萃」，完整分句 ✓ |
| 「咖啡店」 | 不受影响 ✓ |
| 刚好 80 字 | 边界正常 ✓ |

---

## 三、`trimStack`：健全，不改

```js
function trimStack(stack, limit) {
  var lim = limit || 4;
  if (stack.length <= lim) return stack;
  var head = stack.slice(0, lim - 1);
  if (CJK_RE.test(head.join(" "))) return stack.slice(0, lim);
  for (var i = lim - 1; i < stack.length; i++) {
    if (CJK_RE.test(stack[i])) return head.concat([stack[i]]);
  }
  return stack.slice(0, lim);
}
```

它截到 4 款，**但如果前 3 款里没有中文字族，会主动把第一个中文字族补进来**。

实测 35 案：没有一案的第一个中文字族在第 5 位或之后，所以当前不会误截。
而且这个逻辑本身就是为防误截写的 —— 注释里记着「S25 唯一的中文字族在第 4 位，被 slice(0,3) 切掉」。

**按数组元素截断不会产生「半个词」**，所以这一类风险它天然没有。

---

## 四、加的两条断言

| 规则名 | 守什么 |
|---|---|
| `shape-risk-truncated` | risk 段必须以 。！？ 结尾（上轮加） |
| `field-truncated-midword` | 用户输入截断必须落在分隔符上（这轮加） |

`field-truncated-midword` 的判据设计要小心 —— 如果用「截断后的文本是否以标点结尾」，
会被模板补的句号骗过去（正是这个 bug 的表现）。所以判据改成
**直接查原文在 `body.length` 处那个字符是不是分隔符**：
切断了词，那个字符一定不是标点。

---

## 五、复算命令

```bash
# 1. 三处截断点
grep -n "slice(0," prototypes/_selection/prompt-copy.js

# 2. cleanField 修前/修后的对比
node -e "…用 102 字输入调 buildStylePrompt('S13',{biz:长输入})…"
#   修前：…店里有一面墙贴着每个产区的海。
#   修后：…夏天会加两款冷萃。

# 3. 字体链有没有误截
node -e "…对 35 案检查第一个中文字族的下标是否 ≥4…"
# 输出：（无输出 = 没有被截掉中文字族的案）

# 4. 变异
node prototypes/_build/check-prompts.mjs --selftest | tail -3
```
