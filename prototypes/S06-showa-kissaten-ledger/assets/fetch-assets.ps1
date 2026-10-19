$ErrorActionPreference='Continue'
# S06 Showa Kissaten Ledger -- real photograph fetch (Wikimedia Commons API).
# Only public-domain / CC licensed photographs, saved to assets/origin/ as the
# originals for collotype duotone separation.
#
# NOTE 1: this file is deliberately pure ASCII. A .ps1 written as UTF-8 without a BOM
#   is decoded with the machine ANSI codepage by PowerShell; CJK comment bytes can then
#   decode to a backtick and swallow the next line, silently nulling variables.
# NOTE 2: the API now returns thumbnails on thumb.wikimedia.org and appends a
#   ?utm_source=... query string. Both hosts are accepted; the query is stripped.
# NOTE 3: Wikimedia answers more than one request per second per UA with 429.
#   Downloads are paced and backed off; already-downloaded files are skipped.
#   Pass -Force (as an argument, not a param block: param() must precede all code).
$Force = ($args -contains '-Force')
$root='D:\Web\style\prototypes\S06-showa-kissaten-ledger\assets'
$origin=Join-Path $root 'origin'
New-Item -ItemType Directory -Force -Path $origin | Out-Null
$UA=@{ 'User-Agent'='S06-showa-kissaten-ledger-prototype/1.0 (prototype asset fetch; contact: local build)' }
# q = Commons full-text search; t = one exact file title (used when a search picks junk).
$want=@(
  @{n='kissaten-counter'; q='kissaten coffee shop interior Japan'},
  @{n='kissaten-counter'; t='File:Shinwa Honten Branch, Coffee Club, Niigata, Niigata, Japan, August 2024.jpg'},
  @{n='siphon-coffee';   q='siphon coffee maker vacuum pot'},
  @{n='copper-kettle';   t='File:Brewing pour over coffee with kettle and scale.jpg'},
  @{n='hand-grinder';    q='antique coffee grinder hand mill'},
  @{n='cup-and-saucer';  q='coffee cup saucer table cafe'},
  @{n='vinyl-turntable'; q='vinyl record player turntable'},
  @{n='beans-roasting';  q='coffee beans roasting'},
  @{n='ledger-paper';    t='File:Kissaten Menu.jpg'},
  @{n='ledger-paper';    q='old handwritten account ledger paper'}
)
$byName=@{}
foreach($w in $want){ if(-not $byName.ContainsKey($w.n)){ $byName[$w.n]=@() }; $byName[$w.n]+=$w }
$credits=@()
foreach($name in @($byName.Keys)){
  $pick=$null; $usedQuery=''
  foreach($item in $byName[$name]){
    if($item.t){ $usedQuery='title: ' + $item.t
      $api='https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=' + [uri]::EscapeDataString($item.t) + '&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1400'
    } else { $usedQuery='search: ' + $item.q
      $api='https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' + [uri]::EscapeDataString($item.q) + '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1400'
    }
    $r=$null
    for($try=1; $try -le 4 -and -not $r; $try++){
      try { $r=Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 } catch { Write-Output ('  search retry ' + $try + ' ' + $name); Start-Sleep -Seconds 3 }
    }
    Start-Sleep -Milliseconds 800
    if(-not $r){ continue }
    $pages=@($r.query.pages.PSObject.Properties.Value | Where-Object { $_.imageinfo })
    $cands=@()
    foreach($pg in $pages){
      $ii=$pg.imageinfo[0]
      if(-not $ii){ continue }
      $rawSrc=($ii.url -split '\?')[0]
      if($rawSrc -notmatch '\.(jpg|jpeg|png)$'){ continue }
      if($ii.width -lt 900){ continue }
      $thumb=(($ii.thumburl) -split '\?')[0]
      if($thumb -notmatch '^https://(thumb|upload)\.wikimedia\.org/'){ continue }
      $lic=''; $artist=''
      try {
        $lic=[string]$ii.extmetadata.LicenseShortName.value
        $artist=(([string]$ii.extmetadata.Artist.value) -replace '<[^>]+>','') -replace '\s+',' '
      } catch {}
      $cands += [pscustomobject]@{ title=$pg.title; thumb=$thumb; src=$rawSrc; page=('https://commons.wikimedia.org/wiki/' + [uri]::EscapeDataString($pg.title)); w=$ii.width; h=$ii.height; desc=[string]$ii.descriptionurl; lic=$lic; artist=$artist.Trim() }
    }
    if(-not $cands.Count){ continue }
    $pick=$cands | Sort-Object -Property @{Expression={ if($_.lic -match 'Public domain|CC0|No restrictions'){0}else{1} }}, @{Expression={ [Math]::Abs(1400 - [Math]::Min($_.w,1400)) }} | Select-Object -First 1
    if($pick){ break }
  }
  if(-not $pick){ Write-Output ('NO PICK ' + $name); continue }
  $out=Join-Path $origin ($name + '.jpg')
  if((Test-Path $out) -and -not $Force){
    Write-Output ('KEEP ' + $name + '  ' + (Get-Item $out).Length + 'B  ' + $pick.lic + '  ' + $pick.title)
  } else {
    $ok=$false
    for($try=1; $try -le 6 -and -not $ok; $try++){
      try { Invoke-WebRequest -Uri $pick.thumb -OutFile $out -Headers $UA -TimeoutSec 120 -UseBasicParsing; $ok=$true }
      catch { Write-Output ('  dl retry ' + $try + ' ' + $name + ' :: ' + $_.Exception.Message.Substring(0,60)); Start-Sleep -Seconds (3 * $try) }
    }
    Start-Sleep -Seconds 2
    if(-not $ok){ Write-Output ('DL FAIL ' + $name); continue }
    Write-Output ('OK ' + $name + '  ' + (Get-Item $out).Length + 'B  src ' + $pick.w + 'x' + $pick.h + '  ' + $pick.lic + '  ' + $pick.title)
  }
  $credits += [pscustomobject]@{
    file    = $name + '.jpg'
    picked  = $usedQuery
    title   = ($pick.title -replace '^File:','')
    artist  = $pick.artist
    license = $pick.lic
    origin  = $pick.src
    page    = $pick.desc
    width   = $pick.w
    height  = $pick.h
  }
}
$credits | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $root 'credits.json') -Encoding UTF8
Write-Output '--- origin ---'
Get-ChildItem $origin -File | ForEach-Object { $_.Name + '  ' + $_.Length }
