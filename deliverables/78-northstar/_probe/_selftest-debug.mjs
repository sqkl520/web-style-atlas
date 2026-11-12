import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const src = readFileSync('prototypes/_selection/prompts.js', 'utf8');
const re = /("id":\s*"S34"[^}]*?"minPics":\s*)0/;
const m = src.match(re);
console.log('regex match:', !!m);
const mutated = src.replace(re, m[1] + '3');
writeFileSync('C:\\tmp\\mut-prompts.js', mutated);
console.log('mutated len:', mutated.length);

let out = '', code = 0;
try {
  out = execFileSync(process.execPath, ['prototypes/_build/check-prompts.mjs', '--json'],
    { env: { ...process.env, PROMPTS_OVERRIDE: 'C:\\tmp\\mut-prompts.js' }, encoding: 'utf8', timeout: 120000 });
} catch (e) { out = e.stdout || ''; code = e.status ?? 1; }
console.log('exit code:', code, 'stdout len:', out.length);
try {
  const j = JSON.parse(out);
  const mp = j.findings.filter((x) => /minpics/.test(x.rule));
  console.log('minpics findings:', mp.length, mp.map((x) => x.rule + '/' + x.level + '/' + x.id).join(' '));
  const fails = j.findings.filter((x) => x.level === 'FAIL');
  console.log('all FAILs:', fails.length, [...new Set(fails.map((f) => f.rule))].join(','));
} catch (e) {
  console.log('parse fail:', e.message);
  console.log('head:', out.slice(0, 300));
}
