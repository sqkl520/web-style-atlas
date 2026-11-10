#!/usr/bin/env node
/* EXEC-B：把 B-dump-prompts.mjs 的产物转成 69-audit 抽取器认识的 dump30.json 形状，
 * 然后跑**同一份** M/S/J 分类器，得到"改写前 / 改写后"可比的约束条数。
 *
 * 为什么必须用同一份分类器：任务要求"机械可验的约束条数不能减少"。
 * 自己另写一个计数器，改完自然"没减少"——那是自证。用审计 Agent 写的那份，
 * 且**不改它的判定逻辑**（只改输出目录），才叫同口径。
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const B = join(ROOT, 'deliverables/70-exec/probes-b');
const src = JSON.parse(readFileSync(join(B, 'prompts-all.json'), 'utf8'));
const prompts = {};
for (const [id, v] of Object.entries(src)) prompts[id] = v.text;
writeFileSync(join(B, 'dump30.json'), JSON.stringify({ prompts }, null, 1), 'utf8');
console.log('已写 ' + join(B, 'dump30.json') + '（' + Object.keys(prompts).length + ' 条）');
