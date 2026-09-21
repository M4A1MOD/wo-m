from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.llm import complete_json, selected_provider

router = APIRouter()
Role = Literal["teacher", "classmate", "coach", "recorder"]
DUTIES = {
    "teacher": "你是教师：回应已有疑问，解释本场景知识，核对证据并提出一个启发式问题。",
    "classmate": "你是AI同学：回应教师或同学刚才的观点，尝试给出具体例子或提出有依据的疑问，不冒充教师。",
    "coach": "你是项目教练：依据刚才的讨论提出一个可操作的练习或项目步骤，并给出验收标准。",
    "recorder": "你是记录员：仅根据已有发言整理共识、分歧、待验证问题和下一步，不编造已经达成的结论。",
}


class DiscussionMessage(BaseModel):
    role: str = Field(min_length=1, max_length=80)
    content: str = Field(min_length=1, max_length=4000)


class DiscussionRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    subject: str = Field(default="", max_length=50)
    scene: str = Field(default="", max_length=5000)
    knowledge_points: list[str] = Field(default_factory=list, max_length=30)
    question: str = Field(default="", max_length=1000)
    agent_role: Role
    messages: list[DiscussionMessage] = Field(default_factory=list, max_length=12)
    provider: str | None = None


class DiscussionTurn(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    notes: list[str] = Field(default_factory=list, max_length=12)
    board: list[str] = Field(default_factory=list, max_length=8)
    provider: str
    model: str | None = None
    mode: Literal["mock", "live"] = "mock"


@router.post("/discussions/turn", response_model=DiscussionTurn)
def discussion_turn(payload: DiscussionRequest) -> DiscussionTurn:
    provider = selected_provider(payload.provider)
    if provider != "mock":
        return complete_json(provider, DiscussionTurn,
                             DUTIES[payload.agent_role] + "一次只生成当前角色的一条发言，不代替其他角色发言。"
                             "参考messages中最新观点，避免重复。教师可用board提供文字板书；记录员用notes提供笔记。",
                             payload.model_dump())
    raise HTTPException(400, "协同讨论需要选择 Ollama 或已配置的真实模型，演示模板已停用")
