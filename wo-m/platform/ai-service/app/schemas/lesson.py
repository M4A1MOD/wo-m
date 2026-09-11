from pydantic import BaseModel, Field


class LessonGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    subject: str | None = Field(default=None, max_length=50)
    grade: str | None = Field(default=None, max_length=50)
    objectives: list[str] = Field(default_factory=list)
    material_ids: list[int] = Field(default_factory=list)


class Scene(BaseModel):
    type: str
    title: str
    summary: str


class LessonGenerateResponse(BaseModel):
    title: str
    objectives: list[str]
    scenes: list[Scene]
    provider: str
