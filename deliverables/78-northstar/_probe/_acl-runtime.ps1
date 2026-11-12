# Prove the Deny ACL actually blocks the sandbox user at runtime.
# Runs a child process as CodexSandboxOffline via a scheduled task.
$ErrorActionPreference = 'Continue'

$testRoot = 'C:\tmp\acl-verify'
$inner = Join-Path $testRoot 'secret'
Remove-Item $testRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $inner -Force | Out-Null
Set-Content -Path (Join-Path $inner 'answer.txt') -Value 'TOP-SECRET-CONTENT'
# A readable file outside the denied tree, as a control.
$control = 'C:\tmp\acl-verify-control.txt'
Set-Content -Path $control -Value 'CONTROL-OK'

# Make the tree readable by the sandbox user first, then deny it.
icacls $testRoot /grant 'CodexSandboxOffline:(OI)(CI)(RX)' | Out-Null
icacls $testRoot /deny  'CodexSandboxOffline:(OI)(CI)(RX)' | Out-Null
icacls 'C:\tmp' /grant 'CodexSandboxOffline:(OI)(CI)(RX)' | Out-Null

# Script the sandbox user will run.
$probe = 'C:\tmp\acl-probe.txt'
Remove-Item $probe -Force -ErrorAction SilentlyContinue
$probeScript = 'C:\tmp\acl-probe.ps1'
@'
$out = @()
try {
  $c = Get-Content "C:\tmp\acl-verify\secret\answer.txt" -ErrorAction Stop
  $out += "READ_SECRET_OK:$c"
} catch {
  $out += "READ_SECRET_DENIED"
}
try {
  $c = Get-Content "C:\tmp\acl-verify-control.txt" -ErrorAction Stop
  $out += "READ_CONTROL_OK:$c"
} catch {
  $out += "READ_CONTROL_DENIED"
}
$out += "WHOAMI:$(whoami)"
$out | Set-Content "C:\tmp\acl-probe-result.txt"
'@ | Set-Content -Path $probeScript -Encoding UTF8

# Grant the sandbox user write access to C:\tmp so it can drop the result.
icacls 'C:\tmp' /grant 'CodexSandboxOffline:(OI)(CI)(M)' | Out-Null
Remove-Item 'C:\tmp\acl-probe-result.txt' -Force -ErrorAction SilentlyContinue

$taskName = 'AclVerifyProbe'
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$action = "powershell -NoProfile -ExecutionPolicy Bypass -File $probeScript"
schtasks /Create /TN $taskName /TR $action /SC ONCE /ST 23:59 /RU 'CodexSandboxOffline' /RL LIMITED /F | Out-Null
schtasks /Run /TN $taskName | Out-Null
Start-Sleep -Seconds 8
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

Write-Host '=== probe result (as CodexSandboxOffline) ==='
if (Test-Path 'C:\tmp\acl-probe-result.txt') {
  Get-Content 'C:\tmp\acl-probe-result.txt'
} else {
  Write-Host 'NO RESULT FILE - the scheduled task probably failed to run'
}

Write-Host '=== cleanup ==='
icacls $testRoot /remove:d 'CodexSandboxOffline' 2>$null | Out-Null
Remove-Item $testRoot, $control -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $probeScript, 'C:\tmp\acl-probe-result.txt' -Force -ErrorAction SilentlyContinue
Write-Host 'done'
