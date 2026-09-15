import re

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.schemas.lesson import LessonChatRequest, LessonChatResponse, LessonGenerateRequest, LessonGenerateResponse, Quiz, Scene

router = APIRouter()

class GenericPayload(BaseModel):
    topic: str = "示例课程"
    subject: str = "语文"
    key_points: list[str] = Field(default_factory=list)
    text: str = ""
    filename: str = "course-material.pdf"
    voice: str = "teacher"
    records: list[dict] = Field(default_factory=list)

SUBJECT_RULES = [
    ("语文", r"诗|词|散文|小说|阅读|写作|意象|文言"),
    ("数学", r"函数|方程|几何|概率|统计|数列|不等式"),
    ("英语", r"英语|english|口语|听力|travel|grammar"),
    ("历史", r"历史|丝绸|朝代|革命|战争|文明|制度"),
    ("地理", r"地理|气候|季风|地形|人口|城市|河流|区域"),
    ("生物", r"生物|细胞|光合|遗传|生态|人体|植物"),
    ("化学", r"化学|酸碱|元素|反应|氧化|分子|离子"),
    ("道德与法治", r"法治|法律|道德|权利|义务|责任|公民"),
    ("物理", r"物理|力|运动|电|光|声|能量|牛顿"),
]

SUBJECT_CONTENT = {
    "语文": ("文本细读", "语言品味", "证据表达", "批注接力", "结合关键语句形成有文本依据的观点"),
    "数学": ("概念本质", "数形结合", "变式应用", "参数实验", "识别条件和数量关系后选择合适模型"),
    "英语": ("情境词汇", "功能句型", "交际策略", "角色扮演", "在真实情境中完成有信息差的交流任务"),
    "历史": ("时空定位", "史料实证", "历史解释", "史料侦探", "使用多种史料解释背景、过程与影响"),
    "地理": ("空间分布", "要素联系", "区域决策", "地图解码", "结合地图和数据解释区域差异"),
    "生物": ("结构功能", "生命过程", "科学探究", "变量实验", "使用实验证据解释生命现象"),
    "化学": ("宏观现象", "微观解释", "符号表征", "控制变量", "在现象、粒子模型和符号之间转换"),
    "物理": ("物理情境", "变量关系", "模型应用", "交互实验", "使用物理模型解释和预测现象"),
    "道德与法治": ("规则价值", "权利义务", "公民行动", "议题辩论", "核实事实并依据规则作出负责任判断"),
}


def infer_subject(topic: str) -> str:
    for subject, pattern in SUBJECT_RULES:
        if re.search(pattern, topic.lower()):
            return subject
    return "语文"


@router.get("/health")
def health() -> dict[str, str]:
    return {"service": "ai-service", "status": "UP", "content_version": "0.4"}


@router.get("/providers")
def providers() -> dict:
    return {"default": "DeepSeek", "providers": [
        {"id": "deepseek", "name": "DeepSeek", "capabilities": ["text", "reasoning"], "status": "adapter-ready"},
        {"id": "qwen", "name": "通义千问", "capabilities": ["text", "vision", "audio"], "status": "adapter-ready"},
        {"id": "kimi", "name": "Kimi", "capabilities": ["long-context", "document"], "status": "adapter-ready"},
        {"id": "minimax", "name": "MiniMax", "capabilities": ["text", "tts"], "status": "adapter-ready"},
        {"id": "mock", "name": "本地演示模型", "capabilities": ["offline-demo"], "status": "online"},
    ]}


@router.post("/materials/parse")
def parse_material(payload: GenericPayload) -> dict:
    points = payload.key_points or ["核心概念", "关键关系", "应用情境"]
    return {"filename": payload.filename, "status": "validated", "chunks": max(3, min(36, len(payload.text) // 300 + 3)), "knowledge_points": points, "quality_score": 0.94, "pipeline": ["clean", "split", "extract", "validate"]}


@router.post("/knowledge-graphs/generate")
def knowledge_graph(payload: GenericPayload) -> dict:
    labels = [payload.topic] + (payload.key_points or ["核心概念", "关键关系", "迁移应用"])
    labels += ["前置基础", "证据方法", "综合任务", "反思评价"]
    positions = [(300, 58), (130, 155), (300, 155), (470, 155), (80, 270), (210, 270), (390, 270), (520, 270)]
    nodes = [{"id": f"k{i+1}", "label": label, "level": 0 if i == 0 else 1 if i < 4 else 2, "mastery": [86,78,72,64,55,48,69,60][i], "x": positions[i][0], "y": positions[i][1], "description": f"{payload.subject}课程知识点：{label}"} for i, label in enumerate(labels[:8])]
    edges = [{"from":"k1","to":"k2","type":"包含"},{"from":"k1","to":"k3","type":"包含"},{"from":"k1","to":"k4","type":"包含"},{"from":"k2","to":"k5","type":"前置"},{"from":"k2","to":"k6","type":"因果"},{"from":"k3","to":"k7","type":"前置"},{"from":"k4","to":"k8","type":"因果"}]
    return {"nodes": nodes, "edges": edges, "provider": "knowledge-graph-mock"}


@router.post("/content/multimodal")
def multimodal(payload: GenericPayload) -> dict:
    return {"topic": payload.topic, "modules": ["immersive-text", "segmented-quiz", "editable-pptx", "dual-ai-audio", "mind-map", "interactive-html"], "image_prompt": f"{payload.subject}教学配图：{payload.topic}", "provider": "multimodal-adapter"}


@router.post("/speech/tts")
def tts(payload: GenericPayload) -> dict:
    return {"status": "client-fallback", "voice": payload.voice, "language": "zh-CN", "script": payload.text, "hint": "Use browser speechSynthesis when provider credentials are absent."}


@router.post("/speech/asr")
def asr(payload: GenericPayload) -> dict:
    return {"status": "client-fallback", "language": "zh-CN", "transcript": payload.text or "请讲解当前知识点"}


@router.post("/reports/generate")
def report(payload: GenericPayload) -> dict:
    return {"mastery": 72, "weak_points": (payload.key_points or ["迁移应用"])[-2:], "learning_minutes": sum(int(r.get("seconds", 0)) for r in payload.records) // 60, "recommendation": f"结合兴趣情境强化{payload.topic}的应用任务。"}


@router.post("/lessons/generate", response_model=LessonGenerateResponse)
def generate_lesson(payload: LessonGenerateRequest) -> LessonGenerateResponse:
    """Demo 0.4 稳定降级实现：按学科与知识图谱生成差异化结构，可由真实模型适配层替换。"""
    subject = payload.subject if payload.subject in SUBJECT_CONTENT else infer_subject(payload.topic)
    grade = payload.grade or "八年级"
    point_a, point_b, point_c, interaction, transfer = SUBJECT_CONTENT[subject]
    objectives = payload.objectives or [f"理解“{payload.topic}”的核心概念与知识结构", f"运用{subject}学科方法收集证据、分析问题并表达结论", transfer]
    scenes = [
        Scene(type="introduction", title="情境导入", duration=5, headline=f"从真实问题走近“{payload.topic}”", summary="激活已有经验，记录初始判断并提出可探究问题。", teacher_activity="呈现情境材料并提出驱动问题。", student_activity="观察、预测并说明初步依据。", interaction="快速投票", knowledge_points=[point_a]),
        Scene(type="explanation", title="概念建构", duration=10, headline="建立本学科的核心知识框架", summary=f"围绕{point_a}与{point_b}，通过正反例和多种材料澄清概念。", teacher_activity="提供思维支架，示范学科分析路径。", student_activity="整理信息，补全结构图并提出疑问。", interaction="结构卡协作", knowledge_points=[point_a, point_b]),
        Scene(type="exploration", title="探究活动", duration=12, headline=f"用“{interaction}”检验理解", summary="在材料、数据或任务约束下形成证据链，比较不同解释。", teacher_activity="巡视追问，检查证据是否充分。", student_activity="合作完成任务，记录证据并交流结论。", interaction=interaction, knowledge_points=[point_b, point_c]),
        Scene(type="application", title="应用迁移", duration=11, headline="把方法用到新的情境", summary=transfer, teacher_activity="提供分层任务，展示典型误区。", student_activity="独立解决问题，再与同伴互评修正。", interaction="分层挑战", knowledge_points=[point_c]),
        Scene(type="summary", title="总结评价", duration=7, headline="形成自己的知识结构", summary="完成出口卡、即时测验和学习反思。", teacher_activity="归纳核心结论并提供分层建议。", student_activity="概括、作答、反思并提出新问题。", interaction="出口卡", knowledge_points=[point_a, point_b, point_c]),
    ]
    quiz = [Quiz(question=f"学习“{payload.topic}”时，最能体现{subject}学科思维的做法是？", options=["只背诵最终结论", f"围绕{point_a}收集证据并完成{point_c}", "忽略条件直接套用答案", "只表达感受不说明依据"], answer=1, analysis=f"{subject}学习需要把{point_a}、{point_b}与{point_c}联系起来，形成有依据的解释或方案。", knowledge_point=point_c)]
    return LessonGenerateResponse(title=payload.topic, subject=subject, grade=grade, duration=payload.duration, objectives=objectives, key_points=[point_a, point_b, point_c], difficult_points=[f"建立{point_a}与{point_b}之间的联系", f"将知识迁移到新的{subject}情境"], scenes=scenes, quiz=quiz, homework=[f"完成“{payload.topic}”知识结构图", f"寻找一个新情境，运用{point_c}写出分析过程"], resources=[f"{subject}任务单", "多媒体情境材料", "课堂评价量规"], assessment=["课堂参与 20%", "探究证据 35%", "知识应用 30%", "反思改进 15%"], provider=payload.provider or "subject-aware-mock")


@router.post("/lessons/chat", response_model=LessonChatResponse)
def chat_with_teacher(payload: LessonChatRequest) -> LessonChatResponse:
    subject = payload.subject if payload.subject in SUBJECT_CONTENT else infer_subject(payload.topic)
    point_a, point_b, point_c, _, _ = SUBJECT_CONTENT[subject]
    scene = f"当前正在学习“{payload.scene_title}”场景。" if payload.scene_title else ""
    knowledge = "、".join(payload.knowledge_points[:3]) or f"{point_a}、{point_b}、{point_c}"
    answer = (
        f"我们先把问题放回“{payload.topic}”这节{subject}课中思考。{scene}"
        f"可以从{knowledge}三个线索入手：先找出题目或材料中的关键信息，再说明它们之间的联系，最后用一个具体证据验证你的判断。"
    )
    follow_up = f"你能先指出这个问题中与“{knowledge.split('、')[0]}”最相关的一条信息吗？"
    return LessonChatResponse(answer=answer, follow_up=follow_up, provider=payload.provider or "subject-aware-mock")
