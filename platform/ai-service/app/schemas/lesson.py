from pydantic import BaseModel, Field


class LessonGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    subject: str | None = Field(default=None, max_length=50)
    grade: str | None = Field(default=None, max_length=50)
    duration: int = Field(default=45, ge=20, le=120)
    objectives: list[str] = Field(default_factory=list)
    material_ids: list[int] = Field(default_factory=list)
    provider: str | None = Field(default=None, max_length=50)
    content_style: str | None = Field(default=None, max_length=50)


class Scene(BaseModel):
    type: str
    title: str
    duration: int
    headline: str
    summary: str
    teacher_activity: str
    student_activity: str
    interaction: str
    knowledge_points: list[str]


class Quiz(BaseModel):
    question: str
    options: list[str]
    answer: int
    analysis: str
    knowledge_point: str


class LessonGenerateResponse(BaseModel):
    schema_version: str = "zhixue.lesson.0.4"
    title: str
    subject: str
    grade: str
    duration: int
    objectives: list[str]
    key_points: list[str]
    difficult_points: list[str]
    scenes: list[Scene]
    quiz: list[Quiz]
    homework: list[str]
    resources: list[str]
    assessment: list[str]
    provider: str


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
    answer: str
    follow_up: str
    provider: str
