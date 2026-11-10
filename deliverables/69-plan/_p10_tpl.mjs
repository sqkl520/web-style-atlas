// 探针 10：B/C 的模板层现状 —— 模板怎么被发现的、点开能不能到、和 44+29 词什么关系。
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const terms = [...Object.keys(P.sceneIndex), ...(P.unsupported || [])];
const hits = w.benchTemplateHits ? null : null;
// prompt-copy.js 暴露的 benchTemplateHits 需要 DOM，这里直接照它的数据源重算：
// TEMPLATES / TPL_ALIAS / TPL_ADJACENT 在闭包里，取不到 → 改从 README 原文读
const TPL_README = {};
for (const d of ['M01-clean-corporate', 'M02-warm-local', 'M03-bold-creator']) {
  const p = join(ROOT, 'templates', d, 'README.md');
  TPL_README[d.slice(0, 3)] = existsSync(p) ? readFileSync(p, 'utf8') : '';
}
out('=== 3 个模板的 README 是否存在 & 行数 ===');
for (const [k, v] of Object.entries(TPL_README)) out(`  ${k}: ${v ? v.split('\n').length + ' 行 / ' + v.length + ' 字' : '缺'}`);

out('\n=== 模板目录里有什么（一个新 S 案 vs 一个模板的体积对照） ===');
const dirSize = (d) => {
  let n = 0, bytes = 0;
  const walk = (p) => {
    for (const f of readdirSync(p)) {
      const q = join(p, f); const st = statSync(q);
      if (st.isDirectory()) walk(q); else { n++; bytes += st.size; }
    }
  };
  if (existsSync(d)) walk(d);
  return { files: n, MB: +(bytes / 1048576).toFixed(2) };
};
const cand = ['templates/M01-clean-corporate', 'templates/M02-warm-local', 'templates/M03-bold-creator',
  'prototypes/S19-copperplate-herbarium-cabinet', 'prototypes/S01-red-wedge-broadsheet'];
for (const c of cand) { const r = dirSize(join(ROOT, c)); out(`  ${c.padEnd(45)} ${String(r.files).padStart(3)} 文件  ${String(r.MB).padStart(6)} MB`); }

out('\n=== 模板在选型台里的入口 ===');
const html = readFileSync(join(ROOT, 'prototypes/_selection/index.html'), 'utf8');
for (const id of ['tpl-strip', 'empty-tpl', 'more-host', 'rail-hint', 'scene-toggle']) {
  const i = html.indexOf(id);
  out(`  #${id.padEnd(12)} ${i < 0 ? '不存在' : 'index.html:' + (html.slice(0, i).split('\n').length)}`);
}
out('\n=== "29 个没有对应风格"那段字，现在在哪一层 DOM ===');
out('  prompt-copy.js:  note.className = "rail-hint scene-unsupported" → moreHost.appendChild(note)');
out('  moreHost 自己 display:none，由 .scene-toggle 按钮切；note **跟着 moreHost 显隐**');
out('  → 用户不点「还有 N 个只有近似的 →」就永远看不到 29 个词。这是**一层**折叠。');

out('\n=== 73 个词里，模板层有 exact 命中的有几个 ===');
const TPL = { M01: ['律所', '咨询', '软件服务', '设计工作室', '代理商'], M02: ['餐厅', '咖啡馆', '烘焙', '民宿', '理发店', '花店'], M03: ['个人作品集', '自由职业者', '小型创意工作室', '摄影师', '设计师', '写作者'] };
const alias = { 咖啡店: '咖啡馆', 律师: '律所' };
let n = 0;
for (const t of terms) {
  const k = alias[t] || t;
  const hit = Object.entries(TPL).filter(([, l]) => l.includes(k)).map(([id]) => id);
  if (hit.length) { n++; out(`  ${t} → ${hit.join(',')}`); }
}
out(`  合计 ${n}/73 个词在模板层有 exact 命中`);
