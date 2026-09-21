import type { LessonPlan } from './lesson-content'

export type RelationType = '前置' | '包含' | '因果' | '关联'
export type KnowledgeNode = { id:string; label:string; level:number; mastery:number; x:number; y:number; description:string; sourceRefs:MindMapSourceRef[] }
export type KnowledgeEdge = { from:string; to:string; type:RelationType }
export type KnowledgeGraphData = { schemaVersion:'zhixue.knowledge-graph.1'; nodes:KnowledgeNode[]; edges:KnowledgeEdge[]; provider?:string; model?:string; mode?:string }
export type Material = { id:number; name:string; type:string; size:string; status:'已解析'|'解析中'|'仅存档'; chunks:number; points:string[]; summary:string; uploadedAt:string; text?:string; truncated?:boolean; resourceId?:string; downloadUrl?:string }
export type SlideTransition = 'none'|'fade'|'push'|'wipe'
export type SlideAnimation = 'none'|'fade'|'fly'|'appear'
export type Slide = { title:string; bullets:string[]; knowledge:string; visual:string; imageUrl?:string; imageResourceId?:string; imagePrompt?:string; imageProvider?:string; imageModel?:string; transition?:SlideTransition; animation?:SlideAnimation }
export type AgentRole = { id:string; name:string; icon:string; duty:string; enabled:boolean; voice:string }
export type AgentMessage = { id:number; role:string; icon:string; content:string; time:string; provider?:string; mode?:string; model?:string }
export type LearningRecord = { id:number; action:string; target:string; seconds:number; score?:number; at:string }
export type WhiteboardNote = { title:string; items:string[]; saved:boolean }
export type WhiteboardPoint = { x:number; y:number }
export type WhiteboardElement =
  | { id:string; kind:'stroke'; points:WhiteboardPoint[]; color:string; width:number }
  | { id:string; kind:'line'|'arrow'|'rect'|'ellipse'; x1:number; y1:number; x2:number; y2:number; color:string; width:number }
  | { id:string; kind:'text'|'formula'; x:number; y:number; value:string; color:string; size:number }
export type WhiteboardDocument = { schemaVersion:'zhixue.whiteboard.1'; elements:WhiteboardElement[]; background:'grid'|'blank'; updatedAt:string }
export type ProjectSubmission = { id:string; filename:string; size:string; uploadedAt:string; note:string; resourceId?:string; downloadUrl?:string }
export type ProjectGroup = { id:string; name:string; members:string[] }
export type ProjectStageStatus = '未开始'|'进行中'|'已提交'|'已评价'
export type ProjectStage = { id:string; title:string; description:string; dueDate:string; status:ProjectStageStatus; submissions:ProjectSubmission[] }
export type ProjectRubric = { id:string; name:string; description:string; weight:number; score:number|null }
export type ProjectTask = { title:string; challenge:string; deliverables:string[]; groups:ProjectGroup[]; stages:ProjectStage[]; rubric:ProjectRubric[] }
export type MindMapSourceKind = 'course'|'objective'|'key_point'|'scene'|'slide'|'quiz'
export type MindMapSourceRef = { kind:MindMapSourceKind; index:number; label:string }
export type MindMapNode = { id:string; label:string; sourceRefs:MindMapSourceRef[]; children:MindMapNode[]; collapsed?:boolean }
export type MindMapData = { schemaVersion:'zhixue.mindmap.1'; root:MindMapNode; provider?:string; model?:string; mode?:string }
export type Demo04Data = {
  knowledgeGraph:KnowledgeGraphData
  materials:Material[]
  slides:Slide[]
  mindMap:MindMapData
  audioScript:{teacher:string;student:string}
  whiteboard:WhiteboardNote[]
  drawingBoard:WhiteboardDocument
  projectTask:ProjectTask
  learningPath:{stage:string;reason:string;status:'已掌握'|'学习中'|'待学习'}[]
  interests:string[]
}

const positions = [[300,58],[130,155],[300,155],[470,155],[80,270],[210,270],[390,270],[520,270]]
const unique = (items:string[]) => [...new Set(items.filter(Boolean))]
const taskId = (prefix:string,index:number) => `${prefix}-${index+1}`

export function buildProjectTask(lesson:LessonPlan):ProjectTask {
  return {
    title:`“${lesson.title}”真实情境挑战`,
    challenge:`运用本课的${lesson.subject}方法，分析一个生活或社会中的真实问题，并用证据形成方案。`,
    deliverables:['一张知识关系图','一份小组方案','2 分钟成果陈述'],
    groups:[],
    stages:[
      {id:taskId('stage',0),title:'启动与分组',description:'明确问题、角色分工与项目计划。',dueDate:'',status:'未开始',submissions:[]},
      {id:taskId('stage',1),title:'调研与方案',description:'收集证据，比较思路并提交方案草案。',dueDate:'',status:'未开始',submissions:[]},
      {id:taskId('stage',2),title:'制作与反馈',description:'完成成果原型，根据同伴与教师反馈迭代。',dueDate:'',status:'未开始',submissions:[]},
      {id:taskId('stage',3),title:'发布与评价',description:'展示最终成果，依据量规自评、互评和教师评价。',dueDate:'',status:'未开始',submissions:[]},
    ],
    rubric:[
      {id:taskId('rubric',0),name:'知识准确',description:'概念、证据与推理符合课程要求。',weight:30,score:null},
      {id:taskId('rubric',1),name:'问题解决',description:'方案回应真实问题，过程完整且可行。',weight:30,score:null},
      {id:taskId('rubric',2),name:'协作过程',description:'分工清晰，阶段记录和反馈充分。',weight:20,score:null},
      {id:taskId('rubric',3),name:'成果表达',description:'成果清晰、有创意，展示与答辩有效。',weight:20,score:null},
    ],
  }
}

export function normalizeProjectTask(lesson:LessonPlan,raw:unknown):ProjectTask {
  const fallback=buildProjectTask(lesson),candidate=raw as any
  const statuses:ProjectStageStatus[]=['未开始','进行中','已提交','已评价']
  return {
    title:String(candidate?.title||fallback.title).slice(0,160),
    challenge:String(candidate?.challenge||fallback.challenge).slice(0,1200),
    deliverables:Array.isArray(candidate?.deliverables)?candidate.deliverables.map((item:unknown)=>String(item).slice(0,160)).slice(0,12):fallback.deliverables,
    groups:Array.isArray(candidate?.groups)?candidate.groups.slice(0,30).map((group:any,index:number)=>({id:String(group?.id||taskId('group',index)),name:String(group?.name||`第 ${index+1} 组`).slice(0,60),members:Array.isArray(group?.members)?group.members.map((item:unknown)=>String(item).slice(0,40)).slice(0,20):[]})):[],
    stages:Array.isArray(candidate?.stages)&&candidate.stages.length?candidate.stages.slice(0,12).map((stage:any,index:number)=>({id:String(stage?.id||taskId('stage',index)),title:String(stage?.title||`阶段 ${index+1}`).slice(0,100),description:String(stage?.description||'').slice(0,600),dueDate:String(stage?.dueDate||'').slice(0,20),status:statuses.includes(stage?.status)?stage.status:'未开始',submissions:Array.isArray(stage?.submissions)?stage.submissions.slice(0,30).map((item:any,submissionIndex:number)=>({id:String(item?.id||`${taskId('submission',submissionIndex)}-${index}`),filename:String(item?.filename||'未命名成果').slice(0,180),size:String(item?.size||''),uploadedAt:String(item?.uploadedAt||''),note:String(item?.note||'').slice(0,500),resourceId:item?.resourceId?String(item.resourceId):undefined,downloadUrl:item?.downloadUrl?String(item.downloadUrl):undefined})):[]})):fallback.stages,
    rubric:Array.isArray(candidate?.rubric)&&candidate.rubric.length?candidate.rubric.slice(0,12).map((item:any,index:number)=>({id:String(item?.id||taskId('rubric',index)),name:String(item?.name||`指标 ${index+1}`).slice(0,80),description:String(item?.description||'').slice(0,400),weight:Math.min(100,Math.max(0,Number(item?.weight)||0)),score:item?.score===null||item?.score===undefined?null:Math.min(100,Math.max(0,Number(item.score)||0))})):fallback.rubric,
  }
}

export function normalizeWhiteboardDocument(raw:unknown):WhiteboardDocument {
  const candidate=raw as any
  return {schemaVersion:'zhixue.whiteboard.1',elements:Array.isArray(candidate?.elements)?candidate.elements.slice(0,1000):[],background:candidate?.background==='blank'?'blank':'grid',updatedAt:String(candidate?.updatedAt||'')}
}

export function buildDemo04Data(lesson:LessonPlan):Demo04Data {
  const concepts = unique([
    lesson.title,
    ...lesson.keyPoints,
    ...lesson.difficultPoints,
    ...lesson.scenes.flatMap(scene => scene.knowledge),
  ]).slice(0,8)
  while (concepts.length < 8) concepts.push(`${lesson.subject}拓展${concepts.length}`)
  const nodes:KnowledgeNode[] = concepts.map((label,index)=>({
    id:`k${index+1}`, label:mindPhrase(label), level:index===0?0:index<4?1:2, mastery:0,
    x:positions[index][0], y:positions[index][1],
    description:index===0?`“${lesson.title}”的课程核心主题`:`课程中的${label}知识点，关联课堂任务、测验与学习建议。`,
    sourceRefs:index===0?[sourceRef('course',0,lesson.title)]:[sourceRef('key_point',Math.max(0,lesson.keyPoints.indexOf(label)),label)],
  }))
  const edges:KnowledgeEdge[] = [
    {from:'k1',to:'k2',type:'包含'},{from:'k1',to:'k3',type:'包含'},{from:'k1',to:'k4',type:'包含'},
    {from:'k2',to:'k5',type:'前置'},{from:'k2',to:'k6',type:'因果'},{from:'k3',to:'k7',type:'前置'},
    {from:'k4',to:'k8',type:'因果'},{from:'k6',to:'k7',type:'关联'},
  ]
  const slides = lesson.scenes.map((scene,index):Slide=>({
    title:`${String(index+1).padStart(2,'0')} ${scene.title}`,
    bullets:[scene.headline,scene.content,`互动：${scene.interaction}`],
    knowledge:scene.knowledge[0] || lesson.keyPoints[index % lesson.keyPoints.length],
    visual:['概念关系图','情境配图','步骤流程图','数据/史料卡','知识总结图'][index%5],
    transition:'fade',animation:'fade',
  }))
  return {
    knowledgeGraph:{schemaVersion:'zhixue.knowledge-graph.1',nodes,edges},
    materials:[],
    slides,
    mindMap:buildMindMapData(lesson),
    audioScript:{teacher:`欢迎来到${lesson.title}。今天我们会沿着${lesson.keyPoints.join('、')}逐步建立知识结构。`,student:`老师，我想知道${lesson.difficultPoints[0]}应该怎样理解？能不能结合一个真实例子说明？`},
    whiteboard:[{title:'核心框架',items:lesson.keyPoints,saved:true},{title:'易错提醒',items:lesson.difficultPoints,saved:false}],
    drawingBoard:{schemaVersion:'zhixue.whiteboard.1',elements:[],background:'grid',updatedAt:''},
    projectTask:buildProjectTask(lesson),
    learningPath:[
      {stage:`前置：${concepts[1]}`,reason:'等待完成课堂活动与测验后更新',status:'待学习'},
      {stage:`核心：${concepts[2]}`,reason:'当前课程核心学习任务',status:'学习中'},
      {stage:`强化：${concepts[5]}`,reason:'完成测验后按真实结果生成建议',status:'待学习'},
      {stage:`拓展：${concepts[7]}`,reason:'完成核心任务后进入拓展项目',status:'待学习'},
    ],
    interests:['科技','阅读','生活案例'],
  }
}

const mindPhrase = (value:string) => value.replace(/\s+/g,'').slice(0,15) || '未命名节点'
const sourceRef = (kind:MindMapSourceKind,index:number,label:string):MindMapSourceRef => ({kind,index,label:label.slice(0,80)})

export function layoutKnowledgeGraph(graph:KnowledgeGraphData):KnowledgeGraphData {
  const levels=[0,1,2,3].map(level=>graph.nodes.filter(node=>node.level===level))
  levels.forEach((nodes,level)=>nodes.forEach((node,index)=>{node.x=nodes.length===1?500:100+index*(800/Math.max(1,nodes.length-1));node.y=70+level*145}))
  return graph
}

export function normalizeKnowledgeGraphData(lesson:LessonPlan,raw:unknown):KnowledgeGraphData {
  const candidate=raw as any
  if(!Array.isArray(candidate?.nodes)||!candidate.nodes.length)return buildDemo04Data(lesson).knowledgeGraph
  const ids=new Set<string>()
  const allowedKinds=['course','objective','key_point','scene','slide','quiz']
  const fallbackRef=(label:string,index:number):MindMapSourceRef=>{
    const keyIndex=lesson.keyPoints.findIndex(item=>item.includes(label)||label.includes(item))
    if(keyIndex>=0)return sourceRef('key_point',keyIndex,lesson.keyPoints[keyIndex])
    const sceneIndex=lesson.scenes.findIndex(item=>item.knowledge.some(point=>point.includes(label)||label.includes(point)))
    return sceneIndex>=0?sourceRef('scene',sceneIndex,lesson.scenes[sceneIndex].title):sourceRef(index===0?'course':'key_point',index===0?0:Math.min(index-1,Math.max(0,lesson.keyPoints.length-1)),index===0?lesson.title:(lesson.keyPoints[Math.min(index-1,Math.max(0,lesson.keyPoints.length-1))]||label))
  }
  const nodes:KnowledgeNode[]=candidate.nodes.slice(0,80).map((node:any,index:number)=>{
    let id=String(node?.id||`k${index+1}`).slice(0,80)
    while(ids.has(id))id=`k${index+1}-${ids.size}`
    ids.add(id)
    const refs=Array.isArray(node?.sourceRefs)?node.sourceRefs:Array.isArray(node?.source_refs)?node.source_refs:[]
    const sourceRefs=refs.filter((item:any)=>allowedKinds.includes(item?.kind)).slice(0,8).map((item:any)=>sourceRef(item.kind,Math.max(0,Number(item.index)||0),String(item.label||lesson.title)))
    return {id,label:mindPhrase(String(node?.label||'未命名节点')),level:Math.min(3,Math.max(0,Number(node?.level)||0)),mastery:Math.min(100,Math.max(0,Number(node?.mastery)||0)),x:0,y:0,description:String(node?.description||`课程知识点：${node?.label||'未命名节点'}`).slice(0,300),sourceRefs:sourceRefs.length?sourceRefs:[fallbackRef(String(node?.label||''),index)]}
  })
  const relations:RelationType[]=['前置','包含','因果','关联']
  const seen=new Set<string>()
  const edges:KnowledgeEdge[]=(Array.isArray(candidate.edges)?candidate.edges:[]).filter((edge:any)=>ids.has(String(edge?.from))&&ids.has(String(edge?.to))&&edge.from!==edge.to&&relations.includes(edge.type)).slice(0,160).filter((edge:any)=>{const key=`${edge.from}|${edge.to}|${edge.type}`;if(seen.has(key))return false;seen.add(key);return true}).map((edge:any)=>({from:String(edge.from),to:String(edge.to),type:edge.type}))
  return layoutKnowledgeGraph({schemaVersion:'zhixue.knowledge-graph.1',nodes,edges,provider:candidate.provider,model:candidate.model,mode:candidate.mode})
}

export function buildMindMapData(lesson:LessonPlan):MindMapData {
  const objectiveNodes=lesson.objectives.slice(0,5).map((item,index):MindMapNode=>({id:`objective-${index}`,label:mindPhrase(item),sourceRefs:[sourceRef('objective',index,item)],children:[]}))
  const knowledgeNodes=lesson.keyPoints.slice(0,6).map((point,index):MindMapNode=>({
    id:`key-${index}`,label:mindPhrase(point),sourceRefs:[sourceRef('key_point',index,point)],
    children:lesson.scenes.map((scene,sceneIndex)=>({scene,sceneIndex})).filter(({scene})=>scene.knowledge.includes(point)).slice(0,4).map(({scene,sceneIndex})=>({id:`key-${index}-scene-${sceneIndex}`,label:mindPhrase(scene.title),sourceRefs:[sourceRef('scene',sceneIndex,scene.title),sourceRef('slide',sceneIndex,scene.headline)],children:[]})),
  }))
  const sceneNodes=lesson.scenes.slice(0,8).map((scene,index):MindMapNode=>({
    id:`scene-${index}`,label:mindPhrase(scene.title),sourceRefs:[sourceRef('scene',index,scene.title),sourceRef('slide',index,scene.headline)],
    children:[...new Set(scene.knowledge)].slice(0,5).map((point,childIndex)=>({id:`scene-${index}-knowledge-${childIndex}`,label:mindPhrase(point),sourceRefs:[sourceRef('scene',index,scene.title)],children:[]})),
  }))
  const quizNodes=lesson.quiz.slice(0,6).map((quiz,index):MindMapNode=>({id:`quiz-${index}`,label:mindPhrase(quiz.knowledge||quiz.question),sourceRefs:[sourceRef('quiz',index,quiz.question)],children:[]}))
  const courseMark=[sourceRef('course',0,lesson.title)]
  return {schemaVersion:'zhixue.mindmap.1',root:{id:'root',label:mindPhrase(lesson.title),sourceRefs:courseMark,children:[
    {id:'branch-objectives',label:'学习目标',sourceRefs:courseMark,children:objectiveNodes},
    {id:'branch-knowledge',label:'核心知识',sourceRefs:courseMark,children:knowledgeNodes},
    {id:'branch-scenes',label:'课堂流程',sourceRefs:courseMark,children:sceneNodes},
    {id:'branch-quizzes',label:'测验巩固',sourceRefs:courseMark,children:quizNodes},
  ]}}
}

export function normalizeMindMapData(lesson:LessonPlan,raw:unknown):MindMapData {
  const candidate=raw as any
  if(!candidate?.root||typeof candidate.root!=='object')return buildMindMapData(lesson)
  const ids=new Set<string>()
  let sequence=0
  const normalizeNode=(node:any,depth:number):MindMapNode=>{
    let id=String(node?.id||`mind-${++sequence}`).slice(0,80)
    while(ids.has(id))id=`mind-${++sequence}`
    ids.add(id)
    const refs=Array.isArray(node?.sourceRefs)?node.sourceRefs:Array.isArray(node?.source_refs)?node.source_refs:[]
    const sourceRefs=refs.filter((item:any)=>['course','objective','key_point','scene','slide','quiz'].includes(item?.kind)).slice(0,8).map((item:any)=>sourceRef(item.kind,Math.max(0,Number(item.index)||0),String(item.label||lesson.title)))
    return {id,label:mindPhrase(String(node?.label||'未命名节点')),sourceRefs,collapsed:Boolean(node?.collapsed),children:depth>=4?[]:(Array.isArray(node?.children)?node.children.slice(0,12).map((child:any)=>normalizeNode(child,depth+1)):[])}
  }
  return {schemaVersion:'zhixue.mindmap.1',root:normalizeNode(candidate.root,1),provider:candidate.provider,model:candidate.model,mode:candidate.mode}
}

export function materialFromFile(file:File, points:string[]):Material {
  const ext=file.name.split('.').pop()?.toUpperCase() || 'FILE'
  return {id:Date.now()+Math.floor(Math.random()*1000),name:file.name,type:ext,size:file.size>1048576?`${(file.size/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(file.size/1024))} KB`,status:'已解析',chunks:Math.max(3,Math.min(36,Math.ceil(file.size/12000))),points:points.slice(0,4),summary:['TXT','MD'].includes(ext)?'已读取全文，完成清洗、切分、去重和知识点抽取。':'已进入文档解析适配层，演示模式已提取目录、摘要和知识点。',uploadedAt:'刚刚'}
}

export function defaultAgents():AgentRole[] {
  return [
    {id:'teacher',name:'AI 导师·知行',icon:'🧑‍🏫',duty:'答疑、追问与白板讲解',enabled:true,voice:'沉稳教师声线'},
    {id:'classmate',name:'AI 同学·小智',icon:'🧑‍🎓',duty:'主动提问、讨论与同伴反馈',enabled:true,voice:'活力少年声线'},
    {id:'recorder',name:'课堂记录员',icon:'📝',duty:'实时提炼重点、难点与待办',enabled:true,voice:'无语音'},
    {id:'coach',name:'项目教练',icon:'🧭',duty:'拆解项目任务与过程评价',enabled:false,voice:'清晰引导声线'},
  ]
}

export function initialRecords(title:string):LearningRecord[] {
  void title
  return []
}
