import { createApp, ref, computed, onMounted, defineComponent, type PropType } from 'vue'
import { createLesson, resizeLessonDuration, inferSubject, mergeGeneratedLesson, seedLessons, subjects, type LessonPlan } from './lesson-content'
import { buildDemo04Data, defaultAgents, initialRecords, layoutKnowledgeGraph, normalizeKnowledgeGraphData, normalizeMindMapData, normalizeProjectTask, normalizeWhiteboardDocument, type Material, type AgentMessage, type AgentRole, type Demo04Data, type KnowledgeEdge, type LearningRecord, type MindMapNode, type RelationType } from './demo04-content'
import { exportHtml, exportJson, exportPackage, exportPptx } from './demo04-export'
import DrawingWhiteboard from './DrawingWhiteboard'
import ProjectLearningPanel from './ProjectLearningPanel'
import './style.css'
import './chat.css'
import './hierarchy.css'
import './whiteboard.css'
import './project-learning.css'
import QuizPanel, { type QuizAttempt } from './QuizPanel'
import { useSpeech } from './useSpeech'

type ResourceLink = { id:number; title:string; url:string; note:string; createdAt:string }
type TextbookState = { completed:number[]; bookmarks:number[]; notes:Record<string,string> }
type Reflection = { id:number; sceneIndex:number; prompt:string; answer:string; feedback:string; at:string }
type Course = LessonPlan & { id:number; status:'DRAFT'|'PUBLISHED'; updatedAt:string; demo04:Demo04Data; quizAttempts?:QuizAttempt[]; resourceLinks?:ResourceLink[]; textbook?:TextbookState; reflections?:Reflection[]; discussion?:{messages:AgentMessage[];notes:string[];board:string[];agents:AgentRole[]} }
type Page = 'home'|'generate'|'knowledge'|'multimodal'|'lesson'|'agents'|'analytics'|'library'|'settings'
type ProviderOption = {id:string;name:string;status:string;model?:string|null;base_url?:string;source?:'local'|'environment'|'none'}
type ImageProviderStatus = {provider:string;name:string;status:'configured'|'unconfigured';access_key_hint:string;endpoint:string;region:string;model:string;source:string;storage:string}
type MasteryRow = {label:string;mastery:number|null;attempts:number}
const coursePages:Page[]=['knowledge','multimodal','lesson','agents','analytics','library']
const now=()=>new Date().toLocaleString('zh-CN',{hour12:false})
const seeds:Course[]=seedLessons.map((lesson,index)=>({...lesson,version:'0.4',id:index+1,status:index<5?'PUBLISHED':'DRAFT',updatedAt:`2026-09-${14-Math.floor(index/3)} ${9+index}:00`,demo04:buildDemo04Data(lesson),resourceLinks:[],textbook:{completed:[],bookmarks:[],notes:{}},reflections:[]}))
const storageKey='zhixue-courses-demo04', recordsKey='zhixue-learning-records-demo04', workspaceKey='zhixue-active-workspace'
const enrichCourse=(raw:any):Course=>{const stored=typeof raw.content==='string'?JSON.parse(raw.content):raw.content||{};raw={...stored,...raw,scenes:stored.scenes||raw.scenes};delete raw.content;const base=createLesson(raw.title||'未命名课堂',raw.subject,raw.grade||'八年级');const lesson={...base,...raw,version:'0.4' as const,scenes:Array.isArray(raw.scenes)&&raw.scenes.length?raw.scenes:base.scenes,quiz:Array.isArray(raw.quiz)&&raw.quiz.length?raw.quiz:base.quiz,objectives:Array.isArray(raw.objectives)&&raw.objectives.length?raw.objectives:base.objectives,keyPoints:Array.isArray(raw.keyPoints)&&raw.keyPoints.length?raw.keyPoints:base.keyPoints,difficultPoints:Array.isArray(raw.difficultPoints)&&raw.difficultPoints.length?raw.difficultPoints:base.difficultPoints,homework:Array.isArray(raw.homework)&&raw.homework.length?raw.homework:base.homework,resources:Array.isArray(raw.resources)&&raw.resources.length?raw.resources:base.resources,assessment:Array.isArray(raw.assessment)&&raw.assessment.length?raw.assessment:base.assessment};const demo04=raw.demo04||buildDemo04Data(lesson);demo04.materials=(demo04.materials||[]).filter((item:Material)=>item.text||!['今天 09:20','今天 09:24'].includes(item.uploadedAt));demo04.knowledgeGraph=normalizeKnowledgeGraphData(lesson,demo04.knowledgeGraph);demo04.mindMap=normalizeMindMapData(lesson,demo04.mindMap);demo04.drawingBoard=normalizeWhiteboardDocument(demo04.drawingBoard);demo04.projectTask=normalizeProjectTask(lesson,demo04.projectTask);demo04.slides=(demo04.slides||buildDemo04Data(lesson).slides).map((slide:any)=>({...slide,transition:slide.transition||'fade',animation:slide.animation||'fade'}));return {...lesson,id:Number(raw.id)||Date.now(),status:raw.status==='PUBLISHED'?'PUBLISHED':'DRAFT',updatedAt:String(raw.updatedAt||now()),demo04,resourceLinks:Array.isArray(raw.resourceLinks)?raw.resourceLinks:[],textbook:raw.textbook||{completed:[],bookmarks:[],notes:{}},reflections:Array.isArray(raw.reflections)?raw.reflections:[]}}
const load=():Course[]=>{try{const current=localStorage.getItem(storageKey);if(current)return JSON.parse(current).map(enrichCourse);const old=localStorage.getItem('zhixue-courses-demo03')||localStorage.getItem('zhixue-courses');const oldCourses=old?JSON.parse(old).map(enrichCourse):[];const merged=[...oldCourses,...seeds.filter(s=>!oldCourses.some((o:Course)=>o.title===s.title))];localStorage.setItem(storageKey,JSON.stringify(merged));return merged}catch{return seeds}}
const save=(courses:Course[])=>localStorage.setItem(storageKey,JSON.stringify(courses))
const loadRecords=(courseId:number,title:string):LearningRecord[]=>{try{return JSON.parse(localStorage.getItem(`${recordsKey}-${courseId}`)||'null')||initialRecords(title)}catch{return initialRecords(title)}}

const MindMapNodeView=defineComponent({
  name:'MindMapNodeView',
  props:{node:{type:Object as PropType<MindMapNode>,required:true},depth:{type:Number,required:true},selectedId:{type:String,default:''}},
  emits:['select','toggle'],
  template:`<div class="map-subtree" :class="'depth-'+depth"><div class="map-node-wrap"><button class="map-node" :class="{selected:selectedId===node.id}" @click="$emit('select',node.id)"><span>{{node.label}}</span><small>L{{depth}} · {{node.sourceRefs.length}} 个来源</small></button><button v-if="node.children.length" class="map-fold" @click.stop="$emit('toggle',node.id)">{{node.collapsed?'＋':'−'}}</button></div><div v-if="node.children.length&&!node.collapsed" class="map-children"><mind-map-node-view v-for="child in node.children" :key="child.id" :node="child" :depth="depth+1" :selected-id="selectedId" @select="$emit('select',$event)" @toggle="$emit('toggle',$event)"/></div></div>`,
})

const findMindEntry=(root:MindMapNode,id:string,parent:MindMapNode|null=null,depth=1):{node:MindMapNode;parent:MindMapNode|null;depth:number}|undefined=>{if(root.id===id)return{node:root,parent,depth};for(const child of root.children){const found=findMindEntry(child,id,root,depth+1);if(found)return found}}
const saveTextFile=(name:string,text:string,type:string)=>{const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const xmlEscape=(value:string)=>value.replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]!))

const App={components:{QuizPanel,MindMapNodeView,DrawingWhiteboard,ProjectLearningPanel},setup(){
  const courses=ref<Course[]>(load()),page=ref<Page>('home'),currentId=ref(courses.value[0]?.id||0),sceneIndex=ref(0),slideIndex=ref(0),topic=ref('唐诗中的月亮意象'),courseDescription=ref(''),subject=ref('语文'),grade=ref('八年级'),duration=ref(45),provider=ref('mock'),contentStyle=ref('综合模式'),loading=ref(false),message=ref(''),subjectFilter=ref('全部'),apiOnline=ref(false),aiOnline=ref(false)
  const restoredWorkspaceId=Number(sessionStorage.getItem(workspaceKey)||0)
  const workspaceOpened=ref(courses.value.some(course=>course.id===restoredWorkspaceId))
  if(workspaceOpened.value)currentId.value=restoredWorkspaceId
  const current=computed(()=>courses.value.find(c=>c.id===currentId.value)||courses.value[0]),currentScene=computed(()=>current.value?.scenes[sceneIndex.value]),currentSlide=computed(()=>current.value?.demo04.slides[slideIndex.value]),currentVisualSlide=computed(()=>{const course=current.value;return course?.demo04.slides[Math.min(sceneIndex.value,course.demo04.slides.length-1)]}),visibleCourses=computed(()=>subjectFilter.value==='全部'?courses.value:courses.value.filter(c=>c.subject===subjectFilter.value))
  const graphZoom=ref(100),relationFilter=ref<'全部'|RelationType>('全部'),selectedNodeId=ref(current.value?.demo04.knowledgeGraph.nodes[0]?.id||''),nodeDraft=ref(''),graphGenerating=ref(false),edgeTargetId=ref(''),edgeType=ref<RelationType>('关联')
  const graphEdges=computed(()=>current.value?.demo04.knowledgeGraph.edges.filter(e=>relationFilter.value==='全部'||e.type===relationFilter.value)||[]),selectedNode=computed(()=>current.value?.demo04.knowledgeGraph.nodes.find(n=>n.id===selectedNodeId.value)),selectedGraphRelations=computed(()=>(current.value?.demo04.knowledgeGraph.edges||[]).filter(edge=>edge.from===selectedNodeId.value||edge.to===selectedNodeId.value)),graphNodeLabelLength=computed(()=>Array.from(nodeDraft.value.replace(/\s/g,'')).length)
  const selectedAnswer=ref<number|null>(null),showAnswer=ref(false),quizType=ref<'选择'|'填空'|'判断'>('选择'),quizDifficulty=ref('中等'),simulationValue=ref(60),spotlight=ref(true),imagePrompt=ref(''),imageSize=ref('1024x1024'),imageGenerating=ref(false)
  const aiQuestion=ref(''),aiLoading=ref(false),agents=ref<AgentRole[]>(defaultAgents()),agentMessages=ref<AgentMessage[]>([]),recorderNotes=ref<string[]>([]),whiteboard=ref<string[]>([])
  const discussionBusy=ref(false),discussionRounds=ref(1),activeAgent=ref('')
  const speech=useSpeech(aiQuestion,()=>`${page.value}:${current.value?.id}:${sceneIndex.value}:${slideIndex.value}:${contentStyle.value}`,()=>discussionBusy.value||aiLoading.value)
  const {narrating,recognizing,startAsr}=speech
  let discussionController:AbortController|undefined
  const restoreDiscussion=()=>{
    const saved=current.value?.discussion
    agentMessages.value=saved?.messages||[]
    recorderNotes.value=saved?.notes||[]
    whiteboard.value=saved?.board||[]
    agents.value=saved?.agents||defaultAgents()
  }
  const snapshotDiscussion=()=>{
    if(current.value)current.value.discussion={messages:[...agentMessages.value],notes:[...recorderNotes.value],board:[...whiteboard.value],agents:agents.value.map(agent=>({...agent}))}
  }
  restoreDiscussion()
  const records=ref<LearningRecord[]>(loadRecords(currentId.value,current.value?.title||'示例课堂')),sessionSeconds=ref(0),studentView=ref('当前学习者'),interest=ref('科技'),weakOnly=ref(false)
  const knowledgeMastery=computed<MasteryRow[]>(()=>{const course=current.value;if(!course)return[];const labels=[...new Set(course.quiz.map(item=>item.knowledge).filter(Boolean))];return labels.map(label=>{const scores=(course.quizAttempts||[]).filter(attempt=>course.quiz[attempt.index]?.knowledge===label).map(attempt=>attempt.score);return{label,mastery:scores.length?Math.round(scores.reduce((sum,score)=>sum+score,0)/scores.length):null,attempts:scores.length}})})
  const measuredMastery=computed(()=>knowledgeMastery.value.filter((item):item is MasteryRow&{mastery:number}=>item.mastery!==null))
  const totalMinutes=computed(()=>Math.round((records.value.reduce((n,r)=>n+r.seconds,0)+sessionSeconds.value)/60)),averageMastery=computed<number|null>(()=>measuredMastery.value.length?Math.round(measuredMastery.value.reduce((sum,item)=>sum+item.mastery,0)/measuredMastery.value.length):null),quizAverage=computed<number|null>(()=>{const attempts=current.value?.quizAttempts||[];return attempts.length?Math.round(attempts.reduce((sum,item)=>sum+item.score,0)/attempts.length):null}),weakNodes=computed(()=>measuredMastery.value.filter(item=>item.mastery<65)),masteryNodes=computed(()=>weakOnly.value?weakNodes.value:knowledgeMastery.value)
  const flash=(text:string)=>{message.value=text;setTimeout(()=>message.value='',2600)}
  const persist=()=>{snapshotDiscussion();save(courses.value);if(current.value)localStorage.setItem(`${recordsKey}-${current.value.id}`,JSON.stringify(records.value))}
  const addRecord=(action:string,target:string,seconds=45,score?:number)=>{records.value.unshift({id:Date.now()+Math.random(),action,target,seconds,score,at:now()});persist()}
  const draftMaterials=ref<Material[]>([]),uploading=ref(false),saving=ref(false)
  const reflectionAnswer=ref(''),reflectionFeedback=ref(''),reflectionBusy=ref(false)
  const resourceTitle=ref(''),resourceUrl=ref(''),resourceNote=ref('')
  const mindSelectedId=ref(current.value?.demo04.mindMap.root.id||'root'),mindLabelDraft=ref(current.value?.demo04.mindMap.root.label||''),mindGenerating=ref(false)
  const selectedMindEntry=computed(()=>current.value?findMindEntry(current.value.demo04.mindMap.root,mindSelectedId.value):undefined)
  const selectedMindNode=computed(()=>selectedMindEntry.value?.node)
  const mindLabelLength=computed(()=>Array.from(mindLabelDraft.value.replace(/\s/g,'')).length)
  const audioTurns=computed(()=>{const scene=currentScene.value;if(!scene)return[];return[
    {role:'AI 教师',kind:'teacher' as const,text:`${scene.headline}。${scene.content}`},
    {role:'AI 学生',kind:'student' as const,text:`我理解这一段与“${scene.knowledge[0]||current.value.keyPoints[0]}”有关。这里最容易混淆的条件是什么？`},
    {role:'AI 教师',kind:'teacher' as const,text:`可以通过“${scene.interaction}”验证理解。请重点完成：${scene.studentActivity}`},
  ]})
  const textbookProgress=computed(()=>{const completed=current.value?.textbook?.completed.length||0;const total=current.value?.scenes.length||1;return Math.round(completed/total*100)})
  const saveCurrent=async()=>{
    const course=current.value
    if(!course||saving.value)return
    saving.value=true
    try{
      await api('/courses/'+course.id,{method:'PUT',body:JSON.stringify({title:course.title,subject:course.subject,grade:course.grade,status:course.status,content:course})})
      persist()
      flash('完整课堂已保存到服务器')
    }catch{flash('服务器保存失败，内容仍保留在本机')}
    finally{saving.value=false}
  }
  const providerOptions=ref<ProviderOption[]>([{id:'mock',name:'本地演示模型',status:'demo'}])
  const settingsProvider=ref('deepseek'),settingsApiKey=ref(''),settingsModel=ref(''),settingsBaseUrl=ref(''),configuringProvider=ref(false)
  const imageProvider=ref<ImageProviderStatus>({provider:'volcengine',name:'火山引擎视觉（图片素材生成器）',status:'unconfigured',access_key_hint:'',endpoint:'https://visual.volcengineapi.com',region:'cn-north-1',model:'high_aes_general_v30l_zt2i',source:'external',storage:''})
  const imageAccessKeyId=ref(''),imageSecretAccessKey=ref(''),imageEndpoint=ref('https://visual.volcengineapi.com'),imageRegion=ref('cn-north-1'),imageModel=ref('high_aes_general_v30l_zt2i'),configuringImage=ref(false)
  const ollamaModels=ref<{name:string;size:number;parameter_size:string;quantization:string}[]>([]),ollamaLoading=ref(false)
  const api=async(path:string,init?:RequestInit)=>{
    const res=await fetch('/api/v1'+path,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}})
    const body=await res.json()
    if(!res.ok)throw Error(body.message||'服务暂时不可用，请稍后重试')
    return body
  }
  const refreshProviders=async(selectDefault=false)=>{
    const body=await api('/ai/providers')
    providerOptions.value=body.data.providers
    if(selectDefault){provider.value=body.data.default;if(body.data.default!=='mock')settingsProvider.value=body.data.default}
    const selected=providerOptions.value.find(item=>item.id===settingsProvider.value)
    settingsModel.value=selected?.model||settingsModel.value
    settingsBaseUrl.value=selected?.base_url||settingsBaseUrl.value
  }
  const loadOllamaModels=async()=>{
    if(ollamaLoading.value)return
    ollamaLoading.value=true
    try{
      const body=await api('/ai/providers/ollama/models')
      ollamaModels.value=body.data.models||[]
      if(!settingsModel.value&&ollamaModels.value.length)settingsModel.value=ollamaModels.value[0].name
      flash(ollamaModels.value.length?`检测到 ${ollamaModels.value.length} 个本机模型`:'Ollama 正在运行，但还没有下载模型')
    }catch(error){ollamaModels.value=[];flash(error instanceof Error?error.message:'无法读取 Ollama 模型')}
    finally{ollamaLoading.value=false}
  }
  const editProvider=(id:string)=>{
    settingsProvider.value=id
    const selected=providerOptions.value.find(item=>item.id===id)
    settingsModel.value=selected?.model||''
    settingsBaseUrl.value=selected?.base_url||''
    settingsApiKey.value=''
    if(id==='ollama')void loadOllamaModels()
  }
  const saveProviderConfiguration=async()=>{
    if(configuringProvider.value)return
    if(!settingsModel.value.trim())return flash('请选择或填写模型名称')
    if(!settingsBaseUrl.value.trim())return flash('请填写接口 URL')
    configuringProvider.value=true
    try{
      const body=await api('/ai/providers/configure',{method:'POST',body:JSON.stringify({provider:settingsProvider.value,api_key:settingsApiKey.value.trim(),model:settingsModel.value.trim(),base_url:settingsBaseUrl.value.trim()})})
      providerOptions.value=body.data.providers
      provider.value=settingsProvider.value
      settingsApiKey.value=''
      aiOnline.value=false
      flash('AI 配置已保存到本机，重启后仍可使用')
    }catch(error){flash(error instanceof Error?error.message:'AI 配置更新失败')}
    finally{configuringProvider.value=false}
  }
  const clearProviderConfiguration=async()=>{
    if(configuringProvider.value)return
    if(providerOptions.value.find(item=>item.id===settingsProvider.value)?.source!=='local')return flash('当前没有本地配置；环境变量配置需在服务器上修改')
    configuringProvider.value=true
    try{
      const body=await api(`/ai/providers/${settingsProvider.value}/configuration`,{method:'DELETE'})
      providerOptions.value=body.data.providers
      if(provider.value===settingsProvider.value&&providerOptions.value.find(item=>item.id===provider.value)?.status==='unconfigured')provider.value='mock'
      settingsApiKey.value=''
      settingsModel.value=providerOptions.value.find(item=>item.id===settingsProvider.value)?.model||''
      settingsBaseUrl.value=providerOptions.value.find(item=>item.id===settingsProvider.value)?.base_url||''
      flash('已清除本机保存的配置')
    }catch(error){flash(error instanceof Error?error.message:'配置清除失败')}
    finally{configuringProvider.value=false}
  }
  const refreshImageConfiguration=async()=>{
    const body=await api('/ai/images/configuration')
    imageProvider.value=body.data
    imageEndpoint.value=body.data.endpoint
    imageRegion.value=body.data.region
    imageModel.value=body.data.model
  }
  const saveImageConfiguration=async()=>{
    if(configuringImage.value)return
    configuringImage.value=true
    try{
      const body=await api('/ai/images/configuration',{method:'POST',body:JSON.stringify({access_key_id:imageAccessKeyId.value.trim(),secret_access_key:imageSecretAccessKey.value.trim(),endpoint:imageEndpoint.value.trim(),region:imageRegion.value.trim(),model:imageModel.value.trim()})})
      imageProvider.value=body.data
      imageAccessKeyId.value='';imageSecretAccessKey.value=''
      flash('图片接口已保存到 Windows 用户配置目录')
    }catch(error){flash(error instanceof Error?error.message:'图片接口保存失败')}
    finally{configuringImage.value=false}
  }
  const clearImageConfiguration=async()=>{
    if(configuringImage.value)return
    configuringImage.value=true
    try{const body=await api('/ai/images/configuration',{method:'DELETE'});imageProvider.value=body.data;imageAccessKeyId.value='';imageSecretAccessKey.value='';flash('教学平台的图片接口配置已清除')}
    catch(error){flash(error instanceof Error?error.message:'图片接口清除失败')}
    finally{configuringImage.value=false}
  }
  onMounted(async()=>{
    try{
      await refreshProviders(true)
      if(settingsProvider.value==='ollama')await loadOllamaModels()
    }catch{flash('模型配置暂不可读取，可使用本地演示模式')}
    try{await refreshImageConfiguration()}catch{flash('图片生成配置暂不可读取')}
  })
  onMounted(async()=>{setInterval(()=>sessionSeconds.value++,1000);try{const body=await api('/courses');if(Array.isArray(body.data)&&body.data.length){const remote:Course[]=body.data.map(enrichCourse),localOnly=courses.value.filter(c=>!remote.some(r=>r.id===c.id));courses.value=[...remote,...localOnly];restoreDiscussion();persist();apiOnline.value=true}}catch{apiOnline.value=false}})
  const go=(next:Page)=>{if(coursePages.includes(next)&&!workspaceOpened.value){page.value='home';return flash('请先从教学工作台选择一门课程并进入')};page.value=next;if(current.value)addRecord('浏览模块',({home:'工作台',generate:'课堂生成',knowledge:'知识库与图谱',multimodal:'多模态内容',lesson:'互动课堂',agents:'协同课堂',analytics:'学习分析',library:'学科资源',settings:'系统设置'} as Record<Page,string>)[next],12)}
  const chooseTopic=(t:string,s:string,g:string)=>{topic.value=t;subject.value=s;grade.value=g}
  const knowledgeGraphRequest=(course:LessonPlan)=>({topic:course.title,subject:course.subject,description:course.description||'',objectives:course.objectives,key_points:course.keyPoints,difficult_points:course.difficultPoints,scenes:course.scenes.map(scene=>({title:scene.title,headline:scene.headline,knowledge_points:scene.knowledge})),provider:provider.value})
  const mindMapRequest=(course:LessonPlan)=>({topic:course.title,subject:course.subject,description:course.description||'',objectives:course.objectives,key_points:course.keyPoints,scenes:course.scenes.map(scene=>({title:scene.title,headline:scene.headline,knowledge_points:scene.knowledge})),quizzes:course.quiz.map(item=>item.question),provider:provider.value})
  const generate=async()=>{
    if(loading.value||uploading.value||discussionBusy.value||aiLoading.value)return
    if(!topic.value.trim())return flash('请输入课堂主题')
    loading.value=true
    subject.value=subject.value||inferSubject(topic.value)
    let id=Date.now()
    let plan=createLesson(topic.value.trim(),subject.value,grade.value)
    plan.description=courseDescription.value.trim()||undefined
    let live=false
    try{
      const body=await api('/ai/lessons/generate',{method:'POST',body:JSON.stringify({topic:topic.value.trim(),description:courseDescription.value.trim()||null,subject:subject.value,grade:grade.value,duration:duration.value,provider:provider.value,contentStyle:contentStyle.value,materials:draftMaterials.value.filter(item=>item.text).map(item=>({filename:item.name,text:item.text}))})})
      if(!body.data)throw Error('模型未返回课堂内容')
      plan=mergeGeneratedLesson(plan,body.data)
      live=body.data.mode==='live'
      aiOnline.value=live
    }catch(error){
      aiOnline.value=false
      if(provider.value!=='mock'){
        loading.value=false
        flash(error instanceof Error?error.message:'生成失败，请重试')
        return
      }
    }
    plan=resizeLessonDuration(plan,duration.value)
    const demo04=buildDemo04Data(plan)
    demo04.materials=[...draftMaterials.value]
    try{
      const body=await api('/ai/knowledge-graphs/generate',{method:'POST',body:JSON.stringify(knowledgeGraphRequest(plan))})
      if(body.data?.nodes)demo04.knowledgeGraph=normalizeKnowledgeGraphData(plan,body.data)
    }catch{}
    try{
      const body=await api('/ai/mind-maps/generate',{method:'POST',body:JSON.stringify(mindMapRequest(plan))})
      if(body.data?.root)demo04.mindMap=normalizeMindMapData(plan,body.data)
    }catch{}
    let synced=false
    try{
      const body=await api('/courses',{method:'POST',body:JSON.stringify({title:plan.title,subject:plan.subject,grade:plan.grade,status:'DRAFT',content:{...plan,demo04}})})
      if(body.data?.id){id=body.data.id;apiOnline.value=true;synced=true}
    }catch{}
    const item:Course={...plan,version:'0.4',duration:duration.value,id,status:'DRAFT',updatedAt:now(),demo04,resourceLinks:[],textbook:{completed:[],bookmarks:[],notes:{}},reflections:[]}
    courses.value=[item,...courses.value.filter(course=>course.id!==id)]
    currentId.value=id
    workspaceOpened.value=true
    sessionStorage.setItem(workspaceKey,String(id))
    sceneIndex.value=0
    slideIndex.value=0
    restoreDiscussion()
    records.value=[]
    persist()
    loading.value=false
    page.value='knowledge'
    flash((live?'真实模型已生成课堂':'已生成本地演示课堂')+(synced?'':'；课程仅保存在本机'))
  }
  const open=(course:Course,next:Page='lesson')=>{if(discussionBusy.value||aiLoading.value)return flash('请先停止讨论或等待答疑完成');currentId.value=course.id;records.value=loadRecords(course.id,course.title);sessionSeconds.value=0;workspaceOpened.value=true;sessionStorage.setItem(workspaceKey,String(course.id));sceneIndex.value=0;slideIndex.value=0;selectedAnswer.value=null;showAnswer.value=false;selectedNodeId.value=course.demo04.knowledgeGraph.nodes[0]?.id||'';nodeDraft.value=course.demo04.knowledgeGraph.nodes[0]?.label||'';edgeTargetId.value='';mindSelectedId.value=course.demo04.mindMap.root.id;mindLabelDraft.value=course.demo04.mindMap.root.label;restoreDiscussion();page.value=next;addRecord('打开课堂',course.title,30)}
  const remove=async(id:number)=>{if(discussionBusy.value||aiLoading.value)return flash('请先结束当前讨论或答疑');if(apiOnline.value)try{await api('/courses/'+id,{method:'DELETE'})}catch{}courses.value=courses.value.filter(c=>c.id!==id);localStorage.removeItem(`${recordsKey}-${id}`);if(currentId.value===id){currentId.value=courses.value[0]?.id||0;workspaceOpened.value=false;sessionStorage.removeItem(workspaceKey);page.value='home'}persist();flash('课程已删除')}
  const publishing=ref(false)
  const publish=async()=>{
    const course=current.value
    if(!course||publishing.value)return
    publishing.value=true
    const status=course.status==='PUBLISHED'?'DRAFT':'PUBLISHED'
    try{
      await api('/courses/'+course.id,{method:'PUT',body:JSON.stringify({title:course.title,subject:course.subject,grade:course.grade,status})})
      course.status=status
      course.updatedAt=now()
      persist()
      apiOnline.value=true
      flash(status==='PUBLISHED'?'课程发布状态已保存到服务器':'课程已退回草稿')
    }catch{
      flash('发布状态未保存，请检查后端连接及课程是否已同步')
    }finally{
      publishing.value=false
    }
  }
  const selectScene=(i:number)=>{sceneIndex.value=Math.max(0,Math.min(current.value.scenes.length-1,i));selectedAnswer.value=null;showAnswer.value=false;imagePrompt.value='';addRecord('浏览场景',currentScene.value.title,55)}
  const recordGrade=async(attempt:QuizAttempt)=>{
    const course=current.value
    if(course.quizAttempts?.some(item=>item.index===attempt.index))return
    course.quizAttempts=[...(course.quizAttempts||[]),attempt]
    const knowledge=course.quiz[attempt.index]?.knowledge
    const node=course.demo04.knowledgeGraph.nodes.find(item=>item.label===knowledge)
    if(node)node.mastery=attempt.score
    addRecord('完成测验',course.quiz[attempt.index].knowledge,75,attempt.score)
    persist()
    await saveCurrent()
  }
  const uploadMaterials=async(e:Event)=>{
    if(uploading.value)return
    const input=e.target as HTMLInputElement
    const isDraft=page.value==='generate'
    const target=isDraft?draftMaterials.value:current.value.demo04.materials
    uploading.value=true
    try{
      for(const file of Array.from(input.files||[])){
        if(target.filter(item=>item.text).length>=(isDraft?5:25)){flash(isDraft?'生成时最多使用 5 份资料':'每门课程最多保存 25 份文件');break}
        if(file.size>5*1024*1024){flash(file.name+' 超过 5 MB');continue}
        const bytes=new Uint8Array(await file.arrayBuffer())
        let binary=''
        for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192))
        let stored:{id:string;downloadUrl:string}|undefined
        try{
          if(!isDraft){
            const storedBody=await api('/resources',{method:'POST',body:JSON.stringify({filename:file.name,content_base64:btoa(binary)})})
            stored=storedBody.data
          }
          const body=await api('/ai/materials/parse',{method:'POST',body:JSON.stringify({filename:file.name,content_base64:btoa(binary)})})
          const data=body.data
          target.push({id:Date.now()+Math.random(),name:file.name,type:file.name.split('.').pop()?.toUpperCase()||'',size:Math.ceil(file.size/1024)+' KB',status:'已解析',chunks:data.chunks,points:[],summary:data.summary,uploadedAt:now(),text:data.text,truncated:data.truncated,resourceId:stored?.id,downloadUrl:stored?.downloadUrl})
          flash(data.truncated?'已解析；生成将使用前 8000 字符':'文件文字解析完成')
        }catch(error){
          if(stored){target.push({id:Date.now()+Math.random(),name:file.name,type:file.name.split('.').pop()?.toUpperCase()||'',size:Math.ceil(file.size/1024)+' KB',status:'仅存档',chunks:0,points:[],summary:'原文件已保存；当前解析器暂不支持提取此文件内容。',uploadedAt:now(),resourceId:stored.id,downloadUrl:stored.downloadUrl});flash('原文件已保存，但内容解析失败')}
          else flash(error instanceof Error?error.message:'解析失败')
        }
      }
      persist()
      if(!isDraft&&input.files?.length)await saveCurrent()
    }finally{uploading.value=false;input.value=''}
  }
  const generateFromMaterials=()=>{
    draftMaterials.value=current.value.demo04.materials.filter(item=>item.text).slice(0,5)
    topic.value=current.value.title
    subject.value=current.value.subject
    grade.value=current.value.grade
    page.value='generate'
  }
  const deleteMaterial=async(id:number)=>{const material=current.value.demo04.materials.find(item=>item.id===id);if(material?.resourceId)try{await api('/resources/'+material.resourceId,{method:'DELETE'})}catch{}current.value.demo04.materials=current.value.demo04.materials.filter(m=>m.id!==id);persist();await saveCurrent()}
  const addResourceLink=async()=>{
    const url=resourceUrl.value.trim()
    if(!url)return flash('请输入网课或资料链接')
    try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw Error()}catch{return flash('请输入有效的 HTTP/HTTPS 链接')}
    current.value.resourceLinks=[...(current.value.resourceLinks||[]),{id:Date.now(),title:resourceTitle.value.trim()||url,url,note:resourceNote.value.trim(),createdAt:now()}]
    resourceTitle.value='';resourceUrl.value='';resourceNote.value='';persist();await saveCurrent()
  }
  const deleteResourceLink=async(id:number)=>{current.value.resourceLinks=(current.value.resourceLinks||[]).filter(item=>item.id!==id);persist();await saveCurrent()}
  const suggestedImagePrompt=()=>`教学插图，${current.value.subject}课程《${current.value.title}》，场景“${currentScene.value.title}”，表现${currentScene.value.knowledge.join('、')}，结构清晰，适合课堂演示，画面不要出现文字或水印`
  const generateSceneImage=async()=>{
    if(imageGenerating.value)return
    if(imageProvider.value.status!=='configured'){page.value='settings';return flash('请先配置图片生成接口')}
    const prompt=imagePrompt.value.trim()||suggestedImagePrompt()
    const [width,height]=imageSize.value.split('x').map(Number)
    imageGenerating.value=true
    try{
      const body=await api('/ai/images/generate',{method:'POST',body:JSON.stringify({prompt,width,height})})
      const generated=body.data?.images?.[0]
      let url=generated?.url,resourceId:string|undefined
      if(generated?.content_base64){
        try{const stored=await api('/resources',{method:'POST',body:JSON.stringify({filename:`${current.value.title}-${currentScene.value.title}.${generated.extension||'jpg'}`,content_base64:generated.content_base64})});url=stored.data.downloadUrl;resourceId=stored.data.id}
        catch{flash('配图已生成，但本地图片归档失败，将暂时使用远程地址')}
      }
      if(!url)throw Error('图片服务未返回有效图片')
      const slide=currentVisualSlide.value
      if(slide){if(slide.imageResourceId&&slide.imageResourceId!==resourceId)try{await api('/resources/'+slide.imageResourceId,{method:'DELETE'})}catch{}slide.imageUrl=url;slide.imageResourceId=resourceId;slide.imagePrompt=prompt;slide.imageProvider=body.data.provider;slide.imageModel=body.data.model}
      imagePrompt.value=prompt
      persist();await saveCurrent();addRecord('AI 生成配图',currentScene.value.title,40)
      flash('课堂配图已生成并保存到当前课程')
    }catch(error){flash(error instanceof Error?error.message:'图片生成失败')}
    finally{imageGenerating.value=false}
  }
  const mindSourceName=(kind:string)=>({course:'课程',objective:'目标',key_point:'知识点',scene:'场景',slide:'课件页',quiz:'测验'} as Record<string,string>)[kind]||kind
  const selectMindNode=(id:string)=>{const entry=findMindEntry(current.value.demo04.mindMap.root,id);if(!entry)return;mindSelectedId.value=id;mindLabelDraft.value=entry.node.label}
  const toggleMindNode=(id:string)=>{const entry=findMindEntry(current.value.demo04.mindMap.root,id);if(entry){entry.node.collapsed=!entry.node.collapsed;persist()}}
  const setAllMindNodes=(collapsed:boolean)=>{const visit=(node:MindMapNode)=>{node.collapsed=collapsed;node.children.forEach(visit)};visit(current.value.demo04.mindMap.root);persist()}
  const saveMindNode=()=>{const entry=selectedMindEntry.value;if(!entry)return;const label=Array.from(mindLabelDraft.value.replace(/\s+/g,'')).slice(0,15).join('');if(!label)return flash('节点名称不能为空');entry.node.label=label;mindLabelDraft.value=label;persist();flash('节点名称已保存')}
  const addMindChild=()=>{const entry=selectedMindEntry.value;if(!entry)return;if(entry.depth>=4)return flash('思维导图最多 4 级');if(entry.node.children.length>=12)return flash('每个节点最多 12 个子节点');const id=`mind-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;const inherited=entry.node.sourceRefs.length?entry.node.sourceRefs.slice(0,2).map(item=>({...item})):[{kind:'course' as const,index:0,label:current.value.title}];const child:MindMapNode={id,label:'新节点',sourceRefs:inherited,children:[]};entry.node.children.push(child);entry.node.collapsed=false;persist();selectMindNode(id);flash('已新增子节点')}
  const deleteMindNode=()=>{const entry=selectedMindEntry.value;if(!entry?.parent)return flash('根节点不能删除');entry.parent.children=entry.parent.children.filter(item=>item.id!==entry.node.id);persist();selectMindNode(entry.parent.id);flash('节点已删除')}
  const generateMindMap=async()=>{if(mindGenerating.value)return;mindGenerating.value=true;try{const body=await api('/ai/mind-maps/generate',{method:'POST',body:JSON.stringify(mindMapRequest(current.value))});if(!body.data?.root)throw Error('模型未返回思维导图');current.value.demo04.mindMap=normalizeMindMapData(current.value,body.data);mindSelectedId.value=current.value.demo04.mindMap.root.id;mindLabelDraft.value=current.value.demo04.mindMap.root.label;aiOnline.value=body.data.mode==='live';persist();await saveCurrent();flash(body.data.mode==='live'?'真实 AI 已重新生成思维导图':'已生成结构化演示导图')}catch(error){flash(error instanceof Error?error.message:'思维导图生成失败')}finally{mindGenerating.value=false}}
  const serializeMindNode=(node:MindMapNode):object=>({id:node.id,label:node.label,source_refs:node.sourceRefs.map(item=>({kind:item.kind,index:item.index,label:item.label})),children:node.children.map(serializeMindNode)})
  const exportMindMapJson=()=>{const map=current.value.demo04.mindMap;saveTextFile(`${current.value.title}-思维导图.json`,JSON.stringify({schema_version:'zhixue.mindmap.1',root:serializeMindNode(map.root),provider:map.provider||'editor',mode:map.mode||'mock',model:map.model||null},null,2),'application/json;charset=utf-8');addRecord('导出思维导图','JSON',20)}
  const exportMindMapSvg=()=>{const positions:{node:MindMapNode;depth:number;x:number;y:number;parentId?:string}[]=[];let row=0,maxDepth=1;const place=(node:MindMapNode,depth:number,parentId?:string):number=>{maxDepth=Math.max(maxDepth,depth);const childYs=node.children.map(child=>place(child,depth+1,node.id));const y=childYs.length?(childYs[0]+childYs[childYs.length-1])/2:55+row++*76;positions.push({node,depth,x:36+(depth-1)*230,y,parentId});return y};place(current.value.demo04.mindMap.root,1);const width=Math.max(840,maxDepth*230+190),height=Math.max(260,row*76+70),byId=new Map(positions.map(item=>[item.node.id,item]));const colors=['','#273b67','#536df0','#18a27a','#f2a65a'];const edges=positions.filter(item=>item.parentId).map(item=>{const parent=byId.get(item.parentId!);return parent?`<path d="M ${parent.x+178} ${parent.y} C ${parent.x+200} ${parent.y}, ${item.x-22} ${item.y}, ${item.x} ${item.y}"/>`:''}).join('');const nodes=positions.map(item=>`<g transform="translate(${item.x},${item.y-24})"><rect width="178" height="48" rx="12" fill="${colors[item.depth]}"/><text x="89" y="21" text-anchor="middle" class="label">${xmlEscape(item.node.label)}</text><text x="89" y="37" text-anchor="middle" class="meta">L${item.depth} · ${item.node.sourceRefs.length} 个来源</text></g>`).join('');const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f7f9fe"/><style>path{fill:none;stroke:#aeb9d5;stroke-width:2}.label{font:700 14px Arial,'Microsoft YaHei';fill:white}.meta{font:10px Arial,'Microsoft YaHei';fill:#eef2ff}</style>${edges}${nodes}</svg>`;saveTextFile(`${current.value.title}-思维导图.svg`,svg,'image/svg+xml;charset=utf-8');addRecord('导出思维导图','SVG',20)}
  const submitReflection=async()=>{
    const answer=reflectionAnswer.value.trim()
    if(!answer||reflectionBusy.value)return
    if(provider.value==='mock')return flash('边读边想需要选择 Ollama 或已配置的真实模型')
    reflectionBusy.value=true;reflectionFeedback.value=''
    const prompt=`学习者正在思考：这个知识点与“${current.value.keyPoints[1]||current.value.keyPoints[0]}”之间有什么联系？学习者回答：${answer}。请判断回答中合理之处、缺少的关键联系，并给出一条具体改进建议。`
    try{
      const body=await api('/ai/lessons/chat',{method:'POST',body:JSON.stringify({question:prompt,topic:current.value.title,subject:current.value.subject,grade:current.value.grade,sceneTitle:currentScene.value.title,knowledgePoints:currentScene.value.knowledge,history:[],provider:provider.value})})
      reflectionFeedback.value=[body.data.answer,body.data.follow_up].filter(Boolean).join(' ')
      current.value.reflections=[...(current.value.reflections||[]),{id:Date.now(),sceneIndex:sceneIndex.value,prompt,answer,feedback:reflectionFeedback.value,at:now()}]
      addRecord('完成边读边想',currentScene.value.title,60);persist();await saveCurrent()
    }catch(error){flash(error instanceof Error?error.message:'AI 反馈失败，请重试')}
    finally{reflectionBusy.value=false}
  }
  const toggleTextbookCompleted=()=>{const state=current.value.textbook!;state.completed=state.completed.includes(sceneIndex.value)?state.completed.filter(index=>index!==sceneIndex.value):[...state.completed,sceneIndex.value];persist()}
  const toggleTextbookBookmark=()=>{const state=current.value.textbook!;state.bookmarks=state.bookmarks.includes(sceneIndex.value)?state.bookmarks.filter(index=>index!==sceneIndex.value):[...state.bookmarks,sceneIndex.value];persist()}
  const saveTextbookNote=()=>{persist();flash('教材笔记已保存到当前课程')}
  const selectNode=(id:string)=>{selectedNodeId.value=id;nodeDraft.value=current.value.demo04.knowledgeGraph.nodes.find(n=>n.id===id)?.label||'';edgeTargetId.value=''}
  const saveNode=()=>{if(!selectedNode.value)return;const label=Array.from(nodeDraft.value.replace(/\s+/g,'')).slice(0,15).join('');if(!label)return flash('知识点名称不能为空');selectedNode.value.label=label;nodeDraft.value=label;layoutKnowledgeGraph(current.value.demo04.knowledgeGraph);persist();flash('知识点已更新，生成内容约束同步生效')}
  const addNode=()=>{const graph=current.value.demo04.knowledgeGraph,parent=selectedNode.value||graph.nodes[0],id=`knowledge-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,level=Math.min(3,(parent?.level||0)+1),sourceRefs=parent?.sourceRefs.length?parent.sourceRefs.slice(0,2).map(item=>({...item})):[{kind:'course' as const,index:0,label:current.value.title}];graph.nodes.push({id,label:'新知识点',level,mastery:0,x:0,y:0,description:'教师新增的课程知识点',sourceRefs});if(parent)graph.edges.push({from:parent.id,to:id,type:'包含'});layoutKnowledgeGraph(graph);selectNode(id);persist();flash('已新增知识点')}
  const deleteNode=()=>{const node=selectedNode.value;if(!node)return;if(node.level===0)return flash('课程根节点不能删除');const graph=current.value.demo04.knowledgeGraph;graph.nodes=graph.nodes.filter(item=>item.id!==node.id);graph.edges=graph.edges.filter(edge=>edge.from!==node.id&&edge.to!==node.id);layoutKnowledgeGraph(graph);selectNode(graph.nodes[0]?.id||'');persist();flash('知识点及其关系已删除')}
  const addGraphEdge=()=>{const from=selectedNode.value?.id,to=edgeTargetId.value;if(!from||!to)return flash('请选择关系目标节点');if(from===to)return flash('不能连接节点自身');const graph=current.value.demo04.knowledgeGraph;if(graph.edges.some(edge=>edge.from===from&&edge.to===to&&edge.type===edgeType.value))return flash('该关系已存在');graph.edges.push({from,to,type:edgeType.value});edgeTargetId.value='';persist();flash('知识关系已新增')}
  const deleteGraphEdge=(target:KnowledgeEdge)=>{const graph=current.value.demo04.knowledgeGraph;graph.edges=graph.edges.filter(edge=>edge!==target);persist();flash('知识关系已删除')}
  const generateKnowledgeGraph=async()=>{if(graphGenerating.value)return;graphGenerating.value=true;try{const body=await api('/ai/knowledge-graphs/generate',{method:'POST',body:JSON.stringify(knowledgeGraphRequest(current.value))});if(!body.data?.nodes)throw Error('模型未返回知识图谱');current.value.demo04.knowledgeGraph=normalizeKnowledgeGraphData(current.value,body.data);selectNode(current.value.demo04.knowledgeGraph.nodes[0]?.id||'');aiOnline.value=body.data.mode==='live';persist();await saveCurrent();flash(body.data.mode==='live'?'真实 AI 已重新生成知识关系图':'已生成结构化知识关系图')}catch(error){flash(error instanceof Error?error.message:'知识图谱生成失败')}finally{graphGenerating.value=false}}
  const serializeKnowledgeGraph=()=>{const graph=current.value.demo04.knowledgeGraph;return{schema_version:'zhixue.knowledge-graph.1',nodes:graph.nodes.map(node=>({id:node.id,label:node.label,level:node.level,mastery:node.mastery,description:node.description,source_refs:node.sourceRefs.map(item=>({kind:item.kind,index:item.index,label:item.label}))})),edges:graph.edges,provider:graph.provider||'editor',mode:graph.mode||'mock',model:graph.model||null}}
  const exportKnowledgeGraphJson=()=>{saveTextFile(`${current.value.title}-知识关系图.json`,JSON.stringify(serializeKnowledgeGraph(),null,2),'application/json;charset=utf-8');addRecord('导出知识关系图','JSON',20)}
  const exportKnowledgeGraphSvg=()=>{const graph=current.value.demo04.knowledgeGraph,width=1000,height=560,colors=['#273b67','#536df0','#18a27a','#f2a65a'];const byId=new Map(graph.nodes.map(node=>[node.id,node]));const edges=graph.edges.map(edge=>{const from=byId.get(edge.from),to=byId.get(edge.to);if(!from||!to)return'';const mx=(from.x+to.x)/2,my=(from.y+to.y)/2;return`<path d="M ${from.x} ${from.y+29} C ${from.x} ${my}, ${to.x} ${my}, ${to.x} ${to.y-29}"/><rect x="${mx-24}" y="${my-10}" width="48" height="20" rx="10" class="edge-label"/><text x="${mx}" y="${my+4}" text-anchor="middle" class="relation">${edge.type}</text>`}).join('');const nodes=graph.nodes.map(node=>`<g transform="translate(${node.x-76},${node.y-29})"><rect width="152" height="58" rx="13" fill="${colors[node.level]}"/><text x="76" y="25" text-anchor="middle" class="label">${xmlEscape(node.label)}</text><text x="76" y="43" text-anchor="middle" class="meta">L${node.level+1} · ${node.sourceRefs.length} 个来源</text></g>`).join('');const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f7f9fe"/><style>path{fill:none;stroke:#aeb9d5;stroke-width:2}.edge-label{fill:white;stroke:#d8dfed}.relation{font:10px Arial,'Microsoft YaHei';fill:#536078}.label{font:700 14px Arial,'Microsoft YaHei';fill:white}.meta{font:10px Arial,'Microsoft YaHei';fill:#eef2ff}</style>${edges}${nodes}</svg>`;saveTextFile(`${current.value.title}-知识关系图.svg`,svg,'image/svg+xml;charset=utf-8');addRecord('导出知识关系图','SVG',20)}
  const playNarration=(text?:string,role:'teacher'|'student'='teacher')=>speech.speak(text||`${currentSlide.value.title}。${currentSlide.value.bullets.join('。')}`,role)
  const pushAgent=(role:string,icon:string,content:string)=>agentMessages.value.push({id:Date.now()+Math.random(),role,icon,content,time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})})
  const stopDiscussion=()=>{discussionController?.abort()}
  const startDiscussion=async()=>{
    if(discussionBusy.value||aiLoading.value)return
    if(provider.value==='mock')return flash('协同讨论需要选择 Ollama 或已配置的真实模型')
    const ordered=['teacher','classmate','coach','recorder'].map(id=>agents.value.find(agent=>agent.id===id)).filter((agent):agent is AgentRole=>!!agent?.enabled)
    if(!ordered.length)return flash('请至少启用一个角色')
    const rounds=Math.min(3,Math.max(1,discussionRounds.value))
    const course=current.value
    const scene=currentScene.value
    const selectedProvider=provider.value
    const question=aiQuestion.value.trim()
    if(question.length>1000)return flash('讨论问题最多1000字')
    if(question){pushAgent('我','🙋',question);aiQuestion.value='';persist()}
    discussionBusy.value=true
    discussionController=new AbortController()
    const signal=discussionController.signal
    let resultMessage='讨论完成'
    try{
      for(let round=0;round<rounds;round++){
        for(const agent of ordered){
          if(signal.aborted)throw Error('讨论已停止')
          activeAgent.value=agent.name+' · 第'+(round+1)+'轮'
          const body=await api('/ai/discussions/turn',{method:'POST',signal,body:JSON.stringify({
            topic:course.title,subject:course.subject,scene:scene.title+'：'+scene.content,
            knowledge_points:scene.knowledge,question,agent_role:agent.id,provider:selectedProvider,
            messages:agentMessages.value.filter(item=>item.role!=='系统').slice(-12).map(item=>({role:item.role,content:item.content.slice(0,4000)})),
          })})
          if(signal.aborted)throw Error('讨论已停止')
          const turn=body.data
          agentMessages.value.push({id:Date.now()+Math.random(),role:agent.name,icon:agent.icon,content:turn.content,time:now(),provider:turn.provider,model:turn.model,mode:turn.mode})
          if(agent.id==='recorder')recorderNotes.value=[...recorderNotes.value,...turn.notes].slice(-100)
          if(agent.id==='teacher')whiteboard.value=turn.board
          aiOnline.value=turn.mode==='live'
          persist()
        }
      }
      addRecord('多智能体讨论',course.title,rounds*60)
    }catch(error){
      resultMessage=signal.aborted?'讨论已停止，已完成发言保留':(error instanceof Error?error.message:'讨论失败')
      if(!signal.aborted)aiOnline.value=false
    }finally{
      snapshotDiscussion()
      try{
        await api('/courses/'+course.id,{method:'PUT',body:JSON.stringify({title:course.title,subject:course.subject,grade:course.grade,status:course.status,content:course})})
      }catch{resultMessage+='；服务器保存失败，记录仍保留在本机'}
      discussionBusy.value=false
      activeAgent.value=''
      discussionController=undefined
      flash(resultMessage)
    }
  }
  const askTeacher=async()=>{if(aiLoading.value||discussionBusy.value)return;const question=aiQuestion.value.trim();if(!question)return;aiQuestion.value='';pushAgent('我','🙋',question);aiLoading.value=true;let answerText=`先定位“${currentScene.value.knowledge[0]||current.value.keyPoints[0]}”：找出条件，再建立与${current.value.keyPoints[1]||'核心概念'}的关系，最后用课堂案例验证。`;try{const body=await api('/ai/lessons/chat',{method:'POST',body:JSON.stringify({question,topic:current.value.title,subject:current.value.subject,grade:current.value.grade,sceneTitle:currentScene.value.title,knowledgePoints:currentScene.value.knowledge,history:agentMessages.value.slice(-6),provider:provider.value})});if(body.data){answerText=`${body.data.answer} ${body.data.follow_up||''}`;aiOnline.value=body.data.mode==='live';if(!aiOnline.value)answerText='【演示模板】'+answerText}}catch(error){aiOnline.value=false;if(provider.value!=='mock'){pushAgent('系统','⚠',error instanceof Error?error.message:'答疑失败，请重试');aiLoading.value=false;return}answerText='【离线演示模板】'+answerText;flash('AI 服务不可用，以下为本地模板讲解')}pushAgent('AI 导师·知行','🧑‍🏫',answerText);whiteboard.value=[`问题：${question}`,`核心概念：${currentScene.value.knowledge.join('、')||current.value.keyPoints.join('、')}`,`推理路径：条件识别 → 关系建立 → 证据验证`,`结论：${answerText.slice(0,56)}…`];recorderNotes.value.push(`重点：${currentScene.value.knowledge.join('、')||current.value.keyPoints.join('、')}`);recorderNotes.value.push(`待复习：${current.value.difficultPoints[0]}`);addRecord('AI 答疑',question,110);aiLoading.value=false;persist()}
  const saveWhiteboard=async()=>{if(whiteboard.value.length)current.value.demo04.whiteboard.unshift({title:`${currentScene.value.title}课堂板书`,items:[...whiteboard.value],saved:true});persist();await saveCurrent();flash('绘图白板与 AI 板书已保存到当前课程')}
  const toggleAgent=(agent:AgentRole)=>{if(discussionBusy.value)return;agent.enabled=!agent.enabled;persist();flash(`${agent.name}已${agent.enabled?'加入':'离开'}课堂`)}
  const nextSlide=(n:number)=>{slideIndex.value=Math.max(0,Math.min(current.value.demo04.slides.length-1,slideIndex.value+n));addRecord('浏览课件',currentSlide.value.title,40)}
  const recommend=()=>{const weak=weakNodes.value[0]?.label;if(!weak)return flash('请先完成测验，系统才能根据真实结果生成路径');current.value.demo04.learningPath.splice(2,0,{stage:`个性强化：${weak}`,reason:`该知识点真实测验掌握度为 ${weakNodes.value[0].mastery}%，结合“${interest.value}”兴趣案例强化`,status:'待学习'});persist();flash('已根据真实测验结果更新个性化路径')}
  const doExport=async(kind:'html'|'json'|'zip'|'pptx')=>{try{if(kind==='html')exportHtml(current.value,records.value);if(kind==='json')exportJson(current.value,records.value);if(kind==='zip')exportPackage(current.value,records.value);if(kind==='pptx')await exportPptx(current.value);addRecord('导出课堂',kind.toUpperCase(),20);flash(kind==='pptx'?'已导出含真实配图、动画和转场的可编辑 PowerPoint':kind==='zip'?'已导出包含课件、数据、笔记和报告的 ZIP 课堂包':`已导出 ${kind.toUpperCase()} 文件`)}catch(error){flash(error instanceof Error?error.message:'导出失败')}}
  return {...speech,courses,page,coursePages,workspaceOpened,current,currentScene,currentSlide,currentVisualSlide,sceneIndex,slideIndex,topic,courseDescription,subject,grade,duration,provider,providerOptions,settingsProvider,settingsApiKey,settingsModel,settingsBaseUrl,configuringProvider,ollamaModels,ollamaLoading,loadOllamaModels,editProvider,saveProviderConfiguration,clearProviderConfiguration,imageProvider,imageAccessKeyId,imageSecretAccessKey,imageEndpoint,imageRegion,imageModel,configuringImage,saveImageConfiguration,clearImageConfiguration,draftMaterials,uploading,saving,saveCurrent,generateFromMaterials,contentStyle,loading,message,subjects,subjectFilter,visibleCourses,apiOnline,aiOnline,graphZoom,relationFilter,graphEdges,selectedNodeId,selectedNode,nodeDraft,graphGenerating,edgeTargetId,edgeType,selectedGraphRelations,graphNodeLabelLength,layoutKnowledgeGraph,generateKnowledgeGraph,exportKnowledgeGraphJson,exportKnowledgeGraphSvg,deleteNode,addGraphEdge,deleteGraphEdge,selectedAnswer,showAnswer,quizType,quizDifficulty,simulationValue,spotlight,imagePrompt,imageSize,imageGenerating,suggestedImagePrompt,generateSceneImage,narrating,recognizing,aiQuestion,aiLoading,agents,agentMessages,recorderNotes,whiteboard,records,sessionSeconds,studentView,interest,weakOnly,totalMinutes,averageMastery,quizAverage,weakNodes,masteryNodes,knowledgeMastery,reflectionAnswer,reflectionFeedback,reflectionBusy,submitReflection,resourceTitle,resourceUrl,resourceNote,addResourceLink,deleteResourceLink,mindSelectedId,mindLabelDraft,mindLabelLength,mindGenerating,selectedMindEntry,selectedMindNode,mindSourceName,selectMindNode,toggleMindNode,setAllMindNodes,saveMindNode,addMindChild,deleteMindNode,generateMindMap,exportMindMapJson,exportMindMapSvg,audioTurns,textbookProgress,toggleTextbookCompleted,toggleTextbookBookmark,saveTextbookNote,persist,flash,go,chooseTopic,generate,open,remove,publish,selectScene,recordGrade,uploadMaterials,deleteMaterial,selectNode,saveNode,addNode,playNarration,startAsr,startDiscussion,stopDiscussion,discussionBusy,discussionRounds,activeAgent,askTeacher,saveWhiteboard,toggleAgent,nextSlide,recommend,doExport}
},template:`
<div class="app demo04"><aside><div class="brand"><b>智</b><span>智学<small>智能互动教学平台</small></span></div><nav>
<div class="nav-section root-nav"><small>主要入口</small><button :class="{active:page==='generate'}" @click="go('generate')">✦ <span><b>创建课堂</b><em>新建一门互动课程</em></span></button><button :class="{active:page==='home'}" @click="go('home')">⌂ <span><b>教学工作台</b><em>选择或更换当前课程</em></span></button></div>
<div v-if="workspaceOpened&&current" class="course-workspace"><div class="current-course-card"><small>当前课程工作区</small><b>{{current.title}}</b><span>{{current.subject}} · {{current.grade}}</span><button @click="go('home')">更换课程</button></div>
<div class="nav-section nested-nav"><small>课程准备</small><button :class="{active:page==='knowledge'}" @click="go('knowledge')">⌘ <span><b>知识与资料</b><em>资料解析和知识图谱</em></span></button><button :class="{active:page==='multimodal'}" @click="go('multimodal')">▰ <span><b>教学内容</b><em>课件、测验与互动教材</em></span></button><button :class="{active:page==='library'}" @click="go('library')">▤ <span><b>课程资源库</b><em>文件、网课和参考链接</em></span></button></div>
<div class="nav-section nested-nav"><small>课堂教学</small><button :class="{active:page==='lesson'}" @click="go('lesson')">▣ <span><b>互动课堂</b><em>授课、答疑与白板</em></span></button><button :class="{active:page==='agents'}" @click="go('agents')">♙ <span><b>协同讨论</b><em>多智能体课堂</em></span></button></div>
<div class="nav-section nested-nav"><small>课后复盘</small><button :class="{active:page==='analytics'}" @click="go('analytics')">◒ <span><b>学习分析</b><em>记录和掌握情况</em></span></button></div></div>
<div class="nav-section root-nav system-nav"><small>系统</small><button :class="{active:page==='settings'}" @click="go('settings')">⚙ <span><b>系统设置</b><em>AI 接口与语音</em></span></button></div>
</nav><div class="note"><b>服务状态</b><i>● {{apiOnline?'业务服务在线':'业务服务离线'}}</i><br><i>● {{aiOnline?'真实模型已响应':'当前未调用真实模型'}}</i></div></aside>
<main><header><span>智学 / <template v-if="coursePages.includes(page)&&current">教学工作台 / {{current.title}} / </template><b>{{({home:'教学工作台',generate:'创建课堂',knowledge:'知识与资料',multimodal:'教学内容',lesson:'互动课堂',agents:'协同讨论',analytics:'学习分析',library:'学科资源',settings:'系统设置'})[page]}}</b></span><div><span class="status">● {{apiOnline?'服务在线':'离线模式'}}</span><span class="model-chip">{{providerOptions.find(item=>item.id===provider)?.name||provider}}</span><button v-if="coursePages.includes(page)" @click="saveCurrent" :disabled="saving">保存课堂</button><button v-if="page!=='settings'" @click="go('settings')">设置</button><span class="avatar">师</span></div></header>
<section v-if="page==='settings'" class="settings-page">
<div class="page-bar"><div><span class="subject-badge">系统管理</span><h1>AI、图片与语音设置</h1><p>集中管理大模型、教学配图和浏览器语音；密钥不保存在项目目录。</p></div></div>
<div class="settings-layout"><section class="panel settings-card"><div class="settings-heading"><span>01</span><div><h2>AI 模型接口</h2><p>云端模型填写 API Key；Ollama 直接读取本机模型，不需要密钥。</p></div></div>
<div class="provider-tabs"><button v-for="item in providerOptions.filter(item=>item.id!=='mock')" :class="{active:settingsProvider===item.id}" @click="editProvider(item.id)"><b>{{item.name}}</b><small>{{item.status==='configured'?'已配置':'未配置'}}</small></button></div>
<form class="settings-form" @submit.prevent="saveProviderConfiguration"><label v-if="settingsProvider!=='ollama'">API Key<input v-model="settingsApiKey" type="password" autocomplete="new-password" placeholder="留空可保留已保存的 API Key；不限制长度"></label><label>接口 URL<input v-model="settingsBaseUrl" type="url" placeholder="例如 https://api.deepseek.com"></label><label>模型名称<select v-if="settingsProvider==='ollama'&&ollamaModels.length" v-model="settingsModel"><option v-for="item in ollamaModels" :value="item.name">{{item.name}} · {{item.parameter_size||'本机模型'}} {{item.quantization}}</option></select><input v-else v-model="settingsModel" :placeholder="settingsProvider==='ollama'?'例如 qwen3.5:4b':'例如 deepseek-chat'"></label><div v-if="settingsProvider==='ollama'" class="local-model-status"><div><b>本机 Ollama</b><p>{{ollamaModels.length?'已读取本机模型，可直接选择后启用':'保存接口 URL 后点击刷新读取对应 Ollama 模型'}}</p></div><button type="button" :disabled="ollamaLoading" @click="loadOllamaModels">{{ollamaLoading?'检测中…':'刷新本机模型'}}</button></div><div class="security-note"><b>项目外保存</b><p>接口 URL、模型和 API Key 保存在 Windows 用户配置目录的 ZhixueTeachingPlatform 文件夹。复制或发送整个项目时不会携带密钥。</p></div><div class="settings-actions"><button class="primary" :disabled="configuringProvider">{{configuringProvider?'正在保存…':'保存并启用'}}</button><button type="button" :disabled="configuringProvider||providerOptions.find(item=>item.id===settingsProvider)?.source!=='local'" @click="clearProviderConfiguration">清除本地配置</button></div></form></section>
<section class="panel settings-card image-provider-card"><div class="settings-heading"><span>02</span><div><h2>教学图片生成</h2><p>已整合 project-image-asset-generator 的火山引擎文生图能力。</p></div><b class="provider-state" :class="{ready:imageProvider.status==='configured'}">{{imageProvider.status==='configured'?'已配置':'未配置'}}</b></div><form class="settings-form" @submit.prevent="saveImageConfiguration"><label>AccessKey ID<input v-model="imageAccessKeyId" type="password" autocomplete="new-password" :placeholder="imageProvider.access_key_hint?'已保存 '+imageProvider.access_key_hint+'，留空保留':'填写 IAM AccessKey ID'"></label><label>SecretAccessKey<input v-model="imageSecretAccessKey" type="password" autocomplete="new-password" placeholder="留空可保留已保存的 SecretAccessKey"></label><label>接口 URL<input v-model="imageEndpoint" type="url"></label><div class="two-col"><label>地域<input v-model="imageRegion"></label><label>生图模型 / req_key<input v-model="imageModel"></label></div><div class="security-note"><b>密钥不进入项目</b><p>配置文件：{{imageProvider.storage||'Windows 用户配置目录 / ZhixueTeachingPlatform'}}。首次启动会自动识别原图片生成器的用户配置，但不会把密钥写入任何项目文件。</p></div><div class="settings-actions"><button class="primary" :disabled="configuringImage">{{configuringImage?'正在保存…':'保存图片接口'}}</button><button type="button" :disabled="configuringImage||imageProvider.status!=='configured'" @click="clearImageConfiguration">清除教学平台配置</button></div></form></section>
<section class="panel settings-card"><div class="settings-heading"><span>03</span><div><h2>浏览器语音</h2><p>配置课堂旁白和语音提问使用的本机声线。</p></div></div>
<details><summary>语音设置 · 浏览器服务</summary><div class="two-col">
<label>教师声线<select v-model="teacherVoice" :disabled="narrating"><option value="">系统默认</option><option v-for="voice in voices" :key="voice.voiceURI" :value="voice.voiceURI">{{voice.name}} · {{voice.lang}}</option></select></label>
<label>学生声线<select v-model="studentVoice" :disabled="narrating"><option value="">系统默认</option><option v-for="voice in voices" :key="voice.voiceURI" :value="voice.voiceURI">{{voice.name}} · {{voice.lang}}</option></select></label>
<label>识别 / 默认朗读语言<select v-model="language" :disabled="recognizing||narrating"><option value="zh-CN">普通话</option><option value="en-US">英语</option><option value="zh-HK">粤语（需服务支持）</option></select></label>
<label>朗读语速 {{rate}}×<input type="range" v-model.number="rate" min="0.5" max="1.5" step="0.05" :disabled="narrating"></label></div>
<p>朗读：{{ttsAvailable?'浏览器接口可用':'不支持'}}；识别：{{asrAvailable?'浏览器接口可用，需权限和服务支持':'不支持，请输入文字'}}。云端多提供商尚未接入。语音识别可能将音频发送至浏览器厂商服务，点击麦克风后才开始；结果需核对后手动发送。</p></details>
<p role="status" aria-live="polite">{{speechStatus||'可在课件中播放旁白，或点击麦克风输入问题。'}}<span v-if="interimText"> 临时识别：{{interimText}}</span></p>
<button v-if="narrating||recognizing" @click="stopSpeech();speechStatus='语音已停止'">停止全部语音</button>
</section></div></section>

<section v-else-if="page==='home'"><div class="hero hero04"><div><span class="hero-tag">DEMO 0.4 · KNOWLEDGE-GROUNDED</span><h1>真人教师与 AI 导师协同的智能课堂</h1><p>上传课程资料后构建知识图谱，自动生成文本、测验、PPT、角色朗读、思维导图和互动教材，并由多智能体陪伴教学与分析学习效果。</p></div><button class="hero-button" @click="go('generate')">创建 0.4 课堂 →</button></div><div class="workspace-guide" :class="{active:workspaceOpened}"><span>{{workspaceOpened?'✓':'1'}}</span><div v-if="workspaceOpened&&current"><h3>当前课程工作区：{{current.title}}</h3><p>左侧已展开这门课程的“课程准备、课堂教学、课后复盘”。如需切换课程，直接在下方选择另一门课程。</p></div><div v-else><h3>先选择一门课程</h3><p>点击下方课程卡片的“进入课程工作区”，左侧才会展开该课程的备课、教学和复盘功能。</p></div><button v-if="workspaceOpened&&current" @click="open(current)">返回互动课堂</button></div><div class="metric-grid"><article><span>课程知识库</span><b>{{courses.reduce((n,c)=>n+c.demo04.materials.length,0)}}</b><small>实际上传并解析的文件</small></article><article><span>知识图谱</span><b>{{current.demo04.knowledgeGraph.nodes.length}}</b><small>课程知识点与关系</small></article><article><span>当前课程掌握度</span><b>{{averageMastery===null?'--':averageMastery+'%'}}</b><small>{{averageMastery===null?'完成测验后显示':weakNodes.length+' 个薄弱知识点'}}</small></article><article><span>本课程学习时长</span><b>{{totalMinutes}}m</b><small>{{records.length}} 条真实行为记录</small></article></div><div class="section-head"><div><h2>课程发布与管理</h2><p>教师端统一管理课程、知识库、发布状态与课堂数据</p></div><div class="filters"><button v-for="x in ['全部',...subjects]" :class="{active:subjectFilter===x}" @click="subjectFilter=x">{{x}}</button></div></div><div class="grid"><article v-for="c in visibleCourses" :key="c.id" class="card course-card"><div class="card-top"><span class="subject-badge">{{c.subject}}</span><span class="state" :class="{published:c.status==='PUBLISHED'}">{{c.status==='PUBLISHED'?'已发布':'待审核'}}</span></div><h3>{{c.title}}</h3><p>{{c.grade}} · {{c.scenes.length}} 个场景 · {{c.demo04.knowledgeGraph.nodes.length}} 个知识点</p><div class="knowledge-preview"><span v-for="x in c.keyPoints.slice(0,3)">{{x}}</span></div><footer><small>{{c.updatedAt}}</small><div><button class="enter-workspace" @click="open(c)">进入课程工作区</button><button @click="open(c,'analytics')">学情</button><button class="danger" @click="remove(c.id)">删除</button></div></footer></article></div></section>

<section v-else-if="page==='generate'">
<div class="page-title"><span>统一多模型生成引擎</span><h1>从主题或资料生成完整互动课堂</h1><p>课程大纲、知识图谱、多模态内容、测验、项目任务和学习路径一次生成。</p></div>
<div class="generate-layout"><div class="panel form-panel">
<label>课程主题<input v-model="topic" @keyup.enter="generate" placeholder="例如：丝绸之路的交流与影响"></label>
<label>课程描述（选填）<textarea v-model="courseDescription" maxlength="4000" placeholder="补充教学对象、课程深度、活动形式、重点要求等，AI 会将其作为生成要求。"></textarea><small>{{courseDescription.length}} / 4000</small></label>
<div class="two-col"><label>学科<select v-model="subject"><option v-for="x in subjects">{{x}}</option></select></label><label>年级<select v-model="grade"><option v-for="x in ['七年级','八年级','九年级','高一','高二','高三']">{{x}}</option></select></label></div>
<div class="two-col"><label>模型提供商<select v-model="provider"><option v-for="item in providerOptions" :value="item.id" :disabled="item.status==='unconfigured'">{{item.name}}{{item.status==='unconfigured'?'（未配置）':''}}</option></select></label><label>内容模式<select v-model="contentStyle"><option>综合模式</option><option>视觉优先</option><option>音频优先</option><option>项目式学习</option></select></label></div>
<label>参考资料（最多5份，每份5MB）<input type="file" multiple accept=".txt,.md,.pdf,.pptx" @change="uploadMaterials" :disabled="uploading"></label><p v-if="uploading">正在提取文件文字…</p><div v-for="(item,index) in draftMaterials"><span>{{item.name}} · {{item.text?.length}} 字符{{item.truncated?'（已截取）':''}}</span><button @click="draftMaterials.splice(index,1)">移除</button></div><p>真实模型会同时参考课程描述和上传资料；演示模式仅保留输入。</p>
<label>课堂时长 <b>{{duration}} 分钟</b><input type="range" min="20" max="90" step="5" v-model.number="duration"></label><button class="primary wide" :disabled="loading||uploading" @click="generate">{{loading?'知识图谱约束生成中…':'生成 Demo 0.4 完整课堂'}}</button><p class="hint">选择已配置的提供商调用真实模型；密钥、接口 URL 和模型名称在系统设置中管理。</p>
</div><div class="panel examples"><h3>学科生成示例</h3><button @click="chooseTopic('唐诗中的月亮意象','语文','高二')"><b>语文</b><span>沉浸阅读与角色朗读</span></button><button @click="chooseTopic('二次函数的图像与性质','数学','九年级')"><b>数学</b><span>参数模拟与分层测验</span></button><button @click="chooseTopic('Travel Plans：旅行情境口语','英语','八年级')"><b>英语</b><span>多语言语音与角色对话</span></button><button @click="chooseTopic('丝绸之路：跨文明交流','历史','七年级')"><b>历史</b><span>时空图谱与史料项目</span></button><button @click="chooseTopic('季风气候与我们的生活','地理','八年级')"><b>地理</b><span>地图判读与区域决策</span></button></div></div></section>

<section v-else-if="page==='knowledge' && current"><div class="page-bar"><div><span class="subject-badge">{{current.subject}}</span><h1>课程知识库与知识关系图</h1><p>{{current.title}} · 图谱节点最多 4 级、短语化并挂载原课件来源</p></div><div class="bar-actions"><label class="upload-btn">＋ 上传教材/课件<input type="file" multiple accept=".txt,.md,.pdf,.pptx" @change="uploadMaterials"></label><button @click="generateFromMaterials">用资料生成课堂</button><button @click="generateKnowledgeGraph" :disabled="graphGenerating">{{graphGenerating?'AI 生成中…':'AI 重新生成图谱'}}</button><button class="primary" @click="addNode">＋ 新增知识点</button></div></div><div class="knowledge-layout knowledge-layout-v2"><div class="panel material-panel"><div class="panel-title"><div><h3>课程资料</h3><small>文本清洗 · 智能切分 · 知识抽取 · 质量校验</small></div><span>{{current.demo04.materials.length}} 个文件</span></div><article v-for="m in current.demo04.materials" class="material-row"><b class="file-icon">{{m.type}}</b><div><strong>{{m.name}}</strong><small>{{m.size}} · {{m.chunks}} 个内容分块 · {{m.uploadedAt}}</small><p>{{m.summary}}</p><div class="mini-tags"><span v-for="x in m.points">{{x}}</span></div></div><button @click="deleteMaterial(m.id)">×</button></article><div v-if="!current.demo04.materials.length" class="empty">上传 TXT、MD、PDF 或 PPTX 构建课程知识库</div></div><div class="panel graph-panel graph-panel-v2"><div class="graph-toolbar"><div><span>规范关系 JSON · {{current.demo04.knowledgeGraph.nodes.length}} 节点 / {{current.demo04.knowledgeGraph.edges.length}} 关系</span><h3>知识关系图</h3><small>沿上下层级阅读，箭头和标签表示真实知识关系。</small></div><div class="graph-tools"><button @click="exportKnowledgeGraphJson">导出 JSON</button><button @click="exportKnowledgeGraphSvg">导出 SVG</button><select v-model="relationFilter"><option>全部</option><option>前置</option><option>包含</option><option>因果</option><option>关联</option></select><label>缩放 <input type="range" min="70" max="135" v-model.number="graphZoom"> {{graphZoom}}%</label></div></div><div class="graph-scroll relation-canvas"><svg class="knowledge-graph" viewBox="0 0 1000 560" :style="{width:(1000*graphZoom/100)+'px',height:(560*graphZoom/100)+'px'}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#91a0c4"/></marker></defs><g v-for="e in graphEdges" class="graph-edge"><path :d="'M '+current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.from)?.x+' '+(current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.from)?.y+30)+' C '+current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.from)?.x+' '+((current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.from)?.y+current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.to)?.y)/2)+', '+current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.to)?.x+' '+((current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.from)?.y+current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.to)?.y)/2)+', '+current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.to)?.x+' '+(current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.to)?.y-30)" :class="'edge '+e.type" marker-end="url(#arrow)"/><g :transform="'translate('+((current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.from)?.x+current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.to)?.x)/2)+','+((current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.from)?.y+current.demo04.knowledgeGraph.nodes.find(n=>n.id===e.to)?.y)/2)+')'"><rect x="-24" y="-10" width="48" height="20" rx="10"/><text>{{e.type}}</text></g></g><g v-for="n in current.demo04.knowledgeGraph.nodes" class="knowledge-node" :class="['level-'+n.level,{selected:selectedNodeId===n.id,weak:n.mastery>0&&n.mastery<65}]" :transform="'translate('+(n.x-76)+','+(n.y-29)+')'" @click="selectNode(n.id)"><rect width="152" height="58" rx="13"/><text x="76" y="25">{{n.label}}</text><text class="node-meta" x="76" y="43">L{{n.level+1}} · {{n.sourceRefs.length}} 个来源{{n.mastery?' · '+n.mastery+'%':''}}</text></g></svg></div><div class="legend relation-legend"><span><i class="includes"></i>包含：上位概念</span><span><i class="prereq"></i>前置：学习顺序</span><span><i class="cause"></i>因果：机理关系</span><span><i class="link"></i>关联：相关证据</span><small>{{current.demo04.knowledgeGraph.schemaVersion}} · {{current.demo04.knowledgeGraph.model||current.demo04.knowledgeGraph.provider||'手动编辑'}}</small></div></div><aside class="panel node-editor graph-inspector"><h3>知识点编辑</h3><template v-if="selectedNode"><span>第 {{selectedNode.level+1}} 级 · {{selectedGraphRelations.length}} 条关系</span><label>节点短语（最多 15 字）<input v-model="nodeDraft" maxlength="15"></label><small class="field-count">{{graphNodeLabelLength}} / 15</small><label>层级<select v-model.number="selectedNode.level" :disabled="selectedNode.level===0" @change="layoutKnowledgeGraph(current.demo04.knowledgeGraph)"><option :value="1">第 2 级</option><option :value="2">第 3 级</option><option :value="3">第 4 级</option></select></label><label>掌握度<input type="range" min="0" max="100" v-model.number="selectedNode.mastery"><b>{{selectedNode.mastery}}%</b></label><label>说明<textarea v-model="selectedNode.description" maxlength="300"></textarea></label><button class="primary wide" @click="saveNode">保存节点</button><button class="danger wide" @click="deleteNode" :disabled="selectedNode.level===0">删除节点</button><h3>原课件标记</h3><div v-for="source in selectedNode.sourceRefs" class="mind-source"><b>{{mindSourceName(source.kind)}} #{{source.index+1}}</b><span>{{source.label}}</span></div><h3>新增关系</h3><div class="edge-compose"><select v-model="edgeTargetId"><option value="">选择目标节点</option><option v-for="node in current.demo04.knowledgeGraph.nodes.filter(node=>node.id!==selectedNode.id)" :value="node.id">{{node.label}}</option></select><select v-model="edgeType"><option>前置</option><option>包含</option><option>因果</option><option>关联</option></select><button @click="addGraphEdge">＋ 添加关系</button></div><h3>已有关系</h3><div v-if="!selectedGraphRelations.length" class="empty compact">暂无关系</div><div v-for="e in selectedGraphRelations" class="relation-item"><span>{{e.from===selectedNode.id?'指向':'来自'}} · {{e.type}} · {{current.demo04.knowledgeGraph.nodes.find(n=>n.id===(e.from===selectedNode.id?e.to:e.from))?.label}}</span><button @click="deleteGraphEdge(e)">×</button></div></template></aside></div></section>

<section v-else-if="page==='multimodal' && current">
<div class="page-bar"><div><span class="subject-badge">{{current.subject}}</span><h1>多模态教学内容</h1><p>每种内容都来自当前课程场景、知识点和真实学习记录。</p></div><div class="bar-actions"><button @click="doExport('pptx')">导出课程 PPTX</button><button class="primary" @click="doExport('html')">导出互动 HTML</button></div></div>
<div class="mode-tabs"><button v-for="x in ['沉浸文本','分段测验','PPT 与旁白','角色对话朗读','思维导图','互动教材','项目式学习']" @click="contentStyle=x" :class="{active:contentStyle===x}">{{x}}</button></div>
<div v-if="contentStyle==='综合模式'||contentStyle==='沉浸文本'" class="multimodal-grid"><article class="panel immersive"><span>沉浸式文本 · {{currentScene.knowledge[0]}}</span><h2>{{currentScene.headline}}</h2><p>{{currentScene.content}}</p><div class="inline-question"><b>边读边想 · AI 反馈</b><p>这个知识点与“{{current.keyPoints[1]||current.keyPoints[0]}}”之间有什么联系？</p><div class="reflection-compose"><textarea v-model="reflectionAnswer" placeholder="写下你的判断，提交后由当前真实模型反馈"></textarea><button @click="submitReflection" :disabled="reflectionBusy||!reflectionAnswer.trim()">{{reflectionBusy?'AI 分析中…':'提交给 AI'}}</button></div><div v-if="reflectionFeedback" class="reflection-feedback"><b>AI 反馈</b><p>{{reflectionFeedback}}</p></div></div></article><article class="panel visual-card image-generator"><div class="generated-visual" :class="{hasImage:currentVisualSlide?.imageUrl}"><img v-if="currentVisualSlide?.imageUrl" :src="currentVisualSlide.imageUrl" :alt="currentVisualSlide.imagePrompt||currentScene.title"><template v-else><b>{{current.subject}}</b><span>{{currentScene.knowledge.join(' × ')}}</span><i :style="{transform:'scale('+(simulationValue/60)+')'}"></i></template><a v-if="currentVisualSlide?.imageUrl" :href="currentVisualSlide.imageUrl" target="_blank" rel="noreferrer">查看原图</a></div><div class="image-generator-head"><div><b>AI 教学配图</b><small>{{imageProvider.status==='configured'?'已连接 '+imageProvider.name:'需要先在系统设置配置'}}</small></div><button v-if="imageProvider.status!=='configured'" @click="go('settings')">去设置</button></div><textarea v-model="imagePrompt" :placeholder="suggestedImagePrompt()" maxlength="2000"></textarea><div class="image-generate-actions"><select v-model="imageSize"><option value="1024x1024">1:1 · 1024×1024</option><option value="1280x720">16:9 · 1280×720</option><option value="720x1280">9:16 · 720×1280</option><option value="1536x1024">3:2 · 1536×1024</option></select><button class="primary" @click="generateSceneImage" :disabled="imageGenerating">{{imageGenerating?'图片生成中…':currentVisualSlide?.imageUrl?'重新生成配图':'生成本场景配图'}}</button></div><p>生成会调用火山引擎视觉服务，可能产生费用；图片地址会保存在当前课程。</p></article></div>
<quiz-panel v-else-if="contentStyle==='分段测验'" :key="current.id" :course="current" :provider="provider" @graded="recordGrade"/>
<div v-else-if="contentStyle==='PPT 与旁白'" class="slide-studio"><div :key="'slide-'+slideIndex" class="panel slide-canvas" :class="[{spotlight,withImage:currentSlide.imageUrl},'animation-'+currentSlide.animation,'transition-'+currentSlide.transition]"><div class="slide-copy"><small>{{currentSlide.knowledge}} · {{currentSlide.visual}}</small><h2>{{currentSlide.title}}</h2><ul><li v-for="x in currentSlide.bullets">{{x}}</li></ul></div><img v-if="currentSlide.imageUrl" class="slide-generated-image" :src="currentSlide.imageUrl" :alt="currentSlide.imagePrompt||currentSlide.title"><div class="spotlight-ring"></div></div><aside class="panel narration"><h3>PPT 图片、动画与旁白</h3><label><input type="checkbox" v-model="spotlight"> 按知识点自动高亮</label><label>本页对象动画<select v-model="currentSlide.animation" @change="persist"><option value="none">无动画</option><option value="fade">淡入</option><option value="fly">飞入</option><option value="appear">出现</option></select></label><label>切换转场<select v-model="currentSlide.transition" @change="persist"><option value="none">无转场</option><option value="fade">淡化</option><option value="push">推进</option><option value="wipe">擦除</option></select></label><p>导出时文字保持可编辑，当前配图会作为真实媒体嵌入 PPTX。</p><p v-if="currentSlide.imageUrl">本页已挂载 AI 教学配图，可在沉浸文本中重新生成。</p><button class="primary wide" @click="playNarration()">{{narrating?'停止旁白':'▶ 播放本页旁白'}}</button><button class="wide" @click="doExport('pptx')">导出完整课程 PPTX</button></aside><div class="slide-controls"><button :disabled="slideIndex===0" @click="nextSlide(-1)">← 上一页</button><span>{{slideIndex+1}} / {{current.demo04.slides.length}}</span><button :disabled="slideIndex===current.demo04.slides.length-1" @click="nextSlide(1)">下一页 →</button></div></div>
<div v-else-if="contentStyle==='角色对话朗读'" class="podcast panel"><div class="content-intro"><div><span>听觉复习</span><h2>当前场景角色对话朗读</h2><p>把课程讲解、学生追问和活动提示拆成角色轮次，帮助学生听读复习；不是预生成音频文件。</p></div><select v-model.number="sceneIndex"><option v-for="(scene,index) in current.scenes" :value="index">{{index+1}}. {{scene.title}}</option></select></div><div v-for="turn in audioTurns" class="speaker" :class="turn.kind"><b>{{turn.kind==='teacher'?'🧑‍🏫':'🧑‍🎓'}} {{turn.role}}</b><p>{{turn.text}}</p><button @click="playNarration(turn.text,turn.kind)">播放这一轮</button></div></div>
<div v-else-if="contentStyle==='思维导图'" class="mindmap-workspace panel"><div class="mindmap-toolbar"><div><span>规范树形 JSON · 最多 4 级</span><h2>AI 课程思维导图</h2><p>从课程总题逐级拆分，每个节点都保留原课件来源标记。</p></div><div class="mindmap-actions"><button @click="setAllMindNodes(false)">全部展开</button><button @click="setAllMindNodes(true)">全部收起</button><button @click="exportMindMapJson">导出 JSON</button><button @click="exportMindMapSvg">导出 SVG</button><button class="primary" @click="generateMindMap" :disabled="mindGenerating">{{mindGenerating?'AI 生成中…':'AI 重新生成'}}</button></div></div><div class="mindmap-editor-layout"><div class="mindmap-canvas"><mind-map-node-view :node="current.demo04.mindMap.root" :depth="1" :selected-id="mindSelectedId" @select="selectMindNode" @toggle="toggleMindNode"/></div><aside v-if="selectedMindNode" class="mindmap-inspector"><span>节点编辑 · 第 {{selectedMindEntry.depth}} 级</span><label>节点短语（最多 15 字）<input v-model="mindLabelDraft" maxlength="15"></label><small>{{mindLabelLength}} / 15</small><div class="mindmap-edit-actions"><button class="primary" @click="saveMindNode">保存名称</button><button @click="addMindChild" :disabled="selectedMindEntry.depth>=4">＋ 新增子节点</button><button class="danger" @click="deleteMindNode" :disabled="!selectedMindEntry.parent">删除节点</button></div><h3>原课件标记</h3><div v-if="!selectedMindNode.sourceRefs.length" class="empty compact">暂无来源标记</div><div v-for="source in selectedMindNode.sourceRefs" class="mind-source"><b>{{mindSourceName(source.kind)}} #{{source.index+1}}</b><span>{{source.label}}</span></div><details><summary>查看节点 JSON</summary><pre>{{JSON.stringify(selectedMindNode,null,2)}}</pre></details><p class="mindmap-schema">版本：{{current.demo04.mindMap.schemaVersion}}<br>模型：{{current.demo04.mindMap.model||current.demo04.mindMap.provider||'手动编辑'}}</p></aside></div></div>
<project-learning-panel v-else-if="contentStyle==='项目式学习'" :task="current.demo04.projectTask" @changed="persist" @save="saveCurrent" @message="flash"/>
<div v-else class="interactive-book panel"><div class="book-head"><div><span>课程互动教材</span><h2>{{current.title}}</h2><p>阅读场景、记录笔记、收藏重点，并标记真实学习进度。</p></div><div class="book-progress"><b>{{textbookProgress}}%</b><span>已完成 {{current.textbook.completed.length}} / {{current.scenes.length}}</span></div></div><div class="process-flow"><button v-for="(s,i) in current.scenes" @click="selectScene(i)" :class="{active:sceneIndex===i,done:current.textbook.completed.includes(i)}"><b>{{current.textbook.completed.includes(i)?'✓':i+1}}</b><span>{{s.title}}</span><small>{{current.textbook.bookmarks.includes(i)?'已收藏':'点击学习'}}</small></button></div><div class="book-layout"><article><span>{{currentScene.type}} · {{currentScene.duration}} 分钟</span><h3>{{currentScene.headline}}</h3><p>{{currentScene.content}}</p><div class="knowledge-row"><span v-for="x in currentScene.knowledge">{{x}}</span></div><div class="book-activity"><div><b>学习任务</b><p>{{currentScene.studentActivity}}</p></div><div><b>互动方式</b><p>{{currentScene.interaction}}</p></div></div><div class="book-actions"><button @click="toggleTextbookBookmark">{{current.textbook.bookmarks.includes(sceneIndex)?'取消收藏':'☆ 收藏本节'}}</button><button class="primary" @click="toggleTextbookCompleted">{{current.textbook.completed.includes(sceneIndex)?'标记为未完成':'✓ 完成本节'}}</button></div></article><aside><h3>我的本节笔记</h3><textarea v-model="current.textbook.notes[String(sceneIndex)]" placeholder="记录理解、疑问或课堂任务结果"></textarea><button class="primary wide" @click="saveTextbookNote">保存笔记</button><h3>检查理解</h3><p>{{current.quiz.find(item=>currentScene.knowledge.includes(item.knowledge))?.question||'完成本节后，尝试用自己的话概括核心知识与适用条件。'}}</p><button @click="contentStyle='分段测验'">进入课程测验 →</button></aside></div></div>
</section>

<section v-else-if="page==='lesson' && current"><div class="lesson-toolbar"><div><span class="subject-badge">{{current.subject}}</span><h1>{{current.title}}</h1><p>{{current.grade}} · {{current.duration}} 分钟 · {{current.status==='PUBLISHED'?'已审核发布':'AI 草稿待审核'}}</p></div><div class="toolbar-actions"><button @click="publish">{{current.status==='PUBLISHED'?'退回草稿':'✓ 审核并发布'}}</button><button @click="doExport('json')">JSON</button><button @click="doExport('pptx')">PPTX</button><button @click="doExport('html')">HTML</button><button class="primary" @click="doExport('zip')">ZIP 完整课堂包</button></div></div><div class="lesson-layout lesson04"><aside class="scene-nav"><div class="plan-summary"><b>课堂导航</b><span>{{current.scenes.length}} 个场景</span></div><button v-for="(s,i) in current.scenes" :class="{active:sceneIndex===i}" @click="selectScene(i)"><em>{{String(i+1).padStart(2,'0')}}</em><span><b>{{s.title}}</b><small>{{s.duration}} 分钟 · {{s.interaction}}</small></span></button><button class="project-entry" @click="page='multimodal';contentStyle='项目式学习'">🧭 项目式学习</button></aside><div class="stage"><div class="scene-hero"><div><span>{{currentScene.type}} · {{currentScene.duration}} MIN</span><h2>{{currentScene.headline}}</h2><p>{{currentScene.content}}</p></div><div class="scene-number">{{String(sceneIndex+1).padStart(2,'0')}}</div></div><div class="activity-grid"><article><small>教师活动</small><p>{{currentScene.teacherActivity}}</p></article><article><small>学生活动</small><p>{{currentScene.studentActivity}}</p></article><article><small>互动 / 模拟</small><p>{{currentScene.interaction}}</p></article></div><div class="knowledge-row"><b>图谱约束</b><span v-for="x in currentScene.knowledge">{{x}}</span></div><div class="voice-question"><button @click="startAsr">{{recognizing?'■ 取消语音输入':'🎙 语音提问'}}</button><form @submit.prevent="askTeacher"><input v-model="aiQuestion" placeholder="向 AI 导师提问，回答后可生成图解白板"><button class="primary" :disabled="aiLoading">{{aiLoading?'讲解中…':'提问'}}</button></form></div><drawing-whiteboard v-model="current.demo04.drawingBoard" :ai-notes="whiteboard" :title="currentScene.title+' AI 绘图白板'" @changed="persist" @save="saveWhiteboard"/><quiz-panel v-if="sceneIndex===current.scenes.length-1" :key="current.id" :course="current" :provider="provider" @graded="recordGrade"/><div class="stage-footer"><button :disabled="sceneIndex===0" @click="selectScene(sceneIndex-1)">← 上一场景</button><span>课堂进度 <b>{{Math.round((sceneIndex+1)/current.scenes.length*100)}}%</b></span><button :disabled="sceneIndex===current.scenes.length-1" @click="selectScene(sceneIndex+1)">下一场景 →</button></div></div><aside class="design-panel"><h3>AI 导师学习路径</h3><section v-for="p in current.demo04.learningPath"><b>{{p.stage}}</b><p>{{p.reason}}</p><span class="path-state">{{p.status}}</span></section><section><b>课后项目</b><p>{{current.demo04.projectTask.challenge}}</p><button @click="page='multimodal';contentStyle='项目式学习'">进入项目工作区</button></section></aside></div></section>

<section v-else-if="page==='agents' && current"><div class="page-bar"><div><span class="subject-badge">{{current.subject}}</span><h1>多智能体协同课堂</h1><p>按已启用角色依次讨论，后续角色参考前面发言；教师提供文字板书，记录员汇总笔记。</p></div><div><select v-model="provider" :disabled="discussionBusy"><option v-for="item in providerOptions" :value="item.id" :disabled="item.status==='unconfigured'">{{item.name}}</option></select><select v-model.number="discussionRounds" :disabled="discussionBusy"><option :value="1">1 轮</option><option :value="2">2 轮</option><option :value="3">3 轮</option></select><button class="primary" @click="startDiscussion" :disabled="discussionBusy||aiLoading">{{discussionBusy?activeAgent+' 发言中…':'开始协同讨论'}}</button><button v-if="discussionBusy" @click="stopDiscussion">停止</button></div></div><div class="agent-layout"><aside class="panel agent-config"><h3>课堂角色配置</h3><article v-for="a in agents" :class="{off:!a.enabled}"><span>{{a.icon}}</span><div><b>{{a.name}}</b><small>{{a.duty}}</small><em>{{a.voice}}</em></div><button @click="toggleAgent(a)" :disabled="discussionBusy">{{a.enabled?'已启用':'启用'}}</button></article></aside><div class="panel classroom-chat"><div class="chat-head"><div><b>多角色课堂对话</b><small>全部发言会保留在侧边历史中</small></div><span>{{agents.filter(a=>a.enabled).length}} 个角色已启用</span></div><div class="chat-list agent-chat"><div v-if="!agentMessages.length" class="chat-empty">输入讨论问题，或直接点击“开始协同讨论”。</div><div v-for="m in agentMessages" :class="m.role==='我'?'student':'teacher'"><b>{{m.icon}} {{m.role}} · {{m.time}} {{m.mode==='live'?'· '+m.provider:m.mode==='mock'?'· 演示':''}}</b><p>{{m.content}}</p></div></div><form class="chat-input big" @submit.prevent="startDiscussion"><button type="button" @click="startAsr">{{recognizing?'■ 取消':'🎙'}}</button><input v-model="aiQuestion" maxlength="1000" placeholder="输入讨论问题，各角色将依次回应" :disabled="discussionBusy"><button class="primary" :disabled="discussionBusy||aiLoading">发送并讨论</button></form><div v-if="whiteboard.length" class="mini-board"><b>AI 导师白板</b><ul><li v-for="x in whiteboard">{{x}}</li></ul></div></div><aside class="panel recorder"><h3>📝 课堂记录员</h3><small>基于已完成发言汇总的笔记</small><ol><li v-for="x in recorderNotes">{{x}}</li></ol><button @click="doExport('zip')">保存并导出课堂笔记</button></aside></div></section>

<section v-else-if="page==='analytics' && current">
<div class="page-bar"><div><span class="subject-badge">{{current.subject}}</span><h1>真实学习记录与分析</h1><p>这里只统计当前课程实际产生的浏览、测验、AI 互动和讨论数据；没有数据时不会填充模板分数。</p></div><span class="data-scope">范围：{{studentView}}</span></div>
<div class="metric-grid analytics-metrics"><article><span>已测知识掌握度</span><b>{{averageMastery===null?'--':averageMastery+'%'}}</b><small>{{averageMastery===null?'尚未完成测验':knowledgeMastery.filter(item=>item.mastery!==null).length+' 个知识点有数据'}}</small></article><article><span>累计学习</span><b>{{totalMinutes}}m</b><small>{{records.length}} 条真实行为记录</small></article><article><span>测验平均分</span><b>{{quizAverage===null?'--':quizAverage}}</b><small>{{current.quizAttempts?.length||0}} 次已保存测验</small></article><article><span>薄弱知识点</span><b>{{weakNodes.length}}</b><small>{{averageMastery===null?'等待测验数据':'低于 65 分的实测知识点'}}</small></article></div>
<div class="analytics-layout"><div class="panel mastery-panel"><div class="panel-title"><div><h3>知识点测验结果</h3><small>仅由当前课程已提交的测验计算</small></div><label><input type="checkbox" v-model="weakOnly"> 只看薄弱点</label></div><div v-if="!masteryNodes.length" class="empty">尚无知识点测验结果</div><div v-for="n in masteryNodes" class="mastery-row"><span>{{n.label}}</span><div><i :style="{width:(n.mastery||0)+'%'}" :class="{weak:n.mastery!==null&&n.mastery<65}"></i></div><b>{{n.mastery===null?'未测':n.mastery+'%'}}</b></div></div>
<div class="panel profile-panel"><h3>基于证据的学习建议</h3><label>兴趣情境<select v-model="interest"><option>科技</option><option>阅读</option><option>音乐</option><option>体育</option><option>游戏</option></select></label><div class="evidence-summary"><div><span>教材进度</span><b>{{textbookProgress}}%</b></div><div><span>AI 反思</span><b>{{current.reflections?.length||0}}</b></div><div><span>讨论发言</span><b>{{current.discussion?.messages.length||0}}</b></div></div><h4>诊断</h4><p v-if="weakNodes.length">“{{weakNodes[0].label}}”当前实测 {{weakNodes[0].mastery}} 分，建议结合{{interest}}情境完成一次强化任务后重新测验。</p><p v-else-if="averageMastery!==null">当前已测知识点暂无低于 65 分的项目，可继续完成未测知识点。</p><p v-else>完成至少一次课程测验后，系统才会生成掌握度诊断与个性化路径。</p><button class="primary wide" @click="recommend" :disabled="!weakNodes.length">按真实结果生成学习路径</button></div>
<div class="panel record-panel"><h3>学习行为时间线</h3><div v-if="!records.length" class="empty">当前课程尚无学习行为</div><article v-for="r in records.slice(0,12)"><i></i><div><b>{{r.action}} · {{r.target}}</b><small>{{r.at}} · {{r.seconds}} 秒 <template v-if="r.score!=null">· {{r.score}} 分</template></small></div></article></div>
<div class="panel evidence-panel"><h3>数据来源</h3><ul><li>测验分数：{{current.quizAttempts?.length||0}} 条</li><li>沉浸文本 AI 反馈：{{current.reflections?.length||0}} 条</li><li>协同讨论消息：{{current.discussion?.messages.length||0}} 条</li><li>互动教材完成：{{current.textbook.completed.length}} 节</li></ul><p>平台不再用预设分数补齐缺失数据。</p><button @click="doExport('json')">导出原始报告数据</button></div></div>
</section>

<section v-else-if="page==='library' && current" class="library-page">
<div class="page-bar"><div><span class="subject-badge">{{current.subject}}</span><h1>{{current.title}} · 课程资源库</h1><p>保存这门课程实际使用的原文件、网课和参考链接，不再重复创建课堂。</p></div><label class="upload-btn">＋ 上传课程文件<input type="file" multiple accept=".txt,.md,.pdf,.pptx,.docx,.xlsx,.csv,.zip" @change="uploadMaterials" :disabled="uploading"></label></div>
<div class="resource-layout"><section class="panel"><div class="panel-title"><div><h3>已上传文件</h3><small>原文件保存在本机项目目录，解析内容随课程保存，最多 25 份</small></div><span>{{current.demo04.materials.length}} 份</span></div><div v-if="!current.demo04.materials.length" class="empty">尚未上传文件，可添加教材、讲义、PDF、PPTX、DOCX、XLSX、CSV 或 ZIP。</div><article v-for="m in current.demo04.materials" class="resource-file"><b class="file-icon">{{m.type}}</b><div><strong>{{m.name}}</strong><small>{{m.size}} · {{m.status}} · {{m.uploadedAt}}</small><p>{{m.summary}}</p><a v-if="m.downloadUrl" :href="m.downloadUrl" class="download-link">下载原文件</a></div><button @click="deleteMaterial(m.id)">删除</button></article></section>
<section class="panel link-manager"><h3>添加网课 / 参考链接</h3><label>名称（选填）<input v-model="resourceTitle" placeholder="例如：国家中小学智慧教育平台课程"></label><label>链接地址<input v-model="resourceUrl" type="url" placeholder="https://..."></label><label>使用说明（选填）<textarea v-model="resourceNote" placeholder="记录章节、观看范围或课堂用途"></textarea></label><button class="primary wide" @click="addResourceLink">保存到当前课程</button><hr><h3>已保存链接</h3><div v-if="!current.resourceLinks?.length" class="empty">尚未保存外部链接</div><article v-for="item in current.resourceLinks" class="resource-link"><div><a :href="item.url" target="_blank" rel="noopener noreferrer">{{item.title}} ↗</a><p v-if="item.note">{{item.note}}</p><small>{{item.createdAt}} · {{item.url}}</small></div><button @click="deleteResourceLink(item.id)">删除</button></article></section></div></section>
<div v-if="message" class="toast">{{message}}</div></main></div>`}

createApp(App).mount('#app')
