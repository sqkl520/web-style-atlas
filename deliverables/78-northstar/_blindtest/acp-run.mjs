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
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const DSH_HOME = join(homedir(), '.dsh');
const PROFILE = join(DSH_HOME, 'profiles/acp');
const NODE = join(DSH_HOME, 'dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe');
const BIN = join(PROFILE, 'node_modules/@deepseek-ai/dsh/lib/bin.js');

const id = process.argv[2];
if (!id || !/^S\d{2}$/.test(id)) {
  console.error('用法：node acp-run.mjs <Sxx> [--out DIR] [--timeout MS]');
  process.exit(2);
}
const argOf = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const OUT = resolve(ROOT, argOf('--out', `deliverables/78-northstar/_blindtest/${id}`));
const TIMEOUT = Number(argOf('--timeout', '600000'));

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

const { text: PROMPT, scheme } = buildPrompt(id);
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
/* ⚠️ 不要往 cwd 里放 README 或任何说明文件（2026-11-05 实测）。
 * 我加过一条「这是空目录，不用探索」的 README，本意是降低 agent 卡死率。
 * 结果相反：它引发 glob × 2 → read → 挂住。去掉之后 S19 一次通过。
 * 推测是有文件可读这件事本身让 agent 进入探索模式，而探索之后
 * 它不一定会回到写作。空目录反而更快进入正题。
 * 这条记在这里，免得下一个人（包括我）又想加个说明帮帮它。 */

console.log(`[blinпtest] ${id} ${scheme.cn} → ${OUT}`);
console.log(`[blindtest] 提示词 ${PROMPT.length} 字`);

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
      events.push({ kind: 'result', msg });
      if (msg.error) { finish(5, 'prompt 出错：' + JSON.stringify(msg.error)); return; }
      finish(0, 'prompt 完成：' + JSON.stringify(msg.result));
      return;
    }
    /* agent 的中间通知 */
    if (msg.method) {
      events.push({ kind: 'notify', method: msg.method, params: msg.params });
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
