const statusEl = document.getElementById("project-status");
const details = document.getElementById("project-details");
const taskList = document.getElementById("task-list");
const tasksEmpty = document.getElementById("tasks-empty");
const taskActionStatus = document.getElementById("task-action-status");
const editView = document.getElementById("project-edit-view");
const editForm = document.getElementById("project-edit-form");
const editError = document.getElementById("project-edit-error");
const editTaskList = document.getElementById("project-edit-task-list");
const editTasksEmpty = document.getElementById("project-edit-empty");
const saveEditButton = document.getElementById("save-project-edit");
const editTitle = document.getElementById("project-edit-title");
const completionDialog = document.getElementById("task-completion-dialog");
const completionQuestion = document.getElementById("task-completion-question");

const PRIORITY_LABELS = { low: "Низький", medium: "Середній", high: "Високий" };
const PRIORITIES = [
    ["low", "Низький"],
    ["medium", "Середній"],
    ["high", "Високий"],
];
let projectId = null;
let currentProject = null;
let completionTask = null;
let removedTaskIds = new Set();

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

async function responseError(response, fallback) {
    if (response.status === 404) return "Project або Task не знайдено. Оновіть сторінку та спробуйте ще раз.";
    try {
        const body = await response.json();
        if (typeof body.detail === "string") return body.detail;
    } catch {
        return fallback;
    }
    return fallback;
}

function renderTask(task, index) {
    const li = el("li", "task-item" + (task.is_done ? " task-item--done" : ""));
    const toggle = el("button", "task-item__toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-label", `Запитати, чи задача «${task.title}» є виконаною`);
    toggle.setAttribute("aria-pressed", String(task.is_done));
    toggle.append(el("span", "project-card__checkbox", task.is_done ? "✓" : "○"));
    toggle.addEventListener("click", () => askTaskCompletion(task));

    const body = el("div", "task-item__body");
    body.append(el("span", "task-item__title", task.title));
    if (task.description) {
        body.append(el("span", "task-item__description", task.description));
    }

    const meta = el("div", "task-item__meta");
    meta.append(el("span", `badge badge--${task.priority}`, PRIORITY_LABELS[task.priority]));
    if (task.due_date) {
        const date = new Date(`${task.due_date}T00:00:00`).toLocaleDateString("uk-UA");
        meta.append(el("span", "task-item__due", `до ${date}`));
    }

    li.append(el("span", "task-number", `${index + 1}.`), toggle, body, meta);
    return li;
}

function updateEditTaskNumbers() {
    [...editTaskList.children].forEach((row, index) => {
        row.querySelector(".project-edit__task-number").textContent = `${index + 1}.`;
    });
    editTasksEmpty.hidden = editTaskList.children.length > 0;
}

function addEditTaskRow(task = null) {
    const row = el("section", "project-edit__task");
    if (task) row.dataset.taskId = String(task.id);

    const heading = el("div", "project-edit__task-heading");
    const number = el("span", "project-edit__task-number");
    heading.append(number);
    if (task?.is_done) {
        heading.append(el("span", "project-edit__task-state", "Виконано"));
    }
    const remove = el("button", "project-edit__task-remove", "Видалити");
    remove.type = "button";
    remove.addEventListener("click", () => {
        const taskTitle = title.value.trim() || task?.title || "без назви";
        const warning = task?.is_done
            ? `Задача «${taskTitle}» вже виконана. Видалити її?`
            : `Видалити задачу «${taskTitle}»?`;
        if (!window.confirm(`${warning}\nЗадачу буде видалено після збереження змін.`)) return;
        if (row.dataset.taskId) removedTaskIds.add(Number(row.dataset.taskId));
        row.remove();
        updateEditTaskNumbers();
    });
    heading.append(remove);

    const fields = el("div", "project-edit__task-fields");
    const titleLabel = el("label", "project-edit__field", "Назва задачі");
    const title = el("input");
    title.type = "text";
    title.maxLength = 150;
    title.required = true;
    title.value = task?.title || "";
    titleLabel.append(title);

    const priorityLabel = el("label", "project-edit__field", "Пріоритет");
    const priority = el("select");
    PRIORITIES.forEach(([value, label]) => {
        const option = el("option", "", label);
        option.value = value;
        option.selected = value === (task?.priority || "medium");
        priority.append(option);
    });
    priorityLabel.append(priority);

    const descriptionLabel = el("label", "project-edit__field", "Опис задачі");
    const description = el("textarea");
    description.rows = 2;
    description.value = task?.description || "";
    descriptionLabel.append(description);

    const dueLabel = el("label", "project-edit__field", "Дедлайн");
    const dueDate = el("input");
    dueDate.type = "date";
    dueDate.value = task?.due_date || "";
    dueLabel.append(dueDate);

    fields.append(titleLabel, priorityLabel, descriptionLabel, dueLabel);
    row.append(heading, fields);
    editTaskList.append(row);
    updateEditTaskNumbers();
}

function openEditForm() {
    if (!currentProject) return;
    removedTaskIds = new Set();
    editError.hidden = true;
    editTitle.textContent = `Редагування — ${currentProject.name}`;
    editForm.elements.project_name.value = currentProject.name;
    editForm.elements.project_description.value = currentProject.description || "";
    editTaskList.replaceChildren();
    currentProject.tasks.forEach((task) => addEditTaskRow(task));
    updateEditTaskNumbers();
    details.hidden = true;
    editView.hidden = false;
    const backLink = document.querySelector(".back-link");
    backLink.href = `/static/project.html?id=${projectId}`;
    backLink.textContent = "← До Project";
    document.getElementById("cancel-project-edit").href = `/static/project.html?id=${projectId}`;
    document.title = `Редагування — ${currentProject.name}`;
    editForm.elements.project_name.focus();
}

function askTaskCompletion(task) {
    completionTask = task;
    completionQuestion.textContent = `Чи задача «${task.title}» є виконаною?`;
    completionDialog.showModal();
}

function showTaskActionError(message) {
    taskActionStatus.textContent = message;
    taskActionStatus.hidden = false;
}

function renderProject(project) {
    currentProject = project;
    const total = project.tasks.length;
    const done = project.tasks.filter((task) => task.is_done).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    document.title = `${project.name} — Ремонт квартири`;
    document.getElementById("project-title").textContent = project.name;
    const description = document.getElementById("project-description");
    description.textContent = project.description || "";
    description.hidden = !project.description;

    const bar = document.getElementById("project-bar");
    bar.setAttribute("aria-valuenow", String(percent));
    document.getElementById("project-bar-fill").style.width = `${percent}%`;
    document.getElementById("project-progress").textContent =
        `${done} / ${total} виконано · ${percent}%`;

    taskList.replaceChildren(...project.tasks.map(renderTask));
    tasksEmpty.hidden = total > 0;
    details.hidden = false;
    statusEl.hidden = true;
}

function showError(message) {
    details.hidden = true;
    editView.hidden = true;
    statusEl.hidden = false;
    statusEl.textContent = message;
}

async function loadProject() {
    projectId = Number(new URLSearchParams(location.search).get("id"));
    if (!Number.isInteger(projectId) || projectId < 1) {
        showError("Некоректне посилання на Project.");
        return;
    }
    try {
        const response = await fetch(`/projects/${projectId}`);
        if (response.status === 404) {
            showError("Project не знайдено.");
            return;
        }
        if (!response.ok) {
            throw new Error(await responseError(response, "Не вдалося завантажити Project."));
        }
        renderProject(await response.json());
        const params = new URLSearchParams(location.search);
        if (params.get("edit") === "1") {
            openEditForm();
        }
    } catch (error) {
        showError(error.message || "Не вдалося завантажити Project. Спробуйте пізніше.");
    }
}

async function saveTaskCompletion(isDone) {
    if (!completionTask) return;
    const task = completionTask;
    completionDialog.close();
    completionTask = null;
    try {
        const response = await fetch(`/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_done: isDone }),
        });
        if (!response.ok) {
            throw new Error(await responseError(response, "Не вдалося змінити статус задачі."));
        }
        await loadProject();
        taskActionStatus.hidden = true;
    } catch (error) {
        showTaskActionError(error.message || "Не вдалося змінити статус задачі. Спробуйте ще раз.");
    }
}

async function saveProjectAndTasks(event) {
    event.preventDefault();
    editError.hidden = true;
    const projectName = editForm.elements.project_name.value.trim();
    if (!projectName) {
        editForm.elements.project_name.setCustomValidity("Введіть назву проєкту.");
        editForm.reportValidity();
        editForm.elements.project_name.setCustomValidity("");
        return;
    }

    const rows = [...editTaskList.querySelectorAll(".project-edit__task")];
    const tasks = rows.map((row) => ({
        row,
        id: row.dataset.taskId ? Number(row.dataset.taskId) : null,
        title: row.querySelector(".project-edit__task-fields input[type=\"text\"]").value.trim(),
        description: row.querySelector("textarea").value.trim() || null,
        priority: row.querySelector("select").value,
        due_date: row.querySelector("input[type=\"date\"]").value || null,
    }));
    if (tasks.some((task) => !task.title)) {
        editError.textContent = "Вкажіть назву для кожної задачі.";
        editError.hidden = false;
        tasks.find((task) => !task.title)?.row
            .querySelector(".project-edit__task-fields input[type=\"text\"]").focus();
        return;
    }
    if (tasks.some((task) => task.title.length > 150)) {
        editError.textContent = "Назва задачі має містити не більше 150 символів.";
        editError.hidden = false;
        return;
    }

    const idsToDelete = [...removedTaskIds];

    saveEditButton.disabled = true;
    try {
        const projectResponse = await fetch(`/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: projectName,
                description: editForm.elements.project_description.value.trim() || null,
            }),
        });
        if (!projectResponse.ok) {
            throw new Error(await responseError(projectResponse, "Не вдалося оновити Project."));
        }

        for (const task of tasks) {
            const payload = {
                title: task.title,
                description: task.description,
                priority: task.priority,
                due_date: task.due_date,
            };
            const response = await fetch(
                task.id ? `/tasks/${task.id}` : `/projects/${projectId}/tasks`,
                {
                    method: task.id ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );
            if (!response.ok) {
                throw new Error(await responseError(response, "Не вдалося зберегти задачу."));
            }
            if (!task.id) {
                const savedTask = await response.json();
                task.row.dataset.taskId = String(savedTask.id);
            }
        }

        for (const taskId of idsToDelete) {
            const response = await fetch(`/tasks/${taskId}`, { method: "DELETE" });
            if (!response.ok) {
                throw new Error(await responseError(response, "Не вдалося видалити задачу."));
            }
            removedTaskIds.delete(taskId);
        }

        location.href = `/static/project.html?id=${projectId}`;
    } catch (error) {
        const message = error.message || "Не вдалося зберегти зміни.";
        editError.textContent =
            `${message} Частина змін могла зберегтися; перевірте дані та спробуйте ще раз.`;
        editError.hidden = false;
    } finally {
        saveEditButton.disabled = false;
    }
}

document.getElementById("edit-project").addEventListener("click", () => {
    location.href = `/static/project.html?id=${projectId}&edit=1`;
});
document.getElementById("add-edit-task").addEventListener("click", () => addEditTaskRow());
document.getElementById("mark-task-done").addEventListener("click", () => saveTaskCompletion(true));
document.getElementById("mark-task-not-done").addEventListener("click", () => saveTaskCompletion(false));
document.getElementById("cancel-task-completion").addEventListener("click", () => {
    completionDialog.close();
    completionTask = null;
});
editForm.elements.project_name.addEventListener("input", () => {
    const name = editForm.elements.project_name.value.trim() || currentProject.name;
    editTitle.textContent = `Редагування — ${name}`;
});
editForm.addEventListener("submit", saveProjectAndTasks);

loadProject();
