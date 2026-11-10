// 探针 2（纯文本，无 CDP）：把 dump30.json 里 30 条提示词拆成**原子约束**并分类 M/S/J。
// 分类规则硬编码在下面 TAXONOMY 注释里，报告里逐条列出，可复核。
//
// 为什么要"原子"而不是"按行"：
//   提示词里「1. 配色只用这几个值：#A、#B、#C、#D。不新增更多彩色。」是一行但含 5 条断言，
//   按行统计会把 5 条算成 1 条，M 类被系统性低估 —— 而任务 1 的表格正是后续所有工作的分母。
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = process.env.BCONST_DIR || 'D:/Web/style/deliverables/70-exec/probes-b';
const dump = JSON.parse(readFileSync(OUT + '/dump30.json', 'utf8'));
const ids = Object.keys(dump.prompts);

/* ── 分类学（写死在代码里，报告 §1 复制同一份）─────────────────────────
 * M = 机械可验：存在一个确定性提取器 + 二值判据，任何人跑同一段代码得同一结果。
 * S = 半机械：需要"哪些元素算数"的判断、模糊匹配、或先解释再量。
 * J = 只能人判：审美/气质/叙事，无判据。
 */
const C = { M: 'M', S: 'S', J: 'J' };

const HEX = /#[0-9A-Fa-f]{6}\b/g;

/** 去掉语义括号：#EFE7D7（paper） → #EFE7D7。括号可能是全角也可能是半角。 */
function stripHexSemantics(line) {
  return line.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');
}

function push(list, o) { list.push(o); }

/** 从 "标题按这个顺序取第一个可用的：A → B → C（前一个缺字…）。正文同理，按序取：D → E。" 里抽链 */
function parseFontLine(line) {
  const r = { displayStack: [], bodyStack: [], mono: '', singleFace: null, bans: [], cjkNote: '' };
  const single = line.match(/全站只用一款字体：([^（(]+)/);
  if (single) r.singleFace = single[1].trim();
  const d = line.match(/标题按这个顺序取第一个可用的：([^（(]+)/) || line.match(/标题用 ([^。]+)。/);
  if (d) r.displayStack = d[1].split('→').map((s) => s.trim()).filter(Boolean);
  const b = line.match(/正文同理，按序取：([^。]+)。/) || line.match(/正文用 ([^。]+)。/);
  if (b) r.bodyStack = b[1].split('→').map((s) => s.trim()).filter(Boolean);
  const m = line.match(/等宽 ([^、]+)、tabular-nums/);
  if (m) r.mono = m[1].trim();
  const ban = line.match(/不要用 ([^。]+)。/);
  if (ban) r.bans = ban[1].split('、').map((s) => s.trim()).filter(Boolean);
  const cjk = line.match(/(中文没有指定字族[^。]*。|(标题|正文)这条链里没有中文字族[^。]*。|也不要跳过上面这两条链[^。]*。)/);
  if (cjk) r.cjkNote = cjk[1];
  return r;
}

const per = {};
for (const id of ids) {
  const text = dump.prompts[id];
  const lines = text.split('\n');
  const items = [];

  /* ── 段 0：开头两行空槽 ─────────────────────────────────────────────
   * 「我经营＿＿＿＿。」「页面需要让访客＿＿＿＿。」
   * 可验的是"AI 有没有把空槽当成已知事实去编内容"——判据模糊（怎么算编？），归 S。 */
  const openerLines = lines.filter((l) => /^我经营|^页面需要让访客|^下面这份是这个风格的施工图/.test(l));
  for (const l of openerLines) {
    push(items, { sec: 'opener', cat: C.S, kind: 'no-fabricated-premise', text: l,
      note: '空槽是否被 AI 自行编造成事实，只能人判/模糊判' });
  }

  /* ── 段 1：风格一句话 + 调性 ─────────────────────────────────────── */
  const plainLine = lines.find((l) => l.startsWith('请把整页做成这个风格：'));
  if (plainLine) {
    push(items, { sec: 'style', cat: C.J, kind: 'plain-style', text: plainLine,
      params: { plain: plainLine.replace(/^请把整页做成这个风格：/, '').replace(/。$/, '') } });
  }
  const toneLine = lines.find((l) => l.startsWith('这个案子的调性是'));
  if (toneLine) {
    push(items, { sec: 'style', cat: C.J, kind: 'tone', text: toneLine });
  }

  /* ── 段 2：签名动作（机制句）──────────────────────────────────────
   * 里面塞满数字（11°、24px、0.4/0.8px、144px），但这些数字**不是都能在 DOM 里定位到**
   * ——「一块实色多边形以 11° 切入 4 栏版心」里的 11° 属于哪一个元素？提示词没说。
   * 所以整句归 S；其中的数字作为 M 候选单独抽出来（见 mechNumbers），
   * 用来回答"机制句里的数字有没有落到 CSS"这个更弱的问题。 */
  const mechLine = lines.find((l) => l.startsWith('这个风格的签名动作：'));
  let mechNumbers = [];
  if (mechLine) {
    push(items, { sec: 'mechanism', cat: C.S, kind: 'mechanism', text: mechLine });
    mechNumbers = (mechLine.match(/-?\d+(?:\.\d+)?\s*(?:px|°|%|栏|行|级|档|s|ms)?/g) || [])
      .map((s) => s.trim()).filter((s) => /\d/.test(s));
  }

  /* ── 段 3：视觉硬约束 1–5 ───────────────────────────────────────── */
  const hardStart = lines.findIndex((l) => l.startsWith('视觉硬约束'));
  const structStart = lines.findIndex((l) => l === '结构约束：');
  for (let i = hardStart + 1; i < structStart; i++) {
    const l = lines[i];
    if (!l) continue;
    if (/^1\. 配色只用这几个值：/.test(l)) {
      const bare = stripHexSemantics(l);
      const hexes = bare.match(HEX) || [];
      for (const h of hexes) {
        push(items, { sec: 'hard', cat: C.M, kind: 'palette', text: l, params: { hex: h.toUpperCase() } });
      }
      push(items, { sec: 'hard', cat: C.M, kind: 'palette-closed', text: l,
        note: '「不新增更多彩色」= 渲染色集合 ⊆ 声称集合（需排除 alpha 派生的同族色）' });
    } else if (/^2\. 字体：/.test(l) || /^   /.test(l) && /不要用 /.test(l)) {
      // 字体行占两行：主行 + 缩进的禁令行；两行都吃到
      const joined = l.startsWith('   ') ? l : l;
      const f = parseFontLine(joined + (lines[i + 1] && lines[i + 1].startsWith('   ') ? lines[i + 1] : ''));
      if (f.singleFace) {
        push(items, { sec: 'hard', cat: C.M, kind: 'font-single', text: joined, params: { face: f.singleFace } });
      } else {
        if (f.displayStack.length) push(items, { sec: 'hard', cat: C.M, kind: 'font-display', text: joined, params: { stack: f.displayStack } });
        if (f.bodyStack.length) push(items, { sec: 'hard', cat: C.M, kind: 'font-body', text: joined, params: { stack: f.bodyStack } });
      }
      if (f.mono) push(items, { sec: 'hard', cat: C.M, kind: 'font-mono', text: joined, params: { face: f.mono } });
      if (f.bans.length) push(items, { sec: 'hard', cat: C.M, kind: 'font-ban', text: joined, params: { bans: f.bans } });
      if (f.cjkNote) push(items, { sec: 'hard', cat: C.S, kind: 'font-cjk-fallback', text: f.cjkNote,
        note: '「有中文字族」的判定需要枚举字形覆盖，非纯 CSS 取值' });
      i += (lines[i + 1] && lines[i + 1].startsWith('   ')) ? 1 : 0;
    } else if (/^3\. 圆角：/.test(l)) {
      const zero = /全站一律 0/.test(l);
      push(items, { sec: 'hard', cat: C.M, kind: 'radius', text: l, params: { allZero: zero } });
    } else if (/^4\. 阴影：/.test(l)) {
      const kind = /无阴影/.test(l) ? 'none' : /只用 inset/.test(l) ? 'inset-only' : /drop-shadow/.test(l) ? 'drop-only' : 'other';
      push(items, { sec: 'hard', cat: C.M, kind: 'shadow', text: l, params: { kind } });
    } else if (/^5\. 线宽只用这几级：/.test(l)) {
      const widths = (l.match(/(\d+(?:\.\d+)?)px/g) || []).map((s) => parseFloat(s));
      push(items, { sec: 'hard', cat: C.M, kind: 'line-widths', text: l, params: { widths } });
    }
  }

  /* ── 段 4：结构约束 1–6 ─────────────────────────────────────────── */
  const degStart = lines.findIndex((l) => l.startsWith('防退化'));
  for (let i = structStart + 1; i < degStart; i++) {
    const l = lines[i];
    if (!/^\d\. /.test(l)) continue;
    const n = parseInt(l[0], 10);
    if (n === 1) {
      const m = l.match(/排了 (\d+) 个/);
      push(items, { sec: 'struct', cat: C.S, kind: 'count', text: l, params: { n: m ? +m[1] : null },
        note: '要数"哪些 DOM 元素算一个条目"——先解释再量，归 S' });
    } else if (n === 2) {
      push(items, { sec: 'struct', cat: C.S, kind: 'real-count', text: l });
    } else if (n === 3) {
      push(items, { sec: 'struct', cat: C.S, kind: 'degrades', text: l });
    } else if (n === 4) {
      const m = l.match(/至少要 (\d+) 个/);
      push(items, { sec: 'struct', cat: C.M, kind: 'image-slots', text: l, params: { n: m ? +m[1] : null } });
    } else if (n === 5) {
      push(items, { sec: 'struct', cat: C.M, kind: 'no-carousel', text: l });
    } else if (n === 6) {
      push(items, { sec: 'struct', cat: C.J, kind: 'reuse-premise', text: l });
    }
  }

  /* ── 段 5：防退化 ①–⑧ ──────────────────────────────────────────── */
  const verdictStart = lines.findIndex((l) => l.startsWith('验收三问'));
  for (let i = degStart + 1; i < verdictStart; i++) {
    const l = lines[i];
    const m = l.match(/^([①②③④⑤⑥⑦⑧])\s*(.*)$/);
    if (!m) continue;
    const idx = '①②③④⑤⑥⑦⑧'.indexOf(m[1]) + 1;
    // 分类见 TAXONOMY：可二值判的给 M，需要解释"什么算 feature 卡片/视差"的给 S
    const map = {
      1: [C.M, 'no-gradient', '线性/径向渐变 + 指定色 #6366F1 + 光斑(blur) 都能从 computed style 直接判'],
      2: [C.M, 'no-round-softshadow', '圆角与外投影均为 computed 值'],
      3: [C.S, 'no-hero-cliche', '「居中大标题/副标题/两个 CTA」需要判定字号档与视觉主次'],
      4: [C.S, 'no-three-feature', '「三条等宽 feature 卡片」要判定"等宽""feature"'],
      5: [C.M, 'no-emoji-iconfont', 'emoji 可正则；彩色 iconfont 可查 font-family/字体文件；扁平插画需人判 → 拆两条'],
      6: [C.M, 'no-glassmorphism', 'backdrop-filter 与半透明浮层是 computed 值'],
      7: [C.S, 'no-glow-neon', '「发光字/霓虹/扫描线」边界模糊（text-shadow 算不算？扫描线怎么算？）'],
      8: [C.S, 'no-carousel-parallax', '「视差/翻转」要判定滚动行为，静态量测取不到'],
    };
    const [cat, kind, note] = map[idx];
    push(items, { sec: 'degrade', cat, kind, text: l, note });
    if (idx === 5) push(items, { sec: 'degrade', cat: C.S, kind: 'no-illustration', text: l,
      note: '「扁平插画」没有人能机械判' });
  }

  /* ── 段 6：本案专属风险句 ──────────────────────────────────────── */
  const riskLine = lines.find((l) => l.startsWith('这一案最容易做成的错误样子'));
  if (riskLine) {
    push(items, { sec: 'risk', cat: C.S, kind: 'risk', text: riskLine,
      note: '含面积比例/线宽等可量数字，但主语是"最易滑向的观感"——半机械' });
    push(items, { sec: 'risk', cat: C.J, kind: 'risk-vibe', text: riskLine });
  }

  /* ── 段 7：验收三问 ──────────────────────────────────────────────
   * ⚠️ 2026-10-29 修：原条件 `lines[i-1]==='验收三问…' || i===verdictStart+1` 只对
   * **第一问**成立（第二、三问的上一行是问题 1），于是 30 案各漏 2 条共 60 条。
   * 现在从 verdictStart 起扫到"输出要求"，按问号内容匹配。 */
  const outStart0 = lines.findIndex((l) => l.startsWith('输出要求'));
  for (let i = verdictStart + 1; i < outStart0; i++) {
    const l = lines[i];
    if (!/^\d\. /.test(l)) continue;
    if (/^1\. 拿远半米看/.test(l)) push(items, { sec: 'verdict', cat: C.J, kind: 'v1-look', text: l });
    else if (/^2\. 随便挑一条内容/.test(l)) push(items, { sec: 'verdict', cat: C.S, kind: 'v2-id-consistency', text: l,
      note: '判据明确（三处逐字相等）但要先定义"哪三处"' });
    else if (/^3\. 扫一眼/.test(l)) push(items, { sec: 'verdict', cat: C.S, kind: 'v3-scan', text: l });
  }

  /* ── 段 8：输出要求 ──────────────────────────────────────────────
   * ⚠️ 2026-10-29 修：原循环从 `outStart+1` 开始，而 "只给一个完整单文件 HTML" 就在
   * **outStart 这一行本身**，于是 30 案各漏 1 条 single-file（M 类）。改为从 outStart 起。 */
  const outStart = lines.findIndex((l) => l.startsWith('输出要求'));
  for (let i = outStart; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    if (/只给一个完整单文件 HTML/.test(l)) push(items, { sec: 'output', cat: C.M, kind: 'single-file', text: l });
    else if (/^不引 React\/Vue/.test(l)) push(items, { sec: 'output', cat: C.M, kind: 'no-framework', text: l });
    else if (/^图片位置写成/.test(l)) push(items, { sec: 'output', cat: C.S, kind: 'img-placeholder', text: l });
    else if (/^移动端单列/.test(l)) push(items, { sec: 'output', cat: C.S, kind: 'mobile-single-col', text: l });
  }

  const cnt = { M: 0, S: 0, J: 0 };
  for (const it of items) cnt[it.cat]++;
  per[id] = { chars: text.length, items, counts: cnt, total: items.length, mechNumbers };
}

const totals = { M: 0, S: 0, J: 0, total: 0 };
for (const id of ids) { for (const k of ['M', 'S', 'J']) totals[k] += per[id].counts[k]; totals.total += per[id].total; }

writeFileSync(OUT + '/constraints.json', JSON.stringify({ taxonomy: { M: '机械可验', S: '半机械', J: '只能人判' }, per, totals }, null, 1), 'utf8');

/* ── 输出：CLI 表 + 分节统计 ─────────────────────────────────────── */
console.log('case  chars  M   S   J  total  | 按节 M/S/J');
console.log('----  -----  --  --  --  -----  | ----------');
const secAgg = {};
for (const id of ids) {
  const p = per[id];
  const bySec = {};
  for (const it of p.items) {
    bySec[it.sec] = bySec[it.sec] || { M: 0, S: 0, J: 0 };
    bySec[it.sec][it.cat]++;
    secAgg[it.sec] = secAgg[it.sec] || { M: 0, S: 0, J: 0 };
    secAgg[it.sec][it.cat]++;
  }
  const fmt = (o) => ['M', 'S', 'J'].map((k) => (o[k] || 0)).join('/');
  console.log(
    id.padEnd(5), String(p.chars).padStart(5), String(p.counts.M).padStart(3),
    String(p.counts.S).padStart(3), String(p.counts.J).padStart(3), String(p.total).padStart(6),
    ' | ', Object.entries(bySec).map(([k, v]) => k + ':' + fmt(v)).join('  ')
  );
}
console.log('\nTOTAL M=' + totals.M + ' S=' + totals.S + ' J=' + totals.J + ' total=' + totals.total +
  '  (M%=' + (totals.M / totals.total * 100).toFixed(1) + ')');
console.log('按节：');
for (const [k, v] of Object.entries(secAgg)) {
  const t = v.M + v.S + v.J;
  console.log('  ' + k.padEnd(10), 'M=' + v.M, 'S=' + v.S, 'J=' + v.J, 'total=' + t);
}

/* 机制句里的数字统计（M 候选） */
const mechAll = ids.flatMap((id) => per[id].mechNumbers);
console.log('\n机制句抽出数字个数：' + mechAll.length + '，去重 ' + new Set(mechAll).size);
const unit = {};
for (const s of mechAll) { const u = (s.match(/px|°|%|栏|行|级|档|ms|s$/) || ['plain'])[0]; unit[u] = (unit[u] || 0) + 1; }
console.log('按单位：', JSON.stringify(unit));

/* 全库重复率：30 条里有多少行是完全相同的（模板化程度） */
const lineCount = {};
for (const id of ids) for (const l of dump.prompts[id].split('\n')) if (l.trim()) lineCount[l] = (lineCount[l] || 0) + 1;
const shared = Object.entries(lineCount).filter(([, c]) => c >= 25);
const sharedChars = shared.reduce((a, [l, c]) => a + l.length * c, 0);
const allChars = ids.reduce((a, id) => a + per[id].chars, 0);
console.log('\n出现在 ≥25/30 案里的行：' + shared.length + ' 种，占全库字数 ' +
  (sharedChars / allChars * 100).toFixed(1) + '%');

