// 探针 19：C 的 UX 实测 —— 用户点开一个 ⚠ 案（S19 / S21），在详情面板里看到什么、在第几屏。
// 要回答：① ⚠ 那句距面板顶多少 px、在第几屏；②「适用场景（含不适合）」在哪；③ 面板里有没有
// 任何指向 M01/M02/M03 的链接或字样；④ 390 档同上。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const FIND = () => {
  const d = document.getElementById('detail');
  if (!d) return { err: 'no #detail' };
  const base = d.getBoundingClientRect().top;
  const ch = d.clientHeight || window.innerHeight;
  const pick = (el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top - base), h: Math.round(r.height), screen: +((r.top - base) / ch).toFixed(2) };
  };
  const txt = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  // 警告句
  const warnEl = [...d.querySelectorAll('*')].find((e) => /机制绑在特定题材|单元位置是手工排定/.test(txt(e)) && e.children.length === 0);
  // 适用场景字段
  const sceneField = [...d.querySelectorAll('.field, .field-long, details')].find((e) => /适用场景/.test(txt(e).slice(0, 60)));
  // 模板链接
  const tplLinks = [...d.querySelectorAll('a')].filter((a) => /M0[123]|模板/.test(txt(a) + (a.getAttribute('href') || '')));
  // 面板里提到「模板」的次数
  const tplMentions = (txt(d).match(/模板/g) || []).length;
  const m0 = (txt(d).match(/M0[123]/g) || []);
  return {
    scrollH: d.scrollHeight, clientH: ch, screens: +(d.scrollHeight / ch).toFixed(2),
    warn: warnEl ? { ...pick(warnEl), text: txt(warnEl).slice(0, 90) } : null,
    scene: sceneField ? { ...pick(sceneField), text: txt(sceneField).slice(0, 80) } : null,
    tplLinkCount: tplLinks.length, tplMentions, m0: [...new Set(m0)],
    firstScreenText: txt(d).slice(0, 220),
  };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const res = { at: new Date().toISOString(), cases: {} };
for (const [tier, w, h, mob] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  for (const id of ['S19', 'S21', 'S15']) {
    const p = await br.newPage({ width: w, height: h, dsf: 1, mobile: mob });
    await p.goto(PAGE + '#' + id, { settleMs: 2400 });
    await p.eval('document.fonts.ready.then(()=>1)');
    // 点开该案
    await p.eval((sid) => { const r = document.querySelector('.row[data-id="' + sid + '"]'); if (r) r.click(); return 1; }, id);
    await sleep(700);
    const m = await p.eval(FIND);
    res.cases[`${tier}/${id}`] = m;
    console.log(`=== ${tier}px  ${id} ===`);
    console.log(`  面板 ${m.scrollH}px / ${m.clientH} = ${m.screens} 屏`);
    console.log(`  ⚠ 句    ${m.warn ? m.warn.top + 'px（第 ' + m.warn.screen + ' 屏）「' + m.warn.text + '」' : '未找到'}`);
    console.log(`  适用场景 ${m.scene ? m.scene.top + 'px（第 ' + m.scene.screen + ' 屏）' : '未找到'}`);
    console.log(`  面板内模板链接 ${m.tplLinkCount} 条；"模板"出现 ${m.tplMentions} 次；M0x 代码 ${m.m0.join(',') || '无'}`);
    await p.close();
  }
}
writeFileSync(join(HERE, 'p6-detail-warn.json'), JSON.stringify(res, null, 1), 'utf8');
await br.close();
console.log('\nwrote p6-detail-warn.json');
