from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import Priority


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str | None = None
    priority: Priority = Priority.medium
    due_date: date | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("Назва задачі не може бути порожньою.")
        return title


class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    priority: Priority | None = None
    due_date: date | None = None
    is_done: bool | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Назва задачі не може бути порожньою.")
        title = value.strip()
        if not title:
            raise ValueError("Назва задачі не може бути порожньою.")
        return title


class TaskResponse(TaskBase):
    id: int
    is_done: bool
    created_at: datetime
    project_id: int

    model_config = ConfigDict(from_attributes=True)


# ========================
class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Назва проєкту не може бути порожньою.")
        return name


class ProjectCreate(ProjectBase):
    tasks: list[TaskCreate] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Назва проєкту не може бути порожньою.")
        name = value.strip()
        if not name:
            raise ValueError("Назва проєкту не може бути порожньою.")
        return name


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    tasks: list[TaskResponse] = []

    model_config = ConfigDict(from_attributes=True)
