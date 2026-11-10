// V1b：UI 真实路径交叉验证（点行卡 → 读 hint → 填输入框 → 再读 hint）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.goto(PAGE, { settleMs: 1200 });

const BIZ = '只做手冲的咖啡店';
const ACT = '加微信订豆子';

const out = [];
for (const id of Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'))) {
  const r = await page.eval((sid, biz, act) => {
    const row = document.querySelector('.row[data-id="' + sid + '"]');
    if (row) row.click();
    const h = document.querySelector('.prompt-hint');
    const before = h ? h.textContent.trim() : null;
    const bi = document.querySelector('[data-prompt-field="biz"]');
    const ai = document.querySelector('[data-prompt-field="action"]');
    const realEmpty = window.buildStylePrompt(sid).length;
    let after = null, realFilled = null;
    if (bi && ai) {
      bi.value = biz; ai.value = act;
      bi.dispatchEvent(new Event('input', { bubbles: true }));
      after = h ? h.textContent.trim() : null;
      realFilled = window.buildStylePrompt(sid, { biz, action: act }).length;
    }
    return { id: sid, before, after, realEmpty, realFilled, hasFields: !!(bi && ai), detailOpen: !document.querySelector('#detail')?.hidden };
  }, id, BIZ, ACT);
  out.push(r);
}

const numOf = (s) => { const m = String(s || '').match(/(\d+)\s*字/); return m ? +m[1] : null; };
const rows = out.map((o) => ({ id: o.id, hintBefore: numOf(o.before), hintAfter: numOf(o.after), realEmpty: o.realEmpty, realFilled: o.realFilled, hasFields: o.hasFields }));
const bad = rows.filter((r) => r.hintBefore !== r.realEmpty || r.hintAfter !== r.realFilled);
const noFields = rows.filter((r) => !r.hasFields);

console.log(`详情面板真的打开了：${out.filter((o) => o.detailOpen).length}/30`);
console.log(`两个输入框存在的案：${rows.filter((r) => r.hasFields).length}/30`);
console.log(`hint 与 buildStylePrompt 字数一致的案：${rows.filter((r) => r.hintBefore === r.realEmpty && r.hintAfter === r.realFilled).length}/30`);
if (bad.length) console.log(`  不一致：${bad.map((b) => `${b.id}(hint ${b.hintBefore}/${b.hintAfter} vs real ${b.realEmpty}/${b.realFilled})`).join(' ')}`);
if (noFields.length) console.log(`  没有输入框：${noFields.map((b) => b.id).join(' ')}`);
console.log(`样本 hint 原文 S01: 「${out[0].before}」`);
console.log(`  填后 S01: 「${out[0].after}」`);

writeFileSync(join(HERE, 'v1b-ui.json'), JSON.stringify(rows, null, 2), 'utf8');
await browser.close();
