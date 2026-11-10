import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style/prototypes';
const dirs = fs.readdirSync(ROOT).filter(d => /^S\d\d-/.test(d)).sort();
const out = [];
for (const d of dirs) {
  const rp = path.join(ROOT, d, '.inspect', 'report.json');
  if (!fs.existsSync(rp)) { out.push({ dir: d, missing: true }); continue; }
  let j;
  try { j = JSON.parse(fs.readFileSync(rp, 'utf8')); } catch (e) { out.push({ dir: d, parseError: String(e) }); continue; }
  const vps = {};
  for (const v of j.viewports || []) {
    const m = v.metrics || {};
    vps[v.width] = {
      screens: v.screens,
      filled: v.filled,
      pageHeight: m.page?.height,
      words: m.page?.words,
      horizontalOverflow: m.page?.horizontalOverflow,
      overflowCulprits: m.page?.overflowCulprits,
      brokenImages: m.page?.brokenImages,
      realPictures: m.page?.realPictures,
      uiPictures: m.page?.uiPictures,
      headingCount: m.headingSummary?.count,
      maxLines: m.headingSummary?.maxLines,
      over2Lines: m.headingSummary?.over2Lines,
      familyCount: m.type?.familyCount,
      families: m.type?.families,
      notLoaded: m.type?.notLoaded,
      measureChars: m.type?.measureChars,
      monoShare: m.type?.monoShare,
      monoProseShare: m.type?.monoProseShare,
      microLabelShare: m.type?.microLabelShare,
      smallText: m.type?.smallText,
      bodyBg: m.color?.bodyBg,
      textColors: m.color?.textColors,
      lowContrast: m.color?.lowContrast,
      buttons: m.buttons,
      fontsLoaded: m.fontsLoaded,
      sectionBgs: m.color?.sectionBgs,
      motion: v.motion,
      consoleErrors: v.consoleErrors
    };
  }
  out.push({
    dir: d,
    at: j.at,
    allow: j.allow,
    findings: j.findings,
    images: Array.isArray(j.images) ? j.images.length : j.images,
    vps
  });
}
fs.writeFileSync('D:/Web/style/deliverables/64-scheme-quality/reports.json', JSON.stringify(out, null, 1));
console.log('done', out.length);
