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
import { readFileSync, writeFileSync } from "node:fs";
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

/* 逐条规则走一遍，拿到「选择器 → 声明块」。
 * 为什么不用 /([^{}]+)\{([^}]*)\}/ 这种一把梭：@media 会把花括号嵌套进来，
 * 一把梭的结果是把 @media 的头部当选择器、把里面第一条规则当声明块，
 * 于是媒体查询里的 h1 字体覆盖就永远读不到。这里按花括号配对切，遇到 @ 开头的块再递归。 */
function eachRule(css, cb) {
  let i = 0;
  const n = css.length;
  let depth = 0;
  let selStart = 0;
  const stack = [];
  while (i < n) {
    const ch = css[i];
    if (ch === "{") {
      const sel = css.slice(selStart, i).trim();
      stack.push({ sel: sel, bodyStart: i + 1 });
      depth++;
      selStart = i + 1;
    } else if (ch === "}") {
      const top = stack.pop();
      if (top) {
        const body = css.slice(top.bodyStart, i);
        if (/^@(media|supports|layer|container)\b/i.test(top.sel)) {
          eachRule(body, cb); // 条件组里的规则也要读，否则窄屏覆盖的字体读不到
        } else {
          cb(top.sel, body);
        }
      }
      depth--;
      selStart = i + 1;
    } else if (ch === ";" && depth === 0) {
      selStart = i + 1;
    }
    i++;
  }
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
 */
function lineWidthVerdict(cleanCss, vars) {
  const widths = new Set();
  const re = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(cleanCss))) {
    let v = resolveVars(m[1], vars, 0);
    v = v.replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, function (all, a, b) {
      return round2(parseFloat(a) * parseFloat(b)) + "px";
    });
    v = v.replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, function (all, a, b) {
      return round2(parseFloat(a) * parseFloat(b)) + "px";
    });
    const pxRe = /([0-9.]+)px/g;
    let q;
    while ((q = pxRe.exec(v))) {
      const n = parseFloat(q[1]);
      if (n > 0) widths.add(round2(n));
    }
    /* SVG 的 stroke-width 允许**无单位裸数字**（`stroke-width: 0.4` 等价 0.4px，
     * 这是 SVG 规范的用户单位，不是 CSS 的"必须有单位"）。
     * S19 的 .e4/.e8 正是这么写的，只靠上面的 px 正则抽不到 ——
     * 于是"线宽只用 1px、3px"与机制句"线宽只 0.4 与 0.8px"继续打架。
     * 只对 stroke-width 这个属性放开裸数字，避免把 `border: 1px solid` 里的颜色值误当线宽。 */
    if (/stroke-width/i.test(m[0])) {
      const bare = v.match(/^\s*([0-9.]+)\s*$/);
      if (bare) {
        const n = parseFloat(bare[1]);
        if (n > 0) widths.add(round2(n));
      }
    }
  }
  const list = [...widths].sort(function (a, b) { return a - b; });
  if (!list.length) return "无边框线条（全站不画描边，只用色块与留白分隔）";
  /* 档位收窄：加了 SVG stroke-width 之后，有些案会抽出 9 档（S15 的硫酸纸描边
   * 0.5/0.8/1/1.2/1.36/1.4/1.7/2/3px）。照原样写进「线宽只用这几级……不要自创第三级」
   * 是自相矛盾的——它自己就给了九级，"只用这几级"失去意义，AI 反而会挑花眼。
   *
   * 但阈值不能按"人眼能分辨 0.5px"来定：S19 的蚀刻线是 0.4 与 0.8，
   * 两者差 0.4 < 0.5，会被合成一档，反而丢掉这个案最核心的"两级描边分层"签名。
   * 实测各案真实分级：S19 = {0.4,0.8,1,3}、S13 = {1,2,3,5.5,7,9,14.5}（它们本来就是
   * 不同量级的分级，不是随手取的）。**所以不做聚类**，改为按"档位间距是否够大"截断：
   * 保留所有 < 1px 的细描边（它们承担风格签名），再对 ≥ 1px 的按 0.5px 粒度去重。
   */
  const fine = list.filter(function (w) { return w < 1; });
  const coarse = [];
  for (const w of list.filter(function (w) { return w >= 1; })) {
    if (!coarse.some(function (c) { return Math.abs(c - w) < 0.5; })) coarse.push(w);
  }
  const finalList = fine.concat(coarse).sort(function (a, b) { return a - b; });
  return finalList.map(function (n) { return n + "px"; }).join("、");
}

/* ── 调色板 ────────────────────────────────────────────────────────────
 * 旧实现按 :root 声明顺序取前 5 个（底色通常在最前），S19 的 --green 在第 6 位、
 * S24 的 --grape 在第 7 位 —— 两案的主色都被切掉，提示词还写着「配色只用这几个值」。
 * 新算法：主色先入列（注释/变量名两个判据），再按声明顺序补足，上限 7 个。
 * 7 而不是 5 是权衡结果：7 个色还在 AI 能守住的范围里，而丢主色的代价是整页风格失效。
 */
function pickPalette(decls, rowColors, rawCss) {
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
  const h1Classes = (() => {
    const html = readFileSync(join(P, r.dir, "index.html"), "utf8");
    const tag = html.match(/<h1\b[^>]*>/i);
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
  };

  const pal = pickPalette(decls, r.colors, rawCss);
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

  const rad = radiusVerdict(css);  const lines = lineWidthVerdict(css, vars);

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
    lineWidths: lines,
    h1Size: r.h1Size,
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
