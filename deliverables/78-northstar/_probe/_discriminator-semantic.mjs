/* 判别值的语义位置检验：命中的判别值，是不是用在了对的地方？
 *
 * 前两个脚本证明「数字出现了」。本仓库最老的病是「数字对、对象错」——
 * 60px 就算出现在一个 padding 里也算命中，但那是巧合不是知识。
 *
 * 本脚本对每个判别值，把产物里它的每次出现连上下文一起打出来，
 * 并标出那个值在提示词里的原始语义。人工/规则都能看出用没用对。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensOf, discriminatorsFor } from './_discriminator-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(ROOT, 'deliverables/78-northstar/_probe/_staged');

/* 有产物且有判别值的案。
 * ⚠️ 2026-11-14 补 S21 —— 原来漏了它（那时它还没产物），
 * 导致这里算 64 而 _discriminator-check 算 67。
 * 两个脚本的口径必须一致：都是「有产物 + 有判别值」的 12 案。 */
const CASES = ['S04', 'S08', 'S13', 'S15', 'S18', 'S21', 'S22', 'S29', 'S31', 'S32', 'S35', 'S99'];

const artifactOf = (id) => {
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`, `${id}.html`]) {
    const f = join(STAGED, n);
    if (existsSync(f)) return readFileSync(f, 'utf8');
  }
  return null;
};

/* 从提示词里抓「值 + 它的语义」：前后文 40 字 */
const contextIn = (txt, tok) => {
  const idx = txt.indexOf(tok);
  if (idx < 0) return null;
  return txt.slice(Math.max(0, idx - 45), idx + tok.length + 45).replace(/\s+/g, ' ');
};

const cssDeclOf = (html, tok) => {
  /* 118px 不能被 1180px 命中 —— 数字两侧都要有边界 */
  const num = tok.startsWith('#') ? null : tok.replace(/[a-z%]+$/, '');
  const unit = tok.startsWith('#') ? '' : tok.slice(num.length);
  const re = tok.startsWith('#')
    ? new RegExp(`([a-z0-9-]+)\\s*:\\s*[^;{}]*?${tok}(?![0-9A-Fa-f])[^;{}]*`, 'gi')
    : new RegExp(`([a-z0-9-]+)\\s*:\\s*[^;{}]*?(?<![\\d.])${num.replace('.', '\\.')}${unit}(?![\\d])[^;{}]*`, 'gi');
  const out = [];
  for (const m of html.matchAll(re)) out.push(m[0].trim().slice(0, 90));
  return [...new Set(out)].slice(0, 4);
};

let checked = 0, semanticOk = 0, semanticSuspect = 0;
const suspects = [];

for (const id of CASES) {
  const txtPath = join(BLIND, id, 'task.txt');
  const html = artifactOf(id);
  if (!existsSync(txtPath) || !html) continue;
  const txt = readFileSync(txtPath, 'utf8');

  /* 该案的判别值 —— 用共享实现 _discriminator-lib.mjs。
   * 这段原本是内联的第 5 份拷贝，而且是**旧版**：
   * 它的 % 正则末尾带 \b（漏掉所有百分比），也没有跳过「最容易做成的
   * 错误样子」那一段。于是它输出 67 而其他脚本已经 71。 */
  /* 语料库必须与 _discriminator-check.mjs 完全一致（全部 38 份），
     否则「其他任务书里也出现过」的判定会不同，判别值个数就对不上。 */
  const all = {};
  for (const d of readdirSync(BLIND, { withFileTypes: true })) {
    if (!d.isDirectory() || !/^S\d{2}$/.test(d.name)) continue;
    const p = join(BLIND, d.name, 'task.txt');
    if (existsSync(p)) all[d.name] = tokensOf(readFileSync(p, 'utf8'));
  }
  const mine = discriminatorsFor(id, all);

  console.log(`\n${'='.repeat(78)}\n${id}　判别值 ${mine.length} 个\n${'='.repeat(78)}`);
  for (const t of mine) {
    const inPrompt = contextIn(txt, t);
    const decls = cssDeclOf(html, t);
    const present = decls.length > 0 || html.toUpperCase().includes(t.toUpperCase());
    checked++;
    if (!inPrompt) { semanticSuspect++; suspects.push({ id, t, why: '提示词里找不到该 token 的原始语境' }); continue; }
    if (!present) { semanticSuspect++; suspects.push({ id, t, why: '产物里没有可定位的声明' }); continue; }
    semanticOk++;
    console.log(`\n  [${t}]`);
    console.log(`    提示词语义: …${inPrompt}…`);
    console.log(`    产物声明  : ${decls.length ? decls.join('  ||  ') : '(仅文本出现，未在 CSS 声明里)'}`);
  }
}

console.log(`\n${'─'.repeat(78)}`);
console.log(`可定位到语义的判别值: ${semanticOk} / ${checked}`);
console.log(`可疑（无法定位语义）: ${semanticSuspect}`);
for (const s of suspects) console.log(`  ${s.id} ${s.t}: ${s.why}`);
