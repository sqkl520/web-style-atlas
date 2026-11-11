import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const d = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'));
console.log('keys:', Object.keys(d).join(' '));
const auth = {};
for (const k of Object.keys(d)) {
  if (/oauth|account|token|key|auth|subscription/i.test(k)) auth[k] = typeof d[k] === 'object' ? '[obj]' : String(d[k]).slice(0, 60);
}
console.log('auth-ish:', JSON.stringify(auth, null, 2));
