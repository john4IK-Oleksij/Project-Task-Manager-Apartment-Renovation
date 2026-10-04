from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Project, Task
from app.schemas import ProjectCreate, ProjectUpdate


def create_project(session: Session, payload: ProjectCreate) -> Project:
    project = Project(name=payload.name, description=payload.description)
    project.tasks = [
        Task(**task.model_dump()) for task in payload.tasks
    ]
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def get_project(session: Session, project_id: int) -> Project | None:
    stmt = (
        select(Project)
        .where(Project.id == project_id)
        .options(selectinload(Project.tasks))
    )
    return session.scalars(stmt).first()


def get_projects(session: Session, limit: int = 20, offset: int = 0) -> list[Project]:
    stmt = (
        select(Project).options(selectinload(Project.tasks)).limit(limit).offset(offset)
    )
    return list(session.scalars(stmt).all())


def update_project(
    session: Session, project: Project, payload: ProjectUpdate
) -> Project:
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(project, field, value)
    session.commit()
    session.refresh(project)
    return project


def delete_project(session: Session, project: Project) -> None:
    session.delete(project)
    session.commit()
