from pathlib import Path

p = Path('outputs/智能互动教学平台-demo0.2.html')
s = p.read_text(encoding='utf-8')
assert 'API_BASE' in s and 'localStorage' in s and 'sync();' in s
assert s.count('<script>') == 1 and s.count('</script>') == 1
assert '<title>智学 · 智能互动教学平台 Demo 0.2</title>' in s
print('DEMO02_HTML_OK', len(s))
