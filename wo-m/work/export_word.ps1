$word=$null;$d=$null
try {
  $word=New-Object -ComObject Word.Application
  $word.Visible=$false
  $word.DisplayAlerts=0
  $d=$word.Documents.Open($args[0],$false,$true)
  $d.ExportAsFixedFormat($args[1],17)
  Write-Output ("PAGES=" + $d.ComputeStatistics(2))
} finally {
  if($d){$d.Close($false)}
  if($word){$word.Quit()}
}
