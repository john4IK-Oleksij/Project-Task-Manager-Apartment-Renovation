const grid = document.getElementById("projects-grid");
const statusEl = document.getElementById("projects-status");
const addProjectButton = document.getElementById("add-project");
const projectDialog = document.getElementById("project-dialog");
const projectForm = document.getElementById("project-form");
const projectFormError = document.getElementById("project-form-error");
const saveProjectButton = document.getElementById("save-project");
const projectTaskFields = document.getElementById("project-task-fields");
const projectTaskTitles = document.getElementById("project-task-titles");
const projectDialogTitle = document.getElementById("project-dialog-title");
const PRIORITIES = [
    ["low", "Низький"],
    ["medium", "Середній"],
    ["high", "Високий"],
];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

async function responseError(response, fallback) {
    if (response.status === 404) return "Project не знайдено. Оновіть сторінку та спробуйте ще раз.";
    try {
        const body = await response.json();
        if (typeof body.detail === "string") return body.detail;
    } catch {
        return fallback;
    }
    return fallback;
}

function renderTask(task, index) {
    const li = el(
        "li",
        "project-card__task" + (task.is_done ? " project-card__task--done" : "")
    );
    li.append(
        el("span", "task-number", `${index + 1}.`),
        el("span", "project-card__checkbox", task.is_done ? "✓" : "○"),
        el("span", "", task.title)
    );
    return li;
}

function updateTaskPriorityFields() {
    const previousPriorities = [...projectTaskFields.querySelectorAll("select")]
        .map((select) => select.value);
    const titles = projectTaskTitles.value.split(/\r?\n/).map((title) => title.trim()).filter(Boolean);
    if (!titles.length) {
        projectTaskFields.replaceChildren(
            el("p", "project-form__task-hint", "Для відзнаки пріоритету додайте хоча б одне завдання")
        );
        return;
    }

    projectTaskFields.replaceChildren(...titles.map((title, index) => {
        const row = el("div", "project-form__task-row");
        const priority = el("select", "project-form__task-priority");
        priority.setAttribute("aria-label", `Пріоритет задачі ${index + 1}: ${title}`);
        PRIORITIES.forEach(([value, label]) => {
            const option = el("option", "", label);
            option.value = value;
            if (value === (previousPriorities[index] || "medium")) option.selected = true;
            priority.append(option);
        });
        row.append(
            el("span", "project-form__task-number", `${index + 1}.`),
            el("span", "project-form__task-name", title),
            priority
        );
        return row;
    }));
}

function renderProject(project) {
    const total = project.tasks.length;
    const done = project.tasks.filter((t) => t.is_done).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const url = `/static/project.html?id=${project.id}`;

    const card = el("article", "project-card");

    const title = el("h2", "project-card__title");
    const titleLink = el("a", "project-card__title-link", project.name);
    titleLink.href = url;
    title.append(titleLink);
    const header = el("div", "project-card__header");
    header.append(title);

    const management = el("div", "project-card__management");
    const editButton = el("a", "project-card__action", "Редагувати");
    editButton.href = `${url}&edit=1`;
    const deleteButton = el("button", "project-card__action project-card__action--delete", "Видалити");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteProject(project));
    management.append(editButton, deleteButton);

    const tasks = el("ul", "project-card__tasks");
    project.tasks.forEach((task, index) => tasks.append(renderTask(task, index)));

    const bar = el("div", "project-card__bar");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", String(percent));
    const fill = el("div", "project-card__bar-fill");
    fill.style.width = `${percent}%`;
    bar.append(fill);

    const progress = el(
        "span",
        "project-card__progress",
        `${done} / ${total} виконано · ${percent}%`
    );
    const link = el("a", "project-card__link", "Відкрити Project →");
    link.href = url;
    const footer = el("div", "project-card__footer");
    footer.append(progress, link);

    card.append(header, management, tasks, bar, footer);
    return card;
}

function openProjectForm() {
    projectForm.reset();
    projectFormError.hidden = true;
    projectDialogTitle.textContent = "Новий Project";
    saveProjectButton.textContent = "Створити Project";
    updateTaskPriorityFields();
    projectDialog.showModal();
    projectForm.elements.name.focus();
}

async function deleteProject(project) {
    const taskCount = project.tasks.length;
    const taskWarning = taskCount
        ? `Разом із проєктом буде видалено всі його задачі (${taskCount}).`
        : "Усі задачі цього проєкту також буде видалено.";
    const confirmed = window.confirm(
        `Видалити проєкт «${project.name}»?\n\n${taskWarning}\nЦю дію не можна скасувати.`
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`/projects/${project.id}`, { method: "DELETE" });
        if (!response.ok) {
            throw new Error(await responseError(response, "Не вдалося видалити Project."));
        }
        await loadProjects();
    } catch (error) {
        statusEl.hidden = false;
        statusEl.textContent = error.message || "Не вдалося видалити Project. Перевірте з’єднання та спробуйте ще раз.";
    }
}

async function loadProjects() {
    try {
        const response = await fetch("/projects/?limit=100");
        if (!response.ok) {
            throw new Error(await responseError(response, "Не вдалося завантажити Projects."));
        }
        const projects = await response.json();

        grid.replaceChildren(...projects.map(renderProject));
        statusEl.hidden = projects.length > 0;
        statusEl.textContent = "Поки немає жодного Project.";
    } catch (error) {
        statusEl.hidden = false;
        statusEl.textContent = error.message || "Не вдалося завантажити Projects. Спробуйте пізніше.";
    }
}

addProjectButton.addEventListener("click", () => openProjectForm());

projectTaskTitles.addEventListener("input", updateTaskPriorityFields);

document.getElementById("cancel-project").addEventListener("click", () => {
    projectDialog.close();
});

projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    projectFormError.hidden = true;

    const name = projectForm.elements.name.value.trim();
    if (!name) {
        projectForm.elements.name.setCustomValidity("Введіть назву Project.");
        projectForm.reportValidity();
        projectForm.elements.name.setCustomValidity("");
        return;
    }

    saveProjectButton.disabled = true;
    try {
        const payload = {
            name,
            description: projectForm.elements.description.value.trim() || null,
        };
        const taskTitles = projectTaskTitles.value.split(/\r?\n/).map((title) => title.trim()).filter(Boolean);
        if (taskTitles.some((title) => title.length > 150)) {
            projectFormError.textContent = "Назва задачі має містити не більше 150 символів.";
            projectFormError.hidden = false;
            projectTaskTitles.focus();
            return;
        }
        const taskPriorities = [...projectTaskFields.querySelectorAll(".project-form__task-priority")];
        payload.tasks = taskTitles.map((title, index) => ({
            title,
            priority: taskPriorities[index].value,
        }));

        const response = await fetch("/projects/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(await responseError(response, "Не вдалося створити Project."));
        }
        projectDialog.close();
        location.reload();
    } catch (error) {
        projectFormError.textContent = error.message || "Не вдалося створити Project. Спробуйте ще раз.";
        projectFormError.hidden = false;
    } finally {
        saveProjectButton.disabled = false;
    }
});

loadProjects();
