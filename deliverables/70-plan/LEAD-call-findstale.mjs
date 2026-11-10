import { statSync, utimesSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const mod = await import('file:///D:/Web/style/prototypes/_build/check-stale.mjs?x=' + Date.now()).catch((e) => {
  console.log('import 失败: ' + e.message.slice(0, 200));
  return null;
});
if (mod) {
  console.log('=== 导出的 findStale 基线 ===');
  console.log(JSON.stringify(mod.findStale(), null, 1).slice(0, 800));
}
