/**
 * 二次解析：把字族里的 CSS 变量引用还原成真实字体名，并产出供提示词直接执行的确定性字段。
 *
 * 第一版抽取出 "var(--f-text), var(--f-mono)" 这种结果 —— 那是变量名不是字体名，
 * 直接写进提示词等于没写（AI 不认识 --f-text）。必须回 :root 查值。
 *
 * 同时把 DNA 压成"给 AI 看的紧凑形态"：
 *   palette（主色优先，最多 7 个 hex，带语义）/ fonts（结构化 display·body·mono）/
 *   geometry（圆角·阴影·线宽）/ mechanism（机制句原文，有则用）
 *
 * ── 2026-10-26 修 4 个被独立复算证实的 P0（都出在本文件的输出上）─────────────
 * P0-1 圆角不可执行：原来把 r.radii 原样 join(" / ")，于是 30 案里 9 案吐出
 *      "未声明"、5 案吐出 "0 / 50%" 这种抽取记号、21 案在提示词里被拼成双句号。
 *      → 改成 radiusVerdict()：只有回 CSS 里把 border-radius 的**语义**读出来，
 *        才能给出可执行的一句话（全直角 / 只有圆点是 50% / 只有圆角没有方角）。
 * P0-2 标题字体错 7/30：原来 prompt-copy 取 fonts[0] 当标题，那是按抽取顺序猜的。
 *      → 这里补 fonts.display/body/mono，取值必须来自 h1 规则的 font-family（展开 var），
 *        没有 h1 规则才回落到 h1 的 class 规则（S03 的 .d1）或 body。
 * P0-3 CSS 注释混进字体名：S07 的 @font-face 写的是
 *      `font-family:"IBM Plex Mono" /* taste-skill-ignore: ... *\/;`
 *      抽取正则把注释一起吞了，提示词里出现 "IBM Plex Mono\" /* taste-skill-ignore…"
 *      → 读 CSS 的第一件事就是剥注释（css.replace(/\/\*[\s\S]*?\*\//g, "")），
 *        并且对 raw.json 里已有的脏字族名再洗一遍（raw 是上游产物，不能再改）。
 * P0-4 调色板被前 5 色截断：S19 的主色 #4A5C3A、S24 的主色 #5D43AD 都在 :root 第 6 位，
 *      被 slice(0,5) 切掉，提示词变成「配色只用这几个值：5 个纸色」—— 主色整个丢了。
 *      → pickPalette() 先认主色（注释含主色/强调、变量名含 primary/accent/green/grape），
 *        再按声明顺序补足，上限放宽到 7。宁可多给两个色，不能让主色丢。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/* 仓库根：从脚本自身位置推导，不再硬编码。
 * 原实现写死 "D:/Web/style"（本机绝对路径），克隆到任何别的路径都会立刻失败；
 * 而 prompts.js 是 tracked 的构建产物，读它的人有权复算它。 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const P = join(ROOT, "prototypes");
const raw = JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/dna-raw.json"), "utf8"));

/* 注释必须最先剥。用 `\/\*[\s\S]*?\*\/` 而不是贪婪版：后者会把两个注释之间的
 * 整段 CSS 一起吃掉（S07 的 :root 会被吞掉，字族直接归零）。 */
const CSS_COMMENT_RE = /\/\*[\s\S]*?\*\//g;

const GENERIC = /^(serif|sans-serif|monospace|system-ui|ui-[a-z]+|cursive|fantasy|inherit|initial|unset|revert)$/i;
/* 等宽识别。注意别把 "Monospace" 当族名 —— 它在 GENERIC 里，只会出现在栈尾。 */
const MONO_RE = /(mono|courier|consolas|typewriter|vt323|overprint|fragment|martian|jetbrains|sometype|departure)/i;

function stripComments(css) {
  return css.replace(CSS_COMMENT_RE, "");
}

/* 圆角/线宽的数字处理：只保留两位小数，避免 calc 乘出 1.7999999999999998 这种值。 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/* 取 :root 的声明，连同它自己的注释一起带出来。
 * 为什么不用 extract-dna 的 colors：那个只有 name+hex，把「主色」这条最关键的语义丢了
 * （S19 的 --green 注释只写「蚀刻墨绿」，主色其实写在文件头；S24 的 --grape 注释里写着主色）。
 * 这里读两处：:root 声明行上的注释 + 全文件注释里「主色 / 强调」附近的 hex。 */
function rootDecls(rawCss) {
  const out = [];
  const blocks = [...rawCss.matchAll(/:root\s*\{([\s\S]*?)\}/g)].map(function (m) { return m[1]; });
  for (const block of blocks) {
    const re = /\/\*([\s\S]*?)\*\/|(--[\w-]+)\s*:\s*([^;]+);/g;
    let m;
    let pending = ""; // 声明**前面**的注释（S24 的 /* 纸与墨 */ 这种分组注释）
    while ((m = re.exec(block))) {
      if (m[1] !== undefined) { pending = m[1]; continue; }
      const name = m[2];
      const value = m[3].trim();
      /* 声明**后面**紧跟的注释（绝大多数「主色」都写在这里）。
       * 读完之后必须把 re.lastIndex 推到注释末尾 —— 第一版漏了这一步，
       * 于是「--gold /* 暗金＝主色与纹样 *\/」的注释在下一轮又被当成 pending，
       * 粘到了 --ivory 上：S02 把象牙白、S12 把洋红、S15 把 press 全标成了主色。
       * 这是 7 个案子主色判错的真因，不是判据本身的问题。 */
      const tailMatch = block.slice(re.lastIndex).match(/^[ \t]*\/\*([\s\S]*?)\*\//);
      if (tailMatch) re.lastIndex += tailMatch[0].length;
      const note = ((pending ? pending + " " : "") + (tailMatch ? tailMatch[1] : "")).replace(/\s+/g, " ").trim();
      const hex = (value.match(/#[0-9A-Fa-f]{6}\b/) || [])[0] || "";
      out.push({ name: name, value: value, note: note, hex: hex.toUpperCase() });
      pending = "";
    }
  }
  return out;
}

/* 注释正文里「主色 / 强调」旁边的 hex。
 * 两个方向都要看，但方向不同、距离阈值不同 —— 这是被 S27 教出来的：
 *   "背景 #E8D7B5 48% ｜ 主色 #0E6258 30%" 里背景色离「主色」只有 7 个字符，
 *   一刀切按距离取会把背景当主色；而真正的规则是「主色」**后面**那个才是主色，
 *   「主色」**前面**的只有在中间没有 ｜ 分隔符时才算（S19 的 "#4A5C3A 蚀刻墨绿（主色"）。
 * 已知漏网：S05/S10 那种 "漆面绿 #4FA83D 18%（主色与读数" 中间夹了百分比，
 * 按 ｜ 规则放不进来 —— 但这两案的该色本来就在声明顺序前 2 位，不会丢，故不加宽。
 */
function prosePrimaries(rawCss) {
  const hits = [];
  const re = /\/\*([\s\S]*?)\*\//g;
  let m;
  while ((m = re.exec(rawCss))) {
    const body = m[1];
    const hexes = [];
    const hexRe = /#[0-9A-Fa-f]{6}\b/g;
    let h;
    while ((h = hexRe.exec(body))) {
      hexes.push({ hex: h[0].toUpperCase(), start: h.index, end: h.index + h[0].length });
    }
    const kws = [];
    const kwRe = /主色|强调|primary|accent/gi;
    let k;
    while ((k = kwRe.exec(body))) kws.push({ start: k.index, end: k.index + k[0].length });
    for (const kw of kws) {
      for (const x of hexes) {
        const after = x.start - kw.end;
        if (after >= 0 && after <= 8) {
          // "主色作按钮底时白字 #FFFFFF"：讲的是字色，跳过（S22/S23 实测踩到）
          if (/^(作|填充|压|的)?[^，。；]{0,6}白字/.test(body.slice(kw.end, x.start))) continue;
          hits.push(x.hex);
          continue;
        }
        if (x.end <= kw.start) {
          const gap = body.slice(x.end, kw.start);
          /* 中间只能是「留白 / ＝ / 色名 / 百分比」这类紧贴的修饰语。
           * 出现 ；：，对 说明是另一句（S06 的 "正文 #241A12 对纸 12.85:1；主色 #85572A"
           * 就靠这条把正文墨排掉，否则主色会被判成墨色）。 */
          if (gap.length <= 12 && !/[｜|；;：:，,、对]/.test(gap) && !/#/.test(gap)) hits.push(x.hex);
        }
      }
    }
  }
  return hits;
}

/* 把 var(--x) 递归展开。深度设上限是因为这批 CSS 里 --f-body:var(--f-latin),var(--f-cjk)
 * 这种链式引用很常见，但不排除有人写出环 —— 环会让脚本直接栈溢出，生成链就断了。 */
function resolveVars(value, vars, depth) {
  if (depth > 6 || value.indexOf("var(") < 0) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, function (all, name, fallback) {
    if (vars[name]) return resolveVars(vars[name], vars, depth + 1);
    return fallback || "";
  });
}

function splitStack(value) {
  const out = [];
  for (const part of value.split(",")) {
    const name = part.trim().replace(/^["']|["']$/g, "").replace(/["']/g, "").trim();
    if (name) out.push(name);
  }
  return out;
}

/* 字体栈 → 第一个真实族名（跳过 serif / sans-serif / monospace 这类通用族）。
 * 提示词里写通用族等于没写，AI 会直接回退成系统默认无衬线 —— 这正是要防的。 */
function firstFamily(value, vars) {
  const stack = splitStack(resolveVars(value || "", vars, 0));
  for (const name of stack) {
    if (!GENERIC.test(name)) return name;
  }
  return stack.length ? stack[0] : "";
}

/* 字体栈 → **完整兜底链**，只去掉通用族。
 *
 * 2026-10-26 补：只输出 firstFamily 会丢掉中文兜底，这是独立验证 Agent 实测抓到的。
 * S07 的真实声明是：
 *   --display:"Libre Franklin","WenJin Mincho","文津宋体","Source Han Serif SC",
 *             "Noto Serif CJK SC","Songti SC",SimSun,serif;
 * 而提示词只写「标题用 Libre Franklin」——Libre Franklin 没有任何中文字形，
 * 验证 Agent 照提示词实现后，CDP 的 CSS.getPlatformFontsForNode 显示
 * h1 由 SimSun 画字（21 个字形），即"指定的字体一个中文字都没画"。
 * 这不是 AI 不听话，是**提示词只给了半个字体栈**。
 * 修法：保留整条链（去掉 serif/monospace 这类通用族，它们对 AI 无信息量）。
 * 上限 4 个：再长就是噪声，且前三个几乎总能覆盖拉丁+CJK+兜底。
 */
function fullStack(value, vars, max) {
  const stack = splitStack(resolveVars(value || "", vars, 0)).filter(function (n) {
    return !GENERIC.test(n);
  });
  const lim = max || 4;
  return stack.slice(0, lim);
}

/* 从 :root 的语义变量里取完整字体栈。
 *
 * 为什么优先变量而不是 h1 规则：作者在 `--display` 里写的是**完整兜底链**
 * （S07 的 `--display` 带 WenJin Mincho / 文津宋体 / Source Han Serif SC 三级中文兜底），
 * 而 h1 规则里通常只写 `var(--display)`，展开后虽也能拿到同样的链，
 * 但只要作者在 h1 上覆盖成单个族名（S19 就是 `font-family:"Spectral",...`），
 * 规则路径就会漏掉中文兜底。变量名按语义优先级排序匹配：先 display/disp，再 serif。
 *
 * 2026-10-26 补两条实测坑：
 *  1) S04 的 h1 是 `font-family:var(--f-cjk)` —— 变量名叫 f-cjk，既不是 display 也不是 text，
 *     原正则匹配不到，于是去 dominantStack 拿了出现最多的那条，结果是 `Unbounded`（它的拉丁标题体），
 *     而 h1 实际画字的是 `var(--f-cjk)`（中文族）。⇒ 变量名匹配必须包含 cjk/cn/zh 这一族。
 *  2) S01 的 h1 没有任何 font-family 规则，走 body 继承，而 body 用的是 `--f-text`。
 *     ⇒ 当 display 侧找不到时，**回落到 body 栈**，而不是去全文件找出现最多的那条
 *     （全局最多的那条往往是等宽体，那是编号用的，不是标题用的）。
 */
function stackFromVars(decls, vars, keys, max) {
  for (const key of keys) {
    /* 每个 key 必须只匹配**它自己那一族**的变量名。
     * 上一版对非 display 的 key 一律用同一个宽正则（text|body|serif|sans|cn|cjk|zh|latin|face），
     * 于是 ["latin"] 也会匹配到 `--f-cn`（因为正则里也含 cn），返回 LXGW 而不是 Syne ——
     * S09 的 Syne 就是这样消失的。改成按 key 构造窄正则。 */
    const re = new RegExp("--[\\w-]*(?:" + key + ")", "i");
    const hit = decls.find(function (d) { return re.test(d.name.toLowerCase()); });
    if (hit && hit.value) {
      const st = fullStack(hit.value, vars, max);
      if (st.length) return st;
    }
  }
  return [];
}

/* 没有语义变量时的兜底：直接从 h1（或 body）规则的 font-family 原文取整条链。
 * S30 就是这种案子——它一个字体变量都没有，h1 里写的是
 *   `font-family: "Anton", "Zhuque Fangsong", Georgia, serif;`
 * 只输出 "Anton" 的话，提示词就漏掉了 Zhuque Fangsong 这个**唯一能画中文的族**，
 * 而 Anton 没有任何中文字形（验证 Agent 实测它回退到了 Noto Sans SC）。
 */
function stackFromRules(rules, vars, isDisplay, max, h1ClassList) {
  var pick = [];
  if (isDisplay) {
    pick = rules.filter(function (r) { return groupsBareH1(r.selector); });
    /* S03 的 h1 是 `<h1 class="d1">`，字族写在 `.d1` 规则里，没有裸 h1 规则。
     * 原实现只找裸 h1，抓不到就掉进 dominantStack（拿到等宽体）。
     * 这里补一条：按 h1 的 class 去匹配 `.cls` 开头的规则。 */
    if (!pick.length && h1ClassList && h1ClassList.length) {
      for (const cls of h1ClassList) {
        const hit = rules.filter(function (r) { return groupsBareClass(r.selector, cls); });
        if (hit.length) { pick = hit; break; }
      }
    }
  } else {
    pick = rules.filter(function (r) {
      return selectorGroups(r.selector).some(function (g) { return /^body$/i.test(g); });
    });
  }
  if (!pick.length) return [];
  const raw = pick[pick.length - 1].value;
  /* 关键：h1 规则若写的是 `font-family: var(--f-cjk)`，要先展开这个变量再拆栈。
   * S04 就是这种写法——原实现走 dominantStack 拿到全局出现最多的 `Unbounded`（它的拉丁标题体），
   * 而 h1 真正画的是 `--f-cjk`（中文族）。先解析 var 就能拿对。 */
  const vm = raw.match(/var\(\s*(--[\w-]+)\s*\)/);
  if (vm && vars[vm[1]]) {
    const resolved = fullStack(vars[vm[1]], vars, max);
    if (resolved.length) return resolved;
  }
  return fullStack(raw, vars, max);
}

/* 上面两条路都空时的最后兜底：拿整份 CSS 里**出现次数最多的 font-family 栈**。
 * S03 就是这种案子：它的 h1 是 `<h1 class="d1">`，而 .d1 规则只在 @media 里给了字号、
 * 没给字族；字族来自别处（body 或某个包装类），`groupsBareH1` 与 `body` 两条都抓不到，
 * 于是 displayStack 是空数组，提示词里就只有第一个族名 "IBM Plex Mono"
 * ——恰好是它最不该当标题的那个（等宽体）。宁可给一条真实存在的栈，也不要空。
 */
function dominantStack(rawCss, vars, max) {
  const counts = new Map();
  const re = /font-family\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(rawCss))) {
    const st = fullStack(m[1], vars, max);
    if (st.length) {
      const key = st.join("|");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  if (!counts.size) return [];
  const best = [...counts.entries()].sort(function (a, b) { return b[1] - a[1]; })[0][0];
  return best.split("|");
}

/* 逐条规则走一遍，拿到「选择器 → 声明块 → 所处的条件组」。
 * 为什么不用 /([^{}]+)\{([^}]*)\}/ 这种一把梭：@media 会把花括号嵌套进来，
 * 一把梭的结果是把 @media 的头部当选择器、把里面第一条规则当声明块，
 * 于是媒体查询里的 h1 字体覆盖就永远读不到。
 *
 * ⚠️ 2026-10-29 修：原实现把「条件组里的规则」报了**两遍** ——
 * 平扫这一层按 `media` 形参（顶层是 null）报一次，`}` 处再递归进去带着条件报一次。
 * 对 familyRules 无害（重复项被后者覆盖），但对任何按条件过滤的消费端是致命的：
 * 一个只在 `@media (max-width:1023px)` 成立的 `border-top-width: 7px`，
 * 会以 media=null 的身份混进"桌面真值"。实测 S13 的 7px 就是这么进来的。
 * 改成单遍：条件组不递归、也不上报；规则所属的条件从**当前栈**里取最内层 @ 块，
 * 层层叠加（嵌套媒体 = 合取，conditionApplies 会把所有 min/max 一起判）。
 */
function eachRule(css, cb) {
  let i = 0;
  const n = css.length;
  let selStart = 0;
  const stack = [];
  /* 栈顶向内收集条件组，由内到外拼成一句 —— 顺序无关，因为判据是「所有约束都成立」。 */
  const condOf = function () {
    const parts = [];
    for (const s of stack) if (/^@/.test(s.sel)) parts.push(s.sel);
    return parts.length ? parts.join(" and ") : null;
  };
  while (i < n) {
    const ch = css[i];
    if (ch === "{") {
      stack.push({ sel: css.slice(selStart, i).trim(), bodyStart: i + 1 });
      selStart = i + 1;
    } else if (ch === "}") {
      const top = stack.pop();
      if (top) {
        const body = css.slice(top.bodyStart, i);
        /* 条件组自己不上报，只当容器；它的规则在平扫这一层各自上报一次。 */
        if (!/^@/.test(top.sel)) cb(top.sel, body, condOf() || null);
      }
      selStart = i + 1;
    } else if (ch === ";" && !stack.length) {
      selStart = i + 1;
    }
    i++;
  }
}

/* 把一条条件组（@media / @supports …）按「审查视口 1440px」判真伪。
 *
 * 为什么要有它：30 案的断点几乎全是 `max-width: 1439 / 1023 / 899 / 767`，
 * 在 1440 视口下**一个都不成立**，所以 `max-width` 里的线宽不是桌面真值。
 * 但 S02/S10/S17 还写了 `min-width: 1440px`，那条在 1440 下**是成立的** ——
 * 不能一刀切把"带媒体条件"全判成窄屏，否则会把真值删掉。
 * 判不了的（prefers-reduced-motion / print / forced-colors / 未知特性）一律判 false：
 * 它们不是桌面首屏的常态，宁可少算也不要把降级态/打印态的线宽写进提示词。
 *
 * 实测边界（30 案逐个核对过，见 probes-a/a05）：
 *   · `@media (min-width: 1440px)`          → true（S02/S10/S17 各有一条）
 *   · `@media (min-width:1024px) and (max-width:1439px)` → false（1439 上限不含 1440）
 *   · `@media (max-width: 1439px)`          → false
 *   · `@media (prefers-reduced-motion)`     → false
 *   · `@supports (animation-timeline: …)`   → true（渐进增强，不是断点）
 */
function conditionApplies(cond, viewport) {
  const w = viewport || 1440;
  if (!cond) return true;
  /* @supports / @layer / @container：不是视口条件，30 案里也不含线宽/字号声明，
   * 按"成立"处理（@supports 是渐进增强，作者写它就是希望生效）。 */
  if (/^@(supports|layer|container)/i.test(cond)) return true;
  if (/prefers-reduced-motion|prefers-color-scheme|prefers-contrast|\bprint\b|forced-colors|hover\s*:|pointer\s*:|any-hover|any-pointer/i.test(cond)) return false;
  const min = cond.match(/min-width\s*:\s*[0-9.]+px/gi) || [];
  const max = cond.match(/max-width\s*:\s*[0-9.]+px/gi) || [];
  if (!min.length && !max.length) return false;
  for (const m of min) if (w < parseFloat(m.replace(/[^0-9.]/g, ""))) return false;
  for (const m of max) if (w > parseFloat(m.replace(/[^0-9.]/g, ""))) return false;
  return true;
}

function familyRules(cleanCss) {
  const rules = [];
  eachRule(cleanCss, function (sel, body) {
    const m = body.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/);
    if (m) rules.push({ selector: sel, value: m[1].trim() });
  });
  return rules;
}

function selectorGroups(sel) {
  return sel.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }).filter(Boolean);
}

/* 该选择器组里是否有一条**裸 h1**（h1 / h1.class / h1:hover 都算，.masthead h1 不算）。 */
function groupsBareH1(sel) {
  return selectorGroups(sel).some(function (g) {
    return /^h1(?![a-z0-9-])/i.test(g);
  });
}

/* 任意一条组里出现 h1 元素（含 .masthead h1 这种后代写法）—— 只在没有裸规则时才用。 */
function groupsTouchH1(sel) {
  return selectorGroups(sel).some(function (g) {
    return /(^|[\s>+~])h1(?![a-z0-9-])/i.test(g);
  });
}

/* h1 的字体（CSS 层叠里最后一条生效，所以取最后一条带 font-family 的规则）。
 * 优先级：裸 h1 规则 → 带 h1 的后代规则 → h1 自己的 class 规则（S03 的 <h1 class="d1">，
 * 它的标题字体写在 .d1 上，没有任何 h1 选择器）→ body。
 * 实测对照过的 7 案：S04 LXGW WenKai / S06 EB Garamond / S08 Gloock / S10 Jost /
 * S18 Glow Sans SC / S19 Noto Serif SC / S23 Noto Serif SC，全部由这条链复现。 */
function h1Family(rules, vars, h1ClassList) {
  const bare = rules.filter(function (r) { return groupsBareH1(r.selector); });
  if (bare.length) {
    const v = firstFamily(bare[bare.length - 1].value, vars);
    if (v) return v;
  }
  const touch = rules.filter(function (r) { return groupsTouchH1(r.selector); });
  if (touch.length) {
    const v = firstFamily(touch[touch.length - 1].value, vars);
    if (v) return v;
  }
  for (const cls of h1ClassList) {
    const hit = rules.filter(function (r) { return groupsBareClass(r.selector, cls); });
    if (hit.length) {
      const v = firstFamily(hit[hit.length - 1].value, vars);
      if (v) return v;
    }
  }
  return "";
}

function groupsBareClass(sel, cls) {
  return selectorGroups(sel).some(function (g) {
    return new RegExp("^\\." + cls.replace(/[-_]/g, "\\$&") + "(?![\\w-])", "i").test(g);
  });
}

function bodyFamily(rules, vars) {
  const hit = rules.filter(function (r) {
    return selectorGroups(r.selector).some(function (g) { return /^body$/i.test(g); });
  });
  if (!hit.length) return "";
  return firstFamily(hit[hit.length - 1].value, vars);
}

/* mono 的来源：:root 里名字含 mono / num / figure / term 的变量优先（那是作者自己命名的语义），
 * 没有再扫全文件找等宽栈。两个都空就返回 ""，提示词里就不写等宽那句，
 * 而不是编一个等宽字体 —— S25 这种真的没有等宽字体的案子不能被强塞一个。 */
function monoFamily(decls, rules, vars) {
  const named = decls.filter(function (d) {
    return /(mono|--num|figure|term|code)/i.test(d.name) && d.value;
  });
  for (const d of named) {
    const v = firstFamily(d.value, vars);
    if (v && !/^(monospace|ui-monospace)$/i.test(v)) return v;
  }
  for (const r of rules) {
    if (MONO_RE.test(r.value) || /monospace/i.test(r.value)) {
      const v = firstFamily(r.value, vars);
      if (v && MONO_RE.test(v)) return v;
    }
  }
  return "";
}

/* ── 圆角 ──────────────────────────────────────────────────────────────
 * 判据来自 CSS 实际声明，不看抽取数组：raw.json 的 radii 只留了**出现过的字面值**，
 * 但它没法回答「0 和 50% 分别用在哪」。30 案实测只有 4 种形态：
 *   · 一处 border-radius 都没有（S04/S07/S08/S21）→ 全站直角，这是设计决定，不是缺数据
 *   · 只有 0（大多数案）→ 全直角
 *   · 0 与 50% 并存（S05/S14/S16/S17）→ 卡片方角，圆点/圆形徽标是 50%
 *   · 只有 50%（S25）→ 唯一的圆角是 1.6px 圆点，其余不带圆角
 * 之前的 "未声明" / "0 / 50%" 两种输出都是把抽取过程暴露给用户，AI 无法执行。
 */
function radiusVerdict(cleanCss) {
  const values = [...cleanCss.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map(function (m) { return m[1].trim(); });
  const tokens = new Set();
  for (const v of values) {
    for (const partOfSlash of v.split("/")) {
      for (const t of partOfSlash.trim().split(/\s+/)) {
        if (t) tokens.add(t.toLowerCase());
      }
    }
  }
  const list = [...tokens];
  const isZero = function (t) { return /^0(px|rem|em|%)?$/.test(t); };
  const zeros = list.filter(isZero);
  const halves = list.filter(function (t) { return t === "50%"; });
  const others = list.filter(function (t) { return !isZero(t) && t !== "50%"; });

  if (!values.length) return { text: "全直角 0", bare: true, evidence: "该案 CSS 里 0 处 border-radius，所有元素一律直角" };
  if (zeros.length && !halves.length && !others.length) return { text: "全直角 0", bare: true, evidence: "border-radius 只出现过 0" };
  /* 只有 50%（S25）：实测那唯一的 50% 是 `width:1.6px;height:1.6px;border-radius:50%` 的**打孔圆点**，
   * 全站再没有任何一处带圆角。原实现以「圆形（50%）」开头 —— 首因位置给出错误指令，
   * AI 会读成"这一版式的特征是圆"，然后做出满页圆角。批判 Agent 实测抓出这条。
   * 改成：主句先说全站方角，50% 降级成括号里的例外并写明宿主。
   * 与 L310 的「全站方角，仅…为 50%」是同一种句式 —— 首词永远是"全站"，不给误读留缝。 */
  if (halves.length && !others.length && !zeros.length) return { text: "全站方角 0；唯一直径 50% 的地方是 1–2px 的打孔圆点，不是圆角卡片", bare: true, evidence: "border-radius 只出现过 50%，且宿主是 1.6px 的圆点" };
  if (halves.length && zeros.length && !others.length) return { text: "全站方角，仅圆形徽标/圆点为 50%", bare: false, evidence: "border-radius 为 0 与 50% 并存" };
  return { text: "圆角只有 " + list.join("、") + " 这几档，按元素语义取用，不要自创新档", bare: false, evidence: "border-radius 取值：" + list.join("、") };
}

/* ── 线宽 ──────────────────────────────────────────────────────────────
 * raw.json 的 lineWidths 是 `/border: ([0-9.]+)px/` 抽出来的，读不到两种真实写法：
 *   S27 的 `border: var(--mis) solid var(--green)`（--mis:1.8px）
 *   S27 的 `border-left: calc(var(--mis) * 2)`（3.6px）
 * 于是 S27 抽出空数组，提示词里出现「5. 线宽只用这几级：未声明」。
 * 这里先展开 var，再把 calc(Npx * M) 算掉，最后统一成 "1px、2px、4px"。
 *
 * ⚠️ 2026-10-26 补：**必须同时抽 SVG 的 stroke-width**。
 *   原正则只覆盖 border 与 outline，而很多案的"线条"其实是 inline SVG 描边。
 *   S19 是最硬的例子：第 5 条对 AI 说「线宽只用 1px、3px」，而它的签名机制句说
 *   「线宽只 0.4 与 0.8px」（`style.css:297-298` 的 `.e4{stroke-width:.4}` / `.e8{stroke-width:.8}`，
 *   蚀刻靠这两级描边分层）。两套线宽交集为空，AI 必然违反其中一条 ——
 *   照第 5 条做则风格签名失效，照机制句做则"自创第三级"。
 *   这个缺陷对原验收脚本完全隐形：verify-p0.mjs 只查 indexOf("未声明")。
 *   由独立验证 Agent 抓出（报告 §2 漏项 1）。
 *
 * ⚠️ 2026-10-29 第六次修（本文件）：抽取值仍然系统性偏少，四个独立缺陷叠在一起。
 *   1) **只读 style.css，不读 index.html**。19/30 案的描边写在 HTML 的 SVG 属性里：
 *      S25 的装订线 `stroke-width="1.2"`（index.html:35,106）、8 条 leader="2"、
 *      2 个图标="1"；S27 的 9 个 .8 与 3 个 1.6；S30 的 1.6/2。一个都抽不到，
 *      于是 S25 的提示词只剩「3px」，而它的签名机制（骑马钉装订线）是 1.2 —— 风格签名整段丢失。
 *   2) **属性覆盖面太窄**：漏 `column-rule`（S07 的 `.toc{column-rule:.5px}`，
 *      即"目录栏间的那条竖线"，是真实的版式线宽）、漏 `border-block`/`border-inline`
 *      这类逻辑属性简写。
 *   3) **不区分 @media**：`@media (max-width:899px){.thread path{stroke-width:3}}` 里的
 *      3 被当成桌面值（S25）；S27 的 `--mis` 在 `@media (max-width:819px)` 的 `:root` 里
 *      被改成 1.2，于是桌面 `border-left: var(--mis)` 被算成 1.2、`calc(--mis*2)` 算成 2.4 ——
 *      提示词里那两个"窄屏值"就是这么来的。
 *   4) **0.5px"去重"把真实档位吃掉**：S25 的 1 与 1.2 差 0.2 被合并 → 只剩 1px；
 *      S09 的 3.5 与 3.6 同理 → 只剩 3.5px。而"1 与 1.2 是两级"恰恰是这两案的签名
 *      （装订线多少、蚀刻描边多细）。一个出于好意的小优化制造了 7/30 案的缺陷。
 *
 * 现在的口径（写进注释是为了下一轮不要又"优化"回去）：
 *   · **桌面视口 = 1440px**（与仓库审查视口一致）。`@media (max-width: 1439/1023/…737/899)`
 *     在 1440 下不成立，里面的线宽不算桌面真值；`@media (min-width: 1440px)` 成立，算。
 *     `prefers-reduced-motion` / `print` / `forced-colors` 一律不算 —— 那是降级态与打印态。
 *   · 变量只取「桌面作用域」的 `:root`（见 topVars）。修 bug 3) 必须如此，否则 S27 又漂回 1.2。
 *   · 去重只去**完全相等**的值（round2 后），不再按 0.5px 合并。
 *   · 0 / none / hidden 不算；注释里的不算（入口已 stripComments 剥过）。
 */
const WIDTH_DECL_RE = /^(?:border|border-width|border-(?:top|right|bottom|left|block|inline)(?:-(?:width|start|end))?|outline|outline-width|column-rule|column-rule-width|stroke-width)$/i;

/* 把声明块切成 prop/value。不用 `([^;}]+)` 一把梭：值里可能带 data-URI（S12 的
 * `--stripe45: url("data:image/svg+xml,…stroke-width='5.66'…")`），用属性名白名单
 * 把 `--stripe45` 这类自定义属性挡在外面，才不会把纹理描边当成版式线宽。 */
function declsOf(body) {
  const out = [];
  for (const raw of String(body || "").split(";")) {
    const k = raw.indexOf(":");
    if (k < 0) continue;
    out.push({ prop: raw.slice(0, k).trim(), value: raw.slice(k + 1).trim() });
  }
  return out;
}

/* 一条线宽声明 → 若干 px 数值。
 * 单位只有两种合法写法：CSS 的 `Npx`，以及 SVG 的**裸数字**（`stroke-width:.4`
 * 是用户单位，不是 CSS 的"必须带单位"）。裸数字只对 stroke-width 放开，
 * 否则 `border: 1px solid` 里的颜色三元组会被误读成线宽。 */
function widthNumbers(value, isStroke) {
  let v = value;
  v = v.replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, function (all, a, b) {
    return round2(parseFloat(a) * parseFloat(b)) + "px";
  });
  v = v.replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, function (all, a, b) {
    return round2(parseFloat(a) * parseFloat(b)) + "px";
  });
  const out = [];
  for (const q of v.matchAll(/([0-9.]+)px/g)) {
    const n = parseFloat(q[1]);
    if (n > 0) out.push(round2(n));
  }
  if (isStroke) {
    const bare = v.match(/^\s*([0-9.]+)\s*$/);
    if (bare) {
      const n = parseFloat(bare[1]);
      if (n > 0) out.push(round2(n));
    }
  }
  return out;
}

/* 桌面作用域的 :root 变量表。
 * 与 rootDecls() 的区别只有一个：**跳过在桌面不成立的 @media 里的 :root**。
 * 为什么需要两份而不是改 rootDecls：rootDecls 还带着每条声明的注释，
 * palette/fonts/shadow 三项都靠它，动它会连带改掉那三项的输出（风险面不可控）。
 * 这里只给"线宽 + 标题字号"用，是刻意收窄影响面。
 * 注释先替换成等长空格再量区间，保证 :root 的 index 与原文对得上。 */
function topVars(rawCss) {
  const stripped = rawCss.replace(CSS_COMMENT_RE, function (m) { return " ".repeat(m.length); });
  const ranges = [];
  for (const m of stripped.matchAll(/@(media|supports|container|layer)([^{]*)\{/g)) {
    let d = 1, i = m.index + m[0].length;
    while (i < stripped.length && d > 0) {
      if (stripped[i] === "{") d++;
      else if (stripped[i] === "}") d--;
      i++;
    }
    ranges.push({ cond: ("@" + m[1] + m[2]).trim(), from: m.index, to: i });
  }
  const vars = {};
  for (const m of stripped.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    const ctx = ranges.find(function (r) { return m.index > r.from && m.index < r.to; });
    /* @supports 里的 :root 算"成立"（渐进增强，且 30 案无一是线宽/字号相关）；
     * @media 按 1440 视口判。判不了的一律不取 —— 宁可少算，也不要让窄屏值冒充桌面值。 */
    if (ctx && !conditionApplies(ctx.cond)) continue;
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  return vars;
}

/* ── 交互态选择器 ──────────────────────────────────────────────────────
 * 为什么必须把它从"线宽分级"里摘出去（这是本轮实测的核心结论）：
 *
 * 提示词第 5 条是「线宽只用这几级：…」，读它的 AI 会把这个列表当成**静态版式的
 * 描边层级**去照着画线。而 `:focus-visible{outline:3px}` 是焦点环 —— 用户不按 Tab
 * 就永远看不见它，它不是"版式线宽的一级"。
 *
 * 实测（deliverables/70-exec/probes-b/ghost-attribution.json，30 案逐值归因）：
 *   「声称了但静态页面上量不到」共 16 个值，其中 **9 个**正是交互态来的：
 *     S03 2 / S04 3 / S09 3 / S13 2 与 14.5 / S14 2 / S18 2 / S25 3 / S29 2
 *   全部是 `:focus-visible` 的 outline，或 `.clause:hover` 的 border-top-width。
 *
 * Lead 报的"最严重"的 S25（声称只用 3px、页面一次 3px 都没用）也是这一类：
 * 那 3px 就是 `:focus-visible{outline:3px solid var(--spot-b)}`（style.css:58），
 * 页面真实的线是 HTML 的 stroke-width="1.2" 与 .leader 的 2px。
 *
 * 只认「用户不交互就不成立」的五个伪类。刻意**不含** :link/:visited（正常链接恒成立）、
 * 也不含 :checked/:disabled（可以是首屏静态态），避免误删真正的静态规则。
 */
const INTERACTIVE_SEL_RE = /:(?:hover|focus|focus-visible|focus-within|active|target)\b/i;

/* 选择器组里**每一个**分支都带交互伪类，才算交互态规则。
 * 反例必须保留：`.card, .card:hover { border-top: 2px }` 对静态页面有贡献，
 * 只要有一个分支是静态的，这条规则就照收。 */
function selectorIsInteractiveOnly(sel) {
  const parts = String(sel || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  if (!parts.length) return false;
  return parts.every(function (p) { return INTERACTIVE_SEL_RE.test(p); });
}

/* ── 由状态类（不是伪类）表达的交互态 ─────────────────────────────────
 * 有些案的交互态不用 `:hover`，而是 JS 加一个类名。实测 S14：
 *   CSS  `.tag.is-cued { outline: 2px solid #12181D }`
 *   JS   `function cue(el){ … el.classList.add('is-cued') }`，只在点击目录项时调用。
 * 静态首屏没有 .is-cued，所以那 2px 在页面上量不到（probes-b/acceptance-after.json 的 S14）。
 *
 * 判据刻意保守，要求**同时**成立：
 *   ① CSS 里这个类的选择器里没有 :hover/:focus 等（否则 INTERACTIVE_SEL_RE 已覆盖）；
 *   ② HTML 里**没有一个元素**带这个类作为初始 class 属性；
 *   ③ JS 里出现过 `classList.add('该类')`。
 * 三条齐了才认定"这个类只能由脚本在运行时加"。少一条都不动，避免误删静态修饰类。
 */
function classIsRuntimeOnly(clsName, htmlRaw) {
  if (!clsName) return false;
  if (!/classList\.(?:add|toggle)\(\s*["']/.test(htmlRaw)) return false;
  const addRe = new RegExp("classList\\.(?:add|toggle)\\(\\s*[\"']" + clsName.replace(/[-_]/g, "\\$&") + "[\"']");
  if (!addRe.test(htmlRaw)) return false;
  /* ② 初始 class 属性里不能出现它。注意 `classList.add('x')` 的字面量不在 class="" 里，
   * 所以只扫 class 属性本身，不扫整份 HTML。 */
  for (const m of htmlRaw.matchAll(/\bclass\s*=\s*["']([^"']*)["']/g)) {
    if (m[1].split(/\s+/).indexOf(clsName) >= 0) return false;
  }
  return true;
}

/* 从选择器里抽出所有类名（不含伪类后缀） */
function selectorClasses(sel) {
  const out = [];
  for (const m of String(sel || "").matchAll(/\.([A-Za-z_][\w-]*)/g)) out.push(m[1]);
  return out;
}

function lineWidthVerdict(cleanCss, vars, htmlRaw, provenance) {
  const widths = new Set();
  /* 被排除的交互态取值单独留档：dna-clean.json 会存成 lineWidthsWhy，
   * 让下一个人能看到"为什么这级没了"，而不是以为抽取又漏了。
   * 仓库的教训是「结论不带依据，下一轮就会有人按自己的理解改回去」。 */
  const interactive = [];
  const note = function (n, src, sel, media) {
    widths.add(n);
    if (provenance) provenance.push({ n: n, decl: src, selector: sel, media: media || null });
  };

  /* ① CSS 规则：只认桌面成立的、且不属于交互态的。 */
  eachRule(cleanCss, function (sel, body, media) {
    if (media && !conditionApplies(media)) return;
    /* 交互态两种形态：伪类（:hover/:focus…）与运行时类（.is-cued，见 classIsRuntimeOnly） */
    const runtimeClass = htmlRaw
      ? selectorClasses(sel).find(function (c) { return classIsRuntimeOnly(c, htmlRaw); })
      : null;
    const interactiveOnly = selectorIsInteractiveOnly(sel) || !!runtimeClass;
    for (const d of declsOf(body)) {
      if (!WIDTH_DECL_RE.test(d.prop)) continue;
      /* `border: none` / `border-width: 0` / `outline: 0` —— 是"没有线"，不是第 0 级线宽。
       * 不排掉的话 S25 的 `border: 0`、S13 的 `border: 0` 会各贡献一个 0（已被 n>0 挡掉），
       * 但更麻烦的是 `border: 0 solid red` 这种带颜色的 0 —— 语义同样是"无线"。
       * 放在数值提取之前判，不依赖 n>0。 */
      if (/^(?:none|hidden|0)(?:\s|;|$)/i.test(d.value.trim())) continue;
      const resolved = resolveVars(d.value, vars, 0);
      /* 变量没解开就不要硬取：`var(--x)` 里一个 px 都没有，但 `var(--x) 3px` 会
       * 只取到 3px 而丢掉真正的那一级 —— 那是最难发现的一类漏讲，直接跳过整条更安全。 */
      if (/var\(/.test(resolved)) continue;
      for (const n of widthNumbers(resolved, /stroke-width$/i.test(d.prop))) {
        /* 交互态线宽（:hover/:focus-visible/:active 等）—— 2026-10-30 Lead 裁决：**保留**。
         *
         * 上一版（EXEC-B 的实现）把它们从分级里排除，理由是「非静态首屏线宽」。
         * 那个理由本身成立，但结论错了，三条实测依据：
         *
         *   1. **30/30 案的 `:focus-visible` 都定义了 outline**，而且用的是各案自己的
         *      主色 —— S01 `3px solid var(--red)`、S09 `3px solid var(--ink)`、
         *      S25 `3px solid var(--spot-b)`、S13 `2px solid var(--gold)`。
         *      这是有意的设计决策，不是偶然。排除它等于把这个设计决策从数据里删掉。
         *   2. 提示词要求 AI 做**键盘可用**的页面。把 focus 环的线宽从分级里抹掉，
         *      等于告诉 AI「这个案子只用 1px 和 2px 的线」，而用户按 Tab 时真的会
         *      看到一个 3px 的轮廓 —— 提示词与实现不一致，正是本闸门要抓的东西。
         *   3. S25 是最直接的反例：排除后它的 `lineWidths` 变成 "1px、1.2px、2px"，
         *      而规格里写明的核心线宽是 3px（只出现在 focus 环上）。提示词与规格打架。
         *
         * 正确做法是**保留数值，另标出处**：`lineWidths` 里照常出现，`lineWidthsWhy`
         * 里注明「其中 N 级来自交互态」。AI 拿到了完整分级，评审员能看到哪几级是
         * 交互态专有的。两边的信息都不丢。
         */
        if (interactiveOnly) {
          interactive.push({ n: n, decl: d.prop + ": " + d.value, selector: sel });
        }
        note(n, d.prop + ": " + d.value + (interactiveOnly ? "（交互态）" : ""), sel, media);
      }
    }
  });

  /* ② HTML 的 SVG 属性：`stroke-width="1.2"`。19/30 案的真实线宽在这里，一条都不在 CSS 里。
   * 注释里的（教学示例）与 <script> 里的（JS 模板串）不算；data-URI 里的是纹理，也不算。
   *
   * ⚠️ 还要排掉 <pattern>/<clipPath>/<mask>/<marker>/<filter> 里的 stroke-width：
   *   它们是**填充图案/遮罩**，不是版式线条。实测（probes-b/html-stroke-reachability.json）
   *   30 案里只有 S20 的 `pattern#grid8 > path stroke-width="0.2"` 属于这类 ——
   *   0.2px 是 8px 点阵网格的线，把它写进「线宽只用这几级」会让 AI 去画 0.2 的版式线。
   *   注意不能一刀切"在 <defs> 里就不算"：S19 的 0.4/0.8 就在 <defs><symbol> 里，
   *   但被 26 个 <use> 引用，是真实的蚀刻线。所以只排这五种容器。 */
  if (htmlRaw) {
    const blank = function (m) { return " ".repeat(m.length); };
    const html = htmlRaw
      .replace(/<!--[\s\S]*?-->/g, blank)
      .replace(/<script\b[\s\S]*?<\/script>/gi, blank);
    /* 把五种纹理容器的**整段**抹成等长空白。手写配对扫描而不是正则：
     * `<(pattern)[^>]*>[\s\S]*?</\1>` 在容器嵌套（<pattern> 里再包 <mask>）时会截错。
     * 只记录区间，最后统一替换 —— 区间映射回原文，match.index 才对得上。 */
    const TEXTURE_TAG = /^(pattern|clippath|mask|marker|filter)$/i;
    const intervals = [];
    {
      let tag = null, d = 0, start = 0;
      for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g)) {
        const t = m[2].toLowerCase();
        if (!tag) {
          if (!m[1] && TEXTURE_TAG.test(t) && !m[4]) { tag = t; d = 1; start = m.index; }
        } else if (t === tag) {
          if (m[1]) d--; else if (!m[4]) d++;
          if (!d) { intervals.push([start, m.index + m[0].length]); tag = null; }
        }
      }
    }
    const textureDropped = [];
    for (const m of html.matchAll(/stroke-width\s*=\s*["']?([%0-9.]+)(?:px)?["']?/gi)) {
      const around = html.slice(Math.max(0, m.index - 240), m.index);
      if (/data:image\/(?:svg\+xml|png|jpeg)/i.test(around)) continue;
      let raw = m[1];
      try { raw = decodeURIComponent(raw); } catch (e) { /* %27 之类的坏串就丢掉 */ }
      const n = parseFloat(raw);
      if (!(n > 0)) continue;
      /* 落在纹理容器区间里的 → 不进分级，但留档 */
      if (intervals.some(([a, b]) => m.index >= a && m.index < b)) {
        textureDropped.push({ n: round2(n), decl: 'html stroke-width="' + m[1] + '"' });
        continue;
      }
      note(round2(n), 'html stroke-width="' + m[1] + '"', "(index.html)", null);
    }
    if (textureDropped.length) {
      for (const x of textureDropped) {
        interactive.push({ n: x.n, decl: x.decl + "（<pattern>/<mask> 等纹理容器内）", selector: "纹理，不是版式线" });
      }
    }
  }

  /* ③ 脚本在运行时设的 stroke-width。这是上一步漏掉的最后一类来源。
   *
   * 实测证据（probes-b/acceptance-after.json）：
   *   S03 的读数栅格整块是 JS 画的 —— `line(major ? 176 : 208, y, 264, y, major ? 1.5 : 1)`，
   *   主刻度 1.5px / 次刻度 1px。CSS 里没有 1.5，HTML 属性里也没有，
   *   于是提示词声称 [1, 1.2] 而页面主要线宽是 1.5（出现 17 次，≥10 次的门槛）。
   *   这正是"主要线宽漏讲"里唯一剩下的那一案。
   *
   * 做法刻意保守：只认**同一行/近邻行**里同时出现
   *   `setAttribute("stroke-width", X)` 与数值，或 `... stroke-width: X` 的模板串。
   * 不做通用 JS 求值 —— 那是另一个量级的工程，且会把噪声带进设计分级。
   * 宁可漏一个值（记为已知限制），也不要编造一个。
   */
  if (htmlRaw) {
    const scriptBodies = [];
    for (const m of htmlRaw.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) scriptBodies.push(m[1]);
    const jsSeen = [];
    for (const js of scriptBodies) {
      /* (a) 直接写字面量：setAttribute("stroke-width", 1.5) */
      for (const m of js.matchAll(/setAttribute\(\s*["']stroke-width["']\s*,\s*([0-9.]+)\s*\)/g)) {
        const n = parseFloat(m[1]);
        if (n > 0) jsSeen.push({ n: round2(n), how: 'setAttribute("stroke-width", ' + m[1] + ")" });
      }
      /* (b) 变量形态：某行赋值 + 三元/字面量。只取"赋值行的右侧常量"与
       *     "调用了带 stroke-width 的函数时传入的常量"，都要求同一行可读。 */
      for (const line of js.split("\n")) {
        if (!/stroke-width/i.test(line)) continue;
        const vars = [...line.matchAll(/([0-9.]+)/g)].map((x) => parseFloat(x[1]));
        /* 排除明显不是线宽的：颜色 #hex（CSS 里不会有，但 JS 里可能有）、坐标 */
        if (/setAttribute\(\s*["']stroke-width["']\s*,\s*[0-9.]+\s*\)/.test(line)) continue; // 已由 (a) 收
        if (vars.length === 1) {
          const n = vars[0];
          if (n > 0 && n <= 24) jsSeen.push({ n: round2(n), how: "JS: " + line.trim().slice(0, 70) });
        }
      }
    }
    /* (c) 调用点回溯：`line(x1,y1,x2,y2,major ? 1.5 : 1)` —— 参数名 w 在函数体里
     *     被 setAttribute("stroke-width", w) 用了。找出这类函数名，再把调用点的
     *     **最后一个实参**收进来（约定：线宽是最后一个参数，与 S03 的 `line(...,w)` 一致）。
     *
     * 为什么必须限定"最后一个实参"：S03 的调用是
     *   line(major ? 176 : 208, y, 264, y, major ? 1.5 : 1)
     * 如果收全部数字，会把坐标 176/208/264/640/8/40 全当成线宽 —— 第一版就这么干了，
     * 结果 S03 凭空多出 2px，反而制造了一个新的假声称。这是实测抓到的回归。
     */
    for (const js of scriptBodies) {
      const fnNames = [];
      for (const m of js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\s*\}/g)) {
        if (/setAttribute\(\s*["']stroke-width["']/.test(m[3])) fnNames.push(m[1]);
      }
      for (const name of fnNames) {
        const callRe = new RegExp("\\b" + name.replace(/[$]/g, "\\$") + "\\s*\\(([^)]*)\\)", "g");
        for (const c of js.matchAll(callRe)) {
          if (/function/.test(c[0])) continue;
          /* 按顶层逗号切实参（括号/三元里的逗号不切） */
          const args = [];
          let depth = 0, buf = "";
          for (const ch of c[1]) {
            if (ch === "(" || ch === "[" || ch === "{") depth++;
            else if (ch === ")" || ch === "]" || ch === "}") depth--;
            if (ch === "," && depth === 0) { args.push(buf); buf = ""; } else buf += ch;
          }
          if (buf.trim()) args.push(buf);
          const last = (args[args.length - 1] || "").trim();
          /* 最后一个实参里的每个数字都算候选（三元两支都要），但要求 <= 24px */
          for (const num of last.matchAll(/([0-9.]+)/g)) {
            const n = parseFloat(num[1]);
            if (n > 0 && n <= 24) jsSeen.push({ n: round2(n), how: "JS 调用 " + name + "(…) 的末位实参: " + last.slice(0, 40) });
          }
        }
      }
    }
    for (const x of jsSeen) {
      /* JS 设的是 stroke-width，不是 border —— 没有量化问题，直接收。
       * 但坐标误收的风险真实存在，所以只收 <= 24px 且带出处，让人能复核。 */
      note(x.n, x.how, "(index.html <script>)", null);
    }
  }

  const list = [...widths].sort(function (a, b) { return a - b; });
  /* 交互态出处清单：**这些值已经进 list 了**（2026-10-30 裁决改为保留），
   * 这里只是把「哪几级是交互态专有的」单独留档，供 dna-clean.json 归档与审阅。
   *
   * 字段名从 `droppedInteractive` 改成 `interactiveSourced`：原来的名字会让下一个人
   * 以为这些值被排除了，然后按"恢复"的思路去改代码 —— 正是仓库反复踩的坑
   * （结论不带依据，下一轮就有人按自己的理解改回去）。 */
  const interactiveSourced = [];
  for (const x of interactive) {
    if (!interactiveSourced.some(function (y) { return y.n === x.n; })) interactiveSourced.push(x);
  }
  const why = { interactiveSourced: interactiveSourced };
  if (!list.length) {
    if (provenance) provenance.push({ n: 0, decl: "(无任何线宽声明)", selector: "—", media: null });
    return { text: "无边框线条（全站不画描边，只用色块与留白分隔）", why: why };
  }
  /* 这里**不再**做 0.5px 合并。
   * 旧代码把相差 < 0.5px 的值合成一档，理由写在注释里是"人眼分辨不出 0.5px"，
   * 实测代价是 7/30 案的签名被抹掉：S25 的 1/1.2（装订线 vs 引线）、
   * S09 的 3.5/3.6（外描边 vs 图标）、S24 的 0.4/0.6/0.8（三级蚀刻）。
   * 这些值本来就是作者按"级"取的，合并等于替作者改设计。
   * 只保留完全相等的去重（round2 之后 Set 已经做到），顺序即从小到大。 */
  return { text: list.map(function (n) { return n + "px"; }).join("、"), why: why };
}

/* 首屏主标题字号。
 *
 * 为什么不在 extract-dna.mjs 里修：那里的 `/h1\s*\{[^}]*font-size/` 是**文本匹配**，
 * 它既看不见 CSS 层叠，也解不了 var()：
 *   · S01 命中的是 `.masthead h1`（"h1 {" 出现在后代选择器里），值写的是 `var(--fs-h1)`；
 *   · S09 同理（`.sign h1`），也是 var；
 *   · S03/S07/S13/S21 反过来——h1 带 class，字号写在 `.d1`/`.display`/`.doctitle`/
 *     `.masthead__title` 上，裸 h1 规则里没有 font-size，于是抽成空串。
 * 所以正确的位置是这里：已经有 eachRule 的规则遍历、有 vars 字典，可以真正按
 * 「裸 h1 → 后代 h1 → h1 的 class」的层叠优先级取最后一条**桌面**规则，再解 var。
 *
 * 桌面口径与线宽一致（1440 视口）。为什么取桌面：提示词是给"整站设计"用的，
 * 首屏主标题在桌面断点是它的设计值；窄屏那一档是同一个 clamp 收窄后的结果，
 * 写进提示词只会让 AI 把标题做小。S01 就是活证据：顶层是 clamp(48,6.67vw,96)，
 * `@media(max-width:1439px)` 覆盖成 clamp(52,6.1vw,86) —— 后者只在 1439 以下成立。
 */
function h1SizeVerdict(cleanCss, vars, h1Classes, fallback) {
  const cands = [];
  eachRule(cleanCss, function (sel, body, media) {
    if (media && !conditionApplies(media)) return;
    const fm = body.match(/(?:^|;)\s*font-size\s*:\s*([^;}]+)/);
    if (!fm) return;
    const groups = selectorGroups(sel);
    const bare = groups.some(function (g) { return /^h1(?![\w-])/i.test(g); });
    const desc = groups.some(function (g) { return /(^|[\s>+~])h1(?![\w-])/i.test(g); });
    const cls = (h1Classes || []).some(function (c) {
      const re = new RegExp("\\." + c.replace(/[-_]/g, "\\$&") + "(?![\\w-])");
      return groups.some(function (g) { return re.test(g); });
    });
    if (!bare && !desc && !cls) return;
    cands.push({ value: fm[1].trim(), rank: bare ? 0 : desc ? 1 : 2, sel: sel });
  });
  const KIND = ["裸 h1 规则", "h1 后代规则", "h1 的 class 规则"];
  for (const rank of [0, 1, 2]) {
    const hit = cands.filter(function (c) { return c.rank === rank; });
    if (!hit.length) continue;
    const last = hit[hit.length - 1];
    const v = resolveVars(last.value, vars, 0).trim();
    /* 还残留 var( 说明变量不在桌面作用域里 —— 宁可回落到 raw 值，也不要把
     * `var(--fs-h1)` 这种"变量名"当字号写进提示词（AI 不认识它）。 */
    if (v && !/var\(/.test(v)) {
      return {
        text: v,
        why: KIND[rank] + " `" + last.sel + "` 声明 " + last.value +
          (last.value !== v ? " → 展开为 " + v : "") + "（桌面 1440px 口径）",
      };
    }
  }
  const f = resolveVars(String(fallback || ""), vars, 0).trim();
  return { text: /var\(/.test(f) ? "" : f, why: f ? "回落到 raw.json 的 h1Size：" + f : "该案没有任何 h1 相关 font-size 规则" };
}

/* 把 `clamp(min, Nvw, max)` 在 1440 视口下求成实际像素。
 *
 * 为什么必须单独算：28/30 案的 h1Size 是 clamp 形式，**第一个数是下限**。
 * 1440 视口下 `clamp(46px, 6vw, 88px)` → 6vw = 86.4px → 夹到 88 上限 → 实际 86.4px。
 * 直接抓第一个数会得到 46px，比实际低 48%。
 *
 * 2026-10-30 第一版提示词就是这么错的：EXEC-A 实测 25/30 案数字偏低 36–60%，
 * 且方向与修复目标相反（本意让 AI 把标题做大，实际给了下限）。
 *
 * 其他形态：
 *   `72px`            → 72
 *   `var(--x)` 已展开 → 直接取 px
 *   其它（含 rem/em） → 返 0，让调用方不写这一条（宁可不写，也不编）
 */
function at1440(text) {
  const s = String(text || "").trim();
  const m = s.match(/clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)px\s*\)/);
  if (m) {
    const lo = parseFloat(m[1]), vw = parseFloat(m[2]), hi = parseFloat(m[3]);
    const px = (vw * 1440) / 100;
    return Math.round(Math.min(Math.max(px, lo), hi) * 10) / 10;
  }
  // clamp 的其它写法（含 vh / %）不支持，返回 0
  if (/clamp\(|calc\(/.test(s)) return 0;
  const p = s.match(/^([\d.]+)px$/);
  if (p) return parseFloat(p[1]);
  const any = s.match(/([\d.]+)px/);
  return any ? parseFloat(any[1]) : 0;
}

/* ── 正文字号 ────────────────────────────────────────────────────────────
 * 2026-10-30 新增。为什么需要它：
 *
 * 提示词里要写「最大标题压到正文的 N 倍」，需要分母。而 dna-clean.json 之前
 * **没有任何正文字号字段** —— 提示词里那句 `h1Size` 只能孤立地给出一个像素值，
 * 对 AI 没有指导意义（它不知道该把这个值放在什么尺度上）。
 *
 * 判据：`body` / `p` / 裸 `body` 的 font-size；若没有，退回 `:root` 里
 * `--fs-base` / `--text` / `--body` 这类变量；再退回 16px 并标注「推定」。
 *
 * 为什么不从渲染实测取：那需要浏览器，而这条链是纯静态的（仓库铁律：
 * `dna-clean.json` 必须能由 `node clean-dna.mjs` 复算）。字号默认值的
 * 正确性由 check-prompts.mjs 的独立对账兜住。
 */
function bodySizeVerdict(cleanCss, vars) {
  const cands = [];
  eachRule(cleanCss, function (sel, body, media) {
    if (media && !conditionApplies(media)) return;
    const fm = body.match(/(?:^|;)\s*font-size\s*:\s*([^;}]+)/);
    if (!fm) return;
    const groups = selectorGroups(sel);
    // 裸 body 最可信；其次是 p；再其次是 .body / .text 这类类名
    const bare = groups.some(function (g) { return /^body(?![\w-])/i.test(g.trim()); });
    const para = groups.some(function (g) { return /^p(?![\w-])/i.test(g.trim()); });
    const cls = groups.some(function (g) { return /^\.(?:body|text|prose|copy|content)(?![\w-])/i.test(g.trim()); });
    if (!bare && !para && !cls) return;
    cands.push({ value: fm[1].trim(), rank: bare ? 0 : para ? 1 : 2, sel: sel });
  });
  const KIND = ["裸 body 规则", "裸 p 规则", "正文类名规则"];
  for (const rank of [0, 1, 2]) {
    const hit = cands.filter(function (c) { return c.rank === rank; });
    if (!hit.length) continue;
    const last = hit[hit.length - 1];
    const v = resolveVars(last.value, vars, 0).trim();
    if (v && !/var\(/.test(v) && /\d/.test(v)) {
      return { text: v, why: KIND[rank] + " `" + last.sel + "` 声明 " + last.value +
        (last.value !== v ? " → 展开为 " + v : "") + "（桌面 1440px 口径）" };
    }
  }
  // 退回 :root 的基础字号变量
  for (const name of ["--fs-base", "--text", "--body-size", "--base-size", "--fs-body"]) {
    const raw = vars.get(name);
    if (!raw) continue;
    const v = resolveVars(raw, vars, 0).trim();
    if (v && !/var\(/.test(v) && /\d/.test(v)) {
      return { text: v, why: ":root 变量 " + name + " = " + v + "（没有裸 body/p 规则，取基础字号）" };
    }
  }
  return { text: "", why: "该案没有显式的正文字号规则（浏览器默认 16px，不写进提示词以免编造）" };
}

/* ── 调色板 ────────────────────────────────────────────────────────────
 * 旧实现按 :root 声明顺序取前 5 个（底色通常在最前），S19 的 --green 在第 6 位、
 * S24 的 --grape 在第 7 位 —— 两案的主色都被切掉，提示词还写着「配色只用这几个值」。
 * 新算法：主色先入列（注释/变量名两个判据），再按声明顺序补足，上限 7 个。
 * 7 而不是 5 是权衡结果：7 个色还在 AI 能守住的范围里，而丢主色的代价是整页风格失效。
 */
function pickPalette(decls, rowColors, rawCss, specCtx) {
  const MAX = 7;
  const rootHexes = rowColors.map(function (c) { return c.hex.toUpperCase(); });
  const primary = [];
  const addPrimary = function (hex) {
    const h = (hex || "").toUpperCase();
    if (h && primary.indexOf(h) < 0 && rootHexes.indexOf(h) >= 0) primary.push(h);
  };

  // 判据 1：:root 声明行上的注释写着「主色 / 强调 / primary / accent」
  /* 但注释里的「主色」不都等于主色，实测有 4 种伪命中，都要按上下文排掉：
   *   "只作强调色底上的字色"（S21 --white）—— 是字色，不是强调色本身
   *   "主色压到 80%"（S21 --ink-2）—— 是主色的压深版
   *   "次级文字：主色…"（S21 同上）
   *   "对纸 4.66:1" 这种纯对比度备注若同行另有「主色」也可能误抓
   * 规则：注释里出现 字色 / 底色 / 地面色 / 白字 / 压到 / 次级 就不认。 */
  const NON_PRIMARY_NOTE = /字色|底色|地面色|白字|压到|压深|次级/;
  for (const d of decls) {
    if (!d.hex) continue;
    if (!/主色|强调|primary|accent/i.test(d.note)) continue;
    if (NON_PRIMARY_NOTE.test(d.note)) continue;
    addPrimary(d.hex);
  }
  // 判据 2：变量名本身就是语义（--primary / --accent / --green / --grape）
  for (const d of decls) {
    if (d.hex && /(primary|accent)/i.test(d.name)) addPrimary(d.hex);
    if (d.hex && /^--(green|grape)$/i.test(d.name)) addPrimary(d.hex);
  }
  // 判据 3：文件头注释里「主色 #XXXXXX」/「#XXXXXX 主色」
  for (const hex of prosePrimaries(rawCss)) addPrimary(hex);

  const chosen = [];
  const seen = new Set();
  const push = function (c) {
    const hex = c.hex.toUpperCase();
    if (seen.has(hex)) return;
    seen.add(hex);
    chosen.push({ hex: hex, name: String(c.name || "").replace(/^--/, "") });
  };
  // 主色在前：提示词第一条就点名主色，AI 就不会把主色当"可选装饰"。
  for (const hex of primary) {
    const c = rowColors.find(function (x) { return x.hex.toUpperCase() === hex; });
    if (c) push(c);
  }

  /* 规格字段 3 声明的色优先补进来（2026-10-30 新增）。
   *
   * 为什么需要：原实现纯按 `:root` 声明顺序取前 MAX 个，**完全不知道规格写了什么**。
   * S24 是最直接的受害者：它的 `:root` 有 15 个色，`#6E8B7A`（--moss，苔绿）排在第 8 位，
   * `#3C5F48`（--moss-2）第 9 位 —— 两个都被 MAX=7 截掉。
   * 而规格 `_specs/S24.md` 字段 3 明写「辅助色 `#6E8B7A` 苔绿 6%」，页面用它画了
   * 80 个元素的描边（`svg-stroke`）。
   *
   * 这是唯一一个「规格有、data.js 有、prompts.js 没有」的色，
   * 也是 `data.js ⊆ prompts.js` 这条关系在 30 案里唯一不成立的案（29/30）。
   *
   * 判据：把规格字段 3 里**带面积百分比的角色声明色**抽出来，只要它在 `:root` 里
   * 真实存在（`rowColors` 有它），就优先于「按声明顺序补位」。
   * 不新增色、不猜色 —— 只是让「规格明确写了的」排在「:root 里恰好在前面」之前。
   */
  const specDeclared = (function () {
    if (!specCtx || !specCtx.dir || !specCtx.id) return [];
    const p = join(P, specCtx.dir, "..", "_specs", specCtx.id + ".md");
    if (!existsSync(p)) return [];
    const md = readFileSync(p, "utf8");
    const lines = md.split(/\r?\n/);
    const i = lines.findIndex(function (l) { return /配色系统/.test(l); });
    if (i < 0) return [];
    const buf = [lines[i]];
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\*{0,2}4[\.．]?\s/.test(lines[j].trim())) break;
      buf.push(lines[j]);
    }
    const text = buf.join("\n");
    const out = [];
    /* 只收「带 NN% 的段、且 hex 在段首 40 字符内」的声明 —— 与 data.js 侧
     * `collect-schemes.mjs` 抽 fromSpec 的口径一致，避免把「反的是 #6366F1」
     * 这类否定示例算进来。 */
    for (const seg of text.split(/[；。]/)) {
      if (!/\d(?:\.\d)?\s*%/.test(seg)) continue;
      const m = seg.match(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/);
      if (!m) continue;
      if (seg.indexOf(m[0]) > 40) continue;
      out.push(m[0].toUpperCase());
    }
    return [...new Set(out)];
  })();
  for (const hex of specDeclared) {
    if (chosen.length >= MAX) break;
    const c = rowColors.find(function (x) { return x.hex.toUpperCase() === hex; });
    if (c) push(c);
  }

  /* 规格色补完之后，如果还有余位，才按 `:root` 声明顺序补"规格没写但实现用了"的派生色。
   *
   * ⚠️ 顺序不能反。2026-10-30 第一版把这段放在主色循环之后、规格循环之前，
   * 结果 S24 的 `:root` 前 7 位（`#E6EDF2` `#F3F8FB` `#DCE7EF` `#C9D8E4` `#0A1116` `#3A4652`）
   * 把位占满，规格明写的 `#6E8B7A` 依然进不来 —— 改了个寂寞。
   * 正确语义是：**规格声明的色有优先占位权**，派生色只在有余位时补。
   */
  for (const c of rowColors) {
    if (chosen.length >= MAX) break;
    push(c);
  }
  return { list: chosen, primary: primary };
}

const out = [];
for (const r of raw.rows) {
  const rawCss = readFileSync(join(P, r.dir, "style.css"), "utf8");
  const css = stripComments(rawCss);
  const decls = rootDecls(rawCss);

  const vars = {};
  for (const d of decls) vars[d.name] = stripComments(d.value).trim();

  const rules = familyRules(css);
  /* index.html 现在读一次、三处用：h1 的 class 列表、线宽的 SVG 内联属性、判据留档。
   * 原实现只在这里读一次却只用来取 class —— 线宽那条链因此完全看不见 HTML。 */
  const rawHtml = readFileSync(join(P, r.dir, "index.html"), "utf8");
  const h1Classes = (() => {
    const tag = rawHtml.match(/<h1\b[^>]*>/i);
    if (!tag) return [];
    const cm = tag[0].match(/\bclass\s*=\s*["']([^"']+)["']/i);
    return cm ? cm[1].trim().split(/\s+/).filter(Boolean) : [];
  })();

  const fDisplay = h1Family(rules, vars, h1Classes);
  const fBody = bodyFamily(rules, vars) || fDisplay;
  const fMono = monoFamily(decls, rules, vars);
  const display = fDisplay || fBody || "有刻印感的衬线";

  /* 字体名最后一次洗干净：raw.json 里 S07 那个
   * "IBM Plex Mono\" /* taste-skill-ignore: ... *\/" 是上游带的脏串。
   * 上游（extract-dna.mjs）按约定不动，所以在出口处兜一次：剥注释、去引号、
   * 遇到带 * 或 / 的残渣直接丢掉（宁可少一个族名，也不能让 AI 读到半句注释）。 */
  const cleanName = function (n) {
    const s = String(n || "").replace(CSS_COMMENT_RE, "").replace(/["'\\]/g, "").replace(/\s+/g, " ").trim();
    if (!s || /[/*]/.test(s)) return "";
    return s;
  };
  const fonts = {
    display: cleanName(display),
    body: cleanName(fBody || display),
    mono: cleanName(fMono),
    /* 完整兜底链（去通用族，最多 4 个）。
     * 上面的 display/body/mono 只留了**第一个**族名，这会让提示词丢掉中文兜底 ——
     * 独立验证 Agent 照提示词实现 S07 后实测：指定的 Libre Franklin 一个中文字形都没有，
     * h1 实际由 SimSun 画。而原型自己的 `--display` 栈里明明有
     * "WenJin Mincho","文津宋体","Source Han Serif SC" 三级中文兜底。
     * 提示词只说第一个名字，等于把「字体正确」这件事交给了 AI 的运气。
     *
     * 取值路径：优先 :root 里语义命名的变量（--display / --f-display / --text …），
     * 它们是作者写的完整栈；没有变量才回落到 h1 规则里的原始声明。
     * 这一步由 stackFromVars() 做。 */
    /* display 侧优先级，经过三次实测修正后定序：
     *
     *  ① **h1 规则原文最优先**。这是唯一"作者明确写了标题用什么"的证据。
     *     S04 的 h1 是 `font-family:var(--f-cjk)`，而 :root 里还有个 `--f-disp:"Unbounded",var(--f-cjk)`。
     *     先看变量名会拿到 Unbounded（因为名字里有 disp），但 h1 真正画字的是 --f-cjk
     *     （LXGW WenKai）。**h1 规则说什么就是什么，别用变量名去猜作者的意图。**
     *  ② h1 规则没有 → 语义变量（--display / --f-display / --f-disp…）
     *  ③ 再没有 → body 栈（S01 的 h1 一条规则都没有，纯继承 body 的 --f-text = Noto Sans SC，
     *     而 :root 里的 --f-latin 是 Archivo —— 按变量名取 latin 就取错了）
     *  ④ 万不得已 dominantStack
     */
    displayStack: (function () {
      var byRule = stackFromRules(rules, vars, true, 4, h1Classes);
      var a = stackFromVars(decls, vars, ["display", "disp", "title", "head"], 4);
      var latin = stackFromVars(decls, vars, ["latin"], 4);
      /* S09 的问题：它的标题其实是两款——中文走 --f-cn（LXGW Marker Gothic）、
       * 拉丁走 --f-latin（Syne）。原实现按 CJK 优先匹配到 --f-cn 就返回，
       * 于是 Syne 从提示词里彻底消失，而原型上英文标题确实在用 Syne。
       * 修法：当同时存在 cn 与 latin 两条变量时，标题链 = cn 链 + latin 链（去重）。
       * 这不只是 S09：任何"中英分设双栈"的案子都该这么合并。 */
      var cn = stackFromVars(decls, vars, ["cn", "cjk"], 4);
      /* 中英分设双栈时**必须先合并**（S09 的 --f-cn=LXGW Marker Gothic 与
       * --f-latin=Syne 是并列的两款标题字体，不是优先级关系）。
       * 上一版把合并放在回退链之后，结果 cn 先返回就 break，latin 永远轮不到 ——
       * Syne 从提示词里消失，而原型上英文标题确实用它。 */
      if (cn.length && latin.length) {
        var combo = [];
        var seen2 = {};
        for (const f of cn.concat(latin)) { if (!seen2[f]) { seen2[f] = 1; combo.push(f); } }
        return combo.slice(0, 4);
      }
      var merged = [];
      var seen = {};
      /* S01 的坑：它的 h1 一条 font-family 规则都没有，纯继承 body（--f-text = Noto Sans SC），
       * 而 :root 里还有个 --f-latin = Archivo。若按 display→cn→latin 顺序找变量，
       * 会拿到 Archivo，但页面上标题根本不是 Archivo。
       * ⇒ display 侧找不到时，**body 规则优先于 latin 变量**，因为继承是真实发生的事。
       */
      for (const part of [byRule, a, stackFromRules(rules, vars, false, 4), cn, latin]) {
        for (const f of part) {
          if (!seen[f]) { seen[f] = 1; merged.push(f); }
        }
        if (merged.length) break;
      }
      if (merged.length) return merged.slice(0, 4);
      var c2 = stackFromRules(rules, vars, false, 4);
      if (c2.length) return c2;
      return dominantStack(rawCss, vars, 4);
    })(),
    bodyStack: (function () {
      var byRule = stackFromRules(rules, vars, false, 4);
      if (byRule.length) return byRule;
      var a = stackFromVars(decls, vars, ["text", "body", "serif", "sans", "cn", "cjk"], 4);
      if (a.length) return a;
      return dominantStack(rawCss, vars, 4);
    })(),
  };

  const pal = pickPalette(decls, r.colors, rawCss, { dir: r.dir, id: r.id });
  let palette = pal.list.map(function (c) { return c.hex + " " + c.name; });

  /* 兜底（S14 专用）：S14 一个 :root 都没有（实测 `Select-String ':root'` 零命中），
   * 所有颜色都是字面量散落在规则里。原实现直接留空，导致提示词里出现
   * 「配色只用这几个值：（该案未在 :root 声明色变量，需读 CSS 正文）」——
   * 这是把内部缺陷甩给用户，用户无法执行。
   * 兜底改为：按全文件出现频次取前 6 个字面量色值，附出现次数作为权重说明
   * （build-prompts 会把这个 ×N 剥掉，不写进提示词）。 */
  if (!palette.length) {
    const counts = new Map();
    const hexRe = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
    let hx;
    while ((hx = hexRe.exec(css))) {
      const v = "#" + hx[1].toUpperCase();
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    palette = [...counts.entries()]
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 6)
      .map(function (e) { return e[0] + " ×" + e[1]; });
  }

  /* 线宽与标题字号都用 **桌面作用域**的变量表（topVars），而不是全量 vars。
   * 理由见 topVars 的注释：全量 vars 里 @media 的 :root 会覆盖顶层，
   * S27 的 --mis 因此从 1.8 漂成 1.2，`calc(--mis*2)` 漂成 2.4 ——
   * 提示词里那两个只在窄屏成立的值就是这么来的。
   *
   * 刻意**不动** palette/radius/fonts/shadow 用的 vars：那三项的输出与本次两个 bug 无关，
   * 换它们的变量作用域会连带改掉 30 案的配色/圆角/阴影文案（风险面不可控，且不在本任务范围）。
   * 影响面实测见 probes-a/a04 的 ③ 段：被媒体改写的变量里只有 S27 的 --mis 用于线宽，
   * 其余全部用于 padding/gutter/角度这类与这四个字段无关的地方。 */
  const dvars = topVars(rawCss);
  const rad = radiusVerdict(css);
  /* 来源留档：每条线宽是哪条声明、哪个选择器、哪个断点给的。
   * 30 案的提示词都写着「线宽只用这几级」，这句话的唯一依据就是这个数组 ——
   * 上一轮 S25 只剩一个 3px 却没人发现，就是因为推导过程没有落盘。 */
  const prov = [];
  const lines = lineWidthVerdict(css, dvars, rawHtml, prov);
  const h1 = h1SizeVerdict(css, dvars, h1Classes, r.h1Size);
  const body = bodySizeVerdict(css, dvars);
  out.push({
    id: r.id,
    dir: r.dir,
    structType: r.structType,
    threshold: r.threshold,
    tone: r.tone,
    palette: palette,
    primary: pal.primary,
    fonts: fonts,
    radius: rad.text,
    radiusBare: rad.bare,
    /* 判据留档：这句话是怎么得出的（"0 处 border-radius" / "0 与 50% 并存" …）。
     * 不进提示词（AI 不需要看抽取过程），只留在 dna-clean.json 里供人复核 ——
     * 这个仓库的教训是「结论不带依据，下一轮就会有人按自己的理解改回去」。 */
    radiusWhy: rad.evidence,
    shadow: shadowText(r, css, vars),
    shadowDetail: shadowDetail(r, css, vars),
    lineWidths: lines.text,
    /* 判据留档（同 radiusWhy 的理由）：每个值的出处，含选择器与断点。
     * 不进提示词，只供人复核「这个值凭什么在这里」。 */
    lineWidthsWhy: prov.map(function (p) {
      return p.n + " ← " + p.decl + (p.selector && p.selector !== "—" ? "  ⓐ" + p.selector : "") +
        (p.media ? "  @" + p.media : "");
    }),
    /* 被摘掉的交互态取值也留档。没有这一段，下一个人会以为抽取漏了
     * （"S25 怎么只剩 1/1.2/2，3px 呢？"），然后把它加回去。
     * 实测依据：probes-b/ghost-attribution.json 里 16 个假声称值有 9 个来自交互态。 */
    /* 字段名 `lineWidthsDropped` → `lineWidthsInteractive`：这些值**没有**被排除，
     * 它们是「来自交互态的线宽」。保留旧名会让读者以为是排除清单。 */
    lineWidthsInteractive: (lines.why.interactiveSourced || []).map(function (p) {
      return p.n + " ← " + p.decl + "  ⓐ" + p.selector + "（这一级来自交互态：静态首屏看不到，但键盘聚焦/悬停时用户会看到）";
    }),
    /* 字号的判据也留档：从哪条规则、哪个断点、展开哪个变量得到的。
     * 上一轮 `var(--fs-h1)` 能一路走到提示词里，就是因为这里没有留下任何可复核的痕迹。 */
    h1Size: h1.text,
    h1SizeWhy: h1.why,
    /* 正文字号：给「最大标题是正文的 N 倍」这句提供分母（2026-10-30 新增）。
     * 端到端实测依据：复刻实现的 H1 只有原型的 26%/30%/48%，但档数 6–8 档与原型
     * 6–9 档相当 —— 缺的是「最大标题敢用多大」这个相对关系，不是绝对像素值。 */
    bodySize: body.text,
    bodySizeWhy: body.why,
    /* clamp 在 1440 视口下的实际落值。提示词用它算倍率，不要自己解析 clamp
     * ——2026-10-30 有过一次教训：用 clamp 的下限当实际值，25/30 案偏低 36–60%。 */
    h1SizeAt1440: at1440(h1.text),
    mechanism: r.mechanism,
    charBudget: (r.mechanism.length || 0) + palette.join("").length +
      (fonts.display + fonts.body + fonts.mono).length + 60,
  });
}

/* 阴影哲学与明细：沿用第一版的口径（已经过独立复算），只是把实现挪进函数，
 * 避免和后面新增的 CSS 解析互相干扰。 */
function shadowDetail(r, css, vars) {
  const decls = [];
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;}]+)/g)) decls.push(m[1].trim());
  const expand = function (v) { return resolveVars(v, vars, 0); };
  let inset = 0, outer = 0, outerSamples = [];
  for (const d of decls) {
    if (d === "none") continue;
    const e = expand(d);
    if (!e.trim() || e.includes("var(")) continue;
    for (const part of e.split(/,(?![^(]*\))/)) {
      const p = part.trim();
      if (!p || p === "none") continue;
      if (p.includes("inset")) { inset++; continue; }
      // 排除"0 0 0 Npx 纯色"——那不是投影，是 1px 描边/高光点（spread 环形描边，无位移无模糊）
      // 实测踩过：S19 的 L241 那枚 1px 方点白色高光被误判成"浮起卡片"的外投影
      if (/^0\s+0\s+0\s+[0-9.]+px\s/.test(p)) continue;
      outer++;
      if (outerSamples.length < 2) outerSamples.push(p.slice(0, 60));
    }
  }
  const drops = [...css.matchAll(/drop-shadow\s*\(/g)].length;
  let kind;
  if (inset && !outer) kind = "inset-only";
  else if (!inset && outer) kind = drops ? "outer-and-drop" : "outer";
  else if (inset && outer) kind = "mixed";
  else if (drops) kind = "drop-only";
  else kind = "none";
  return { kind: kind, inset: inset, outer: outer, drops: drops, samples: outerSamples };
}

function shadowText(r, css, vars) {
  const sh = shadowDetail(r, css, vars);
  const map = {
    "inset-only": "只用 inset（凹槽，无外投影）",
    "drop-only": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "outer": "有外投影",
    "outer-and-drop": "有外投影",
    "mixed": "inset 与外投影混用",
    "none": "无阴影",
  };
  return map[sh.kind] || sh.kind;
}

writeFileSync(
  join(ROOT, "prototypes/_prompts/dna-clean.json"),
  JSON.stringify(out, null, 2),
  "utf8"
);

// 报数
const noFont = out.filter(function (x) { return !x.fonts.display; }).map(function (x) { return x.id; });
const noPalette = out.filter(function (x) { return !x.palette.length; }).map(function (x) { return x.id; });
console.log("=== 清洗后 ===");
console.log("  有真实字体名的案：" + (30 - noFont.length) + "/30" + (noFont.length ? "  缺：" + noFont.join(",") : ""));
console.log("  有调色板的案：" + (30 - noPalette.length) + "/30" + (noPalette.length ? "  缺：" + noPalette.join(",") : ""));
const avg = out.reduce(function (s, x) { return s + x.charBudget; }, 0) / out.length;
console.log("  平均紧凑载荷：" + Math.round(avg) + " 字/案（对比 data.js 十字段 2447 字）");
console.log("");
console.log("案  标题字           正文字             圆角                                       线宽");
for (const x of out) {
  const d = (x.fonts.display || "—").slice(0, 16).padEnd(16);
  const b = (x.fonts.body || "—").slice(0, 16).padEnd(16);
  const r = x.radius.slice(0, 40).padEnd(40);
  console.log(x.id + "  " + d + " " + b + " " + r + " " + x.lineWidths);
}
console.log("");
console.log("=== 主色识别（P0-4）===");
for (const x of out) {
  console.log("  " + x.id + "  主色:" + (x.primary.join(",") || "（注释/变量名未标主色，按声明顺序取前 7）") +
    "  共 " + x.palette.length + " 色  " + x.palette.join(" "));
}
console.log("");
const kindCount = {};
for (const x of out) kindCount[x.shadow] = (kindCount[x.shadow] || 0) + 1;
console.log("=== 阴影哲学分布（已展开 var 后重判）===");
for (const k in kindCount) console.log("  " + k + "：" + kindCount[k] + " 案");
console.log("");
const radKinds = {};
for (const x of out) radKinds[x.radius] = (radKinds[x.radius] || 0) + 1;
console.log("=== 圆角形态（P0-1）===");
for (const k in radKinds) console.log("  " + k + "：" + radKinds[k] + " 案");
console.log("");
console.log("  产物：prototypes/_prompts/dna-clean.json");
