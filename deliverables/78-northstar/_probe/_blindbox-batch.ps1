# Batch real-isolation blind runs, one case at a time.
#
# Why sequential and not parallel: the Deny ACE applies per ACCOUNT
# (icacls D:\Web\style /deny ClaudeBlindBox), not per process. If several sandbox
# runs overlap, any one of them removing the deny silently un-isolates the others.
# True parallelism needs one account per case (each with SeBatchLogonRight and its
# own HOME) -- a different order of complexity. One case takes ~30-40 min.
#
# Usage:
#   powershell -File _blindbox-batch.ps1 -Ids "S04,S08,S13"
#   powershell -File _blindbox-batch.ps1            # default 11 cases
param(
    [string]$Ids = 'S04,S08,S13,S15,S18,S21,S22,S29,S31,S32,S35',
    [int]$TimeoutSec = 2400,
    [string]$RepoRoot = 'D:\Web\style',
    [int]$MaxRetries = 2,
    [switch]$RetryOnTimeout
)

$ErrorActionPreference = 'Continue'
$runner = Join-Path $RepoRoot 'deliverables\78-northstar\_probe\_blindbox-run.ps1'
$blindDir = Join-Path $RepoRoot 'deliverables\78-northstar\blind'
$outRoot = 'C:\tmp\bb'

. (Join-Path $RepoRoot 'deliverables\78-northstar\_probe\_blindbox-verdict.ps1')

$idList = $Ids -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
Write-Host ("batch: " + $idList.Count + " cases -> " + ($idList -join ' '))

$results = @()
$t0 = Get-Date
foreach ($id in $idList) {
    $taskDir = Join-Path $outRoot $id
    $src = Join-Path $blindDir "$id\task.txt"
    if (-not (Test-Path $src)) { Write-Host "$id : no task.txt, skip"; continue }

    # Fresh dir per case: last case's artifacts must not leak into this measurement.
    if (Test-Path $taskDir) { Remove-Item $taskDir -Recurse -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Path $taskDir -Force | Out-Null
    Copy-Item $src (Join-Path $taskDir 'task.txt') -Force

    $outFile = Join-Path $taskDir 'out.html'
    $caseStart = Get-Date
    Write-Host ("`n===== " + $id + "  start " + (Get-Date -Format 'HH:mm:ss') + " =====")

    & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -TaskDir $taskDir -OutFile $outFile `
        -TimeoutSec $TimeoutSec -MaxRetries $MaxRetries -RetryOnTimeout:$RetryOnTimeout
    $runnerExit = $LASTEXITCODE

    # run.json is the authority now. The old logic here guessed from file presence and
    # a `type":"result"` grep, which is exactly how S98's gateway failure got recorded as
    # an ordinary finish and later read as "the model could not do it".
    $runJson = Join-Path $taskDir 'run.json'
    $rj = $null
    if (Test-Path $runJson) {
        try { $rj = Get-Content -LiteralPath $runJson -Raw | ConvertFrom-Json } catch { $rj = $null }
    }

    $caseMs = [int]((Get-Date) - $caseStart).TotalMilliseconds
    $bytes = 0
    if (Test-Path $outFile) { $bytes = (Get-Item $outFile).Length }

    if ($rj) {
        $cs = Resolve-CaseState -RunJson $rj -OutputBytes $bytes
        $terminal = $cs.Terminal
        $trusted = $cs.Trusted
        $attempts = $rj.attempt
        $state = $cs.State
    } else {
        # No run.json means the runner died before its first write. Say so instead of
        # inventing a state.
        $cs = Resolve-CaseState -RunJson $null
        $terminal = $cs.Terminal
        $trusted = $cs.Trusted
        $attempts = 0
        $state = $cs.State
    }

    $results += [pscustomobject]@{
        id = $id; trusted = $trusted; terminalReason = $terminal; attempts = $attempts
        state = $state; bytes = $bytes; ms = $caseMs; runnerExit = $runnerExit
    }
    Write-Host ("----- " + $id + "  " + $state + "  reason=" + $terminal + "  attempts=" + $attempts +
                "  " + $bytes + "B  " + [math]::Round($caseMs / 1000) + "s -----")
}

Write-Host "`n===== batch summary ====="
foreach ($r in $results) {
    Write-Host ("  " + $r.id.PadRight(5) + $r.state.PadRight(22) + $r.terminalReason.PadRight(12) +
                ("att=" + $r.attempts).PadRight(8) + $r.bytes.ToString().PadLeft(7) + "B  " +
                [math]::Round($r.ms / 1000) + "s")
}
$trusted = @($results | Where-Object { $_.trusted }).Count
$apiErr = @($results | Where-Object { $_.terminalReason -eq 'api_error' }).Count
$timeout = @($results | Where-Object { $_.terminalReason -eq 'timeout' }).Count
$noRes = @($results | Where-Object { $_.terminalReason -eq 'no_result' }).Count
$retried = @($results | Where-Object { $_.attempts -gt 1 }).Count
Write-Host ("  total: " + $trusted + "/" + $results.Count + " trusted, " +
            $apiErr + " api_error, " + $timeout + " timeout, " + $noRes + " no_result, " +
            $retried + " needed a retry, " +
            [math]::Round(((Get-Date) - $t0).TotalMinutes) + " min")
Write-Host '  NOTE: trusted = terminalReason success. Anything else is untrusted and is'
Write-Host '        NOT evidence about the model -- see 24-retry-implementation.md.'

$results | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $outRoot 'batch-result.json') -Encoding UTF8
Write-Host ("  written " + (Join-Path $outRoot 'batch-result.json'))
