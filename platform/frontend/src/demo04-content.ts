import type { LessonPlan } from './lesson-content'

export type RelationType = '前置' | '包含' | '因果' | '关联'
export type KnowledgeNode = { id:string; label:string; level:number; mastery:number; x:number; y:number; description:string }
export type KnowledgeEdge = { from:string; to:string; type:RelationType }
export type Material = { id:number; name:string; type:string; size:string; status:'已解析'|'解析中'; chunks:number; points:string[]; summary:string; uploadedAt:string }
export type Slide = { title:string; bullets:string[]; knowledge:string; visual:string }
export type AgentRole = { id:string; name:string; icon:string; duty:string; enabled:boolean; voice:string }
export type AgentMessage = { id:number; role:string; icon:string; content:string; time:string }
export type LearningRecord = { id:number; action:string; target:string; seconds:number; score?:number; at:string }
export type WhiteboardNote = { title:string; items:string[]; saved:boolean }
export type Demo04Data = {
  knowledgeGraph:{nodes:KnowledgeNode[];edges:KnowledgeEdge[]}
  materials:Material[]
  slides:Slide[]
  mindMap:{root:string;branches:{name:string;children:string[]}[]}
  audioScript:{teacher:string;student:string}
  whiteboard:WhiteboardNote[]
  projectTask:{title:string;challenge:string;deliverables:string[]}
  learningPath:{stage:string;reason:string;status:'已掌握'|'学习中'|'待学习'}[]
  interests:string[]
}

const positions = [[300,58],[130,155],[300,155],[470,155],[80,270],[210,270],[390,270],[520,270]]
const unique = (items:string[]) => [...new Set(items.filter(Boolean))]

export function buildDemo04Data(lesson:LessonPlan):Demo04Data {
  const concepts = unique([
    lesson.title,
    ...lesson.keyPoints,
    ...lesson.difficultPoints,
    ...lesson.scenes.flatMap(scene => scene.knowledge),
  ]).slice(0,8)
  while (concepts.length < 8) concepts.push(`${lesson.subject}拓展${concepts.length}`)
  const nodes:KnowledgeNode[] = concepts.map((label,index)=>({
    id:`k${index+1}`, label, level:index===0?0:index<4?1:2, mastery:[86,78,72,64,55,48,69,60][index],
    x:positions[index][0], y:positions[index][1],
    description:index===0?`“${lesson.title}”的课程核心主题`:`课程中的${label}知识点，关联课堂任务、测验与学习建议。`,
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
  }))
  return {
    knowledgeGraph:{nodes,edges},
    materials:[
      {id:1,name:`${lesson.title}-教材节选.pdf`,type:'PDF',size:'2.4 MB',status:'已解析',chunks:18,points:concepts.slice(0,4),summary:`已完成文本清洗、章节切分和${lesson.subject}知识点抽取。`,uploadedAt:'今天 09:20'},
      {id:2,name:`${lesson.subject}课堂参考课件.pptx`,type:'PPTX',size:'5.8 MB',status:'已解析',chunks:12,points:concepts.slice(2,6),summary:'已提取页面标题、正文结构与可复用案例。',uploadedAt:'今天 09:24'},
    ],
    slides,
    mindMap:{root:lesson.title,branches:lesson.keyPoints.slice(0,3).map((name,index)=>({name,children:lesson.scenes[index]?.knowledge.slice(0,3) || []}))},
    audioScript:{teacher:`欢迎来到${lesson.title}。今天我们会沿着${lesson.keyPoints.join('、')}逐步建立知识结构。`,student:`老师，我想知道${lesson.difficultPoints[0]}应该怎样理解？能不能结合一个真实例子说明？`},
    whiteboard:[{title:'核心框架',items:lesson.keyPoints,saved:true},{title:'易错提醒',items:lesson.difficultPoints,saved:false}],
    projectTask:{title:`“${lesson.title}”真实情境挑战`,challenge:`运用本课的${lesson.subject}方法，分析一个生活或社会中的真实问题，并用证据形成方案。`,deliverables:['一张知识关系图','一份小组方案','2 分钟成果陈述']},
    learningPath:[
      {stage:`前置：${concepts[1]}`,reason:'已完成诊断，基础较好',status:'已掌握'},
      {stage:`核心：${concepts[2]}`,reason:'当前课堂主任务',status:'学习中'},
      {stage:`强化：${concepts[5]}`,reason:'测验显示需要加强',status:'待学习'},
      {stage:`拓展：${concepts[7]}`,reason:'结合兴趣标签的项目任务',status:'待学习'},
    ],
    interests:['科技','阅读','生活案例'],
  }
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
  return [
    {id:1,action:'浏览课堂',target:title,seconds:426,at:'今天 09:30'},
    {id:2,action:'完成测验',target:'前置诊断',seconds:96,score:80,at:'今天 09:38'},
    {id:3,action:'查看知识点',target:'核心概念',seconds:183,at:'今天 09:41'},
    {id:4,action:'参与讨论',target:'AI 同学话题',seconds:214,score:88,at:'今天 09:46'},
  ]
}
