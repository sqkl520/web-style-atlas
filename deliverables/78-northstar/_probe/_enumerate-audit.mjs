/* 巡检：还有多少处「闸门读不到对象却报出干净数」。
 *
 * 这一轮已经抓到五次同一形状的缺陷，五次都没有任何一处会报错：
 *   ① 正对照跑产物不跑原型
 *   ② 只读第一个 <style>，渐变从没被读过
 *   ③ CSS 注释被当成字体声明
 *   ④ undecided 盖住 fontSource
 *   ⑤ --all 跳过所有重跑目录
 *
 * 五次都是「筛选/读取条件」写窄了。所以这一次不改具体判据，
 * 而是把所有**目录/文件枚举点**列出来，逐个问：
 * 这个正则/条件会不会静默漏掉真实存在的对象？
 *
 * 这个脚本不做断言，只出清单 —— 断言要人去写，因为「应有多少」只有人知道。
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');

/* 扫描范围：所有会枚举文件/目录的脚本 */
const DIRS = [
  join(REPO, 'prototypes', '_build'),
  join(REPO, 'prototypes', '_prompts'),
  join(REPO, 'deliverables', '78-northstar', '_probe'),
];

const findings = [];
let scanned = 0;

for (const dir of DIRS) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mjs')) continue;
    const p = join(dir, f);
    const src = readFileSync(p, 'utf8');
    scanned++;

    /* 找所有把 readdirSync 结果过滤掉的地方 */
    for (const m of src.matchAll(/readdirSync\([\s\S]{0,200}?\)[\s\S]{0,120}?\.filter\([\s\S]{0,160}?\}/g)) {
      const snippet = m[0].replace(/\s+/g, ' ');
      const re = snippet.match(/\/((?:\\.|[^/\\])+)\/[gimsuy]*\.test/);
      if (!re) continue;
      findings.push({ file: f, dir: basename(dir), kind: 'readdir+filter', pattern: re[0], snippet: snippet.slice(0, 160) });
    }
    /* 找 .match(/.../) 用于「数出有几份」的地方 */
    for (const m of src.matchAll(/(?:matchAll|\.match)\(\/((?:\\.|[^/\\])+)\/[gimsuy]*(?:,|\))/g)) {
      const pat = m[1];
      /* 只关心形状像「文件名」或「一段有编号的文本」的那些 */
      if (!/S\\?d|S\\d|\^[A-Z]/.test(pat)) continue;
      findings.push({ file: f, dir: basename(dir), kind: 'match-enumerate', pattern: '/' + pat + '/', snippet: '' });
    }
  }
}

console.log(`扫描 ${scanned} 个脚本，找到 ${findings.length} 个枚举点\n`);

/* 逐条人工核对：把已知的对照数写在下面，脚本只负责把它们摆出来 */
const rows = [
  { obj: '盲测产物目录', dir: 'deliverables/78-northstar/_blindtest', pattern: /^S\d{2}(-r\d+)?$/, count: () => countDirs(join(REPO, 'deliverables/78-northstar/_blindtest'), /^S\d{2}(-r\d+)?$/) },
  { obj: '原型目录', dir: 'prototypes', pattern: /^S\d{2}-/, count: () => countDirs(join(REPO, 'prototypes'), /^S\d{2}-/) },
  { obj: '_probe 脚本', dir: 'deliverables/78-northstar/_probe', pattern: /\.mjs$/, count: () => countDirs(join(REPO, 'deliverables/78-northstar/_probe'), /\.mjs$/, true) },
];

function countDirs(dir, re, isFile) {
  if (!existsSync(dir)) return -1;
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => (isFile ? d.isFile() : d.isDirectory()) && re.test(d.name)).length;
}

console.log('磁盘上真实存在：');
for (const r of rows) console.log(`  ${r.obj.padEnd(20)} ${String(r.count()).padStart(4)}`);

console.log('\n所有枚举点的正则：\n');
for (const f of findings) {
  console.log(`  ${f.file.padEnd(38)} ${f.kind.padEnd(18)} ${f.pattern}`);
}

console.log('\n要问的问题（只有人能答）：');
console.log('  1. 这个正则允许的子名，和磁盘上真实存在的子名，一样吗？');
console.log('  2. 如果不一样，漏掉的那些里有没有**最要紧的样本**？');
console.log('  3. 漏掉时脚本会不会报错？（提示：这五次都不会）');
