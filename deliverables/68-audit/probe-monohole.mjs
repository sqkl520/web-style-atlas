// Why did lint report 0 mono findings in templates when M03 sets monospace on 10 non-code classes?
// Reproduce lint.mjs's selector tracking + its mono exemption (lint.mjs:66, :76).
import { readFileSync } from 'node:fs';

const file = 'templates/M03-bold-creator/style.css';
const lines = readFileSync(file, 'utf8').split(/\r?\n/);
const MONO_RE = /\bfont-mono\b|font-family\s*:[^;{}]*(mono\b|monospace|Courier|Consolas|Menlo|Monaco)|(JetBrains|Geist|IBM\+?Plex|Space|DM|Roboto|Fragment|Azeret|Red\+?Hat|Martian|Commit|Departure|Fira)[+_ ]?Mono|Geist_Mono|GeistMono|Fira[+ ]Code|ui-monospace/i;
let selector = ''; let pending = '';
lines.forEach((line, i) => {
  if (line.includes('{')) { selector = pending + line.slice(0, line.indexOf('{')); pending = ''; }
  else if (!line.includes('}')) pending = (pending + ' ' + line).slice(-300);
  if (line.includes('}') && !line.includes('{')) { selector = ''; pending = ''; }
  const m = line.match(MONO_RE);
  if (!m) return;
  const skipBySelector = /(^|[\s,>+~(])(pre|code|kbd|samp)\b|code/i.test(selector);
  console.log(`line ${i + 1}: ${line.trim().slice(0, 60)}`);
  console.log(`   match        = ${m[0].slice(0, 50)}`);
  console.log(`   selector     = ${selector.trim().slice(0, 110)}`);
  console.log(`   SKIPPED?     = ${skipBySelector}  (lint.mjs:76 exempts a rule whose selector mentions code/kbd/samp/pre)`);
});
