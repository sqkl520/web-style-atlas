#!/bin/bash
# 两个关键验证：
#  A) 隔离 agent 读 D:/Web/style 会怎样（预期：被沙箱/权限挡住，或至少我们能看到它试图读）
#  B) -p 模式下它能不能 Write 文件（生成侧必须能）
set -u
BOX=/tmp/blindtest2
rm -rf "$BOX"; mkdir -p "$BOX/home/.claude" "$BOX/work"
cp /c/Users/Administrator/.claude/settings.json "$BOX/home/.claude/settings.json"
cp /c/Users/Administrator/.claude.json "$BOX/home/.claude.json"
cd "$BOX/work" || exit 1

echo "########## A) 只读一个绝对路径（仓库里的文件）"
env -i \
  PATH="/c/Users/Administrator/.local/bin:/usr/bin:/bin" \
  HOME="$BOX/home" USERPROFILE='C:\tmp\blindtest2\home' \
  ANTHROPIC_API_KEY='PROXY_MANAGED' ANTHROPIC_BASE_URL='http://127.0.0.1:15721' \
  CLAUDE_CODE_EFFORT_LEVEL='low' \
  timeout 180 claude -p "用 Read 工具读文件 D:/Web/style/prototypes/_selection/data.js 的前 5 行并原样贴出来。如果读不到，只回复：BLOCKED" \
  --model haiku --permission-mode acceptEdits 2>&1 | head -30
echo "----A EXIT:${PIPESTATUS[0]}"

echo "########## B) 让它写一个文件"
env -i \
  PATH="/c/Users/Administrator/.local/bin:/usr/bin:/bin" \
  HOME="$BOX/home" USERPROFILE='C:\tmp\blindtest2\home' \
  ANTHROPIC_API_KEY='PROXY_MANAGED' ANTHROPIC_BASE_URL='http://127.0.0.1:15721' \
  CLAUDE_CODE_EFFORT_LEVEL='low' \
  timeout 180 claude -p "用 Write 工具把字符串 hello-blind 写进 ./probe-out.txt，然后只回复 DONE" \
  --model haiku --permission-mode acceptEdits 2>&1 | head -30
echo "----B EXIT:${PIPESTATUS[0]}"
echo "---- 产物:"
ls -la "$BOX/work/" 2>/dev/null
cat "$BOX/work/probe-out.txt" 2>/dev/null
