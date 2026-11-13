# Unit test for the retry/verdict logic. Fabricates stream.jsonl files; starts nothing.
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File _blindbox-verdict-test.ps1
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot '_blindbox-verdict.ps1')

$root = Join-Path $env:TEMP ('bb-verdict-test-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $root -Force | Out-Null
Write-Host ("fixture dir: " + $root)

$pass = 0; $fail = 0
function Check([string]$name, $actual, $expected) {
    if ("$actual" -eq "$expected") { $script:pass++; Write-Host ("  PASS  " + $name + " = " + $actual) }
    else { $script:fail++; Write-Host ("  FAIL  " + $name + " -> got [" + $actual + "] want [" + $expected + "]") }
}

function Write-Fixture([string]$name, [string[]]$lines) {
    $p = Join-Path $root ($name + '.jsonl')
    if (@($lines).Count -eq 0) {
        # An empty pipeline writes nothing at all, so `@() | Set-Content` does NOT
        # create the file. Create it explicitly -- an empty stream is a real shape
        # (Start-Process created the redirect target, then claude.exe died instantly).
        [System.IO.File]::WriteAllText($p, '')
    } else {
        # Write UTF-8 NO BOM, byte-identical to what claude.exe emits. Set-Content
        # -Encoding UTF8 in PS5.1 writes a BOM, which would mask the exact encoding
        # bug this suite has to catch. LF line endings, same reason.
        $text = ($lines -join "`n") + "`n"
        [System.IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding($false)))
    }
    return $p
}

# --- fixtures -------------------------------------------------------------
# Shapes copied from the real result events on this machine, trimmed to the fields
# the reader looks at. Note subtype="success" on ALL of them: it is not a signal.
$successLine = '{"type":"result","subtype":"success","is_error":false,"terminal_reason":"completed","stop_reason":"end_turn","duration_ms":1234567,"api_error_status":null,"num_turns":9,"result":"done"}'
$apiErrLine  = '{"type":"result","subtype":"success","is_error":true,"terminal_reason":"api_error","stop_reason":"stop_sequence","duration_ms":15381773,"api_error_status":524,"num_turns":7,"result":"API Error: 524 upstream_error"}'
$apiErrNull  = '{"type":"result","subtype":"success","is_error":true,"terminal_reason":"api_error","stop_reason":"stop_sequence","duration_ms":900,"api_error_status":null,"result":"API Error: Connection lost mid-stream"}'
$noTermLine  = '{"type":"result","subtype":"success","is_error":false,"stop_reason":"end_turn","duration_ms":500,"result":"done"}'

$midLine  = '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"thinking about it"}]}}'
$sysLine  = '{"type":"system","subtype":"api_retry","attempt":1,"max_retries":8,"error_status":524}'
# An assistant message that MENTIONS type:result in its body. A naive grep sees a
# result event here and reports a fake "completed". This line exists to catch that.
$trapLine = '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"the schema has \"type\":\"result\" in it"}]}}'
# A SUCCESSFUL run whose final reply is non-ASCII. This is the shape of S15/S22/S29/
# S32/S35 -- and the exact case that a Get-Content-without-Encoding reader corrupts
# into invalid JSON, turning five good runs into "untrusted". Regression fixture.
#
# The text is built from code points on purpose. PowerShell 5.1 parses a .ps1 with no
# BOM using the ANSI code page, so a literal CJK string in this file would itself be
# corrupted before the test ran (measured: the same failure moved from the data file
# into this script). Keeping every .ps1 ASCII-only is the only stable answer.
$zhText = -join ([char[]](0x5199, 0x597D, 0x4E86, 0xFF1A, 0x4E00, 0x4ECB, 0x65E7, 0x623F))
$successCn = '{"type":"result","subtype":"success","is_error":false,"terminal_reason":"completed","stop_reason":"end_turn","duration_ms":15737672,"api_error_status":null,"num_turns":293,"result":"' + $zhText + ' 92.8px"}'

$fSuccess = Write-Fixture 'success'   @($sysLine, $midLine, $trapLine, $successLine)
$fApiErr  = Write-Fixture 'api_error' @($sysLine, $midLine, $trapLine, $apiErrLine)
$fNoRes   = Write-Fixture 'no_result' @($sysLine, $midLine, $midLine)
$fNullSt  = Write-Fixture 'api_null'  @($sysLine, $apiErrNull)
$fMissing = Join-Path $root 'does-not-exist.jsonl'
$fEmpty   = Write-Fixture 'empty'     @()
# Two sessions appended into one file (the S31/S18/S29 contamination). The reader
# must take the LAST result, not the first.
$fAppend  = Write-Fixture 'appended'  @($apiErrLine, $midLine, $successLine)
# A result event buried beyond the tail window, to prove the full-scan fallback works.
# Shape: 3000 filler lines, the result, then 3000 more filler lines. With a 100-line
# tail the reader sees no result and must widen instead of declaring "no_result".
$fDeep    = Write-Fixture 'deep'      (@($midLine) * 3000 + @($successLine) + @($midLine) * 3000)

Write-Host "`n=== A. Get-StreamVerdict: facts read from file ==="
$v1 = Get-StreamVerdict -StreamPath $fSuccess
Check 'success terminalReasonRaw' $v1.TerminalReasonRaw 'completed'
Check 'success hasResult' $v1.HasResult 'True'
Check 'success isError' $v1.IsError 'False'
Check 'success stopReason' $v1.StopReason 'end_turn'
Check 'success resultLineCount (trap not counted)' $v1.ResultLineCount 1

$v2 = Get-StreamVerdict -StreamPath $fApiErr
Check 'api_error terminalReasonRaw' $v2.TerminalReasonRaw 'api_error'
Check 'api_error apiErrorStatus' $v2.ApiErrorStatus '524'
Check 'api_error isError' $v2.IsError 'True'

$v3 = Get-StreamVerdict -StreamPath $fNoRes
Check 'no_result hasResult' $v3.HasResult 'False'
Check 'no_result scanMode' $v3.ScanMode 'full'

$v4 = Get-StreamVerdict -StreamPath $fNullSt
Check 'api_status null stays null' $v4.ApiErrorStatus ''

$v5 = Get-StreamVerdict -StreamPath $fMissing
Check 'missing stream exists' $v5.StreamExists 'False'
Check 'missing stream hasResult' $v5.HasResult 'False'

$v6 = Get-StreamVerdict -StreamPath $fEmpty
Check 'empty stream exists' $v6.StreamExists 'True'
Check 'empty stream hasResult' $v6.HasResult 'False'

$v7 = Get-StreamVerdict -StreamPath $fAppend
Check 'appended takes LAST result' $v7.TerminalReasonRaw 'completed'
Check 'appended still counts 2 result lines' $v7.ResultLineCount 2

$v8 = Get-StreamVerdict -StreamPath $fDeep -TailBytes 5000
Check 'deep result found via full scan' $v8.HasResult 'True'
Check 'deep scanMode widened' $v8.ScanMode 'full'

Write-Host "`n=== B. Resolve-TerminalReason: canonical vocabulary ==="
Check 'completed -> success'  (Resolve-TerminalReason -Verdict $v1) 'success'
Check 'api_error -> api_error' (Resolve-TerminalReason -Verdict $v2) 'api_error'
Check 'api_error + null status' (Resolve-TerminalReason -Verdict $v4) 'api_error'
Check 'no result -> no_result' (Resolve-TerminalReason -Verdict $v3) 'no_result'
Check 'no result + timedOut -> timeout' (Resolve-TerminalReason -Verdict $v3 -TimedOut) 'timeout'
Check 'missing stream -> no_result' (Resolve-TerminalReason -Verdict $v5) 'no_result'

$vNoTerm = Get-StreamVerdict -StreamPath (Write-Fixture 'noterm' @($noTermLine))
Check 'result without terminal_reason -> unknown' (Resolve-TerminalReason -Verdict $vNoTerm) 'unknown'

# subtype=success must never win over is_error=true (that is the S98 trap).
$vTrap = Get-StreamVerdict -StreamPath (Write-Fixture 'subtype_trap' @('{"type":"result","subtype":"success","is_error":true,"terminal_reason":"completed","duration_ms":1}'))
Check 'is_error=true beats subtype/raw' (Resolve-TerminalReason -Verdict $vTrap) 'api_error'

Write-Host "`n=== C. Test-NeedsRetry: the actual retry decision ==="
Check 'success -> no retry'      (Test-NeedsRetry -Verdict $v1).Retry 'False'
Check 'success reason'           (Test-NeedsRetry -Verdict $v1).Reason 'trusted'
Check 'api_error -> retry'       (Test-NeedsRetry -Verdict $v2).Retry 'True'
Check 'api_error reason'         (Test-NeedsRetry -Verdict $v2).Reason 'api_error'
Check 'no_result -> retry'       (Test-NeedsRetry -Verdict $v3).Retry 'True'
Check 'no_result reason'         (Test-NeedsRetry -Verdict $v3).Reason 'no_result'
Check 'missing -> retry'         (Test-NeedsRetry -Verdict $v5).Retry 'True'
Check 'timeout -> NO retry by default' (Test-NeedsRetry -Verdict $v3 -TimedOut).Retry 'False'
Check 'timeout reason'           (Test-NeedsRetry -Verdict $v3 -TimedOut).Reason 'timeout_not_retried'
Check 'timeout -> retry when opted in' (Test-NeedsRetry -Verdict $v3 -TimedOut -RetryOnTimeout).Retry 'True'
Check 'unknown -> no retry'      (Test-NeedsRetry -Verdict $vNoTerm).Retry 'False'
Check 'unknown reason'           (Test-NeedsRetry -Verdict $vNoTerm).Reason 'unrecognized:unknown'

Write-Host "`n=== D. Test-WorkerAlive: identity over counting ==="
Check 'worker visible -> alive'  (Test-WorkerAlive -IdentityCount 1 -SeenWorker $true -ElapsedSec 300).Alive 'True'
Check 'worker seen then gone -> dead' (Test-WorkerAlive -IdentityCount 0 -SeenWorker $true -ElapsedSec 300).Alive 'False'
Check 'no worker inside warmup -> alive' (Test-WorkerAlive -IdentityCount 0 -SeenWorker $false -ElapsedSec 60).Alive 'True'
Check 'no worker after warmup, no identity -> legacy' (Test-WorkerAlive -IdentityCount 0 -SeenWorker $false -ElapsedSec 400 -LegacyNow 22 -LegacyBaseline 22).Alive 'False'
Check 'legacy mode is declared' (Test-WorkerAlive -IdentityCount 0 -SeenWorker $false -ElapsedSec 400 -LegacyNow 23 -LegacyBaseline 22).Mode 'legacy'

Write-Host "`n=== E. try/catch: a corrupt trailing line must not kill the verdict ==="
$fTrunc = Join-Path $root 'truncated.jsonl'
@($midLine, $successLine, '{"type":"result","subtype":"succ') | Set-Content -Path $fTrunc -Encoding UTF8
$vT = Get-StreamVerdict -StreamPath $fTrunc
Check 'truncated tail still yields last GOOD result' $vT.TerminalReasonRaw 'completed'

Write-Host "`n=== F. UTF-8: non-ASCII reply must not be mistaken for a broken stream ==="
# Regression for the encoding bug found while validating this library against the 14
# real streams. Get-Content without -Encoding (PS 5.1 default = ANSI code page) turns
# these lines into invalid JSON, and a reader that maps "parse failed" to "no result"
# reports a successful run as untrusted and retries it.
$fCn = Write-Fixture 'success_cn' @($sysLine, $midLine, $successCn)
$vCn = Get-StreamVerdict -StreamPath $fCn
Check 'chinese success hasResult' $vCn.HasResult 'True'
Check 'chinese success raw' $vCn.TerminalReasonRaw 'completed'
Check 'chinese success resolves' (Resolve-TerminalReason -Verdict $vCn) 'success'
Check 'chinese success not retried' (Test-NeedsRetry -Verdict $vCn).Retry 'False'

# And prove the bug is real rather than theoretical. A synthetic fixture is not enough:
# whether the ANSI decode breaks JSON depends on the local code page (GBK here), so a
# handful of CJK characters survives round-tripping by luck. The honest evidence is a
# REAL stream that the naive read actually fails on. S15 is one (measured).
$realStream = 'C:\tmp\bb\S15\stream.jsonl'
if (Test-Path $realStream) {
    $naive = @(Get-Content -LiteralPath $realStream -Tail 2000)
    $naiveHit = @($naive | Where-Object { $_ -match '"type"\s*:\s*"result"' })
    $naiveOk = $false
    if ($naiveHit.Count) { try { $null = $naiveHit[-1] | ConvertFrom-Json -ErrorAction Stop; $naiveOk = $true } catch { $naiveOk = $false } }
    Check 'naive Get-Content read fails on real S15 (the bug is real)' $naiveOk 'False'
    # and the library handles the same file correctly
    $v15 = Get-StreamVerdict -StreamPath $realStream
    Check 'library reads real S15 as success' (Resolve-TerminalReason -Verdict $v15) 'success'
} else {
    Write-Host '  SKIP  real S15 absent, cannot demonstrate the bug'
}

Write-Host ("`n===== " + $pass + " passed, " + $fail + " failed =====")
Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue
if ($fail -gt 0) { exit 1 }
