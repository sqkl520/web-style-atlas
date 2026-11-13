# Integration test for the RETRY DRIVER LOOP, without launching claude.exe.
#
# The unit test (_blindbox-verdict-test.ps1) covers "given a stream, what is the
# verdict". This covers the loop that acts on it: how many attempts happen, what lands
# in run.json, how it stops. It calls Invoke-AttemptLoop from the shared library -- the
# same function _blindbox-run.ps1 calls -- so there is no second copy to drift.
#
# Nothing here starts a process, touches an ACL, or writes outside a temp dir.
$ErrorActionPreference = 'Continue'
. 'D:\Web\style\deliverables\78-northstar\_probe\_blindbox-verdict.ps1'

$root = Join-Path $env:TEMP ('bb-driver-test-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $root -Force | Out-Null
Write-Host ("fixture dir: " + $root)

$pass = 0; $fail = 0
function Check([string]$name, $actual, $expected) {
    if ("$actual" -eq "$expected") { $script:pass++; Write-Host ("  PASS  " + $name + " = " + $actual) }
    else { $script:fail++; Write-Host ("  FAIL  " + $name + " -> got [" + $actual + "] want [" + $expected + "]") }
}

# Fabricate one attempt's result, shaped exactly like Invoke-Attempt's return.
function New-AttemptResult {
    param(
        [string]$Terminal,
        [int]$Status = 0,
        [bool]$TimedOut = $false,
        [bool]$HasOutput = $false,
        [int]$Bytes = 0,
        [int]$Ms = 1000,
        [string]$StopReason = 'stop_sequence'
    )
    $v = [pscustomobject]@{
        StreamPath        = 'fake'
        StreamExists      = $true
        StreamBytes       = 1
        HasResult         = ($Terminal -ne 'no_result')
        ResultLineCount   = $(if ($Terminal -eq 'no_result') { 0 } else { 1 })
        TerminalReasonRaw = $(if ($Terminal -eq 'success') { 'completed' } else { $Terminal })
        ApiErrorStatus    = $(if ($Status -gt 0) { $Status } else { $null })
        StopReason        = $StopReason
        IsError           = ($Terminal -eq 'api_error')
        EventDurationMs   = 1
        ScanMode          = 'tail'
    }
    # 'no_result' with TimedOut is how a real timeout presents.
    if ($TimedOut) { $v.HasResult = $false; $v.TerminalReasonRaw = $null; $v.IsError = $false }
    return @{
        Started = $true; TimedOut = $TimedOut; Verdict = $v
        Canonical = $Terminal; HasOutput = $HasOutput; OutputBytes = $Bytes; DurationMs = $Ms
    }
}

function Read-RunJson([string]$p) { return (Get-Content -LiteralPath $p -Raw | ConvertFrom-Json) }

Write-Host "`n=== G. api_error then success -> 2 attempts, trusted ==="
$rj = Join-Path $root 'gate_a.json'
$script:gSeen = @()
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'S98' -OutFile 'X:\out.html' -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n); $script:gSeen += $n
    if ($n -eq 1) { New-AttemptResult -Terminal 'api_error' -Status 524 -Ms 15230000 -StopReason 'stop_sequence' }
    else { New-AttemptResult -Terminal 'success' -HasOutput $true -Bytes 20853 -Ms 900000 -StopReason 'end_turn' }
}
$d = Read-RunJson $rj
Check 'G attempts executed' $o.Attempts 2
Check 'G attempt numbers seen' ($script:gSeen -join ',') '1,2'
Check 'G terminalReason' $d.terminalReason 'success'
Check 'G terminalReasonRaw' $d.terminalReasonRaw 'completed'
Check 'G trusted' $d.trusted 'True'
Check 'G apiErrorStatus cleared on success' ("$($d.apiErrorStatus)") ''
Check 'G stopReason from final attempt' $d.stopReason 'end_turn'
Check 'G hasOutput' $d.hasOutput 'True'
Check 'G outputBytes' $d.outputBytes 20853
Check 'G retries length' (@($d.retries).Count) 1
Check 'G retries[0].attempt' (@($d.retries)[0].attempt) 1
Check 'G retries[0].terminalReason' (@($d.retries)[0].terminalReason) 'api_error'
Check 'G retries[0].apiErrorStatus' (@($d.retries)[0].apiErrorStatus) 524
Check 'G retries[0].durationMs' (@($d.retries)[0].durationMs) 15230000
Check 'G retryCount matches' $d.retryCount 1
Check 'G stop reason' $o.StopReason 'trusted'

Write-Host "`n=== H. success first try -> 1 attempt, empty retries ==="
$rj = Join-Path $root 'gate_b.json'
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'S08' -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n) New-AttemptResult -Terminal 'success' -HasOutput $true -Bytes 30000 -StopReason 'end_turn'
}
$d = Read-RunJson $rj
Check 'H attempts' $o.Attempts 1
Check 'H retries empty' (@($d.retries).Count) 0
Check 'H terminalReason' $d.terminalReason 'success'

Write-Host "`n=== I. api_error forever -> stops at MaxRetries+1, untrusted ==="
$rj = Join-Path $root 'gate_c.json'
$script:iCount = 0
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'S98' -MaxRetries 2 -RetryDelaySec @(0, 0) -OnSleep {} -AttemptFn {
    param($n); $script:iCount++
    New-AttemptResult -Terminal 'api_error' -Status 524 -Ms 1000
}
$d = Read-RunJson $rj
Check 'I attempts = MaxRetries+1' $o.Attempts 3
Check 'I actual invocations' $script:iCount 3
Check 'I stop reason' $o.StopReason 'retries_exhausted'
Check 'I final terminalReason' $d.terminalReason 'api_error'
Check 'I apiErrorStatus kept' $d.apiErrorStatus 524
Check 'I trusted false' $d.trusted 'False'
Check 'I retries recorded = 2' (@($d.retries).Count) 2
Check 'I maxAttempts is 3' $d.maxAttempts 3

Write-Host "`n=== J. no_result then success ==="
$rj = Join-Path $root 'gate_d.json'
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'SXX' -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n)
    if ($n -eq 1) { New-AttemptResult -Terminal 'no_result' -Ms 500 }
    else { New-AttemptResult -Terminal 'success' -HasOutput $true -Bytes 100 }
}
$d = Read-RunJson $rj
Check 'J attempts' $o.Attempts 2
Check 'J retries[0] terminalReason' (@($d.retries)[0].terminalReason) 'no_result'
Check 'J final success' $d.terminalReason 'success'

Write-Host "`n=== K. timeout is NOT retried by default (would discard live work) ==="
$rj = Join-Path $root 'gate_e.json'
$script:kCount = 0
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'STO' -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n); $script:kCount++
    New-AttemptResult -Terminal 'timeout' -TimedOut $true -HasOutput $true -Bytes 23000
}
$d = Read-RunJson $rj
Check 'K attempts (no retry)' $script:kCount 1
Check 'K stop reason' $o.StopReason 'timeout_not_retried'
Check 'K terminalReason' $d.terminalReason 'timeout'
Check 'K timedOut flag' $d.timedOut 'True'
Check 'K trusted false' $d.trusted 'False'
Check 'K hasOutput preserved for a human' $d.hasOutput 'True'

Write-Host "`n=== L. timeout WITH opt-in does retry ==="
$rj = Join-Path $root 'gate_f.json'
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'STO' -RetryOnTimeout -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n)
    if ($n -eq 1) { New-AttemptResult -Terminal 'timeout' -TimedOut $true }
    else { New-AttemptResult -Terminal 'success' -HasOutput $true -Bytes 500 }
}
Check 'L attempts' $o.Attempts 2

Write-Host "`n=== M. unseen terminal_reason stops and is preserved verbatim ==="
$rj = Join-Path $root 'gate_g.json'
$script:mCount = 0
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'SUK' -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n); $script:mCount++
    $v = [pscustomobject]@{ HasResult=$true; TerminalReasonRaw='brand_new_reason'; ApiErrorStatus=$null; StopReason='x'; IsError=$false; ScanMode='tail' }
    @{ Started=$true; TimedOut=$false; Verdict=$v; Canonical=(Resolve-TerminalReason -Verdict $v); HasOutput=$false; OutputBytes=0; DurationMs=1 }
}
$d = Read-RunJson $rj
Check 'M attempts (no retry on unknown)' $script:mCount 1
Check 'M stop reason' $o.StopReason 'unrecognized:brand_new_reason'
Check 'M raw value preserved in json' $d.terminalReason 'brand_new_reason'

Write-Host "`n=== N. delay array shorter than attempts must not throw ==="
$rj = Join-Path $root 'gate_h.json'
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'SDL' -MaxRetries 3 -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n) New-AttemptResult -Terminal 'api_error' -Status 500
}
Check 'N attempts with 1-entry delay array' $o.Attempts 4

Write-Host "`n=== O. abort paths write run.json and stop ==="
$rj = Join-Path $root 'gate_i.json'
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'SAB' -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n) @{ Started = $false; AbortReason = 'deny_not_applied' }
}
$d = Read-RunJson $rj
Check 'O aborted reported' $o.Aborted 'True'
Check 'O terminalReason aborted' $d.terminalReason 'aborted'
Check 'O abortReason' $d.abortReason 'deny_not_applied'
Check 'O trusted false' $d.trusted 'False'

$rj = Join-Path $root 'gate_j.json'
$script:retryHookCalls = 0
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'SDN' -RetryDelaySec @(0) -OnSleep {} -OnBeforeRetry {
    param($n); $script:retryHookCalls++; return $false
} -AttemptFn { param($n) New-AttemptResult -Terminal 'api_error' -Status 524 }
$d = Read-RunJson $rj
Check 'O retry hook called once' $script:retryHookCalls 1
Check 'O deny failure stops loop' $o.StopReason 'aborted:deny_not_reapplied'
Check 'O deny abort recorded' $d.abortReason 'deny_not_reapplied'
Check 'O no second attempt on deny failure' (@($d.retries).Count) 1

Write-Host "`n=== P. retry hook runs before each retry, not before the first attempt ==="
$rj = Join-Path $root 'gate_k.json'
$script:hookAttempts = @()
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'SHK' -MaxRetries 2 -RetryDelaySec @(0) -OnSleep {} -OnBeforeRetry {
    param($n); $script:hookAttempts += $n; return $true
} -AttemptFn { param($n) New-AttemptResult -Terminal 'api_error' -Status 500 }
Check 'P hook called for each retry only' ($script:hookAttempts -join ',') '1,2'
Check 'P attempts total' $o.Attempts 3

Write-Host "`n=== Q. run.json required keys (from the task spec) are all present ==="
$d = Read-RunJson (Join-Path $root 'gate_b.json')
foreach ($k in @('id','attempt','terminalReason','apiErrorStatus','stopReason','durationMs','hasOutput','outputBytes','retries')) {
    Check ("Q key present: " + $k) (($d.PSObject.Properties.Name -contains $k)) 'True'
}
# The spec's example has retries entries with exactly these four fields.
$d2 = Read-RunJson (Join-Path $root 'gate_a.json')
$r0 = @($d2.retries)[0]
foreach ($k in @('attempt','terminalReason','apiErrorStatus','durationMs')) {
    Check ("Q retries[0] has " + $k) (($r0.PSObject.Properties.Name -contains $k)) 'True'
}

Write-Host "`n=== R. run.json is re-parseable and stays valid JSON under CJK paths ==="
$rj = Join-Path $root 'gate_l.json'
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'S98' -RetryDelaySec @(0) -OnSleep {} -AttemptFn { param($n) New-AttemptResult -Terminal 'api_error' -Status 524 }
$raw = Get-Content -LiteralPath $rj -Raw
$ok = $true
try { $null = $raw | ConvertFrom-Json -ErrorAction Stop } catch { $ok = $false }
Check 'R re-parse valid' $ok 'True'
Check 'R written as UTF-8 (has BOM, readable by PS and Node)' ((Get-Content -LiteralPath $rj -Encoding Byte -TotalCount 3) -join ',') '239,187,191'

Write-Host "`n=== S. Resolve-CaseState: the batch summary label ==="
# The labels the batch prints. These used to be derived from file presence + a grep,
# which is how an api_error with no output and an unfinished run got the same label,
# and how an existing out.html alone became OK(early).
function New-RunJsonStub([string]$Terminal, [bool]$Trusted) {
    return [pscustomobject]@{ terminalReason = $Terminal; trusted = $Trusted; attempt = 1 }
}
Check 'S success -> OK'            (Resolve-CaseState -RunJson (New-RunJsonStub 'success' $true)).State 'OK'
Check 'S success trusted'          (Resolve-CaseState -RunJson (New-RunJsonStub 'success' $true)).Trusted 'True'
Check 'S api_error -> API_ERROR'   (Resolve-CaseState -RunJson (New-RunJsonStub 'api_error' $false)).State 'API_ERROR'
Check 'S api_error untrusted'      (Resolve-CaseState -RunJson (New-RunJsonStub 'api_error' $false)).Trusted 'False'
Check 'S no_result'                (Resolve-CaseState -RunJson (New-RunJsonStub 'no_result' $false)).State 'NO_RESULT'
Check 'S timeout no file'          (Resolve-CaseState -RunJson (New-RunJsonStub 'timeout' $false) -OutputBytes 0).State 'TIMEOUT'
Check 'S timeout with file is its own label' (Resolve-CaseState -RunJson (New-RunJsonStub 'timeout' $false) -OutputBytes 23000).State 'TIMEOUT(HAS_OUTPUT)'
Check 'S timeout with file still untrusted'  (Resolve-CaseState -RunJson (New-RunJsonStub 'timeout' $false) -OutputBytes 23000).Trusted 'False'
Check 'S aborted'                  (Resolve-CaseState -RunJson (New-RunJsonStub 'aborted' $false)).State 'ABORTED'
Check 'S unknown verdict'          (Resolve-CaseState -RunJson (New-RunJsonStub 'unknown' $false)).State 'UNTRUSTED:unknown'
Check 'S unseen reason passthrough' (Resolve-CaseState -RunJson (New-RunJsonStub 'weird_new' $false)).State 'UNTRUSTED:weird_new'
Check 'S missing run.json'         (Resolve-CaseState -RunJson $null).State 'NO_RUN_JSON'
Check 'S missing run.json terminal' (Resolve-CaseState -RunJson $null).Terminal 'missing'
# The S98 shape end to end: api_error + no output must never read as a pass.
Check 'S S98 shape is not OK'      (Resolve-CaseState -RunJson (New-RunJsonStub 'api_error' $false) -OutputBytes 0).State 'API_ERROR'

Write-Host "`n=== T. S97 shape: api_error AFTER the page was written must not be retried ==="
# Real case. S97 wrote 20,853 bytes / 466 lines to out.html, the Write tool_result came
# back OK, and only then the gateway 524'd nine times and the run ended on api_error.
# A retry clears the case dir, which would delete that page.
Check 'T big output counts as complete' (Test-OutputLikelyComplete -HasOutput $true -OutputBytes 20853) 'True'
Check 'T zero bytes is not complete'    (Test-OutputLikelyComplete -HasOutput $false -OutputBytes 0) 'False'
Check 'T stub is not complete'          (Test-OutputLikelyComplete -HasOutput $true -OutputBytes 120) 'False'
$vApi = (New-AttemptResult -Terminal 'api_error' -Status 524).Verdict
Check 'T api_error + no output -> retry' (Test-NeedsRetry -Verdict $vApi -HasOutput $false -OutputLooksComplete $false).Retry 'True'
Check 'T api_error + real page -> NO retry' (Test-NeedsRetry -Verdict $vApi -HasOutput $true -OutputLooksComplete $true).Retry 'False'
Check 'T reason names the case' (Test-NeedsRetry -Verdict $vApi -HasOutput $true -OutputLooksComplete $true).Reason 'api_error_with_complete_output'

$rj = Join-Path $root 'gate_s97.json'
$script:s97Count = 0
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'S97' -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n); $script:s97Count++
    New-AttemptResult -Terminal 'api_error' -Status 524 -HasOutput $true -Bytes 20853 -Ms 2103500
}
$d = Read-RunJson $rj
Check 'T driver made exactly 1 attempt' $script:s97Count 1
Check 'T driver stop reason' $o.StopReason 'api_error_with_complete_output'
Check 'T output survives in run.json' $d.hasOutput 'True'
Check 'T outputBytes recorded' $d.outputBytes 20853
Check 'T still untrusted (api_error is not success)' $d.trusted 'False'
Check 'T retries empty (no attempt was abandoned)' (@($d.retries).Count) 0

Write-Host "`n=== U. Get-ServedModelInfo: the CLI's declared model is not the served model ==="
# Every run measured here asks for opus (init + modelUsage say claude-opus-5[1M]) while
# every assistant event says deepseek-v4.1-flash. Recording both per case makes that
# traceable without re-reading an 11MB stream. Diagnostic only -- never a pass/fail input.
$mf = Join-Path $root 'model_a.jsonl'
$lines = @(
    '{"type":"system","subtype":"init","model":"claude-opus-5[1M]","cwd":"C:\\tmp\\bb\\SXX"}'
    '{"type":"assistant","message":{"model":"deepseek-ai/deepseek-v4.1-flash","content":[]}}'
    '{"type":"assistant","message":{"model":"deepseek-ai/deepseek-v4.1-flash","content":[]}}'
    '{"type":"result","subtype":"success","terminal_reason":"completed","is_error":false,"modelUsage":{"claude-opus-5[1M]":{}}}'
)
[System.IO.File]::WriteAllText($mf, ($lines -join "`n"), (New-Object System.Text.UTF8Encoding($false)))
$mi = Get-ServedModelInfo -StreamPath $mf
Check 'U init model read' $mi.InitModel 'claude-opus-5[1M]'
Check 'U served model read' $mi.ServedModel 'deepseek-ai/deepseek-v4.1-flash'
Check 'U assistant events counted' $mi.AssistantEvents 2
Check 'U mismatch flagged' $mi.Mismatch 'True'

# A run where they agree must not be flagged.
$mf2 = Join-Path $root 'model_b.jsonl'
$lines2 = @(
    '{"type":"system","subtype":"init","model":"claude-opus-5[1M]"}'
    '{"type":"assistant","message":{"model":"claude-opus-5[1M]","content":[]}}'
)
[System.IO.File]::WriteAllText($mf2, ($lines2 -join "`n"), (New-Object System.Text.UTF8Encoding($false)))
Check 'U matching models not flagged' (Get-ServedModelInfo -StreamPath $mf2).Mismatch 'False'
Check 'U missing stream returns empty' (Get-ServedModelInfo -StreamPath (Join-Path $root 'nope.jsonl')).ServedModel ''

Write-Host "`n=== V. no_result WITH a complete page: S99 must keep its 23,204B file ==="
# S99 has no result event at all and a complete 459-line page ending in </body></html>.
# Retrying would clear the case dir and delete it.
$vNo = (New-AttemptResult -Terminal 'no_result').Verdict
Check 'V no_result + no output -> retry' (Test-NeedsRetry -Verdict $vNo -HasOutput $false -OutputLooksComplete $false).Retry 'True'
Check 'V no_result + complete page -> NO retry' (Test-NeedsRetry -Verdict $vNo -HasOutput $true -OutputLooksComplete $true).Retry 'False'
Check 'V reason names the case' (Test-NeedsRetry -Verdict $vNo -HasOutput $true -OutputLooksComplete $true).Reason 'no_result_with_complete_output'
# A no_result WITHOUT output is the real "nothing happened" case (runner died early) and
# must still retry.
Check 'V no_result + tiny stub -> retry' (Test-NeedsRetry -Verdict $vNo -HasOutput $true -OutputLooksComplete $false).Retry 'True'

$rj = Join-Path $root 'gate_s99.json'
$script:vCount = 0
$o = Invoke-AttemptLoop -RunJsonPath $rj -CaseId 'S99' -RetryDelaySec @(0) -OnSleep {} -AttemptFn {
    param($n); $script:vCount++
    New-AttemptResult -Terminal 'no_result' -HasOutput $true -Bytes 23204 -Ms 3600000
}
$d = Read-RunJson $rj
Check 'V driver made 1 attempt' $script:vCount 1
Check 'V stop reason' $o.StopReason 'no_result_with_complete_output'
Check 'V output preserved' $d.outputBytes 23204
Check 'V still untrusted' $d.trusted 'False'

Write-Host ("`n===== " + $pass + " passed, " + $fail + " failed =====")
Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue
if ($fail -gt 0) { exit 1 }
