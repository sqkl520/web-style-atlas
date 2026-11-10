// m24-16px.mjs — 不降字号（保持 16px）能到多少；同时验证 --s-15 是否未定义
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const HELPERS = `
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  function foldCta() {
    var fill = document.querySelector('#d-body .prompt-fill');
    var note = document.querySelector('#d-body .prompt-fill-note');
    if (!fill || !note) return;
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '填写提示词开头（不填也能复制）';
    s.style.cssText = 'font-size:13px;cursor:pointer;padding:4px 0;line-height:1.6;color:var(--ink-2)';
    fill.parentNode.insertBefore(d, fill); d.appendChild(s); d.appendChild(fill); d.appendChild(note);
  }
`;

// 都是 16px 字号，只压行高与内距
const V = {
  'P0 现状': '',
  'P1 16/1.5+内距8': `addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}');`,
  'P2 P1+加宽10': `addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}');`,
  'P3 P2+CTA折': `addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}');foldCta();`,
  'P4 P3+行高1.45': `addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.45}#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}');foldCta();`,
};

const MEASURE = () => {
  const d = document.getElementById('detail');
  const dl = document.querySelector('#d-body .fields');
  const dd = dl.querySelector('.field dd');
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    fs: getComputedStyle(dd).fontSize, lh: getComputedStyle(dd).lineHeight,
    textW: +dd.getBoundingClientRect().width.toFixed(1),
    hOv: d.scrollWidth - d.clientWidth,
    // --s-15 是否定义
    s15: getComputedStyle(document.documentElement).getPropertyValue('--s-15') || '(未定义)',
    claimFS: getComputedStyle(document.querySelector('.mast-claim')).fontSize,
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), data: {}, vars: null };
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1600 });
out.vars = await p.eval(() => {
  const cs = getComputedStyle(document.documentElement);
  const names = ['--s-13', '--s-14', '--s-15', '--s-16', '--s-17', '--s-20', '--s-24'];
  return {
    defined: Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim() || '(未定义)'])),
    mastClaimFontSize: getComputedStyle(document.querySelector('.mast-claim')).fontSize,
    mastWizardA: getComputedStyle(document.querySelector('.mast-wizard a')).fontSize,
    bodyFS: getComputedStyle(document.body).fontSize,
  };
});
for (const id of IDS) {
  out.data[id] = {};
  for (const [k, code] of Object.entries(V)) {
    await p.eval((sid) => {
      document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
      document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
      document.querySelector('.row[data-id="' + sid + '"]').click();
      document.getElementById('detail').scrollTop = 0;
    }, id);
    await new Promise((r) => setTimeout(r, 140));
    if (code) { await p.eval((payload) => { new Function(payload.h + payload.c)(); }, { h: HELPERS, c: code }); await new Promise((r) => setTimeout(r, 100)); }
    out.data[id][k] = await p.eval(MEASURE);
  }
}
await p.close();
writeFileSync(join(HERE, 'data-m24-16px.json'), JSON.stringify(out, null, 1));
console.log('CSS 变量实测：' + JSON.stringify(out.vars, null, 1));
for (const k of Object.keys(V)) {
  const a = Object.values(out.data).map((x) => x[k]);
  const sh = a.map((x) => x.scrollH);
  console.log(`${k.padEnd(18)} ${Math.min(...sh)}–${Math.max(...sh)} (avg ${Math.round(sh.reduce((q, r) => q + r, 0) / 30)}) ≤3800=${sh.filter((x) => x <= 3800).length}/30 fs=${a[0].fs} lh=${a[0].lh} textW=${a[0].textW} ovX=${a[0].hOv}`);
}
await browser.close();
