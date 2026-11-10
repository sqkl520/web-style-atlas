import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style/prototypes';
const dirs = fs.readdirSync(ROOT).filter(d => /^S\d\d-/.test(d)).sort();

// values from _CURRENT-VALUES.md §1 (background, primary, button-ink) and §2 banned old values
const CV = {
  S01: { bg: '#EFE7D7', primary: null, btn: null, old: ['#F2E8D5'] },
  S02: { bg: '#0B0B0F', primary: null, btn: '#111111', old: ['#0B0B0D'] },
  S03: { bg: '#101A1C', primary: '#13928E', btn: null, old: ['#0E6E6B'] },
  S04: { bg: '#F0E2C8', primary: '#96550F', btn: '#FFFFFF', old: ['#E8871E'] },
  S05: { bg: '#0E100D', primary: null, btn: '#111111', old: ['#0D0F0C'] },
  S06: { bg: '#ECDEC6', primary: '#85572A', btn: null, old: ['#F0E2C8', '#8A5A2B'] },
  S07: { bg: '#E7E7E0', primary: null, btn: null, old: ['#EDE7D9'] },
  S08: { bg: '#120C08', primary: null, btn: '#111111', old: [] },
  S09: { bg: '#F5C842', primary: null, btn: null, old: [] },
  S10: { bg: '#F2EFE8', primary: null, btn: null, old: ['#F4F1EA'] },
  S11: { bg: '#DCDDD2', primary: null, btn: null, old: ['#EDE6D6'] },
  S12: { bg: '#1E2A2E', primary: null, btn: '#111111', old: [] },
  S13: { bg: '#F4E3BE', primary: '#7B612C', btn: null, old: ['#E9E2D2', '#A8843C'] },
  S14: { bg: '#12181D', primary: null, btn: '#111111', old: [] },
  S15: { bg: '#E7EBE9', primary: null, btn: null, old: ['#F1E9DA'] },
  S16: { bg: '#F7EBCF', primary: '#C52C0F', btn: '#FFFFFF', old: ['#F0E7D2', '#E63312'] },
  S17: { bg: '#E1D6BD', primary: '#5A2A50', btn: null, old: ['#E8E0CC', '#2E3F55'] },
  S18: { bg: '#0A0D0A', primary: null, btn: '#111111', old: [] },
  S19: { bg: '#E4DECD', primary: null, btn: null, old: ['#EDE6D4'] },
  S20: { bg: '#FAF3E1', primary: null, btn: null, old: ['#F2EFE6'] },
  S21: { bg: '#E4DCC9', primary: '#924307', btn: null, old: ['#FFEDC7'] },
  S22: { bg: '#DDDAD4', primary: '#565B49', btn: '#FFFFFF', old: ['#666D51'] },
  S23: { bg: '#DCDCC8', primary: '#A8206B', btn: null, old: [] },
  S24: { bg: '#E6EDF2', primary: null, btn: '#FFFFFF', old: [] },
  S25: { bg: '#E8E4DE', primary: '#914A27', btn: '#FFFFFF', old: ['#AB4D25'] },
  S26: { bg: '#D3D1CA', primary: null, btn: null, old: [] },
  S27: { bg: '#E8D7B5', primary: '#0E6258', btn: null, old: ['#0E7264'] },
  S28: { bg: '#0B0D12', primary: '#AF74BE', btn: null, old: ['#1F5FA8'] },
  S29: { bg: '#D9D3C4', primary: '#644F02', btn: '#FFFFFF', old: ['#795F00'] },
  S30: { bg: '#EDEDED', primary: '#007B3F', btn: '#FFFFFF', old: ['#00E676'] }
};
const BANNED = ['Inter', 'Roboto', 'Arial', 'Helvetica', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI'];

const rows = [];
for (const d of dirs) {
  const id = d.slice(0, 3);
  const dir = path.join(ROOT, d);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
  const all = (html + '\n' + css).toLowerCase();
  const cv = CV[id];

  // banned font families inside font-family declarations only
  const fontDecls = [...css.matchAll(/font-family\s*:\s*([^;}]+)/g)].map(m => m[1]);
  const fontDeclText = fontDecls.join(' ; ');
  const bannedHits = BANNED.filter(f => {
    const re = new RegExp('(^|[\\s,;"\'])(' + f.replace(/[-]/g, '\\-') + ')([\\s,;"\']|$)', 'i');
    return re.test(fontDeclText);
  });

  const bgPresent = cv.bg ? all.includes(cv.bg.toLowerCase()) : null;
  const primaryPresent = cv.primary ? all.includes(cv.primary.toLowerCase()) : null;
  const oldHits = cv.old.filter(o => all.includes(o.toLowerCase()));
  const btnPresent = cv.btn ? all.includes(cv.btn.toLowerCase()) : null;

  // error code presence: look for known code patterns in html
  const codeLike = [...new Set((html.match(/\b[A-Z]{2,}[A-Z0-9-]*-\d+\b/g) || []))];

  rows.push({ dir: d, bg: cv.bg, bgPresent, primary: cv.primary, primaryPresent, oldHits, btn: cv.btn, btnPresent, bannedHits, codes: codeLike.slice(0, 6), fontDeclCount: fontDecls.length });
}
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/values-conformance.json', JSON.stringify(rows, null, 1));
for (const r of rows) {
  const flags = [];
  if (r.bgPresent === false) flags.push('BG-MISSING ' + r.bg);
  if (r.primaryPresent === false) flags.push('PRIMARY-MISSING ' + r.primary);
  if (r.oldHits.length) flags.push('OLD-VALUE ' + r.oldHits.join(','));
  if (r.bannedHits.length) flags.push('BANNED-FONT ' + r.bannedHits.join(','));
  console.log(r.dir.padEnd(38) + (flags.length ? flags.join(' | ') : 'ok') + '   codes:' + r.codes.join(','));
}
