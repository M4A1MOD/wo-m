import { defineComponent, ref, computed, onBeforeUnmount, type PropType } from 'vue'
import type { LessonPlan } from './lesson-content'

export type QuizAttempt = { index:number; selected:number[]; text:string; score:number; feedback:string; mode:string; provider:string; model?:string; at:string }

export default defineComponent({
  props: {
    course: { type:Object as PropType<LessonPlan & {quizAttempts?:QuizAttempt[]}>, required:true },
    provider: { type:String, required:true },
  },
  emits: ['graded'],
  setup(props,{emit}) {
    const index=ref(0),selected=ref<number[]>([]),text=ref(''),busy=ref(false),error=ref('')
    const quiz=computed(()=>props.course.quiz[index.value])
    const attempt=computed(()=>props.course.quizAttempts?.find(item=>item.index===index.value))
    let active=true
    onBeforeUnmount(()=>{active=false})
    const choose=(option:number)=>{
      if(busy.value||attempt.value)return
      selected.value=quiz.value.type==='multiple'
        ? selected.value.includes(option)?selected.value.filter(value=>value!==option):[...selected.value,option]
        : [option]
    }
    const move=(next:number)=>{index.value=next;selected.value=[];text.value='';error.value=''}
    const submit=async()=>{
      if(busy.value||attempt.value)return
      if(quiz.value.type==='short'?!text.value.trim():!selected.value.length){error.value='请先填写或选择答案';return}
      busy.value=true
      error.value=''
      try{
        const response=await fetch('/api/v1/ai/quizzes/grade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          topic:props.course.title,provider:props.provider,
          quiz:{...quiz.value,knowledge_point:quiz.value.knowledge},selected:selected.value,text:text.value,
        })})
        const body=await response.json()
        if(!response.ok)throw Error(body.message||'批改失败，请稍后重试')
        if(active)emit('graded',{...body.data,index:index.value,selected:[...selected.value],text:text.value,at:new Date().toISOString()})
      }catch(reason){if(active)error.value=reason instanceof Error?reason.message:'批改失败'}
      finally{busy.value=false}
    }
    return {index,selected,text,busy,error,quiz,attempt,choose,move,submit}
  },
  template:`<div class="quiz-studio panel">
    <label>题目 <select :value="index" @change="move(Number($event.target.value))" :disabled="busy">
      <option v-for="(item,position) in course.quiz" :value="position">{{position+1}} · {{item.type==='multiple'?'多选':item.type==='short'?'简答':'单选'}}</option>
    </select></label>
    <h3>{{quiz.question}}</h3>
    <p>{{quiz.type==='multiple'?'多选题：全部选对得100分，漏选或错选得0分':quiz.type==='short'?'简答题：使用所选真实模型按评分要点批改':'单选题：选择一个答案'}}</p>
    <textarea v-if="quiz.type==='short'" v-model="text" maxlength="4000" :disabled="busy||!!attempt" placeholder="请输入你的解释和依据"></textarea>
    <button v-else v-for="(option,position) in quiz.options" class="option" :disabled="busy||!!attempt" :aria-pressed="selected.includes(position)" @click="choose(position)">
      {{selected.includes(position)?'☑':'☐'}} {{String.fromCharCode(65+position)}}. {{option}}
    </button>
    <button class="primary" @click="submit" :disabled="busy||!!attempt">{{busy?'批改中…':attempt?'已提交':'提交答案'}}</button>
    <p v-if="error" role="alert">{{error}}</p>
    <div v-if="attempt" class="analysis"><b>{{attempt.score}} 分 · {{attempt.mode==='live'?'AI 批改（'+attempt.provider+'）':'标准答案判分'}}</b>
      <p>你的答案：{{attempt.text||attempt.selected.map(value=>String.fromCharCode(65+value)).join('、')}}</p><p>{{attempt.feedback}}</p>
    </div>
  </div>`,
})
