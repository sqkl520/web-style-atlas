// P23：修正我报告里的两处细节 —— .row-family 的真实字号/行高，以及 24 vs 25 的边界
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT, median } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1600 });

const cs = await p.eval(() => {
  const f = document.querySelector('.row-family');
  const c = getComputedStyle(f);
  const r = f.getBoundingClientRect();
  const rowMeta = getComputedStyle(f.parentElement);
  return {
    fontSize: c.fontSize, lineHeight: c.lineHeight, color: c.color,
    boxH: Math.round(r.height * 10) / 10, clamp: c.webkitLineClamp,
    metaFontSize: rowMeta.fontSize,
  };
});
console.log('== .row-family 的计算样式 ==');
console.log(JSON.stringify(cs, null, 1));
console.log('\n⇒ 字号 %s（Lead 说 13px：%s）；两行高度 %s = 2 × %s',
  cs.fontSize, cs.fontSize === '13px' ? '正确' : '需修正', cs.boxH, cs.lineHeight);

// 390 档 24 vs 25 的边界：把 30 个值按升序列出，看阈值附近有几个
const m = JSON.parse(readFileSync(join(HERE, 'p14-fold.json'), 'utf8'));
const vals = m.map((x) => ({ id: x.id, h: x.before })).sort((a, b) => a.h - b.h);
console.log('\n== 390 档 scrollHeight 升序（判 >3800 是 %d 案，判 >=3800 也是 %d 案）==',
  vals.filter((v) => v.h > 3800).length, vals.filter((v) => v.h >= 3800).length);
console.log(vals.map((v) => `${v.id}=${v.h}`).join(' '));
const near = vals.filter((v) => Math.abs(v.h - 3800) < 200);
console.log('3800 附近 ±200 的案：%s', near.map((v) => `${v.id}=${v.h}`).join(' ') || '无');
console.log('最小的 6 个：%s', vals.slice(0, 6).map((v) => `${v.id}=${v.h}`).join(' '));
await b.close();
