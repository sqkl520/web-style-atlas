/* 验收 4：其他筛选器组合（底色/亮度带/内容量/调性/结构/门槛/闸门/排序）+ 芯片 的抽测。
 *
 * 判据不是"看起来对"，而是每条组合都：
 *   1) 与在 Node 里独立算出的期望行数**逐条相等**（期望由 data.js 直接算，不经过页面逻辑）；
 *   2) 行卡上印出来的 id 集合与期望 id 集合**逐案相同**；
 *   3) 点「清空筛选」后回到 30/30。
 * 期望值独立实现一遍是有意的：如果我只比对"页面自己前后是否一致"，那页面把 AND 写成 OR
 * 也一样能自洽。
 *
 * 跑：node deliverables/66-exec/_filters-probe.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = 'D:/Web/style';
const PAGE = 'file:///' + ROOT + '/prototypes/_selection/index.html';

/* ── 期望值：在 Node 里独立算 ─────────────────────────────── */
const t = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
const body = t.slice(t.indexOf('= ') + 2);
const ALL = JSON.parse(body.slice(0, body.lastIndexOf(']') + 1));
const P = (() => {
  const src = readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8');
  const g = { window: {} };
  new Function('window', src)(g.window);
  return g.window.STYLE_PROMPTS;
})();
const stateKey = (r) => (!r.built ? '未建原型' : !r.gate ? '已建 · 未渲染' : '已建 · 已渲染');
const gateKey = (r) => (!r.gate ? '未渲染' : 'FAIL ' + r.gate.fail);
function expected({ ground = [], band = [], load = [], loud = [], fr = [], thr = [], tone = [], st = [], gate = [], ids = [], q = '' }) {
  return ALL.filter((r) => {
    const ax = r.axes || {};
    if (ids.length && !ids.includes(r.id)) return false;
    if (ground.length && !ground.includes(ax.ground)) return false;
    if (band.length && !band.includes(ax.band)) return false;
    if (load.length && !load.includes(ax.load)) return false;
    if (loud.length && !loud.includes(ax.loud)) return false;
    if (fr.length && !fr.includes(r.fr)) return false;
    if (thr.length && !thr.includes(r.threshold)) return false;
    if (tone.length && !tone.includes(r.tone)) return false;
    if (st.length && !st.includes(stateKey(r))) return false;
    if (gate.length && !gate.includes(gateKey(r))) return false;
    if (q) {
      const hay = [r.id, r.cn, r.en, r.family, r.fonts, r.def, r.tone, r.structure,
        r.errorCode, r.threshold, r.layout, r.visuals, r.quirk, r.scenesYes,
        ax.ground, ax.band, ax.load, ax.loud, (r.palette || []).join(' ')].join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }).map((r) => r.id).sort();
}

/* ── 10 组抽测（覆盖九组筛选器 + 芯片 + 排序可见性） ──────────── */
const CASES = [
  { id: 'f01-ground', name: '底色：亮底', ground: ['亮底'] },
  { id: 'f02-ground-band', name: '亮底 AND 暖浅色带', ground: ['亮底'], band: ['暖浅色带'] },
  { id: 'f03-load-loud', name: '一屏说清 AND 很安静', load: ['一屏说清'], loud: ['很安静'] },
  { id: 'f04-fr-thr', name: 'F 型 AND 门槛低', fr: ['F'], thr: ['低'] },
  { id: 'f05-fr-or', name: '组内多选：F 或 R（并集）', fr: ['F', 'R'] },
  { id: 'f06-tone', name: '调性：学术档案 / 严肃出版', tone: ['学术档案 / 严肃出版'] },
  { id: 'f07-gate', name: '闸门：FAIL 0', gate: ['FAIL 0'] },
  { id: 'f08-state', name: '建成状态：已建 · 已渲染', st: ['已建 · 已渲染'] },
  { id: 'f09-chip-search', name: '芯片「咖啡店」AND 搜索「手冲」', ids: ['S06', 'S09', 'S19', 'S22'], q: '手冲' },
  { id: 'f10-chip-ground', name: '芯片「咖啡店」AND 暗底（应为 0，须有可点退路）', ids: ['S06', 'S09', 'S19', 'S22'], ground: ['暗底'] },
  { id: 'f11-chip-band', name: '芯片「设计工作室」AND 冷暗带', ids: ['S08', 'S16', 'S28'], band: ['冷暗带'] },
  { id: 'f12-q-cn', name: '搜索：报', q: '报' },
];

const b = await Browser.launch({ width: 1440, height: 900 });
const out = { cases: [], fails: [] };
const fail = (m) => { out.fails.push(m); console.log('  ✗ ' + m); };
try {
  const page = await b.newPage();
  await page.goto(PAGE);
  await sleep(900);
  await page.eval(() => {
    window.__f = {
      reset() { document.getElementById('reset').click(); },
      type(v) {
        const q = document.getElementById('q');
        q.value = v; q.dispatchEvent(new Event('input', { bubbles: true }));
      },
      chip(term) {
        for (const b of document.querySelectorAll('#flt-scene button[data-scene]')) {
          if (b.getAttribute('data-scene') === term) { b.click(); return true; }
        }
        return false;
      },
      press(host, label) {
        const btn = [...document.querySelectorAll(host + ' button')].find((x) => x.textContent.indexOf(label) === 0 ||
          x.textContent.replace(/\d+$/, '') === label);
        if (!btn) return false;
        btn.click(); return true;
      },
      rows() { return [...document.querySelectorAll('#ledger .row')].map((r) => r.getAttribute('data-id')).sort(); },
      count() { return document.getElementById('count').textContent.trim(); },
      emptyShown() { return !document.getElementById('empty').hidden; },
      acts() { return [...document.querySelectorAll('#e-next .e-act')].map((x) => x.textContent); },
    };
  });

  for (const c of CASES) {
    await page.eval(() => window.__f.reset());
    const steps = [];
    if (c.ids && c.ids.length) {
      const term = c.name.match(/「(.+?)」/);
      steps.push(['chip', term ? term[1] : '']);
      await page.eval((t2) => window.__f.chip(t2), term ? term[1] : '');
    }
    for (const [host, vals] of [['#flt-ground', c.ground], ['#flt-band', c.band], ['#flt-load', c.load],
      ['#flt-loud', c.loud], ['#flt-fr', c.fr], ['#flt-thr', c.thr], ['#flt-tone', c.tone],
      ['#flt-state', c.st], ['#flt-gate', c.gate]]) {
      for (const v of vals || []) {
        steps.push(['press', host, v]);
        await page.eval(([h, l]) => window.__f.press(h, l), [host, v]);
      }
    }
    if (c.q) { steps.push(['type', c.q]); await page.eval((v) => window.__f.type(v), c.q); }
    await sleep(60);
    const got = await page.eval(() => window.__f.rows());
    const want = expected(c);
    const count = await page.eval(() => window.__f.count());
    const emptyShown = await page.eval(() => window.__f.emptyShown());
    const acts = await page.eval(() => window.__f.acts());
    const same = got.length === want.length && got.every((x, i) => x === want[i]);
    out.cases.push({ id: c.id, name: c.name, steps, want, got, count, emptyShown, acts, ok: same });
    if (same) {
      console.log(`  ✓ ${c.id} ${c.name} → ${got.length} 行 [${got.join(' ')}]`);
    } else {
      fail(`${c.id} ${c.name} → 页面 ${got.length} 行，期望 ${want.length} 行；差集 页面多[${got.filter((x) => !want.includes(x))}] 期望多[${want.filter((x) => !got.includes(x))}]`);
    }
    if (!got.length && !acts.length) fail(`${c.id} 0 行时没有任何可点退路`);
  }

  /* 排序：只验"换排序不改变集合"，排序本身不该筛掉任何行 */
  await page.eval(() => window.__f.reset());
  const base = await page.eval(() => window.__f.rows());
  for (const v of ['fr', 'thr', 'gate', 'built', 'n']) {
    await page.eval((val) => {
      const s = document.getElementById('sort');
      s.value = val; s.dispatchEvent(new Event('change', { bubbles: true }));
    }, v);
    await sleep(40);
    const r2 = await page.eval(() => window.__f.rows());
    const ok = r2.length === base.length && r2.every((x, i) => x === base[i]);
    console.log('  ' + (ok ? '✓' : '✗') + ' 排序 ' + v + ' → 仍是 ' + r2.length + ' 行');
    if (!ok) fail('排序 ' + v + ' 改变了行集合');
  }

  await page.eval(() => window.__f.reset());
  await sleep(60);
  const rs = await page.eval(() => window.__f.rows());
  console.log('\n== reset == ' + rs.length + ' 行 / ' + (await page.eval(() => window.__f.count())));
  out.reset = { rows: rs.length, count: await page.eval(() => window.__f.count()) };
  if (rs.length !== 30) fail('reset 后不是 30 行');

  await page.close();
} finally {
  await b.close();
}
writeFileSync(join(HERE, '_filters-probe.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('\n' + (out.fails.length ? '失败 ' + out.fails.length + ' 项' : '全部通过'));
process.exit(out.fails.length ? 1 : 0);
