from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ReferenceMaterial(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=8000)


class LessonGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=4000)
    subject: str | None = Field(default=None, max_length=50)
    grade: str | None = Field(default=None, max_length=50)
    duration: int = Field(default=45, ge=20, le=120)
    objectives: list[str] = Field(default_factory=list)
    material_ids: list[int] = Field(default_factory=list)
    materials: list[ReferenceMaterial] = Field(default_factory=list, max_length=5)
    provider: str | None = Field(default=None, max_length=50)
    content_style: str | None = Field(default=None, max_length=50)


class Scene(BaseModel):
    type: str
    title: str
    duration: int = Field(ge=1)
    headline: str
    summary: str
    teacher_activity: str
    student_activity: str
    interaction: str
    knowledge_points: list[str]


class Quiz(BaseModel):
    type: Literal["single", "multiple", "short"] = "single"
    question: str
    options: list[str] = Field(default_factory=list, max_length=10)
    answer: int = Field(default=0, ge=0)
    answers: list[int] = Field(default_factory=list)
    reference_answer: str = ""
    rubric: list[str] = Field(default_factory=list)
    analysis: str
    knowledge_point: str

    @model_validator(mode="after")
    def valid_answer(self):
        if self.type == "short":
            if not self.reference_answer.strip() or not self.rubric:
                raise ValueError("简答题必须提供参考答案和评分要点")
            return self
        if len(self.options) < 2:
            raise ValueError("选择题至少需要两个选项")
        if self.type == "multiple":
            if len(set(self.answers)) < 2 or len(set(self.answers)) != len(self.answers):
                raise ValueError("多选题至少需要两个不重复的正确选项")
            if any(answer < 0 or answer >= len(self.options) for answer in self.answers):
                raise ValueError("答案索引超出选项范围")
        elif self.answer >= len(self.options):
            raise ValueError("答案索引必须对应一个选项")
        return self


class LessonGenerateResponse(BaseModel):
    schema_version: str = "zhixue.lesson.0.4"
    title: str
    subject: str
    grade: str
    duration: int
    objectives: list[str]
    key_points: list[str]
    difficult_points: list[str]
    scenes: list[Scene] = Field(min_length=1, max_length=12)
    quiz: list[Quiz] = Field(min_length=1)
    homework: list[str]
    resources: list[str]
    assessment: list[str]
    provider: str
    mode: Literal["mock", "live"] = "mock"
    model: str | None = None


class LessonChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    topic: str = Field(min_length=1, max_length=100)
    subject: str | None = Field(default=None, max_length=50)
    grade: str | None = Field(default=None, max_length=50)
    scene_title: str | None = Field(default=None, max_length=100)
    knowledge_points: list[str] = Field(default_factory=list)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=8)
    provider: str | None = Field(default=None, max_length=50)


class LessonChatResponse(BaseModel):
    answer: str = Field(min_length=1)
    follow_up: str
    provider: str
    mode: Literal["mock", "live"] = "mock"
    model: str | None = None


MindMapSourceKind = Literal["course", "objective", "key_point", "scene", "slide", "quiz"]
KnowledgeRelationType = Literal["前置", "包含", "因果", "关联"]


class MindMapSourceRef(BaseModel):
    kind: MindMapSourceKind
    index: int = Field(default=0, ge=0)
    label: str = Field(min_length=1, max_length=80)


class MindMapNode(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=15)
    source_refs: list[MindMapSourceRef] = Field(default_factory=list, max_length=8)
    children: list["MindMapNode"] = Field(default_factory=list, max_length=12)


class MindMapSceneInput(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    headline: str = Field(default="", max_length=300)
    knowledge_points: list[str] = Field(default_factory=list, max_length=12)


class MindMapGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    subject: str = Field(default="", max_length=50)
    description: str = Field(default="", max_length=4000)
    objectives: list[str] = Field(default_factory=list, max_length=12)
    key_points: list[str] = Field(default_factory=list, max_length=20)
    scenes: list[MindMapSceneInput] = Field(default_factory=list, max_length=12)
    quizzes: list[str] = Field(default_factory=list, max_length=20)
    provider: str | None = Field(default=None, max_length=50)


class KnowledgeGraphGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    subject: str = Field(default="", max_length=50)
    description: str = Field(default="", max_length=4000)
    objectives: list[str] = Field(default_factory=list, max_length=12)
    key_points: list[str] = Field(default_factory=list, max_length=20)
    difficult_points: list[str] = Field(default_factory=list, max_length=12)
    scenes: list[MindMapSceneInput] = Field(default_factory=list, max_length=12)
    provider: str | None = Field(default=None, max_length=50)


class KnowledgeGraphDraftNode(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=300)
    level: int = Field(default=1, ge=0, le=3)


class KnowledgeGraphDraftEdge(BaseModel):
    from_index: int = Field(ge=0, le=19)
    to_index: int = Field(ge=0, le=19)
    type: KnowledgeRelationType


class KnowledgeGraphDraftResponse(BaseModel):
    nodes: list[KnowledgeGraphDraftNode] = Field(min_length=2, max_length=20)
    edges: list[KnowledgeGraphDraftEdge] = Field(default_factory=list, max_length=40)
    provider: str
    mode: Literal["mock", "live"] = "mock"
    model: str | None = None


class KnowledgeGraphNode(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=15)
    level: int = Field(ge=0, le=3)
    mastery: int = Field(default=0, ge=0, le=100)
    x: float = 0
    y: float = 0
    description: str = Field(default="", max_length=300)
    source_refs: list[MindMapSourceRef] = Field(default_factory=list, max_length=8)


class KnowledgeGraphEdge(BaseModel):
    from_: str = Field(alias="from", min_length=1, max_length=80)
    to: str = Field(min_length=1, max_length=80)
    type: KnowledgeRelationType


class KnowledgeGraphResponse(BaseModel):
    schema_version: str = "zhixue.knowledge-graph.1"
    nodes: list[KnowledgeGraphNode] = Field(min_length=1, max_length=80)
    edges: list[KnowledgeGraphEdge] = Field(default_factory=list, max_length=160)
    provider: str
    mode: Literal["mock", "live"] = "mock"
    model: str | None = None

    @model_validator(mode="after")
    def validate_graph(self):
        node_ids = {node.id for node in self.nodes}
        if len(node_ids) != len(self.nodes):
            raise ValueError("知识图谱节点 ID 必须唯一")
        if not any(node.level == 0 for node in self.nodes):
            raise ValueError("知识图谱必须包含根节点")
        for edge in self.edges:
            if edge.from_ not in node_ids or edge.to not in node_ids or edge.from_ == edge.to:
                raise ValueError("知识图谱边必须连接两个已存在的不同节点")
        return self


class MindMapDraftTopic(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    children: list[str] = Field(default_factory=list, max_length=2)


class MindMapDraftBranch(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    children: list[MindMapDraftTopic | str] = Field(default_factory=list, max_length=6)


class MindMapDraftResponse(BaseModel):
    root_label: str = Field(min_length=1, max_length=100)
    branches: list[MindMapDraftBranch] = Field(min_length=1, max_length=4)
    provider: str
    mode: Literal["mock", "live"] = "mock"
    model: str | None = None


class MindMapResponse(BaseModel):
    schema_version: str = "zhixue.mindmap.1"
    root: MindMapNode
    provider: str
    mode: Literal["mock", "live"] = "mock"
    model: str | None = None

    @model_validator(mode="after")
    def validate_tree(self):
        ids: set[str] = set()
        node_count = 0

        def visit(node: MindMapNode, depth: int) -> None:
            nonlocal node_count
            if depth > 4:
                raise ValueError("思维导图最多允许4级")
            if node.id in ids:
                raise ValueError("思维导图节点 ID 必须唯一")
            ids.add(node.id)
            node_count += 1
            if node_count > 80:
                raise ValueError("思维导图最多允许80个节点")
            for child in node.children:
                visit(child, depth + 1)

        visit(self.root, 1)
        return self


class QuizSubmission(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    quiz: Quiz
    selected: list[int] = Field(default_factory=list, max_length=10)
    text: str = Field(default="", max_length=4000)
    provider: str | None = None


class QuizGrade(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str = Field(min_length=1)
    provider: str
    mode: Literal["rule", "live", "mock"] = "rule"
    model: str | None = None
