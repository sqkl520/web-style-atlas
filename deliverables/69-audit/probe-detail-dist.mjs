// 探针 14：详情面板里「适用场景」离面板顶多远（警告文案说"写在详情「适用场景」段末"）。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1500 });

const out = {};
for (const id of ['S15', 'S21', 'S18', 'S29']) {
  await page.eval((sid) => document.querySelector(`#ledger > li[data-id="${sid}"]`).click(), id);
  await sleep(600);
  out[id] = await page.eval(() => {
    const body = document.getElementById('d-body');
    const bodyTop = body.getBoundingClientRect().top;
    // 找 dt 文本含「适用场景」的那一项
    const dts = [...body.querySelectorAll('dt')];
    const dt = dts.find(d => /适用场景/.test(d.textContent || ''));
    const warn = [...body.querySelectorAll('.prompt-hint')][0];
    const cta = body.querySelector('.prompt-cta');
    const r = (e) => e ? { top: +e.getBoundingClientRect().top.toFixed(1),
                           fromBodyTop: +(e.getBoundingClientRect().top - bodyTop).toFixed(1) } : null;
    return {
      bodyClientH: body.clientHeight,
      warnTop: r(warn), ctaTop: r(cta),
      shiyongTop: r(dt),
      shiyongScreens: dt ? +((dt.getBoundingClientRect().top - bodyTop) / body.clientHeight).toFixed(2) : null,
      warnText: warn ? warn.innerText.replace(/\s+/g, ' ').slice(0, 200) : '',
      // 有没有任何 <a> 指向 templates
      tplAnchors: [...body.querySelectorAll('a')].filter(a => /templates\//.test(a.getAttribute('href') || '')).length,
      nFields: dts.length,
    };
  });
  await page.eval(() => document.getElementById('d-close').click());
  await sleep(200);
}
writeFileSync(OUT + '/probe-detail-dist.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await page.close();
await b.close();
