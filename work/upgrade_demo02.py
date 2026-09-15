from pathlib import Path

p = Path('outputs/智能互动教学平台-demo0.2.html')
s = p.read_text(encoding='utf-8')
s = s.replace('Demo 0.1', 'Demo 0.2')
s = s.replace('主题生成 · AI教师 · 测验反馈<br/>当前使用本地模拟数据，无需配置 API。', '课程 CRUD · 草稿持久化 · 课堂场景保存<br/>业务服务不可用时自动切换本地演示模式。')
start = s.index('  <script>')
end = s.index('  </script>', start) + len('  </script>')
script = '''  <script>
    const pages={home:'概览',generate:'生成课堂',lesson:'互动课堂',library:'知识库'};
    const API_BASE='http://localhost:8080/api/v1';
    const seed=[{id:1,title:'牛顿第二定律',subject:'物理',grade:'高一',status:'PUBLISHED',scenes:4,updatedAt:'2026-09-11 09:00'}];
    let courses=JSON.parse(localStorage.getItem('zhixue-courses')||JSON.stringify(seed)),currentCourse=courses[0],apiOnline=false;
    const toast=m=>{const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)};
    const persist=()=>localStorage.setItem('zhixue-courses',JSON.stringify(courses));
    async function api(path,opt={}){const r=await fetch(API_BASE+path,{...opt,headers:{'Content-Type':'application/json',...(opt.headers||{})}});if(!r.ok)throw Error(r.status);return r.json()}
    const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
    function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));document.getElementById('crumbText').textContent=pages[id]||'概览';if(id==='home')renderCourses();if(id==='lesson')renderLesson();window.scrollTo({top:0,behavior:'smooth'})}
    function renderCourses(){const g=document.querySelector('#home .grid');if(!g)return;g.innerHTML=courses.map(c=>`<div class="card course"><span class="tag" style="background:${c.status==='PUBLISHED'?'#ecfbf5':'#fff6e6'};color:${c.status==='PUBLISHED'?'#15966a':'#c47a05'}">${c.status==='PUBLISHED'?'已发布':'草稿'}</span><h3>${esc(c.title)}</h3><p>${esc(c.subject||'待设置')} · ${esc(c.grade||'待设置')} · ${c.scenes||4} 个场景</p><div class="progress"><i style="width:${c.status==='PUBLISHED'?100:28}%;background:${c.status==='PUBLISHED'?'#27b980':'#f5b43b'}"></i></div><div class="course-foot"><span>${esc(c.updatedAt||'')}</span><span class="link" data-id="${c.id}">打开 →</span></div></div>`).join('');g.querySelectorAll('[data-id]').forEach(x=>x.onclick=()=>{currentCourse=courses.find(c=>String(c.id)===x.dataset.id)||courses[0];showPage('lesson')})}
    function renderLesson(){const h=document.querySelector('#lesson h3');if(h&&currentCourse)h.textContent=currentCourse.title;const s=document.querySelector('#lesson .sub');if(s&&currentCourse)s.textContent=`互动课堂 · ${currentCourse.scenes||4} 个场景 · ${currentCourse.status==='DRAFT'?'草稿已保存':'已保存'}`}
    async function sync(){try{const b=await api('/courses');if(Array.isArray(b.data)){courses=b.data;persist();apiOnline=true}}catch{}renderCourses()}
    document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>showPage(el.dataset.page)));
    document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>document.getElementById('topicInput').value=c.textContent));
    document.getElementById('generateBtn').addEventListener('click',async()=>{const v=document.getElementById('topicInput').value.trim();if(!v){toast('请先输入一个学习主题');return}const btn=document.getElementById('generateBtn');btn.disabled=true;btn.textContent='保存中…';let item={id:Date.now(),title:v,subject:'待设置',grade:'待设置',status:'DRAFT',scenes:4,updatedAt:new Date().toLocaleString('zh-CN',{hour12:false})};try{const b=await api('/courses',{method:'POST',body:JSON.stringify({title:v,subject:'待设置',grade:'待设置'})});if(b.data){item=b.data;apiOnline=true}}catch{}courses=[item,...courses.filter(c=>c.id!==item.id)];persist();currentCourse=item;document.getElementById('generatedResult').style.display='block';document.querySelector('#generatedResult b').textContent='已生成课堂结构 · '+v;btn.disabled=false;btn.textContent='生成课堂';toast('课堂已保存为草稿，可刷新后再次打开')});
    document.getElementById('enterLesson').addEventListener('click',()=>{currentCourse=courses[0]||currentCourse;showPage('lesson')});
    document.querySelectorAll('.option').forEach(o=>o.addEventListener('click',()=>{document.querySelectorAll('.option').forEach(x=>x.classList.remove('selected'));o.classList.add('selected');if(o.classList.contains('correct-answer')){document.getElementById('feedback').classList.add('show');toast('回答正确！获得 10 学习积分')}else{document.getElementById('feedback').classList.remove('show');toast('再想想：试着从 F = ma 出发')}}));
    document.getElementById('speakBtn').addEventListener('click',()=>toast('AI 教师语音讲解已播放（Demo 0.2 模拟）'));
    document.getElementById('askBtn').addEventListener('click',async()=>{const q=prompt('想问 AI 教师什么？','为什么质量越大，加速度越小？');if(!q)return;try{const b=await api(`/courses/${currentCourse?.id||1}/chat`,{method:'POST',body:JSON.stringify({question:q})});toast('AI 教师：'+(b.data?.answer||b.answer||'这是因为在力相同的情况下，a = F / m。'))}catch{toast('AI 教师：这是因为在力相同的情况下，a = F / m。')}});
    document.querySelectorAll('.outline-item').forEach(item=>item.addEventListener('click',()=>{document.querySelectorAll('.outline-item').forEach(x=>x.classList.remove('active'));item.classList.add('active');toast('已切换到 '+item.textContent.slice(5))}));
    renderCourses();renderLesson();sync();
  </script>'''
s = s[:start] + script + s[end:]
p.write_text(s, encoding='utf-8')
print(p)
