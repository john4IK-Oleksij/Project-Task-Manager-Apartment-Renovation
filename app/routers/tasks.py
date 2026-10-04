from fastapi import APIRouter, HTTPException

from app.dependencies import SessionDep
from app.schemas import TaskResponse, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/{task_id}", response_model=TaskResponse)
def read_task(db: SessionDep, task_id: int):
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, payload: TaskUpdate, db: SessionDep):
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task_service.update_task(db, task, payload)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: SessionDep):
    task = task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    task_service.delete_task(db, task)
