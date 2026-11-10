// 探针 23：全量 73 词 × 「在搜索框打字」这一条最常用路径，逐词记录界面结论。
// 这是 B 的决策依据：到底多少词会得到"空页面"，多少词其实已经得到了诚实空状态。
// 单页内循环（每次设 #q + input 事件），比 73 次 page load 快一个量级。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

// 取 73 词表
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/^\uFEFF/, '');
const sb = { window: {}, console };
sb.window = sb; sb.globalThis = sb;
const ctx = vm.createContext(sb);
vm.runInContext('var window=this;' + read('prototypes/_selection/data.js'), ctx);
vm.runInContext('var window=this;' + read('prototypes/_selection/prompts.js'), ctx);
const P = sb.window ? sb.window.STYLE_PROMPTS : sb.STYLE_PROMPTS;
const sp = (sb.STYLE_PROMPTS || (sb.window && sb.window.STYLE_PROMPTS));
const terms = [...Object.keys(sp.sceneIndex), ...(sp.unsupported || [])];

const STATE = () => {
  const strip = document.getElementById('tpl-strip');
  const empty = document.getElementById('empty-tpl');
  const vis = (el) => el && !el.hidden && getComputedStyle(el).display !== 'none';
  const rows = document.querySelectorAll('#ledger .row').length;
  const et = vis(empty) ? empty.textContent.replace(/\s+/g, ' ').trim() : '';
  const st = vis(strip) ? strip.textContent.replace(/\s+/g, ' ').trim() : '';
  return { rows, strip: vis(strip), empty: vis(empty), et, st };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 2200 });
await p.eval('document.fonts.ready.then(()=>1)');

const res = [];
for (const t of terms) {
  await p.eval((q) => {
    const i = document.getElementById('q');
    i.value = q; i.dispatchEvent(new Event('input', { bubbles: true }));
    return 1;
  }, t);
  await sleep(160);
  const m = await p.eval(STATE);
  // 归类
  let kind;
  if (m.rows > 0) kind = 'rows';
  else if (m.empty && /模板层有|模板层另外|模板层有：/.test(m.et)) kind = 'empty+tpl';
  else if (m.empty && /三个大众模板的 README 适用清单里也没有/.test(m.et)) kind = 'empty+none';
  else if (m.empty) kind = 'empty+other';
  else kind = 'blank';
  res.push({ term: t, ...m, et: m.et.slice(0, 150), st: m.st.slice(0, 120), kind });
  console.log(`${t.padEnd(6, '　')} rows=${String(m.rows).padStart(2)} kind=${kind.padEnd(11)} ${m.et ? '「' + m.et.slice(0, 70) + '」' : ''}`);
}
const tally = res.reduce((a, r) => (a[r.kind] = (a[r.kind] || 0) + 1, a), {});
console.log('\n=== 73 词打字路径分布 ===');
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(12)} ${v}`);
console.log(`  0 行（空页面）= ${res.filter((r) => r.rows === 0).length} / 73`);
console.log(`  有行但只是近似 = ${res.filter((r) => r.rows > 0).length} / 73`);
writeFileSync(join(HERE, 'p7-typed73.json'), JSON.stringify(res, null, 1), 'utf8');
await p.close(); await br.close();
