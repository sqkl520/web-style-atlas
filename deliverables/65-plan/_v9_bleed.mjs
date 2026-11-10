// 更广的发现：无编号加粗小节被并入上一字段——这是「一类」bug，不是 S13 一例
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
const SPECS = resolve('prototypes/_specs');
const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));
const dec = (s) => String(s).replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

console.log('=== 全库无编号加粗小节 → 落进了哪个 data.js 字段 ===');
const SUBS = {
  'S13': ['反套路改造三指标'],
  'S14': ['放弃常规导航后的可发现性机制', '断点具体行为'],
  'S15': ['三层硫酸纸的透叠规则', '断点具体行为'],
  'S16': ['断点具体行为'],
  'S17': ['断点具体行为'],
  'S20': ['断点具体行为'],
};
for (const [id, marks] of Object.entries(SUBS)) {
  const r = rows.find((x) => x.id === id);
  for (const m of marks) {
    const found = [];
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === 'string' && v.includes(m)) found.push(`${k}@${v.indexOf(m)}(总${v.length})`);
    }
    console.log(`  ${id} 「${m}」 → ${found.length ? found.join(' , ') : '未出现在任何字段（已丢）'}`);
  }
}

console.log('\n=== S03 / S08 的 3-附（编号加粗小节）落到哪里 ===');
for (const id of ['S03', 'S08']) {
  const md = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const i = md.indexOf('3-附');
  const seg = md.slice(i, i + 260).split(/\r?\n/).slice(0, 3).join(' / ');
  console.log(`\n[${id}] md 原文: ${seg}`);
  const probe = md.slice(i, i + 120).replace(/[*`]/g, '').replace(/\s+/g, ' ').slice(0, 40);
  const hit = Object.entries(rows.find((x) => x.id === id)).filter(([k, v]) => typeof v === 'string' && v.includes(probe.slice(0, 30)));
  console.log(`   在 data.js 里命中: ${hit.length ? hit.map(([k]) => k).join(',') : '无 —— 整段蒸发'}`);
}

console.log('\n=== layout 里的父子块字数（无编号小节贡献）===');
for (const [id, marks] of Object.entries(SUBS)) {
  const r = rows.find((x) => x.id === id);
  if (!r || !r.layout) continue;
  for (const m of marks) {
    const i = r.layout.indexOf(m);
    if (i >= 0 && r.layout === r.layout) {
      if (r.layout.includes(m)) console.log(`  ${id}.layout 含「${m}」于第 ${i} 字，之后还剩 ${r.layout.length - i} 字 / 全 ${r.layout.length}`);
    }
  }
}

console.log('\n=== 若把「无编号小节」当作字段终止符，各案字段会缩多少（只报，不改）===');
for (const [id, marks] of Object.entries(SUBS)) {
  const r = rows.find((x) => x.id === id);
  for (const m of marks) {
    for (const k of ['layout', 'audit']) {
      const v = r[k] || '';
      const i = v.indexOf(m);
      if (i >= 0) console.log(`  ${id}.${k}: ${v.length} → ${i} （切掉 ${v.length - i} 字）`);
    }
  }
}
