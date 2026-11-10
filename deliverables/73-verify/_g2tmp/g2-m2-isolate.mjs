/* REVIEW-GATE2：用「干净清单」把 M2 的触发源隔离出来
 *
 * 手法：先 restore() 到脚本启动时的快照，再把 css 设为 at+2min，
 * 然后**分别**读 check-stale 的 findStale() 结果，看每条的 label。
 * 这样能确定：M2 红是阈值问题，还是**提示词链**问题（与本前置条件无关的另一环）。
 */
import { readFileSync, writeFileSync, statSync, utimesSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CASE = `${ROOT}/prototypes/S12-lime-knockout-wall`;
const CSS = `${CASE}/style.css`;
const REP = `${CASE}/.inspect/report.json`;
const JPG = `${CASE}/.inspect/desktop-fold.jpg`;

const cssOrig = readFileSync(CSS, 'utf8');
const repOrig = readFileSync(REP, 'utf8');
const cssStat = statSync(CSS);
const jpgStat = statSync(JPG);
const repAt = new Date(JSON.parse(repOrig).at).getTime();

const restore = () => {
  writeFileSync(CSS, cssOrig, 'utf8');
  writeFileSync(REP, repOrig, 'utf8');
  utimesSync(CSS, cssStat.atime, cssStat.mtime);
  utimesSync(JPG, jpgStat.atime, jpgStat.mtime);
};

/* 直接 import findStale，拿到结构化结果（而不是解析文本） */
const staleOf = async () => {
  const mod = await import('file:///D:/Web/style/prototypes/_build/check-stale.mjs?t=' + Date.now());
  return mod.findStale();
};

console.log('═══ M2 触发源隔离 ═══');
console.log(`report.at   = ${new Date(repAt).toISOString()}`);
console.log(`dna-raw     = ${statSync(`${ROOT}/prototypes/_prompts/dna-raw.json`).mtime.toISOString()}`);
console.log('');

for (const [label, offsetMin] of [['M2 (at + 2min)', 2], ['M1 (at + 10min)', 10]]) {
  restore();
  utimesSync(CSS, new Date(repAt + offsetMin * 60000), new Date(repAt + offsetMin * 60000));
  const items = await staleOf();
  console.log(`── ${label}：${items.length} 项`);
  for (const s of items) {
    console.log(`   [${s.label || s.id}] ${s.which}  gapMin=${typeof s.gapMin === 'number' ? s.gapMin.toFixed(2) : s.gapMin}`);
  }
  const caseItems = items.filter((s) => s.id === 'S12' || s.dir === 'S12-lime-knockout-wall');
  const chainItems = items.filter((s) => !caseItems.includes(s));
  console.log(`   其中本案(①) ${caseItems.length} 项 / 其它(②③) ${chainItems.length} 项`);
  console.log('');
}

restore();
const items = await staleOf();
console.log(`恢复后 ${items.length} 项（应为 0）`);
