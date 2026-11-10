import { writeFileSync, utimesSync, statSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const CASE = join(ROOT, 'prototypes/S12-lime-knockout-wall');
const CSS = join(CASE, 'style.css');
const REP = join(CASE, '.inspect/report.json');
const cssOrig = readFileSync(CSS, 'utf8');
const cssStat = statSync(CSS);

const repM = statSync(REP).mtimeMs;
utimesSync(CSS, new Date(repM + 120000), new Date(repM + 120000));

try {
  execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  console.log('exit 0（绿）');
} catch (e) {
  console.log('exit', e.status);
  console.log(String(e.stdout || ''));
}

writeFileSync(CSS, cssOrig, 'utf8');
utimesSync(CSS, cssStat.atime, cssStat.mtime);
console.log('已恢复');
