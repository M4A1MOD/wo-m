from fastapi import APIRouter

from app.schemas.lesson import LessonGenerateRequest, LessonGenerateResponse, Scene

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"service": "ai-service", "status": "UP"}


@router.post("/lessons/generate", response_model=LessonGenerateResponse)
def generate_lesson(payload: LessonGenerateRequest) -> LessonGenerateResponse:
    """稳定的 mock 接口；后续在 service 层替换为 LangChain 和 RAG。"""
    return LessonGenerateResponse(
        title=payload.topic,
        objectives=[f"理解{payload.topic}的核心概念", "能够完成基础应用题"],
        scenes=[
            Scene(type="introduction", title="情境引入", summary="从真实问题激活已有经验"),
            Scene(type="explanation", title="概念讲解", summary="用结构化步骤讲解核心知识"),
            Scene(type="quiz", title="即时测验", summary="通过题目检查理解并给出反馈"),
        ],
        provider="mock",
    )

