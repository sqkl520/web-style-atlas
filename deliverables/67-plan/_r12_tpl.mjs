// _r12_tpl.mjs — 14 个词还在错吗？与移动端相比，谁更值钱
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const WORDS = ['茶饮', '宠物', '酒吧', '会计', '个人主页', '独立开发者', '家教', '婚礼',
  '甜品', '美甲', '设计工作室', '摄影'];  // 后 4 个是已收录的对照组

const RT = () => {
  const strip = document.getElementById('tpl-strip');
  const et = document.getElementById('empty-tpl');
  const empty = document.getElementById('empty');
  return {
    count: document.getElementById('count').textContent.trim(),
    rows: document.querySelectorAll('#ledger .row').length,
    stripVisible: strip && !strip.hidden,
    stripText: strip && !strip.hidden ? (strip.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) : null,
    emptyVisible: empty && !empty.hidden,
    emptyTpl: et && !et.hidden ? (et.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) : null,
  };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const p = await br.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await p.goto(PAGE, { settleMs: 1800 });
await p.eval('document.fonts.ready.then(()=>1)');
const out = [];
for (const w of WORDS) {
  await p.eval(`(()=>{const q=document.getElementById('q');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await sleep(120);
  await p.eval(`(()=>{const q=document.getElementById('q');q.value=${JSON.stringify(w)};q.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await sleep(280);
  const r = await p.eval(RT);
  out.push({ w, ...r });
  const says = r.stripVisible ? 'STRIP: ' + r.stripText.slice(0, 90) : (r.emptyTpl ? 'EMPTY-TPL: ' + r.emptyTpl.slice(0, 110) : '(无模板输出)');
  console.log(w.padEnd(6), '| count=' + r.count.padEnd(14), 'rows=' + String(r.rows).padEnd(3), '|', says);
}
await p.close(); await br.close();
writeFileSync(join(HERE, '_r12_tpl.json'), JSON.stringify(out, null, 1), 'utf8');
