// 探针 2b：把 app.js 的 match() 逻辑抽出来，算「用户搜某个词会得到几行」。
// 不启浏览器，直接照抄 app.js 里搜索轴的实际判据（见下方引用行）。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const app = readFileSync(join(ROOT, 'prototypes/_selection/app.js'), 'utf8');
// 定位 match 函数
const m = app.match(/function match\([\s\S]*?\n  \}/);
out('=== app.js match() 原文 ===');
out(m ? m[0] : '(没匹配到，需人工读)');

out('\n=== clearSceneIds / setSceneIds 接口 ===');
for (const mm of app.matchAll(/window\.bench\w+\s*=\s*function[^\n]*/g)) out(mm[0]);
