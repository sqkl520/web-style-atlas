// V2：audit 是否 30/30 进面板、S13 是否切干净、N 计数是否正确
// 逐案展开 details，取 fold-body 文本，与 data.js 原文对比；并独立数「真实有几条」
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SEL = join(ROOT, 'prototypes', '_selection');
const PAGE = 'file:///' + join(SEL, 'index.html').replace(/\\/g, '/');

// data.js 真值
const sb = { window: {} };
vm.createContext(sb);
vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sb, { filename: 'data.js' });
const DATA = Object.fromEntries(sb.window.SCHEMES.map((s) => [s.id, s]));
console.log(`data.js: ${sb.window.SCHEMES.length} 案；audit 有值 ${sb.window.SCHEMES.filter((s) => (s.audit || '').trim()).length} 案；总字 ${sb.window.SCHEMES.reduce((a, s) => a + (s.audit || '').length, 0)}`);

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.goto(PAGE, { settleMs: 1200 });

const res = await page.eval(() => {
  const out = [];
  for (const s of window.SCHEMES) {
    const row = document.querySelector('.row[data-id="' + s.id + '"]');
    if (row) row.click();
    const det = document.querySelector('#detail');
    const folds = [...det.querySelectorAll('details')];
    // 找「去 AI 味审查点」那个 details
    let target = null;
    for (const d of folds) {
      const sm = d.querySelector('summary');
      if (sm && sm.textContent.includes('去 AI 味审查点')) { target = d; break; }
    }
    let summary = null, body = null, openBefore = null, openAfter = null, bodyLen = 0;
    if (target) {
      summary = target.querySelector('summary').textContent.trim();
      openBefore = target.open;
      target.open = true;
      openAfter = target.open;
      const b = target.querySelector('.fold-body');
      body = b ? b.textContent : null;
      bodyLen = body ? body.length : 0;
    }
    out.push({ id: s.id, found: !!target, summary, openBefore, openAfter, body, bodyLen,
      totalFolds: folds.length,
      detailVisible: det && !det.hidden });
  }
  return out;
});

const rows = res.map((r) => {
  const d = DATA[r.id];
  const audit = d.audit || '';
  const exactFull = r.body === audit;
  // S13 期望：前 307 字
  const cutMark = '反套路改造三指标';
  const idx = audit.indexOf(cutMark);
  const expectS13 = idx > 0 ? audit.slice(0, idx) : audit;
  const exactAfterCut = r.body === expectS13;
  const hasBad = ['打勾', '供 V-11', '反套路改造三指标', '必须存在 X'].filter((k) => (r.body || '').includes(k));
  return { ...r, dataLen: audit.length, cutAt: idx, exactFull, exactAfterCut, hasBad,
    dataHead: audit.slice(0, 40) };
});

const found = rows.filter((r) => r.found);
console.log(`\n=== V2 ===`);
console.log(`有「去 AI 味审查点」折叠块的案：${found.length}/30`);
console.log(`默认收起（open=false）的案：${rows.filter((r) => r.found && r.openBefore === false).length}/30`);
console.log(`展开后与 data.js 逐字相同的案：${rows.filter((r) => r.exactFull).length}/30`);
console.log(`S13 body 长度 ${rows.find((r) => r.id === 'S13').bodyLen}；data.js audit ${DATA.S13.audit.length}；切点 indexOf=${rows.find((r) => r.id === 'S13').cutAt}`);
const s13 = rows.find((r) => r.id === 'S13');
console.log(`S13 等于 data.js 前 ${s13.cutAt} 字：${s13.exactAfterCut}`);
console.log(`S13 含评审工件关键词：${s13.hasBad.length ? s13.hasBad.join(',') : '无'}`);
const others = rows.filter((r) => r.id !== 'S13');
console.log(`其余 29 案逐字相同：${others.filter((r) => r.exactFull).length}/29`);
const bad = rows.filter((r) => r.hasBad.length);
console.log(`含评审工件的案：${bad.length}  ${bad.map((b) => b.id + '[' + b.hasBad.join('/') + ']').join(' ')}`);

// 面板里实际可见文本
console.log(`\n=== 折叠块 summary 样本 ===`);
for (const id of ['S01', 'S11', 'S13', 'S21', 'S30']) {
  const r = rows.find((x) => x.id === id);
  console.log(`  ${id}: 「${r.summary}」 bodyLen=${r.bodyLen} dataLen=${r.dataLen}`);
}

writeFileSync(join(HERE, 'v2-audit.json'), JSON.stringify(rows.map(({ body, ...r }) => ({ ...r, bodyHead: (body || '').slice(0, 80) })), null, 2), 'utf8');
writeFileSync(join(HERE, 'v2-bodies.json'), JSON.stringify(Object.fromEntries(rows.map((r) => [r.id, r.body])), null, 2), 'utf8');
await browser.close();
