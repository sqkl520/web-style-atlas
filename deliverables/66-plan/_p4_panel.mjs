// P4：390 档详情面板高度（30 案）+ 「折叠 layout/landing 能否达标」实验 + 字段本体占比
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT, ids, median } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });

async function measure(width, height, mobile) {
  const p = await b.newPage({ width, height, dsf: 1, mobile });
  await p.goto(PAGE, { settleMs: 1600 });
  const out = [];
  const all = ids();
  for (const id of all) {
    const r = await p.eval(async (sid) => {
      location.hash = '#' + sid;
      document.dispatchEvent(new HashChangeEvent('hashchange'));
      await new Promise((r) => setTimeout(r, 220));
      const d = document.getElementById('detail');
      if (!d) return { id: sid, err: 'no #detail' };
      const base = { id: sid, h: d.scrollHeight, client: d.clientHeight, headH: 0 };
      // 字段本体（.field）总高 与 其它（按钮/预览/闸门/折叠块 summary）
      const fields = [...d.querySelectorAll('.field')];
      const sum = (els) => els.reduce((a, e) => a + e.getBoundingClientRect().height, 0);
      base.fieldH = Math.round(sum(fields));
      base.nFields = fields.length;
      base.fieldLabels = fields.map((f) => (f.querySelector('dt') || {}).textContent || '');
      // 折叠块（details）总高
      base.detailsH = Math.round(sum([...d.querySelectorAll('details')]));
      base.detailsOpen = [...d.querySelectorAll('details')].map((x) => x.open);
      // 首屏（未滚动）里完整可见的字段数
      const dRect = d.getBoundingClientRect();
      base.firstScreenWholeFields = fields.filter((f) => {
        const r = f.getBoundingClientRect();
        return r.top >= dRect.top && r.bottom <= dRect.bottom;
      }).length;
      // 实验：把「布局与网格」「可落地要点」两个 .field 折叠掉（display:none），重量
      const hit = fields.filter((f) => /布局与网格|可落地要点|动效与交互/.test((f.querySelector('dt') || {}).textContent || ''));
      const prev = hit.map((f) => f.style.display);
      hit.forEach((f) => { f.style.display = 'none'; });
      await new Promise((r) => setTimeout(r, 60));
      base.afterHide = d.scrollHeight;
      base.hiddenLabels = hit.map((f) => (f.querySelector('dt') || {}).textContent);
      hit.forEach((f, i) => { f.style.display = prev[i]; });
      // 复制按钮位置 / 首个字段位置
      const btn = d.querySelector('.prompt-copy, button');
      base.firstFieldTop = fields.length ? Math.round(fields[0].getBoundingClientRect().top - dRect.top + d.scrollTop) : null;
      // 滚动步数（满屏步进）
      base.steps = null;
      await new Promise((r) => setTimeout(r, 30));
      location.hash = '';
      document.dispatchEvent(new HashChangeEvent('hashchange'));
      return base;
    }, id);
    out.push(r);
  }
  await p.close();
  return out;
}

const m390 = await measure(390, 844, true);
writeFileSync(join(HERE, 'p4-390.json'), JSON.stringify(m390, null, 1), 'utf8');
const m1440 = await measure(1440, 900, false);
writeFileSync(join(HERE, 'p4-1440.json'), JSON.stringify(m1440, null, 1), 'utf8');

for (const [name, rows] of [['390×844', m390], ['1440×900', m1440]]) {
  const hs = rows.map((r) => r.h).filter(Boolean);
  const over = rows.filter((r) => r.h > 3800);
  const after = rows.map((r) => r.afterHide).filter(Boolean);
  const overAfter = rows.filter((r) => r.afterHide > 3800);
  console.log(`\n===== ${name} =====`);
  console.log('scrollHeight  min=%d  med=%s  max=%d', Math.min(...hs), median(hs), Math.max(...hs));
  console.log('超 3800 的案: %d / %d  %s', over.length, rows.length, over.map((r) => `${r.id}=${r.h}`).join(' '));
  console.log('隐藏「布局与网格/可落地要点/动效与交互」后  min=%d med=%s max=%d；超 3800 的案: %d',
    Math.min(...after), median(after), Math.max(...after), overAfter.length);
  console.log('字段本体占比: %s%%–%s%%（med %s%%）',
    Math.min(...rows.filter((r) => r.h).map((r) => Math.round((r.fieldH / r.h) * 100))),
    Math.max(...rows.filter((r) => r.h).map((r) => Math.round((r.fieldH / r.h) * 100))),
    median(rows.filter((r) => r.h).map((r) => Math.round((r.fieldH / r.h) * 100))));
  console.log('首屏完整可见字段数: %s', rows.map((r) => r.firstScreenWholeFields).join(','));
  console.log('字段数: %s', [...new Set(rows.map((r) => r.nFields))].join(','));
  console.log('逐案: ' + rows.map((r) => `${r.id}=${r.h}/${r.afterHide}`).join(' '));
}
await b.close();
