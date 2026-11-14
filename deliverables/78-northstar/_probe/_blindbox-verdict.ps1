# Terminal-reason reader + retry decision for the blind-box sandbox runner.
#
# Deliberately pure: no ACL work, no scheduled task, no process launch, no claude.exe.
# Everything here can be unit-tested against fabricated stream.jsonl files, which is
# the only way to test retry logic without burning 4 hours of gateway time.
#
# Measured vocabulary of "terminal_reason" across the 14 streams on this machine
# (C:\tmp\bb\S04..S99, full-file scan, not a prefix):
#   "completed"   10 cases
#   "api_error"    5 cases
# Nothing else has ever appeared. The value for a GOOD run is "completed", not
# "success" -- see Resolve-TerminalReason for why run.json still says "success".

# --- encoding -----------------------------------------------------------------
# Every read here goes through .NET with an explicit UTF8 encoding. Reason, measured:
# PowerShell 5.1's Get-Content without -Encoding uses the ANSI code page, so any line
# containing non-ASCII text gets mangled, and ConvertFrom-Json then throws a
# "invalid object" / unexpected-end-of-string error at the position of the first
# non-ASCII character. 5 of the 14 real streams (S15, S22, S29, S32, S35)
# fail that way -- all of them SUCCESSFUL runs whose final reply contains Chinese.
# A reader that treats "could not parse" as "no result" would have marked those five
# as untrusted and retried them, deleting five complete 20-40KB pages.
# Get-Content -Encoding UTF8 fixes correctness but took 4.2-8.6s on the 26MB stream;
# the StreamReader path below reads the same file in 186ms.

function Read-ResultLines {
    # Returns the raw text of every line that could hold a top-level result event.
    # Two modes: a byte-level tail read (fast, used first) and a full line-by-line
    # scan (slow but complete, used when the tail has nothing).
    param(
        [Parameter(Mandatory=$true)][string]$StreamPath,
        [int]$TailBytes = 400000,
        [switch]$Full
    )
    $pat = '"type"\s*:\s*"result"'
    $hits = New-Object System.Collections.ArrayList
    $mode = 'tail'

    if (-not $Full) {
        # Byte-level tail. Reading bytes and decoding explicitly avoids both the ANSI
        # code-page bug and the cost of line-splitting a 26MB string.
        $fs = $null
        try {
            $fs = [System.IO.File]::Open($StreamPath, 'Open', 'Read', 'ReadWrite')
            $len = $fs.Length
            if ($len -gt 0) {
                $want = [Math]::Min($TailBytes, $len)
                $fs.Seek(-$want, [System.IO.SeekOrigin]::End) | Out-Null
                $buf = New-Object byte[] $want
                $read = 0
                while ($read -lt $want) {
                    $n = $fs.Read($buf, $read, $want - $read)
                    if ($n -le 0) { break }
                    $read += $n
                }
                $text = [System.Text.Encoding]::UTF8.GetString($buf, 0, $read)
                $lines = $text -split "`r?`n"
                # If we started mid-file, the first fragment is a partial line: drop it.
                if ($len -gt $TailBytes -and $lines.Count -gt 1) { $lines = $lines[1..($lines.Count - 1)] }
                foreach ($l in $lines) { if ($l -match $pat) { [void]$hits.Add($l) } }
            }
        } catch {
            $hits.Clear()
        } finally {
            if ($fs) { $fs.Close() }
        }
    }

    if ($Full -or $hits.Count -eq 0) {
        $mode = 'full'
        $hits.Clear()
        $sr = $null
        try {
            # Line-by-line so the whole 26MB never has to exist as one string.
            # Measured: 74,200 lines / 26MB in 1.2s.
            $sr = New-Object System.IO.StreamReader($StreamPath, [System.Text.Encoding]::UTF8)
            while ($null -ne ($line = $sr.ReadLine())) {
                if ($line -match $pat) { [void]$hits.Add($line) }
            }
        } catch {
            # A locked or vanished file is not an exception the caller should have to
            # handle; report "nothing found" and let the caller classify no_result.
        } finally {
            if ($sr) { $sr.Close() }
        }
    }
    return @{ Lines = $hits.ToArray(); Mode = $mode }
}

function ConvertTo-ResultObject {
    # Parse a candidate line and keep it only if `type` is a TOP-LEVEL field equal to
    # "result". The regex alone is not enough: an assistant message that merely
    # MENTIONS the string "type":"result" in its body would otherwise be counted as a
    # finished run. That is the same class of defect as grep -c '524' matching UUIDs.
    param([string]$Line)
    if (-not $Line) { return $null }
    $o = $null
    try { $o = $Line | ConvertFrom-Json -ErrorAction Stop } catch { return $null }
    if ($null -eq $o) { return $null }
    if ($o.PSObject.Properties.Name -notcontains 'type') { return $null }
    if ($o.type -ne 'result') { return $null }
    return $o
}

function Get-StreamVerdict {
    # Facts only, no judgement. Reads the LAST top-level type=result event.
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$StreamPath,
        [int]$TailBytes = 400000
    )
    $v = [ordered]@{
        StreamPath        = $StreamPath
        StreamExists      = $false
        StreamBytes       = 0
        HasResult         = $false
        ResultLineCount   = 0
        TerminalReasonRaw = $null
        ApiErrorStatus    = $null
        StopReason        = $null
        IsError           = $null
        EventDurationMs   = $null
        ScanMode          = 'none'
    }
    if (-not (Test-Path -LiteralPath $StreamPath)) { return [pscustomobject]$v }
    $v.StreamExists = $true
    $v.StreamBytes = (Get-Item -LiteralPath $StreamPath).Length
    if ($v.StreamBytes -eq 0) { return [pscustomobject]$v }

    $read = Read-ResultLines -StreamPath $StreamPath -TailBytes $TailBytes
    $v.ScanMode = $read.Mode
    $objs = New-Object System.Collections.ArrayList
    foreach ($l in $read.Lines) {
        $o = ConvertTo-ResultObject -Line $l
        if ($o) { [void]$objs.Add($o) }
    }
    $v.ResultLineCount = $objs.Count
    if ($objs.Count -eq 0) { return [pscustomobject]$v }

    # Last one wins. A re-run that appended to an old stream holds two result events;
    # the earlier one describes a session that is already over (S18 and S29 each hold
    # two, which is the documented concatenation contamination).
    $last = $objs[-1]
    $props = $last.PSObject.Properties.Name
    $v.HasResult = $true
    if ($props -contains 'terminal_reason') { $v.TerminalReasonRaw = $last.terminal_reason }
    if ($props -contains 'stop_reason')     { $v.StopReason = $last.stop_reason }
    if ($props -contains 'duration_ms')     { $v.EventDurationMs = $last.duration_ms }
    if ($props -contains 'is_error')        { $v.IsError = [bool]$last.is_error }
    if ($props -contains 'api_error_status') {
        $st = $last.api_error_status
        # Observed as JSON null (S04, S21), as absent, and as an integer (500, 524).
        # Keep null distinct from 0: a genuine status of 0 must not read as "no status".
        if ($null -ne $st -and "$st".Trim() -ne '') {
            $n = 0
            if ([int]::TryParse("$st", [ref]$n)) { $v.ApiErrorStatus = $n }
        }
    }
    return [pscustomobject]$v
}

function Resolve-TerminalReason {
    # Canonical vocabulary written to run.json:
    #   success | api_error | timeout | no_result | unknown | <raw passthrough>
    #
    # Why map "completed" -> "success": the CLI's raw value for a good run is
    # "completed" (10/10 good cases measured), while the acceptance criterion for this
    # harness is `terminalReason === 'success'`. run.json stores the canonical value AND
    # the raw one, so neither side has to guess which word the producer emits.
    param($Verdict, [switch]$TimedOut)

    if (-not $Verdict.HasResult) {
        if ($TimedOut) { return 'timeout' }
        return 'no_result'
    }
    $raw = $Verdict.TerminalReasonRaw
    # S97 and S98 both carry subtype="success" AND is_error=true AND
    # terminal_reason="api_error". Whoever trusts `subtype` sees success. is_error=true
    # wins over every other field.
    if ($Verdict.IsError -eq $true) { return 'api_error' }
    if ($raw -eq 'completed') { return 'success' }
    if ($raw -eq 'api_error') { return 'api_error' }
    if ([string]::IsNullOrEmpty($raw)) { return 'unknown' }
    return [string]$raw
}

function Test-NeedsRetry {
    # Single source of truth for "do we run this case again?". The runner and the tests
    # both call this, so the rule that decides is the rule that gets tested.
    param(
        $Verdict,
        [switch]$TimedOut,
        [switch]$RetryOnTimeout,
        [bool]$HasOutput = $false,
        # Set when a sizeable html already exists (see Test-OutputLikelyComplete).
        [bool]$OutputLooksComplete = $false
    )
    $canon = Resolve-TerminalReason -Verdict $Verdict -TimedOut:$TimedOut

    if ($canon -eq 'success')   { return @{ Retry = $false; Reason = 'trusted' } }
    if ($canon -eq 'api_error') {
        # S97: page written and Write acknowledged, then nine 524s, then api_error.
        # Retrying means clearing the case directory, which deletes that page. Losing a
        # real artifact to re-roll a gateway coin is worse than keeping an untrusted file
        # for a human to look at, so this stops -- clearly labelled, output preserved.
        if ($OutputLooksComplete) {
            return @{ Retry = $false; Reason = 'api_error_with_complete_output' }
        }
        return @{ Retry = $true; Reason = 'api_error' }
    }
    if ($canon -eq 'no_result') {
        # "No result event" means the stream never got its final line -- the run was cut
        # short, not that nothing happened. S99 is the case: no result event at all, and a
        # complete 23,204B / 459-line page ending in </body></html>. Clearing the case dir
        # to retry would delete a finished artifact. So an existing page is kept and the
        # case is reported for a human, exactly like S97.
        if ($OutputLooksComplete) {
            return @{ Retry = $false; Reason = 'no_result_with_complete_output' }
        }
        return @{ Retry = $true; Reason = 'no_result' }
    }
    if ($canon -eq 'timeout') {
        # A timeout is NOT the same failure as an api_error. api_error means claude.exe
        # exited and nothing more will arrive; a timeout means we stopped watching while
        # it was still working (S99 kept writing to a 13MB stream and did produce a 23KB
        # page). Re-running that discards real work and pays full price again, so it is
        # opt-in, not default.
        if ($RetryOnTimeout) { return @{ Retry = $true; Reason = 'timeout' } }
        return @{ Retry = $false; Reason = 'timeout_not_retried' }
    }
    # A terminal_reason we have never seen must not be silently retried or silently
    # accepted: stop and make a human look.
    return @{ Retry = $false; Reason = ('unrecognized:' + $canon) }
}

function Test-OutputLikelyComplete {
    # "A file exists" is not "the work is done". S97 is the case that makes this matter:    # it wrote 20,853 bytes / 466 lines to out.html, the Write tool_result came back OK,
    # and only THEN the gateway 524'd for nine retries and the run ended on api_error.
    # Under a naive "api_error -> clear and retry" rule that real page gets deleted and
    # four minutes of work is repaid for.
    #
    # Heuristic: a served .html that is not a stub, and whose last tool call was a
    # successful Write of that file. Both conditions are observable without the model.
    param(
        [bool]$HasOutput,
        [long]$OutputBytes,
        [int]$MinBytes = 2000
    )
    if (-not $HasOutput) { return $false }
    if ($OutputBytes -lt $MinBytes) { return $false }
    return $true
}

function New-RunJsonDocument {
    # Builds the run.json object. Extracted so the test asserts against the SAME
    # serialisation the runner writes, not a copy of it that can drift.
    param(
        [string]$CaseId,
        [int]$Attempt,
        [string]$TerminalReason,
        $ApiErrorStatus,
        $StopReason,
        [long]$DurationMs,
        [bool]$HasOutput,
        [long]$OutputBytes,
        [string]$TerminalReasonRaw,
        $Retries,
        [string]$OutFile,
        [datetime]$StartedAt,
        [string]$AbortReason,
        $ModelInfo,
        [string]$Runner = 'v2'
    )
    $doc = [ordered]@{
        id                = $CaseId
        attempt           = $Attempt
        # Only 'success' means this run is trustworthy. Everything else is untrusted but
        # recorded as it actually was -- never rewritten into a pass.
        terminalReason    = $TerminalReason
        terminalReasonRaw = $TerminalReasonRaw
        apiErrorStatus    = if ($null -eq $ApiErrorStatus -or "$ApiErrorStatus" -eq '') { $null } else { [int]$ApiErrorStatus }
        stopReason        = if ($null -eq $StopReason -or "$StopReason" -eq '') { $null } else { [string]$StopReason }
        durationMs        = $DurationMs
        hasOutput         = $HasOutput
        outputBytes       = $OutputBytes
        trusted           = ($TerminalReason -eq 'success')
        timedOut          = ($TerminalReason -eq 'timeout')
        maxAttempts       = $Attempt
        retryCount        = @($Retries).Count
        outFile           = $OutFile
        retries           = @($Retries)
        modelInit         = $ModelInfo.InitModel
        modelServed       = $ModelInfo.ServedModel
        modelMismatch     = $ModelInfo.Mismatch
        startedAt         = $StartedAt.ToString('o')
        finishedAt        = (Get-Date).ToString('o')
        runner            = $Runner
    }
    if ($AbortReason) { $doc.abortReason = $AbortReason }
    return $doc
}

function Invoke-AttemptLoop {
    # The retry driver: decides how many attempts happen and what run.json ends up
    # saying. This is the single implementation -- the runner calls it, and the
    # integration test calls it with a fake attempt function. Earlier drafts had the
    # test carry its own copy of this loop; a copy cannot fail, so it cannot catch a
    # regression in the real loop.
    #
    # $AttemptFn is called with the attempt number and must return a hashtable shaped:
    #   @{ Started; TimedOut; Verdict; Canonical; HasOutput; OutputBytes; DurationMs }
    param(
        [Parameter(Mandatory=$true)][scriptblock]$AttemptFn,
        [Parameter(Mandatory=$true)][string]$RunJsonPath,
        [string]$CaseId = '',
        [string]$OutFile = '',
        [int]$MaxRetries = 2,
        [int[]]$RetryDelaySec = @(30, 60),
        [switch]$RetryOnTimeout,
        # Called before each sleep so the caller can do per-retry machine work
        # (re-applying the Deny ACE) and refuse to continue if it fails.
        [scriptblock]$OnBeforeRetry,
        [scriptblock]$OnSleep
    )
    $retries = New-Object System.Collections.ArrayList
    $attempt = 0
    $final = $null
    $startAll = Get-Date
    while ($true) {
        $attempt++
        $r = & $AttemptFn $attempt
        $final = $r

        if (-not $r.Started) {
            # The environment refused to isolate. Not a model failure, not retryable.
            $doc = New-RunJsonDocument -CaseId $CaseId -Attempt $attempt -TerminalReason 'aborted' `
                -ApiErrorStatus $null -StopReason $null `
                -DurationMs ([long]((Get-Date) - $startAll).TotalMilliseconds) `
                -HasOutput $false -OutputBytes 0 -TerminalReasonRaw $null -Retries @() `
                -OutFile $OutFile -StartedAt $startAll -AbortReason $r.AbortReason
            $doc | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $RunJsonPath -Encoding UTF8
            return @{ Final = $r; Attempts = $attempt; StopReason = ('aborted:' + $r.AbortReason); Aborted = $true; RunJsonPath = $RunJsonPath }
        }

        $decision = Test-NeedsRetry -Verdict $r.Verdict -TimedOut:$r.TimedOut -RetryOnTimeout:$RetryOnTimeout `
            -HasOutput $r.HasOutput `
            -OutputLooksComplete (Test-OutputLikelyComplete -HasOutput $r.HasOutput -OutputBytes $r.OutputBytes)

        # An attempt is listed under `retries` only if another attempt follows it. The
        # final attempt's numbers are the top-level fields, so listing it twice would
        # make `attempt` and `retries.length` silently disagree.
        $willRetry = $decision.Retry -and ($attempt -le $MaxRetries)
        if ($willRetry) {
            [void]$retries.Add([ordered]@{
                attempt        = $attempt
                terminalReason = $r.Canonical
                apiErrorStatus = if ($null -eq $r.Verdict.ApiErrorStatus) { $null } else { [int]$r.Verdict.ApiErrorStatus }
                durationMs     = $r.DurationMs
                hasOutput      = $r.HasOutput
                outputBytes    = $r.OutputBytes
            })
        }

        # Written after EVERY attempt, so a killed parent still leaves a record.
        $doc = New-RunJsonDocument -CaseId $CaseId -Attempt $attempt -TerminalReason $r.Canonical `
            -ApiErrorStatus $r.Verdict.ApiErrorStatus -StopReason $r.Verdict.StopReason `
            -DurationMs $r.DurationMs -HasOutput $r.HasOutput -OutputBytes $r.OutputBytes `
            -TerminalReasonRaw $r.Verdict.TerminalReasonRaw -Retries $retries.ToArray() `
            -OutFile $OutFile -StartedAt $startAll -ModelInfo $r.ModelInfo
        $doc | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $RunJsonPath -Encoding UTF8

        if (-not $decision.Retry) {
            return @{ Final = $final; Attempts = $attempt; StopReason = $decision.Reason; Aborted = $false; RunJsonPath = $RunJsonPath }
        }
        if ($attempt -gt $MaxRetries) {
            return @{ Final = $final; Attempts = $attempt; StopReason = 'retries_exhausted'; Aborted = $false; RunJsonPath = $RunJsonPath }
        }

        if ($OnBeforeRetry) {
            $ok = & $OnBeforeRetry $attempt
            if ($ok -eq $false) {
                # Cannot re-establish isolation -> do not spend another attempt.
                $doc = New-RunJsonDocument -CaseId $CaseId -Attempt $attempt -TerminalReason $r.Canonical `
                    -ApiErrorStatus $r.Verdict.ApiErrorStatus -StopReason $r.Verdict.StopReason `
                    -DurationMs $r.DurationMs -HasOutput $r.HasOutput -OutputBytes $r.OutputBytes `
                    -TerminalReasonRaw $r.Verdict.TerminalReasonRaw -Retries $retries.ToArray() `
                    -OutFile $OutFile -StartedAt $startAll -AbortReason 'deny_not_reapplied'
                $doc | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $RunJsonPath -Encoding UTF8
                return @{ Final = $final; Attempts = $attempt; StopReason = 'aborted:deny_not_reapplied'; Aborted = $true; RunJsonPath = $RunJsonPath }
            }
        }

        $delay = $RetryDelaySec[[Math]::Min($attempt - 1, $RetryDelaySec.Count - 1)]
        if ($OnSleep) { & $OnSleep $delay } elseif ($delay -gt 0) { Start-Sleep -Seconds $delay }
    }
}

function Resolve-CaseState {
    # Maps a run.json to the one label the batch summary prints.
    #
    # This replaced a chain that guessed from file presence plus a `"type":"result"`
    # grep. That guess produced the two failure modes visible in this repo's history:
    #   - a run that died with api_error and wrote nothing scored the same as a run that
    #     simply had not finished yet (S98)
    #   - an existing out.html was enough to call it published, even when the stream had
    #     no result at all -- labelled OK(early) so it read as a success
    # Trust now comes only from terminalReason, and a timeout that did produce a file is
    # a distinct label rather than a quiet pass.
    param(
        $RunJson,          # object from run.json, or $null when the file is missing
        [long]$OutputBytes = 0
    )
    if ($null -eq $RunJson) { return @{ State = 'NO_RUN_JSON'; Trusted = $false; Terminal = 'missing' } }
    $terminal = "$($RunJson.terminalReason)"
    $trusted = ($terminal -eq 'success')
    $state = switch ($terminal) {
        'success'    { 'OK' }
        'timeout'    { if ($OutputBytes -gt 0) { 'TIMEOUT(HAS_OUTPUT)' } else { 'TIMEOUT' } }
        'api_error'  { 'API_ERROR' }
        'no_result'  { 'NO_RESULT' }
        'aborted'    { 'ABORTED' }
        'unknown'    { 'UNTRUSTED:unknown' }
        default      { 'UNTRUSTED:' + $terminal }
    }
    return @{ State = $state; Trusted = $trusted; Terminal = $terminal }
}

function Get-ServedModelInfo {
    # What model did the gateway ACTUALLY serve, as opposed to what the CLI asked for?
    #
    # This exists because the two disagree on every run measured here. The init event
    # and the final modelUsage both say `claude-opus-5[1M]` (the template passes
    # `--model opus`), while every assistant message event carries
    # `"model":"deepseek-ai/deepseek-v4.1-flash"`. The gateway is a local proxy
    # (cc-switch.exe on 127.0.0.1:15721) that rewrites the request, so the CLI's own
    # bookkeeping is not evidence of which model answered.
    #
    # Recording it per case means a suspicious result can be traced to the served model
    # without re-reading an 11MB stream. Not used for any pass/fail decision.
    # MaxLines = 0 means the whole file. Measured cost of a full 74,200-line / 26MB
    # scan: 1.2s, which is nothing next to the 30-40 minutes the run just took, and a
    # capped scan makes AssistantEvents a half-truth (S08 reported 90 of 320 when the
    # cap was 20,000 lines).
    param([Parameter(Mandatory=$true)][string]$StreamPath, [int]$MaxLines = 0)
    $info = [ordered]@{
        InitModel = $null; ServedModel = $null; AssistantEvents = 0; Mismatch = $false
        # 空转检测用的三个字段（2026-11-14 加）。**不参与任何 pass/fail 判断**，
        # 只记录 —— 理由见下面的注释与 _probe/34-s21-rerun.md §七。
        UsageRecords       = 0
        ZeroOutputRecords  = 0
        MissingStopReasons = 0
        ThinkingChars      = 0
        LetMeWriteCount    = 0
    }
    if (-not (Test-Path -LiteralPath $StreamPath)) { return [pscustomobject]$info }
    $sr = $null
    try {
        $sr = New-Object System.IO.StreamReader($StreamPath, [System.Text.Encoding]::UTF8)
        $n = 0
        $served = @{}
        while ($null -ne ($line = $sr.ReadLine())) {
            $n++
            if ($MaxLines -gt 0 -and $n -gt $MaxLines) { break }
            if ($null -eq $info.InitModel -and $line -match '"subtype"\s*:\s*"init"') {
                $m = [regex]::Match($line, '"model"\s*:\s*"([^"]+)"')
                if ($m.Success) { $info.InitModel = $m.Groups[1].Value }
            }
            if ($line -match '"type"\s*:\s*"assistant"') {
                $m = [regex]::Match($line, '"model"\s*:\s*"([^"]+)"')
                if ($m.Success) {
                    $info.AssistantEvents++
                    $served[$m.Groups[1].Value] = 1 + $served[$m.Groups[1].Value]
                }
                # 空转信号：usage 里 output_tokens 恒为 0、stop_reason 缺失、
                # content 只有 thinking 没有 text。S21 实测三项全中（87 分钟零产物）。
                # 但 S99 思考了 188k token 却正常产出，所以「想得久」不是判据，
                # 这组字段只是把事情记下来，不自动刹车。见 _probe/34-s21-rerun.md §七。
                $um = [regex]::Match($line, '"output_tokens"\s*:\s*(\d+)')
                if ($um.Success) {
                    $info.UsageRecords++
                    if ([int]$um.Groups[1].Value -eq 0) { $info.ZeroOutputRecords++ }
                }
                if ($line -notmatch '"stop_reason"\s*:\s*"[^"]+"') { $info.MissingStopReasons++ }
            }
            # thinking 原文长度与「let me write」承诺次数 —— 后者是 S21 的特征指纹：
            # 它说了 61 次「现在就写」，Write 调用 0 次。这个计数不解释任何事，
            # 只在事后回答「这次是空转还是真在干活」。
            if ($line -match '"type"\s*:\s*"thinking"') {
                $tm = [regex]::Match($line, '"thinking"\s*:\s*"((?:[^"\\]|\\.)*)"')
                if ($tm.Success) {
                    $info.ThinkingChars += $tm.Groups[1].Value.Length
                    $info.LetMeWriteCount += ([regex]::Matches($tm.Groups[1].Value, '(?i)let me write')).Count
                }
            }
            # The init event is the first line or two; stop caring about it after a while
            # but keep scanning assistant events up to MaxLines for the served model.
        }
        if ($served.Count -gt 0) {
            $info.ServedModel = @($served.GetEnumerator() | Sort-Object -Property Value -Descending)[0].Key
        }
        if ($info.InitModel -and $info.ServedModel) {
            # Compare the family, not the exact string: "claude-opus-5[1M]" vs
            # "deepseek-ai/deepseek-v4.1-flash" is a mismatch; a bare alias difference
            # within the same family is not.
            $a = ($info.InitModel -split '\[|/|-' | Select-Object -First 1)
            $b = ($info.ServedModel -split '\[|/|-' | Select-Object -First 1)
            $info.Mismatch = ($a -ne $b)
        }
    } catch {
        # Model attribution is diagnostic only; never let it break a run.
    } finally {
        if ($sr) { $sr.Close() }
    }
    return [pscustomobject]$info
}

function Test-WorkerAlive {
    # Liveness decision, extracted so it can be tested without launching claude.exe.
    #
    # The legacy rule was `(Get-Process claude).Count > baseline`. On this machine that
    # is wrong: 22 claude.exe owned by Administrator (the Claude desktop app, at
    # C:\Program Files\WindowsApps\AnthropicPBC.Claude_...\app\Claude.exe) are running
    # right now. So the baseline is 22 and the comparison drifts for reasons that have
    # nothing to do with the sandbox:
    #   - a desktop window opens  -> 23 > 22 -> "worker alive" long after it died
    #   - a desktop window closes -> a live sandbox worker leaves the count at 22,
    #     which is NOT > 22 -> "worker gone" while it is still working
    # The second one is the documented S98 failure (reported dead at 204s, ran 4h).
    # The fix is identity (ExecutablePath == the sandbox copy), not StartTime:
    # StartTime is still unreadable for another user's process without elevation.
    param(
        [int]$IdentityCount,     # claude.exe whose ExecutablePath is the sandbox copy
        [bool]$SeenWorker,       # have we EVER seen one during this attempt?
        [int]$ElapsedSec,
        [int]$WarmupSec = 150,
        [int]$LegacyNow = 0,
        [int]$LegacyBaseline = 0
    )
    if ($IdentityCount -gt 0) {
        return @{ Alive = $true; Mode = 'identity'; Why = 'sandbox exe running' }
    }
    if ($SeenWorker) {
        return @{ Alive = $false; Mode = 'identity'; Why = 'sandbox exe was seen and is gone' }
    }
    if ($ElapsedSec -lt $WarmupSec) {
        # It has not started yet, or cross-user path reads are momentarily unavailable.
        # Declaring it dead here is exactly how S98 was reported as a 204s failure.
        return @{ Alive = $true; Mode = 'warmup'; Why = 'no worker yet, inside warmup' }
    }
    # Paths never became readable; fall back to the old relative-count heuristic and say
    # so, rather than pretending the identity signal worked.
    return @{ Alive = ($LegacyNow -gt $LegacyBaseline); Mode = 'legacy'; Why = 'identity unavailable' }
}
