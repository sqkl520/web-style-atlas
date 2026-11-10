// P16：收尾三问
//  (1) 前提 2：不搜词、不点芯片时，模板层还有没有常驻出口（页头 #tpl-exit）
//  (2) 前提 3：到底有几个"读了但没人传"的参数；o.tone 与 SCHEMES.tone 冲突时谁赢
//  (3) 前提 1：minItems 是"设计规模"，而 S07 真页到底排了几条（N 的来源）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1600 });

// (1) 常驻模板出口
const exit = await p.eval(() => {
  const e = document.getElementById('tpl-exit');
  if (!e) return { found: false };
  const r = e.getBoundingClientRect();
  return {
    found: true, tag: e.tagName, text: (e.textContent || '').trim().slice(0, 60),
    href: e.getAttribute('href') || e.querySelector('a')?.getAttribute('href') || null,
    visible: r.width > 0 && r.height > 0, top: Math.round(r.top), hrefs: [...e.querySelectorAll('a')].map((a) => a.getAttribute('href')),
  };
});
console.log('== (1) 页头常驻模板出口 #tpl-exit ==');
console.log('  ' + JSON.stringify(exit));

// 空搜索 + 无芯片时，strip 与 empty 都不显示 → 模板在这一刻从哪进
const idle = await p.eval(() => ({
  strip: !document.getElementById('tpl-strip').hidden,
  empty: !document.getElementById('empty-tpl').hidden,
  tplExitVisible: (() => { const e = document.getElementById('tpl-exit'); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
}));
console.log('  空闲态：strip=%s empty=%s 页头出口可见=%s', idle.strip, idle.empty, idle.tplExitVisible);

// (2) tone 覆盖冲突
const toneTest = await p.eval(() => {
  const s = window.SCHEMES.find((x) => x.id === 'S12');
  const a = window.buildStylePrompt('S12');
  const bb = window.buildStylePrompt('S12', { tone: '安静、有手艺感' });
  const pick = (t) => (t.split('\n').find((l) => /调性是/.test(l)) || '');
  return { schemTone: s.tone, defaultLine: pick(a), overrideLine: pick(bb), changed: a !== bb };
});
console.log('\n== (2) o.tone 与 SCHEMES.tone 冲突时谁赢 ==');
console.log('  SCHEMES[S12].tone = 「%s」', toneTest.schemTone);
console.log('  不传 tone：%s', toneTest.defaultLine);
console.log('  传 tone：「安静、有手艺感」→ %s', toneTest.overrideLine);
console.log('  ⇒ 传了就以入参覆盖，SCHEMES.tone 被丢弃：%s', toneTest.changed ? 'YES（后加的参数赢）' : 'no');

// 四个"读了但没人传"的参数
const dead = await p.eval(() => {
  const out = [];
  // buildPrompt 内 o.count/o.unit/o.tone；promptOpener 内 o.biz/o.what/o.action
  const base = window.buildStylePrompt('S01');
  const cases = {
    count: { count: 3 }, unit: { unit: '产品' }, tone: { tone: 'X' }, what: { what: '五个产区' },
    biz: { biz: '咖啡店' }, action: { action: '加微信' },
  };
  for (const [k, v] of Object.entries(cases)) {
    const t = window.buildStylePrompt('S01', v);
    out.push({ k, changed: t !== base, delta: t.length - base.length });
  }
  return out;
});
console.log('\n== 逐个 opts 字段：传值后提示词是否真的变了 ==');
for (const d of dead) console.log(`  o.${d.k.padEnd(7)} 传值后 changed=${d.changed ? 'YES' : 'no '}  Δlen=${d.delta}`);

// (3) S07 真页条目数
const h = readFileSync(join(ROOT, 'prototypes', 'S07-slate-ink-contents', 'index.html'), 'utf8');
const ols = [...h.matchAll(/<ol[^>]*>([\s\S]*?)<\/ol>/g)].map((m) => (m[1].match(/<li\b/g) || []).length);
console.log('\n== (3) S07 真页的条目数 ==');
console.log('  <ol> 各自的 li 数 = %s  合计 %d', JSON.stringify(ols), ols.reduce((a, c) => a + c, 0));
console.log('  提示词里说的 N（capacity.minItems）= 46');
console.log('  ⇒ 「46」= 真页里两组目录 li 加起来；它是**这个版式排出来的量**，不是"用户该有的条目数"');
await b.close();
