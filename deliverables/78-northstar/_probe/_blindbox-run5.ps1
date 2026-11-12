# Isolation runner v5 -- watches the AGENT pid, not the wrapper, and guards the ACE.
#
# Four defects were measured on real runs before this version. Every one is a
# criterion bug, not a model bug, and each wasted a full attempt:
#
#  #1 exit criterion (v1, _blindbox-run.ps1): "stream.jsonl unchanged for 300 s => no
#     output". Attempt #1 went into a long reasoning stretch, the stream froze at
#     13016 B for five minutes, and the run was declared NO_HTML_FOUND while the agent
#     was alive (it later reached 2.7 MB / 43,892 thinking tokens).
#
#  #2 shared-account teardown: every runner ends with `icacls $repo /remove:d <user>`,
#     which removes the ACE for ALL runs of that account. With S04/S08/S13/S18/S29
#     live in parallel, S99 lost its deny mid-flight (verified: the ACL listing had no
#     ClaudeBlindBox2 entry while the agent was running).
#
#  #3 timeout path (v3): on hitting the cap the runner removed the deny without
#     first stopping the child, leaving a live unguarded agent.
#
#  #4 wrapper-lived-shorter-than-agent (v4, measured at 900 s): the scheduled task's
#     powershell.exe (_run.ps1) finished while claude.exe kept running, so a
#     wrapper-based criterion again reported "exited" too early. claude.exe is the
#     real worker; the wrapper is just its parent.
#
# v5 therefore:
#   - writes the agent PID to <TaskDir>\agent.pid from the runner template
#     (stderr.txt cannot carry it: Add-Content to a -RedirectStandardError target
#      fails silently -- verified, it stays 0 bytes);
#   - treats "agent.pid has an EXITED line" or "that PID is gone" as the only exit
#     signal, and never looks at stream quiet;
#   - verifies the deny after setting it, and re-asserts it every poll if some other
#     run's teardown removed it, printing each repair;
#   - on timeout, kills the agent PID (and wrapper) BEFORE lifting the deny;
#   - uses a per-run account (ClaudeBlindBox2) that no other run shares.
param(
    [Parameter(Mandatory=$true)][string]$TaskDir,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [string]$User = 'ClaudeBlindBox2',
    [string]$Pass = 'BlindRun-2026-tmp!',
    [int]$TimeoutSec = 10800
)

$ErrorActionPreference = 'Continue'
$sbHome = if ($User -eq 'ClaudeBlindBox2') { 'C:\tmp\bb-home2' } else { 'C:\tmp\bb-home' }
$repo = 'D:\Web\style'
$template = 'C:\tmp\runner-template2.ps1'

function Test-Deny {
    $out = icacls $repo 2>&1 | Out-String
    return ($out -match [regex]::Escape($User) -and $out -match '\(DENY\)')
}
function Set-Deny { icacls $repo /deny "${User}:(OI)(CI)(RX)" 2>$null | Out-Null }

Write-Host ("[0/7] user=" + $User + " home=" + $sbHome + " template=" + $template)
if (-not (Test-Path $template)) { Write-Host 'FATAL: runner template missing'; exit 2 }

Write-Host '[1/7] preparing sandbox HOME'
if (-not (Test-Path "$sbHome\.claude")) { New-Item -ItemType Directory -Path "$sbHome\.claude" -Force | Out-Null }
Copy-Item 'C:\Users\Administrator\.claude\settings.json' "$sbHome\.claude\settings.json" -Force
Copy-Item 'C:\Users\Administrator\.claude.json' "$sbHome\.claude.json" -Force
icacls $sbHome /grant "${User}:(OI)(CI)(M)" /T | Out-Null
icacls $TaskDir /grant "${User}:(OI)(CI)(M)" /T | Out-Null
icacls 'C:\tmp\bb-bin' /grant "${User}:(OI)(CI)(RX)" /T | Out-Null

Write-Host '[2/7] copying runner template'
$runner = Join-Path $TaskDir '_run.ps1'
Copy-Item $template $runner -Force
icacls $runner /grant "${User}:(RX)" | Out-Null

$stream = Join-Path $TaskDir 'stream.jsonl'
$pidFile = Join-Path $TaskDir 'agent.pid'
Remove-Item $stream, (Join-Path $TaskDir 'stderr.txt'), $pidFile -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $TaskDir -Filter '*.html' -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host '[3/7] denying repo access (verified)'
Set-Deny
if (-not (Test-Deny)) { Write-Host 'FATAL: deny ACE did not stick; refusing to launch'; exit 2 }
Write-Host '  deny ACE verified present'

Write-Host '[4/7] launching scheduled task'
$taskName = 'BlindBox_' + ([guid]::NewGuid().ToString('N').Substring(0,6))
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$action = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`" `"$sbHome`" `"$TaskDir`""
schtasks /Create /TN $taskName /TR $action /SC ONCE /ST 23:59 /RU $User /RP $Pass /RL LIMITED /F | Out-Null
schtasks /Run /TN $taskName 2>&1 | Out-Null
$launchedAt = Get-Date

Write-Host "[5/7] waiting up to ${TimeoutSec}s for agent.pid to report EXITED / disappear"
$agentPid = 0
$sawPid = $false
$goneTicks = 0
$repairs = 0
$exited = $false
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 20
    $cur = 0
    if (Test-Path $stream) { $cur = (Get-Item $stream).Length }
    if (-not (Test-Deny)) {
        Set-Deny
        $repairs++
        Write-Host ('  :: DENY WAS MISSING -- re-applied (repair #' + $repairs + ')')
    }
    if (-not $sawPid -and (Test-Path $pidFile)) {
        $raw = (Get-Content $pidFile -Raw -ErrorAction SilentlyContinue)
        if ($raw -match '(?m)^(\d+)') { $agentPid = [int]$Matches[1]; $sawPid = $true }
    }
    if ($sawPid) {
        if (Test-Path $pidFile) {
            $raw = (Get-Content $pidFile -Raw -ErrorAction SilentlyContinue)
            if ($raw -match 'EXITED') { $exited = $true }
        }
        if (-not (Get-Process -Id $agentPid -ErrorAction SilentlyContinue)) {
            $goneTicks++
            if ($goneTicks -ge 2) { $exited = $true }
        } else { $goneTicks = 0 }
    }
    Write-Host ("  pid=" + $agentPid + " stream=" + $cur + "B exited=" + $exited + " denyRepairs=" + $repairs)
    if ($exited) { Write-Host 'agent exited'; break }
}
if (-not $sawPid) { Write-Host 'WARN: agent.pid never appeared; collecting whatever exists' }
$elapsed = [int]((Get-Date) - $launchedAt).TotalSeconds
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

Write-Host '[6/7] collect (stop the agent BEFORE lifting the deny)'
if (-not $exited) {
    Write-Host 'TIMEOUT: agent still alive; stopping it'
    if ($agentPid) { Stop-Process -Id $agentPid -Force -ErrorAction SilentlyContinue }
    $runnerPattern2 = [regex]::Escape($runner)
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match $runnerPattern2 } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 5
}
$cand = @('out.html', 'index.html') | ForEach-Object { Join-Path $TaskDir $_ } | Where-Object { Test-Path $_ }
if (-not $cand) {
    $cand = @(Get-ChildItem -Path $TaskDir -Filter '*.html' -File -ErrorAction SilentlyContinue |
              Sort-Object Length -Descending | Select-Object -First 1 -ExpandProperty FullName)
}
$found = $false
if ($cand) {
    $src = $cand[0]
    Copy-Item $src $OutFile -Force
    Write-Host ('OUT_OK src=' + (Split-Path $src -Leaf) + ' bytes=' + (Get-Item $OutFile).Length + ' elapsed=' + $elapsed + 's')
    $found = $true
} else {
    Write-Host ('NO_HTML_FOUND elapsed=' + $elapsed + 's')
}

Write-Host '[7/7] removing deny'
icacls $repo /remove:d $User 2>$null | Out-Null
Write-Host ('deny removed; elapsed=' + $elapsed + 's; out=' + $found + '; repairs=' + $repairs)
