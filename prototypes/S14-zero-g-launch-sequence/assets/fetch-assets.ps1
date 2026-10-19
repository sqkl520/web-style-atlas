$ErrorActionPreference='Continue'
# ---- PITs, kept here because they cost real time on this machine ----
# PIT1: the pwsh runner decodes .ps1 as ANSI/GBK. A comment line whose UTF-8 byte count is
# ODD swallows its trailing newline and merges the NEXT line into the comment -- the
# assignment below would silently never run. All comments in .ps1 files must be ASCII.
# PIT2: Commons thumburl carries a ?utm_source=... query string that 404s on download --
# always split on '?' before Invoke-WebRequest (recorded by S25).
# PIT3: this runner is Windows PowerShell 5.1, not pwsh 7: -Encoding utf8NoBOM does not exist
# there. credits.json is therefore written WITH a UTF-8 BOM, and Python must read it with
# encoding='utf-8-sig' (build/write-credits.py does).
#
# S14 Zero-G Launch Sequence -- real photos from the Wikimedia Commons API.
# credits.json (artist / license / origin / page / source) lands beside the images;
# assets/CREDITS.md is generated afterwards by build/write-credits.py, never hand-copied.
#
# v2 vs v1 (v1 left 5 of its 12 slots empty):
#   a) the search string adds 'filetype:bitmap', which is what excluded the PDF / book scans
#      that filled the top hits of the console, checklist and telemetry queries;
#   b) each slot carries a 'must' regex, so an irrelevant top hit (v1 took whatever came
#      first) is rejected and the slot reports NO PICK instead of baking in a wrong photo;
#   c) the script is idempotent: a file that is on disk AND already credited is skipped, and
#      credits.json is merged, not overwritten;
#   d) every row records the pixel size measured on the file that is actually on disk, next
#      to the source image size, and the thumbnail width that was requested (>=900 enforced
#      as a candidate floor, so a stored bitmap can never come back under 900px wide).
Add-Type -AssemblyName System.Drawing
$assets='D:\Web\style\prototypes\S14-zero-g-launch-sequence\assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$creditsPath=Join-Path $assets 'credits.json'
$UA=@{ 'User-Agent'='S14-prototype-builder/1.0 (prototype asset fetch)' }
$THUMBW=1280
$queries=@(
  @{n='cabin-01-apollo-interior';  q='Apollo lunar module interior cockpit';           alt='Apollo spacecraft cabin interior controls';   must='apollo|lunar module|command module'; not=''},
  @{n='cabin-02-cabin-stowage';    q='Apollo command module stowage compartment';      alt='Skylab interior stowage';                     must='skylab|apollo|stowage|space station'; not=''},
  @{n='cabin-03-flight-checklist'; q='Grumman construction log Apollo lunar module';   alt='handwritten engineering log book page';       must='grumman|construction log|log book'; not='book of mormon|testimony'},
  @{n='cabin-04-telemetry-panel';  q='telemetry station console instrument rack';      alt='NACA control room rocket engine test facility'; must='telemetry|control room|console|instrument'; not=''},
  @{n='cabin-05-cockpit-1960s';    q='aircraft cockpit instrument panel 1960s';        alt='vintage aircraft cockpit';                    must='cockpit|aircraft|chipmunk|panel'; not=''},
  @{n='cabin-06-watch-dial';       q='Omega Speedmaster chronograph dial';             alt='chronograph wristwatch dial';                 must='speedmaster|omega|chronograph|watch'; not='retouche|comparison|before-and-after'},
  @{n='cabin-07-mission-control';  q='Mission Control Center flight controllers Apollo'; alt='mission control room NASA';                  must='mission control|control center|control room'; not=''},
  @{n='cabin-08-switch-panel';     q='aircraft instrument panel switches close up';    alt='toggle switch panel indicator light';         must='switch|panel|instrument|cockpit'; not=''},
  @{n='cabin-09-test-console';     q='A-1 Test Stand night firing';                    alt='A-1 Test Stand work';                         must='test stand'; not=''},
  @{n='cabin-10-panel-gauges';     q='analog flight instruments panel gauges';         alt='vintage airliner cockpit instruments';        must='cockpit|instrument|panel|gauge|airliner'; not=''},
  @{n='cabin-11-spacecraft-hatch'; q='spacecraft hatch interior detail';               alt='Dragon capsule interior';                     must='dragon|spacecraft|hatch|capsule|interior'; not=''},
  @{n='cabin-12-pilot-watch';      q='chronograph watch dial';                         alt='wristwatch dial close up';                    must='dial|watch'; not='retouche|comparison|before-and-after'},
  @{n='pad-01-saturn-v-launch';    q='Saturn V launch Apollo 11 liftoff';              alt='Saturn V rocket launch pad';                  must='saturn|launch'; not=''},
  @{n='pad-02-umbilical-tower';    q='launch umbilical tower service structure';       alt='Apollo launch pad service structure';         must='umbilical|tower|service structure|launch pad'; not=''}
)
$rows=[ordered]@{}
if(Test-Path $creditsPath){
  try{
    $old=Get-Content -Raw -Path $creditsPath | ConvertFrom-Json
    foreach($o in @($old)){ if($o.file){ $rows[[string]$o.file]=$o } }
    Write-Output ('loaded ' + $rows.Count + ' existing credit rows')
  } catch { Write-Output ('existing credits.json unreadable: ' + $_.Exception.Message) }
}
foreach($item in $queries){
  $file=$item.n + '.jpg'
  $out=Join-Path $assets $file
  if((Test-Path $out) -and $rows.Contains($file)){ Write-Output ('SKIP ' + $item.n + ' (on disk and credited)'); continue }
  # v3: a source image may back only ONE shipped file. Without this, the console slot and the
  # test-stand slot both resolved to the same NACA control-room photo and shipped it twice
  # under two names (byte-identical, 252859 B each) -- a duplicate dressed up as two assets.
  $usedSrc=@{}
  foreach($k in $rows.Keys){ if($k -ne $file){ $s=[string]$rows[$k].source; if($s){ $usedSrc[$s]=$true } } }
  $pick=$null
  foreach($q in @($item.q,$item.alt)){
    $api='https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' + [uri]::EscapeDataString($q + ' filetype:bitmap') + '&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|size&iiurlwidth=' + $THUMBW
    $r=$null
    for($try=1; $try -le 3 -and -not $r; $try++){
      try { $r=Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 } catch { Write-Output ('  retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 2 }
    }
    if(-not $r){ Write-Output ('SEARCH FAIL ' + $item.n); continue }
    $cands=@()
    foreach($pg in @($r.query.pages.PSObject.Properties.Value | Where-Object { $_.imageinfo })){
      $ii=$pg.imageinfo[0]
      $rawSrc=($ii.url -split '\?')[0]
      if($rawSrc -notmatch '\.(jpg|jpeg|png|tif|tiff)$'){ continue }
      if($ii.width -lt 900){ continue }
      if($ii.thumburl -notmatch 'wikimedia\.org'){ continue }
      if(($ii.thumburl -split '\?')[0] -notmatch '\.(jpg|jpeg|png)$'){ continue }
      if($pg.title -notmatch $item.must){ continue }
      if($item.not -and $pg.title -match $item.not){ continue }
      if($usedSrc.ContainsKey($rawSrc)){ continue }
      $cands += [pscustomobject]@{ title=$pg.title; thumb=($ii.thumburl -split '\?')[0]; src=$rawSrc; w=$ii.width; h=$ii.height }
    }
    if($cands.Count){
      # Prefer the largest source (capped at 1400 so a 5752px scan is not preferred over a
      # sharp 2000px photo); the two extra keys only exist to make the pick deterministic
      # when several sources tie on the cap, which they did on the test-stand query.
      $pick=$cands | Sort-Object -Property @{Expression={ -[Math]::Min($_.w,1400) }}, @{Expression={ -$_.h }}, @{Expression={ $_.title }} | Select-Object -First 1
      break
    }
    Write-Output ('  no relevant bitmap for [' + $q + ']')
  }
  if(-not $pick){ Write-Output ('NO PICK ' + $item.n); continue }
  $ok=$false
  for($try=1; $try -le 3 -and -not $ok; $try++){
    try { Invoke-WebRequest -Uri $pick.thumb -OutFile $out -Headers $UA -TimeoutSec 90 -UseBasicParsing; $ok=$true } catch { Write-Output ('  dl retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 2 }
  }
  if(-not $ok){ Write-Output ('DL FAIL ' + $item.n); continue }
  $lic='unknown'; $artist=''
  $api2='https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=' + [uri]::EscapeDataString($pick.title) + '&prop=imageinfo&iiprop=extmetadata'
  try { $r2=Invoke-RestMethod -Uri $api2 -Headers $UA -TimeoutSec 60
        $pg2=@($r2.query.pages.PSObject.Properties.Value)[0]
        $lic=$pg2.imageinfo[0].extmetadata.LicenseShortName.value
        $artist=($pg2.imageinfo[0].extmetadata.Artist.value -replace '<[^>]+>','')
  } catch { Write-Output ('LIC FAIL ' + $item.n) }
  $sw=0; $sh=0
  try { $img=[System.Drawing.Image]::FromFile($out); $sw=$img.Width; $sh=$img.Height; $img.Dispose() } catch { Write-Output ('  size read fail ' + $item.n) }
  Write-Output ('OK ' + $item.n + '  ' + (Get-Item $out).Length + 'B  stored ' + $sw + 'x' + $sh + '  source ' + $pick.w + 'x' + $pick.h + '  ' + $lic + '  ' + $pick.title)
  $rows[$file]=[pscustomobject]@{
    file=$file; title=$pick.title; license=$lic
    artist=($artist -replace '\s+',' ').Trim()
    origin='Wikimedia Commons'; page=('https://commons.wikimedia.org/wiki/' + [uri]::EscapeDataString(($pick.title -replace ' ','_')))
    source=$pick.src; width=$pick.w; height=$pick.h
  }
}
# Rewrite credits.json from the merged rows, uniform key order, and measure every file on disk
# so the recorded pixel size is the size of the bitmap that is actually shipped.
$final=@()
foreach($f in ($rows.Keys | Sort-Object)){
  $c=$rows[$f]
  $p=Join-Path $assets $f
  $sw=0; $sh=0; $b=0
  if(Test-Path $p){
    $b=(Get-Item $p).Length
    try { $img=[System.Drawing.Image]::FromFile($p); $sw=$img.Width; $sh=$img.Height; $img.Dispose() } catch { Write-Output ('  size read fail ' + $f) }
  }
  $final += [pscustomobject][ordered]@{
    file=$f; title=$c.title; license=$c.license; artist=$c.artist; origin=$c.origin
    page=$c.page; source=$c.source; width=$c.width; height=$c.height
    stored_width=$sw; stored_height=$sh; thumb_request=$THUMBW; bytes=$b
  }
}
$final | ConvertTo-Json -Depth 4 | Set-Content -Path $creditsPath -Encoding UTF8
$wide=@($final | Where-Object { $_.stored_width -ge 900 })
Write-Output ('--- credits.json: ' + $final.Count + ' rows, ' + $wide.Count + ' of them >=900px wide ---')
Write-Output '--- assets ---'
Get-ChildItem $assets -File | Sort-Object Name | ForEach-Object { $_.Name + '  ' + $_.Length }
