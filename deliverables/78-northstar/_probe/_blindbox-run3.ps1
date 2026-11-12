# Isolation runner v3 -- same mechanism as v1, but (a) the exit criterion is
# process life instead of file quiet, and (b) the sandbox account is a parameter.
#
# Why v3 exists, all three reasons measured (not theoretical):
#
#  1) v1 decides "no output" when stream.jsonl stops growing for 15 polls (300 s).
#     In S99 attempt #1 the model went into a long reasoning stretch at 23:45 and
#     the stream sat frozen at 13016 bytes for five minutes. v1 printed
#     'settled (idle, no out.html)' + 'NO_HTML_FOUND' and removed the deny ACE
#     while claude.exe was still running (the stream later reached 2.7 MB /
#     43,892 estimated thinking tokens, still with no Write). False negative,
#     and isolation released early. Attempt #1 is discarded.
#
#  2) stderr.txt cannot be used as a liveness signal: the runner template writes
#     'PID:' via Add-Content to a file Start-Process already holds through
#     -RedirectStandardError, so it stays 0 bytes (verified). Both self-reported
#     markers ('PID:', 'EXITED code=') never land. So v3 watches the process.
#
#  3) The shared account is the real hazard. Several blind runs (S04, S08, S13,
#     S15, S18, S21, S22, S29 ...) were live at the same time. Each runner ends
#     with `icacls /remove:d ClaudeBlindBox`, which removes the ACE for *every*
#     run of that account, not just its own. Observed directly: during S99
#     attempt #2 the ACE was gone while 32260/64472 were still running -- that
#     attempt had no isolation and is discarded too. So v3 takes -User, and S99
#     uses ClaudeBlindBox2, which no other run uses.
#
# Usage:
#   powershell -File _blindbox-run3.ps1 -TaskDir C:\tmp\bb\S99 -OutFile C:\tmp\bb\S99\out.html `
#       -User ClaudeBlindBox2 -Pass 'BlindRun-2026-tmp!' -TimeoutSec 2400
param(
    [Parameter(Mandatory=$true)][string]$TaskDir,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [string]$User = 'ClaudeBlindBox',
    [string]$Pass = 'BlindRun-2026-tmp!',
    [int]$TimeoutSec = 2400
)

$ErrorActionPreference = 'Continue'
$sbHome = if ($User -eq 'ClaudeBlindBox2') { 'C:\tmp\bb-home2' } else { 'C:\tmp\bb-home' }
$repo = 'D:\Web\style'

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

# Clear leftovers so the process criterion cannot be satisfied by a stale run.
$stream = Join-Path $TaskDir 'stream.jsonl'
Remove-Item $stream, (Join-Path $TaskDir 'stderr.txt') -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $TaskDir -Filter '*.html' -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host '[3/7] denying repo access'
icacls $repo /deny "${User}:(OI)(CI)(RX)" | Out-Null

Write-Host '[4/7] launching scheduled task'
$taskName = 'BlindBox_' + ([guid]::NewGuid().ToString('N').Substring(0,6))
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$action = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`" `"$sbHome`" `"$TaskDir`""
schtasks /Create /TN $taskName /TR $action /SC ONCE /ST 23:59 /RU $User /RP $Pass /RL LIMITED /F | Out-Null
schtasks /Run /TN $taskName 2>&1 | Out-Null
$launchedAt = Get-Date

Write-Host "[5/7] waiting up to ${TimeoutSec}s for the _run.ps1 process to exit"
$runnerPattern = [regex]::Escape($runner)
$sawRunner = $false
$goneTicks = 0
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 20
    $cur = 0
    if (Test-Path $stream) { $cur = (Get-Item $stream).Length }
    $runnerAlive = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match $runnerPattern }).Count -gt 0
    if ($runnerAlive) { $sawRunner = $true; $goneTicks = 0 }
    elseif ($sawRunner) { $goneTicks++ }
    $exited = ($sawRunner -and -not $runnerAlive -and $goneTicks -ge 2)
    Write-Host ("  runner=" + $runnerAlive + " saw=" + $sawRunner + " stream=" + $cur + "B exited=" + $exited)
    if ($exited) { Write-Host 'runner exited'; break }
}
if (-not $sawRunner) { Write-Host 'WARN: never observed the _run.ps1 process; collecting whatever exists' }
$elapsed = [int]((Get-Date) - $launchedAt).TotalSeconds
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

Write-Host '[6/7] collect'
# Timeout is not failure, but it is also not permission to end the run.
# Attempt #3 hit the 2400 s cap while the agent was still alive and the deny was
# removed anyway -- an unprotected agent left running. If the runner is still up
# at collection time, kill it first, then collect, then lift the deny.
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
Write-Host ('deny removed; elapsed=' + $elapsed + 's; out=' + $found)
