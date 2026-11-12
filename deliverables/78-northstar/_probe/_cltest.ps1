# Can the sandbox user actually execute the copied claude.exe?
$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$work = 'C:\tmp\cltest'
if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $work -Force | Out-Null
& icacls $work /grant "${user}:(OI)(CI)(M)" /T | Out-Null

# Check the bin dir ACL first.
Write-Host '=== C:\tmp\bb-bin ACL ==='
& icacls 'C:\tmp\bb-bin' | Select-Object -First 5

$script = Join-Path $work 'r.ps1'
$body = @'
$out = @()
$out += "WHOAMI:" + (whoami)
$exe = 'C:\tmp\bb-bin\claude.exe'
$out += "EXE_EXISTS:" + (Test-Path $exe)
try {
    $v = & $exe --version 2>&1
    $out += "VERSION:" + (($v | Out-String).Trim())
} catch {
    $out += "EXEC_ERR:" + $_.Exception.Message
}
$out | Set-Content 'C:\tmp\cltest\result.txt'
'@
Set-Content -Path $script -Value $body -Encoding UTF8
& icacls $script /grant "${user}:(RX)" | Out-Null

$task = 'ClTest'
& schtasks /Delete /TN $task /F 2>$null | Out-Null
& schtasks /Create /TN $task /TR "powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`"" /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F 2>&1 | Out-Null
& schtasks /Run /TN $task 2>&1 | Out-Null
Start-Sleep -Seconds 25
& schtasks /Delete /TN $task /F 2>$null | Out-Null

Write-Host '=== result ==='
$res = Join-Path $work 'result.txt'
if (Test-Path $res) { Get-Content $res } else { Write-Host 'NO RESULT' }
