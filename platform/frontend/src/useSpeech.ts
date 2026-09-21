import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

type Recognition = {
  lang:string; continuous:boolean; interimResults:boolean
  onresult:((event:{results:ArrayLike<{isFinal:boolean; [index:number]:{transcript:string}}>})=>void)|null
  onerror:((event:{error:string})=>void)|null
  onend:(()=>void)|null
  start:()=>void; abort:()=>void
}

export function useSpeech(question:Ref<string>, context:()=>string, blocked:()=>boolean) {
  const narrating=ref(false), recognizing=ref(false), speechStatus=ref(''), interimText=ref('')
  const language=ref('zh-CN'), rate=ref(.95), teacherVoice=ref(''), studentVoice=ref('')
  const voices=ref<SpeechSynthesisVoice[]>([])
  const synth=window.speechSynthesis
  const recognitionWindow=window as unknown as {SpeechRecognition?:new()=>Recognition; webkitSpeechRecognition?:new()=>Recognition}
  const RecognitionCtor=recognitionWindow.SpeechRecognition||recognitionWindow.webkitSpeechRecognition
  const ttsAvailable=!!synth && typeof window.SpeechSynthesisUtterance==='function'
  const asrAvailable=!!RecognitionCtor
  let utterance:SpeechSynthesisUtterance|undefined, recognition:Recognition|undefined
  let recognitionTimer:ReturnType<typeof setTimeout>|undefined

  const refreshVoices=()=>{voices.value=synth?.getVoices()||[]}
  const stopNarration=()=>{
    const wasActive=narrating.value
    utterance=undefined
    narrating.value=false
    if(wasActive)synth?.cancel()
  }
  const stopRecognition=()=>{
    const active=recognition
    recognition=undefined
    clearTimeout(recognitionTimer)
    recognizing.value=false
    interimText.value=''
    active?.abort()
  }
  const stopSpeech=()=>{stopNarration();stopRecognition()}
  const speak=(text:string, role:'teacher'|'student'='teacher')=>{
    if(narrating.value){stopNarration();speechStatus.value='旁白已停止';return}
    if(!ttsAvailable){speechStatus.value='当前浏览器不支持语音合成，请阅读原文';return}
    if(!text.trim()){speechStatus.value='没有可朗读的文字';return}
    stopRecognition()
    const active=new SpeechSynthesisUtterance(text)
    const selected=voices.value.find(voice=>voice.voiceURI===(role==='student'?studentVoice.value:teacherVoice.value))
    active.voice=selected||null
    active.lang=selected?.lang||language.value
    active.rate=rate.value
    active.onend=()=>{if(utterance!==active)return;utterance=undefined;narrating.value=false;speechStatus.value='旁白播放完毕'}
    active.onerror=()=>{if(utterance!==active)return;stopNarration();speechStatus.value='语音播放失败，请检查系统声线或重试'}
    utterance=active
    narrating.value=true
    speechStatus.value='正在播放浏览器旁白'
    try{synth.speak(active)}catch{stopNarration();speechStatus.value='无法启动语音播放，请重试'}
  }
  const startAsr=()=>{
    if(recognizing.value){stopRecognition();speechStatus.value='语音输入已取消，原有文字保留';return}
    if(blocked()){speechStatus.value='请先等待答疑或讨论结束';return}
    if(!RecognitionCtor){speechStatus.value='当前浏览器不支持语音识别，请直接输入文字';return}
    stopNarration()
    const original=question.value, originalContext=context()
    const active=new RecognitionCtor()
    active.lang=language.value
    active.continuous=false
    active.interimResults=true
    recognition=active
    recognizing.value=true
    speechStatus.value='正在请求麦克风并聆听（最长60秒），再次点击取消'
    active.onresult=event=>{
      if(recognition!==active||context()!==originalContext||blocked())return
      const results=Array.from(event.results)
      interimText.value=results.filter(result=>!result.isFinal).map(result=>result[0].transcript).join('')
      const finalText=results.filter(result=>result.isFinal).map(result=>result[0].transcript).join('').trim()
      if(!finalText)return
      if(question.value!==original){stopRecognition();speechStatus.value='输入框已被修改，未覆盖手动输入';return}
      if(finalText.length>1000){stopRecognition();speechStatus.value='识别文字超过1000字，请缩短后重试';return}
      question.value=finalText
      stopRecognition()
      speechStatus.value='识别完成，请核对文字后手动发送'
    }
    active.onerror=event=>{
      if(recognition!==active)return
      const errors:Record<string,string>={'not-allowed':'麦克风权限被拒绝，请在浏览器设置中允许','service-not-allowed':'浏览器语音识别服务不可用','audio-capture':'未找到可用麦克风','no-speech':'未检测到语音，请重试',network:'语音识别网络异常，请检查网络',aborted:'语音输入已取消','language-not-supported':'识别服务不支持当前语言'}
      stopRecognition()
      speechStatus.value=errors[event.error]||'语音识别失败，请重试或输入文字'
    }
    active.onend=()=>{if(recognition!==active)return;recognition=undefined;clearTimeout(recognitionTimer);recognizing.value=false;interimText.value='';speechStatus.value='识别结束，未得到有效文字，请重试'}
    try{
      active.start()
      if(recognition===active)recognitionTimer=setTimeout(()=>{if(recognition!==active)return;stopRecognition();speechStatus.value='语音输入已超时，请重试'},60000)
    }catch{stopRecognition();speechStatus.value='无法启动麦克风，请检查权限并重试'}
  }
  watch(context,()=>{stopSpeech();speechStatus.value=''}, {flush:'sync'})
  watch(blocked,busy=>{if(busy)stopRecognition()}, {flush:'sync'})
  onMounted(()=>{refreshVoices();synth?.addEventListener('voiceschanged',refreshVoices)})
  onBeforeUnmount(()=>{stopSpeech();synth?.removeEventListener('voiceschanged',refreshVoices)})
  return {narrating,recognizing,speechStatus,interimText,language,rate,teacherVoice,studentVoice,voices,ttsAvailable,asrAvailable,speak,startAsr,stopSpeech}
}
