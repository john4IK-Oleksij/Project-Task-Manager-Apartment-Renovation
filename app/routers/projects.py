from fastapi import APIRouter, HTTPException

from app.dependencies import SessionDep
from app.models import Priority
from app.schemas import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    TaskCreate,
    TaskResponse,
)
from app.services import project_service, task_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse, status_code=201)
def create_project(payload: ProjectCreate, db: SessionDep):
    return project_service.create_project(db, payload)


@router.get("/", response_model=list[ProjectResponse])
def read_projects(db: SessionDep, limit: int = 20, offset: int = 0):
    return project_service.get_projects(db, limit, offset)


@router.get("/{project_id}", response_model=ProjectResponse)
def read_project(project_id: int, db: SessionDep):
    project = project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, payload: ProjectUpdate, db: SessionDep):
    project = project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    return project_service.update_project(db, project, payload)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: SessionDep):
    project = project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    project_service.delete_project(db, project)


@router.post("/{project_id}/tasks", response_model=TaskResponse, status_code=201)
def create_project_task(project_id: int, payload: TaskCreate, db: SessionDep):
    project = project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    return task_service.create_task(db, project_id, payload)


@router.get("/{project_id}/tasks", response_model=list[TaskResponse])
def read_project_tasks(project_id: int, db: SessionDep, priority: Priority | None = None, is_done: bool | None = None):
    project = project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    return task_service.get_tasks(db, project_id, priority, is_done)
