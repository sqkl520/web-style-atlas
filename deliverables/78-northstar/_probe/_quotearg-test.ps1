# Verify Quote-Arg produces a command line that the child parses back to the exact input.
# Uses a child that dumps argv. Cases include the shapes that broke the naive fix:
#   - embedded double quotes   (38/38 production task.txt contain <img src="...">)
#   - trailing backslash       (eats the following argument)
#   - spaces
#   - backslash before a quote

$ErrorActionPreference = 'Continue'
$work = 'C:\tmp\qatest'
if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $work -Force | Out-Null

# Load the same Quote-Arg used by the runner template.
$tpl = 'D:\Web\style\deliverables\78-northstar\_probe\_runner-template2.ps1'
$src = Get-Content $tpl -Raw
$start = $src.IndexOf('function Quote-Arg')
$end = $src.IndexOf('# Build ONE already-escaped')
$func = $src.Substring($start, $end - $start)
Invoke-Expression $func

$echoer = Join-Path $work 'echo-argv.ps1'
@'
$out = @()
for ($i = 0; $i -lt $args.Count; $i++) { $out += $args[$i] }
$out | Set-Content (Join-Path $PSScriptRoot 'argv.txt') -Encoding UTF8
'@ | Set-Content $echoer -Encoding ASCII

$cases = @(
    @{ name = 'plain';              val = 'simple words here' },
    @{ name = 'embedded quotes';    val = 'write <img src="images/x.jpg"> now' },
    @{ name = 'trailing backslash'; val = 'path is C:\tmp\' },
    @{ name = 'backslash+quote';    val = 'say \"hi\" please' },
    @{ name = 'TRY: chinese quotes'; val = '‘贴左边缘’ and "深度"' }
)

$pass = 0; $fail = 0
foreach ($c in $cases) {
    $q = Quote-Arg $c.val
    $argLine = '-NoProfile -File ' + (Quote-Arg $echoer) + ' ' + $q
    Start-Process -FilePath 'powershell' -ArgumentList $argLine -WorkingDirectory $work -NoNewWindow -Wait -ErrorAction SilentlyContinue
    $argvFile = Join-Path $work 'argv.txt'
    if (-not (Test-Path $argvFile)) { Write-Host ('  ?? ' + $c.name + ' -> no argv'); $fail++; continue }
    $got = (Get-Content $argvFile -Raw).TrimEnd("`r", "`n")
    Remove-Item $argvFile -Force
    $ok = ($got -ceq $c.val)
    if ($ok) { $pass++ } else { $fail++ }
    Write-Host ('  ' + $(if ($ok) { 'OK  ' } else { 'FAIL' }) + ' ' + $c.name)
    if (-not $ok) {
        Write-Host ('        expected: ' + [System.BitConverter]::ToString([System.Text.Encoding]::UTF8.GetBytes($c.val)))
        Write-Host ('        got     : ' + [System.BitConverter]::ToString([System.Text.Encoding]::UTF8.GetBytes($got)))
        Write-Host ('        expected(str): ' + $c.val)
        Write-Host ('        got(str)     : ' + $got)
    }
}

Write-Host ''
Write-Host ("pass=$pass fail=$fail")
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
