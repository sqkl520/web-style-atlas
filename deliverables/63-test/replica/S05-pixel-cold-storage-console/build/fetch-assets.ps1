$ErrorActionPreference='Continue'
# S05 Pixel Cold-Storage Console -- real photograph fetch (Wikimedia Commons API).
#
# Selection is by explicit Commons file title, not by search ranking. Reason: with no
# image-capable model in the loop the only honest way to know what a picture shows is the
# file's own documented description, so each slot is tied to a titled Commons photograph
# whose subject is stated by the uploader; alt text is written from that description.
#
# Corrections learned the hard way (all four are in the delivery notes):
#   1) thumburl carries a ?utm_source=... query string -- strip everything from '?'.
#   2) thumbnails are served from BOTH upload.wikimedia.org and thumb.wikimedia.org.
#      Filtering on upload.wikimedia.org alone rejects every modern result ("NO PICK").
#   3) "filetype:bitmap" must be appended to a search string, otherwise Commons returns
#      Internet Archive PDF page thumbs and every candidate is filtered out.
#   4) originals on upload.wikimedia.org do not download from this machine; a thumbnail
#      narrower than the original always lives on thumb.wikimedia.org and does.
#
# ASCII-only on purpose: a UTF-8-without-BOM .ps1 holding CJK comments is decoded in the
# ANSI codepage, the odd byte count eats the next newline, and code silently becomes part
# of a comment. That killed an assignment in the first version of this file.
$root='D:\Web\style\prototypes\S05-pixel-cold-storage-console'
$assets=Join-Path $root 'assets\source'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$UA=@{ 'User-Agent'='S05-prototype-builder/1.0 (cold-storage console prototype)' }

$slots=@(
  @{ n='coldroom';     q='Kleinteilelager'; match='Kleinteilelager' },
  @{ n='colddoor';     t='File:Cold Room Door - Sliding Door.jpg'; w=800 },
  @{ n='pallets';      t='File:Pennsylvania Food Bank (20241017-USDA-FNS-CDP-1037).jpg' },
  @{ n='coolingtower'; t='File:Evaporative Cooling Tower.jpg' },
  @{ n='hvac';         t='File:Cool under pressure- 386th ECES HVAC technicians in action (9047740).jpg' },
  @{ n='engineers';    t='File:Stationary Engineers at the Propulsion Systems Laboratory (grc-1957-c-44352).jpg' },
  @{ n='factory1911';  t='File:Asbestos Factory, circa 1911 - Chesterton, Indiana (23419906645).jpg' }
)

# resolve a slot to a Commons title: exact title lookup, or a bitmap-filtered search
# narrowed by a regex (used for the one title containing a non-ASCII word this ASCII-only
# file cannot carry as a literal)
function Resolve-Title($slot, $headers) {
  if ($slot.t) { return $slot.t }
  $search = $slot.q + ' filetype:bitmap'
  $api='https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' + [uri]::EscapeDataString($search) + '&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|size'
  for($try=1; $try -le 4; $try++){
    try {
      $r=Invoke-RestMethod -Uri $api -Headers $headers -TimeoutSec 60
      foreach($pg in @($r.query.pages.PSObject.Properties.Value | Where-Object { $_.imageinfo })){
        if($pg.title -match $slot.match){ return $pg.title }
      }
      return $null
    } catch { Start-Sleep -Seconds 2 }
  }
  return $null
}

$credits=@()
foreach($slot in $slots){
  $title = Resolve-Title $slot $UA
  if(-not $title){ Write-Output ('TITLE FAIL ' + $slot.n); continue }
  $thumbW = 1100
  if($slot.w){ $thumbW = $slot.w }
  # keep the requested thumb width below the original width: that guarantees a
  # thumb.wikimedia.org URL instead of the un-downloadable original
  $api='https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=' + [uri]::EscapeDataString($title) + '&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=' + $thumbW
  $r=$null
  for($try=1; $try -le 4 -and -not $r; $try++){
    try { $r=Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 } catch { Start-Sleep -Seconds 2 }
  }
  if(-not $r){ Write-Output ('LOOKUP FAIL ' + $slot.n); continue }
  $pg=@($r.query.pages.PSObject.Properties.Value)[0]
  if(-not $pg.imageinfo){ Write-Output ('NO IMAGEINFO ' + $slot.n + '  ' + $pg.title); continue }
  $ii=$pg.imageinfo[0]
  $thumb=($ii.thumburl -split '\?')[0]
  $raw=($ii.url -split '\?')[0]
  $out=Join-Path $assets ($slot.n + '.jpg')
  $ok=$false
  for($try=1; $try -le 4 -and -not $ok; $try++){
    try { Invoke-WebRequest -Uri $thumb -OutFile $out -Headers $UA -TimeoutSec 150 -UseBasicParsing | Out-Null; $ok=$true } catch { Start-Sleep -Seconds 2 }
  }
  if(-not $ok){ Write-Output ('DL FAIL ' + $slot.n + '  ' + $thumb); continue }
  $em=$ii.extmetadata
  $lic=$em.LicenseShortName.value
  $artist=($em.Artist.value -replace '<[^>]+>','')
  $desc=($em.ImageDescription.value -replace '<[^>]+>','')
  $date=''
  if($em.DateTimeOriginal){ $date=$em.DateTimeOriginal.value }
  Write-Output ('OK ' + $slot.n + '  ' + [math]::Round((Get-Item $out).Length/1024) + 'KB  ' + $ii.width + 'x' + $ii.height + '  [' + $lic + ']  ' + $pg.title)
  $credits += [pscustomobject]@{
    file=$slot.n + '.jpg'; slot=$slot.n; title=($pg.title -replace '^File:',''); license=$lic
    artist=($artist -replace '\s+',' ').Trim(); date=($date -replace '\s+',' ').Trim()
    description=(($desc -replace '\s+',' ').Trim()); origin=$raw; page=$ii.descriptionurl
  }
}
$credits | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $root 'assets\credits.json') -Encoding UTF8
Write-Output '--- downloaded ---'
Get-ChildItem $assets -File | ForEach-Object { $_.Name + '  ' + $_.Length }
