"""Demo 0.2 资料清洗与入库脚本。

支持 TXT/Markdown/PDF（PDF 需要可选的 pypdf），输出标准化 JSONL，
后续可直接替换为向量库写入，不影响业务接口。
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def read_text(path: Path) -> str:
    if path.suffix.lower() in {".txt", ".md", ".markdown"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    if path.suffix.lower() == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("PDF 解析需要安装 pypdf") from exc
        return "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
    raise ValueError(f"不支持的文件类型: {path.suffix}")


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunks(text: str, size: int = 800, overlap: int = 80) -> list[str]:
    if size <= overlap:
        raise ValueError("size 必须大于 overlap")
    out = []
    start = 0
    while start < len(text):
        part = text[start : start + size].strip()
        if part:
            out.append(part)
        start += size - overlap
    return out


def ingest(source: Path, output: Path) -> int:
    files = [source] if source.is_file() else sorted(p for p in source.rglob("*") if p.suffix.lower() in {".txt", ".md", ".markdown", ".pdf"})
    records = []
    for path in files:
        text = clean_text(read_text(path))
        for index, chunk in enumerate(chunks(text)):
            records.append({"source": str(path), "chunk_index": index, "text": chunk})
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    return len(records)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="清洗课程资料并输出 JSONL")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(f"写入 {ingest(args.source, args.output)} 个文本片段")

