$ProgressPreference = "SilentlyContinue"
$ErrorActionPreference = "Continue"
$home_ = $args[0]
$work_ = $args[1]
$log = Join-Path $work_ "stream.jsonl"
$errLog = Join-Path $work_ "stderr.txt"
$pidFile = Join-Path $work_ "agent.pid"
"START " + (Get-Date -Format o) | Set-Content -Path $log -Encoding utf8
$env:PATH = "C:\tmp\bb-bin;" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
$env:HOME = $home_
$env:USERPROFILE = $home_
$env:ANTHROPIC_API_KEY = "PROXY_MANAGED"
$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:15721"
$env:CLAUDE_CODE_EFFORT_LEVEL = "medium"
$env:TEMP = $work_
$env:TMP = $work_
Set-Location $work_
$msg = "Read task.txt in this directory, then write the finished page to out.html with the Write tool. Do not over-analyze: read the task once, then write out.html in a single Write call. It must be a complete standalone HTML file. Reply with one short sentence afterwards."
$argList = @("-p", $msg, "--model", "opus", "--permission-mode", "acceptEdits", "--output-format", "stream-json", "--verbose")
Add-Content -Path $log -Value "LAUNCHING" -Encoding utf8
# The PID goes to its own file, NOT to stderr.txt: stderr.txt is the redirect target
# that Start-Process holds open, so Add-Content to it fails and the marker never lands
# (that is why v1/v2 could not tell whether the agent was alive).
$p = Start-Process -FilePath "C:\tmp\bb-bin\claude.exe" -ArgumentList $argList -WorkingDirectory $work_ -RedirectStandardOutput $log -RedirectStandardError $errLog -NoNewWindow -PassThru
Set-Content -Path $pidFile -Value $p.Id -Encoding ascii
$p.WaitForExit()
Add-Content -Path $pidFile -Value ("EXITED " + $p.ExitCode + " " + (Get-Date -Format o)) -Encoding ascii
