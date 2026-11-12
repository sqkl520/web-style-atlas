# Isolation runner v4 -- enforces the Deny ACE instead of trusting it.
#
# v3's remaining defect, measured on attempt #4:
#   Several unrelated blind runs (S04, S08, S13, S15, S18, S21, S22, S29) were live
#   at the same time, and each one ends with `icacls $repo /remove:d <its user>`.
#   A concurrent _blindbox-run.ps1 for S18 (PID 34880) was in its teardown while my
#   S99 run was starting, and the ACL listing came back with NO ClaudeBlindBox2 entry
#   at all while the agent was already running. That is the same breach as attempt #2:
#   the ACE is process-global state, and whoever tears down last wins.
#   Attempt #4 is discarded.
#
# v4 therefore does two things v3 did not:
#   (a) after setting the deny, re-read the ACL and refuse to launch unless the ACE
#       is actually present for this account (verify-before-use, not set-and-hope);
#   (b) during the wait, re-read it every poll and RE-APPLY the deny if a concurrent
#       run removed it, printing every repair. The ACE is cheap to re-assert and
#       re-asserting it is idempotent.
#   (c) at collection time the child is killed BEFORE the deny is lifted, so the
#       run never ends with an unguarded agent (that happened on attempt #3).
#   (d) exit is still decided by process life, never by stream quiet (attempt #1).
#
# Usage:
#   powershell -File _blindbox-run4.ps1 -TaskDir C:\tmp\bb\S99 -OutFile C:\tmp\bb\S99\out.html `
#       -User ClaudeBlindBox2 -Pass 'BlindRun-2026-tmp!' -TimeoutSec 10800
param(
    [Parameter(Mandatory=$true)][string]$TaskDir,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [string]$User = 'ClaudeBlindBox',
    [string]$Pass = 'BlindRun-2026-tmp!',
    [int]$TimeoutSec = 10800
)

$ErrorActionPreference = 'Continue'
$sbHome = if ($User -eq 'ClaudeBlindBox2') { 'C:\tmp\bb-home2' } else { 'C:\tmp\bb-home' }
$repo = 'D:\Web\style'

function Test-Deny {
    $out = icacls $repo 2>&1 | Out-String
    return ($out -match [regex]::Escape($User) -and $out -match '\(DENY\)')
}
function Set-Deny {
    icacls $repo /deny "${User}:(OI)(CI)(RX)" 2>$null | Out-Null
}

Write-Host ("[0/7] user=" + $User + " home=" + $sbHome)

Write-Host '[1/7] preparing sandbox HOME'
if (-not (Test-Path "$sbHome\.claude")) { New-Item -ItemType Directory -Path "$sbHome\.claude" -Force | Out-Null }
Copy-Item 'C:\Users\Administrator\.claude\settings.json' "$sbHome\.claude\settings.json" -Force
Copy-Item 'C:\Users\Administrator\.claude.json' "$sbHome\.claude.json" -Force
icacls $sbHome /grant "${User}:(OI)(CI)(M)" /T | Out-Null
icacls $TaskDir /grant "${User}:(OI)(CI)(M)" /T | Out-Null
icacls 'C:\tmp\bb-bin' /grant "${User}:(OI)(CI)(RX)" /T | Out-Null

Write-Host '[2/7] copying runner template'
$runner = Join-Path $TaskDir '_run.ps1'
Copy-Item 'C:\tmp\runner-template.ps1' $runner -Force
icacls $runner /grant "${User}:(RX)" | Out-Null

$stream = Join-Path $TaskDir 'stream.jsonl'
Remove-Item $stream, (Join-Path $TaskDir 'stderr.txt') -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $TaskDir -Filter '*.html' -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host '[3/7] denying repo access (verified)'
Set-Deny
if (-not (Test-Deny)) {
    Write-Host 'FATAL: deny ACE did not stick; refusing to launch an unprotected agent'
    exit 2
}
Write-Host '  deny ACE verified present'

Write-Host '[4/7] launching scheduled task'
$taskName = 'BlindBox_' + ([guid]::NewGuid().ToString('N').Substring(0,6))
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$action = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`" `"$sbHome`" `"$TaskDir`""
schtasks /Create /TN $taskName /TR $action /SC ONCE /ST 23:59 /RU $User /RP $Pass /RL LIMITED /F | Out-Null
schtasks /Run /TN $taskName 2>&1 | Out-Null
$launchedAt = Get-Date

Write-Host "[5/7] waiting up to ${TimeoutSec}s; re-asserting the deny every poll"
$runnerPattern = [regex]::Escape($runner)
$sawRunner = $false
$goneTicks = 0
$repairs = 0
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 20
    $cur = 0
    if (Test-Path $stream) { $cur = (Get-Item $stream).Length }
    # (b) the ACE is shared state; another run's teardown can remove ours mid-flight
    if (-not (Test-Deny)) {
        Set-Deny
        $repairs++
        Write-Host ('  :: DENY WAS MISSING -- re-applied (repair #' + $repairs + ')')
        if (-not (Test-Deny)) { Write-Host '  :: FATAL: could not restore deny' }
    }
    $runnerAlive = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match $runnerPattern }).Count -gt 0
    if ($runnerAlive) { $sawRunner = $true; $goneTicks = 0 }
    elseif ($sawRunner) { $goneTicks++ }
    $exited = ($sawRunner -and -not $runnerAlive -and $goneTicks -ge 2)
    Write-Host ("  runner=" + $runnerAlive + " stream=" + $cur + "B exited=" + $exited + " denyRepairs=" + $repairs)
    if ($exited) { Write-Host 'runner exited'; break }
}
if (-not $sawRunner) { Write-Host 'WARN: never observed the _run.ps1 process; collecting whatever exists' }
$elapsed = [int]((Get-Date) - $launchedAt).TotalSeconds
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

Write-Host '[6/7] collect (kill the child first if the wait ended on timeout)'
# (c) never end a run with a live, unguarded agent
$still = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $runnerPattern })
if ($still.Count -gt 0) {
    Write-Host ('TIMEOUT: runner still alive (' + $still.Count + '); killing before collecting')
    foreach ($s in $still) {
        Get-CimInstance Win32_Process -Filter ("ParentProcessId=" + $s.ProcessId) -ErrorAction SilentlyContinue |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        Stop-Process -Id $s.ProcessId -Force -ErrorAction SilentlyContinue
    }
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
