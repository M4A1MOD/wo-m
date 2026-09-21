export type Quiz = {
  type?: 'single' | 'multiple' | 'short'
  question: string
  options: string[]
  answer: number
  analysis: string
  knowledge: string
  answers?: number[]
  reference_answer?: string
  rubric?: string[]
}

export type Scene = {
  title: string
  type: string
  duration: number
  headline: string
  content: string
  teacherActivity: string
  studentActivity: string
  interaction: string
  knowledge: string[]
}

export type LessonPlan = {
  version: '0.3' | '0.4'
  title: string
  description?: string
  subject: string
  grade: string
  duration: number
  objectives: string[]
  keyPoints: string[]
  difficultPoints: string[]
  scenes: Scene[]
  quiz: Quiz[]
  homework: string[]
  resources: string[]
  assessment: string[]
}

export const subjects = ['语文', '数学', '英语', '历史', '地理', '生物', '化学', '道德与法治', '物理']

const commonEnd = (topic: string) => ({
  title: '总结与迁移', type: 'summary', duration: 7,
  headline: `把“${topic}”变成自己的知识`,
  content: '用一句话概括核心结论，再通过新的情境检验能否迁移运用。系统根据课堂回答给出分层复习建议。',
  teacherActivity: '组织学生完成知识结构图，展示典型回答并纠正常见误区。',
  studentActivity: '完成出口卡：一个核心结论、一个仍有疑问的点、一个可迁移的新情境。',
  interaction: '出口卡 + 同伴互评', knowledge: ['知识结构', '迁移应用', '反思评价'],
})

const blueprint: Record<string, (topic: string, grade: string) => Omit<LessonPlan, 'version'|'title'|'subject'|'grade'>> = {
  语文: (topic) => ({ duration: 45,
    objectives: [`梳理“${topic}”的内容层次与表达线索`, '品味关键语言，结合语境分析形象、情感或主旨', '运用文本证据完成有依据的表达与迁移写作'],
    keyPoints: ['文本细读', '语言品味', '证据表达'], difficultPoints: ['从具体语句推导深层含义', '把个人感受转化为有文本依据的观点'],
    scenes: [
      {title:'情境导入',type:'introduction',duration:5,headline:`第一眼看到“${topic}”，你想到了什么？`,content:'从图片、配乐或生活经验切入，建立学习主题与真实感受之间的联系。',teacherActivity:'呈现情境材料，提出开放问题并归纳学生的初始印象。',studentActivity:'观察、联想，用关键词描述初读感受。',interaction:'词云投票',knowledge:['背景语境','初读感受']},
      {title:'整体感知',type:'reading',duration:9,headline:'沿着线索读懂文本',content:'圈画人物、意象、事件或观点，概括段落层次，形成“内容—线索—主旨”的阅读路径。',teacherActivity:'示范圈点批注，提供结构化阅读支架。',studentActivity:'默读并完成内容结构卡，小组核对依据。',interaction:'结构卡协作',knowledge:['内容概括','行文线索','篇章结构']},
      {title:'语言品读',type:'exploration',duration:12,headline:'关键词句为什么不能替换？',content:'从炼字、修辞、句式和语气入手，对比替换前后的表达效果，理解语言形式与情感表达的关系。',teacherActivity:'追问“写了什么、怎样写、为何这样写”，展示对比句。',studentActivity:'选择关键句进行批注，用“手法+语境+效果”表达。',interaction:'批注接力',knowledge:['炼字','修辞','表达效果']},
      {title:'主题探究',type:'discussion',duration:12,headline:'让观点站在文本证据上',content:'围绕核心问题开展小组讨论，通过引用、解释和关联文本形成完整观点。',teacherActivity:'提供讨论量规，追问证据是否充分、推理是否连贯。',studentActivity:'形成“观点—证据—解释”发言并回应同伴。',interaction:'小组辩读',knowledge:['主旨理解','人物形象','证据推理']}, commonEnd(topic)],
    quiz:[{question:`学习“${topic}”时，最有说服力的阅读结论应当建立在什么基础上？`,options:['只凭第一印象','文本证据与合理解释','背诵标准答案','作者生平越多越好'],answer:1,analysis:'语文阅读强调从文本出发，用具体语句支撑观点，并说明证据与结论之间的联系。',knowledge:'文本证据'}],
    homework:['完成一份“观点—证据—解释”阅读卡',`仿照课堂品读方法，为“${topic}”写一段 150 字微赏析`],resources:['课文/原文文本','背景资料卡','朗读音频','阅读评价量规'],assessment:['课堂批注质量 30%','小组证据表达 30%','出口卡与迁移写作 40%'] }),
  数学: (topic) => ({ duration: 45,
    objectives:[`理解“${topic}”中的核心概念、关系与表示方法`,'经历观察、猜想、验证和归纳的数学探究过程','能在基础与变式问题中选择合适的方法并说明理由'],
    keyPoints:['概念本质','数形结合','规范推理'],difficultPoints:['在不同表示之间转换','识别条件变化对结论的影响'],
    scenes:[
      {title:'问题驱动',type:'introduction',duration:5,headline:`现实问题里藏着怎样的“${topic}”？`,content:'用可测量的生活情境引出变量和数量关系，让学生先作直觉判断。',teacherActivity:'呈现问题，隐去公式，追问哪些量在变化。',studentActivity:'提取条件，估计结果并说明依据。',interaction:'快速估测',knowledge:['变量','数量关系']},
      {title:'概念建构',type:'explanation',duration:10,headline:'从实例抽象出数学模型',content:'通过表格、式子、图像或几何表示逐步抽象概念，辨析正例、反例和边界条件。',teacherActivity:'组织多表示对照，强调定义中的关键词。',studentActivity:'分类实例，补全概念并举出反例。',interaction:'正反例判断',knowledge:['定义','符号表示','边界条件']},
      {title:'规律探究',type:'simulation',duration:12,headline:'改变一个条件，会发生什么？',content:'操作参数或图形，记录变化，提出猜想并用代数推理或几何关系验证。',teacherActivity:'控制变量，提供探究表并组织归纳。',studentActivity:'操作、记录、作图、猜想与验证。',interaction:'参数实验',knowledge:['控制变量','数形结合','规律归纳']},
      {title:'分层应用',type:'practice',duration:11,headline:'从会做一道题到会解一类题',content:'设置基础题、变式题和开放题，比较不同解法的适用条件与效率。',teacherActivity:'展示典型错误，引导学生总结解题路径。',studentActivity:'独立作答后互讲方法，订正错误。',interaction:'一题多解',knowledge:['模型识别','解题策略','规范表达']}, commonEnd(topic)],
    quiz:[{question:`解决“${topic}”的变式问题时，第一步更合理的是？`,options:['直接套用最近学过的公式','识别已知条件、目标和数量关系','只观察答案形式','跳过图表信息'],answer:1,analysis:'先识别条件、目标及其关系，才能选择适用的概念、公式或模型。',knowledge:'问题分析'}],
    homework:['完成基础、提高、挑战三级练习各 1 题','整理一道错题，写出错误原因和正确策略'],resources:['动态几何/函数图像工具','分层任务单','典型错例卡'],assessment:['探究记录 30%','课堂练习 40%','方法表达与反思 30%'] }),
  英语: (topic) => ({ duration: 45,
    objectives:[`理解并运用“${topic}”情境中的核心词汇与句型`,'在听、说、读任务中提取关键信息并进行真实交流','提升语音语调、表达得体性和跨文化意识'],
    keyPoints:['情境词汇','功能句型','交际策略'],difficultPoints:['在真实对话中灵活组织语言','根据对象和场合选择得体表达'],
    scenes:[
      {title:'Warm-up',type:'introduction',duration:5,headline:`Let’s talk about ${topic}`,content:'通过图片、短视频或真实问题激活相关经验，建立有信息差的交际任务。',teacherActivity:'创设英文情境，用可理解输入引导学生预测。',studentActivity:'观察并用关键词、短句表达已有经验。',interaction:'Think-Pair-Share',knowledge:['topic vocabulary','prediction']},
      {title:'Language input',type:'listening',duration:9,headline:'Listen for meaning, notice the language',content:'完成主旨与细节两层听读任务，从语篇中发现功能句型及其使用场合。',teacherActivity:'分层播放材料，示范如何抓取关键词。',studentActivity:'完成信息表，核对并归纳表达。',interaction:'information gap',knowledge:['listening strategy','functional expressions']},
      {title:'Guided practice',type:'practice',duration:10,headline:'Build a clear and natural conversation',content:'通过替换、排序和半开放对话练习语言结构，同时关注重音、语调与礼貌策略。',teacherActivity:'提供句型支架，进行即时语音与表达反馈。',studentActivity:'跟读、替换练习并完成对话拼图。',interaction:'dialogue builder',knowledge:['sentence patterns','pronunciation','politeness']},
      {title:'Real-life task',type:'roleplay',duration:14,headline:'Use English to complete a real task',content:'学生扮演不同角色，在时间、预算、偏好或突发情况等约束下协商并达成方案。',teacherActivity:'发放角色卡，观察并按流利度、准确度、互动性反馈。',studentActivity:'角色扮演、追问澄清、协商并展示成果。',interaction:'role-play challenge',knowledge:['communication','negotiation','culture']}, commonEnd(topic)],
    quiz:[{question:'Which response best keeps a conversation going?',options:['Yes.','I do not know.','That sounds interesting. Could you tell me more?','No question.'],answer:2,analysis:'A follow-up question shows interest and invites the speaker to add information, making the exchange more natural.',knowledge:'conversation strategy'}],
    homework:['录制 1 分钟情境口语并根据量规自评',`整理“${topic}”主题词汇图，补充 5 个个性化表达`],resources:['情境音频','角色任务卡','口语评价量规','主题词汇表'],assessment:['信息理解 25%','语言准确性 25%','表达流利度 25%','互动与得体性 25%'] }),
  历史: (topic) => ({ duration: 45,
    objectives:[`在时空框架中梳理“${topic}”的背景、过程与结果`,'运用地图、史料和数据提取信息并进行证据推理','从多角度评价历史影响，形成历史解释'],
    keyPoints:['时空定位','史料实证','因果联系'],difficultPoints:['区分史实、观点与解释','从多种史料形成有边界的历史结论'],
    scenes:[
      {title:'时空定位',type:'introduction',duration:6,headline:`把“${topic}”放回历史现场`,content:'结合时间轴与地图确定关键时间、地点、人物和相邻事件，建立整体框架。',teacherActivity:'展示动态地图与时间轴，提出时空定位问题。',studentActivity:'标注关键节点，描述空间变化与阶段特征。',interaction:'地图寻踪',knowledge:['时间轴','空间格局','阶段特征']},
      {title:'史料研读',type:'source',duration:11,headline:'史料告诉了我们什么？',content:'对文字、图像、器物或统计材料进行来源、内容、立场和局限分析。',teacherActivity:'示范史料四问，提醒区分一手与二手材料。',studentActivity:'提取信息，判断可信范围并形成证据卡。',interaction:'史料侦探',knowledge:['史料类型','信息提取','可信度']},
      {title:'因果探究',type:'discussion',duration:10,headline:'历史为何这样发生？',content:'从政治、经济、社会、文化、地理等角度建立多因一果或一因多果关系。',teacherActivity:'组织因果链排序，追问必要条件与直接原因。',studentActivity:'制作因果图，比较不同小组的解释。',interaction:'因果链拼图',knowledge:['背景','原因','结果']},
      {title:'历史解释',type:'debate',duration:11,headline:'如何评价它的历史影响？',content:'围绕一个可争论命题，使用史实与史料从不同主体、区域和时段进行评价。',teacherActivity:'明确论证量规，引导避免简单的好坏二分。',studentActivity:'提出观点、引用证据、回应反方并限定结论。',interaction:'微型史学辩论',knowledge:['历史影响','多元视角','论证表达']}, commonEnd(topic)],
    quiz:[{question:`研究“${topic}”时，下列哪种做法最符合史料实证？`,options:['只选择支持自己观点的材料','先判断来源，再用多种材料相互印证','把影视剧情直接当作史实','年代越早的材料一定越可靠'],answer:1,analysis:'史料需要考察来源、立场和局限，并通过不同类型材料相互印证。',knowledge:'史料实证'}],
    homework:['完成一张时空—因果—影响三栏学习单','选择两则不同类型史料，写一段 200 字历史解释'],resources:['历史地图','时间轴','史料包','历史论证量规'],assessment:['时空框架 25%','史料证据 35%','历史解释 40%'] }),
  地理: (topic) => ({ duration: 45,
    objectives:[`描述“${topic}”的空间分布、区域差异与变化特征`,'运用地图、图表和数据分析形成区域认知与综合思维','解释自然与人文要素的相互作用并提出可行方案'],
    keyPoints:['空间分布','要素联系','区域差异'],difficultPoints:['从图表特征推导形成原因','综合评价人地关系与方案可行性'],
    scenes:[
      {title:'地理观察',type:'introduction',duration:6,headline:`“${topic}”在哪里？有什么不同？`,content:'从卫星图、景观图或专题地图出发，观察位置、范围、分布和区域差异。',teacherActivity:'指导读图顺序，追问“在哪里、有什么、怎样变”。',studentActivity:'读图定位，用规范地理语言描述分布。',interaction:'地图圈画',knowledge:['位置','分布','区域差异']},
      {title:'数据判读',type:'data',duration:10,headline:'图表中的地理信息',content:'判读曲线、柱状图、等值线或统计表，提取极值、趋势、差异和相关性。',teacherActivity:'示范图表判读四步法，提醒单位和图例。',studentActivity:'完成证据表，用数据支撑特征描述。',interaction:'数据解码',knowledge:['图例','变化趋势','数据证据']},
      {title:'成因探究',type:'simulation',duration:11,headline:'哪些要素共同塑造了这种格局？',content:'综合纬度、海陆、地形、环流、人口与产业等要素，建立因果联系。',teacherActivity:'提供要素卡，组织变量组合与模型推演。',studentActivity:'构建要素关系图，解释区域差异。',interaction:'要素连线',knowledge:['自然要素','人文要素','综合分析']},
      {title:'区域决策',type:'project',duration:11,headline:'如果你是规划者，会怎样选择？',content:'在生态、经济、社会与风险约束下比较方案，形成有证据的区域发展建议。',teacherActivity:'给出真实约束与评价量规，组织方案质询。',studentActivity:'小组决策、标注方案、说明利弊并回应质询。',interaction:'区域规划会',knowledge:['人地协调','区域发展','可持续性']}, commonEnd(topic)],
    quiz:[{question:`分析“${topic}”的空间差异时，哪种证据最充分？`,options:['只列出一个地区的现象','结合地图位置、图表数据和相关要素解释','仅凭生活印象判断','只背诵结论不说明区域'],answer:1,analysis:'地理结论应同时说明空间位置、数据特征及相关自然和人文要素。',knowledge:'综合思维'}],
    homework:['绘制一张区域要素关系图','搜集家乡相关数据，写一条有依据的发展建议'],resources:['专题地图','统计图表','卫星影像','区域决策任务单'],assessment:['读图与数据 30%','综合解释 35%','区域方案 35%'] }),
  生物: (topic) => science(topic, '生物', ['结构与功能','生命过程','科学探究']),
  化学: (topic) => science(topic, '化学', ['宏观现象','微观解释','符号表征']),
  物理: (topic) => science(topic, '物理', ['物理情境','变量关系','模型应用']),
  道德与法治: (topic) => ({ duration:45, objectives:[`理解“${topic}”涉及的核心概念、权利义务或价值准则`,'能够辨析真实生活情境中的行为与责任','形成有规则意识和公共理性的行动方案'], keyPoints:['规则与价值','权利与义务','责任与行动'], difficultPoints:['在价值冲突中进行有依据的判断','把知识转化为现实行动'], scenes:[{title:'生活议题',type:'introduction',duration:6,headline:`当“${topic}”走进生活，你会怎么选？`,content:'用校园或社会真实案例呈现价值冲突，引导学生表达初步判断。',teacherActivity:'呈现案例并保护多元表达，追问判断依据。',studentActivity:'站队选择，说明理由并倾听不同观点。',interaction:'价值光谱',knowledge:['生活情境','价值判断']},{title:'规则解析',type:'explanation',duration:10,headline:'权利、义务与规则如何关联？',content:'结合法律条文、社会规范和具体案例，澄清核心概念及适用边界。',teacherActivity:'用案例对照讲解，区分道德要求、法律义务与个人选择。',studentActivity:'完成概念辨析表，判断案例适用规则。',interaction:'案例诊断',knowledge:['权利','义务','规则边界']},{title:'观点辨析',type:'debate',duration:11,headline:'面对冲突，怎样作出负责任的判断？',content:'从事实、规则、后果和价值四个维度分析争议观点。',teacherActivity:'组织结构化讨论，提醒尊重他人和回应证据。',studentActivity:'提出主张、给出依据、回应质疑。',interaction:'议题辩论',knowledge:['公共理性','证据表达','责任意识']},{title:'行动设计',type:'project',duration:11,headline:'从“我知道”走向“我行动”',content:'围绕班级、社区或网络生活设计一项微行动，并评估对象、步骤和风险。',teacherActivity:'提供行动模板，指导方案具体、合法、可执行。',studentActivity:'合作形成行动清单并作承诺展示。',interaction:'公民行动坊',knowledge:['社会参与','行动方案','风险评估']},commonEnd(topic)], quiz:[{question:'面对有争议的公共议题，较合理的判断路径是？',options:['先攻击持不同意见的人','只看是否对自己有利','核实事实、对照规则、评估后果并尊重权利','跟随网络热度'],answer:2,analysis:'公共议题判断需要事实基础、规则意识、后果评估与对他人权利的尊重。',knowledge:'公共理性'}], homework:['完成一份生活案例分析单','实施一项可完成的微行动并记录反思'],resources:['案例材料包','相关法律条文摘录','议题讨论量规'],assessment:['案例辨析 30%','观点论证 35%','行动方案 35%'] }),
}

function science(topic: string, subject: string, dimensions: string[]): Omit<LessonPlan, 'version'|'title'|'subject'|'grade'> {
  return { duration:45, objectives:[`理解“${topic}”的核心概念、过程与适用条件`,'能通过观察、实验或数据建立证据与结论的联系','运用模型解释现象并解决基础实际问题'], keyPoints:dimensions, difficultPoints:['控制变量并从证据得出结论','在现象、模型与符号表达之间转换'], scenes:[{title:'现象引入',type:'introduction',duration:5,headline:`“${topic}”背后发生了什么？`,content:'从可观察的生活现象、实验现象或问题情境出发，记录事实并提出可检验问题。',teacherActivity:'展示现象，引导区分观察事实与主观解释。',studentActivity:'描述现象、提出问题并作初步预测。',interaction:'预测投票',knowledge:[dimensions[0],'科学问题']},{title:'概念建模',type:'explanation',duration:10,headline:'用模型解释看得见与看不见的过程',content:'把关键结构、变量或粒子关系可视化，明确概念条件和因果路径。',teacherActivity:'分步建模，使用正反例检查概念边界。',studentActivity:'补全模型图，用自己的语言解释关键关系。',interaction:'模型拼图',knowledge:[dimensions[1],'因果关系']},{title:'探究实验',type:'experiment',duration:13,headline:'改变条件，用证据检验猜想',content:'明确自变量、因变量和控制变量，记录实验或模拟数据，分析误差并形成结论。',teacherActivity:'强调安全与变量控制，巡视并追问证据是否充分。',studentActivity:'制定步骤、操作记录、处理数据并交流结论。',interaction:'虚拟/分组实验',knowledge:['控制变量','数据分析','实验误差']},{title:'解释应用',type:'practice',duration:10,headline:'模型能解释哪些新现象？',content:'使用课堂模型处理生活、生产或环境中的新情境，比较常见错误解释。',teacherActivity:'提供梯度问题，组织模型适用性讨论。',studentActivity:'独立解释、同伴质疑并修改表达。',interaction:'证据挑战',knowledge:[dimensions[2],'模型应用']},commonEnd(topic)], quiz:[{question:`探究“${topic}”中两个变量的关系时，为什么要控制其他条件？`,options:['让实验步骤更多','排除其他因素干扰，使证据更能支持结论','保证结果一定符合猜想','减少记录数据'],answer:1,analysis:'控制无关变量可以减少干扰，使观察到的变化更有可能由自变量引起。',knowledge:'控制变量'}], homework:['完成实验/模型报告：问题、证据、结论、误差','寻找一个相关生活现象，用课堂模型作出解释'], resources:['实验或模拟工具','结构模型图','数据记录表','安全提示卡'], assessment:['问题与预测 20%','实验证据 35%','模型解释 30%','反思改进 15%'] }
}

export function inferSubject(topic: string): string {
  const rules: [string, RegExp][] = [
    ['语文', /诗|词|散文|小说|阅读|写作|意象|文言|鲁迅|李白|杜甫/], ['数学', /函数|方程|几何|概率|统计|数列|不等式|三角/],
    ['英语', /英语|english|口语|听力|travel|grammar/i], ['历史', /历史|丝绸|朝代|革命|战争|文明|制度|近代史/],
    ['地理', /地理|气候|季风|地形|人口|城市|河流|区域|经纬|洋流/], ['生物', /生物|细胞|光合|遗传|生态|人体|植物/],
    ['化学', /化学|酸碱|元素|反应|氧化|分子|离子|溶液/], ['道德与法治', /法治|法律|道德|权利|义务|责任|公民/], ['物理', /物理|力|运动|电|光|声|能量|牛顿/],
  ]
  return rules.find(([, rule]) => rule.test(topic))?.[0] || '语文'
}

export function createLesson(topic: string, subject?: string, grade = '八年级'): LessonPlan {
  const selected = subjects.includes(subject || '') ? subject! : inferSubject(topic)
  const build = blueprint[selected] || blueprint.语文
  return { version:'0.4', title:topic, subject:selected, grade, ...build(topic, grade) }
}

export const seedLessons = [
  createLesson('唐诗中的月亮意象', '语文', '高二'),
  createLesson('二次函数的图像与性质', '数学', '九年级'),
  createLesson('Travel Plans：旅行情境口语', '英语', '八年级'),
  createLesson('丝绸之路：跨文明交流', '历史', '七年级'),
  createLesson('季风气候与我们的生活', '地理', '八年级'),
  createLesson('光合作用的过程与意义', '生物', '七年级'),
  createLesson('酸碱中和反应', '化学', '九年级'),
  createLesson('网络生活中的权利与责任', '道德与法治', '八年级'),
  createLesson('牛顿第二定律', '物理', '高一'),
]

export function resizeLessonDuration(lesson: LessonPlan, duration: number): LessonPlan {
  const totalWeight = lesson.scenes.reduce((total, scene) => total + scene.duration, 0)
  const scaled = lesson.scenes.map(scene => scene.duration * duration / totalWeight)
  const durations = scaled.map(value => Math.floor(value))
  const remainderOrder = scaled.map((value, index) => ({ index, remainder: value % 1 }))
    .sort((first, second) => second.remainder - first.remainder)
  const remaining = duration - durations.reduce((total, value) => total + value, 0)
  remainderOrder.slice(0, remaining).forEach(({ index }) => durations[index]++)
  return { ...lesson, duration, scenes: lesson.scenes.map((scene, index) => ({ ...scene, duration: durations[index] })) }
}

export function mergeGeneratedLesson(base: LessonPlan, generated: any): LessonPlan {
  if (!generated || !Array.isArray(generated.scenes)) return base
  return {
    ...base,
    title: generated.title || base.title,
    description: base.description,
    subject: generated.subject || base.subject,
    grade: generated.grade || base.grade,
    duration: generated.duration || base.duration,
    objectives: generated.objectives?.length ? generated.objectives : base.objectives,
    keyPoints: generated.key_points?.length ? generated.key_points : base.keyPoints,
    difficultPoints: generated.difficult_points?.length ? generated.difficult_points : base.difficultPoints,
    scenes: generated.scenes.map((scene: any) => ({
      type: scene.type || 'activity',
      title: scene.title || '课堂活动',
      duration: scene.duration || 8,
      headline: scene.headline || scene.title || base.title,
      content: scene.summary || scene.content || '',
      teacherActivity: scene.teacher_activity || scene.teacherActivity || '',
      studentActivity: scene.student_activity || scene.studentActivity || '',
      interaction: scene.interaction || '课堂讨论',
      knowledge: scene.knowledge_points || scene.knowledge || [],
    })),
    quiz: generated.quiz?.length ? generated.quiz.map((quiz: any) => ({
      type: quiz.type || 'single',
      answers: quiz.answers || [],
      reference_answer: quiz.reference_answer || '',
      rubric: quiz.rubric || [],
      question: quiz.question,
      options: quiz.options,
      answer: quiz.answer,
      analysis: quiz.analysis,
      knowledge: quiz.knowledge_point || quiz.knowledge || '',
    })) : base.quiz,
    homework: generated.homework?.length ? generated.homework : base.homework,
    resources: generated.resources?.length ? generated.resources : base.resources,
    assessment: generated.assessment?.length ? generated.assessment : base.assessment,
  }
}
