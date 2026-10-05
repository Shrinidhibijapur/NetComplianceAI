from fastapi import APIRouter, HTTPException
from .manager import TaskStatus, task_manager

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get(
    "/{task_id}",
    response_model=TaskStatus,
    responses={
        404: {"description": "Task ID not found"},
    },
)
def get_task_status(task_id: str) -> TaskStatus:
    """Return status, progress, and result of an asynchronous background task."""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"No background task found with ID {task_id}")
    return task
