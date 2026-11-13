// 第三轮：只用「高辨识度」的判据，避免 3px/12px 这类在任何页面都出现的值造成假命中
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(HERE, '_staged');
const CASES = ['S04','S08','S13','S15','S18','S21','S22','S29','S31','S32','S35','S97','S98','S99'];

function pickArtifact(id) {
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`]) {
    const p = join(STAGED, n);
    if (existsSync(p)) return p;
  }
  return null;
}

const summary = [];
for (const id of CASES) {
  const art = pickArtifact(id);
  const tf = join(BLIND, id, 'task.txt');
  const task = existsSync(tf) ? readFileSync(tf, 'utf8') : '';
  const out = { id, art: art ? art.split(/[\\/]/).pop() : null };
  if (!art) { out.verdict = 'NO_ARTIFACT'; summary.push(out); console.log(`${id}: NO ARTIFACT`); continue; }
  const html = readFileSync(art, 'utf8');
  const up = html.toUpperCase();

  // 1) 配色
  const pal = ((task.match(/^1\. 配色[^\n]*/m) || [''])[0].match(/#[0-9A-Fa-f]{6}/g) || []).map(x => x.toUpperCase());
  out.pal = `${pal.filter(h => up.includes(h)).length}/${pal.length}`;
  out.palMissing = pal.filter(h => !up.includes(h));

  // 2) 绝对最大字号（提示词「约 Npx」）是否原样出现
  const absMax = ((task.match(/^6\. 字号[^\n]*/m) || [''])[0].match(/倍\s*（约\s*([0-9.]+)\s*px）/) || [])[1];
  out.absMax = absMax ? `${absMax}px -> ${html.includes(absMax + 'px') ? 'HIT' : 'miss'}` : 'n/a';

  // 3) 倍率
  out.ratio = ((task.match(/^6\. 字号[^\n]*/m) || [''])[0].match(/([0-9.]+)\s*倍/) || [])[1] || 'n/a';

  // 4) 机制句里的「高辨识度」值：≥3 位数字、或带小数、或带 °/mm/%
  const mechLine = (task.match(/^这个风格的签名动作：[^\n]*/m) || [])[0] || '';
  const toks = [...new Set([...mechLine.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(px|%|°|mm)/g)].map(m => m[1] + m[2]))];
  const distinctive = toks.filter(t => {
    const num = parseFloat(t);
    return t.includes('.') || /°|mm|%/.test(t) || num >= 20;   // 3px/2px/7px 这类也算但单列
  });
  const weak = toks.filter(t => !distinctive.includes(t));
  out.mechStrong = `${distinctive.filter(t => html.includes(t)).length}/${distinctive.length}`;
  out.mechStrongMissing = distinctive.filter(t => !html.includes(t));
  out.mechWeak = `${weak.filter(t => html.includes(t)).length}/${weak.length}`;

  // 5) 字体名
  const fLine = (task.match(/^2\. 字体：[^\n]*/m) || [''])[0];
  const fnames = [];
  for (const m of fLine.matchAll(/([A-Z][A-Za-z0-9]+(?: [A-Za-z0-9]+)*)/g)) {
    const n = m[1];
    if (/^(LXGW|KaiTi|STKaiti|Kaiti|Redaction|Georgia|Nimbus|Martian|Gloock|Source|Noto|Songti|EB|DM|SimSun|Newsreader|Reddit|Glow|Times|VT323|Petrona|Zhuque|IBM|Saira|Jost|Literata|Karla|Overprint|Serif|Sans|Mono|Roman|New|Fangsong|Plex|Condensed|SC)/.test(n)) fnames.push(n);
  }
  const uniqF = [...new Set(fnames)];
  out.font = `${uniqF.filter(n => html.toLowerCase().includes(n.toLowerCase())).length}/${uniqF.length}`;
  out.fontMissing = uniqF.filter(n => !html.toLowerCase().includes(n.toLowerCase()));

  summary.push(out);
  console.log(`${id}: pal=${out.pal} absMax=${out.absMax} ratio=${out.ratio} mechStrong=${out.mechStrong} mechWeak=${out.mechWeak} font=${out.font}`);
  if (out.palMissing?.length) console.log(`      pal missing: ${out.palMissing}`);
  if (out.mechStrongMissing?.length) console.log(`      mech strong missing: ${out.mechStrongMissing}`);
  if (out.fontMissing?.length) console.log(`      font missing: ${out.fontMissing}`);
}
