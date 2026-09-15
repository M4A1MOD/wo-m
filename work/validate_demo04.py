from pathlib import Path
import re
import zipfile

root = Path(__file__).resolve().parents[1]
html_path = root / "outputs" / "智能互动教学平台-demo0.4.html"
text = html_path.read_text(encoding="utf-8")
required = ["Demo 0.4", "知识库与图谱", "多模态内容", "多智能体协同课堂", "学习记录与分析", "DeepSeek", "通义千问", "Kimi", "MiniMax", "ZIP 完整课堂包"]
assert all(item in text for item in required)
assert "./assets/" not in text
assert len(re.findall(r'<script type="module">', text)) == 1
assert zipfile.is_zipfile(root / "outputs" / "Demo0.4-导出验收样例.pptx")
assert zipfile.is_zipfile(root / "outputs" / "Demo0.4-课堂包验收样例.zip")
print("DEMO04_VALID", html_path.stat().st_size)
