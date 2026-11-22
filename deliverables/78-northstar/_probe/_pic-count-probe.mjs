/* 查那 4 个「图片数对不上」的案：S01 / S15 / S24 / S09。
 * 先看产物实际排了几张、提示词要求几张、原型有几个位。 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DELIV = resolve(HERE, '..');
const REPO = resolve(DELIV, '..', '..');
const BT = join(DELIV, '_blindtest');
const P = join(REPO, 'prototypes');

const promptSrc = readFileSync(join(P, '_selection', 'prompts.js'), 'utf8');
function entry(id) {
  const i = promptSrc.search(new RegExp(`"id": "${id}",\\s*\\n\\s*"dir"`));
  if (i < 0) return null;
  const b = promptSrc.slice(i, i + 2000);
  return {
    minItems: +(b.match(/"minItems":\s*(\d+)/)?.[1] ?? -1),
    minPics: +(b.match(/"minPics":\s*(\d+)/)?.[1] ?? -1),
    degrades: b.match(/"degrades":\s*"(\w+)"/)?.[1] ?? '?',
    dir: b.match(/"dir":\s*"([^"]+)"/)?.[1],
  };
}

const IDS = ['S01', 'S15', 'S24', 'S09'];
console.log('案   提示词 minPics/minItems/degrades   产物 <img>/背景图   原型 <img>   提示词图片段原文');
console.log('─'.repeat(130));
for (const id of IDS) {
  const e = entry(id);
  const dir = join(BT, id);
  const html = existsSync(join(dir, 'index.html'))
    ? readFileSync(join(dir, 'index.html'), 'utf8')
    : (readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => readFileSync(join(dir, f), 'utf8'))[0] || '');
  const imgs = (html.match(/<img\b/gi) || []).length;
  const bgs = (html.match(/background-image\s*:\s*url\(/gi) || []).length;
  const proto = existsSync(join(P, e.dir, 'index.html'))
    ? (readFileSync(join(P, e.dir, 'index.html'), 'utf8').match(/<img\b/gi) || []).length
    : -1;
  const prompt = existsSync(join(dir, '_prompt.txt')) ? readFileSync(join(dir, '_prompt.txt'), 'utf8') : '';
  const picLine = (prompt.split('\n').find((l) => /图片位|图片位置|个图片/.test(l)) || '').slice(0, 60);
  console.log(`${id}   ${String(e.minPics).padStart(3)} / ${String(e.minItems).padStart(3)} / ${e.degrades.padEnd(3)}            ${imgs} img + ${bgs} bg          ${String(proto).padStart(3)}         ${picLine}`);
}
