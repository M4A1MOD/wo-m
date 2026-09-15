from pathlib import Path
import re
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'docs'/'architecture'
FONT='C:/Windows/Fonts/msyh.ttc'

def color(v, default='#ffffff'):
    if not v or v=='none': return None
    if v.startswith('#'): return v
    return default
def style(el):
    out={}
    for part in el.attrib.get('style','').split(';'):
        if ':' in part:
            k,v=part.split(':',1); out[k.strip()]=v.strip()
    for k in ('fill','stroke','stroke-width','font-size','font-weight'):
        if k in el.attrib: out[k]=el.attrib[k]
    return out
def num(v, default=0):
    try:return float(re.sub(r'[^0-9.-]','',str(v)))
    except:return default
def render(path):
    root=ET.parse(path).getroot(); w=int(num(root.attrib.get('width'),1400)); h=int(num(root.attrib.get('height'),900)); scale=1.4
    im=Image.new('RGB',(int(w*scale),int(h*scale)),'white'); dr=ImageDraw.Draw(im)
    classes={}
    for st in root.findall('.//{http://www.w3.org/2000/svg}style'):
        if st.text:
            for name,body in re.findall(r'\.([\w-]+)\{([^}]*)\}',st.text):
                classes[name]={k.strip():v.strip() for k,v in (x.split(':',1) for x in body.split(';') if ':' in x)}
    def walk(el,dx=0,dy=0):
        tag=el.tag.split('}')[-1]; ndx,ndy=dx,dy
        tr=el.attrib.get('transform',''); m=re.search(r'translate\(([-\d.]+)\s*[, ]\s*([-\d.]+)\)',tr)
        if m: ndx+=float(m.group(1)); ndy+=float(m.group(2))
        st={};
        for c in el.attrib.get('class','').split(): st.update(classes.get(c,{}))
        st.update(style(el)); fill=color(st.get('fill')); stroke=color(st.get('stroke')); sw=max(1,int(num(st.get('stroke-width'),1)*scale))
        def P(x,y):return ((num(x)+ndx)*scale,(num(y)+ndy)*scale)
        if tag=='rect':
            x,y=P(el.attrib.get('x',0),el.attrib.get('y',0)); x2=x+num(el.attrib.get('width'))*scale; y2=y+num(el.attrib.get('height'))*scale; rad=num(el.attrib.get('rx'),0)*scale
            dr.rounded_rectangle((x,y,x2,y2),radius=rad,fill=fill,outline=stroke,width=sw)
        elif tag=='circle':
            x,y=P(el.attrib.get('cx'),el.attrib.get('cy')); r=num(el.attrib.get('r'))*scale; dr.ellipse((x-r,y-r,x+r,y+r),fill=fill,outline=stroke,width=sw)
        elif tag=='ellipse':
            x,y=P(el.attrib.get('cx'),el.attrib.get('cy')); rx=num(el.attrib.get('rx'))*scale; ry=num(el.attrib.get('ry'))*scale; dr.ellipse((x-rx,y-ry,x+rx,y+ry),fill=fill,outline=stroke,width=sw)
        elif tag=='polygon':
            pts=[P(*p.split(',')) for p in el.attrib.get('points','').split()]; dr.polygon(pts,fill=fill,outline=stroke)
        elif tag=='path':
            nums=[num(x) for x in re.findall(r'-?\d+(?:\.\d+)?',el.attrib.get('d',''))]
            pts=[P(nums[i],nums[i+1]) for i in range(0,len(nums)-1,2)]
            if len(pts)>=2: dr.line(pts,fill=stroke or '#596b84',width=sw,joint='curve')
        elif tag=='text':
            txt=''.join(el.itertext()).strip(); x,y=P(el.attrib.get('x',0),el.attrib.get('y',0)); fs=int(num(st.get('font-size'),18)*scale); bold=st.get('font-weight') in ('700','bold')
            try:f=ImageFont.truetype(FONT,fs,index=1 if bold else 0)
            except:f=ImageFont.truetype(FONT,fs)
            anchor='mm' if el.attrib.get('text-anchor')=='middle' else 'la'; dr.text((x,y),txt,font=f,fill=fill or '#182230',anchor=anchor)
        for ch in list(el):
            if ch.tag.split('}')[-1] not in ('defs','style','marker'): walk(ch,ndx,ndy)
    walk(root); out=path.with_suffix('.png'); im.save(out,dpi=(180,180)); print(out)

for p in SRC.glob('*.svg'): render(p)
