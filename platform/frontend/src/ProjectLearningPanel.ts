import { computed, defineComponent, ref, type PropType } from 'vue'
import type { ProjectRubric, ProjectStage, ProjectTask } from './demo04-content'

const uid = (prefix:string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
const formatSize = (bytes:number) => bytes>1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.max(1,Math.ceil(bytes/1024))} KB`
const base64 = async(file:File) => {const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));return btoa(binary)}

export default defineComponent({
  name:'ProjectLearningPanel',
  props:{task:{type:Object as PropType<ProjectTask>,required:true}},
  emits:['changed','save','message'],
  setup(props,{emit}){
    const groupName=ref(''),groupMembers=ref(''),uploadingStage=ref('')
    const progress=computed(()=>Math.round(props.task.stages.filter(stage=>['已提交','已评价'].includes(stage.status)).length/Math.max(1,props.task.stages.length)*100))
    const rubricTotal=computed(()=>props.task.rubric.reduce((sum,item)=>sum+item.weight,0))
    const weightedScore=computed(()=>{const scored=props.task.rubric.filter(item=>item.score!==null);return scored.length?Math.round(scored.reduce((sum,item)=>sum+(item.score||0)*item.weight,0)/Math.max(1,scored.reduce((sum,item)=>sum+item.weight,0))):null})
    const changed=()=>emit('changed')
    const addGroup=()=>{const name=groupName.value.trim();if(!name)return emit('message','请输入小组名称');props.task.groups.push({id:uid('group'),name:name.slice(0,60),members:groupMembers.value.split(/[、,，\n]/).map(item=>item.trim()).filter(Boolean).slice(0,20)});groupName.value='';groupMembers.value='';changed()}
    const removeGroup=(id:string)=>{props.task.groups=props.task.groups.filter(item=>item.id!==id);changed()}
    const updateMembers=(id:string,event:Event)=>{const value=(event.target as HTMLTextAreaElement).value;const group=props.task.groups.find(item=>item.id===id);if(group){group.members=value.split(/[、,，\n]/).map(item=>item.trim()).filter(Boolean).slice(0,20);changed()}}
    const addStage=()=>{props.task.stages.push({id:uid('stage'),title:`阶段 ${props.task.stages.length+1}`,description:'填写本阶段目标与提交要求。',dueDate:'',status:'未开始',submissions:[]});changed()}
    const removeStage=(id:string)=>{if(props.task.stages.length<=1)return emit('message','至少保留一个项目阶段');props.task.stages=props.task.stages.filter(item=>item.id!==id);changed()}
    const addRubric=()=>{props.task.rubric.push({id:uid('rubric'),name:'新评价指标',description:'填写可观察、可评价的表现要求。',weight:0,score:null});changed()}
    const removeRubric=(id:string)=>{if(props.task.rubric.length<=1)return emit('message','至少保留一个评价指标');props.task.rubric=props.task.rubric.filter(item=>item.id!==id);changed()}
    const normalizeRubric=(rubric:ProjectRubric)=>{rubric.weight=Math.min(100,Math.max(0,Number(rubric.weight)||0));rubric.score=rubric.score===null?null:Math.min(100,Math.max(0,Number(rubric.score)||0));changed()}
    const upload=async(stage:ProjectStage,event:Event)=>{
      const input=event.target as HTMLInputElement,file=input.files?.[0]
      if(!file)return
      if(file.size>20*1024*1024){emit('message','成果文件不能超过 20 MB');input.value='';return}
      uploadingStage.value=stage.id
      try{
        const response=await fetch('/api/v1/resources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,content_base64:await base64(file)})})
        const body=await response.json()
        if(!response.ok)throw Error(body.message||'成果上传失败')
        stage.submissions.push({id:uid('submission'),filename:file.name,size:formatSize(file.size),uploadedAt:new Date().toLocaleString('zh-CN',{hour12:false}),note:'',resourceId:body.data.id,downloadUrl:body.data.downloadUrl})
        if(stage.status==='未开始'||stage.status==='进行中')stage.status='已提交'
        changed();emit('message','阶段成果已上传并保存')
      }catch(error){emit('message',error instanceof Error?error.message:'成果上传失败')}
      finally{uploadingStage.value='';input.value=''}
    }
    const removeSubmission=async(stage:ProjectStage,id:string)=>{const submission=stage.submissions.find(item=>item.id===id);if(submission?.resourceId)try{await fetch('/api/v1/resources/'+submission.resourceId,{method:'DELETE'})}catch{}stage.submissions=stage.submissions.filter(item=>item.id!==id);changed()}
    const save=()=>emit('save')
    return{groupName,groupMembers,uploadingStage,progress,rubricTotal,weightedScore,addGroup,removeGroup,updateMembers,addStage,removeStage,addRubric,removeRubric,normalizeRubric,upload,removeSubmission,changed,save}
  },
  template:`<div class="project-workspace">
    <section class="project-hero"><div><span>PROJECT-BASED LEARNING</span><h2>{{task.title}}</h2><p>{{task.challenge}}</p><div class="project-deliverables"><b>最终成果</b><i v-for="item in task.deliverables">{{item}}</i></div></div><div class="project-progress"><strong>{{progress}}%</strong><span>阶段完成度</span><button class="primary" @click="save">保存项目进度</button></div></section>
    <div class="project-grid">
      <section class="panel project-groups"><div class="project-section-head"><div><span>01</span><h3>项目分组</h3></div><small>{{task.groups.length}} 个小组</small></div><div class="group-compose"><input v-model="groupName" maxlength="60" placeholder="小组名称"><input v-model="groupMembers" maxlength="300" placeholder="成员姓名，用逗号分隔"><button @click="addGroup">＋ 创建小组</button></div><div v-if="!task.groups.length" class="empty">尚未分组，先创建小组并填写成员。</div><article v-for="group in task.groups" class="project-group"><div><b>{{group.name}}</b><button @click="removeGroup(group.id)">删除</button></div><textarea :value="group.members.join('、')" @change="updateMembers(group.id,$event)" placeholder="填写组员姓名"></textarea><small>{{group.members.length}} 名成员</small></article></section>
      <section class="panel project-stages"><div class="project-section-head"><div><span>02</span><h3>阶段任务与提交</h3></div><button @click="addStage">＋ 新增阶段</button></div><article v-for="(stage,index) in task.stages" class="project-stage" :class="stage.status"><header><em>{{String(index+1).padStart(2,'0')}}</em><input v-model="stage.title" maxlength="100" @change="changed"><select v-model="stage.status" @change="changed"><option>未开始</option><option>进行中</option><option>已提交</option><option>已评价</option></select><button @click="removeStage(stage.id)">×</button></header><textarea v-model="stage.description" maxlength="600" @change="changed" placeholder="阶段目标和提交要求"></textarea><div class="stage-meta"><label>截止日期 <input type="date" v-model="stage.dueDate" @change="changed"></label><label class="project-upload">{{uploadingStage===stage.id?'上传中…':'＋ 上传阶段成果'}}<input type="file" @change="upload(stage,$event)" :disabled="uploadingStage===stage.id"></label></div><div v-if="!stage.submissions.length" class="empty compact">本阶段暂无提交</div><div v-for="submission in stage.submissions" class="project-submission"><div><a v-if="submission.downloadUrl" :href="submission.downloadUrl">{{submission.filename}}</a><b v-else>{{submission.filename}}</b><small>{{submission.size}} · {{submission.uploadedAt}}</small></div><input v-model="submission.note" maxlength="500" @change="changed" placeholder="提交说明 / 教师反馈"><button @click="removeSubmission(stage,submission.id)">删除</button></div></article></section>
    </div>
    <section class="panel project-rubric"><div class="project-section-head"><div><span>03</span><h3>成果评价量规</h3></div><div><b :class="{warning:rubricTotal!==100}">权重 {{rubricTotal}}%</b><button @click="addRubric">＋ 指标</button></div></div><div class="rubric-table"><div class="rubric-head"><span>评价指标</span><span>表现要求</span><span>权重</span><span>评分</span><span></span></div><div v-for="rubric in task.rubric" class="rubric-row"><input v-model="rubric.name" maxlength="80" @change="changed"><textarea v-model="rubric.description" maxlength="400" @change="changed"></textarea><label><input type="number" min="0" max="100" v-model.number="rubric.weight" @change="normalizeRubric(rubric)">%</label><label><input type="number" min="0" max="100" v-model.number="rubric.score" @change="normalizeRubric(rubric)">分</label><button @click="removeRubric(rubric.id)">×</button></div></div><footer><p v-if="rubricTotal!==100">量规权重应合计为 100%，当前为 {{rubricTotal}}%。</p><div><span>项目加权得分</span><strong>{{weightedScore===null?'待评价':weightedScore+' 分'}}</strong></div></footer></section>
  </div>`,
})
