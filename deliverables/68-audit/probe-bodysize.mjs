import { readFileSync } from 'node:fs';
for (const t of ['sel', 'wizard', 'm01', 'm02', 'm03']) {
  const j = JSON.parse(readFileSync('deliverables/68-audit/inspect-' + t + '.json', 'utf8'));
  for (const v of j.viewports) {
    const ty = v.metrics.type;
    console.log(String(t).padEnd(8), 'w' + v.width, 'body=' + (ty.body ? ty.body.size : 'null'),
      'measure=' + ty.measureChars, 'smallText=' + ty.smallText,
      'monoShare=' + ty.monoProseShare, 'sizes=' + JSON.stringify(ty.sizes));
  }
}
