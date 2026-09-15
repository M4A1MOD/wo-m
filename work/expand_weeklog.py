from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
import re, json
root=Path(__file__).resolve().parent.parent
src=root/'学号_姓名_软件工程专业见习周志-第1周-Demo0.2.docx'
out=root/'outputs/软件工程专业见习周志-第1周-Demo0.2-扩充版.docx'
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def tag(x): return '{'+ns['w']+'}'+x
stats={}
with ZipFile(src) as zin:
    tree=E.fromstring(zin.read('word/document.xml'))
    rows=tree.xpath('//w:body/w:tbl[1]/w:tr',namespaces=ns)
    for idx,name in [(4,'content'),(5,'reflection')]:
        text=(root/f'work/weeklog_{name}.txt').read_text(encoding='utf-8')
        count=len(re.findall(r'[\u3400-\u9fff]',text))
        assert count>=3000,(name,count)
        stats[name]={'chinese_characters':count,'non_whitespace_characters':len(re.sub(r'\s','',text))}
        row=rows[idx]
        for el in row.xpath('./w:trPr/w:cantSplit|./w:trPr/w:trHeight',namespaces=ns): el.getparent().remove(el)
        cell=row.findall(tag('tc'))[1]
        for el in list(cell):
            if el.tag!=tag('tcPr'): cell.remove(el)
        for i,line in enumerate(text.strip().splitlines()):
            p=E.SubElement(cell,tag('p')); pp=E.SubElement(p,tag('pPr'))
            E.SubElement(pp,tag('spacing'),{tag('after'):'100',tag('line'):'300',tag('lineRule'):'auto'})
            E.SubElement(pp,tag('jc'),{tag('val'):'left' if i%2==0 else 'both'})
            if i%2==0: E.SubElement(pp,tag('keepNext'))
            else: E.SubElement(pp,tag('ind'),{tag('firstLine'):'420'})
            r=E.SubElement(p,tag('r')); rp=E.SubElement(r,tag('rPr'))
            E.SubElement(rp,tag('rFonts'),{tag('ascii'):'Times New Roman',tag('hAnsi'):'Times New Roman',tag('eastAsia'):'宋体'})
            E.SubElement(rp,tag('sz'),{tag('val'):'21'})
            if i%2==0:E.SubElement(rp,tag('b'))
            E.SubElement(r,tag('t')).text=line
    with ZipFile(out,'w') as zout:
        for info in zin.infolist():
            zout.writestr(info,E.tostring(tree,xml_declaration=True,encoding='UTF-8',standalone=True) if info.filename=='word/document.xml' else zin.read(info.filename))
with ZipFile(src) as a, ZipFile(out) as b:
    assert all(a.read(n)==b.read(n) for n in a.namelist() if n!='word/document.xml')
print(json.dumps(stats,ensure_ascii=True))
