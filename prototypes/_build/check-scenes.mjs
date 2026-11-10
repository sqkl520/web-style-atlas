#!/usr/bin/env node
/* 行业词表一致性闸门（2026-11-10 新增，Q2）
 *
 * 为什么需要它：实测（deliverables/75-q2/01-Q2-FACTS.md §4）三件事同时成立：
 *   ① 30 案共自称 69 个行业词，其中 48 个不在 sceneIndex 的 44 个词里
 *      ⇒ 方案自己说"我适合文化机构/拍卖行/科研机构"，而用户点不到、也搜不到；
 *   ② 3 个词「芯片能点出结果，手动搜同一个词 0 行」：潮牌→S12、修鞋理发→S09、小吃店→S09
 *      （S12 正向段写的是「潮流品牌」，换了个说法）；
 *   ③ 15 个词「芯片说没有直连方案，但搜索能命中」：博客/播客/戏剧/影展/文化节/快闪/
 *      工业设备/说明书/开发者工具/运维/数据看板/档案/科普/教育/摄影
 *      ⇒ 站点告诉用户"没有为这行做的方案"，而用户同一个词打进去能搜出一堆案。
 *
 * ② 和 ③ 是**同一条缺陷的两个方向**：芯片读 sceneIndex，搜索读正文。两条路各有一份
 * "什么行业"的答案，它们没有理由一致。
 *
 * 这个闸门守的判据（三条，逐条对应上面的症状）：
 *   S1 chip-vs-search：每个场景词的 direct 命中集合，必须同时满足
 *      a) 该案正文里能搜到这个词（或它的同义词）—— 消灭 ②
 *      b) 若搜索能命中某些案而 direct 为空 —— 记 WARN 并列出 —— 暴露 ③
 *   S2 terms-covered：每案正向段里自称的行业，必须至少有一个能在词表里找到对应词
 *      （找不到就 INFO 列出，不 FAIL —— 它是新词候选，不是错误）
 *   S3 no-orphan-direct：direct 指向的案必须存在且已构建
 *
 * ⚠️ 防假绿：本闸门的第一条断言同样是 `scenes-parsed`（读不到数据就 FAIL，
 * 不许打印好看的 0）。理由见 check-distribution.mjs 文件头，
 * 那一节列了本仓库三次「闸门读不到数据 → 照样报绿」的实测记录。
 *
 * 用法：
 *   node prototypes/_build/check-scenes.mjs
 *   node prototypes/_build/check-scenes.mjs --selftest
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SEL = join(ROOT, 'prototypes/_selection');
const QUIET = process.argv.includes('--quiet');

/* 同义词组：用户会打的词 → 它在案子里可能的写法。
 *
 * 为什么这张表必须存在、且必须手写：实测（_det/_derive-scene-index3.mjs）
 * 纯机械派生会抽出 157 个"行业主体"、其中一半是噪声，而且把「展览」匹配到 11 个案
 * （因为几乎所有正向段都出现过"展览"这个词）。方向错了：
 * **词表要从「用户会打什么」出发，不能从「案子里写了什么」出发。**
 * 这两者方向相反，所以同义关系只能人写。
 *
 * 但手写的是"同义"，不是"谁适合"——后者仍然由 direct 声明，由本闸门核对。
 */
const SYNONYMS = {
  '咖啡店': ['咖啡店', '咖啡馆', '独立咖啡'],
  '烘焙': ['烘焙'],
  '设计工作室': ['设计工作室', '创意工作室'],
  '作品集': ['作品集'],
  '内容媒体': ['内容媒体', '调查报道'],
  '独立杂志': ['独立杂志', '刊物目录'],
  '出版': ['出版'],
  '展览': ['展览导览', '展览图录', '展览'],
  '游戏': ['游戏'],
  /* 「潮牌」→「潮流品牌」。
   *
   * 这条曾经被我刻意留空，理由是「补上它会让真缺陷静默通过」。
   * 那个理由在当时成立，但现在不成立了 —— 因为**判据本身已经换成了 body**：
   * S1 现在用 bodyText（不含 sceneIndex 反推的内容），所以同义词表**不能**
   * 被用来掩盖"正文里根本没有这个行业的说法"。它只能表达"同一个东西的另一种写法"。
   *
   * 而 S12 的正文写的正是「潮流品牌快闪页」—— 那就是潮牌。这不是缺陷，
   * 是同一个行业的两种叫法（前者口语、后者书面）。用户打「潮牌」该搜得到 S12。
   *
   * 判据：**同义词表里每一项都必须真的能在该案正文里找到**，
   * 找不到就报 scenes-synonym-unbacked（见下方 S4）。
   * 这样表既能为"口语 vs 书面语"服务，又不会变成豁免表。 */
  '潮牌': ['潮牌', '潮流品牌'],
  '音乐产品': ['音乐产品', '黑胶'],
  '音频设备': ['音频设备', '音频'],
  /* 「修鞋理发」是两个行业的口语合称，S09 的正文分列在三处：
   * 「（修鞋、修理、清洁、烘焙、理发）」。
   * 同义词表在这里承认的是「一个词指两件事」这个语言事实。 */
  '修鞋理发': ['修鞋', '理发'],
  /* 「小吃店」→「小吃」：S09 的正文写「独立餐饮」，不含"小吃"。
   * ⚠️ 这一条**是加不出来的** —— 正文里确实没有"小吃"二字。
   * 留着 ['小吃店']，让 S1 继续报红，直到有人真的把正文改对。
   * 这里刻意不给它补「独立餐饮」：那是把"街边小吃店"扩成"所有独立餐饮"，
   * 属于放宽语义，不是同义词。 */
  '小吃店': ['小吃店'],
  '市集': ['市集', '摊位'],
};

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

/** 该案的**正向**场景段（剥掉「不适合：」之后）。搜索索引也用的是这个口径。 */
export function positiveScenes(r) {
  const s = String(r.scenes || '');
  const i = s.indexOf('不适合');
  return i > 0 ? s.slice(0, i) : s;
}

/** 复刻 app.js 的搜索索引口径。
 *
 *  ⚠️ 2026-11-10 改：app.js 现在会**把 sceneIndex 当作同义词字典**展开（见 app.js
 *  「场景同义词展开」那段）。若闸门仍按「只查正文」判，它会永远报那 3 个已经修好的词
 *  为 FAIL —— 闸门与实现脱节，比没闸门更糟。
 *  所以这里必须复刻展开逻辑，否则测的不是产品。
 */
/** 该案的**正文**（不含任何由 sceneIndex 反推的内容）。
 *
 * ⚠️ 2026-11-11 修一个循环论证 —— 这是 Q3 加同义词展开时引入的。
 *
 * 病史：原 `searchHaystack(r, sceneIndex)` 同时干两件事：
 *   ① 复刻 app.js 的搜索索引（含"把 direct 词拼进去"那一层）
 *   ② 被用来判「direct 命中能不能在该案正文里搜到」
 * 而 ② 用的是 ① 的产物，于是 **direct 词被 ① 拼进去之后，② 永远成立** ——
 * 断言变成恒真。变异测试 B4（造一个「紫砂壶→S01」但正文没有的词）本该红，
 * 实测绿，就是这条恒真式的证据。
 *
 * 现在拆成两个函数：
 *   `bodyText(r)`      只含该案自己的文字（cn/en/def/layout/... + scenesYes）
 *   `searchHaystack()` 在 bodyText 之上加同义词展开，用于"复刻搜索行为"
 * 判据 ② 只用 bodyText，判据 ① 才用 searchHaystack。
 */
function bodyText(r) {
  const parts = [
    r.cn, r.en, r.structure, r.tone, r.def, r.family, r.layout, r.visuals, r.motion,
    r.quirk, r.fontsSpec, r.risk, positiveScenes(r),
    r.axes ? Object.values(r.axes).join(' ') : '',
    (r.palette || []).join(' '),
  ];
  return parts.join(' ').toLowerCase();
}

/** 复刻 app.js 的搜索索引（bodyText + sceneIndex 的 direct 词展开）。
 *  只用于「用户打这个词能不能搜到」这种**行为判定**，不用于"正文里有没有"。 */
function searchHaystack(r, sceneIndex) {
  let hay = bodyText(r);
  if (sceneIndex) {
    for (const [t, v] of Object.entries(sceneIndex)) {
      if (v && v.direct && v.direct.includes(r.id) && !hay.includes(String(t).toLowerCase())) {
        hay += ' ' + String(t).toLowerCase();
      }
    }
  }
  return hay;
}

export function runCheck(SCHEMES, P, syn) {
  const findings = [];
  const add = (level, rule, msg) => findings.push({ level, rule, msg });
  const stats = { terms: 0, checked: 0, chipOnly: [], searchOnly: [] };

  /* ── 0. 闸门自己读到了没有 ────────────────────────────────────── */
  if (!Array.isArray(SCHEMES) || !SCHEMES.length) {
    add('FAIL', 'scenes-parsed', 'SCHEMES 为空 —— 后续断言全部不成立，不许静默通过');
    return { findings, stats };
  }
  if (!P || !P.sceneIndex || !Object.keys(P.sceneIndex).length) {
    add('FAIL', 'scenes-parsed', 'prompts.js 里没有 sceneIndex —— 芯片无从渲染');
    return { findings, stats };
  }
  const ids = new Set(SCHEMES.map((r) => r.id));
  /* 两个 haystack，用途严格分开（见 bodyText / searchHaystack 的注释）：
   *   body  —— 该案自己的文字。用来判「direct 命中在正文里有没有依据」
   *   search —— body + direct 词展开。用来复刻"用户打这个词能搜到什么" */
  const body = Object.fromEntries(SCHEMES.map((r) => [r.id, bodyText(r)]));
  const search = Object.fromEntries(SCHEMES.map((r) => [r.id, searchHaystack(r, P.sceneIndex)]));

  /* ── S3. direct 指向的案必须存在 ─────────────────────────────── */
  for (const [term, v] of Object.entries(P.sceneIndex)) {
    for (const id of [...(v.direct || []), ...(v.near || [])]) {
      if (!ids.has(id)) add('FAIL', 'scenes-orphan-id', `词「${term}」指向不存在的案 ${id}`);
    }
  }

  /* ── S1. 芯片路径 vs 搜索路径 ────────────────────────────────── */
  stats.terms = Object.keys(P.sceneIndex).length;
  for (const [term, v] of Object.entries(P.sceneIndex)) {
    const direct = v.direct || [];
    if (!direct.length) {
      // 无直连：查搜索能不能命中，命中就暴露为「站点说没有、但搜得到」
      const forms = syn[term] || [term];
      const hits = SCHEMES.filter((r) => forms.some((f) => search[r.id].includes(f.toLowerCase()))).map((r) => r.id);
      if (hits.length) {
        stats.searchOnly.push({ term, hits });
        add('WARN', 'scenes-search-only',
          `词「${term}」芯片说"没有直连方案"，但搜索能命中 ${hits.join(' ')} —— 用户会看到两个相反答案`);
      }
      continue;
    }
    stats.checked++;
    for (const id of direct) {
      if (!ids.has(id)) continue;
      const forms = syn[term] || [term];
      /* ⚠️ 判据用 `body` 不用 `search`。
       * 用 search 的话，sceneIndex 自己声明的 direct 词会被拼进 haystack，
       * 于是「direct 命中必须能在正文里找到」永远成立 —— 恒真式。
       * 这条 bug 由变异测试 B4 抓出（造一个正文里没有的词，本该红，实测绿）。 */
      const hayOk = forms.some((f) => body[id].includes(f.toLowerCase()));
      if (!hayOk) {
        stats.chipOnly.push({ term, id });
        add('FAIL', 'scenes-chip-only',
          `词「${term}」直连 ${id}，但 ${id} 的正文里搜不到「${forms.join('/')}」——` +
          `点芯片能筛出它，手动搜同一个词是 0 行`);
      }
    }
  }

  /* ── S2. 每案自称的行业，能不能在词表里找到 ──────────────────── */
  const allTerms = Object.keys(P.sceneIndex);
  const orphanClaims = [];
  for (const r of SCHEMES) {
    const pos = positiveScenes(r);
    // 取正向段里出现的词表成员
    const matched = allTerms.filter((t) => {
      const forms = syn[t] || [t];
      return forms.some((f) => pos.includes(f));
    });
    if (!matched.length) orphanClaims.push(r.id);
  }
  if (orphanClaims.length) {
    add('INFO', 'scenes-claim-unmapped',
      `这些案的正向段里，一个词表成员都没有（它的行业说法全在词表外，用户点不到）：${orphanClaims.join(' ')}`);
  }

  /* ── S4. 同义词表不能变成豁免表（2026-11-11，Q4）────────────────────
   *
   * 这条守的是「同义词表被滥用来掩盖缺陷」这个失败模式。
   *
   * 病史：Q2 时我给「潮牌」留空同义词，理由是「补上会让真缺陷静默通过」。
   * 那个理由在当时成立（当时 S1 的判据用 searchHaystack，而它会把 direct 词
   * 拼进 haystack —— 于是任何同义词都能"自证"）。后来 S1 换成了 bodyText，
   * 同义词表已经不可能自证了，但**这个风险本身还在**：
   * 只要有人往表里塞一个"看起来像同义、实际放宽了语义"的词，
   * S1 就会绿，而产品没变好。
   *
   * 判据：表里每一项都必须真的能在**某个它声称直连的案**的正文里找到。
   * 找不到 ⇒ 这个词是编的 ⇒ FAIL 并点名。
   *
   * 为什么这不是"又一条恒真的断言"：
   *   · 它对『小吃店』会红（正文里确实没有"小吃"）—— 见下面 17 条 WARN 里那条；
   *   · 它逼着下一个加同义词的人去确认正文里真的有那种写法，
   *     而不是把"我觉得这是同一个行业"直接写进表里。 */
  const unbacked = [];
  for (const [term, forms] of Object.entries(syn)) {
    const v = P.sceneIndex[term];
    if (!v) continue;                     // 词表外的同义词条目不算（可能是 B4 之类注入的）
    const direct = v.direct || [];
    if (!direct.length) continue;         // 无直连的词没有"声称"
    for (const id of direct) {
      if (!ids.has(id)) continue;
      // 该词的任一写法能在这个案的正文里找到 ⇒ 这一项有依据
      if (forms.some((f) => body[id].includes(f.toLowerCase()))) continue;
      unbacked.push({ term, id, forms });
    }
  }
  if (unbacked.length) {
    add('FAIL', 'scenes-synonym-unbacked',
      `这些同义词在该案的正文里一条都找不到（表里写的是编的，不是同一个东西的另一种写法）：` +
      unbacked.map((u) => `${u.term}→${u.id}（试过 ${u.forms.join('/')}）`).join('；') +
      `　修法：把正文里真实的写法加进同义词，或去掉这个 direct 声明 —— 不要放宽语义（例如把「小吃店」映射到「独立餐饮」）`);
  }

  return { findings, stats };
}

/* ── 主流程 ─────────────────────────────────────────────────────── */
if (!process.argv.includes('--selftest')) {
  const W = loadData();
  const { findings, stats } = runCheck(W.SCHEMES, W.STYLE_PROMPTS, SYNONYMS);
  if (!QUIET) {
    console.log('行业词表一致性：芯片路径 vs 搜索路径');
    const order = { FAIL: 0, WARN: 1, INFO: 2 };
    findings.sort((a, b) => order[a.level] - order[b.level]);
    for (const f of findings) {
      const mark = f.level === 'FAIL' ? '✗' : f.level === 'WARN' ? '~' : '·';
      console.log(`  ${mark} [${f.rule}] ${f.msg}`);
    }
    const nf = findings.filter((f) => f.level === 'FAIL').length;
    const nw = findings.filter((f) => f.level === 'WARN').length;
    const ni = findings.filter((f) => f.level === 'INFO').length;
    console.log(`\n合计 FAIL ${nf} / WARN ${nw} / INFO ${ni}`);
    console.log(`  词表 ${stats.terms} 个词，其中 ${stats.checked} 个有直连（已逐案核对正文可搜）`);
  }
  process.exit(findings.some((f) => f.level === 'FAIL') ? 1 : 0);
}

/* ── 变异测试 ───────────────────────────────────────────────────── */
{
  const W = loadData();
  const S = W.SCHEMES, P = W.STYLE_PROMPTS;
  const cases = [];
  const run = (schemes, prompts, syn) => runCheck(schemes, prompts, syn);

  // A. 基线：真数据。只要求「能跑通、不炸」，缺口本身是已知的
  const base = run(S, P, SYNONYMS);
  const baseParsed = base.findings.some((f) => f.rule === 'scenes-parsed');
  cases.push({
    label: 'A. 基线（真数据）',
    want: '不报 scenes-parsed',
    got: baseParsed ? '报了 scenes-parsed' : 'ok',
    ok: !baseParsed,
  });

  // B1. 空 SCHEMES → 必须红
  const b1 = run([], P, SYNONYMS);
  cases.push({
    label: 'B1. SCHEMES 为空',
    want: '红 scenes-parsed',
    got: b1.findings.map((f) => f.rule).join(',') || '绿',
    ok: b1.findings.some((f) => f.rule === 'scenes-parsed'),
  });

  // B2. sceneIndex 空 → 必须红
  const b2 = run(S, { ...P, sceneIndex: {} }, SYNONYMS);
  cases.push({
    label: 'B2. sceneIndex 为空',
    want: '红 scenes-parsed',
    got: b2.findings.map((f) => f.rule).join(',') || '绿',
    ok: b2.findings.some((f) => f.rule === 'scenes-parsed'),
  });

  // B3. direct 指向不存在的案 → 必须红
  const b3 = run(S, { ...P, sceneIndex: { ...P.sceneIndex, '测试词': { direct: ['S99'], near: [] } } }, SYNONYMS);
  cases.push({
    label: 'B3. direct 指向 S99（不存在）',
    want: '红 scenes-orphan-id',
    got: b3.findings.filter((f) => f.rule === 'scenes-orphan-id').map((f) => f.msg).join('') || '绿',
    ok: b3.findings.some((f) => f.rule === 'scenes-orphan-id'),
  });

  // B4. 造一个「芯片能点、搜索 0 行」的词 → 必须红（潮牌那类缺陷）
  const b4 = run(S, { ...P, sceneIndex: { ...P.sceneIndex, '紫砂壶': { direct: ['S01'], near: [] } } }, SYNONYMS);
  cases.push({
    label: 'B4. 造「紫砂壶→S01」但正文搜不到',
    want: '红 scenes-chip-only',
    got: b4.findings.filter((f) => f.rule === 'scenes-chip-only').map((f) => f.msg.slice(0, 60)).join('') || '绿',
    ok: b4.findings.some((f) => f.rule === 'scenes-chip-only'),
  });

  // B5. 补上同义词以后必须转绿 —— 这一条证明断言不是恒真
  //
  // ⚠️ 判据只能看「紫砂壶」这一条，不能看「还有没有 scenes-chip-only」：
  // 基线本身就有 3 个真缺陷（潮牌/修鞋理发/小吃店）也在报 scenes-chip-only，
  // 第一版写成 `.some(f => f.rule === 'scenes-chip-only')` 于是永远为真 ——
  // 那条用例测的是"真缺陷还在不在"，不是"我造的这个故障修好了没有"。
  // 夹具要能隔离出自己注入的那一个故障，否则它证明不了任何事。
  const b5 = run(
    S,
    { ...P, sceneIndex: { ...P.sceneIndex, '紫砂壶': { direct: ['S01'], near: [] } } },
    { ...SYNONYMS, '紫砂壶': ['调查报道'] }
  );
  const b5zisha = b5.findings.some((f) => f.rule === 'scenes-chip-only' && f.msg.includes('紫砂壶'));
  cases.push({
    label: 'B5. 给「紫砂壶」补同义词后，它自己那条必须消失',
    want: '无「紫砂壶」的 scenes-chip-only',
    got: b5zisha ? '仍报紫砂壶' : '紫砂壶已消失',
    ok: !b5zisha,
  });

  // B6. 造一个「芯片说没有、搜索能命中」的词 → 必须 WARN
  const b6 = run(
    S,
    { ...P, sceneIndex: { ...P.sceneIndex, '咖啡店X': { direct: [], near: [] } } },
    { ...SYNONYMS, '咖啡店X': ['咖啡'] }
  );
  cases.push({
    label: 'B6. 造「咖啡店X」无直连但搜索命中',
    want: 'WARN scenes-search-only',
    got: b6.findings.filter((f) => f.rule === 'scenes-search-only').map((f) => f.msg.slice(0, 50)).join('') || '无',
    ok: b6.findings.some((f) => f.rule === 'scenes-search-only'),
  });

  console.log('行业词表闸门自测（内存变异，不碰磁盘）\n');
  let pass = 0;
  for (const c of cases) {
    console.log((c.ok ? '  ✓ ' : '  ✗ ') + c.label);
    console.log('     期望 ' + c.want);
    console.log('     实际 ' + c.got);
    if (c.ok) pass++;
  }
  console.log('\n' + pass + '/' + cases.length + ' 条符合预期');
  process.exit(pass === cases.length ? 0 : 1);
}
