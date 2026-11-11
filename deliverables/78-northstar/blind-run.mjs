#!/usr/bin/env node
/* 生成侧批量盲测：每案一个完全隔离的 agent，只给提示词，产出 HTML。
 *
 * 为什么必须隔离而不是「派个子 agent 让它别读原型」：
 * 上一轮（Q7）就是这么做的 —— 规则写着「禁止读 prototypes/」，16 个 agent 也真的没读。
 * 但它们全被注入了 MEMORY.md（写着这个仓库是干什么的），
 * 而且答案副本躺在 prototypes/ 之外（56-scratch/head/S17.css 与原型 MD5 相同）。
 * 「按字面遵守了规则」不等于「没看到答案」。
 *
 * 本脚本的隔离是物理的：
 *   1. 临时 HOME（没有 MEMORY.md、没有 projects 历史、没有 skills）
 *   2. 临时 cwd（只有一个 task.txt）
 *   3. --permission-mode 使得仓库路径被真实拒绝（实测原文：
 *      "Claude requested permissions to read from D:\Web\style\README.md, but you haven't granted it yet."）
 *   4. 保留 transcript，用来读实际 served model —— 否则又是「名义模型」
 *
 * ⚠️ 隔离边界要如实说：D:\Web\style 只是被权限挡住，不是物理不可见。
 *    一个足够执着的 agent 仍可能绕。所以报告里不能宣称「绝对盲」。
 *
 * 用法：
 *   node deliverables/78-northstar/blind-run.mjs --ids S01,S07,S31
 *   node deliverables/78-northstar/blind-run.mjs --ids S31 --concurrency 1
 *   node deliverables/78-northstar/blind-run.mjs --prepare-only     # 只生成提示词与工作目录
 *
 * ⚠️ 超时策略（实测定的，不要改回 1500s）：
 *   同一提示词跑两次，第一次 704s 产出 414 行，第二次 28 分钟仍无产出（被人工终止）。
 *   生成任务是开放式的 —— 模型自己决定页面做多长，耗时的方差按倍计。
 *   所以：超时设宽（默认 3600s），且**超时 ≠ 失败**：超时后照样检查 out.html 是否存在，
 *   存在就收下。判断成败看「有没有产出」，不看「跑了多久」。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'deliverables/78-northstar/blind');
const BOX = join(OUT, '_sandbox');

const argv = process.argv.slice(2);
const getArg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : dflt;
};
const PREPARE_ONLY = argv.includes('--prepare-only');
const IDS = getArg('--ids', 'S31').split(',').map((s) => s.trim()).filter(Boolean);
const CONC = Number(getArg('--concurrency', '3'));
const TIMEOUT_S = Number(getArg('--timeout', '3600'));

/* 从 prompts.js 读 DNA。必须用 vm —— prompts.js 是给浏览器写的，顶部没有 export。 */
function loadPrompts() {
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'), c);
  const P = c.window.STYLE_PROMPTS;
  if (!P) throw new Error('prompts.js 里没有 window.STYLE_PROMPTS');
  return P.schemes;
}
/* tone 在 data.js 上，不在 prompts.js 上（index.html 的加载顺序决定了两边都有东西）。 */
function loadSchemes() {
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'), c);
  const W = c.window.SCHEMES;
  if (!W) throw new Error('data.js 里没有 window.SCHEMES');
  return W;
}

/* 提示词拼装。刻意**不复用** prompt-copy.js 的 buildPrompt：
 * 那个函数依赖 window.SCHEMES 与浏览器环境，而且它的输出面向真实用户（含交付说明）。
 * 盲测要的是一份「中性任务书」—— 同等约束，但不要"复制到你的 AI"这类产品话术。
 * ⚠️ 两边必须保持约束一致，否则测的不是产品实际给的东西。这是一处已知的维护风险，
 *    所以这里只从 dna 取**结构化字段**，不自己编任何约束。 */
function buildBlindPrompt(id, dna, tone) {
  const f = dna.fonts || {};
  const line = (arr) => (Array.isArray(arr) && arr.length ? arr.join(' → ') : '');
  const dStack = line(f.displayStack) || f.display || '';
  const bStack = line(f.bodyStack) || f.body || '';
  const h1 = parseFloat(dna.h1SizeAt1440) || 0;
  const body = parseFloat(String(dna.bodySize || '').match(/([\d.]+)px/)?.[1] || '') || 16;
  const ratio = h1 ? Math.round((h1 / body) * 10) / 10 : 0;

  const parts = [
    '你是一个前端开发者。请根据下面的风格描述，写出**一个完整的 HTML 文件**',
    '（内联 CSS，不引用任何外部文件、不用任何 CDN、不用任何图片文件）。',
    '',
    '# 风格描述',
    '',
    tone ? `气质：${tone}。` : '',
    '',
    `这个风格的签名动作：${dna.mechanism || ''}`,
    '',
    '视觉硬约束（逐条执行；配色与字体照此固定）：',
    `1. 配色只用这几个值：${dna.palette || ''}。不新增更多彩色。`,
    dStack ? `2. 字体：标题按这个顺序取第一个可用的：${dStack}（前一个缺字就用下一个）。` : '',
    bStack ? `   正文同理，按序取：${bStack}。` : '',
    `3. 圆角：${dna.radiusBare || dna.radius === '全直角 0' ? '全站一律 0，卡片、按钮、图片、标签全部方角' : dna.radius}。`,
    `4. 阴影：${dna.shadow}。`,
    `5. 线宽只用这几级：${dna.lineWidths}，全站线条都从这几级里取。`,
    ratio
      ? `6. 字号：正文约 ${Math.round(body)}px；最大标题要压到正文的 ${ratio} 倍（约 ${Math.round(h1)}px）。` +
        '比这更小就撑不出这个版式——这是本案最容易被做塌的一处。中间层级你按内容需要分，但**最大那一档必须够大**。'
      : '',
    '',
    '结构约束：',
    dna.risk ? `- 常见失败方式（务必规避）：${dna.risk}` : '',
    dna.reuse ? `- 最难被复用到别处之处：${dna.reuse}` : '',
    '',
    '# 输出要求',
    '',
    '只输出 HTML 代码，写进 `out.html`。不要解释，不要额外文件。',
    '页面要真的是一个能用的网站首页，内容自拟、用中文，不要用占位符文字。',
    '字号、线宽、配色必须严格照上面给的数。',
  ];
  return parts.filter((x) => x !== '').join('\n') + '\n';
}

/* ── 主流程 ─────────────────────────────────────────────────────────── */
const P = loadPrompts();
const W = loadSchemes();
const toneOf = (id) => (W.find((s) => s.id === id)?.tone || '');

mkdirSync(OUT, { recursive: true });
const manifest = [];

for (const id of IDS) {
  const rec = P.find((s) => s.id === id);
  if (!rec) { console.error(`跳过 ${id}：prompts.js 里没有`); continue; }
  const promptText = buildBlindPrompt(id, rec.dna, toneOf(id));
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'task.txt'), promptText);
  manifest.push({ id, promptBytes: Buffer.byteLength(promptText), dnaBytes: JSON.stringify(rec.dna).length });
  console.log(`${id}: 提示词 ${Buffer.byteLength(promptText)} 字节 → ${dir}/task.txt`);
}
writeFileSync(join(OUT, 'manifest-prepare.json'), JSON.stringify(manifest, null, 1));

if (PREPARE_ONLY) {
  console.log(`\n只生成提示词（--prepare-only）。共 ${manifest.length} 案。`);
  process.exit(0);
}

/* 每个并发槽一份独立 sandbox：HOME 不能共享，否则 transcript 会混在一起，
 * 无法判断哪个产出来自哪个 agent、用的哪个 served model。 */
function makeSandbox(tag) {
  const home = join(BOX, tag, 'home');
  const work = join(BOX, tag, 'work');
  mkdirSync(join(home, '.claude'), { recursive: true });
  mkdirSync(work, { recursive: true });
  /* 只搬认证与必要配置。刻意**不搬** projects/ sessions/ skills/ —— 那些会让 agent
   * 看到本仓库历史，盲测就废了。 */
  cpSync(join(homedir(), '.claude/settings.json'), join(home, '.claude/settings.json'));
  cpSync(join(homedir(), '.claude.json'), join(home, '.claude.json'));
  return { home, work };
}

function runOne(id, tag) {
  return new Promise((done) => {
    const { home, work } = makeSandbox(tag);
    cpSync(join(OUT, id, 'task.txt'), join(work, 'task.txt'));
    const t0 = Date.now();
    /* 取证：必须用 --output-format=stream-json。
     *
     * 为什么不能用 transcript：实测确认 `claude -p` 在干净 HOME 里**不写** .claude/projects/，
     * 跑完只剩 settings.json 与 .claude.json。靠读 transcript 判断 served model 会永远返回空。
     *
     * stream-json 里有两处 model 字段，含义不同，必须分开记：
     *   init 事件             "model":"claude-opus-5-5"                    ← 名义
     *   assistant 事件        "model":"deepseek-ai/deepseek-v4.1-flash"    ← 实际服务
     *   result 的 modelUsage  {"claude-opus-5-5":{...costUSD...}}          ← 计费口径
     * 本机实测这三者对不上。只记名义值就是重蹈「名义模型」的覆辙。 */
    execFile('claude', ['-p', '请读当前目录下的 task.txt，按里面的要求完成工作。只输出必要的最少文字。',
      '--model', 'opus', '--permission-mode', 'acceptEdits',
      '--output-format', 'stream-json', '--verbose'],
    {
      cwd: work,
      timeout: TIMEOUT_S * 1000,
      env: {
        PATH: process.env.PATH,
        HOME: home,
        USERPROFILE: home.replace(/\//g, '\\'),
        ANTHROPIC_API_KEY: 'PROXY_MANAGED',
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:15721',
        CLAUDE_CODE_EFFORT_LEVEL: 'max',
      },
      maxBuffer: 64 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      const ms = Date.now() - t0;
      const outHtml = join(work, 'out.html');
      const ok = existsSync(outHtml);
      let bytes = 0;
      if (ok) {
        cpSync(outHtml, join(OUT, id, 'out.html'));
        bytes = readFileSync(join(OUT, id, 'out.html')).length;
      }
      /* 解析 stream-json：逐行 JSON。 */
      const events = [];
      for (const ln of String(stdout || '').split('\n')) {
        const s = ln.trim();
        if (!s.startsWith('{')) continue;
        try { events.push(JSON.parse(s)); } catch { /* 非 JSON 行忽略 */ }
      }
      const init = events.find((e) => e.type === 'system' && e.subtype === 'init');
      const nominal = init?.model || null;
      const served = [...new Set(events
        .filter((e) => e.type === 'assistant')
        .map((e) => e.message?.model)
        .filter(Boolean))];
      const result = events.find((e) => e.type === 'result');
      const usage = result?.usage || {};
      const modelUsage = result?.modelUsage || {};
      writeFileSync(join(OUT, id, 'run.json'), JSON.stringify({
        id, ok, bytes, ms, exit: err?.code ?? 0,
        timedOut: err?.killed ?? false,
        nominalModel: nominal,
        servedModels: served,
        billedUnder: Object.keys(modelUsage),
        tokens: {
          input: usage.input_tokens ?? null,
          output: usage.output_tokens ?? null,
          cacheRead: usage.cache_read_input_tokens ?? null,
          cacheCreate: usage.cache_creation_input_tokens ?? null,
        },
        costUSD: result?.total_cost_usd ?? null,
        numTurns: result?.num_turns ?? null,
        stderrTail: String(stderr || '').slice(-500),
      }, null, 1));
      console.log(`${id}: ${ok ? '✓' : '✗'} ${bytes}B ${(ms / 1000).toFixed(0)}s  ` +
        `名义=${nominal}  实际=${served.join(',') || '?'}  ` +
        `out=${usage.output_tokens ?? '?'}tok  $${result?.total_cost_usd?.toFixed(4) ?? '?'}`);
      done({ id, ok, bytes, ms });
    });
  });
}

/* 简单并发池。不用第三方库——本仓库零依赖。 */
const queue = [...IDS];
const workers = Array.from({ length: Math.min(CONC, queue.length) }, async (_, w) => {
  while (queue.length) {
    const id = queue.shift();
    await runOne(id, `w${w}`);
  }
});
await Promise.all(workers);
console.log('\n全部完成。产物在', OUT);
