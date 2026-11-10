import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9767;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/prototypes/_selection/index.html'; const f = normalize(join(ROOT, p)); if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; } res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const out = {};
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });

const full = await p.send('Accessibility.getFullAXTree', {});
const nodes = full.nodes || [];
const byId = new Map(nodes.map(n => [n.nodeId, n]));

// headings: level, name, ignored, and whether ancestor is the row button
function parentChain(n, depth=0, acc=[]) {
  const parents = nodes.filter(x => (x.childIds || []).includes(n.nodeId));
  if (!parents.length || depth > 8) return acc;
  acc.push(parents[0].role.value + ':' + ((parents[0].name||{}).value||'').slice(0,20));
  return parentChain(parents[0], depth+1, acc);
}
const h3 = nodes.filter(n => n.role && n.role.value === 'heading' && (n.properties||[]).some(pr=>pr.name==='level'&&pr.value.value===3));
out.h3 = { count: h3.length, ignoredCount: h3.filter(n=>n.ignored).length, sample: h3.slice(0,3).map(n=>({ name:(n.name||{}).value, ignored:n.ignored, chain: parentChain(n).slice(0,4) })) };

// role distribution
const roles = {};
nodes.forEach(n => { const r = n.role ? n.role.value : 'none'; roles[r] = (roles[r]||0)+1; });
out.roleCounts = roles;

// Is row content text exposed as StaticText inside the row?
const rowBtns = nodes.filter(n => n.role && n.role.value === 'button' && /^展开 S\d\d/.test((n.name||{}).value||''));
out.rowButtons = { count: rowBtns.length, sampleNames: rowBtns.slice(0,3).map(n=>(n.name||{}).value),
  anyHasDescription: rowBtns.filter(n=>(n.description||{}).value).length,
  childRoleSummary: (() => { const m={}; rowBtns.forEach(btn => (btn.childIds||[]).forEach(id => { const c=byId.get(id); const r=c?c.role.value:'missing'; m[r]=(m[r]||0)+1; })); return m; })() };

// Does the family text appear as a text node with a row-button ancestor?
const fam = nodes.filter(n => (n.name||{}).value && String(n.name.value).includes('苏联构成主义印刷'));
out.family = fam.map(n => ({ role: n.role.value, ignored: n.ignored, chain: parentChain(n).slice(0,5) }));

// list semantics check
out.lists = nodes.filter(n => n.role && ['list','listitem'].includes(n.role.value)).map(n => ({ role:n.role.value, name:(n.name||{}).value, childCount:(n.childIds||[]).length }));

// tabs order: does the row expose press state / does it say "button"?
out.rowIsFocusable = rowBtns.filter(n=>(n.properties||[]).some(pr=>pr.name==='focusable'&&pr.value.value)).length;

// Now: same page with role removed, for comparison
out.contrastTest = await p.eval(`(() => {
  const lis = [...document.querySelectorAll('.row')];
  const before = { listitem: document.querySelectorAll('[role=listitem], li').length };
  lis.forEach(li => li.removeAttribute('role'));
  return before;
})()`);
const full2 = await p.send('Accessibility.getFullAXTree', {});
const n2 = full2.nodes || [];
out.afterRemovingRole = {
  listitem: n2.filter(n=>n.role&&n.role.value==='listitem').length,
  h3: n2.filter(n=>n.role&&n.role.value==='heading'&&(n.properties||[]).some(pr=>pr.name==='level'&&pr.value.value===3)).length,
  staticText: n2.filter(n=>n.role&&n.role.value==='StaticText').length
};
out.beforeRemovingRole = {
  staticText: nodes.filter(n=>n.role&&n.role.value==='StaticText').length,
  listitem: nodes.filter(n=>n.role&&n.role.value==='listitem').length
};

await b.close();
console.log(JSON.stringify(out, null, 1));
server.close();
