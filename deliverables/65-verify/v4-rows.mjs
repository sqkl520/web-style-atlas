// V4：family 行卡改动后的行高（1440 / 390）+ S13 是否仍被截成半句 + 可见字数
// 对比基线：HEAD 版 style.css + HEAD 版 app.js（用 query 注入旧 CSS 复算 1440 行高不可行，改为直接量现版并核算）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });

async function measure(w, h, mobile) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile });
  await page.goto(PAGE, { settleMs: 1400 });
  const r = await page.eval(() => {
    const rows = [...document.querySelectorAll('.row')];
    return rows.map((el) => {
      const fam = el.querySelector('.row-family');
      const def = el.querySelector('.row-def');
      const range = document.createRange();
      let famVisible = null, famLines = null;
      if (fam) {
        range.selectNodeContents(fam);
        famLines = range.getClientRects().length;
        famVisible = fam.scrollHeight <= fam.clientHeight + 1 ? fam.textContent.length : null;
      }
      const cs = fam ? getComputedStyle(fam) : null;
      return {
        id: el.getAttribute('data-id'),
        rowH: +el.getBoundingClientRect().height.toFixed(1),
        famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : null,
        famScrollH: fam ? fam.scrollHeight : null,
        famClientH: fam ? fam.clientHeight : null,
        famText: fam ? fam.textContent : null,
        famTextLen: fam ? fam.textContent.length : 0,
        famClamp: cs ? cs.webkitLineClamp : null,
        famLines,
        famTruncated: fam ? fam.scrollHeight > fam.clientHeight + 1 : null,
        defH: def ? +def.getBoundingClientRect().height.toFixed(1) : null,
      };
    });
  });
  // 可见字数：clamp 是否真的截断，用 Range 取可见矩形数*每行字数不准，改用「未截断则全长，截断则按行数折算」
  await page.close?.();
  return r;
}

const d1440 = await measure(1440, 900, false);
const d390 = await measure(390, 844, true);

const stat = (rows, k) => { const s = rows.map((x) => x[k]).sort((a, b) => a - b); return { min: s[0], max: s[s.length - 1], med: s[Math.floor(s.length / 2)], uniq: [...new Set(s)] }; };

console.log('=== V4 行高 ===');
console.log(`1440 档行高: ${JSON.stringify(stat(d1440, 'rowH'))}`);
console.log(`390  档行高: ${JSON.stringify(stat(d390, 'rowH'))}`);
const h672 = d1440.filter((r) => r.rowH === 276.8).length;
console.log(`1440 档行高恰为 276.8px 的案: ${h672}/30`);

const fam1440 = d1440.map((r) => r.famTextLen);
console.log(`\n=== family 可见字数 ===`);
console.log(`1440 档 family 文本总字: ${fam1440.reduce((a, b) => a + b, 0)}（不应再是 657）`);
const trunc1440 = d1440.filter((r) => r.famTruncated);
const trunc390 = d390.filter((r) => r.famTruncated);
console.log(`1440 档被 clamp 截断的案: ${trunc1440.length}/30 ${trunc1440.map((r) => r.id).join(' ')}`);
console.log(`390  档被 clamp 截断的案: ${trunc390.length}/30 ${trunc390.map((r) => r.id).join(' ')}`);

console.log(`\n=== S13 行卡 family 全文（检查是否被截成括号不闭合的半句）===`);
const s13 = d1440.find((r) => r.id === 'S13');
console.log(`  长度 ${s13.famTextLen}  截断=${s13.famTruncated}  行高=${s13.famH}`);
console.log(`  允许看到的末 60 字：「...${s13.famText.slice(-60)}」`);
const s13u = d390.find((r) => r.id === 'S13');
console.log(`  390 档 截断=${s13u.famTruncated} 行高=${s13u.famH} 文本末40字「...${s13u.famText.slice(-40)}」`);

// 检查所有案里被截断处是否有未闭合括号
console.log(`\n=== 截断处括号是否闭合（1440 / 390）===`);
for (const [tag, rows] of [['1440', d1440], ['390', d390]]) {
  const bad = rows.filter((r) => {
    const t = r.famText;
    const open = (t.match(/（/g) || []).length, close = (t.match(/）/g) || []).length;
    return r.famTruncated && open !== close;
  });
  console.log(`  ${tag}: 文本内括号不配平的案 ${bad.length} ${bad.map((b) => b.id).join(' ')}`);
}

writeFileSync(join(HERE, 'v4-rows.json'), JSON.stringify({ d1440, d390 }, null, 2), 'utf8');
await browser.close();
