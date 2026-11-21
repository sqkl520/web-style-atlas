#!/usr/bin/env node
/* 攻击 K：--positive-control 的可证伪性。
 *
 * 它声称「拿 35 个原型当产物打分，若判它们违规就是判据错了」。
 * 但 score(id, opts) 从不读 opts，永远读 BT/<id>/index.html。
 * 于是正对照实际做的是：对 18 个**盲测产物**打分，另 17 个静默跳过，
 * 然后打印「检查 35 个原型，0 个被判违规」并 exit 0。
 *
 * 本探针证明两件事：
 *   K1 把某个原型改坏，正对照不会响（因为它读的根本不是原型）。
 *   K2 正对照的成功不依赖原型内容 —— 它依赖的是 _blindtest/ 下 18 份产物恰好干净。
 */
import { readFileSync, writeFileSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');

console.log('══ K1 正对照读的是哪个目录：静态证据 ══\n');
{
  const src = readFileSync(join(BT, 'score.mjs'), 'utf8');
  const sig = src.match(/function score\([^)]*\)\s*\{/);
  const firstLines = src.slice(sig.index, sig.index + 400);
  console.log('  score() 的前 8 行：');
  for (const l of firstLines.split('\n').slice(0, 8)) console.log('    ' + l);
  console.log('');
  console.log('  → 路径全部来自 join(BT, id)，`opts` 只在签名里出现，函数体从不引用。');
  console.log('    正对照传入的临时 htmlPath/promptPath 被完全丢弃。');
}

console.log('\n══ K2 让正对照读真原型：结果会变吗 ══\n');
{
  /* 复刻「正对照本来想做的事」：拿原型 HTML + style.css 拼起来打分。
     用临时目录，不改 score.mjs，也不改任何真实产物。 */
  const W = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(W);
  const P2 = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P2);
  const stub = {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
    addEventListener: () => {}, readyState: 'complete', body: { appendChild() {} },
  };
  const G = {
    STYLE_PROMPTS: P2.STYLE_PROMPTS, SCHEMES: W.SCHEMES, document: stub,
    location: { href: 'http://x/', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { clipboard: { writeText: async () => {} } },
    history: { replaceState() {} }, setTimeout, clearTimeout,
  };
  new Function('window', 'document', 'location', 'localStorage', 'navigator', 'history', 'setTimeout', 'clearTimeout',
    readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8'))(
    G, G.document, G.location, G.localStorage, G.navigator, G.history, setTimeout, clearTimeout);

  const r = await import('./_rt-scorelib.mjs');
  const TMPID = 'S97proto';
  const TMP = join(BT, TMPID);
  let checked = 0, bad = [];
  for (const s of W.SCHEMES) {
    const pdir = join(ROOT, 'prototypes', s.dir);
    const ip = join(pdir, 'index.html');
    if (!existsSync(ip)) continue;
    const cssPath = join(pdir, 'style.css');
    const html = readFileSync(ip, 'utf8') +
      (existsSync(cssPath) ? '\n<style>\n' + readFileSync(cssPath, 'utf8') + '\n</style>' : '');
    const prompt = G.buildStylePrompt(s.id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 });
    rmSync(TMP, { recursive: true, force: true });
    (await import('node:fs')).mkdirSync(TMP, { recursive: true });
    writeFileSync(join(TMP, 'index.html'), html);
    writeFileSync(join(TMP, '_prompt.txt'), prompt);
    const res = r.score(TMPID);
    checked++;
    if (res.ok && res.banned.length) bad.push(`${s.id}: ${res.banned.map(b => b.rule + '×' + b.hits).join('；')}`);
  }
  rmSync(TMP, { recursive: true, force: true });
  console.log(`  真正读原型打分：检查 ${checked} 个，${bad.length} 个被判违规`);
  if (bad.length) {
    for (const b of bad.slice(0, 20)) console.log('    ✗ ' + b);
  } else {
    console.log('    → 真原型的 ⑤ 禁项全部干净。');
  }
  console.log('');
  console.log('  ⚠️ 真原型有 ' + bad.length + ' 个被判违规 —— 正对照报的"0 个"是假的；');
  console.log('     而官方正对照
     **不是**靠读原型得出的 —— 17 个原型根本没被打开，18 个读的是盲测产物。');
  console.log('     结论对而证据错，正是这个仓库反复记录的那类缺陷。');
}