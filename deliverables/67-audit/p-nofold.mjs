// p-nofold.mjs — 复核 66-audit §3.3/§7.1 的核心反证：「只改排版、一个字段不折，30/30 达标」
// 关键：N2/N3 到底是 16px 还是 15px？在 16px 下不折字段的天花板是多少？
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const HELPERS = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function foldCta(){
    var fill=document.querySelector('#d-body .prompt-fill');
    var note=document.querySelector('#d-body .prompt-fill-note');
    if(!fill||!note)return;
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='填写提示词开头（不填也能复制）';
    s.style.cssText='font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d,fill);d.appendChild(s);d.appendChild(fill);d.appendChild(note);
  }
`;

const VARIANTS = {
  'V0 现状': '',
  // 审计 N2：15px / 1.5 / 内距 8 / dt 2（m9-typography.mjs:15 的 T2 与 m23 的 N2 同参）
  'N2 审计：15px/1.5/内距8/dt2（不折字段）':
    'addStyle("#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}#detail .field dt{margin-bottom:2px}");',
  // 审计 N3 = N2 + CTA 折
  'N3 审计：N2 + CTA折（不折字段）':
    'addStyle("#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}#detail .field dt{margin-bottom:2px}");foldCta();',
  // 审计 N4 = N3 + 面板内边距 16→10
  'N4 审计：N3 + 内距16→10（不折字段）':
    'addStyle("#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}");foldCta();',
  // ★ 我加的对照组：把 N3 的字号换成 16px，看还达不达标 —— 直接检验「16px + 只改排版」这条路
  'P 16px版N3：16px/1.5/内距8/dt2 + CTA折（不折字段）':
    'addStyle("#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}");foldCta();',
  // ★ 16px 下把排版压到极限（内宽 0、内距 6、行高 1.5、dt 2）+ CTA 折
  'Q 16px极限：内宽0/内距6/lh1.5 + CTA折（不折字段）':
    'addStyle("#detail .field{padding:6px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}#d-body{padding-left:0;padding-right:0}");foldCta();',
};

const PROBE = () => {
  const d = document.getElementById('detail');
  const dl = d.querySelector('#d-body .fields');
  const dd = dl.querySelector('.field dd');
  const cs = getComputedStyle;
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    fs: cs(dd).fontSize, lh: cs(dd).lineHeight,
    w: +dd.getBoundingClientRect().width.toFixed(1),
    overX: d.scrollWidth - d.clientWidth,
    fieldCount: dl.querySelectorAll('.field dd').length,
    // 正文里有没有丢字：字数必须一致
    chars: Array.from(dl.querySelectorAll('.field dd')).reduce((s, e) => s + (e.textContent || '').replace(/\s+/g, '').length, 0),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1600 });
const out = { data: {} };
for (const id of IDS) {
  out.data[id] = {};
  for (const [name, code] of Object.entries(VARIANTS)) {
    await p.eval((sid) => {
      document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
      document.querySelector('.row[data-id="' + sid + '"]').click();
      document.getElementById('detail').scrollTop = 0;
    }, id);
    await new Promise((r) => setTimeout(r, 110));
    if (code) { await p.eval((x) => { new Function(x.h + x.c)(); }, { h: HELPERS, c: code }); await new Promise((r) => setTimeout(r, 110)); }
    out.data[id][name] = await p.eval(PROBE);
  }
}
const agg = {};
for (const name of Object.keys(VARIANTS)) {
  const a = IDS.map((id) => out.data[id][name]);
  const sh = a.map((x) => x.scrollH);
  agg[name] = {
    min: Math.min(...sh), max: Math.max(...sh), avg: Math.round(sh.reduce((x, y) => x + y, 0) / sh.length),
    over: sh.filter((x) => x > 3800).length,
    screensMax: Math.max(...a.map((x) => x.screens)),
    fs: a[0].fs, lh: a[0].lh, w: a[0].w,
    chars: a[0].chars, fieldCount: a[0].fieldCount, overX: Math.max(...a.map((x) => x.overX)),
  };
}
out.agg = agg;
console.log('| 变体 | 字号 | scrollH min–max (avg) | 超3800 | 屏数max | 正文宽 | dd字数 | 字段数 | 横向溢出 |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const [k, v] of Object.entries(agg)) {
  console.log(`| ${k} | ${v.fs} | ${v.min}–${v.max} (${v.avg}) | ${v.over}/30 | ${v.screensMax} | ${v.w} | ${v.chars} | ${v.fieldCount} | ${v.overX} |`);
}
writeFileSync(join(HERE, 'data-nofold.json'), JSON.stringify(out, null, 1));
await p.close();
await browser.close();
console.log('\nwritten data-nofold.json');
