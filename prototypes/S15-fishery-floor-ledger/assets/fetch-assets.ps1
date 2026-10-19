$ErrorActionPreference='Continue'
# ---- PITs, kept here because they cost real time on this machine ----
# PIT1: the pwsh runner decodes .ps1 as ANSI/GBK. A comment line whose UTF-8 byte count is
# ODD swallows its trailing newline and merges the NEXT line into the comment -- the
# assignment below would silently never run. Every comment and every output string in this
# file is therefore pure ASCII. Chinese notes live in build/*.py and assets/CREDITS.md.
# PIT2: Commons thumburl carries a ?utm_source=... query string that 404s on download --
# always split on '?' before Invoke-WebRequest (recorded by S25, hit again here).
# PIT3: this runner is Windows PowerShell 5.1, not pwsh 7: -Encoding utf8NoBOM does not exist
# there. credits.json is therefore written WITH a UTF-8 BOM, and Python must read it with
# encoding='utf-8-sig' (build/write-credits.py does).
#
# S15 Fishery Floor Ledger -- real photos from the Wikimedia Commons API.
# Subject: a 1930s Norwegian fishery archive (tracing-paper floor plan of a net store).
# credits.json (title/artist/license/origin/page/source/pixels) lands beside the images;
# assets/CREDITS.md is generated afterwards by build/write-credits.py, never hand-copied.
#
# Layout decision (documented in CREDITS.md section 1):
#   assets/source/fishery-NN-*.jpg  = the untouched Commons thumbnail that was downloaded
#   assets/photo-NN-*.jpg           = the graphite/paper two-level plate baked from it by
#                                     build/bake-plates.py, and the file the page may use.
# Keeping the two apart is what makes re-baking possible: if the bake script overwrote the
# download in place, this script's "on disk and credited => SKIP" rule would later treat a
# duotone plate as a raw source and re-bake it into mud.
#
# Search hardening copied from S14 (v2/v3), because the naive S25 loop kept the wrong hit:
#   a) the search string adds 'filetype:bitmap', which is what excludes the PDF / book scans
#      and .svg crests that otherwise fill the top hits of fishery queries;
#   b) each slot carries a 'must' regex so an irrelevant top hit is rejected and the slot
#      reports NO PICK instead of baking in a wrong photo (a lake steamer is not a fishery);
#   c) the script is idempotent: a file that is on disk AND already credited is skipped, and
#      credits.json is merged, not overwritten;
#   d) a source image may back only ONE shipped file (the source-URL dedupe below), so two
#      slots can never ship the same photograph twice under two names;
#   e) every row records the pixel size measured on the file that is actually on disk, next
#      to the source image size and the requested thumbnail width.
Add-Type -AssemblyName System.Drawing
$assets='D:\Web\style\prototypes\S15-fishery-floor-ledger\assets'
$src=Join-Path $assets 'source'
New-Item -ItemType Directory -Force -Path $src | Out-Null
$creditsPath=Join-Path $assets 'credits.json'
$UA=@{ 'User-Agent'='S15-prototype-builder/1.0 (prototype asset fetch)' }
$THUMBW=1280
$MINW=1100
$queries=@(
  @{n='fishery-01-boat';    q='Norwegian fishing boats moored harbour photograph'; alt='fishing boats Lofoten harbour quay'; must='boat|vessel|fisk|fishery|fishing|sjark|skoyte|lofoten|svolvaer'; not='painting|study|sketch|drawing|oil on|watercolo|postcard|stamp|model|diagram|coat of arms|map|chart|crest'},
  @{n='fishery-02-nets';    q='fishermen mending fishing nets';            alt='fishing net drying rack harbour';        must='net|garn|fisk|fishing|fisher';                     not='network|internet|tennis|butterfly|netherlands'},
  @{n='fishery-03-harbour'; q='Lofoten fishing harbour boats';             alt='Alesund fishing port Norway harbour';    must='harbour|harbor|havn|port|lofoten|fisk|fishing|quay|pier'; not='hotel|airport|container ship|ferry terminal'},
  @{n='fishery-04-plan';    q='ship lines plan drawing hull';              alt='architectural floor plan drawing archive 19th century'; must='plan|drawing|draft|tegning|lines|blueprint|section'; not='floor plan of a house interior photo|3d render|floorplan.js'},
  @{n='fishery-05-stockfish'; q='stockfish drying racks Lofoten';          alt='cod fish drying Norway racks';           must='stockfish|torrfisk|torkfisk|drying|dried|cod|fish|fisk|hjell|rorbuer'; not='recipe|dish|cooking|aquarium'},
  @{n='fishery-06-chart';   q='nautical chart Norwegian coast';            alt='sea chart sounding survey coast 1930';   must='chart|kart|map|survey|nautical|sjo|coast';          not='weather|subway|metro|transit|video game|fantasy'}
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
  $rel='source/' + $item.n + '.jpg'
  $file=$item.n + '.jpg'
  $out=Join-Path $src $file
  $already=@($rows.Keys) | Where-Object { $_ -like ('*' + $file) }
  if((Test-Path $out) -and $already.Count){ Write-Output ('SKIP ' + $item.n + ' (on disk and credited)'); continue }
  # a source image may back only ONE shipped file
  $usedSrc=@{}
  foreach($k in $rows.Keys){
    if($k -notlike ('*' + $file)){ $s=[string]$rows[$k].source; if($s){ $usedSrc[$s]=$true } }
  }
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
      if($ii.width -lt $MINW){ continue }
      if($ii.thumburl -notmatch 'wikimedia\.org'){ continue }
      if(($ii.thumburl -split '\?')[0] -notmatch '\.(jpg|jpeg|png)$'){ continue }
      if($pg.title -notmatch $item.must){ continue }
      if($item.not -and $pg.title -match $item.not){ continue }
      if($usedSrc.ContainsKey($rawSrc)){ continue }
      $cands += [pscustomobject]@{ title=$pg.title; thumb=($ii.thumburl -split '\?')[0]; src=$rawSrc; w=$ii.width; h=$ii.height }
    }
    if($cands.Count){
      # prefer the largest source, capped at 1400 so a 6000px scan is not preferred over a
      # sharp 1400px photo; the extra sort keys make the pick deterministic on ties.
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
  $rows[$rel]=[pscustomobject]@{
    file=$rel; slot=$item.n; title=$pick.title; license=$lic
    artist=($artist -replace '\s+',' ').Trim()
    origin='Wikimedia Commons'
    page=('https://commons.wikimedia.org/wiki/' + [uri]::EscapeDataString(($pick.title -replace ' ','_')))
    source=$pick.src; width=$pick.w; height=$pick.h
  }
}
# Rewrite credits.json from the merged rows, uniform key order, and measure every file on
# disk so the recorded pixel size is the size of the bitmap that is actually shipped.
$final=@()
foreach($f in ($rows.Keys | Sort-Object)){
  $c=$rows[$f]
  $p=Join-Path $assets ($f -replace '/','\')
  $sw=0; $sh=0; $b=0
  if(Test-Path $p){
    $b=(Get-Item $p).Length
    try { $img=[System.Drawing.Image]::FromFile($p); $sw=$img.Width; $sh=$img.Height; $img.Dispose() } catch { Write-Output ('  size read fail ' + $f) }
  }
  $final += [pscustomobject][ordered]@{
    file=$f; slot=$c.slot; title=$c.title; license=$c.license; artist=$c.artist
    origin=$c.origin; page=$c.page; source=$c.source; width=$c.width; height=$c.height
    stored_width=$sw; stored_height=$sh; thumb_request=$THUMBW; bytes=$b
  }
}
$final | ConvertTo-Json -Depth 4 | Set-Content -Path $creditsPath -Encoding UTF8
$wide=@($final | Where-Object { $_.stored_width -ge 900 })
Write-Output ('--- credits.json: ' + $final.Count + ' rows, ' + $wide.Count + ' of them >=900px wide ---')
Write-Output '--- assets/source ---'
Get-ChildItem $src -File | Sort-Object Name | ForEach-Object { $_.Name + '  ' + $_.Length }
