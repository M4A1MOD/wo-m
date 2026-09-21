import { computed, defineComponent, ref, watch, type PropType } from 'vue'
import type { WhiteboardDocument, WhiteboardElement, WhiteboardPoint } from './demo04-content'

type Tool = 'pen'|'line'|'arrow'|'rect'|'ellipse'|'text'|'eraser'

const cloneDocument = (value:WhiteboardDocument):WhiteboardDocument => JSON.parse(JSON.stringify(value))
const emptyDocument = ():WhiteboardDocument => ({schemaVersion:'zhixue.whiteboard.1',elements:[],background:'grid',updatedAt:''})
const elementId = () => `board-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
const pathData = (points:WhiteboardPoint[]) => points.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
const download = (name:string,blob:Blob) => {const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

export default defineComponent({
  name:'DrawingWhiteboard',
  props:{
    modelValue:{type:Object as PropType<WhiteboardDocument>,required:true},
    aiNotes:{type:Array as PropType<string[]>,default:()=>[]},
    title:{type:String,default:'AI 教学白板'},
  },
  emits:['update:modelValue','changed','save'],
  setup(props,{emit}){
    const board=ref<WhiteboardDocument>(cloneDocument(props.modelValue||emptyDocument()))
    const svg=ref<SVGSVGElement|null>(null)
    const tool=ref<Tool>('pen'),color=ref('#f7f4df'),strokeWidth=ref(4),formula=ref(''),drawingId=ref('')
    const undoStack=ref<WhiteboardDocument[]>([]),redoStack=ref<WhiteboardDocument[]>([])
    let beforeGesture:WhiteboardDocument|undefined
    watch(()=>props.modelValue,value=>{if(JSON.stringify(value)!==JSON.stringify(board.value))board.value=cloneDocument(value||emptyDocument())},{deep:true})
    const canUndo=computed(()=>undoStack.value.length>0),canRedo=computed(()=>redoStack.value.length>0)
    const sync=(changed=true)=>{board.value.updatedAt=new Date().toLocaleString('zh-CN',{hour12:false});emit('update:modelValue',cloneDocument(board.value));if(changed)emit('changed')}
    const commit=(next:WhiteboardDocument)=>{undoStack.value.push(cloneDocument(board.value));if(undoStack.value.length>80)undoStack.value.shift();redoStack.value=[];board.value=next;sync()}
    const point=(event:PointerEvent):WhiteboardPoint=>{const rect=svg.value!.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width*1000,y:(event.clientY-rect.top)/rect.height*560}}
    const start=(event:PointerEvent)=>{
      if(!svg.value||event.button!==0)return
      const at=point(event)
      if(tool.value==='text'){
        const value=window.prompt('输入白板文字')?.trim()
        if(value)commit({...cloneDocument(board.value),elements:[...board.value.elements,{id:elementId(),kind:'text',x:at.x,y:at.y,value:value.slice(0,120),color:color.value,size:28}]})
        return
      }
      if(tool.value==='eraser')return
      beforeGesture=cloneDocument(board.value)
      drawingId.value=elementId()
      const element:WhiteboardElement=tool.value==='pen'
        ?{id:drawingId.value,kind:'stroke',points:[at],color:color.value,width:strokeWidth.value}
        :{id:drawingId.value,kind:tool.value,x1:at.x,y1:at.y,x2:at.x,y2:at.y,color:color.value,width:strokeWidth.value}
      board.value.elements.push(element)
      svg.value.setPointerCapture(event.pointerId)
    }
    const move=(event:PointerEvent)=>{
      if(!drawingId.value||!svg.value)return
      const at=point(event),element=board.value.elements.find(item=>item.id===drawingId.value)
      if(!element)return
      if(element.kind==='stroke')element.points.push(at)
      else if(element.kind==='line'||element.kind==='arrow'||element.kind==='rect'||element.kind==='ellipse'){element.x2=at.x;element.y2=at.y}
    }
    const end=()=>{
      if(!drawingId.value)return
      const element=board.value.elements.find(item=>item.id===drawingId.value)
      if(element?.kind==='stroke'&&element.points.length===1)element.points.push({x:element.points[0].x+1,y:element.points[0].y+1})
      if(beforeGesture){undoStack.value.push(beforeGesture);if(undoStack.value.length>80)undoStack.value.shift();redoStack.value=[]}
      drawingId.value='';beforeGesture=undefined;sync()
    }
    const erase=(id:string,event:PointerEvent)=>{if(tool.value!=='eraser')return;event.preventDefault();event.stopPropagation();commit({...cloneDocument(board.value),elements:board.value.elements.filter(item=>item.id!==id)})}
    const addFormula=()=>{const value=formula.value.trim();if(!value)return;const rows=board.value.elements.filter(item=>item.kind==='formula').length;commit({...cloneDocument(board.value),elements:[...board.value.elements,{id:elementId(),kind:'formula',x:70,y:90+(rows%8)*52,value:value.slice(0,180),color:color.value,size:30}]});formula.value=''}
    const layoutAi=()=>{
      const notes=(props.aiNotes.length?props.aiNotes:['等待 AI 答疑后生成图解']).slice(0,8)
      const elements:WhiteboardElement[]=[]
      notes.forEach((note,index)=>{
        const column=index%2,row=Math.floor(index/2),x=70+column*480,y=55+row*120,w=390,h=82
        elements.push({id:elementId(),kind:'rect',x1:x,y1:y,x2:x+w,y2:y+h,color:index===0?'#76a9ff':'#a9c2ee',width:2})
        elements.push({id:elementId(),kind:/[=＋+－−×÷<>∑√]/.test(note)?'formula':'text',x:x+20,y:y+49,value:note.replace(/^\d+[.、]\s*/,'').slice(0,34),color:'#f7f4df',size:24})
        if(index>1){const parent=index-2,parentColumn=parent%2,parentRow=Math.floor(parent/2);elements.push({id:elementId(),kind:'arrow',x1:70+parentColumn*480+195,y1:55+parentRow*120+82,x2:x+195,y2:y,color:'#6f91c6',width:2})}
      })
      commit({schemaVersion:'zhixue.whiteboard.1',elements,background:'grid',updatedAt:''})
    }
    const undo=()=>{const previous=undoStack.value.pop();if(!previous)return;redoStack.value.push(cloneDocument(board.value));board.value=previous;sync()}
    const redo=()=>{const next=redoStack.value.pop();if(!next)return;undoStack.value.push(cloneDocument(board.value));board.value=next;sync()}
    const clear=()=>{if(board.value.elements.length&&window.confirm('确定清空当前白板吗？'))commit({...emptyDocument(),background:board.value.background})}
    const serializedSvg=()=>{
      const clone=svg.value!.cloneNode(true) as SVGSVGElement
      clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','1000');clone.setAttribute('height','560')
      clone.querySelectorAll('[data-temporary]').forEach(node=>node.remove())
      const background=document.createElementNS('http://www.w3.org/2000/svg','rect');background.setAttribute('width','1000');background.setAttribute('height','560');background.setAttribute('fill','#17233b');clone.insertBefore(background,clone.firstChild)
      return new XMLSerializer().serializeToString(clone)
    }
    const exportSvg=()=>download(`${props.title}.svg`,new Blob([serializedSvg()],{type:'image/svg+xml;charset=utf-8'}))
    const exportPng=()=>{const source=serializedSvg(),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'})),image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=896;const context=canvas.getContext('2d')!;context.drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);canvas.toBlob(blob=>{if(blob)download(`${props.title}.png`,blob)},'image/png')};image.src=url}
    const toggleBackground=()=>{board.value.background=board.value.background==='grid'?'blank':'grid';sync()}
    const save=()=>{sync(false);emit('save')}
    return{board,svg,tool,color,strokeWidth,formula,drawingId,canUndo,canRedo,pathData,start,move,end,erase,addFormula,layoutAi,undo,redo,clear,exportSvg,exportPng,toggleBackground,save,Math}
  },
  template:`<section class="drawing-board">
    <header class="board-header"><div><b>{{title}}</b><small>自由绘制曲线、公式与几何图形，内容随课程保存</small></div><div class="board-history"><button @click="undo" :disabled="!canUndo">↶ 撤销</button><button @click="redo" :disabled="!canRedo">↷ 重做</button><button @click="toggleBackground">{{board.background==='grid'?'隐藏网格':'显示网格'}}</button></div></header>
    <div class="board-toolbar">
      <button v-for="item in [{id:'pen',label:'✎ 曲线'},{id:'line',label:'╱ 直线'},{id:'arrow',label:'→ 箭头'},{id:'rect',label:'□ 矩形'},{id:'ellipse',label:'○ 椭圆'},{id:'text',label:'T 文字'},{id:'eraser',label:'⌫ 擦除'}]" :class="{active:tool===item.id}" @click="tool=item.id">{{item.label}}</button>
      <label class="board-color">颜色 <input type="color" v-model="color"></label><label>粗细 <input type="range" min="1" max="12" v-model.number="strokeWidth"></label>
    </div>
    <div class="formula-bar"><input v-model="formula" maxlength="180" @keyup.enter="addFormula" placeholder="输入公式，如 y=ax²+bx+c、E=mc²、∑xᵢ"><button @click="addFormula">＋ 添加公式</button><button class="ai-layout" @click="layoutAi">✦ AI 图解排版</button></div>
    <svg ref="svg" class="board-canvas" :class="board.background" viewBox="0 0 1000 560" @pointerdown="start" @pointermove="move" @pointerup="end" @pointercancel="end" @pointerleave="end">
      <defs><pattern id="board-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#ffffff13" stroke-width="1"/></pattern><marker id="board-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>
      <rect width="1000" height="560" fill="#17233b"/><rect v-if="board.background==='grid'" width="1000" height="560" fill="url(#board-grid)"/>
      <template v-for="element in board.elements" :key="element.id">
        <path v-if="element.kind==='stroke'" :d="pathData(element.points)" fill="none" :stroke="element.color" :stroke-width="element.width" stroke-linecap="round" stroke-linejoin="round" @pointerdown="erase(element.id,$event)"/>
        <line v-else-if="element.kind==='line'||element.kind==='arrow'" :x1="element.x1" :y1="element.y1" :x2="element.x2" :y2="element.y2" :stroke="element.color" :stroke-width="element.width" stroke-linecap="round" :marker-end="element.kind==='arrow'?'url(#board-arrow)':undefined" @pointerdown="erase(element.id,$event)"/>
        <rect v-else-if="element.kind==='rect'" :x="Math.min(element.x1,element.x2)" :y="Math.min(element.y1,element.y2)" :width="Math.abs(element.x2-element.x1)" :height="Math.abs(element.y2-element.y1)" fill="transparent" :stroke="element.color" :stroke-width="element.width" rx="8" @pointerdown="erase(element.id,$event)"/>
        <ellipse v-else-if="element.kind==='ellipse'" :cx="(element.x1+element.x2)/2" :cy="(element.y1+element.y2)/2" :rx="Math.abs(element.x2-element.x1)/2" :ry="Math.abs(element.y2-element.y1)/2" fill="transparent" :stroke="element.color" :stroke-width="element.width" @pointerdown="erase(element.id,$event)"/>
        <text v-else :x="element.x" :y="element.y" :fill="element.color" :font-size="element.size" :font-family="element.kind==='formula'?'Cambria Math, STIX Two Math, serif':'Microsoft YaHei, sans-serif'" :font-style="element.kind==='formula'?'italic':'normal'" @pointerdown="erase(element.id,$event)">{{element.value}}</text>
      </template>
    </svg>
    <footer class="board-footer"><span>{{board.elements.length}} 个绘图元素 · {{board.updatedAt||'尚未保存'}}</span><div><button @click="clear">清空</button><button @click="exportSvg">导出 SVG</button><button @click="exportPng">导出 PNG</button><button class="primary" @click="save">保存白板</button></div></footer>
  </section>`,
})
