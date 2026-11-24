/* 查 A7 列的盲区在真实的原型/产物里到底有没有发生。
 *
 * 为什么必须查这个：A7 的负对照证明了判据「能被绕过」，
 * 但「能被绕过」不等于「实际被绕过」。按本仓库的准入双条件，
 * 一条盲区要升级成缺陷，必须原型 0 例 + 产物显著多于原型。
 *
 * 这个脚本只数「形态出现过几次」，不下结论 —— 结论要人看。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');

const CHECKS = [
  {
    key: 'longhandRadius',
    label: '圆角写成 longhand（判据③只认 border-radius: 简写）',
    re: /border-(?:top-left|top-right|bottom-left|bottom-right|top|right|bottom|left)-radius\s*:/,
  },
  {
    key: 'longhandBorderWidth',
    label: '线宽写成 longhand（判据③只认 border:/border-top: 简写）',
    re: /border-(?:top|right|bottom|left)-width\s*:\s*[\d.]+(?:px|rem|em)/,
  },
  {
    key: 'filterShadow',
    label: '用 filter: drop-shadow 投影（判据⑤只查 box-shadow）',
    re: /filter\s*:\s*(?:drop-)?shadow/,
  },
  {
    key: 'commentDecl',
    label: '注释里出现 font-family: 声明（判据②不剥注释）',
    re: /\/\*[\s\S]*?font-family\s*:[\s\S]*?\*\//,
  },
  {
    key: 'ghostFontSize',
    label: '疑似幽灵字号（大 font-size 挂在很可疑的 class 上）',
    re: /\.(?:never|unused|ghost|phantom|hidden|dead)[\w-]*\s*\{[^}]*font-size\s*:\s*(?:[6-9]\d|1\d\d)px/,
  },
  {
    key: 'missingLinkTarget',
    label: '<link href> 指向本地相对路径（可能指向不存在的文件）',
    re: /<link[^>]+href\s*=\s*"[^"]*fonts[^"]*\.css"/,
  },
  {
    key: 'displayNoneContent',
    label: '内容单元带 display:none 类（判据④按标签数，不看可见性）',
    re: /class\s*=\s*"[^"]*(?:hidden|is-hidden|d-none|invisible)[^"]*"/,
  },
];

/* 两种语料：原型（合格样品）与产物 */
const CORPORA = [
  { label: '原型', base: join(REPO, 'prototypes'), dirRe: /^S\d{2}-/, files: ['style.css', 'index.html'] },
  { label: '产物', base: join(REPO, 'deliverables/78-northstar/_blindtest'), dirRe: /^S\d{2}(-r\d+)?$/, files: ['index.html'] },
];

const results = {};
for (const c of CORPORA) {
  if (!existsSync(c.base)) continue;
  const ids = readdirSync(c.base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && c.dirRe.test(d.name)).map((d) => d.name);
  results[c.label] = { n: ids.length, hits: {} };
  for (const chk of CHECKS) results[c.label].hits[chk.key] = [];
  for (const id of ids) {
    const src = c.files.map((f) => {
      const p = join(c.base, id, f);
      return existsSync(p) ? readFileSync(p, 'utf8') : '';
    }).join('\n');
    if (!src) continue;
    for (const chk of CHECKS) {
      if (chk.re.test(src)) results[c.label].hits[chk.key].push(id);
    }
  }
}

console.log('A7 列的盲区，在真实语料里有没有发生\n');
for (const chk of CHECKS) {
  const p = results['原型'];
  const a = results['产物'];
  const pN = p ? p.hits[chk.key].length : 0;
  const aN = a ? a.hits[chk.key].length : 0;
  const pTot = p ? p.n : 0;
  const aTot = a ? a.n : 0;
  /* 判定：原型 0 且产物 > 0 才是「产物特有」；两边都有说明它不是产物的问题 */
  let verdict;
  if (pN === 0 && aN === 0) verdict = '两边都没有 —— 理论上可能，实际未发生';
  else if (pN === 0) verdict = '★ 产物特有 —— 候选真缺陷';
  else if (aN === 0) verdict = '只有原型有 —— 产物没踩';
  else verdict = '两边都有 —— 不是产物特有的问题';
  console.log(`${chk.label}`);
  console.log(`   原型 ${pN}/${pTot}　产物 ${aN}/${aTot}　${verdict}`);
  if (pN) console.log(`   原型命中：${p.hits[chk.key].slice(0, 8).join(' ')}`);
  if (aN) console.log(`   产物命中：${a.hits[chk.key].slice(0, 8).join(' ')}`);
  console.log('');
}

console.log('说明：这只是形态计数，不是缺陷判定。');
console.log('  「原型 0 + 产物 > 0」才够格当候选真缺陷；');
console.log('  「两边都有」则说明这是这个产品的正常写法，判据该放宽而不是收紧。');
