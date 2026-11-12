# Runner template v5.
# History: v3's "Output as few words as possible" made the model stop after 456 tokens;
# v4 added the write instruction but left PATH incomplete, so the agent's shell calls
# all failed with "pwsh timed out after 5000ms" and it never wrote out.html.
$runnerLines = @(
    '$ProgressPreference = "SilentlyContinue"'
    '$ErrorActionPreference = "Continue"'
    '$home_ = $args[0]'
    '$work_ = $args[1]'
    '$log = Join-Path $work_ "stream.jsonl"'
    '$errLog = Join-Path $work_ "stderr.txt"'
    '"START " + (Get-Date -Format o) | Set-Content -Path $log -Encoding utf8'
    # PATH must include the real system dirs. Without them claude's internal
    # PowerShell calls fail with "pwsh timed out after 5000ms" and the agent
    # cannot even list the directory. Use the machine+user PATH, prefix bb-bin.
    '$env:PATH = "C:\tmp\bb-bin;" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")'
    '$env:HOME = $home_'
    '$env:USERPROFILE = $home_'
    '$env:ANTHROPIC_API_KEY = "PROXY_MANAGED"'
    '$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:15721"'
    '$env:CLAUDE_CODE_EFFORT_LEVEL = "medium"'
    '$env:TEMP = $work_'
    '$env:TMP = $work_'
    'Set-Location $work_'
    '$msg = "Read task.txt in this directory, then write the finished page to out.html with the Write tool. Do not over-analyze: read the task once, then write out.html in a single Write call. It must be a complete standalone HTML file. Reply with one short sentence afterwards."'
    '$argList = @("-p", $msg, "--model", "opus", "--permission-mode", "acceptEdits", "--output-format", "stream-json", "--verbose")'
    'Add-Content -Path $log -Value "LAUNCHING" -Encoding utf8'
    '$p = Start-Process -FilePath "C:\tmp\bb-bin\claude.exe" -ArgumentList $argList -WorkingDirectory $work_ -RedirectStandardOutput $log -RedirectStandardError $errLog -NoNewWindow -PassThru'
    'Add-Content -Path $errLog -Value ("PID:" + $p.Id) -Encoding utf8'
    '$p.WaitForExit()'
    'Add-Content -Path $errLog -Value ("EXITED code=" + $p.ExitCode + " at " + (Get-Date -Format o)) -Encoding utf8'
)
$runnerLines -join "`r`n" | Set-Content -Path 'C:\tmp\runner-template.ps1' -Encoding ASCII
Write-Host 'runner template v4 written'
