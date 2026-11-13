# Real isolation runner: run claude as ClaudeBlindBox with the repo path denied by NTFS ACL.
# Usage: powershell -File _blindbox-run.ps1 -TaskDir C:\tmp\bb\S31 -OutFile C:\tmp\bb\S31\out.html
#
# Why not rely on --permission-mode: the red team proved that switching it to
# bypassPermissions lets the agent read any file. That is a permission prompt, not
# isolation. This uses an NTFS Deny ACE, enforced by the kernel; model requests don't
# change it.
#
# v2 (this file) adds: per-attempt retry on gateway failure, and run.json recording the
# terminal reason. Reason: S98 ran 4.24 hours, ended on `terminal_reason:"api_error"`
# with `api_error_status:524` after 8 exhausted retries, produced nothing, and the
# harness recorded it as an ordinary finish -- so a gateway outage was later read as
# "the model could not do it". The rules that decide retry live in
# _blindbox-verdict.ps1 so they can be unit-tested without launching claude.exe.
param(
    [Parameter(Mandatory=$true)][string]$TaskDir,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [int]$TimeoutSec = 3600,
    # Total attempts = MaxRetries + 1. 2 -> three tries, which covers a 524 storm that
    # lasts tens of minutes without turning a bad gateway day into an infinite loop.
    [int]$MaxRetries = 2,
    [int[]]$RetryDelaySec = @(30, 60),
    # A timeout is not an api_error: claude.exe may still be working. Left off by default.
    [switch]$RetryOnTimeout,
    # Exercise this whole script without launching claude.exe: resolves paths, reads the
    # existing stream in TaskDir, classifies it, writes run.json, prints the verdict.
    # Lets the wiring be tested (and re-tested years from now) at zero cost.
    [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$repo = 'D:\Web\style'
$sbHome = 'C:\tmp\bb-home'
$sandboxExe = 'C:\tmp\bb-bin\claude.exe'

. (Join-Path $PSScriptRoot '_blindbox-verdict.ps1')

$caseId = Split-Path $TaskDir -Leaf
$runJsonPath = Join-Path $TaskDir 'run.json'
$startAll = Get-Date

function Write-AbortRunJson {
    param([string]$Reason, [long]$DurationMs)
    $doc = New-RunJsonDocument -CaseId $caseId -Attempt 0 -TerminalReason 'aborted' -ApiErrorStatus $null `
        -StopReason $null -DurationMs $DurationMs -HasOutput $false -OutputBytes 0 `
        -TerminalReasonRaw $null -Retries @() -OutFile $OutFile -StartedAt $startAll -AbortReason $Reason
    $doc | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $runJsonPath -Encoding UTF8
}

function Get-SandboxWorkerCount {
    # Identity, not counting. This machine runs 22 claude.exe owned by Administrator
    # (the Claude desktop app under WindowsApps). Counting all claude.exe and comparing
    # to a baseline therefore moves for reasons unrelated to the sandbox, and the
    # documented S98 failure was exactly that: declared "worker gone" at 204s while the
    # agent kept working for hours.
    #
    # We match on ExecutablePath == the sandbox copy. Verified readable across accounts
    # without elevation on this box (Get-CimInstance returns the path for another user's
    # process; Get-Process .Path does not).
    $n = 0
    try {
        $procs = @(Get-CimInstance Win32_Process -Filter "Name='claude.exe'" -ErrorAction SilentlyContinue)
        foreach ($p in $procs) {
            $path = $null
            try { $path = $p.ExecutablePath } catch { $path = $null }
            if ($path -and ($path -ieq $sandboxExe)) { $n++ }
        }
    } catch {
        return -1   # signal "identity unavailable" to the caller
    }
    return $n
}

function Set-DenyAce {
    # Re-applied before every attempt, including the first. The previous attempt may
    # have ended after removing it (or been killed before putting it back), and a Deny
    # ACE that is merely assumed to be present is not isolation.
    # Measured: applying the same /deny twice yields two identical DENY entries; ACL
    # evaluation ORs them, so this is safe but does grow the ACE list. /remove:d then
    # clears all of them at once.
    icacls $repo /deny "${user}:(OI)(CI)(RX)" 2>$null | Out-Null
    $acl = (icacls $repo 2>$null) -join ';'
    return ($acl -match [regex]::Escape($user))
}

function Clear-CaseArtifacts {
    # Everything the previous attempt could have left behind. Without this, a retry
    # appends a second session to stream.jsonl (measured contamination: S31 22.7% NUL
    # bytes / 2 session_ids, S18 41.0%, S29 1.9%) and the collected page can be the
    # dead attempt's file rather than the fresh one's.
    param([string]$Dir)
    foreach ($f in @('stream.jsonl', 'stderr.txt', 'runner.log', 'out.html', 'index.html', 'agent.pid')) {
        $p = Join-Path $Dir $f
        if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue }
    }
    # Any other .html the model may have written under a name we do not predict.
    Get-ChildItem -Path $Dir -Filter '*.html' -File -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
    # Per-project transcripts. Claude Code writes a full .jsonl conversation per session
    # under <HOME>\.claude\projects\C--tmp-bb-<id>\, so a few runs accumulate every
    # earlier case's complete prompt and answer in a directory the sandbox user can
    # read. That is a real leak even with the repo ACL-denied (see 15-real-isolation.md
    # section 13). Must be repeated per attempt: a retry is a fresh session.
    $projRoot = Join-Path $sbHome '.claude\projects'
    if (Test-Path -LiteralPath $projRoot) { Remove-Item -LiteralPath $projRoot -Recurse -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Path $projRoot -Force | Out-Null
}

function Invoke-Attempt {
    param([int]$Attempt)
    $attemptStart = Get-Date
    $timedOut = $false

    Write-Host ("[attempt " + $Attempt + "] preparing sandbox HOME / wiping case artifacts")
    Clear-CaseArtifacts -Dir $TaskDir
    if (-not (Test-Path "$sbHome\.claude")) { New-Item -ItemType Directory -Path "$sbHome\.claude" -Force | Out-Null }
    Copy-Item 'C:\Users\Administrator\.claude\settings.json' "$sbHome\.claude\settings.json" -Force
    Copy-Item 'C:\Users\Administrator\.claude.json' "$sbHome\.claude.json" -Force
    icacls $sbHome /grant "${user}:(OI)(CI)(M)" /T | Out-Null
    icacls $TaskDir /grant "${user}:(OI)(CI)(M)" /T | Out-Null
    # claude.exe must live where the sandbox user can read it; Administrator's .local\bin
    # is not readable by it (measured PATH_TEST:False).
    icacls 'C:\tmp\bb-bin' /grant "${user}:(OI)(CI)(RX)" /T | Out-Null
    if (-not (Test-Path (Join-Path $TaskDir 'task.txt'))) {
        Write-Host "  WARNING: task.txt missing from TaskDir -- the agent has nothing to read"
    }

    Write-Host ("[attempt " + $Attempt + "] copying runner template")
    $runner = Join-Path $TaskDir '_run.ps1'
    Copy-Item 'C:\tmp\runner-template.ps1' $runner -Force
    icacls $runner /grant "${user}:(RX)" | Out-Null

    Write-Host ("[attempt " + $Attempt + "] applying Deny ACE")
    $denied = Set-DenyAce
    if (-not $denied) {
        # Proceeding without the ACE would produce an un-isolated run whose output looks
        # completely normal. Refuse instead.
        Write-Host '  DENY ACE NOT CONFIRMED -- refusing to launch'
        return @{ Started = $false; AbortReason = 'deny_not_applied' }
    }

    Write-Host ("[attempt " + $Attempt + "] launching scheduled task")
    $taskName = 'BlindBox_' + ([guid]::NewGuid().ToString('N').Substring(0,6))
    schtasks /Delete /TN $taskName /F 2>$null | Out-Null
    $action = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`" `"$sbHome`" `"$TaskDir`""
    schtasks /Create /TN $taskName /TR $action /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F | Out-Null
    # Kept only as the fallback signal when identity reads fail; see Get-SandboxWorkerCount.
    $legacyBaseline = @(Get-Process claude -ErrorAction SilentlyContinue).Count
    schtasks /Run /TN $taskName 2>&1 | Out-Null

    Write-Host ("[attempt " + $Attempt + "] waiting up to ${TimeoutSec}s")
    # Survival must be judged on the process we actually care about -- the sandbox
    # claude.exe -- not on how quiet stream.jsonl is, and not on the scheduled task's
    # wrapper. Measured failures:
    #   - stream.jsonl can sit unchanged for minutes while the agent is still thinking
    #     (S99: frozen at 13KB, then produced 43,892 more thinking tokens)
    #   - the scheduled task's powershell.exe wrapper exits before claude.exe does
    #     (one run reported "exited" at 900s while claude.exe kept working for hours)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $stream = Join-Path $TaskDir 'stream.jsonl'
    $outHtml = Join-Path $TaskDir 'out.html'
    $lastSize = -1
    $idle = 0
    $seenWorker = $false
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 20
        $cur = 0
        if (Test-Path $stream) { $cur = (Get-Item $stream).Length }
        if ($cur -eq $lastSize) { $idle++ } else { $idle = 0 }
        $lastSize = $cur

        $elapsed = [int]((Get-Date) - $attemptStart).TotalSeconds
        $identity = Get-SandboxWorkerCount
        $legacyNow = @(Get-Process claude -ErrorAction SilentlyContinue).Count
        if ($identity -gt 0) { $seenWorker = $true }

        $alive = Test-WorkerAlive -IdentityCount ([Math]::Max($identity, 0)) -SeenWorker $seenWorker `
                                  -ElapsedSec $elapsed -LegacyNow $legacyNow -LegacyBaseline $legacyBaseline
        $hasOut = Test-Path $outHtml
        if (-not $alive.Alive) {
            Write-Host ("  worker gone [" + $alive.Mode + ": " + $alive.Why + "] identity=" + $identity + " stream=" + $cur + "B out=" + $hasOut)
            break
        }
        if ($hasOut -and $idle -ge 6) { Write-Host 'settled (has out.html, stream quiet)'; break }
        Write-Host ("  stream=" + $cur + "B out=" + $hasOut + " worker=" + $identity + " (" + $alive.Mode + ") idle=" + $idle)
    }
    if ((Get-Date) -ge $deadline) { $timedOut = $true; Write-Host '  TIMEOUT reached' }

    schtasks /Delete /TN $taskName /F 2>$null | Out-Null

    Write-Host ("[attempt " + $Attempt + "] collect")
    # The output filename is not necessarily out.html -- the model wrote index.html in one
    # run. Only looking for out.html reported a successful run as NO_OUT_HTML; keep this.
    $cand = @('out.html', 'index.html') | ForEach-Object { Join-Path $TaskDir $_ } | Where-Object { Test-Path -LiteralPath $_ }
    if (-not $cand) {
        $cand = @(Get-ChildItem -Path $TaskDir -Filter '*.html' -File -ErrorAction SilentlyContinue |
                  Sort-Object Length -Descending | Select-Object -First 1 -ExpandProperty FullName)
    }
    $hasOutput = $false
    $outputBytes = 0
    if ($cand) {
        # Copy into place only on a trusted attempt. On an untrusted attempt we still
        # record what exists, but the retry will clear it -- see the driver loop.
        $src = $cand[0]
        Copy-Item -LiteralPath $src -Destination $OutFile -Force
        $hasOutput = $true
        $outputBytes = (Get-Item -LiteralPath $OutFile).Length
        Write-Host ('  OUT_OK src=' + (Split-Path $src -Leaf) + ' bytes=' + $outputBytes)
    } else {
        Write-Host '  NO_HTML_FOUND'
    }

    Write-Host ("[attempt " + $Attempt + "] removing deny")
    icacls $repo /remove:d $user 2>$null | Out-Null

    $verdict = Get-StreamVerdict -StreamPath $stream
    $canon = Resolve-TerminalReason -Verdict $verdict -TimedOut:$timedOut
    $durMs = [long]((Get-Date) - $attemptStart).TotalMilliseconds
    Write-Host ('  verdict: terminalReason=' + $canon + ' raw=' + $verdict.TerminalReasonRaw +
                ' apiErrorStatus=' + $verdict.ApiErrorStatus + ' stopReason=' + $verdict.StopReason +
                ' scan=' + $verdict.ScanMode + ' durationMs=' + $durMs)

    # Record which model actually answered. On every run measured so far the CLI asked
    # for opus and the local gateway served deepseek-v4.1-flash; see Get-ServedModelInfo.
    $modelInfo = Get-ServedModelInfo -StreamPath $stream
    if ($modelInfo.Mismatch) {
        Write-Host ('  MODEL MISMATCH: asked=' + $modelInfo.InitModel + ' served=' + $modelInfo.ServedModel)
    }

    return @{
        Started           = $true
        TimedOut          = $timedOut
        Verdict           = $verdict
        Canonical         = $canon
        HasOutput         = $hasOutput
        OutputBytes       = $outputBytes
        DurationMs        = $durMs
        ModelInfo         = $modelInfo
    }
}

# --- dry run: prove the wiring without spending 4 hours ------------------------
if ($DryRun) {
    # Everything below this block is the real path. This branch only replaces the two
    # steps that reach outside the process (launch, collect) so the classification,
    # run.json shape and exit codes are the production ones.
    Write-Host '[dry] no claude.exe will be started'
    Write-Host ('[dry] TaskDir = ' + $TaskDir + '  exists=' + (Test-Path $TaskDir))
    Write-Host ('[dry] OutFile = ' + $OutFile)
    Write-Host ('[dry] template present = ' + (Test-Path 'C:\tmp\runner-template.ps1'))
    Write-Host ('[dry] sandbox exe present = ' + (Test-Path $sandboxExe))
    Write-Host ('[dry] MaxRetries = ' + $MaxRetries + '  -> total attempts ' + ($MaxRetries + 1))
    Write-Host ('[dry] delays = ' + ($RetryDelaySec -join ',') + 's')
    $streamDry = Join-Path $TaskDir 'stream.jsonl'
    $vd = Get-StreamVerdict -StreamPath $streamDry
    $canonDry = Resolve-TerminalReason -Verdict $vd
    $decDry = Test-NeedsRetry -Verdict $vd -RetryOnTimeout:$RetryOnTimeout
    Write-Host ('[dry] stream exists=' + $vd.StreamExists + ' bytes=' + $vd.StreamBytes + ' scan=' + $vd.ScanMode +
                ' raw=' + $vd.TerminalReasonRaw + ' status=' + $vd.ApiErrorStatus + ' stop=' + $vd.StopReason)
    Write-Host ('[dry] would classify as terminalReason=' + $canonDry + ' -> retry=' + $decDry.Retry + ' (' + $decDry.Reason + ')')
    $hasOutDry = Test-Path -LiteralPath $OutFile
    $bytesDry = 0
    if ($hasOutDry) { $bytesDry = (Get-Item -LiteralPath $OutFile).Length }
    $miDry = Get-ServedModelInfo -StreamPath $streamDry
    Write-Host ('[dry] model: asked=' + $miDry.InitModel + ' served=' + $miDry.ServedModel + ' mismatch=' + $miDry.Mismatch)
    $docDry = New-RunJsonDocument -CaseId $caseId -Attempt 1 -TerminalReason $canonDry `
        -ApiErrorStatus $vd.ApiErrorStatus -StopReason $vd.StopReason -DurationMs 0 `
        -HasOutput $hasOutDry -OutputBytes $bytesDry -TerminalReasonRaw $vd.TerminalReasonRaw `
        -Retries @() -OutFile $OutFile -StartedAt $startAll -ModelInfo $miDry
    Write-Host ('[dry] run.json this run would write:')
    ($docDry | ConvertTo-Json -Depth 6) -split "`n" | ForEach-Object { Write-Host ('       ' + $_) }
    Write-Host '[dry] nothing was launched, no ACL was touched, no file was written'
    exit 0
}

# --- driver -------------------------------------------------------------------
# The retry loop lives in _blindbox-verdict.ps1 (Invoke-AttemptLoop) so the integration
# test exercises the same code the runner uses. If the loop were duplicated here, the
# test would be checking a copy.
$outcome = Invoke-AttemptLoop -AttemptFn { param($n) Invoke-Attempt -Attempt $n } `
    -RunJsonPath $runJsonPath -CaseId $caseId -OutFile $OutFile `
    -MaxRetries $MaxRetries -RetryDelaySec $RetryDelaySec -RetryOnTimeout:$RetryOnTimeout `
    -OnBeforeRetry {
        # Why re-apply before each retry: the previous attempt ends by removing the Deny
        # ACE (step 7), and an attempt killed mid-flight never removes it. A Deny ACE
        # that is merely assumed to be present is not isolation, so it is re-established
        # and *verified* before the next launch; false means "could not confirm" and
        # stops the loop rather than running un-isolated.
        param($n)
        Write-Host ("[retry " + $n + "] re-applying Deny ACE before attempt " + ($n + 1))
        $ok = Set-DenyAce
        if (-not $ok) { Write-Host '  DENY ACE NOT CONFIRMED -- refusing to retry un-isolated' }
        return $ok
    }

$final = $outcome.Final
Write-Host ('RUN_JSON ' + $outcome.RunJsonPath)
if ($outcome.Aborted) {
    Write-Host ('ABORTED: ' + $outcome.StopReason + ' (see run.json)')
    exit 2
}
Write-Host ('STOP: ' + $outcome.StopReason)
Write-Host ('FINAL terminalReason=' + $final.Canonical + ' trusted=' + ($final.Canonical -eq 'success') +
            ' attempts=' + $outcome.Attempts + ' hasOutput=' + $final.HasOutput + ' bytes=' + $final.OutputBytes)
if ($final.Canonical -ne 'success') { exit 1 }
exit 0
