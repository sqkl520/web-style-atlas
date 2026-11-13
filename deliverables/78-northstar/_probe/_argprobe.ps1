# Minimal repro: does Start-Process -ArgumentList split an array element that contains spaces?
# Uses a child process that just dumps its own argv. No claude involved.

$ErrorActionPreference = 'Continue'
$work = 'C:\tmp\argprobe'
if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $work -Force | Out-Null

$echoer = Join-Path $work 'echo-argv.ps1'
@'
$out = @()
$out += ("argc=" + $args.Count)
for ($i = 0; $i -lt $args.Count; $i++) {
    $out += ("argv[" + $i + "]=" + $args[$i])
}
$out | Set-Content (Join-Path $PSScriptRoot 'argv.txt')
'@ | Set-Content $echoer -Encoding ASCII

function Show-Argv($label) {
    Write-Host ''
    Write-Host ('=== ' + $label + ' ===')
    $f = Join-Path $work 'argv.txt'
    if (Test-Path $f) {
        Get-Content $f | ForEach-Object { Write-Host ('  ' + $_) }
        Remove-Item $f -Force
    } else {
        Write-Host '  (no argv.txt)'
    }
}

$msg = 'Read task.txt in this directory then write out.html'
$pwsh = (Get-Command powershell).Source

# A: array form (what the old runner did)
$argListA = @('-NoProfile', '-File', $echoer, '-p', $msg, '--model', 'opus')
$pA = Start-Process -FilePath $pwsh -ArgumentList $argListA -WorkingDirectory $work -NoNewWindow -PassThru -Wait
Show-Argv 'A) ArgumentList as ARRAY (old style)'

# B: one string with the prompt quoted (new style)
$argLineB = '-NoProfile -File "' + $echoer + '" -p "' + $msg + '" --model opus'
$pB = Start-Process -FilePath $pwsh -ArgumentList $argLineB -WorkingDirectory $work -NoNewWindow -PassThru -Wait
Show-Argv 'B) ArgumentList as STRING with quotes (new style)'

# C: what does .NET actually build for the array form?
Write-Host ''
Write-Host '=== what the array joins to ==='
Write-Host ('  ' + ($argListA -join ' '))
