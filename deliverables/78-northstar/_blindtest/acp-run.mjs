#!/usr/bin/env node
/* ACP 盲测客户端（2026-11-05）。
 *
 * 目的：把选型台生成的提示词原样交给 DSH 的 ACP agent，让它在一个**空目录**里
 * 建页面。这是"提示词到底是不是有效交付物"唯一的真验证 —— 前面所有工作
 * （字段覆盖率、防退化、契约豁免）都是间接证据。
 *
 * 为什么走 ACP 而不是别的：
 *   · ChatGPT 在这个环境里用不了；
 *   · DSH 的 acp profile 是官方给自动化用的（"automation-only JSON-RPC stdio"），
 *     它跑的是真 agent（有 fs/shell 工具），不是单纯的 chat completion；
 *   · 它的 stdout 归 ACP 独占，所以可以在管道里干净地读 JSON-RPC。
 *
 * 【协议】newline-delimited JSON-RPC 2.0 over stdio。
 *   → initialize          {protocolVersion:1, clientCapabilities:{...}}
 *   ← {agentInfo, agentCapabilities}
 *   → session/new         {cwd, mcpServers:[]}
 *   ← {sessionId}
 *   → session/prompt      {sessionId, prompt:[{type:"text", text:"..."}]}
 *   ← 若干 session/update 通知（agent 干活的过程），直到 result 返回
 *
 * 【超时】agent 要写文件、可能跑命令，给 10 分钟。超过就杀掉并报"超时"，
 * 不静默当作失败 —— 超时和"做不出来"是两件事。
 *
 * 用法：
 *   node deliverables/78-northstar/_blindtest/acp-run.mjs <Sxx> [--out DIR] [--timeout MS]
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const DSH_HOME = join(homedir(), '.dsh');
const PROFILE = join(DSH_HOME, 'profiles/acp');
const NODE = join(DSH_HOME, 'dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe');
const BIN = join(PROFILE, 'node_modules/@deepseek-ai/dsh/lib/bin.js');

const id = process.argv[2];
if (!id || !/^S\d{2}$/.test(id)) {
  console.error('用法：node acp-run.mjs <Sxx> [--out DIR] [--timeout MS] [--prompt-file FILE]');
  process.exit(2);
}
const argOf = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const OUT = resolve(ROOT, argOf('--out', `deliverables/78-northstar/_blindtest/${id}`));
const TIMEOUT = Number(argOf('--timeout', '600000'));
const STARTED_AT = Date.now();
/* `--prompt-file <路径>`：用指定的提示词文本，而不是从当前代码现生成。
 *
 * 为什么需要：做「同一案、不同提示词」的 A/B 对照。
 * 2026-11-23 想验证「字体来源约束有没有提高概率」，需要同一个案在
 * 有约束/无约束两种提示词下各跑若干次。而原来这个脚本总是从
 * `buildStylePrompt()` 现取 —— 也就是**只能测当前这一版提示词**。
 * 没有这个参数，对照组只能跨案（拿 S21 当 S22 的对照），
 * 而那会引入「案本身不同」这个混淆变量。
 *
 * 用 `git show <commit>:<prompt-copy.js>` 之类的办法造出旧版提示词文本，
 * 存成文件，再用这个参数喂进来。 */
const PROMPT_FILE = argOf('--prompt-file', '');

/* 提示词从选型台现取 —— 不在本文件里另存一份。
   存一份就等于把被测对象复制进测试里，改了那边这边不知道（本仓库反复踩的坑）。 */
function buildPrompt(sid) {
  const src = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
  const win = {};
  // eslint-disable-next-line no-new-func
  new Function('window', src)(win);
  const P = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P);
  const schemes = P.STYLE_PROMPTS && P.STYLE_PROMPTS.schemes;
  const scheme = (win.SCHEMES || []).find((s) => s.id === sid);
  if (!scheme || !schemes) throw new Error('读不到 ' + sid + ' 的数据');
  /* prompt-copy.js 是个 IIFE，要给它 window/document 桩才能跑。
     这里只取 buildStylePrompt 这一个出口 —— 那正是界面上"复制"按钮拿到的同一份文本。 */
  const stubDoc = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
    addEventListener: () => {},
    readyState: 'complete',
    body: { appendChild() {} },
  };
  const g = {
    STYLE_PROMPTS: P.STYLE_PROMPTS, SCHEMES: win.SCHEMES,
    document: stubDoc, location: { href: 'http://x/', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { clipboard: { writeText: async () => {} } },
    history: { replaceState() {} },
    setTimeout, clearTimeout,
  };
  const pcSrc = readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'location', 'localStorage', 'navigator', 'history', 'setTimeout', 'clearTimeout', pcSrc)
    (g, g.document, g.location, g.localStorage, g.navigator, g.history, setTimeout, clearTimeout);
  if (typeof g.buildStylePrompt !== 'function') throw new Error('prompt-copy.js 没有导出 buildStylePrompt');
  /* 测试输入用真实店主会填的东西。
     ⚠️ 这里踩过一次：`biz:'一家修鞋配钥匙的小店'` + `action:'让人打电话约时间'`
     拼出来是「我经营一家修鞋配钥匙的小店。**页面需要让访客让人**打电话约时间。」
     —— 两个"让"叠在一起，是病句。提示词模板是「页面需要让访客{action}」，
     所以 action 必须以动词开头且不能再带"让"。
     这类输入错误会污染盲测结论（模型可能因为句子不通而进入异常行为），
     所以测试数据也要像产品文案一样被检查。 */
  return { text: g.buildStylePrompt(sid, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 }), scheme };
}

const { text: _generated, scheme } = buildPrompt(id);
/* 指定了 --prompt-file 就用它，否则用现生成的。
 * 两者都要写进 _prompt.txt（在 finish 里），这样事后能确认这一轮用的到底是哪份。 */
const PROMPT = PROMPT_FILE
  ? readFileSync(resolve(ROOT, PROMPT_FILE), 'utf8')
  : _generated;
if (PROMPT_FILE) console.log(`[blindtest] 提示词来自文件：${PROMPT_FILE}（不是现生成的）`);
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
/* 提示词**开跑就落盘**，不等 finish()。
 *
 * ⚠️ 2026-11-23 实测：agent 会自己用 fs 工具写 `index.html`，然后进程可能在
 * `finish()` 之前就被回收 —— 于是目录里有产物、却没有 `_prompt.txt`。
 * 而「这份产物是用哪份提示词做的」是事后一切分析的前提
 * （`_font-source-rate.mjs` 就是按提示词 md5 分组的，没提示词就分不进组）。
 *
 * 一句话：产物可能是 agent 写的，提示词必须是我们写的，而且越早越好。 */
writeFileSync(join(OUT, '_prompt.txt'), PROMPT);
/* ⚠️ 不要往 cwd 里放 README 或任何说明文件（2026-11-05 实测）。
 * 我加过一条「这是空目录，不用探索」的 README，本意是降低 agent 卡死率。
 * 结果相反：它引发 glob × 2 → read → 挂住。去掉之后 S19 一次通过。
 * 推测是有文件可读这件事本身让 agent 进入探索模式，而探索之后
 * 它不一定会回到写作。空目录反而更快进入正题。
 * 这条记在这里，免得下一个人（包括我）又想加个说明帮帮它。 */

console.log(`[blinпtest] ${id} ${scheme.cn} → ${OUT}`);
console.log(`[blindtest] 提示词 ${PROMPT.length} 字`);

/* ── 开跑即记账 ──────────────────────────────────────────────────────
 *
 * ⚠️ 2026-11-23 加。台账原来只在 `finish()` 里写，而这一轮实测：
 * 进程猝死时 `finish()` 根本执行不到，于是**跑过但失败了这件事也没记录**。
 * S22-r5 连挂四次，台账里一行都没有 —— 那个「成功率」还是算不出来。
 *
 * 这和 `_acp-events.json` 是同一个病（只在收尾写），修法也一样：
 * **开始时就落一笔，结束时补结果**。
 *
 * 记录用 `phase` 区分：'start' 是开跑时的占位，'end' 是正常收尾。
 * 统计时只看 'end'；只有 'start' 没有对应 'end' 的，就是猝死的那次 ——
 * 这反而是以前完全拿不到的信息。
 */
const LEDGER_PATH = join(ROOT, 'deliverables/78-northstar/_blindtest/_runs.jsonl');
const RUN_KEY = `${id}@${STARTED_AT}`;
try {
  appendFileSync(LEDGER_PATH, JSON.stringify({
    phase: 'start', key: RUN_KEY, id,
    at: new Date(STARTED_AT).toISOString(),
    promptBytes: Buffer.byteLength(PROMPT, 'utf8'),
    promptMd5: createHash('md5').update(PROMPT).digest('hex').slice(0, 8),
    fromFile: !!PROMPT_FILE,
  }) + '\n');
} catch { /* 台账写失败不影响主流程 */ }

/* 让 agent 在 OUT 里干活。cwd 用 OUT —— ACP 的 fs 工具以它为基址。
 *
 * 【为什么要 --patch】profile 的 bundle 层把模型钉死在 deepseek-official，
 * 而那个 provider 余额不足（实测 Insufficient Balance）。patch 把它换成
 * 本机代理（openai-completions 协议，实测可用）。
 * 用 --patch 而不是改 profile 本体：这个替换只对盲测成立，
 * 不该写进用户日常用的配置里。 */
const PATCH = join(ROOT, 'deliverables/78-northstar/_blindtest/acp-blindtest.patch.yml');
const child = spawn(NODE, [BIN, '--profile', 'acp', '--patch', PATCH], {
  cwd: PROFILE,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DSH_HOME,
    /* 代理不校验密钥值，但 pi-ai 的 apiKeyEnv 需要一个非空串才会去调用。
       用 DSH 自己的占位符而不是编一个假 key —— 一旦代理改成要真 key，
       这里会立刻失败而不是静默用错凭证。 */
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || 'PROXY_MANAGED',
  },
});

let buf = '';
let sessionId = null;
let done = false;
const events = [];
const stderr = [];
/* agent 的正文（逐 chunk 累积）。
 * 实测：这个 agent 不一定把 HTML 写进文件 —— 它可能直接在消息里回代码。
 * 两种都要接住：文件落盘走 agent 自己的 fs 工具（我们不管），
 * 消息里的 HTML 由我们提取写盘，否则盲测拿不到产物。 */
let agentText = '';

function send(obj) {
  child.stdin.write(JSON.stringify(obj) + '\n');
}

/* 每收到一个事件就落盘一次 —— 不等 finish()。
 *
 * ⚠️ 2026-11-23 加。原来只在 finish() 里一次性写 `_acp-events.json`，
 * 而实测失败时（进程被上游断开、被系统杀掉）**finish() 根本没机会执行**，
 * 于是目录里空空如也 —— 而我今天在失败提示里写的「看事件文件判断三种形态」
 * 前提就不成立：连文件都没有，形态①②③全都长成同一个样子。
 *
 * 逐条追加的代价是每个事件一次 write，量很小（一次跑通常几十条），
 * 换来的是**进程猝死时也有迹可循**。`appendFileSync` 用同步写，
 * 不依赖事件循环，被杀之前那一条一定能落盘。 */
function persistEvents() {
  try {
    appendFileSync(join(OUT, '_acp-events.jsonl'), JSON.stringify(events[events.length - 1]) + '\n');
  } catch { /* 目录不存在等情况，不影响主流程 */ }
}

function finish(code, note) {
  if (done) return;
  done = true;
  try { child.kill(); } catch { /* 已退出 */ }
  writeFileSync(join(OUT, '_acp-events.json'), JSON.stringify(events, null, 2));
  writeFileSync(join(OUT, '_prompt.txt'), PROMPT);
  if (agentText) writeFileSync(join(OUT, '_agent-output.txt'), agentText);
  /* 从 agent 正文里抠出 HTML 落盘。
   * 判据：优先带 ```html 围栏的块；没有围栏就找第一个 <!DOCTYPE html 到最后一个 </html>。
   * 两种情况都要，因为模型有时带围栏有时不带 —— 只认一种会让一半的盲测"没有产物"，
   * 而实际上产物就在那儿。 */
  let html = '';
  const fenced = agentText.match(/```html\s*\n([\s\S]*?)```/i);
  if (fenced) html = fenced[1];
  else {
    const a = agentText.indexOf('<!DOCTYPE html');
    const b = agentText.lastIndexOf('</html>');
    if (a >= 0 && b > a) html = agentText.slice(a, b + '</html>'.length);
  }
  if (html.trim()) writeFileSync(join(OUT, 'index.html'), html.trim() + '\n');
  if (stderr.length) writeFileSync(join(OUT, '_acp-stderr.txt'), stderr.join(''));
  const hadFile = existsSync(join(OUT, 'index.html'));
  console.log(`[blindtest] ${note}`);
  console.log(`[blindtest] 产物：${hadFile ? (html.trim() ? '从消息提取 index.html' : 'agent 自己写的文件') : '**没有 HTML**'}`);
  /* 失败时明确提示「别删这个目录」。
   *
   * 2026-11-23 加的。这一轮 S10 连续失败三次，每次我都是 `rm -rf` 掉目录重跑，
   * 于是**唯一能区分失败形态的证据被我自己删了**：
   *   ① 会话建立了、上游没吐字   → _acp-events.json 是 []
   *   ② 会话压根没建立           → 连事件文件都没有
   *   ③ 会话建立了、调了工具、然后进程死 → 事件文件里有记录但不完整
   *
   * 三者的处置完全不同（①等窗口 ②查链路 ③查那个案），而删掉目录之后
   * 只剩「失败了」这一个事实。这条提示是为了让下一个人（包括我自己）
   * 在 rm 之前先看一眼。 */
  if (!hadFile) {
    console.log(`[blindtest] ⚠️ 别急着删 ${OUT.replace(/\\/g, '/')}`);
    console.log('[blindtest]    里面的事件文件能区分三种失败形态：');
    console.log('[blindtest]    ① 事件文件是 []            → 会话建了，上游没吐字');
    console.log('[blindtest]    ② 连事件文件都没有          → 会话压根没建立');
    console.log('[blindtest]    ③ 有事件但不完整            → 调了工具后进程死');
  }
  /* 往仓库内追加一行跑批台账。
   *
   * 2026-11-23 加。起因：把 23 次跑批按时间排开、算出「凌晨 10/10、深夜 3/11」
   * 之后十分钟，那些日志被系统清理了，只剩 3 个。而 `%TEMP%` 里的日志
   * **是唯一能回答「成功率是多少」这个问题的材料**。
   * 仓库里已经有一条同类教训（`C:\tmp` 清掉 13 条 stream），这次换了个马甲又踩一遍。
   *
   * 只存统计需要的字段，**不存上游原始输出**：
   *   id / 时间 / 成败 / 耗时 / 产物字节 / 用的哪份提示词
   * 一行约 120 字节，几百次跑批也就几十 KB，可以放心入库。
   *
   * 用 JSONL 而不是 JSON 数组：追加写不会因为进程被杀而破坏已有记录。 */
  try {
    const rec = {
      phase: 'end',
      key: RUN_KEY,
      id,
      at: new Date().toISOString(),
      ok: hadFile,
      code,
      ms: Date.now() - STARTED_AT,
      bytes: hadFile ? statSync(join(OUT, 'index.html')).size : 0,
      note: String(note || '').slice(0, 80),
    };
    appendFileSync(LEDGER_PATH, JSON.stringify(rec) + '\n');
  } catch { /* 台账写失败不该影响主流程 */ }

  /* 完成标记 —— 明确告诉后来者「这份产物已经写完了」。
   *
   * ⚠️ 2026-11-23 加的。起因是一次真实的误判：
   * agent 会**边跑边用 fs 工具写 index.html**，而我在它刚写出第一版时就评分，
   * 读到的是一份 278 行的半成品（图片 4/5、五类里有一项不合格）。
   * 几分钟后再看，同一个文件变成 753 行、五类全过。
   *
   * 也就是说：**目录里有 index.html ≠ 这份产物写完了。**
   * 而这个区别在之前只能靠「等一会儿再看」来规避 —— 那不是机制，是运气。
   *
   * 判据：只有 `finish()` 走完（也就是跑批进程自己认为结束了）才写这个文件。
   * 任何分析脚本（score / repeatability / fallback-chain）都应当先看它，
   * 没有就跳过并注明「产物未完成」。
   *
   * 内容带上耗时与退出码，让人一眼看出这次是正常结束还是超时结束。 */
  try {
    writeFileSync(join(OUT, '_DONE.json'), JSON.stringify({
      at: new Date().toISOString(),
      ms: Date.now() - STARTED_AT,
      code,
      note: String(note || '').slice(0, 200),
      promptMd5: createHash('md5').update(PROMPT).digest('hex').slice(0, 8),
    }, null, 1));
  } catch { /* 同上，不影响主流程 */ }

  process.exit(code);
}

const timer = setTimeout(() => finish(3, `超时 ${TIMEOUT}ms —— agent 没在时限内结束（不是"做不出来"，是没跑完）`), TIMEOUT);

child.stderr.on('data', (d) => stderr.push(String(d)));

child.stdout.on('data', (chunk) => {
  buf += String(chunk);
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }

    /* 初始化握手 */
    if (msg.id === 1 && msg.result) {
      console.log('[acp] initialize ok →', msg.result.agentInfo && msg.result.agentInfo.name);
      send({ jsonrpc: '2.0', id: 2, method: 'session/new', params: { cwd: OUT, mcpServers: [] } });
      continue;
    }
    /* 会话建立 */
    if (msg.id === 2) {
      if (msg.error) { clearTimeout(timer); finish(4, 'session/new 失败：' + JSON.stringify(msg.error)); return; }
      sessionId = msg.result && msg.result.sessionId;
      console.log('[acp] session', sessionId);
      send({
        jsonrpc: '2.0', id: 3, method: 'session/prompt',
        params: { sessionId, prompt: [{ type: 'text', text: PROMPT }] },
      });
      continue;
    }
    /* prompt 结束 */
    if (msg.id === 3) {
      clearTimeout(timer);
      events.push({ kind: 'result', msg }); persistEvents();
      if (msg.error) { finish(5, 'prompt 出错：' + JSON.stringify(msg.error)); return; }
      finish(0, 'prompt 完成：' + JSON.stringify(msg.result));
      return;
    }
    /* agent 的中间通知 */
    if (msg.method) {
      events.push({ kind: 'notify', method: msg.method, params: msg.params }); persistEvents();
      const p = msg.params || {};
      if (msg.method === 'session/update' && p.update && p.update.sessionUpdate) {
        const u = p.update;
        if (u.sessionUpdate === 'tool_call') {
          console.log('  ·', u.title || u.kind || u.toolCallId || 'tool');
        } else if (u.sessionUpdate === 'agent_message_chunk' && u.content && u.content.text) {
          agentText += u.content.text;
          process.stdout.write(u.content.text);
        }
      }
      /* 有些实现要客户端回权限 */
      if (msg.method === 'session/request_permission') {
        /* 一律批准 —— 盲测在空目录里跑，agent 只能碰自己建的文件。
           这是**测试环境**的授权，不是产品行为。 */
        send({ jsonrpc: '2.0', id: msg.id, result: { optionId: 'allow_once' } });
      }
      continue;
    }
  }
});

child.on('error', (e) => { clearTimeout(timer); finish(6, 'spawn 失败：' + e.message); });
child.on('exit', (code) => {
  clearTimeout(timer);
  if (!done) finish(code === 0 ? 0 : 7, '进程退出 code=' + code + (stderr.length ? '；stderr 见 _acp-stderr.txt' : ''));
});

send({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: true, writeTextFile: true } } },
});
