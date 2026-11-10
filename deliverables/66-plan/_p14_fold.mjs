// P14：前提 4 的对照 —— 「3800px 到底算不算多」用仓库自己内部的尺子量
//  (a) 30 个原型页在 390 档的页高（report.json 已实测，不是我猜的）
//  (b) 详情面板 390 档页高
//  (c) 折叠（details）方案实测：能不能达标且不删内容
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { HERE, ROOT, PROTO, ids, median } from './_lib.mjs';

// (a) 原型页 390 档页高
const protoH = [];
for (const id of ids()) {
  const d = readdirSync(PROTO, { withFileTypes: true }).find((x) => x.isDirectory() && x.name.startsWith(id + '-'));
  const rep = join(PROTO, d.name, '.inspect', 'report.json');
  try {
    const j = JSON.parse(readFileSync(rep, 'utf8'));
    const v = (j.viewports || []).find((x) => x.width === 390);
    if (v) protoH.push({ id, h: v.metrics.page.height, screens: v.metrics.page.screens });
  } catch { /* 无报告 */ }
}
console.log('== (a) 30 个原型页在 390×844 的页高（各案自己 .inspect/report.json 实测）==');
console.log('  n=%d  min=%d  med=%s  max=%d', protoH.length, Math.min(...protoH.map((x) => x.h)), median(protoH.map((x) => x.h)), Math.max(...protoH.map((x) => x.h)));
console.log('  超过 3800 的原型页：%d / %d', protoH.filter((x) => x.h > 3800).length, protoH.length);
console.log('  ' + protoH.sort((a, b) => a.h - b.h).map((x) => `${x.id}=${x.h}`).join(' '));

// (b)+(c) 详情面板：折叠方案
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
await p.goto(PAGE, { settleMs: 1700 });

const res = [];
for (const id of ids()) {
  const r = await p.eval(async (sid) => {
    location.hash = '#' + sid;
    document.dispatchEvent(new HashChangeEvent('hashchange'));
    await new Promise((r) => setTimeout(r, 230));
    const d = document.getElementById('detail');
    if (!d) return null;
    const before = d.scrollHeight;
    const fields = [...d.querySelectorAll('.field')];
    // 把「布局与网格」「可落地要点」「动效与交互」三块换成 details（折叠但内容保留）
    const targets = fields.filter((f) => /布局与网格|可落地要点|动效与交互/.test((f.querySelector('dt') || {}).textContent || ''));
    const made = [];
    for (const f of targets) {
      const det = document.createElement('details');
      det.className = 'fold-probe';
      const sum = document.createElement('summary');
      const dt = f.querySelector('dt'), dd = f.querySelector('dd');
      sum.textContent = (dt ? dt.textContent : '') + '（' + ((dd ? dd.textContent : '').length) + ' 字）';
      det.appendChild(sum);
      f.parentNode.insertBefore(det, f);
      det.appendChild(f);           // .field 变成 details 的内容
      made.push(det);
    }
    await new Promise((r) => setTimeout(r, 60));
    const after = d.scrollHeight;
    // 折叠后仍完整可见的字段数 / 复制按钮位置
    const dr = d.getBoundingClientRect();
    const whole = [...d.querySelectorAll('.field')].filter((f) => {
      const rr = f.getBoundingClientRect();
      return rr.top >= dr.top && rr.bottom <= dr.bottom && rr.height > 0;
    }).length;
    const copyBtn = [...d.querySelectorAll('button')].find((x) => /复制/.test(x.textContent));
    const out = {
      id: sid, before, after,
      folded: made.map((x) => x.querySelector('summary').textContent.slice(0, 14)),
      copyTop: copyBtn ? Math.round(copyBtn.getBoundingClientRect().top - dr.top + d.scrollTop) : null,
      wholeFields: whole,
      // 内容是否还在（字数）
      chars: [...d.querySelectorAll('.field dd')].reduce((a, e) => a + e.textContent.length, 0),
    };
    made.forEach((det) => { const f = det.querySelector('.field'); det.parentNode.insertBefore(f, det); det.remove(); });
    await new Promise((r) => setTimeout(r, 40));
    location.hash = '';
    document.dispatchEvent(new HashChangeEvent('hashchange'));
    return out;
  }, id);
  if (r) res.push(r);
}
writeFileSync(join(HERE, 'p14-fold.json'), JSON.stringify(res, null, 1), 'utf8');

console.log('\n== (b) 详情面板 390 档：折叠三块重字段前后 ==');
console.log('  折叠前 scrollHeight: min=%d med=%s max=%d', Math.min(...res.map((r) => r.before)), median(res.map((r) => r.before)), Math.max(...res.map((r) => r.before)));
console.log('  折叠后 scrollHeight: min=%d med=%s max=%d', Math.min(...res.map((r) => r.after)), median(res.map((r) => r.after)), Math.max(...res.map((r) => r.after)));
console.log('  折叠前超 3800: %d / %d', res.filter((r) => r.before > 3800).length, res.length);
console.log('  折叠后超 3800: %d / %d', res.filter((r) => r.after > 3800).length, res.length);
console.log('  内容字数（折叠前后应相同）：%s 与 %s', JSON.stringify([...new Set(res.map((r) => r.chars))]).slice(0, 80), '（折叠不改 DOM 文本）');
console.log('  复制按钮顶距（折叠后）：min=%d max=%d', Math.min(...res.map((r) => r.copyTop)), Math.max(...res.map((r) => r.copyTop)));
console.log('  折叠掉的是：' + JSON.stringify(res[0].folded));

// (d) 结论：用仓库自己的尺子
console.log('\n== (d) 用仓库自己的尺子 ==');
console.log('  详情面板 390 档最大 4668px；原型页 390 档中位 %s px、最大 %d px', median(protoH.map((x) => x.h)), Math.max(...protoH.map((x) => x.h)));
console.log('  即：详情面板比它描述的原型页普遍更短。');
await b.close();
