from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.database import engine
from app.models import Base
from app.routers import projects, tasks

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    _ = _request
    field_labels = {
        "name": "Назва проєкту",
        "title": "Назва задачі",
        "priority": "Пріоритет",
        "due_date": "Дедлайн",
        "description": "Опис",
        "tasks": "Список задач",
    }
    messages: list[str] = []
    for error in exc.errors():
        field = str(error["loc"][-1]) if error["loc"] else ""
        label = field_labels.get(field, "Запит")
        error_type = error["type"]
        if error_type == "missing":
            message = "обов’язкове поле."
        elif error_type == "string_too_short":
            message = "не може бути порожнім."
        elif error_type == "string_too_long":
            message = "перевищує допустиму довжину."
        elif error_type == "value_error":
            messages.append(error["msg"].removeprefix("Value error, "))
            continue
        elif error_type == "enum":
            message = "має містити допустиме значення."
        else:
            message = "має некоректний формат."
        messages.append(f"{label}: {message}")

    return JSONResponse(
        status_code=422,
        content={"detail": "Перевірте введені дані: " + " ".join(dict.fromkeys(messages))},
    )


app.include_router(projects.router)
app.include_router(tasks.router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def dashboard():
    return FileResponse(STATIC_DIR / "projects.html")


Base.metadata.create_all(bind=engine)
