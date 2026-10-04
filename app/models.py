import enum
from datetime import date, datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# ================================================
# 1. Перелік рівнів пріоритету (Priority)
class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


# ================================================
class Base(DeclarativeBase):
    pass


# ================================================
# 2. Проєкт (Project)
# Головна сутність-контейнер, яка об'єднує пов'язані між собою задачі в єдине ціле.
class Project(Base):
    __tablename__ = "projects"
    # •	id: Унікальний ідентифікатор проєкту (первинний ключ).
    id: Mapped[int] = mapped_column(primary_key=True)
    # •	name: Назва проєкту (рядок до 200 символів, обов'язкове поле).
    name: Mapped[str] = mapped_column(String(200))
    # •	description: Детальний опис цілей або контексту проєкту (текстове поле, необов'язкове).
    description: Mapped[str | None] = mapped_column(Text, default=None)
    # •	created_at: Дата та час автоматичного створення запису в системі.
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    # •	tasks: Список пов'язаних задач. Забезпечує двосторонній зв'язок (реалізує зв'язок One-to-Many з сутністю Task).
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Task.id"
    )


# ================================================
# 3. Задача (Task)
# Окрема робоча одиниця або крок, який необхідно виконати в рамках певного проєкту.
class Task(Base):
    __tablename__ = "tasks"
    # •	id: Унікальний ідентифікатор задачі (первинний ключ).
    id: Mapped[int] = mapped_column(primary_key=True)
    # •	title: Короткий заголовок або назва задачі (рядок до 200 символів, обов'язкове поле).
    title: Mapped[str] = mapped_column(String(150))
    # •	description: Розгорнутий опис того, що саме потрібно зробити (текстове поле, необов'язкове).
    description: Mapped[str | None] = mapped_column(Text, default=None)
    # •	is_done: Логічний прапорець статусу виконання (True — виконано, False — у процесі, за замовчуванням False).
    is_done: Mapped[bool] = mapped_column(default=False)
    # •	priority: Рівень важливості задачі (значення з переліку Priority, за замовчуванням medium).
    priority: Mapped[Priority] = mapped_column(default=Priority.medium)
    # •	due_date: Бажана дата завершення або дедлайн задачі (необов'язкове поле).
    due_date: Mapped[date | None] = mapped_column(default=None)
    # •	created_at: Дата та час створення задачі.
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    # •	project_id: Зовнішній ключ (ForeignKey), що посилається на ідентифікатор батьківського проєкту. 
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE")
    )
    # При видаленні проєкту всі дочірні задачі видаляються автоматично (ondelete="CASCADE").
    # •	project: Зв'язок із батьківським проєктом (реалізує зв'язок Many-to-One).
    project: Mapped["Project"] = relationship(back_populates="tasks")
