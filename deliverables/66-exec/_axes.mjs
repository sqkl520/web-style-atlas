// 66-exec：轴取值分布（给验收 4 的 10 组组合抽测挑候选值）
import { readFileSync } from 'node:fs';
const t = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const body = t.slice(t.indexOf('= ') + 2);
const json = body.slice(0, body.lastIndexOf(']') + 1);
const j = JSON.parse(json);
const u = (f) => {
  const m = new Map();
  j.forEach((r) => { const v = String(f(r) == null ? '' : f(r)).trim(); if (v) m.set(v, (m.get(v) || 0) + 1); });
  return [...m.entries()];
};
console.log('rows', j.length);
console.log('ground', JSON.stringify(u((r) => r.axes.ground)));
console.log('band', JSON.stringify(u((r) => r.axes.band)));
console.log('load', JSON.stringify(u((r) => r.axes.load)));
console.log('loud', JSON.stringify(u((r) => r.axes.loud)));
console.log('fr', JSON.stringify(u((r) => r.fr)));
console.log('thr', JSON.stringify(u((r) => r.threshold)));
console.log('tone', JSON.stringify(u((r) => r.tone)));
console.log('gate.fail', JSON.stringify(u((r) => (r.gate ? 'FAIL' + r.gate.fail : '未渲染'))));
console.log('stateKey', JSON.stringify(u((r) => (!r.built ? '未建原型' : !r.gate ? '已建 · 未渲染' : '已建 · 已渲染'))));
