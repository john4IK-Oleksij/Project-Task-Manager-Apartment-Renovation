
from sqlalchemy.orm import Session

from app.models import Priority, Task
from app.schemas import TaskCreate, TaskUpdate


def create_task(session: Session, project_id: int, payload: TaskCreate) -> Task:
    task = Task(**payload.model_dump(), project_id=project_id)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def get_task(session: Session, task_id: int) -> Task | None:
    return session.get(Task, task_id)


def get_tasks(
    session: Session,
    project_id: int,
    priority: Priority | None = None,
    is_done: bool | None = None,
) -> list[Task]:
    query = session.query(Task).filter(Task.project_id == project_id)
    if priority is not None:
        query = query.filter(Task.priority == priority)
    if is_done is not None:
        query = query.filter(Task.is_done == is_done)
    return query.all()


def update_task(session: Session, task: Task, payload: TaskUpdate) -> Task:
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(task, field, value)
    session.commit()
    session.refresh(task)
    return task


def delete_task(session: Session, task: Task) -> None:
    session.delete(task)
    session.commit()
