// 任务 D 补充：把「集合外色」在 CSS 里的**来源**定位出来，用于评估改原型的风险。
//
// 判定 c 时只知道「这个色出现在页面上」，但修法取决于它是怎么进 CSS 的：
//   var() 变量        —— 改 :root 一处即可，风险低
//   硬编码在规则里     —— 要找到具体规则，可能多处，风险中
//   伪元素/阴影/描边   —— 视觉上细，改动风险低但收益也低
//   图片自身的颜色     —— 改不了 CSS，只能换图（高风险，通常不改）
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';

export function cssSources(id, dir, hexes) {
  const p = join(ROOT, 'prototypes', dir, 'style.css');
  const htmlp = join(ROOT, 'prototypes', dir, 'index.html');
  const css = existsSync(p) ? readFileSync(p, 'utf8') : '';
  const html = existsSync(htmlp) ? readFileSync(htmlp, 'utf8') : '';
  const out = {};
  const lines = css.split(/\n/);
  for (const hex of hexes) {
    const bare = hex.replace('#', '').toLowerCase();
    const re = new RegExp('#' + bare + '\\b', 'i');
    const hits = [];
    // 变量定义
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;
      const declVar = lines[i].match(/(--[\w-]+)\s*:\s*[^;]*$/);
      const selectorCtx = (() => {
        for (let j = i; j >= 0; j--) {
          const mm = lines[j].match(/^([^{}\/][^{}]*)\{/);
          if (mm) return mm[1].trim().slice(0, 70);
        }
        return '';
      })();
      hits.push({ line: i + 1, selector: selectorCtx, varName: declVar ? declVar[1] : null, text: lines[i].trim().slice(0, 110) });
    }
    const inRootVars = hits.filter((h) => h.varName);
    const inRules = hits.filter((h) => !h.varName);
    // 是变量值还是被别处 var() 引用
    const varNames = inRootVars.map((h) => h.varName);
    const referenced = varNames.filter((v) => new RegExp('var\\(\\s*' + v + '\\s*\\)').test(css));
    // 内联在 HTML 里？
    const inHtml = new RegExp('#' + bare + '\\b', 'i').test(html);
    out[hex] = {
      occurrences: hits.length,
      asVariable: inRootVars.length > 0,
      varNames,
      varReferencedCount: referenced.map((v) => ({ v, n: (css.match(new RegExp('var\\(\\s*' + v + '\\s*\\)', 'g')) || []).length })),
      asLiteralRule: inRules.length,
      literalSelectors: [...new Set(inRules.map((h) => h.selector))].slice(0, 6),
      inInlineHtml: inHtml,
      firstHits: hits.slice(0, 4),
      // 改动面评估
      risk: inRootVars.length > 0 && inRules.length === 0 ? 'low'
          : inRules.length <= 3 ? 'medium' : 'high',
    };
  }
  return out;
}
