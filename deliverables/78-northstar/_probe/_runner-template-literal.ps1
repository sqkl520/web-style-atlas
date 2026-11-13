# ============================================================================
#  CURRENT RUNNER TEMPLATE -- the only one in use.
#
#  _make-runner.ps1 copies this to C:\tmp\runner-template.ps1, and
#  _blindbox-run.ps1 uses that copy to generate each run's _run.ps1.
#
#  Change argument passing ONLY in this file. After changing it, run:
#      powershell -File deliverables/78-northstar/_probe/_argprobe.ps1
#  which prints the argv the child process actually received. That is the only
#  direct proof that the prompt was not split on its spaces.
#      node deliverables/78-northstar/_probe/_evidence-gate.mjs --selftest
#  proves the blind-test evidence gate still fires.
#
#  NOTE: keep this file ASCII-only. PowerShell 5.1 reads BOM-less files as the
#  system codepage (GBK here) and Chinese comments break parsing -- that is
#  exactly what happened to _runner-template2.ps1 (historical, see its header).
# ============================================================================
$ProgressPreference = "SilentlyContinue"
$ErrorActionPreference = "Continue"
$home_ = $args[0]
$work_ = $args[1]
$log = Join-Path $work_ "stream.jsonl"
$errLog = Join-Path $work_ "stderr.txt"
"START " + (Get-Date -Format o) | Set-Content -Path $log -Encoding utf8

# PATH must include the real system dirs, or claude's internal PowerShell calls fail
# with "pwsh timed out after 5000ms" and the agent cannot even list a directory.
$env:PATH = "C:\tmp\bb-bin;" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
$env:HOME = $home_
$env:USERPROFILE = $home_
$env:ANTHROPIC_API_KEY = "PROXY_MANAGED"
$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:15721"
$env:CLAUDE_CODE_EFFORT_LEVEL = "medium"
$env:TEMP = $work_
$env:TMP = $work_
Set-Location $work_

$msg = "Read task.txt in this directory, then write the finished page to out.html with the Write tool. Do not over-analyze: read the task once, then write out.html in a single Write call. It must be a complete standalone HTML file. Reply with one short sentence afterwards."

# CRITICAL: -ArgumentList with an ARRAY splits a multi-word prompt on its spaces.
# claude then receives only the first word ("Read") and silently drops the rest.
# Measured 2026-11-13: "lastPrompt":"Read" in the sandbox transcript, and the model's
# own words: 'The user just said "Read". That is a minimal message. The instruction
# "Read" is ambiguous.' Build ONE already-quoted string instead.
#
# But hand-writing '-p "' + $msg + '"' is NOT enough -- measured 2026-11-14, three ways:
#   1. a double quote inside $msg closes the argument early and is silently DELETED.
#      Prompt 'say ALPHA"BETA"GAMMA' arrived at the model as 'say ALPHABETAGAMMA'.
#      Every production task.txt in this repo contains <img src="...">, so this is live.
#   2. a $msg ending in a backslash escapes the closing quote; the rest of the flags
#      are swallowed into the prompt ('write to C:\tmp\out\' ate ' --model opus').
#   3. newlines happen to survive, but nothing else about the naive form is safe.
# Quote-Arg applies the documented Windows CommandLineToArgvW rule (this is the same
# transform .NET's ProcessStartInfo.ArgumentList and the C runtime use). Verified
# byte-exact on: plain text, internal quotes, trailing backslash, backslash+quote,
# multi-line, and the real 1959-char S01 task.txt.
function Quote-Arg([string]$s) {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    $bs = 0
    foreach ($ch in $s.ToCharArray()) {
        if ($ch -eq '\') { $bs++; continue }
        if ($ch -eq '"') { [void]$sb.Append(('\' * ($bs * 2 + 1))); [void]$sb.Append('"'); $bs = 0; continue }
        if ($bs -gt 0) { [void]$sb.Append(('\' * $bs)); $bs = 0 }
        [void]$sb.Append($ch)
    }
    if ($bs -gt 0) { [void]$sb.Append(('\' * ($bs * 2))) }   # trailing run must not eat the closing quote
    [void]$sb.Append('"')
    return $sb.ToString()
}

$argLine = '-p ' + (Quote-Arg $msg) + ' --model opus --permission-mode acceptEdits --output-format stream-json --verbose'

Add-Content -Path (Join-Path $work_ "runner.log") -Value ("ARGS: " + $argLine) -Encoding utf8

# Note: Start-Process takes an exclusive handle on -RedirectStandardError, so a later
# Add-Content to that same file silently fails and it stays 0 bytes. Keep lifecycle
# notes in runner.log instead.
$proc = Start-Process -FilePath "C:\tmp\bb-bin\claude.exe" -ArgumentList $argLine -WorkingDirectory $work_ -RedirectStandardOutput $log -RedirectStandardError $errLog -NoNewWindow -PassThru
Add-Content -Path (Join-Path $work_ "runner.log") -Value ("PID:" + $proc.Id + " at " + (Get-Date -Format o)) -Encoding utf8
$proc.WaitForExit()
Add-Content -Path (Join-Path $work_ "runner.log") -Value ("EXITED code=" + $proc.ExitCode + " at " + (Get-Date -Format o)) -Encoding utf8
