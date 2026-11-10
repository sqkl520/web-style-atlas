// 对 L7-11 那 7 条自述做 git 考古：每一条的"改前值"是否真的存在过。
import { execFileSync } from 'node:child_process';

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/^\uFEFF/, '');
const CSS = 'prototypes/_selection/style.css';
const log = git(['log', '--format=%h|%ad|%s', '--date=short', '--', CSS]).trim().split(/\r?\n/);
console.log(`style.css 提交数 = ${log.length}`);
console.log(log.map((l) => '  ' + l).join('\n'));

const showCss = (rev) => { try { return git(['show', `${rev}:${CSS}`]); } catch { return null; } };

console.log('\n=== 3.8vw / 4vw / 5.2vw 出现史 ===');
for (const l of log) {
  const rev = l.split('|')[0];
  const s = showCss(rev);
  if (!s) continue;
  const hits = [];
  for (const re of [/3\.8vw/, /4vw/, /5\.2vw/, /--s-h1\s*:/, /font-size:\s*clamp\([^)]*\)/g]) {
    const m = s.match(re);
    if (m) hits.push(Array.isArray(m) ? [...new Set(m)].join(' ') : m[0]);
  }
  console.log(`  ${rev}  ${hits.join(' | ').slice(0, 160)}`);
}

console.log('\n=== mast-kicker 的 text-transform / uppercase / letter-spacing 史 ===');
for (const l of log) {
  const rev = l.split('|')[0];
  const s = showCss(rev);
  if (!s) continue;
  const i = s.indexOf('.mast-kicker');
  if (i < 0) { console.log(`  ${rev}  (无 .mast-kicker)`); continue; }
  const block = s.slice(i, s.indexOf('}', i) + 1).replace(/\s+/g, ' ');
  console.log(`  ${rev}  ${block.slice(0, 200)}`);
}

console.log('\n=== 11px / 12px font-size 声明数（style.css）===');
for (const l of log) {
  const rev = l.split('|')[0];
  const s = showCss(rev);
  if (!s) continue;
  const strip = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const n11 = (strip.match(/font-size\s*:\s*11px/g) || []).length;
  const n12 = (strip.match(/font-size\s*:\s*12px/g) || []).length;
  const varRef = (strip.match(/var\(--s-1[12]\)/g) || []).length;
  if (n11 || n12 || varRef) console.log(`  ${rev}  font-size:11px=${n11}  font-size:12px=${n12}  var(--s-11/12)=${varRef}`);
}

console.log('\n=== --ink-3 取值史（找 4.2 → 5.6 那次）===');
for (const l of log) {
  const rev = l.split('|')[0];
  const s = showCss(rev);
  if (!s) continue;
  const m = s.match(/--ink-3:\s*#([0-9a-f]{6})/i);
  console.log(`  ${rev}  --ink-3 = ${m ? '#' + m[1] : '(无)'}`);
}

console.log('\n=== 1px 行分隔线计数史（border-(top|bottom|left|right): 1px / 0.5px）===');
for (const l of log) {
  const rev = l.split('|')[0];
  const s = showCss(rev);
  if (!s) continue;
  const strip = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const one = (strip.match(/border-(top|bottom|left|right)\s*:\s*(0?\.5|1)px/g) || []).length;
  const two = (strip.match(/border-(top|bottom|left|right)\s*:\s*2px/g) || []).length;
  const four = (strip.match(/border\s*:\s*(0?\.5|1)px/g) || []).length;
  console.log(`  ${rev}  单边 1px=${one}  单边 2px=${two}  四面 1px=${four}`);
}

console.log('\n=== .bar 的 sticky 史 ===');
for (const l of log) {
  const rev = l.split('|')[0];
  const s = showCss(rev);
  if (!s) continue;
  const i = s.indexOf('.bar {');
  const seg = i >= 0 ? s.slice(i, s.indexOf('}', i) + 1).replace(/\s+/g, ' ') : '(无 .bar{)';
  const sticky = /position:\s*sticky/.test(seg) ? 'STICKY' : 'static';
  console.log(`  ${rev}  .bar=${sticky}`);
}
