from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import Priority


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str | None = None
    priority: Priority = Priority.medium
    due_date: date | None = None


class TaskCreate(TaskBase):
    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("Назва задачі не може бути порожньою.")
        if title.isdecimal():
            raise ValueError("Назва задачі не може складатися лише з цифр.")
        return title


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
            return value
        title = value.strip()
        if not title:
            raise ValueError("Назва задачі не може бути порожньою.")
        if title.isdecimal():
            raise ValueError("Назва задачі не може складатися лише з цифр.")
        return title

# Якщо title передано у PATCH, він не може бути null.
    @model_validator(mode="after")
    def forbid_null_title(self) -> "TaskUpdate":
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Назва задачі не може бути null.")
        return self


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
    tasks: list[TaskCreate] = Field(default_factory=list[TaskCreate])

    @field_validator("name")
    @classmethod
    def validate_name_is_not_numeric(cls, value: str) -> str:
        if value.isdecimal():
            raise ValueError("Назва проєкту не може складатися лише з цифр.")
        return value


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        name = value.strip()
        if not name:
            raise ValueError("Назва проєкту не може бути порожньою.")
        if name.isdecimal():
            raise ValueError("Назва проєкту не може складатися лише з цифр.")
        return name

    @model_validator(mode="after")
    def forbid_null_name(self) -> "ProjectUpdate":
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Назва проєкту не може бути null.")
        return self


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    tasks: list[TaskResponse] = []

    model_config = ConfigDict(from_attributes=True)
