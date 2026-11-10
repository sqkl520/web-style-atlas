import { readFileSync } from 'node:fs';
const lines = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lint.mjs', 'utf8').split(/\r?\n/);
const re = /^\s*\['(FAIL|WARN)',\s*'([a-z-]+)'/;
const rules = [];
for (const l of lines) { const m = l.match(re); if (m) rules.push({ level: m[1], id: m[2] }); }
console.log('total rules in R[]:', rules.length);
console.log('FAIL:', rules.filter((r) => r.level === 'FAIL').length, 'WARN:', rules.filter((r) => r.level === 'WARN').length);
console.log('ids:', rules.map((r) => r.level + ':' + r.id).join(', '));
