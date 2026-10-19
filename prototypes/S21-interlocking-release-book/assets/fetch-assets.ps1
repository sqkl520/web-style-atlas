# S21 联锁释放簿 · 真实照片抓取（只在构建期跑，产物落 assets/）
# 来源：Wikimedia Commons API。做法照抄 S25-spotcolor-contents-zine/assets/fetch-assets.ps1。
# 关键坑：iiprop=url|size 给的 thumburl 带 ?utm_source=... 查询串，不剥掉下载会失败。
# 这一步只抓候选（每词最多 3 张，落到 assets/_cand/），挑片在 build/pick-and-bake.py 里做，
# 因为"题材落在本案世界里"这件事必须人眼过一遍，不能交给排序。
# 重跑只为补新词：已抓过的文件不重下，metadata 与上一轮 candidates.json 合并。
# 注意：本文件必须存成 UTF-8 with BOM —— Windows PowerShell 5.1 会把无 BOM 的 .ps1 按 ANSI 读，
# 中文注释被拆出半个引号就会解析失败。
$ErrorActionPreference = 'Continue'
$assets = 'D:\Web\style\prototypes\S21-interlocking-release-book\assets'
$cand = Join-Path $assets '_cand'
New-Item -ItemType Directory -Force -Path $cand | Out-Null
$UA = @{ 'User-Agent' = 'S21-prototype-builder/1.0 (prototype build; contact: local)' }

# 题材限定在"调度系统自身"：机械联锁机、扳道杆列、闭塞器、值班室、行车日志、道岔号牌。
# 不取火车、蒸汽、钢轨风景、制服（规格字段 9 第 2 条明令禁）。
$queries = @(
  @{ n = 'interlock';   q = 'mechanical interlocking frame signal box' },
  @{ n = 'hebelbank';   q = 'Stellwerk Hebelbank' },
  @{ n = 'leverframe';  q = 'railway signal lever frame' },
  @{ n = 'block';       q = 'railway block instrument signal box' },
  @{ n = 'register';    q = 'railway train register book' },
  @{ n = 'zugfolge';    q = 'Zugfolgeblatt' },
  @{ n = 'plate';       q = 'railway turnout number plate' },
  @{ n = 'stellwerk';   q = 'Stellwerk mechanisch' },
  @{ n = 'relay';       q = 'railway signal box interior' },
  @{ n = 'telegraph';   q = 'railway telegraph block bell' },
  @{ n = 'logbook';     q = 'train register book railway station' },
  @{ n = 'signalreg';   q = 'signal box train register' },
  @{ n = 'blockinstr';  q = 'block instrument railway' },
  @{ n = 'blockstelle'; q = 'Stellwerk Blockstelle' }
)

$index = @()
$idxPath = Join-Path $cand 'candidates.json'
if (Test-Path $idxPath) { $index = @(Get-Content -Raw -Encoding UTF8 $idxPath | ConvertFrom-Json) }

foreach ($item in $queries) {
  $api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' +
         [uri]::EscapeDataString($item.q) + '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|size&iiurlwidth=1100'
  $r = $null
  for ($try = 1; $try -le 3 -and -not $r; $try++) {
    try { $r = Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 }
    catch { Write-Output ('  search retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 2 }
  }
  if (-not $r) { Write-Output ('SEARCH FAIL ' + $item.n); continue }

  $pages = @($r.query.pages.PSObject.Properties.Value | Where-Object { $_.imageinfo })
  $cands = @()
  foreach ($pg in $pages) {
    $ii = $pg.imageinfo[0]
    if (($ii.url -split '\?')[0] -notmatch '\.(jpg|jpeg|png)$') { continue }
    if ($ii.width -lt 800 -or $ii.height -lt 500) { continue }
    if ($ii.thumburl -notmatch 'wikimedia\.org') { continue }
    $cands += [pscustomobject]@{ title = $pg.title; thumb = $ii.thumburl; src = ($ii.url -split '\?')[0]; w = $ii.width; h = $ii.height }
  }
  if (-not $cands.Count) { Write-Output ('NO PICK ' + $item.n); continue }

  # 取 3 张：只要横构图，分辨率不偏离 1100 太多
  $pick = $cands | Where-Object { $_.w -ge $_.h } | Sort-Object -Property @{ Expression = { [Math]::Abs([Math]::Min($_.w, 1400) - 1100) } } | Select-Object -First 3
  $k = 0
  foreach ($p in $pick) {
    $k++
    $file = $item.n + '-' + $k + '.jpg'
    $out = Join-Path $cand $file
    # thumburl 的查询串必须剥掉，否则下载失败
    $clean = ($p.thumb -split '\?')[0]
    if (-not (Test-Path $out)) {
      $ok = $false
      for ($try = 1; $try -le 2 -and -not $ok; $try++) {
        try { Invoke-WebRequest -Uri $clean -OutFile $out -Headers $UA -TimeoutSec 90 -UseBasicParsing; $ok = $true }
        catch { Write-Output ('  dl retry ' + $try + ' ' + $file); Start-Sleep -Seconds 2 }
      }
      if (-not $ok) { Write-Output ('DL FAIL ' + $file); continue }
    }

    if ($index | Where-Object { $_.file -eq $file }) { continue }

    # 署名四件套：artist / license / origin / page
    $lic = 'unknown'; $artist = ''; $origin = ''
    $api2 = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=' +
            [uri]::EscapeDataString($p.title) + '&prop=imageinfo&iiprop=extmetadata|url'
    try {
      $r2 = Invoke-RestMethod -Uri $api2 -Headers $UA -TimeoutSec 60
      $pg2 = @($r2.query.pages.PSObject.Properties.Value)[0]
      $em = $pg2.imageinfo[0].extmetadata
      $lic = $em.LicenseShortName.value
      $artist = ($em.Artist.value -replace '<[^>]+>', '')
      if ($em.Credit) { $origin = ($em.Credit.value -replace '<[^>]+>', '') }
    } catch { Write-Output ('LIC FAIL ' + $file) }

    $index += [pscustomobject]@{
      file    = $file
      query   = $item.q
      title   = $p.title
      artist  = ($artist -replace '\s+', ' ').Trim()
      license = $lic
      origin  = ($origin -replace '\s+', ' ').Trim()
      source  = $p.src
      page    = 'https://commons.wikimedia.org/wiki/' + [uri]::EscapeDataString(($p.title -replace ' ', '_'))
      w       = $p.w
      h       = $p.h
    }
    Write-Output ('OK ' + $file + '  ' + (Get-Item $out).Length + 'B  ' + $p.w + 'x' + $p.h + '  ' + $lic + '  ' + $p.title)
  }
}
$index | ConvertTo-Json -Depth 4 | Set-Content -Path $idxPath -Encoding UTF8
Write-Output '--- candidates ---'
Get-ChildItem $cand -File | ForEach-Object { $_.Name + '  ' + $_.Length }

