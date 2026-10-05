from datetime import datetime, timezone
import uuid
from typing import Any
from pydantic import BaseModel, Field


class TaskStatus(BaseModel):
    task_id: str
    status: str  # "QUEUED" | "PROCESSING" | "COMPLETE" | "FAILED"
    progress_percent: int = 0
    result: Any | None = None
    error: str | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TaskManager:
    def __init__(self):
        self._tasks: dict[str, TaskStatus] = {}

    def create_task(self) -> TaskStatus:
        task_id = str(uuid.uuid4())
        task = TaskStatus(task_id=task_id, status="QUEUED", progress_percent=0)
        self._tasks[task_id] = task
        return task

    def update_task(
        self,
        task_id: str,
        status: str,
        progress_percent: int = 0,
        result: Any | None = None,
        error: str | None = None,
    ) -> TaskStatus | None:
        task = self._tasks.get(task_id)
        if not task:
            return None
        task.status = status
        task.progress_percent = progress_percent
        if result is not None:
            task.result = result
        if error is not None:
            task.error = error
        return task

    def get_task(self, task_id: str) -> TaskStatus | None:
        return self._tasks.get(task_id)


task_manager = TaskManager()
