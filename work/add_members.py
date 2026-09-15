from pathlib import Path
from copy import deepcopy
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SRC = Path(r"C:\Users\d1828\Downloads\智能互动教学平台_SRS_V1.1_需求评审版(1).docx")
OUT = Path(r"C:\Users\d1828\Documents\Codex\2026-09-04\wo-m\outputs\智能互动教学平台_SRS_V1.1_含组员分工.docx")

members = [
    ("董爵毅", "男", "202424120229", "组长"),
    ("陈晋昕", "男", "202424120209", "前端开发"),
    ("刘星宇", "男", "202424120230", "后端开发"),
    ("侯淞耀", "男", "202424120227", "AI开发"),
]

def set_font(run, size=10.5, bold=False, color="000000"):
    run.font.name = "Microsoft YaHei"
    rpr = run._element.get_or_add_rPr()
    rpr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
    rpr.rFonts.set(qn("w:ascii"), "Microsoft YaHei")
    rpr.rFonts.set(qn("w:hAnsi"), "Microsoft YaHei")
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tcPr.append(shd)
    shd.set(qn("w:fill"), fill)

def borders(table, color="D9D9D9"):
    tblPr = table._tbl.tblPr
    b = tblPr.first_child_found_in("w:tblBorders")
    if b is None:
        b = OxmlElement("w:tblBorders")
        tblPr.append(b)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = b.find(qn("w:" + edge))
        if el is None:
            el = OxmlElement("w:" + edge)
            b.append(el)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "6")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)

def set_cell_text(cell, text, size=10, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER, color="000000"):
    cell.text = ""
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(text)
    set_font(r, size, bold, color)

doc = Document(SRC)

# Add an explicit member responsibility section after the existing project scope paragraph.
anchor = None
for p in doc.paragraphs:
    if p.text.strip() == "本 SRS 适用于 Demo 0.2 至 Demo 0.4 的工程开发。范围覆盖教师工作台、学生互动课堂、课程与课堂内容管理、AI 课堂生成、AI 教师问答、测验反馈、知识库基础检索、教师审核、结果查看和基础导出。TTS、ASR、复杂知识图谱、3D 仿真、多人实时课堂和大规模模型训练属于后续规划，不作为当前版本的阻断条件。":
        anchor = p
        break

if anchor is None:
    # Fallback: insert before the first level-2 heading under section 2.
    for p in doc.paragraphs:
        if p.text.strip().startswith("2 总体描述"):
            anchor = p
            break

if anchor is not None:
    newp = OxmlElement("w:p")
    anchor._p.addnext(newp)
    from docx.text.paragraph import Paragraph
    sec = Paragraph(newp, anchor._parent)
    sec.style = doc.styles["Heading 2"]
    sec.paragraph_format.space_before = Pt(10)
    sec.paragraph_format.space_after = Pt(5)
    set_font(sec.add_run("1.3 组员分工"), 12, True)

    # Build through python-docx so the required tblGrid is present, then move it
    # into the intended location in the document body.
    tbl = doc.add_table(rows=5, cols=4)
    table_el = tbl._tbl
    anchor._p.addnext(table_el)
    borders(tbl)
    headers = ["姓名", "性别", "学号", "分工"]
    for i, h in enumerate(headers):
        shade(tbl.rows[0].cells[i], "405C9E")
        set_cell_text(tbl.rows[0].cells[i], h, 9, True, color="FFFFFF")
    for ri, row in enumerate(members, start=1):
        for ci, value in enumerate(row):
            if ri % 2 == 0:
                shade(tbl.rows[ri].cells[ci], "F4F7FC")
            set_cell_text(tbl.rows[ri].cells[ci], value, 9.5)

    desc = OxmlElement("w:p")
    table_el.addnext(desc)
    dp = Paragraph(desc, anchor._parent)
    dp.paragraph_format.space_before = Pt(4)
    dp.paragraph_format.space_after = Pt(6)
    set_font(dp.add_run("分工说明：组长负责需求收敛、任务拆分、进度协调、版本验收和汇报材料；前端开发负责 Vue 3 页面、组件、路由、状态管理及交互体验；后端开发负责 Spring Boot 业务接口、数据模型、权限和持久化；AI 开发负责 FastAPI、LangChain/RAG、模型适配、提示词和 AI 能力验证。"), 9.5)

# Add the same responsibility information to the appendices for traceability.
for p in doc.paragraphs:
    if p.text.strip() == "附录 A 工程目录":
        p.paragraph_format.space_before = Pt(10)
        break

doc.core_properties.title = "智能互动教学平台软件需求规格说明书（含组员分工）"
doc.core_properties.subject = "需求评审版与组员分工"
doc.core_properties.author = "项目组"
doc.save(OUT)
print(OUT)
