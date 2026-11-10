// _p21_inplace.mjs — 修正 _p20 的方法错误。
// _p20 用「追加 <style>」模拟改动，但追加的样式表排在所有样式之后，
// 会压过 @media(max-width:620px) 里的 .mast h1{font-size:max(26px,6.6vw)}，
// 于是 390 档被误测成 34px。真实改法是在 style.css:129 **原地**改一行，
// 源文件顺序不变 ⇒ 620px 媒体查询仍然后置、仍然赢，390 档应保持 26px。
// 本探针：直接改 _frozen/style.css 原文（我自己的临时副本），改前/改后各量一次。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { probe } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs';
import { judge } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FZ = join(HERE, '_frozen');
const CSS = join(FZ, 'style.css');
const BAK = join(FZ, 'style.head.bak.css');
const PAGE = 'file:///' + join(FZ, 'index.html').replace(/\\/g, '/');

if (!existsSync(BAK)) copyFileSync(CSS, BAK);

const M = () => {
  const g = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { h: +b.height.toFixed(1), w: +b.width.toFixed(1) }; };
  const h1 = document.querySelector('.mast h1');
  const cs = h1 ? getComputedStyle(h1) : null;
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const first = rows[0] ? rows[0].getBoundingClientRect() : null;
  return {
    h1Size: cs ? cs.fontSize : null,
    h1Vw: cs ? +(parseFloat(cs.fontSize) / innerWidth * 100).toFixed(2) : null,
    mastH: g('.mast') ? g('.mast').h : null,
    cardTop: first ? +first.top.toFixed(1) : null,
    cardH: first ? +first.height.toFixed(1) : null,
    complete: rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; }).length,
    ovX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const measure = async (browser, label) => {
  const out = {};
  for (const [k, w, h, mob] of [['1440', 1440, 900, false], ['1180', 1180, 900, false], ['980', 980, 900, false], ['768', 768, 1024, true], ['390', 390, 844, true]]) {
    const p = await browser.newPage({ width: w, height: h, dsf: 1, mobile: mob });
    await p.goto(PAGE, { settleMs: 1800 });
    const m = await p.eval(M);
    const metrics = await p.eval(probe);
    const f = judge(metrics, { width: w, allow: [] });
    out[k] = { ...m, heroVw: metrics.hero ? metrics.hero.vw : null, fails: f.filter((x) => x.level === 'FAIL').map((x) => x.id) };
    console.log(`  [${label} ${k}] h1=${String(m.h1Size).padStart(7)} (${String(m.h1Vw).padStart(5)}vw) mast=${String(m.mastH).padStart(6)} 首卡top=${String(m.cardTop).padStart(7)} 完整=${m.complete} ovX=${m.ovX} hero.vw=${out[k].heroVw} FAIL=${out[k].fails.join(',') || 'none'}`);
    await p.close();
  }
  return out;
};

const browser = await Browser.launch({ width: 1440, height: 900 });

const css0 = readFileSync(BAK, 'utf8');
const NEEDLE = 'font-size: clamp(30px, 4vw, 56px);';
if (!css0.includes(NEEDLE)) { console.error('!! 找不到目标声明，_frozen/style.css 与预期不符'); process.exit(2); }

// A) 改前
writeFileSync(CSS, css0, 'utf8');
console.log('A) 改前（HEAD 原文 clamp(30px, 4vw, 56px)）');
const before = await measure(browser, 'BEFORE');

// B) 原地改一行 → var(--s-h1)
writeFileSync(CSS, css0.replace(NEEDLE, 'font-size: var(--s-h1);'), 'utf8');
console.log('\nB) 原地改一行（→ var(--s-h1) = clamp(34px, 5.2vw, 74px)）');
const after = await measure(browser, 'AFTER ');

// C) 还原
writeFileSync(CSS, css0, 'utf8');

console.log('\n=== 判定 ===');
console.log('focal-point FAIL（4 个非移动端档，改前 → 改后）:');
for (const k of ['1440', '1180', '980', '768']) {
  console.log(`  ${k}: ${before[k].fails.includes('focal-point')} → ${after[k].fails.includes('focal-point')}   (hero.vw ${before[k].heroVw} → ${after[k].heroVw})`);
}
console.log('390 档是否被外溢（必须保持 26px）:', before['390'].h1Size, '→', after['390'].h1Size, after['390'].h1Size === before['390'].h1Size ? '✅ 未外溢' : '❌ 外溢');
console.log('首屏完整卡数（不许掉）:');
for (const k of ['1440', '1180', '980', '768', '390']) console.log(`  ${k}: ${before[k].complete} → ${after[k].complete}`, after[k].complete >= before[k].complete ? '✅' : '❌');
console.log('页头高度代价:');
for (const k of ['1440', '1180', '980', '768', '390']) console.log(`  ${k}: ${before[k].mastH} → ${after[k].mastH} (Δ${(after[k].mastH - before[k].mastH).toFixed(1)})`);
console.log('横向溢出:', ['1440','1180','980','768','390'].map((k) => `${k}=${after[k].ovX}`).join(' '));

writeFileSync(join(HERE, '_p21_inplace.json'), JSON.stringify({ before, after }, null, 1));
await browser.close();
