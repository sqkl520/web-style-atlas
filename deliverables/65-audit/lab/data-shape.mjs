// Data shape across all 30 schemes (from the frozen snapshot), so the report does not
// generalise from S15/S08 alone.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync('deliverables/65-audit/lab/snapshot/data.js', 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const S = ctx.window.SCHEMES;

const KEYS = ['def', 'family', 'fonts', 'layout', 'landing', 'visuals', 'motion', 'risk', 'scenes', 'quirk'];
const rows = S.map((r) => {
  const missing = KEYS.filter((k) => !r[k]);
  const byKey = Object.fromEntries(KEYS.map((k) => [k, String(r[k] || '').length]));
  const total = KEYS.reduce((a, k) => a + byKey[k], 0);
  return { id: r.id, cn: r.cn, fields: KEYS.length - missing.length, missing, total, byKey, hasLanding: !!r.landing };
});

console.log('schemes:', S.length);
console.log('field count distribution:', JSON.stringify(rows.reduce((a, r) => { a[r.fields] = (a[r.fields] || 0) + 1; return a; }, {})));
console.log('schemes missing layout:', rows.filter((r) => r.missing.includes('layout')).map((r) => r.id).join(' ') || 'none');
console.log('schemes missing landing:', rows.filter((r) => r.missing.includes('landing')).map((r) => r.id).join(' ') || 'none');
console.log('schemes missing anything:', JSON.stringify(rows.filter((r) => r.missing.length).map((r) => [r.id, r.missing])));

const totals = rows.map((r) => r.total).sort((a, b) => a - b);
console.log('\ntotal chars per scheme: min', totals[0], 'median', totals[Math.floor(totals.length / 2)], 'max', totals[totals.length - 1]);
const landing = rows.map((r) => r.byKey.landing).sort((a, b) => a - b);
console.log('landing chars: min', landing[0], 'median', landing[Math.floor(landing.length / 2)], 'max', landing[landing.length - 1]);
const layout = rows.map((r) => r.byKey.layout).sort((a, b) => a - b);
console.log('layout chars: min', layout[0], 'median', layout[Math.floor(layout.length / 2)], 'max', layout[layout.length - 1]);
const fresh = rows.filter((r) => /不适合[:：]/.test(String(S.find((x) => x.id === r.id).scenes || '')));
console.log('schemes whose scenes contain 不适合:', fresh.length + '/30');

// per-field aggregate (the "which fields are long" question)
console.log('\nper-field aggregate across 30:');
for (const k of KEYS) {
  const arr = rows.map((r) => r.byKey[k]).sort((a, b) => a - b);
  console.log(`  ${k.padEnd(8)} min=${String(arr[0]).padStart(4)} median=${String(arr[15]).padStart(4)} max=${String(arr[29]).padStart(4)} total=${arr.reduce((a, b) => a + b, 0)}`);
}
console.log('\ntop 6 by total chars:', rows.slice().sort((a, b) => b.total - a.total).slice(0, 6).map((r) => `${r.id}:${r.total}`).join(' '));
