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
  /* ⚠️ 不要给「潮牌」补同义词「潮流品牌」：S12 正向段写的是「潮流品牌快闪页」，
     补上它会让「芯片 S12 直连潮牌 / 搜潮牌 0 行」这个真缺陷**静默通过**。
     这正是本仓库最反复的病：给缺陷写豁免，然后闸门报绿。
     等 S12 的 scenes 里真的写了「潮牌」两个字，或搜索索引接入同义词组，再把这条补回来。 */
  '潮牌': ['潮牌'],
  '音乐产品': ['音乐产品', '黑胶'],
  '音频设备': ['音频设备', '音频'],
  // 同上：S09 写的是「修理、清洁、烘焙、理发」，不含「修鞋」「修鞋理发」整体。
  '修鞋理发': ['修鞋理发'],
  // 同上：S09 写的是「独立餐饮」，不含「小吃」。
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
function searchHaystack(r, sceneIndex) {
  const parts = [
    r.cn, r.en, r.structure, r.tone, r.def, r.family, r.layout, r.visuals, r.motion,
    r.quirk, r.fontsSpec, r.risk, positiveScenes(r),
    r.axes ? Object.values(r.axes).join(' ') : '',
    (r.palette || []).join(' '),
  ];
  let hay = parts.join(' ').toLowerCase();
  // 同义词展开（与 app.js 逐字同构）
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
  const hay = Object.fromEntries(SCHEMES.map((r) => [r.id, searchHaystack(r, P.sceneIndex)]));

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
      const hits = SCHEMES.filter((r) => forms.some((f) => hay[r.id].includes(f.toLowerCase()))).map((r) => r.id);
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
      const hayOk = forms.some((f) => hay[id].toLowerCase().includes(f.toLowerCase()));
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
