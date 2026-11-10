import fs from 'fs';
const t = fs.readFileSync('D:/Web/style/deliverables/62-verify/dump30-frozen.txt', 'utf8');
const parts = t.split(/^===== (S\d+) =====$/m).slice(1);
const cases = [];
for (let i = 0; i < parts.length; i += 2) cases.push({ id: parts[i], body: parts[i + 1] });
console.log('cases', cases.length);
const cnt = (s, sub) => s.split(sub).length - 1;

// 1. doubled title chain
const dbl = [];
cases.forEach(c => { const n = cnt(c.body, '标题按这个顺序取第一个可用的：'); if (n > 1) dbl.push(c.id + 'x' + n); });
console.log('doubled title chain:', dbl.length, dbl.join(' '));

// 2. numbering continuity
const numbad = [];
cases.forEach(c => {
  const sec = (c.body.split('结构约束：')[1] || '');
  const st = sec.split('防退化')[0];
  const nums = [...st.matchAll(/^(\d+)\. /gm)].map(m => +m[1]);
  const vis = (c.body.split('视觉硬约束')[1] || '').split('结构约束')[0];
  const vn = [...vis.matchAll(/^(\d+)\. /gm)].map(m => +m[1]);
  if (nums.join(',') !== '1,2,3,4') numbad.push(c.id + ' struct[' + nums + ']');
  if (vn.join(',') !== '1,2,3,4,5') numbad.push(c.id + ' vis[' + vn + ']');
});
console.log('numbering issues:', numbad.length, numbad.join(' '));

// 3. internal term leaks
const bad = ['未声明', '全直角 0', 'undefined', 'null', 'NaN', '有刻印感的衬线', '[object', '这几级', 'NaN'];
const leak = [];
cases.forEach(c => { const h = [...new Set(bad.filter(x => c.body.includes(x)))]; if (h.length) leak.push(c.id + ':' + h.join(',')); });
console.log('internal leaks:', leak.length, leak.join(' '));

// 4. double period
const dd = cases.filter(c => c.body.includes('。。')).map(c => c.id);
console.log('double-period:', dd.length, dd.join(' '));

// 5. conflicting placeholder vs real image
const conflict = cases.filter(c => c.body.includes('占位') && c.body.includes('不许用 1px 图')).map(c => c.id);
console.log('placeholder-vs-real-image cases:', conflict.length);

// 6. same-face / CJK warning check: cases whose display chain has no CJK, yet prompt still says "不要回退系统默认无衬线"
const CJK = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans)/i;
let falseBan = [];
cases.forEach(c => {
  const m = c.body.match(/标题按这个顺序取第一个可用的：([^\n（]+)/);
  const chain = m ? m[1] : '';
  const hardBan = c.body.includes('也不要跳过上面这条链直接回退成系统默认无衬线');
  if (hardBan && !CJK.test(chain)) falseBan.push(c.id + ' chain=' + chain.trim());
});
console.log('hard CJK ban but chain has no CJK font:', falseBan.length);
falseBan.forEach(x => console.log('   ', x));
