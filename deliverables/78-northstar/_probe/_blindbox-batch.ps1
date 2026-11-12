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
    [string]$RepoRoot = 'D:\Web\style'
)

$ErrorActionPreference = 'Continue'
$runner = Join-Path $RepoRoot 'deliverables\78-northstar\_probe\_blindbox-run.ps1'
$blindDir = Join-Path $RepoRoot 'deliverables\78-northstar\blind'
$outRoot = 'C:\tmp\bb'

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

    & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -TaskDir $taskDir -OutFile $outFile -TimeoutSec $TimeoutSec

    $caseMs = [int]((Get-Date) - $caseStart).TotalMilliseconds
    $hasOut = Test-Path $outFile
    $bytes = 0
    if ($hasOut) { $bytes = (Get-Item $outFile).Length }
    # The agent often writes out.html well before it finishes its final reply, and a run
    # that hit the timeout can still have produced a complete file. So an existing file
    # counts as success regardless of whether a "result" event landed in the stream.
    # (Evidence: S08/S13/S22 in an earlier batch produced 23-38KB complete pages and were
    #  reported as "TIMEOUT / 0B" purely because the collector only checked after the run.)
    $finished = $false
    $stream = Join-Path $taskDir 'stream.jsonl'
    if (Test-Path $stream) {
        $finished = (Select-String -Path $stream -Pattern '"type":"result"' -Quiet)
    }
    $state = 'NO_OUT'
    if ($hasOut) {
        if ($finished) { $state = 'OK' }
        else { $state = 'OK(early)' }
    } elseif (-not $finished) {
        $state = 'TIMEOUT(no result in stream)'
    } else {
        $state = 'FINISHED_BUT_NO_FILE'
    }
    $results += [pscustomobject]@{
        id = $id; ok = $hasOut; bytes = $bytes; ms = $caseMs; finished = $finished; state = $state
    }
    Write-Host ("----- " + $id + "  " + $state + "  " + $bytes + "B  " + [math]::Round($caseMs / 1000) + "s -----")
}

Write-Host "`n===== batch summary ====="
$ok = @($results | Where-Object { $_.ok }).Count
foreach ($r in $results) {
    Write-Host ("  " + $r.id + "  " + $r.state.PadRight(26) + $r.bytes.ToString().PadLeft(7) + "B  " + [math]::Round($r.ms / 1000) + "s")
}
$timeouts = @($results | Where-Object { -not $_.finished }).Count
Write-Host ("  total: " + $ok + "/" + $results.Count + " produced, " +
            $timeouts + " timed out, " +
            [math]::Round(((Get-Date) - $t0).TotalMinutes) + " min")

$results | ConvertTo-Json -Depth 3 | Set-Content -Path (Join-Path $outRoot 'batch-result.json') -Encoding UTF8
Write-Host ("  written " + (Join-Path $outRoot 'batch-result.json'))
