// 66 号红队探针公共库（只读仓库既有文件；所有产物写在 deliverables/66-plan/ 内）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..');
export const PROTO = join(ROOT, 'prototypes');
export const SEL = join(PROTO, '_selection');
export const SPECS = join(PROTO, '_specs');

export function loadData() {
  const t = readFileSync(join(SEL, 'data.js'), 'utf8');
  const json = t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, '');
  return JSON.parse(json);
}

export function loadPrompts() {
  const src = readFileSync(join(SEL, 'prompts.js'), 'utf8');
  const g = { window: {} };
  // prompts.js 是 `window.STYLE_PROMPTS = {...}` 的纯数据脚本
  new Function('window', src)(g.window);
  return g.window.STYLE_PROMPTS;
}

export function ids() {
  return readdirSync(PROTO, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
    .map((d) => d.name.slice(0, 3))
    .sort();
}

export function dirOf(id) {
  const d = readdirSync(PROTO, { withFileTypes: true })
    .find((x) => x.isDirectory() && x.name.startsWith(id + '-'));
  return d ? join(PROTO, d.name) : null;
}

export const n = (x) => (typeof x === 'number' ? x : 0);
export const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
export const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
};

export function writeJson(name, obj) {
  const p = join(HERE, name);
  // 用 Buffer 保证 UTF-8，不受控制台代码页影响
  const fs = require('node:fs');
  fs.writeFileSync(p, JSON.stringify(obj, null, 1), 'utf8');
  return p;
}
