#!/bin/bash
# 生成侧端到端可行性验证：一个隔离 agent 能不能只凭提示词做出完整页面。
# 素材是 S31（钟表修理铺），提示词从 prompts.js 的 dna 手工拼成，与真实产品输出同构。
set -u
BOX=/tmp/feasibility
rm -rf "$BOX"; mkdir -p "$BOX/home/.claude" "$BOX/work"
cp /c/Users/Administrator/.claude/settings.json "$BOX/home/.claude/settings.json"
cp /c/Users/Administrator/.claude.json "$BOX/home/.claude.json"
cp /d/Web/style/deliverables/78-northstar/_probe/_feasibility-prompt-S31.txt "$BOX/work/task.txt"
cd "$BOX/work" || exit 1

echo "===== 开始 $(date +%T) ====="
START=$(date +%s)
env -i \
  PATH="/c/Users/Administrator/.local/bin:/usr/bin:/bin" \
  HOME="$BOX/home" USERPROFILE='C:\tmp\feasibility\home' \
  ANTHROPIC_API_KEY='PROXY_MANAGED' ANTHROPIC_BASE_URL='http://127.0.0.1:15721' \
  CLAUDE_CODE_EFFORT_LEVEL='max' \
  timeout 900 claude -p "请读当前目录下的 task.txt，按里面的要求完成工作。只输出必要的最少文字。" \
  --model opus --permission-mode acceptEdits 2>&1 | tail -15
echo "---- EXIT:${PIPESTATUS[0]}  耗时 $(( $(date +%s) - START ))s"

echo "===== 产物 ====="
ls -la "$BOX/work/"
if [ -f "$BOX/work/out.html" ]; then
  echo "===== out.html 大小 / 行数 ====="
  wc -c -l "$BOX/work/out.html"
  echo "===== 前 30 行 ====="
  head -30 "$BOX/work/out.html"
else
  echo "!!!! 没有 out.html"
fi
