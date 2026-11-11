#!/bin/bash
# 干净环境跑一次 claude -p，验证隔离可行
set -u
BOX=/tmp/blindtest
rm -rf "$BOX"; mkdir -p "$BOX/home/.claude" "$BOX/work"
# 只搬认证与必要配置，不搬 projects/sessions/skills —— 那些会让 agent 看到本仓库历史
cp /c/Users/Administrator/.claude/settings.json "$BOX/home/.claude/settings.json"
cp /c/Users/Administrator/.claude.json "$BOX/home/.claude.json"
cd "$BOX/work" || exit 1
env -i \
  PATH="/c/Users/Administrator/.local/bin:/usr/bin:/bin" \
  HOME="$BOX/home" \
  USERPROFILE='C:\tmp\blindtest\home' \
  ANTHROPIC_API_KEY='PROXY_MANAGED' \
  ANTHROPIC_BASE_URL='http://127.0.0.1:15721' \
  CLAUDE_CODE_EFFORT_LEVEL='low' \
  timeout 180 claude -p "只回复两个字：收到" --model haiku 2>&1 | head -20
echo "EXIT:${PIPESTATUS[0]}"
