// p9-concurrent.mjs — 并发安全检查（2026-10-28）。
// 本轮有 5 个 Agent 共用仓库。01:31 有另一个 Agent 改了 index.html（不是我，我不碰它）。
// 这个脚本回答两个问题：
//   ① 我 01:00 记的基线（p1-baseline.json）在当前 index.html 下还成立吗？
//   ② 我改的两处（app.js 的 foldHint、style.css 的 .field-long）还在吗、还是不是这个行为？
// 判据：不注入任何东西直接开案，30 案的 scrollHeight 必须等于"折 4 后"的值（p4-accept.json）。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, PAGE, IDS, COLLECT, openCase } from './lib.mjs';

const A = JSON.parse(readFileSync(join(HERE, 'p4-accept.json'), 'utf8')).vp;

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { at: new Date().toISOString(), vp: {} };
let bad = 0;

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1700 });
  const rows = [];
  for (const id of IDS) {
    await openCase(p, id);
    const m = await p.eval(COLLECT);
    const prev = A[vp.k].find((r) => r.id === id);
    rows.push({ id, now: m.scrollH, then: prev.scrollH, same: m.scrollH === prev.scrollH, firstFieldTop: m.firstFieldTop, details: m.detailsCount, fields: m.fieldsCount });
    if (m.scrollH !== prev.scrollH) bad++;
  }
  out.vp[vp.k] = rows;
  const diff = rows.filter((r) => !r.same);
  console.log(`[${vp.k}] 30 案 scrollHeight 与 p4 实测一致: ${rows.length - diff.length}/30` +
    (diff.length ? '  差异: ' + diff.map((d) => `${d.id} ${d.then}→${d.now}`).join(' ') : ''));
  await p.close();
}

out.summary = { mismatches: bad };
writeFileSync(join(HERE, 'p9-concurrent.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log(bad === 0 ? '\n✓ 并发安全：index.html 的改动没有影响详情面板的任何一档，我的改动行为不变' : `\n✗ ${bad} 处不一致，见 p9-concurrent.json`);
