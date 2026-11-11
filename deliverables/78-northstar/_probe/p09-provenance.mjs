// 探针 09：逐案来源（首次加入 / 最后实质改动 / 最后重新过闸），用于判定"新案"与"被验证过几次"
import { execSync } from 'node:child_process';

const ids = Array.from({ length: 35 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const out = [];
for (const id of ids) {
  const g = (args) => {
    try { return execSync(`git -C "D:/Web/style" ${args}`, { encoding: 'utf8' }).trim(); }
    catch { return ''; }
  };
  const add = g(`log --diff-filter=A --format=%ad --date=short -1 -- "prototypes/${id}-*"`);
  // 只统计内容文件（style.css / index.html / _specs），排除截图与报告
  const lastContent = g(`log -1 --format=%ad --date=short -- "prototypes/${id}-*/style.css" "prototypes/${id}-*/index.html" "prototypes/_specs/${id}.md"`);
  const nCommits = g(`rev-list --count HEAD -- "prototypes/${id}-*/style.css" "prototypes/${id}-*/index.html" "prototypes/_specs/${id}.md"`);
  out.push({ id, added: add, lastContent, nCommits });
}
console.log('id  added       lastContent  commits(content)');
for (const r of out) console.log(`${r.id}  ${r.added}  ${r.lastContent}  ${r.nCommits}`);

const q2 = out.filter(r => r.added === '2026-11-10').map(r => r.id);
console.log('\nQ2（2026-11-10 新建）=', q2.join(' '), ` 共 ${q2.length} 案`);
console.log('其余全为 Q1（2026-10-20 首次加入）=', out.filter(r => r.added !== '2026-11-10').length, '案');

const SAMPLE = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
console.log('\n8 案 added:', SAMPLE.map(id => id + '=' + (out.find(r => r.id === id) || {}).added).join(' '));
console.log('8 案中是 Q2 新建的:', SAMPLE.filter(id => q2.includes(id)).length);
