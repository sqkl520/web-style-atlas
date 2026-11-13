# Verify that Start-Process -ArgumentList splits a multi-word prompt unless it is quoted.
# Runs a trivial task so it finishes in tens of seconds. No repo isolation involved.
$ErrorActionPreference = 'Continue'
$work = 'C:\tmp\argtest'
if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $work -Force | Out-Null

$msg = 'Reply with exactly the word BANANA and nothing else.'

# Claude Code resolves its auth from HOME/USERPROFILE, so point both at the sandbox
# home that holds a copy of the admin credentials.
$env:HOME = 'C:\tmp\bb-home'
$env:USERPROFILE = 'C:\tmp\bb-home'
$env:ANTHROPIC_API_KEY = 'PROXY_MANAGED'
$env:ANTHROPIC_BASE_URL = 'http://127.0.0.1:15721'
$env:CLAUDE_CODE_EFFORT_LEVEL = 'low'

foreach ($mode in @('array', 'quoted')) {
    $log = Join-Path $work "$mode.jsonl"
    $err = Join-Path $work "$mode.err"
    if ($mode -eq 'array') {
        $argList = @('-p', $msg, '--output-format', 'stream-json', '--verbose')
        $p = Start-Process -FilePath 'C:\tmp\bb-bin\claude.exe' -ArgumentList $argList `
            -WorkingDirectory $work -RedirectStandardOutput $log `
            -RedirectStandardError $err -NoNewWindow -PassThru
    } else {
        $argLine = '-p "' + $msg + '" --output-format stream-json --verbose'
        $p = Start-Process -FilePath 'C:\tmp\bb-bin\claude.exe' -ArgumentList $argLine `
            -WorkingDirectory $work -RedirectStandardOutput $log `
            -RedirectStandardError $err -NoNewWindow -PassThru
    }
    Write-Host "[$mode] pid=$($p.Id)"
    $p.WaitForExit(180000) | Out-Null
    if (-not $p.HasExited) { $p.Kill(); Write-Host "[$mode] killed after 180s" }
}

Write-Host ''
Write-Host '=== RESULT ==='
foreach ($mode in @('array', 'quoted')) {
    $log = Join-Path $work "$mode.jsonl"
    Write-Host ''
    Write-Host "--- $mode ---"
    if (-not (Test-Path $log)) { Write-Host '  no output'; continue }
    $txt = Get-Content $log -Raw
    $found = $false
    foreach ($line in ($txt -split "`n")) {
        if (-not $line.Trim().StartsWith('{')) { continue }
        try { $j = $line | ConvertFrom-Json } catch { continue }
        if ($j.type -eq 'assistant') {
            foreach ($c in $j.message.content) {
                if ($c.type -eq 'text' -and $c.text.Trim()) {
                    $t = $c.text.Trim()
                    if ($t.Length -gt 150) { $t = $t.Substring(0, 150) }
                    Write-Host ("  TEXT: " + $t)
                    $found = $true
                }
                if ($c.type -eq 'thinking' -and $c.thinking) {
                    $t = $c.thinking.Trim()
                    if ($t.Length -gt 200) { $t = $t.Substring(0, 200) }
                    Write-Host ("  THINK: " + $t)
                    $found = $true
                }
            }
        }
    }
    if (-not $found) { Write-Host '  (no assistant content)' }
    if ((Test-Path $err) -and (Get-Item $err).Length -gt 0) {
        $e = Get-Content $err -Raw
        if ($e.Length -gt 200) { $e = $e.Substring(0, 200) }
        Write-Host ("  STDERR: " + $e)
    }
}
