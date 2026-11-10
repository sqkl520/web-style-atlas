// 探针 17：核 1440 首卡 450 vs 任务书 430.5 的差 —— 是不是 #self-gate 从 1 行变 2 行。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 2500 });

const out = {};
out.asIs = await page.eval(() => {
  const e = document.getElementById('self-gate');
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  const lh = parseFloat(cs.lineHeight);
  const first = document.querySelector('#ledger > li').getBoundingClientRect();
  return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), lh,
           lines: +(r.height / lh).toFixed(2), textLen: e.innerText.length,
           firstTop: +(first.top + scrollY).toFixed(1),
           marginTop: cs.marginTop, marginBottom: cs.marginBottom };
});

// 只留前半句（模拟提交时的短文案），看是否回到 430.5
out.shortText = await page.eval(() => {
  const e = document.getElementById('self-gate');
  const full = e.innerText;
  e.textContent = '本页自身：闸门 0 条 FAIL、1 条 WARN。';
  return new Promise(res => setTimeout(() => {
    const r = e.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(e).lineHeight);
    const first = document.querySelector('#ledger > li').getBoundingClientRect();
    res({ h: +r.height.toFixed(1), lines: +(r.height / lh).toFixed(2),
          firstTop: +(first.top + scrollY).toFixed(1), original: full.slice(0, 40) });
  }, 200));
});

out.hidden = await page.eval(() => {
  document.getElementById('self-gate').style.display = 'none';
  return new Promise(res => setTimeout(() => {
    const first = document.querySelector('#ledger > li').getBoundingClientRect();
    res({ mast: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
          firstTop: +(first.top + scrollY).toFixed(1) });
  }, 200));
});

writeFileSync(OUT + '/probe-selfgate.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await page.close();
await b.close();
