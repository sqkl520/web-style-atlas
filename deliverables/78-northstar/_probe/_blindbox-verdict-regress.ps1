# Regression: run the SAME reader over every real stream on this machine.
# The unit test proves the logic on fabricated fixtures; this proves the logic on the
# data it will actually meet. Both must agree with what the reports already published.
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot '_blindbox-verdict.ps1')

$root = 'C:\tmp\bb'
$ids = @('S04','S08','S13','S15','S18','S21','S22','S29','S31','S32','S35','S97','S98','S99')
$rows = @()
foreach ($id in $ids) {
    $p = Join-Path $root "$id\stream.jsonl"
    if (-not (Test-Path $p)) { Write-Host ("$id  NO_STREAM"); continue }
    $t0 = Get-Date
    $v = Get-StreamVerdict -StreamPath $p
    $ms = [int]((Get-Date) - $t0).TotalMilliseconds
    $canon = Resolve-TerminalReason -Verdict $v
    $d = Test-NeedsRetry -Verdict $v
    $rows += [pscustomobject]@{
        id = $id
        raw = $v.TerminalReasonRaw
        canon = $canon
        status = $v.ApiErrorStatus
        isErr = $v.IsError
        retry = $d.Retry
        scan = $v.ScanMode
        lines = $v.ResultLineCount
        ms = $ms
        bytes = $v.StreamBytes
    }
}
Write-Host ''
$rows | Format-Table -AutoSize | Out-String -Width 200

Write-Host '--- expectations from the published reports ---'
$exp = @{
    'S08'='success'; 'S13'='success'; 'S15'='success'; 'S18'='success'
    'S22'='success'; 'S29'='success'; 'S32'='success'; 'S35'='success'
    'S04'='api_error'; 'S21'='api_error'; 'S31'='api_error'
    'S97'='api_error'; 'S98'='api_error'; 'S99'='no_result'
}
$bad = 0
foreach ($r in $rows) {
    $want = $exp[$r.id]
    if (-not $want) { continue }
    if ($r.canon -ne $want) { Write-Host ("  MISMATCH " + $r.id + " got=" + $r.canon + " want=" + $want); $bad++ }
}
if ($bad -eq 0) { Write-Host ("  all " + $rows.Count + " real streams classify as expected") }

# S98 is the case this whole task exists for: must be api_error/524/retry, and its
# product must be reported as absent so the retry clears nothing it needed.
$s98 = $rows | Where-Object { $_.id -eq 'S98' }
Write-Host ("`nS98 -> raw=" + $s98.raw + " status=" + $s98.status + " retry=" + $s98.retry + " scan=" + $s98.scan + " (" + $s98.ms + "ms for " + [math]::Round($s98.bytes/1MB,1) + "MB)")
$s97 = $rows | Where-Object { $_.id -eq 'S97' }
Write-Host ("S97 -> raw=" + $s97.raw + " status=" + $s97.status + " retry(verdict alone)=" + $s97.retry)
Write-Host "       S97 also wrote 20853B of out.html BEFORE the 524 storm, so the runner's"
Write-Host "       output guard stops the retry: Test-NeedsRetry -OutputLooksComplete => no retry."

# End-to-end over the REAL files: what would the runner decide for each case, including
# the output guard? This is the check that matters for the rerun, not the verdict alone.
Write-Host "`n--- runner decision per case (verdict + output guard) ---"
foreach ($r in $rows) {
    $hasOut = $false; $outBytes = 0
    $outCand = Join-Path $root ($r.id + '\out.html')
    if (Test-Path $outCand) { $hasOut = $true; $outBytes = (Get-Item $outCand).Length }
    $v = Get-StreamVerdict -StreamPath (Join-Path $root ($r.id + '\stream.jsonl'))
    $complete = Test-OutputLikelyComplete -HasOutput $hasOut -OutputBytes $outBytes
    $d = Test-NeedsRetry -Verdict $v -HasOutput $hasOut -OutputLooksComplete $complete
    Write-Host ('  ' + $r.id.PadRight(5) + ' out=' + ($hasOut.ToString()).PadRight(6) + ($outBytes.ToString() + 'B').PadRight(9) +
                'retry=' + ($d.Retry.ToString()).PadRight(6) + $d.Reason)
}

$totalMs = ($rows | Measure-Object -Property ms -Sum).Sum
Write-Host ("`ntotal scan time for all 14 streams: " + $totalMs + "ms")
