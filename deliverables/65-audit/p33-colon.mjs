// 探针 33：修正 —— R1 只认全角冒号「：」，重算触发距离；并实测 OLD 正则对 S20 的行为
import { readSpec, specIds } from './lib-load.mjs';

const BARE = /^(\d{1,2})(?![-.．\d])/;
console.log('=== 行首裸数字行 → 到第一个【全角】冒号的距离（R1 只认 ：）===');
const rows = [];
for (const id of specIds()) {
  const text = readSpec(id);
  const L = text.split(/\r?\n/);
  for (let i = 0; i < L.length; i++) {
    if (!BARE.test(L[i])) continue;
    const d = L[i].search(/：/);
    rows.push({ id, line: i + 1, dist: d, txt: L[i].slice(0, 55) });
  }
}
for (const r of rows) {
  const verdict = r.dist < 0 ? '无全角冒号 → 安全' : r.dist <= 39 ? '⚠ 会被误判' : '冒号>39 → 当前安全';
  console.log(`${r.id}:${r.line}\tdist=${r.dist}\t${verdict}\t${JSON.stringify(r.txt)}`);
}

// 直接实测 OLD 正则对 S20 的匹配
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const OLD_R1 = new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm');
console.log('\n=== OLD R1 在 S20 上的命中 key ===');
const t20 = readSpec('S20');
for (const m of t20.matchAll(OLD_R1)) {
  const ln = t20.slice(0, m.index).split(/\r?\n/).length;
  if (!/^(\d{1,2})[.．]|[0-9]-附/.test(m[0])) console.log(`  L${ln}: "${m[0].slice(0, 60)}"  key="${m[3]}"`);
}
console.log('（以上若为空，说明 S20 的「1:1」用的是半角冒号，不触发）');

console.log('\n=== 结论：真正会被误判的案 ===');
console.log(rows.filter((r) => r.dist >= 0 && r.dist <= 39).map((r) => `${r.id}:${r.line}(dist=${r.dist})`).join(' '));
