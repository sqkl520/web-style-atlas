# anti-ai-auditor-scripts — 去 AI 味机械扫描脚本与结果记录

> 本文件由 **Anti-AI Auditor 去 AI 味审查 Agent**（即此前 `02-anti-ai-rules.md` 的作者 Anti-AI Rule Officer）维护。
> 用途：为 `09-audit-anti-ai-scores.md` 的全部打分提供机械数据支撑。所有分数必须与这里的数据一致。
> 只读输入：`04-schemes-01-10.md`、`05-schemes-11-20.md`、`06-schemes-21-30.md`。本文件不修改任何方案文件。

## 脚本 S-1｜逐案机械扫描（字数 / HEX / 面积和 / 背景色 / 黑名单 / Emoji / 占位符 / 删减托辞 / 禁用字体 / 结构特征）

```powershell
$ErrorActionPreference = 'Stop'
$base = 'D:\Web\style\deliverables'
$map = [ordered]@{ '04' = '04-schemes-01-10.md'; '05' = '05-schemes-11-20.md'; '06' = '06-schemes-21-30.md' }
$wordlist = @('赋能','解锁','一站式','无缝','颠覆','革命性','极致','助力','闭环','生态','抓手','颗粒度','心智','种草','吊打','碾压','数智化','全链路','沉浸式体验','未来已来','打造','引领','深耕','聚焦','加持','焕新','破圈','打通','沉淀','飞轮','护城河','顶层设计','降本增效','全场景','全周期','一键','黑科技','重新定义','触手可及','开启新篇章')
$fonts = @('Inter','Roboto','Arial','Helvetica','system-ui','-apple-system','BlinkMacSystemFont','Segoe UI','Ubuntu')
$placeholder = @('lorem','ipsum','示例文案','此处填写','待补充','点击这里','文本内容','TBD')
$elision = @('由于篇[幅]','以下省[略]','简要描[述]','不再展[开]','同[上]','参考上[面]')
$out = New-Object System.Collections.Generic.List[string]
foreach($k in $map.Keys){
  $file = Join-Path $base $map[$k]
  $lines = Get-Content -Encoding UTF8 $file
  $starts = @()
  for($i=0; $i -lt $lines.Count; $i++){ if($lines[$i] -match '^### 方案 (\d+)'){ $starts += [pscustomobject]@{ n=[int]$Matches[1]; i=$i } } }
  $out.Add("===== FILE $($map[$k]) : $(($starts | ForEach-Object { $_.n }) -join ',') =====")
  for($s=0; $s -lt $starts.Count; $s++){
    $a = $starts[$s].i
    $b = if($s+1 -lt $starts.Count){ $starts[$s+1].i - 1 } else { $lines.Count - 1 }
    $seg = $lines[$a..$b]
    $txt = ($seg -join "`n")
    $zh = ([regex]::Matches($txt,'[\u4e00-\u9fff]')).Count
    $hexU = @([regex]::Matches($txt,'#[0-9A-Fa-f]{6}') | ForEach-Object { $_.Value.ToUpper() } | Sort-Object -Unique)
    $areaSum = 0; $bg = ''; $colorTxt = ''
    $cs = ($seg | Select-String -Pattern '配色系统' | Select-Object -First 1)
    if($cs){
      $ci = $cs.LineNumber - 1; $cj = $ci + 1
      while($cj -lt $seg.Count -and $seg[$cj] -notmatch '^\s*\*{0,2}\d+\.' ){ $cj++ }
      if($cj -gt $ci){ $colorTxt = ($seg[$ci..([math]::Min($cj-1,$seg.Count-1))] -join "`n") }
      $pcts = @([regex]::Matches($colorTxt,'(\d{1,3})\s*%') | ForEach-Object { [int]$_.Groups[1].Value })
      if($pcts.Count -gt 0){ $areaSum = ($pcts | Measure-Object -Sum).Sum }
      else {
        $am = [regex]::Match($colorTxt,'面积[^0-9]{0,12}(\d{1,3})\s*[/／]\s*(\d{1,3})\s*[/／]\s*(\d{1,3})(?:\s*[/／]\s*(\d{1,3}))?')
        if($am.Success){ $areaSum = [int]$am.Groups[1].Value + [int]$am.Groups[2].Value + [int]$am.Groups[3].Value + (if($am.Groups[4].Success){[int]$am.Groups[4].Value}else{0}) }
      }
      $bgm = [regex]::Match($colorTxt,'背景[^#\n]{0,30}(#[0-9A-Fa-f]{6})')
      if($bgm.Success){ $bg = $bgm.Groups[1].Value.ToUpper() } elseif($hexU.Count -gt 0){ $bg = $hexU[0] }
    }
    $bl = @(); foreach($w in $wordlist){ if($txt.Contains($w)){ $bl += $w } }
    $fn = @(); foreach($w in $fonts){ if($w -match '^[A-Za-z\-]+$'){ if($txt -match ("(?i)(?<![\p{L}])" + [regex]::Escape($w) + "(?![\p{L}])")){ $fn += $w } } else { if($txt -match ("(?i)" + [regex]::Escape($w))){ $fn += $w } } }
    $ph = @(); foreach($w in $placeholder){ if($txt -match ("(?i)" + [regex]::Escape($w))){ $ph += $w } }
    $el = @(); foreach($w in $elision){ if($txt -match $w){ $el += $w } }
    $emojiPair = 0; $bmp = @()
    for($i=0; $i -lt $txt.Length; $i++){
      $c = $txt[$i]
      if([char]::IsHighSurrogate($c) -and ($i+1) -lt $txt.Length -and [char]::IsLowSurrogate($txt[$i+1])){
        $cp = [char]::ConvertToUtf32($c,$txt[$i+1]); if($cp -ge 0x1F000 -and $cp -le 0x1FAFF){ $emojiPair++ }; $i++
      } elseif(([int]$c -ge 0x2600 -and [int]$c -le 0x27BF) -or ([int]$c -ge 0x2B00 -and [int]$c -le 0x2BFF) -or ([int]$c -ge 0x2190 -and [int]$c -le 0x21FF)){
        $bmp += ("U+{0:X4}:{1}" -f [int]$c, $c)
      }
    }
    $grad = ([regex]::Matches($txt,'(?i)(linear-gradient|radial-gradient|conic-gradient|mesh gradient|aurora|blob)')).Count
    $blur = ([regex]::Matches($txt,'(?i)(backdrop-filter|blur\()')).Count
    $radius = @([regex]::Matches($txt,'(?i)(border-radius\s*:\s*[^;,\n]+|(\d{1,4})px\s*圆角|rounded-[\w]+)') | ForEach-Object { $_.Value })
    $rm = ([regex]::Matches($txt,'prefers-reduced-motion')).Count
    $bp = @()
    $ls = ($seg | Select-String -Pattern '布局与网格' | Select-Object -First 1)
    if($ls){
      $li = $ls.LineNumber - 1; $lj = $li + 1
      while($lj -lt $seg.Count -and $seg[$lj] -notmatch '^\s*\*{0,2}\d+\.'){ $lj++ }
      if($lj -gt $li){ $ltxt = ($seg[$li..([math]::Min($lj-1,$seg.Count-1))] -join "`n")
        $bp = @([regex]::Matches($ltxt,'(\d{3,4})\s*px') | ForEach-Object { [int]$_.Groups[1].Value } | Where-Object { $_ -ge 320 } | Sort-Object -Unique) }
    }
    $blS = if($bl.Count -gt 0){ $bl -join ',' } else { '-' }
    $fnS = if($fn.Count -gt 0){ $fn -join ',' } else { '-' }
    $phS = if($ph.Count -gt 0){ $ph -join ',' } else { '-' }
    $elS = if($el.Count -gt 0){ $el -join ',' } else { '-' }
    $bmpS = if($bmp.Count -gt 0){ ($bmp | Select-Object -Unique) -join ',' } else { '-' }
    $bpS = if($bp.Count -gt 0){ $bp -join '/' } else { '-' }
    $radS = if($radius.Count -gt 0){ ($radius | Select-Object -Unique) -join ' ; ' } else { '-' }
    $out.Add(("S{0:00} | zh={1} | hex={2}[{3}] | area={4} | bg={5} | blacklist={6} | fonts={7} | ph={8} | elision={9} | emojiPair={10} | bmp={11} | grad={12} | blur={13} | rm={14} | bp={15} | radius={16}" -f `
      $starts[$s].n, $zh, $hexU.Count, ($hexU -join '/'), $areaSum, $bg, $blS, $fnS, $phS, $elS, $emojiPair, $bmpS, $grad, $blur, $rm, $bpS, $radS))
  }
}
$out -join "`n"
```

## 脚本 S-2｜黑名单词逐条命中（带全局行号，供判决书引用）

```powershell
$base='D:\Web\style\deliverables'
$words=@('赋能','解锁','一站式','无缝','颠覆','革命性','极致','助力','闭环','生态','抓手','颗粒度','心智','种草','吊打','碾压','数智化','全链路','沉浸式体验','未来已来','打造','引领','深耕','聚焦','加持','焕新','破圈','打通','沉淀','飞轮','护城河','顶层设计','降本增效','全场景','全周期','一键','黑科技','重新定义','触手可及','开启新篇章')
foreach($f in @('04-schemes-01-10.md','05-schemes-11-20.md','06-schemes-21-30.md')){
  foreach($w in $words){
    $hits = (Get-Content -Encoding UTF8 (Join-Path $base $f)) | Select-String -Pattern ([regex]::Escape($w)) -SimpleMatch
    foreach($h in $hits){ "$f L$($h.LineNumber) [$w] $($h.Line.Trim().Substring(0,[math]::Min(90,$h.Line.Trim().Length)))" }
  }
}
```

## 脚本 S-3｜禁用字体词边界复核（防 Interlocking 误报）

```powershell
$base='D:\Web\style\deliverables'
foreach($f in @('04-schemes-01-10.md','05-schemes-11-20.md','06-schemes-21-30.md')){
  $lines=Get-Content -Encoding UTF8 (Join-Path $base $f)
  for($i=0;$i -lt $lines.Count;$i++){
    $l=$lines[$i]
    if($l -match '(?i)(?<![\p{L}])inter(?![\p{L}])' -or $l -match '(?i)(roboto|arial|helvetica|system-ui|-apple-system|blinkmacsystemfont|segoe ui)'){ "$f L$($i+1): $($l.Trim().Substring(0,[math]::Min(120,$l.Trim().Length)))" }
  }
}
```

## 脚本 S-4｜全批背景色收敛统计（判定"暖米纸残余"）

```powershell
$base='D:\Web\style\deliverables'
$all=@()
foreach($f in @('04-schemes-01-10.md','05-schemes-11-20.md','06-schemes-21-30.md')){
  $lines=Get-Content -Encoding UTF8 (Join-Path $base $f); $cur=''
  foreach($l in $lines){
    if($l -match '^### 方案 (\d+)'){ $cur=$Matches[1] }
    if($l -match '背景[^#\n]{0,30}(#[0-9A-Fa-f]{6})'){ $all += [pscustomobject]@{Scheme=$cur;BG=$Matches[1].ToUpper();Line=$l.Trim()} }
  }
}
$all | Group-Object BG | Sort-Object Count -Descending | ForEach-Object { "$($_.Name) x$($_.Count) -> $(($_.Group | ForEach-Object { $_.Scheme }) -join ',')" }
```

## 脚本 S-5｜精确逐案抽取（分段修正 + 配色角色 + HSL + 可疑项上下文）

> S-1 有两处需要修正：（一）每个文件最后一个方案的分段会吞掉该文件末尾的"## 自检汇总"附录，导致 S10 / S20 / S30 的字数、HEX 数、字体命中被污染；（二）`#6366F1`、`24px 圆角`、`blur`、`→` 等命中必须区分"实际使用"与"批判性引用"。S-5 以 `^### 方案` 与 `^## ` 双边界切分，并对每个可疑命中输出 ±70 字上下文。

```powershell
$ErrorActionPreference='Stop'
$base='D:\Web\style\deliverables'
$map=[ordered]@{'04'='04-schemes-01-10.md';'05'='05-schemes-11-20.md';'06'='06-schemes-21-30.md'}
$fonts=@('Inter','Roboto','Arial','Helvetica','system-ui','-apple-system','BlinkMacSystemFont','Segoe UI')
function Get-Hue([string]$hex){
  $r=[Convert]::ToInt32($hex.Substring(1,2),16)/255.0; $g=[Convert]::ToInt32($hex.Substring(3,2),16)/255.0; $b=[Convert]::ToInt32($hex.Substring(5,2),16)/255.0
  $mx=[math]::Max($r,[math]::Max($g,$b)); $mn=[math]::Min($r,[math]::Min($g,$b)); $d=$mx-$mn
  if($d -eq 0){ return 0.0 }
  $h=0.0
  if($mx -eq $r){ $h=((($g-$b)/$d) % 6) } elseif($mx -eq $g){ $h=(($b-$r)/$d)+2 } else { $h=(($r-$g)/$d)+4 }
  $h=$h*60.0; if($h -lt 0){ $h+=360.0 }
  return [math]::Round($h,1)
}
function Get-Sat([string]$hex){
  $r=[Convert]::ToInt32($hex.Substring(1,2),16)/255.0; $g=[Convert]::ToInt32($hex.Substring(3,2),16)/255.0; $b=[Convert]::ToInt32($hex.Substring(5,2),16)/255.0
  $mx=[math]::Max($r,[math]::Max($g,$b)); $mn=[math]::Min($r,[math]::Min($g,$b)); $l=($mx+$mn)/2
  if($mx -eq $mn){ return 0.0 }
  $d=$mx-$mn
  if($l -gt 0.5){ return [math]::Round(100.0*$d/(2.0-$mx-$mn),1) } else { return [math]::Round(100.0*$d/($mx+$mn),1) }
}
function Get-Lum([string]$hex){
  $r=[Convert]::ToInt32($hex.Substring(1,2),16); $g=[Convert]::ToInt32($hex.Substring(3,2),16); $b=[Convert]::ToInt32($hex.Substring(5,2),16)
  return [math]::Round(0.2126*$r+0.7152*$g+0.0722*$b,1)
}
foreach($k in $map.Keys){
  $lines=Get-Content -Encoding UTF8 (Join-Path $base $map[$k])
  $starts=@()
  for($i=0;$i -lt $lines.Count;$i++){
    if($lines[$i] -match '^### 方案 (\d+)'){ $starts+=[pscustomobject]@{n=[int]$Matches[1];i=$i} }
    elseif($lines[$i] -match '^## ' -and $starts.Count -gt 0 -and -not $starts[-1].PSObject.Properties['end']){ $starts[-1] | Add-Member -NotePropertyName end -NotePropertyValue ($i-1) }
  }
  for($s=0;$s -lt $starts.Count;$s++){
    $a=$starts[$s].i
    $b=if($starts[$s].PSObject.Properties['end']){$starts[$s].end}else{$lines.Count-1}
    if($s+1 -lt $starts.Count -and ($starts[$s+1].i-1) -lt $b){ $b=$starts[$s+1].i-1 }
    $seg=$lines[$a..$b]; $txt=($seg -join "`n")
    $zh=([regex]::Matches($txt,'[\u4e00-\u9fff]')).Count
    $head=(($seg | Select-Object -First 4) -join ' / ')
    $ls=($seg | Select-String -Pattern '布局与网格|配色系统|字体策略|设计师签名式怪癖' )
    $cs=($seg | Select-String -Pattern '配色系统' | Select-Object -First 1)
    $ctext=''; $pal=@()
    if($cs){
      $ci=$cs.LineNumber-1; $cj=$ci+1
      while($cj -lt $seg.Count -and $seg[$cj] -notmatch '^\s*\*{0,2}\d+\.'){ $cj++ }
      if($cj -gt $ci){ $ctext=($seg[$ci..([math]::Min($cj-1,$seg.Count-1))] -join "`n") }
      foreach($hm in [regex]::Matches($ctext,'#[0-9A-Fa-f]{6}')){
        $hx=$hm.Value.ToUpper()
        $pre=$ctext.Substring([math]::Max(0,$hm.Index-40),[math]::Min(40,$hm.Index))
        $post=$ctext.Substring($hm.Index,$(if($ctext.Length-$hm.Index -gt 60){60}else{$ctext.Length-$hm.Index}))
        $role=''; foreach($rw in @('主色','辅助色','背景色','强调色','底色','Accent')){ if($pre.Contains($rw) -or $post.Contains($rw)){ $role=$rw; break } }
        $pm=[regex]::Match($post,'(\d{1,3})\s*%')
        $pct=if($pm.Success){$pm.Groups[1].Value}else{'?'}
        $pal+=("$role=$hx@$pct%")
      }
    }
    $palU=@($pal | Select-Object -Unique)
    Write-Output "----- S$('{0:00}' -f $starts[$s].n) zh=$zh paletteCount=$(([regex]::Matches($ctext,'#[0-9A-Fa-f]{6}') | ForEach-Object {$_.Value.ToUpper()} | Sort-Object -Unique).Count)"
    Write-Output ("  HEAD: " + ($head -replace "`n",' | '))
    Write-Output ("  PAL:  " + ($palU -join ' ; '))
    if($ctext -match '背景[^#\n]{0,30}(#[0-9A-Fa-f]{6})'){ $bg=$Matches[1].ToUpper(); Write-Output ("  BG:   $bg hue=$(Get-Hue $bg) sat=$(Get-Sat $bg) lum=$(Get-Lum $bg)") }
    foreach($pat in @('#6366F1','(\d{2,3})px 圆角','border-radius','backdrop-filter|blur\(','(?i)(linear-gradient|radial-gradient|conic-gradient|mesh gradient|aurora|blob|噪点球)','待补充|点击这里|示例文案|此处填写|lorem|ipsum','[→↔]')){
      $ms=[regex]::Matches($txt,$pat)
      if($ms.Count -gt 0){
        Write-Output ("  HIT[$pat] x$($ms.Count):")
        $c=0
        foreach($mm in $ms){ if($c -ge 6){break}; $c++
          $st=[math]::Max(0,$mm.Index-70); $ln=[math]::Min(150,$txt.Length-$st)
          Write-Output ("     > " + ($txt.Substring($st,$ln) -replace "`r?`n",' ⏎ ')) }
      }
    }
    foreach($fw in $fonts){
      if($txt -match ("(?i)(?<![\p{L}])" + [regex]::Escape($fw) + "(?![\p{L}])")){
        foreach($mm in [regex]::Matches($txt,("(?i)(?<![\p{L}])" + [regex]::Escape($fw) + "(?![\p{L}])"))){
          $st=[math]::Max(0,$mm.Index-80); $ln=[math]::Min(170,$txt.Length-$st)
          Write-Output ("  FONT[$fw] > " + ($txt.Substring($st,$ln) -replace "`r?`n",' ⏎ ')) } }
    }
    $rm=([regex]::Matches($txt,'prefers-reduced-motion')).Count
    $f12=($seg | Select-String -Pattern '设计师签名式怪癖' | Select-Object -First 1)
    $f12txt=''
    if($f12){ $fi=$f12.LineNumber-1; $fj=[math]::Min($fi+3,$seg.Count-1); $f12txt=(($seg[$fi..$fj]) -join ' ') }
    Write-Output ("  RM=$rm | F12: " + ($f12txt.Substring(0,[math]::Min(200,$f12txt.Length))))
  }
}
```

## 脚本 S-6｜逐案字段摘要（字体 / 关键视觉元素 / 动效 / 可落地要点 / 真实文案）

> 用途：为每案的 R-07 至 R-11（字体）、R-13 与 R-19 至 R-23（视觉元素）、R-35（动效降级）、R-27（真实文案）、R-33（配色论证）提供逐字证据，避免全量通读造成的重复成本。

```powershell
$ErrorActionPreference='Stop'
$base='D:\Web\style\deliverables'
$map=[ordered]@{'04'='04-schemes-01-10.md';'05'='05-schemes-11-20.md';'06'='06-schemes-21-30.md'}
foreach($k in $map.Keys){
  $lines=Get-Content -Encoding UTF8 (Join-Path $base $map[$k])
  $starts=@()
  for($i=0;$i -lt $lines.Count;$i++){
    if($lines[$i] -match '^### 方案 (\d+)'){ $starts+=[pscustomobject]@{n=[int]$Matches[1];i=$i} }
    elseif($lines[$i] -match '^## ' -and $starts.Count -gt 0 -and -not $starts[-1].PSObject.Properties['end']){ $starts[-1] | Add-Member -NotePropertyName end -NotePropertyValue ($i-1) }
  }
  for($s=0;$s -lt $starts.Count;$s++){
    $a=$starts[$s].i
    $b=if($starts[$s].PSObject.Properties['end']){$starts[$s].end}else{$lines.Count-1}
    if($s+1 -lt $starts.Count -and ($starts[$s+1].i-1) -lt $b){ $b=$starts[$s+1].i-1 }
    $seg=$lines[$a..$b]
    Write-Output ("##### S$('{0:00}' -f $starts[$s].n)")
    foreach($fld in @('字体策略','关键视觉元素','动效与交互','可落地要点','反 AI 味风险')){
      $hit=($seg | Select-String -Pattern $fld | Select-Object -First 1)
      if($hit){
        $fi=$hit.LineNumber-1; $fj=$fi+1
        while($fj -lt $seg.Count -and $seg[$fj] -notmatch '^\s*\*{0,2}\d+\.'){ $fj++ }
        $ftxt=(($seg[$fi..([math]::Min($fj-1,$seg.Count-1))]) -join ' ')
        Write-Output ("  [$fld] " + ($ftxt -replace '\s+',' ').Substring(0,[math]::Min(560,($ftxt -replace '\s+',' ').Length)))
      }
    }
    $cp=($seg | Select-String -Pattern '真实上站文案|上站文案' | Select-Object -First 1)
    if($cp){ $ci=$cp.LineNumber-1; $ctx=(($seg[$ci..([math]::Min($ci+2,$seg.Count-1))]) -join ' '); Write-Output ("  [文案] " + ($ctx -replace '\s+',' ').Substring(0,[math]::Min(420,($ctx -replace '\s+',' ').Length))) }
  }
}
```

## 脚本 S-7｜十二字段齐全性与顺序 + "面积和 100" + 断点表述计数

用途：确认每案 D 节十二字段全部存在且顺序递增、字段 3 写出"面积和 100"、字段 5 至少给出两档断点行为。硬尾端取下一个 `### 方案` 或 `## ` 行，避免末案吞掉自检附录（见 09 号文件 A.7 的 E-5／E-6）。

```powershell
$base='D:\Web\style\deliverables'
$map=[ordered]@{'04'='04-schemes-01-10.md';'05'='05-schemes-11-20.md';'06'='06-schemes-21-30.md'}
foreach($k in $map.Keys){
  $lines=Get-Content -Encoding UTF8 (Join-Path $base $map[$k]); $starts=@()
  for($i=0;$i -lt $lines.Count;$i++){
    if($lines[$i] -match '^### 方案 (\d+)'){ $starts+=[pscustomobject]@{n=[int]$Matches[1];i=$i} }
    elseif($lines[$i] -match '^## ' -and $starts.Count -gt 0 -and -not $starts[-1].PSObject.Properties['end']){ $starts[-1] | Add-Member -NotePropertyName end -NotePropertyValue ($i-1) }
  }
  for($s=0;$s -lt $starts.Count;$s++){
    $a=$starts[$s].i
    $b=if($s+1 -lt $starts.Count){ $starts[$s+1].i-1 } elseif($starts[$s].PSObject.Properties['end']){ $starts[$s].end } else { $lines.Count-1 }
    if($starts[$s].PSObject.Properties['end'] -and $starts[$s].end -lt $b){ $b=$starts[$s].end }
    $seg=$lines[$a..$b]
    $f=@()
    foreach($n in 1..12){ $m=($seg | Select-String -Pattern ("^\s*\*{0,2}$n\.\s")).Count; $f += $m }
    $sum=($seg | Select-String -Pattern '面积和\s*为?\s*100').Count
    $bp=([regex]::Matches(($seg -join ' '),'断点|≥\d{3,4}px|<\d{3,4}px')).Count
    Write-Output ("S$('{0:00}' -f $starts[$s].n): fields=" + ($f -join ',') + "  allPresent=" + (@($f | Where-Object { $_ -gt 0 }).Count -eq 12) + "  面积和100=$sum  断点表述=$bp")
  }
}
```

判定要点：`allPresent=True` 且 `面积和100≥1` 且 `断点表述≥2`。若某案 `allPresent=False`，按 02 号文件 §6 的 V-08（结构缺件）核实是否命中。

## 脚本 S-8｜字段 2 机制句 / 字段 10"不适合"计数 / 字段 12 非效率性关键词

用途：抽查三处最容易写成空话的字段——字段 2 是否写出"偷的是…机制"这一类机制级表述、字段 10 是否点出不适用场景、字段 12 的怪癖是否用"不提升效率／无功能"这类非效率口径陈述理由。

```powershell
$base='D:\Web\style\deliverables'
$map=[ordered]@{'04'='04-schemes-01-10.md';'05'='05-schemes-11-20.md';'06'='06-schemes-21-30.md'}
$effWords='不参与|无任何功能|无功能|不影响|不提升|不改善|不表示|不传递|无任何导航作用|不改变|无障碍|不指向|不提供任何信息|降本增效|提升效率|优化性能'
foreach($k in $map.Keys){
  $lines=Get-Content -Encoding UTF8 (Join-Path $base $map[$k]); $starts=@()
  for($i=0;$i -lt $lines.Count;$i++){
    if($lines[$i] -match '^### 方案 (\d+)'){ $starts+=[pscustomobject]@{n=[int]$Matches[1];i=$i} }
    elseif($lines[$i] -match '^## ' -and $starts.Count -gt 0 -and -not $starts[-1].PSObject.Properties['end']){ $starts[-1] | Add-Member -NotePropertyName end -NotePropertyValue ($i-1) }
  }
  for($s=0;$s -lt $starts.Count;$s++){
    $a=$starts[$s].i
    $b=if($s+1 -lt $starts.Count){ $starts[$s+1].i-1 } elseif($starts[$s].PSObject.Properties['end']){ $starts[$s].end } else { $lines.Count-1 }
    $seg=$lines[$a..$b]; $flat=($seg -join ' ')
    $mech=([regex]::Matches($flat,'偷的机制是|偷的是|偷机制不偷外壳')).Count
    $unfit=([regex]::Matches($flat,'不适合')).Count
    $f12=($seg | Select-String -Pattern '签名式怪癖' | Select-Object -First 1)
    $q='(missing)'
    if($f12){ $fi=$f12.LineNumber-1; $fj=$fi+1
      while($fj -lt $seg.Count -and $seg[$fj] -notmatch '^\s*\*{0,2}\d+\.'){ $fj++ }
      $qt=(($seg[$fi..([math]::Min($fj-1,$seg.Count-1))]) -join ' ')
      $q = if($qt -match $effWords){ 'QUIRK-NON-EFF' } else { 'QUIRK-REVIEW' } }
    Write-Output ("S$('{0:00}' -f $starts[$s].n): 机制句=$mech  不适合=$unfit  字段12=$q")
  }
}
```

判定要点：`机制句≥1`、`不适合≥1`、`字段12=QUIRK-NON-EFF`。`QUIRK-REVIEW` 不等于违规，但必须人工读一遍原句，确认它给出的理由不是效率叙事（02 号文件 R-36 与 §6 的 V-07）。

## 结果记录区（运行后由审查 Agent 回填）

- 运行时间与环境、脚本版本、实际命令行，见 `09-audit-anti-ai-scores.md` 附录 A。
- 每案的关键数值（汉字数、HEX 数与面积和、背景色、黑名单命中、Emoji、占位符、删减托辞、禁用字体、断点数）一律以上述脚本输出为准，不允许手工印象替代。
