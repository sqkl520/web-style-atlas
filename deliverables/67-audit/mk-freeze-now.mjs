// mk-freeze-now.mjs — 把**当前工作区**的 _selection 抓成快照（不依赖 git HEAD）。
// 用于列表页矩阵：仓库在审计期间被持续修改，只有钉住一份才能真正比较方案。
import { copyFileSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { HERE, ROOT } from './lib-measure.mjs';

const SRC = join(ROOT, 'prototypes', '_selection');
const OUT = join(HERE, 'frozen-now');
mkdirSync(OUT, { recursive: true });
const FILES = ['index.html', 'style.css', 'app.js', 'data.js', 'prompts.js', 'prompt-copy.js', 'wizard.js', 'wizard.css', 'wizard.html'];
const toUrl = (p) => 'file:///' + join(ROOT, 'prototypes', p).replace(/\\/g, '/');

const meta = { at: new Date().toISOString(), files: {}, note: '工作区快照（非 git）。只读，用于本次审计的可比测量。' };
for (const f of FILES) {
  const p = join(SRC, f);
  if (!existsSync(p)) continue;
  let src = readFileSync(p, 'utf8');
  if (f === 'index.html' || f === 'wizard.html') src = src.replace(/\.\.\/_fonts\//g, toUrl('_fonts') + '/');
  if (f === 'data.js') src = src.replace(/"\.\.\/(S\d{2}-[^/"]+)\//g, (m0, d) => `"${toUrl(d)}/`);
  if (f === 'app.js') src = src.replace(/'\.\.\/' \+ esc\(r\.dir\)/, `'${toUrl('')}/' + esc(r.dir)`);
  if (f === 'prompt-copy.js') src = src.replace(/\.\.\/(S\d{2}-[^/'"`]+)\//g, (m0, d) => `${toUrl(d)}/`);
  writeFileSync(join(OUT, f), src, 'utf8');
  meta.files[f] = { bytes: readFileSync(p).length, sha1: createHash('sha1').update(readFileSync(p)).digest('hex').slice(0, 12) };
}
writeFileSync(join(OUT, 'FROZEN.json'), JSON.stringify(meta, null, 2), 'utf8');
console.log(JSON.stringify(meta, null, 2));
