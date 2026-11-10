import { readFileSync } from 'node:fs';
const t = readFileSync('prototypes/_selection/app.js', 'utf8');
for (const needle of ['parts', 'field-fold', 'prompt-fill']) {
  const i = t.indexOf('class="' + needle);
  console.log('\n===== ' + needle + ' @char ' + i);
  console.log(i < 0 ? '(not found)' : t.slice(Math.max(0, i - 400), i + 500));
}
