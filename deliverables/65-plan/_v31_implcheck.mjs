// 核查并发 Agent 的实现 vs 我的裁决：位置、S13 切法、summary 口径
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';
import { readFileSync } from 'node:fs';

const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));
const s13 = rows.find((r) => r.id === 'S13');
console.log('data.js 里 S13.audit 长度:', s13.audit.length, '（我的裁决要求 306，说明切在 UI 层不是数据层）');
console.log('data.js 里 audit 是否仍含污染:', s13.audit.includes('反套路改造三指标'));

const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1000 });
  await page.eval(() => { const r = document.querySelector('.row[data-id="S13"]'); if (r) r.click(); });
  await sleep(700);
  const info = await page.eval(() => {
    const dl = document.querySelector('#d-body .fields');
    const kids = [...dl.children];
    const seq = kids.map((k, i) => ({
      i,
      tag: k.tagName,
      label: (k.querySelector('dt') || {}).textContent || (k.querySelector('summary') || {}).textContent || k.textContent.slice(0, 30),
    }));
    const auditBlock = kids.find((k) => k.textContent.includes('审查点'));
    return {
      seq,
      auditTag: auditBlock ? auditBlock.tagName : null,
      auditIdx: auditBlock ? kids.indexOf(auditBlock) : -1,
      riskIdx: kids.findIndex((k) => k.textContent.includes('反 AI 味风险')),
      auditInner: auditBlock ? auditBlock.innerHTML.slice(0, 400) : null,
      auditTextLen: auditBlock ? auditBlock.textContent.length : null,
      hasPollutionInUI: auditBlock ? auditBlock.textContent.includes('反套路改造三指标') : null,
      detailsOpen: auditBlock && auditBlock.querySelector('details') ? auditBlock.querySelector('details').open : null,
    };
  });
  console.log('\n=== 详情字段顺序 ===');
  info.seq.forEach((x) => console.log(`  ${String(x.i).padStart(2)} ${x.tag.padEnd(4)} ${String(x.label).slice(0, 50)}`));
  console.log('\naudit 块 tag:', info.auditTag, ' idx:', info.auditIdx, ' riskIdx:', info.riskIdx);
  console.log('我的裁决要求 audit 在 risk **之前**；实际:', info.auditIdx < info.riskIdx ? '之前 ✓' : '之后 ✗');
  console.log('UI 里 audit 文本长度:', info.auditTextLen, '（原文 780，切后应约 306+标签）');
  console.log('UI 里是否仍含污染:', info.hasPollutionInUI);
  console.log('details 默认 open:', info.detailsOpen);
  console.log('\ninnerHTML 片段:', info.auditInner);
  await page.close();
} finally { await browser.close(); await srv.close(); }
