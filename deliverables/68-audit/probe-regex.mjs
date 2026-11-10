// Final verification batch: regex-level false positives + remaining structural questions.
import { readFileSync } from 'node:fs';

const out = {};

// 1. Does the h-screen regex fire on `max-height: 100vh`?  (rule: /\bh-screen\b|height\s*:\s*100vh/)
const hScreen = /\bh-screen\b|height\s*:\s*100vh/;
const line220 = readFileSync('prototypes/_selection/style.css', 'utf8').split(/\r?\n/)[219];
out.hScreen = {
  line: line220.trim(),
  regexMatches: hScreen.test(line220),
  matchText: (line220.match(hScreen) || [])[0],
  isMaxHeightNotHeight: /max-height\s*:/.test(line220),
  note: 'the regex has no left boundary, so max-height:100vh is counted as height:100vh',
};

// 2. numbering regex vs the app.js:467 line
const numberingStatic = />\s*[(\[]?0[1-9][)\]]?\.?\s*<|["'`]\s*0[1-9]\s*["'`]|decimal-leading-zero|>\s*(Step|Phase|No\.?|Chapter)\s?0?\d\s*</i;
const line467 = readFileSync('prototypes/_selection/app.js', 'utf8').split(/\r?\n/)[466];
out.numbering = {
  line: line467.trim(),
  startsWithLineComment: /^\s*\/\//.test(line467),
  regexMatches: numberingStatic.test(line467),
  matchText: (line467.match(numberingStatic) || [])[0],
};

// 3. emoji regex vs an emoji inside a block comment that does NOT start with a comment marker
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u;
const cssLine = readFileSync('prototypes/_selection/style.css', 'utf8').split(/\r?\n/)[1107];
out.emoji = {
  line: cssLine.trim().slice(0, 80),
  regexMatches: emojiRe.test(cssLine),
  lintGuardWouldSkip: /^\s*(\/\/|\/\*|\*|<!--)/.test(cssLine),
  guardSkippedByLintLine80: /^\s*(\/\/|\/\*|\*|import |@import|<!--)/.test(cssLine),
};

// 4. M03 work list structure
const m03 = readFileSync('templates/M03-bold-creator/index.html', 'utf8');
out.m03work = {
  olCount: (m03.match(/<ol\b/g) || []).length,
  ulCount: (m03.match(/<ul\b/g) || []).length,
  workLiSnippet: (m03.match(/<ol[^>]*>[\s\S]{0,120}/) || [''])[0].replace(/\n/g, ' ').slice(0, 120),
  secLabelSnippet: (m03.match(/<p class="sec-label">[\s\S]{0,80}/) || [''])[0].replace(/\n/g, ' '),
};

// 5. does anything in _selection use data-ui (the runtime escape hatch)?
const files = ['prototypes/_selection/index.html', 'prototypes/_selection/app.js', 'prototypes/_selection/style.css', 'prototypes/_selection/wizard.html'];
out.dataUi = files.map((f) => {
  const t = readFileSync(f, 'utf8');
  return { f, count: (t.match(/data-ui/g) || []).length };
});

// 6. how many static outlined-box hits are `border:1px solid` inside generated HTML strings?
const app = readFileSync('prototypes/_selection/app.js', 'utf8').split(/\r?\n/);
out.appInlineBorders = [266, 671].map((i) => ({
  line: i + 1,
  isGeneratedHtmlString: /cssText|return '<button|style=/.test(app[i]),
  snippet: app[i].trim().slice(0, 120),
}));

console.log(JSON.stringify(out, null, 1));
