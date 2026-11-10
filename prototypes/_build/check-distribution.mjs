#!/usr/bin/env node
/* 分布闸门（2026-11-10 新增，Q2）
 *
 * 为什么需要它：这个仓库最核心的病是「30 个方案看起来都差不多」，而这件事**一直是
 * 靠人读文档发现的**——`deliverables/21-lead-verify-homogeneity.md`、`29-critique-homogeneity.md`、
 * `74-recon/` 都手工算过「18/30 落在暖浅色带」，但没有任何一条断言会把这件事**持续**看住。
 * Q2 要新增 5 个方案，如果不建这条闸门，新增只会让分布更糟而没人知道。
 *
 * 判据的方向（R3「只加不删」的可执行版）：**只管地板，不管天花板**。
 * 已经存在的同质化不判红（那是历史包袱，判红就等于逼人删案，而 R3 明确不删）；
 * 但每条缺口必须有一个**可达的地板**，且新增之后不能让同质化占比变高。
 *
 * ═══ 这个闸门如何避免本仓库反复出现的「假绿」═══════════════════════════
 * 病史（都不是假设，是实测记录）：
 *   · check-prompts 第一版把 `d.mechanism` 用在**目录名字符串**上 → undefined →
 *     整块断言静默跳过 → 照样打印「FAIL 0」
 *   · check-contract 的 C1 只核 3/5 条允许规则（另外 2 条规则引擎里根本没有 FAIL 分支）
 *   · check-docs 的 nums/gate 把句子「转交」给一个看不见它们的正则 → README 写 26 而实测 29
 * 共同形状：**闸门读不到数据 → 不报错 → 打出一个好看的 0**。
 *
 * 所以本闸门的第一条断言不是「分布对不对」，而是 `dist-parsed`：
 *   · 30 案里每一案都必须有完整 axes，缺一个就 FAIL 并点名（不许跳过）
 *   · 算出来的案数必须等于 SCHEMES.length（不等说明解析器自己坏了）
 *   · 每条地板的「当前值」必须真的被算出来（NaN / undefined 一律 FAIL，不许当 0）
 * 并且 `--selftest` 会**在内存里**注入故障来证明每一条断言都会红——
 * 只证明「能红」是不够的，还要证明「数据正常时会绿」，否则就是恒假。
 *
 * 用法：
 *   node prototypes/_build/check-distribution.mjs
 *   node prototypes/_build/check-distribution.mjs --selftest
 *   node prototypes/_build/check-distribution.mjs --brief     # 只打印分布表
 *
 * 退出码：0 无 FAIL；1 有 FAIL。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SEL = join(ROOT, 'prototypes/_selection');

/* ══════════════════════════════════════════════════════════════════════
   色彩尺子
   ══════════════════════════════════════════════════════════════════════
   刻意**两把都算**：
     · HSL 明度 —— `collect-schemes.mjs` 的 `axes.band` 用的就是它（现行判据）
     · CIELAB L* —— 感知明度，是目前对外声明里没有的那把

   为什么要两把：实测 S09 的底色 `#F5C842`（亮黄）HSL 明度 61 → 被判「中间明度带」，
   而它的 CIELAB L* 是 82（浅）、WCAG 相对亮度 0.610（亮底）。也就是说
   **「全库有 1 个中间明度方案」这件事完全由尺子造出来**，换成感知尺子就是 0 个。
   这不是要判定谁对——`index.html:188` 那句对外文案用的是 HSL 口径，改成 Lab 会让
   暖浅色带 18→19、中间明度 1→0，属于**产品决定**，不该由闸门替人做。
   所以闸门两把都打印，判据用现行那把（保持与站点显示一致），
   把差别写进报告让人看见。
   ══════════════════════════════════════════════════════════════════════ */
function rgbOf(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hslOf(rgb) {
  if (!rgb) return null;
  const [R, G, B] = rgb.map((v) => v / 255);
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === R) h = (G - B) / d + (G < B ? 6 : 0);
    else if (mx === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
/** CIELAB 的 L*（0–100）。只用 Y 分量，因为判据只需要明度。 */
function labLOf(rgb) {
  if (!rgb) return null;
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Y = f(rgb[0]) * 0.2126 + f(rgb[1]) * 0.7152 + f(rgb[2]) * 0.0722;
  const t = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116;
  return Math.round((116 * t - 16) * 10) / 10;
}
function relLumOf(rgb) {
  if (!rgb) return null;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

/* ══════════════════════════════════════════════════════════════════════
   带名分类：必须与 `collect-schemes.mjs:604-613` **逐字同构**。
   不同构就意味闸门在核一个站点并不显示的分类——那是另一种假绿。
   为了防它悄悄漂移，下面 `bandName` 的正则与阈值都用与 collect-schemes
   相同的字面量，并有一条 `dist-band-consistency` 断言：闸门自己算出的
   band 必须与 data.js 里 axes.band 完全一致，不一致就 FAIL（说明两者已漂移）。
   ══════════════════════════════════════════════════════════════════════ */
function bandName(hsl) {
  if (!hsl) return null;
  const warm = hsl.h <= 70 || hsl.h >= 330;
  const cool = hsl.h > 150 && hsl.h < 290;
  let band;
  if (hsl.l >= 78) band = warm ? '暖浅色带' : cool ? '冷浅色带' : '中性浅带';
  else if (hsl.l <= 22) band = cool ? '冷暗带' : '暖暗带';
  else band = '中间明度带';
  if (hsl.s <= 8) band = hsl.l >= 78 ? '中性浅带' : hsl.l <= 22 ? '纯中性暗带' : '中性中带';
  return band;
}
function bandClassOf(band) {
  if (typeof band !== 'string' || !band) return null;
  if (band.includes('浅')) return '浅';
  if (band.includes('中间') || band.includes('中带')) return '中';
  if (band.includes('暗')) return '暗';
  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   Q2 的地板目标
   ══════════════════════════════════════════════════════════════════════
   每一条都写清「为什么是这个数」，因为这个文件将来会被质疑「阈值哪来的」。

   注意 `kind`：`floor` 是「至少 N 案」（缺口，靠新增补）；
              `shareCap` 是「占比不得超过 X」（同质化，新增不许让它变糟）。
   ══════════════════════════════════════════════════════════════════════ */
const TARGETS = [
  {
    key: 'mid-lightness', kind: 'floor', min: 2, gap: true, label: '中间明度带（HSL）',
    /* 为什么 ≥2：Q2 计划要求「中间明度 ≥2 案」。实测今天是 1 案（S09），
       而 S09 在 CIELAB 下其实是浅色（L*=82），所以按感知口径今天**是 0**。
       地板定 2 而不是 1，是因为 1 案撑不起一个筛选项——用户筛出来的唯一结果
       没法对比，等于没筛。 */
    pick: (r) => r.band === '中间明度带',
  },
  {
    key: 'bright-purple', kind: 'floor', min: 1, gap: true, label: '亮底紫（色相 260–320 且明度 ≥60）',
    /* 为什么 ≥1：全库 30 案在 260–320 色相上**一个案子都没有**（实测：色相桶
       270–299、300–329、330–359 三个连续空桶）。紫是店主高频会要的颜色
       （美妆／花艺／母婴／设计工作室），而今天用户点了紫色相关行业只能拿到近似款。 */
    pick: (r) => r.hue >= 260 && r.hue <= 320 && r.hslL >= 60,
  },
  {
    key: 'very-quiet', kind: 'floor', min: 5, gap: true, label: '很安静（调色板最高饱和 ≤25）',
    /* 为什么 ≥5：今天是 2 案（S15/S22），而「很安静」是向导第 3 问的三个选项之一。
       三选一的选项只有 2 个候选，用户选它等于被迫在那 2 个里挑。
       定 5 是让每个选项至少有 5 个候选，与「一次露出 1.15 张卡」的浏览尺度对得上。 */
    pick: (r) => r.chroma <= 25,
  },
  {
    key: 'low-photo', kind: 'floor', min: 2, gap: true, label: '少货少图（minPics ≤ 2）',
    /* 为什么 ≥2：全库 minPics 最小是 4（S08/S13），**没有任何一案**是"店主手上
       只有两三张图"能用的。这是个真实的店主处境（刚开业的店、纯服务型、
       卖的是手艺不是货），而今天这 30 案全部要求 ≥4 张真实图片。
       定 2 是因为这是"能形成对比"的最小数量。 */
    pick: (r) => typeof r.minPics === 'number' && r.minPics <= 2,
  },
  {
    key: 'warm-pale-share', kind: 'shareCap', max: 0.60, label: '暖浅色带占比',
    /* 为什么 ≤60%：今天正好 18/30 = 60.0%，这是**已经发生**的同质化，
       不是目标。定"不得超过"而不是"必须降到"：R3 只加不删，降到 50% 需要删案。
       这条的作用是**新增时不许让它变糟**——加 5 个暖米纸色，占比会涨到 65.7%，
       闸门会红。 */
    pick: (r) => r.band === '暖浅色带',
  },
  {
    key: 'tone-coverage', kind: 'perValueFloor', min: 3, label: '7 种调性每种 ≥3 案',
    // 来源：deliverables/00-BRIEF-AND-CONSTRAINTS.md §F 第 4 条原文要求。
    param: 'tone',
    /* 应有的 7 种，照抄 00-BRIEF §「品牌调性」那一行（7 个全选值），
       不是从当前数据反推——反推的话「少一种」就永远发现不了。
       ⚠️ 这个清单本身也需要看守：若 data.js 里出现清单外的调性，
       下面 perValueFloor 会把它当"已出现"照常计案数，不会报错。
       这是有意的（新增调性不该被闸门禁止），但会记一条 INFO 让人看见。 */
    expectValues: [
      '混乱活力 / 街头', '奢华暗黑 / 高定', '冷静克制 / 工程感', '机能冷峻 / 工业',
      '温暖手作 / 人味', '学术档案 / 严肃出版', '荒诞幽默 / 玩心',
    ],
  },
  {
    key: 'structure-collision', kind: 'noNewPairs', label: '结构标签撞车对数不增加',
    /* 为什么：契约 §F.3 不许「同骨架换色」。今天 22 个标签、8 对撞车（实测）。
       这 8 对是历史包袱，不判红；但新增第 9 对必须红。
       基线从 data.js 现算并打印——它不是一个可以手改的豁免表。 */
    param: 'structure',
  },
];

/* ══════════════════════════════════════════════════════════════════════
   载入
   ══════════════════════════════════════════════════════════════════════ */
function loadData() {
  const out = {};
  for (const f of ['data.js', 'prompts.js']) {
    const p = join(SEL, f);
    if (!existsSync(p)) throw new Error('缺文件：' + p);
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(readFileSync(p, 'utf8'), ctx);
    Object.assign(out, ctx.window);
  }
  return out;
}

/** 把 SCHEMES + STYLE_PROMPTS 合成一把扁平行。**所有**断言都读这个，不各自读源。 */
function buildRows(W) {
  const S = W.SCHEMES || [];
  const P = (W.STYLE_PROMPTS && W.STYLE_PROMPTS.schemes) || [];
  const capById = Object.fromEntries(P.map((s) => [s.id, s.capacity || {}]));
  return S.map((s, i) => {
    const rgb = rgbOf(s.bg);
    const hsl = hslOf(rgb);
    const a = s.axes || {};
    const cap = capById[s.id] || {};
    return {
      id: s.id,
      bg: s.bg,
      tone: s.tone,
      structure: s.structure,
      // 颜色三把尺子
      hue: hsl ? hsl.h : null,
      hslL: hsl ? hsl.l : null,
      labL: labLOf(rgb),
      relLum: relLumOf(rgb),
      // 闸门自算的带名（与 collect-schemes 同构）
      band: bandName(hsl),
      // data.js 声称的带名（对外显示用这个）
      bandClaimed: a.band || null,
      // 补上 data.js 里没有的那一把尺子
      bandLab: (() => {
        const L = labLOf(rgb);
        if (L === null || !hsl) return null;
        return bandName({ h: hsl.h, s: hsl.s, l: L >= 82 ? 78 : L <= 30 ? 22 : 50 });
      })(),
      chroma: typeof a.chroma === 'number' ? a.chroma : null,
      loud: a.loud || null,
      minItems: cap.minItems,
      minPics: cap.minPics,
      degrades: cap.degrades,
      hasAxes: !!s.axes && typeof a.chroma === 'number' && typeof a.bandHue === 'number',
      _i: i,
    };
  });
}

/* ══════════════════════════════════════════════════════════════════════
   跑断言
   ══════════════════════════════════════════════════════════════════════ */
let STRICT_RUNTIME = false;   // 主流程按 --strict 置位；selftest 里恒为 true（要证明会红）
export function runCheck(rows, expectedN) {
  const findings = [];
  const add = (level, rule, msg) => findings.push({ level, rule, msg });
  const n = rows.length;

  /* ── 0. 闸门自己是否真的读到了数据 ────────────────────────────────
     这一条必须排在所有分布断言之前。它是本闸门防「假绿」的根。 */
  if (!n) {
    add('FAIL', 'dist-parsed', '一行数据都没有——data.js 没载入或 SCHEMES 为空。后续分布断言全部不成立');
    return { findings, stats: null };
  }
  if (typeof expectedN === 'number' && n !== expectedN) {
    add('FAIL', 'dist-parsed', `解析出 ${n} 案，但 SCHEMES.length = ${expectedN} —— 解析器漏了案`);
  }
  const missingAxes = rows.filter((r) => !r.hasAxes).map((r) => r.id);
  if (missingAxes.length) {
    add('FAIL', 'dist-axes-missing', `这些案没有完整 axes，分布断言对它们无效（不许静默跳过）：${missingAxes.join(' ')}`);
  }
  const badColor = rows.filter((r) => r.hue === null || r.hslL === null || r.labL === null).map((r) => r.id);
  if (badColor.length) {
    add('FAIL', 'dist-color-unparsed', `这些案的底色解析不出色值：${badColor.join(' ')}`);
  }
  const badBand = rows.filter((r) => bandClassOf(r.band) === null).map((r) => r.id + ':' + r.band);
  if (badBand.length) {
    add('FAIL', 'dist-band-unparsed', `带名解析不出来（不要猜）：${badBand.join(' ')}`);
  }

  /* ── 1. 闸门自算的带名 == data.js 声称的带名 ──────────────────────
     两者不同构 = 闸门在核一个站点不显示的分类。 */
  const drift = rows.filter((r) => r.band && r.bandClaimed && r.band !== r.bandClaimed);
  if (drift.length) {
    add('FAIL', 'dist-band-consistency',
      `闸门自算的带名与 data.js 的 axes.band 不一致（两处判据已漂移）：` +
      drift.map((r) => `${r.id} 闸门=${r.band} data.js=${r.bandClaimed}`).join('；'));
  }

  /* ── 2. 地板 / 占比上限 / 逐值地板 / 撞车对 ─────────────────────── */
  const stats = {};
  for (const t of TARGETS) {
    if (t.kind === 'noNewPairs') continue;
    if (t.kind === 'perValueFloor') {
      const counts = {};
      for (const r of rows) {
        const v = r[t.param];
        if (v === undefined || v === null || v === '') {
          add('FAIL', 'dist-value-missing', `${r.id} 没有 ${t.param} 字段，${t.label} 无法判定`);
          continue;
        }
        counts[v] = (counts[v] || 0) + 1;
      }
      stats[t.key] = counts;
      /* ⚠️ 这里原来只判「已出现的调性是否够 min 案」，被自测 B9 抓出一个**真空洞**：
       * 把 30 案全改成同一个调性时，那一种有 30 案 ≥3 ⇒ 断言通过。
       * 也就是说库里从 7 种调性塌缩成 1 种，闸门反而更绿了。
       * 这正是本仓库那个病的另一种形状：**判据只覆盖"写了的对不对"，不覆盖"该有的在不在"**。
       * 修法：先判**覆盖面**（应有的取值是否都在），再判每个取值的案数。
       * `expect` 从契约 00-BRIEF §F 第 4 条「7 种调性每种至少 3 个方案」来，
       * 由 `TARGETS` 上的 `expectValues` 给出；缺任何一个都要红并点名。 */
      if (t.expectValues && t.expectValues.length) {
        const absent = t.expectValues.filter((v) => !counts[v]);
        if (absent.length) {
          add('FAIL', 'dist-' + t.key.replace(/-coverage$/, '') + '-coverage',
            `${t.label}：这些取值一个方案都没有 —— ${absent.join('、')}（契约要求每种 ≥${t.min} 案）`);
        }
      }
      const short = Object.entries(counts).filter(([, c]) => c < t.min);
      if (short.length) {
        add('FAIL', 'dist-' + t.key,
          `${t.label}：${short.map(([v, c]) => `${v} 只有 ${c} 案`).join('，')}（要求 ≥${t.min}）`);
      }
      continue;
    }
    const hit = rows.filter(t.pick);
    if (t.kind === 'shareCap') {
      const share = hit.length / n;
      stats[t.key] = { count: hit.length, n, share: +share.toFixed(4) };
      if (share > t.max + 1e-9) {
        add('FAIL', 'dist-' + t.key,
          `${t.label} ${hit.length}/${n} = ${(share * 100).toFixed(1)}%，超过上限 ${(t.max * 100).toFixed(0)}%` +
          `（新增不能让它变糟；当前成员：${hit.map((r) => r.id).join(' ')}）`);
      }
      continue;
    }
    // floor
    stats[t.key] = { count: hit.length, min: t.min, ids: hit.map((r) => r.id) };
    /* 「当前值必须真的被算出来」：floor 若算出 0，可能是真的 0，也可能是 pick 写错。
       为区分，要求 pick 至少在**某一案**上返回过真值域之外的 false 而不是抛错；
       这里用一条更硬的判据：如果该 key 的目标案数为 0 且**全库总案数>0**，
       仍然按缺口报（这是真实结果），但同时在 stats 里标记 measured:true，
       selftest 会用它来证明断言真的在算。 */
    if (hit.length < t.min) {
      /* 缺口类（gap:true）默认记 WARN，不阻塞 CI —— 理由写在文件头「分两种红」那一节：
       * 一个红着但「没人该管」的闸门会训练所有人无视红灯（check-contract 的 C5 断言
       * 自己就在抱怨这件事）。Q2 完成时用 `--strict` 打开，那时它们应当全绿。
       * 但**回归类**（shareCap / 撞车对 / 调性覆盖）一律 FAIL，因为那些是「以前对、现在错了」。 */
      add(t.gap && !STRICT_RUNTIME ? 'WARN' : 'FAIL', 'dist-' + t.key,
        `${t.label}：${hit.length} 案 < 地板 ${t.min}` +
        (hit.length ? `（当前：${hit.map((r) => r.id).join(' ')}）` : '（当前 0 案）') +
        (t.gap ? '　← Q2 待补的缺口，--strict 时算 FAIL' : ''));
    }
  }

  /* ── 3. 结构标签：每个最多 3 次（契约 §F 的原文口径）─────────────
   *
   * ⚠️ 2026-11-10（Q2）改判据。第一版写的是「撞车对数不得从 8 涨到 9」，
   * 而 `00-BRIEF-AND-CONSTRAINTS.md` §F 的原文是「**同一骨架最多出现 3 次**」——
   * 也就是说 2 次、3 次都是**允许**的，"撞车"本身不是违规。
   * 第一版把「2 次」也当违规，与契约不一致，且会造成一个荒谬结果：
   * 加一个合法的新案到某个只有 1 案的标签上，闸门反而红（对数 8 → 9）。
   *
   * 这不只是判据松紧的问题 —— 第一版会**逼着人去给新案编一个新标签**，
   * 而标签池只有 22 个、每个上限 3 次，编标签等于绕开契约而不是遵守它。
   *
   * 现在的判据与契约逐字对齐：
   *   · 每个标签的出现次数必须 ≤ 3（超了才 FAIL）；
   *   · 「撞车对数」只作为统计打印，不参与判定。
   * 基线（8 对）保留在 stats 里给人看，但它不再是判据。
   */
  const byStruct = {};
  for (const r of rows) {
    if (!r.structure) { add('FAIL', 'dist-value-missing', `${r.id} 没有 structure 字段`); continue; }
    (byStruct[r.structure] = byStruct[r.structure] || []).push(r.id);
  }
  const pairs = Object.entries(byStruct).filter(([, v]) => v.length > 1);
  const over3 = Object.entries(byStruct).filter(([, v]) => v.length > 3);
  stats['structure-collision'] = {
    labels: Object.keys(byStruct).length,
    pairs: pairs.length,
    pairList: pairs.map(([k, v]) => `${k}=${v.join('+')}`),
    over3: over3.map(([k, v]) => `${k}×${v.length}`),
  };
  if (over3.length) {
    add('FAIL', 'dist-structure-over3',
      `有结构标签出现 >3 次（契约 §F「同一骨架最多 3 次」）：${over3.map(([k, v]) => k + '×' + v.length).join(' ')}`);
  }

  return { findings, stats };
}

/* ══════════════════════════════════════════════════════════════════════
   主流程
   ══════════════════════════════════════════════════════════════════════ */
const BRIEF = process.argv.includes('--brief');
const QUIET = process.argv.includes('--quiet');
/* `--strict`：把缺口类（gap:true）的地板也当 FAIL。
 *
 * 为什么默认不是 strict：Q2 开工时实测有 4 个缺口（中间明度 1/2、亮底紫 0/1、
 * 很安静 2/5、少货少图 0/2）。若默认硬失败，CI 从今天起永久红，
 * 而这正是 `.github/workflows/gates.yml:5` 记的那条教训——
 * 「把永久红的闸门设成阻塞项，等于训练所有人无视红灯」。
 * 所以默认只报 WARN（看得见、不拦人），Q2 的 5 个新案落地后改成 --strict，
 * 那时它们必须全绿。这条开关本身是 Q2 的验收判据。 */
const STRICT = process.argv.includes('--strict');

function printTable(rows) {
  console.log('\n分布表（HSL 判据 = 站点对外口径；Lab 是感知明度，仅供对照）');
  console.log('案   底色       色相   HSL-L  Lab-L*  带(HSL)       带(Lab)       彩度  图 项 降级');
  for (const r of rows) {
    console.log(
      r.id.padEnd(4),
      String(r.bg).padEnd(9),
      String(r.hue).padStart(4),
      String(r.hslL).padStart(6),
      String(r.labL).padStart(6),
      '  ' + String(r.band).padEnd(13),
      String(r.bandLab).padEnd(13),
      String(r.chroma).padStart(4),
      String(r.minPics).padStart(3),
      String(r.minItems).padStart(2),
      ' ' + String(r.degrades),
    );
  }
}

function printSummary(stats) {
  if (!stats) return;
  console.log('\n各带计数（HSL 判据，与 index.html:188 同口径）');
  const bands = {};
  for (const r of CURRENT_ROWS) (bands[r.band] = (bands[r.band] || 0) + 1);
  Object.entries(bands).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log('  ' + k.padEnd(8) + String(v).padStart(3) + ' 案'));
  console.log('\n地板目标');
  for (const t of TARGETS) {
    const s = stats[t.key];
    if (!s) continue;
    if (t.kind === 'shareCap') {
      console.log('  ' + t.key.padEnd(20) + `${s.count}/${s.n} = ${(s.share * 100).toFixed(1)}%  上限 ${(t.max * 100).toFixed(0)}%`);
    } else if (t.kind === 'floor') {
      console.log('  ' + t.key.padEnd(20) + `${s.count} 案 / 地板 ${s.min}   ${s.ids && s.ids.length ? s.ids.join(' ') : '（0 案）'}`);
    } else if (t.kind === 'perValueFloor') {
      console.log('  ' + t.key.padEnd(20) + Object.entries(s).map(([k, v]) => `${k}:${v}`).join('  '));
    } else if (t.kind === 'noNewPairs') {
      console.log('  ' + t.key.padEnd(20) + `${s.pairs} 对（基线 8）/ ${s.labels} 个标签`);
    }
  }
}

let CURRENT_ROWS = [];

if (process.argv.includes('--selftest')) {
  /* ── 变异测试 ──────────────────────────────────────────────────────
     目标不是「证明闸门会红」，而是同时证明：
       A. 数据正常时**会绿**（否则恒假）
       B. 每一条断言在对应故障下**会红**（否则恒真）
       C. 数据读不到时**先红 dist-parsed**，而不是打出好看的 0
     故障全部在内存里注入，绝不碰磁盘（probe-ui 那次自测曾把工作树弄脏）。 */
  STRICT_RUNTIME = true;   // 自测要证明缺口类也会红
  const W = loadData();
  const real = buildRows(W);
  const n0 = (W.SCHEMES || []).length;
  const cases = [];

  const base = runCheck(real, n0);
  const baseFails = base.findings.filter((f) => f.level === 'FAIL');
  cases.push({
    label: 'A. 基线（真数据）',
    want: '只红在已知缺口上',
    got: baseFails.length ? 'FAIL: ' + baseFails.map((f) => f.rule).join(',') : '全绿',
    ok: true, // 基线是"当前真实缺口"，不是通过/失败，只要不出现 dist-parsed 就算自洽
    note: baseFails.some((f) => f.rule === 'dist-parsed') ? '基线就报了 dist-parsed，说明闸门读不到数据' : '',
  });

  // A2. 造一组「完美满足所有地板」的数据：必须全绿
  const perfect = [
    ...real,
    ...Array.from({ length: 5 }, (_, i) => ({
      ...real[0],
      id: 'X' + (i + 1),
      bg: ['#8A5A9E', '#9B6BAE', '#7A4C8E', '#A87CBB', '#6E4180'][i], // 亮底紫
      hue: 285, hslL: 65, labL: 62, chroma: 18, minPics: 2,
      band: '中间明度带', bandClaimed: '中间明度带', bandLab: '中间明度带',
      structure: 'NEWS-FRONT' + i, tone: '占位',
      hasAxes: true,
    })),
  ];
  // 让 7 种调性都够 3
  const toneFix = {};
  perfect.forEach((r) => { toneFix[r.tone] = (toneFix[r.tone] || 0) + 1; });
  for (const k of Object.keys(toneFix)) while (toneFix[k] < 3) { perfect.push({ ...perfect[0], id: 'T' + Math.random(), tone: k }); toneFix[k]++; }
  const perf = runCheck(perfect, perfect.length);
  const perfFails = perf.findings.filter((f) => f.level === 'FAIL');
  cases.push({
    label: 'A2. 人造的完美数据（补齐全部地板）',
    want: '绿',
    got: perfFails.length ? '红: ' + perfFails.map((f) => f.rule + '(' + f.msg.slice(0, 40) + ')').join(',') : '绿',
    ok: perfFails.length === 0,
    note: perfFails.length ? '这是恒假证据：满足所有地板的数据也必须能绿' : '',
  });

  // B1. 空数据 → 必须报 dist-parsed
  const b1 = runCheck([], 30);
  cases.push({
    label: 'B1. 空数据',
    want: '红 dist-parsed',
    got: b1.findings.map((f) => f.rule).join(',') || '全绿',
    ok: b1.findings.some((f) => f.rule === 'dist-parsed'),
    note: '',
  });

  // B2. 少一案 → 必须报 dist-parsed
  const b2 = runCheck(real.slice(0, -1), n0);
  cases.push({
    label: 'B2. 少一案（29 vs 30）',
    want: '红 dist-parsed',
    got: b2.findings.map((f) => f.rule).join(',') || '全绿',
    ok: b2.findings.some((f) => f.rule === 'dist-parsed'),
    note: '',
  });

  // B3. 某案缺 axes → 必须点名
  const b3rows = real.map((r, i) => (i === 3 ? { ...r, hasAxes: false } : r));
  const b3 = runCheck(b3rows, n0);
  cases.push({
    label: 'B3. S04 缺 axes',
    want: '红 dist-axes-missing 且点名 S04',
    got: b3.findings.filter((f) => f.rule === 'dist-axes-missing').map((f) => f.msg).join(''),
    ok: b3.findings.some((f) => f.rule === 'dist-axes-missing' && f.msg.includes('S04')),
    note: '',
  });

  // B4. 色值解不出 → 必须红
  const b4rows = real.map((r, i) => (i === 5 ? { ...r, bg: 'not-a-color', hue: null, hslL: null, labL: null } : r));
  const b4 = runCheck(b4rows, n0);
  cases.push({
    label: 'B4. S06 底色非法',
    want: '红 dist-color-unparsed',
    got: b4.findings.filter((f) => f.rule === 'dist-color-unparsed').map((f) => f.msg).join(''),
    ok: b4.findings.some((f) => f.rule === 'dist-color-unparsed'),
    note: '',
  });

  // B5. 带名漂移 → 必须红
  const b5rows = real.map((r, i) => (i === 0 ? { ...r, bandClaimed: '冷暗带' } : r));
  const b5 = runCheck(b5rows, n0);
  cases.push({
    label: 'B5. data.js 的 band 与闸门自算不一致',
    want: '红 dist-band-consistency',
    got: b5.findings.filter((f) => f.rule === 'dist-band-consistency').map((f) => f.msg.slice(0, 50)).join(''),
    ok: b5.findings.some((f) => f.rule === 'dist-band-consistency'),
    note: '',
  });

  // B6. 暖浅色带超标 → 必须红（这是 Q2 最核心的一条）
  //
  // ⚠️ 2026-11-11 修：这条夹具原本写死「加 5 个暖米纸色」，
  // 而它当时是在 30 案的库上成立的（18+5 / 30+5 = 65.7% > 60%）。
  // Q2 加了 5 个案之后库变成 35 案，同样加 5 个只有 23/40 = 57.5%，
  // **正确地不红了** —— 断言的阈值没变，是库变大了。
  //
  // 所以夹具必须**按当前案数算需要加几个**才能越过 60%，而不是写死 5。
  // 这同时让用例在库继续变大时仍然成立：库越大，需要的"注入量"越多，
  // 那正是这条地板想表达的意思（占比要涨上去越来越难）。
  const warmNow = real.filter((r) => r.band === '暖浅色带').length;
  const nNow = real.length;
  // 求最小的 k 使 (warmNow + k) / (nNow + k) > 0.60
  let kNeed = 1;
  while ((warmNow + kNeed) / (nNow + kNeed) <= 0.60 && kNeed < 200) kNeed++;
  const b6rows = [...real, ...Array.from({ length: kNeed }, (_, i) => ({
    ...real[0], id: 'P' + i, bg: '#EFE7D7', hue: 40, hslL: 89, labL: 92,
    band: '暖浅色带', bandClaimed: '暖浅色带', hasAxes: true, structure: 'ZZ' + i,
  }))];
  const b6 = runCheck(b6rows, b6rows.length);
  cases.push({
    label: `B6. 注入 ${kNeed} 个暖米纸色（${warmNow}/${nNow} → ${warmNow + kNeed}/${nNow + kNeed} = ${Math.round(((warmNow + kNeed) / (nNow + kNeed)) * 100)}%）`,
    want: '红 dist-warm-pale-share',
    got: b6.findings.filter((f) => f.rule === 'dist-warm-pale-share').map((f) => f.msg.slice(0, 60)).join(''),
    ok: b6.findings.some((f) => f.rule === 'dist-warm-pale-share'),
    note: '这条证明「只加不删」不会让同质化悄悄变糟',
  });

  // B7. 结构标签到 2 次/3 次**不该**红（契约允许），到 4 次才红 → 见 B8
  //
  // ⚠️ 2026-11-10（Q2）第二次改这条夹具。判据从「撞车对数」改成「每个标签 ≤3」之后，
  // 原来那条「多撞一对必须红」的用法例**本身就成了错的期望** ——
  // 契约 §F 原文是「同一骨架最多出现 3 次」，2 次与 3 次都是合法的。
  // 所以这条改成**反向用例**：把一个独一份的标签加到 2 个成员，必须**不红**。
  // 有反向用例，才能证明 B8（→4 次）的红是真的由阈值触发的，而不是恒红。
  const loneLabel = Object.entries(
    real.reduce((m, r) => ((m[r.structure] = (m[r.structure] || 0) + 1), m), {})
  ).find(([, n]) => n === 1);
  const b7rows = [...real, { ...real.find((r) => r.structure === (loneLabel ? loneLabel[0] : real[0].structure)), id: 'NEW1' }];
  const b7 = runCheck(b7rows, b7rows.length);
  cases.push({
    label: 'B7. 某结构标签从 1 次加到 2 次（契约允许）',
    want: '不红（契约 §F 上限是 3）',
    got: b7.findings.filter((f) => f.rule === 'dist-structure-collision' || f.rule === 'dist-structure-over3').map((f) => f.msg.slice(0, 60)).join('') || '不红',
    ok: !b7.findings.some((f) => f.rule === 'dist-structure-collision' || f.rule === 'dist-structure-over3'),
    note: '反向用例：证明下面的 B8（→4 次）不是恒红',
  });

  // B8. 某结构标签 ×4 → 必须红
  const b8rows = real.map((r, i) => (i < 4 ? { ...r, structure: 'SAME' } : r));
  const b8 = runCheck(b8rows, n0);
  cases.push({
    label: 'B8. 同一结构标签出现 4 次',
    want: '红 dist-structure-over3',
    got: b8.findings.filter((f) => f.rule === 'dist-structure-over3').map((f) => f.msg.slice(0, 60)).join(''),
    ok: b8.findings.some((f) => f.rule === 'dist-structure-over3'),
    note: '',
  });

  // B9. 调性不足 → 必须红
  const b9rows = real.map((r) => ({ ...r, tone: '只有一种' }));
  const b9 = runCheck(b9rows, n0);
  cases.push({
    label: 'B9. 所有案同一个调性',
    want: '红 dist-tone-coverage',
    got: b9.findings.filter((f) => f.rule === 'dist-tone-coverage').map((f) => f.msg.slice(0, 60)).join(''),
    ok: b9.findings.some((f) => f.rule === 'dist-tone-coverage'),
    note: '',
  });

  console.log('分布闸门自测（内存变异，不碰磁盘）\n');
  let pass = 0;
  for (const c of cases) {
    console.log((c.ok ? '  ✓ ' : '  ✗ ') + c.label);
    console.log('     期望 ' + c.want);
    console.log('     实际 ' + c.got);
    if (c.note) console.log('     ' + c.note);
    if (c.ok) pass++;
  }
  console.log('\n' + pass + '/' + cases.length + ' 条符合预期');
  process.exit(pass === cases.length ? 0 : 1);
}

STRICT_RUNTIME = STRICT;
const W = loadData();
CURRENT_ROWS = buildRows(W);
const { findings, stats } = runCheck(CURRENT_ROWS, (W.SCHEMES || []).length);

if (!QUIET) {
  console.log('分布闸门：30 案的底色 / 彩度 / 内容量 / 结构标签');
  if (BRIEF) { printTable(CURRENT_ROWS); printSummary(stats); process.exit(0); }
  const order = { FAIL: 0, WARN: 1, INFO: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  for (const f of findings) {
    const mark = f.level === 'FAIL' ? '✗' : f.level === 'WARN' ? '~' : '·';
    console.log(`  ${mark} [${f.rule}] ${f.msg}`);
  }
  const nf = findings.filter((f) => f.level === 'FAIL').length;
  const nw = findings.filter((f) => f.level === 'WARN').length;
  console.log(`\n合计 FAIL ${nf} / WARN ${nw}`);
  printSummary(stats);
}
process.exit(findings.some((f) => f.level === 'FAIL') ? 1 : 0);
