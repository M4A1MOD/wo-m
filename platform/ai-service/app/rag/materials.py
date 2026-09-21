import base64
import binascii
import io
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree

from fastapi import HTTPException
from pydantic import BaseModel, Field
from pypdf import PdfReader

from app.rag.ingest import clean_text, chunks


class MaterialUpload(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
    content_base64: str = Field(max_length=7_000_000)


def parse_upload(payload: MaterialUpload) -> dict:
    suffix = Path(payload.filename).suffix.lower()
    if suffix not in {".txt", ".md", ".pdf", ".pptx"}:
        raise HTTPException(400, "仅支持 TXT、MD、PDF、PPTX；旧版 PPT 请先转换")
    try:
        data = base64.b64decode(payload.content_base64, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(400, "文件编码无效") from None
    if not data or len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "文件不能为空且不得超过 5 MB")
    try:
        if suffix in {".txt", ".md"}:
            text = data.decode("utf-8-sig")
        elif suffix == ".pdf":
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                raise HTTPException(400, "请先解除 PDF 加密")
            if len(reader.pages) > 100:
                raise HTTPException(400, "PDF 最多支持 100 页，请拆分资料")
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            with ZipFile(io.BytesIO(data)) as archive:
                entries = [entry for entry in archive.infolist()
                           if entry.filename.startswith("ppt/slides/slide") and entry.filename.endswith(".xml")]
                if len(entries) > 100 or sum(entry.file_size for entry in entries) > 10 * 1024 * 1024:
                    raise HTTPException(400, "PPTX 内容过大，请拆分资料")
                entries.sort(key=lambda entry: int(Path(entry.filename).stem.removeprefix("slide")))
                texts = []
                for entry in entries:
                    xml = archive.read(entry)
                    if b"<!DOCTYPE" in xml or b"<!ENTITY" in xml:
                        raise ValueError("unsupported XML")
                    root = ElementTree.fromstring(xml)
                    texts.append("\n".join(node.text or "" for node in root.iter(
                        "{http://schemas.openxmlformats.org/drawingml/2006/main}t")))
                text = "\n".join(texts)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "无法解析文件，请检查格式；文本文件需使用 UTF-8 编码") from None
    text = clean_text(text)
    if not text:
        raise HTTPException(400, "未提取到文字；扫描件或纯图片需先进行 OCR")
    selected = text[:8000]
    return {"filename": payload.filename, "status": "parsed", "text": selected,
            "characters": len(text), "truncated": len(text) > len(selected),
            "chunks": len(chunks(selected)), "summary": selected[:160]}
