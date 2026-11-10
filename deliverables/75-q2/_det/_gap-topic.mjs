import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

// 22 个结构标签 / 8 对撞车（已验证）
const m = {}; for (const s of S) (m[s.structure] = m[s.structure] || []).push(s.id);
console.log('结构标签', Object.keys(m).length, '个；撞车', Object.entries(m).filter(([, v]) => v.length > 1).length, '对');
console.log('未用过的结构标签空间：题目契约说从「非默认熟悉骨架池」里选，同一骨架最多 3 次。');
console.log('现最高频:', Object.entries(m).sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([k, v]) => k + '×' + v.length).join('  '));

// F/R 型分布
const fr = {}; S.forEach((s) => (fr[s.fr] = (fr[s.fr] || 0) + 1));
console.log('\nF/R 型:', JSON.stringify(fr));

// 调性分布（40 词黑名单之外，这里是 7 种调性）
const tone = {}; S.forEach((s) => (tone[s.tone] = (tone[s.tone] || 0) + 1));
console.log('\n调性分布:');
Object.entries(tone).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(2) + '  ' + k));

// 认知门槛
const thr = {}; S.forEach((s) => (thr[s.threshold] = (thr[s.threshold] || 0) + 1));
console.log('\n认知门槛:', JSON.stringify(thr));

// 内容量 load
const load = {}; S.forEach((s) => (load[s.axes.load] = (load[s.axes.load] || 0) + 1));
console.log('内容量:', JSON.stringify(load));

// 每个方案的真实图片数分布
const rp = {}; S.forEach((s) => { const n = (s.gate && s.gate.realPictures) || 0; rp[n] = (rp[n] || 0) + 1; });
console.log('\nrealPictures 分布:', Object.entries(rp).sort((a, b) => a[0] - b[0]).map(([k, v]) => k + '图×' + v).join('  '));
