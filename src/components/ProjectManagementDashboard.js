"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import { WORKFLOW_STAGE_NAMES } from "@/lib/developmentWorkflow";
import { supabase } from "@/lib/supabaseClient";

const taskStatusLabels = {
  pending: "Pendente",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
  completed: "Concluído",
  not_applicable: "Não aplicável",
};

const boardColumns = [
  {
    key: "pending",
    label: "A fazer",
    description: "Tarefas ainda não iniciadas",
    tone: "neutral",
  },
  {
    key: "in_progress",
    label: "Em andamento",
    description: "Itens em execução",
    tone: "info",
  },
  {
    key: "blocked",
    label: "Bloqueado",
    description: "Pontos com impedimento",
    tone: "danger",
  },
  {
    key: "completed",
    label: "Concluído",
    description: "Entregas finalizadas",
    tone: "success",
  },
];

const statusOptions = [
  ["pending", "Pendente"],
  ["in_progress", "Em andamento"],
  ["blocked", "Bloqueado"],
  ["completed", "Concluído"],
  ["not_applicable", "Não aplicável"],
];

const filterOptions = [
  ["all", "Todas"],
  ["open", "Abertas"],
  ["blocked", "Bloqueadas"],
  ["overdue", "Vencidas"],
  ["completed", "Concluídas"],
];

const completeStatuses = new Set(["completed", "not_applicable"]);

function ProjectIcon({ name }) {
  const paths = {
    board: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16M15 4v16" />
        <path d="M6 8h1.5M12 8h1.5M18 8h0" />
        <path d="M6 13h1.5M12 13h1.5" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

function getProduct(project) {
  if (Array.isArray(project?.products)) {
    return project.products[0] ?? null;
  }

  return project?.products ?? null;
}

function getProductCode(product) {
  return product?.code || "Código a definir";
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  const dateOnly = String(value).slice(0, 10);
  const date = new Date(`${dateOnly}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "Sem prazo";
}

function toInputDate(value) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function differenceInDays(start, end) {
  const startDate = parseDate(start) || start;
  const endDate = parseDate(end) || end;

  if (!startDate || !endDate) {
    return 0;
  }

  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isTaskComplete(task) {
  return completeStatuses.has(task?.status);
}

function isTaskOverdue(task) {
  const today = new Date().toISOString().slice(0, 10);
  return Boolean(task?.due_date) && !isTaskComplete(task) && task.due_date < today;
}

function getBoardStatus(status) {
  return completeStatuses.has(status) ? "completed" : status || "pending";
}

function getTaskTone(task) {
  if (getBoardStatus(task.status) === "blocked") {
    return "danger";
  }

  if (isTaskOverdue(task)) {
    return "warning";
  }

  if (getBoardStatus(task.status) === "completed") {
    return "success";
  }

  if (getBoardStatus(task.status) === "in_progress") {
    return "info";
  }

  return "neutral";
}

function taskMatchesQuery(task, project, query) {
  if (!query) {
    return true;
  }

  const product = project?.product;
  const haystack = [
    task.title,
    task.assignee_name,
    task.assignee_email,
    task.owner_area,
    WORKFLOW_STAGE_NAMES[task.stage_key],
    product?.code,
    product?.name,
    product?.category,
    project?.owner,
    project?.requester,
  ]
    .map(normalizeText)
    .join(" ");

  return haystack.includes(query);
}

function projectMatchesQuery(project, query) {
  if (!query) {
    return true;
  }

  const product = project?.product;
  const haystack = [
    product?.code,
    product?.name,
    product?.category,
    project?.owner,
    project?.requester,
    project?.development_reason,
  ]
    .map(normalizeText)
    .join(" ");

  return haystack.includes(query);
}

export default function ProjectManagementDashboard({
  onOpenDevelopmentTask,
  onOpenProduct,
  readOnly = false,
}) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState("board");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDraft, setTaskDraft] = useState({
    status: "pending",
    assigneeEmail: "",
    dueDate: "",
    notes: "",
  });

  async function loadProjects() {
    setLoading(true);
    setMessage("");

    const [projectsResult, tasksResult, profilesResult] = await Promise.all([
      supabase
        .from("product_development_projects")
        .select(
          "id, product_id, requester, owner, target_launch_date, target_price, expected_demand, development_reason, archived_at, created_at, products(id, code, name, category, status)"
        )
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_development_tasks")
        .select(
          "id, project_id, stage_key, sort_order, status, title, due_date, assignee_name, assignee_email, completed_at, notes, owner_area"
        )
        .order("sort_order", { ascending: true }),
      supabase.from("user_profiles").select("id, full_name, email, area").order("full_name"),
    ]);

    const firstError = projectsResult.error ?? tasksResult.error ?? profilesResult.error;
    if (firstError) {
      setMessage(`Não foi possível carregar os projetos: ${firstError.message}`);
    }

    setProjects(projectsResult.data ?? []);
    setTasks(tasksResult.data ?? []);
    setProfiles(profilesResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();

    function reloadFromExternalChange(event) {
      if (event.detail?.source === "project-management") {
        return;
      }

      loadProjects();
    }

    window.addEventListener("penn:tasks-changed", reloadFromExternalChange);
    window.addEventListener("penn:projects-changed", reloadFromExternalChange);

    return () => {
      window.removeEventListener("penn:tasks-changed", reloadFromExternalChange);
      window.removeEventListener("penn:projects-changed", reloadFromExternalChange);
    };
  }, []);

  const projectData = useMemo(() => {
    const tasksByProject = new Map();

    tasks.forEach((task) => {
      const key = String(task.project_id);
      tasksByProject.set(key, [...(tasksByProject.get(key) ?? []), task]);
    });

    return projects.map((project) => {
      const projectTasks = (tasksByProject.get(String(project.id)) ?? []).sort(
        (a, b) =>
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) ||
          String(a.title ?? "").localeCompare(String(b.title ?? ""))
      );
      const completed = projectTasks.filter(isTaskComplete).length;
      const progress = projectTasks.length
        ? Math.round((completed / projectTasks.length) * 100)
        : 0;

      return {
        ...project,
        product: getProduct(project),
        projectTasks,
        progress,
      };
    });
  }, [projects, tasks]);

  const projectById = useMemo(() => {
    const map = new Map();
    projectData.forEach((project) => map.set(String(project.id), project));
    return map;
  }, [projectData]);

  const activeTasks = useMemo(
    () => projectData.flatMap((project) => project.projectTasks),
    [projectData]
  );

  const queryText = normalizeText(query);

  const filteredTasks = useMemo(() => {
    return activeTasks.filter((task) => {
      const project = projectById.get(String(task.project_id));

      if (!project) {
        return false;
      }

      if (projectFilter !== "all" && String(project.id) !== projectFilter) {
        return false;
      }

      if (stageFilter !== "all" && task.stage_key !== stageFilter) {
        return false;
      }

      if (!taskMatchesQuery(task, project, queryText)) {
        return false;
      }

      if (statusFilter === "open") {
        return !isTaskComplete(task);
      }

      if (statusFilter === "blocked") {
        return getBoardStatus(task.status) === "blocked";
      }

      if (statusFilter === "overdue") {
        return isTaskOverdue(task);
      }

      if (statusFilter === "completed") {
        return isTaskComplete(task);
      }

      return true;
    });
  }, [activeTasks, projectById, projectFilter, queryText, stageFilter, statusFilter]);

  const filteredTaskIds = useMemo(
    () => new Set(filteredTasks.map((task) => task.id)),
    [filteredTasks]
  );

  const visibleProjects = useMemo(() => {
    return projectData.filter((project) => {
      if (projectFilter !== "all" && String(project.id) !== projectFilter) {
        return false;
      }

      const hasVisibleTask = project.projectTasks.some((task) =>
        filteredTaskIds.has(task.id)
      );

      if (hasVisibleTask) {
        return true;
      }

      if (statusFilter !== "all" || stageFilter !== "all") {
        return false;
      }

      return projectMatchesQuery(project, queryText);
    });
  }, [filteredTaskIds, projectData, projectFilter, queryText, stageFilter, statusFilter]);

  const metrics = useMemo(() => {
    const openTasks = activeTasks.filter((task) => !isTaskComplete(task));
    const completedTasks = activeTasks.filter(isTaskComplete);
    const overdueTasks = activeTasks.filter(isTaskOverdue);
    const blockedTasks = activeTasks.filter(
      (task) => getBoardStatus(task.status) === "blocked"
    );

    return {
      projects: projectData.length,
      open: openTasks.length,
      blocked: blockedTasks.length,
      overdue: overdueTasks.length,
      progress: activeTasks.length
        ? Math.round((completedTasks.length / activeTasks.length) * 100)
        : 0,
    };
  }, [activeTasks, projectData.length]);

  const timeline = useMemo(() => {
    const dates = [];

    visibleProjects.forEach((project) => {
      const created = parseDate(project.created_at);
      const launch = parseDate(project.target_launch_date);

      if (created) {
        dates.push(created);
      }

      if (launch) {
        dates.push(launch);
      }

      project.projectTasks.forEach((task) => {
        if (filteredTaskIds.has(task.id)) {
          const due = parseDate(task.due_date);
          if (due) {
            dates.push(due);
          }
        }
      });
    });

    const today = new Date();
    const start = dates.length
      ? new Date(Math.min(...dates.map((date) => date.getTime())))
      : addDays(today, -7);
    const end = dates.length
      ? new Date(Math.max(...dates.map((date) => date.getTime())))
      : addDays(today, 45);
    const timelineStart = addDays(start, -3);
    const timelineEnd = addDays(end < timelineStart ? timelineStart : end, 10);
    const totalDays = Math.max(1, differenceInDays(timelineStart, timelineEnd));
    const ticks = Array.from({ length: 6 }, (_, index) =>
      addDays(timelineStart, Math.round((totalDays / 5) * index))
    );

    return {
      start: timelineStart,
      end: timelineEnd,
      totalDays,
      ticks,
    };
  }, [filteredTaskIds, visibleProjects]);

  function getBarStyle(startValue, endValue) {
    const start = parseDate(startValue) || timeline.start;
    const end = parseDate(endValue) || addDays(start, 4);
    const left = clamp((differenceInDays(timeline.start, start) / timeline.totalDays) * 100, 0, 98);
    const width = clamp((Math.max(1, differenceInDays(start, end) + 1) / timeline.totalDays) * 100, 2.5, 100 - left);

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  }

  async function moveTask(task, nextStatus) {
    if (readOnly || !task || getBoardStatus(task.status) === nextStatus) {
      return;
    }

    const status = nextStatus === "completed" ? "completed" : nextStatus;
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    setSavingTaskId(task.id);

    const { data, error } = await supabase
      .from("product_development_tasks")
      .update({ status, completed_at: completedAt })
      .eq("id", task.id)
      .select("*")
      .single();

    setSavingTaskId(null);
    setDraggedTaskId(null);

    if (error) {
      setMessage(`Não foi possível mover a tarefa: ${error.message}`);
      return;
    }

    setTasks((current) => current.map((item) => (item.id === data.id ? data : item)));
    setMessage(`Tarefa movida para ${taskStatusLabels[status]}.`);
    window.dispatchEvent(
      new CustomEvent("penn:tasks-changed", {
        detail: { source: "project-management", task: data },
      })
    );
  }

  function openTaskEditor(task) {
    setSelectedTask(task);
    setTaskDraft({
      status: task.status || "pending",
      assigneeEmail: task.assignee_email || "",
      dueDate: toInputDate(task.due_date),
      notes: task.notes || "",
    });
    setMessage("");
  }

  function closeTaskEditor() {
    if (savingTaskId) {
      return;
    }

    setSelectedTask(null);
  }

  async function saveSelectedTask(event) {
    event.preventDefault();

    if (readOnly || !selectedTask) {
      return;
    }

    const assigneeEmail = taskDraft.assigneeEmail.trim().toLowerCase();
    const assignee = assigneeEmail
      ? profiles.find((profile) => profile.email?.trim().toLowerCase() === assigneeEmail)
      : null;

    if (assigneeEmail && !assignee) {
      setMessage("Selecione uma pessoa cadastrada para assumir a tarefa.");
      return;
    }

    const isComplete = completeStatuses.has(taskDraft.status);
    const payload = {
      status: taskDraft.status,
      completed_at: isComplete
        ? selectedTask.completed_at || new Date().toISOString()
        : null,
      assignee_name: assignee
        ? assignee.full_name || assignee.email
        : null,
      assignee_email: assignee ? assignee.email.trim().toLowerCase() : null,
      due_date: taskDraft.dueDate || null,
      notes: taskDraft.notes.trim() || null,
    };

    setSavingTaskId(selectedTask.id);
    const { data, error } = await supabase
      .from("product_development_tasks")
      .update(payload)
      .eq("id", selectedTask.id)
      .select("*")
      .single();
    setSavingTaskId(null);

    if (error) {
      setMessage(`Não foi possível salvar a tarefa: ${error.message}`);
      return;
    }

    setTasks((current) => current.map((item) => (item.id === data.id ? data : item)));
    setSelectedTask(null);
    setMessage("Tarefa atualizada com sucesso.");
    window.dispatchEvent(
      new CustomEvent("penn:tasks-changed", {
        detail: { source: "project-management", task: data },
      })
    );
  }

  function renderTaskCard(task) {
    const project = projectById.get(String(task.project_id));
    const product = project?.product;
    const tone = getTaskTone(task);
    const isSaving = savingTaskId === task.id;

    return (
      <article
        className={`project-task-card ${tone} ${isSaving ? "saving" : ""}`}
        draggable={!readOnly}
        key={task.id}
        onClick={() => openTaskEditor(task)}
        onDragStart={(event) => {
          if (readOnly) {
            return;
          }

          setDraggedTaskId(task.id);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", String(task.id));
        }}
      >
        <header>
          <span>{getProductCode(product)}</span>
          <strong>{task.title}</strong>
        </header>
        <p>{product?.name || "Produto em desenvolvimento"}</p>
        <div className="project-task-meta">
          <span>{WORKFLOW_STAGE_NAMES[task.stage_key] || task.stage_key}</span>
          <span className={isTaskOverdue(task) ? "overdue" : ""}>
            {formatDate(task.due_date)}
          </span>
        </div>
        <footer>
          <span>{task.assignee_name || task.owner_area || "Sem responsável"}</span>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenDevelopmentTask?.({
                projectId: task.project_id,
                stageKey: task.stage_key,
                taskId: task.id,
              });
            }}
            type="button"
          >
            Abrir NPI
          </button>
        </footer>
      </article>
    );
  }

  const selectedTaskProject = selectedTask
    ? projectById.get(String(selectedTask.project_id))
    : null;

  return (
    <main className={`project-management-page ${readOnly ? "is-read-only" : ""}`}>
      <section className="project-management-hero">
        <div>
          <span className="project-management-kicker">
            <ProjectIcon name="board" /> Gerenciamento de projetos
          </span>
          <h1>Projetos por quadro e Gantt</h1>
          <p>
            Organize as tarefas de desenvolvimento em um quadro arrastável e acompanhe prazos por linha do tempo, usando a mesma base dos projetos NPI.
          </p>
        </div>
        <div className="project-management-score">
          <strong>{metrics.progress}%</strong>
          <span>execução geral</span>
        </div>
      </section>

      <section className="project-management-metrics" aria-label="Indicadores de projetos">
        <article>
          <span><ProjectIcon name="board" /></span>
          <div><small>Projetos ativos</small><strong>{loading ? "..." : metrics.projects}</strong></div>
        </article>
        <article>
          <span><ProjectIcon name="clock" /></span>
          <div><small>Tarefas abertas</small><strong>{loading ? "..." : metrics.open}</strong></div>
        </article>
        <article className="danger">
          <span><ProjectIcon name="alert" /></span>
          <div><small>Bloqueios</small><strong>{loading ? "..." : metrics.blocked}</strong></div>
        </article>
        <article className="warning">
          <span><ProjectIcon name="calendar" /></span>
          <div><small>Vencidas</small><strong>{loading ? "..." : metrics.overdue}</strong></div>
        </article>
      </section>

      <section className="project-management-toolbar">
        <div className="project-view-tabs" role="tablist" aria-label="Modo de visualização">
          <button
            aria-selected={viewMode === "board"}
            className={viewMode === "board" ? "active" : ""}
            onClick={() => setViewMode("board")}
            role="tab"
            type="button"
          >
            <ProjectIcon name="board" /> Quadro
          </button>
          <button
            aria-selected={viewMode === "gantt"}
            className={viewMode === "gantt" ? "active" : ""}
            onClick={() => setViewMode("gantt")}
            role="tab"
            type="button"
          >
            <ProjectIcon name="calendar" /> Gantt
          </button>
        </div>

        <div className="project-filters">
          <label>
            Buscar
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Produto, tarefa, responsável..."
              type="search"
              value={query}
            />
          </label>
          <label>
            Projeto
            <select
              onChange={(event) => setProjectFilter(event.target.value)}
              value={projectFilter}
            >
              <option value="all">Todos os projetos</option>
              {projectData.map((project) => (
                <option key={project.id} value={project.id}>
                  {getProductCode(project.product)} - {project.product?.name || "Sem nome"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etapa
            <select
              onChange={(event) => setStageFilter(event.target.value)}
              value={stageFilter}
            >
              <option value="all">Todas as etapas</option>
              {Object.entries(WORKFLOW_STAGE_NAMES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="project-status-filters" aria-label="Filtros de status">
        {filterOptions.map(([value, label]) => (
          <button
            className={statusFilter === value ? "active" : ""}
            key={value}
            onClick={() => setStatusFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {message && <p className="project-management-message" role="status">{message}</p>}
      {readOnly && (
        <p className="project-management-message subtle">
          Seu perfil pode consultar os projetos, mas as ações de edição estão bloqueadas.
        </p>
      )}

      {viewMode === "board" ? (
        <section className="project-board" aria-label="Quadro de tarefas">
          {boardColumns.map((column) => {
            const columnTasks = filteredTasks.filter(
              (task) => getBoardStatus(task.status) === column.key
            );

            return (
              <div
                className={`project-board-column ${column.tone} ${
                  draggedTaskId ? "is-drop-ready" : ""
                }`}
                key={column.key}
                onDragOver={(event) => {
                  if (!readOnly) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId =
                    event.dataTransfer.getData("text/plain") || draggedTaskId;
                  const task = activeTasks.find((item) => String(item.id) === String(taskId));
                  moveTask(task, column.key);
                }}
              >
                <header>
                  <div>
                    <span>{column.label}</span>
                    <small>{column.description}</small>
                  </div>
                  <strong>{columnTasks.length}</strong>
                </header>
                <div className="project-board-list">
                  {columnTasks.map(renderTaskCard)}
                  {!loading && columnTasks.length === 0 && (
                    <div className="project-column-empty">Nenhuma tarefa aqui.</div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="project-gantt" aria-label="Quadro de Gantt">
          <header className="project-gantt-header">
            <span>Projeto</span>
            <div
              style={{
                gridTemplateColumns: `repeat(${timeline.ticks.length}, minmax(90px, 1fr))`,
              }}
            >
              {timeline.ticks.map((tick) => (
                <time key={tick.toISOString()}>{tick.toLocaleDateString("pt-BR", { month: "short", day: "2-digit" })}</time>
              ))}
            </div>
          </header>
          <div className="project-gantt-rows">
            {visibleProjects.map((project) => {
              const projectTasks = project.projectTasks.filter((task) =>
                filteredTaskIds.has(task.id)
              );
              const createdAt = toInputDate(project.created_at);
              const latestTaskDate = projectTasks
                .map((task) => parseDate(task.due_date))
                .filter(Boolean)
                .sort((a, b) => b.getTime() - a.getTime())[0];
              const projectEnd =
                toInputDate(project.target_launch_date) ||
                latestTaskDate?.toISOString().slice(0, 10) ||
                toInputDate(addDays(parseDate(project.created_at) || new Date(), 20));

              return (
                <article className="project-gantt-row" key={project.id}>
                  <aside>
                    <strong>{getProductCode(project.product)}</strong>
                    <span>{project.product?.name || "Produto em desenvolvimento"}</span>
                    <small>{project.progress}% concluído</small>
                    {project.product?.id && (
                      <button
                        onClick={() => onOpenProduct?.(project.product.id)}
                        type="button"
                      >
                        Ver produto
                      </button>
                    )}
                  </aside>
                  <div
                    className="project-gantt-track"
                    style={{ minHeight: `${86 + Math.max(projectTasks.length, 1) * 30}px` }}
                  >
                    <span
                      className="project-gantt-project-bar"
                      style={getBarStyle(createdAt, projectEnd)}
                    >
                      Projeto
                    </span>
                    {projectTasks.map((task, index) => {
                      const fallbackStart = addDays(
                        parseDate(project.created_at) || timeline.start,
                        index * 3
                      );
                      const taskEnd = parseDate(task.due_date) || addDays(fallbackStart, 4);
                      const taskStart = task.due_date ? addDays(taskEnd, -4) : fallbackStart;

                      return (
                        <button
                          className={`project-gantt-task ${getTaskTone(task)}`}
                          key={task.id}
                          onClick={() => openTaskEditor(task)}
                          style={{
                            ...getBarStyle(taskStart, taskEnd),
                            top: `${42 + index * 30}px`,
                          }}
                          title={`${task.title} - ${formatDate(task.due_date)}`}
                          type="button"
                        >
                          {task.title}
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
            {!loading && visibleProjects.length === 0 && (
              <div className="project-gantt-empty">Nenhum projeto encontrado para os filtros atuais.</div>
            )}
          </div>
        </section>
      )}

      <FormModal
        closeLabel="Fechar tarefa"
        description={
          selectedTaskProject
            ? `${getProductCode(selectedTaskProject.product)} - ${selectedTaskProject.product?.name || "Produto em desenvolvimento"}`
            : ""
        }
        eyebrow="Tarefa do projeto"
        onClose={closeTaskEditor}
        open={Boolean(selectedTask)}
        size="large"
        title={selectedTask?.title || "Editar tarefa"}
      >
        {selectedTask && (
          <form className="modal-form project-task-editor" onSubmit={saveSelectedTask}>
            <div className="project-task-modal-context wide">
              <article>
                <span>Etapa</span>
                <strong>{WORKFLOW_STAGE_NAMES[selectedTask.stage_key] || selectedTask.stage_key}</strong>
              </article>
              <article>
                <span>Área</span>
                <strong>{selectedTask.owner_area || "Não definida"}</strong>
              </article>
              <article>
                <span>Status atual</span>
                <strong>{taskStatusLabels[selectedTask.status] || "Pendente"}</strong>
              </article>
            </div>
            <label>
              Status
              <select
                disabled={readOnly}
                onChange={(event) => setTaskDraft({ ...taskDraft, status: event.target.value })}
                value={taskDraft.status}
              >
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Responsável
              <select
                disabled={readOnly}
                onChange={(event) => setTaskDraft({ ...taskDraft, assigneeEmail: event.target.value })}
                value={taskDraft.assigneeEmail}
              >
                <option value="">Sem responsável</option>
                {profiles.map((profile) => (
                  <option key={profile.id || profile.email} value={profile.email}>
                    {profile.full_name || profile.email}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prazo
              <input
                disabled={readOnly}
                onChange={(event) => setTaskDraft({ ...taskDraft, dueDate: event.target.value })}
                type="date"
                value={taskDraft.dueDate}
              />
            </label>
            <label className="wide">
              Observações
              <textarea
                disabled={readOnly}
                onChange={(event) => setTaskDraft({ ...taskDraft, notes: event.target.value })}
                rows="4"
                value={taskDraft.notes}
              />
            </label>
            <footer className="modal-form-actions">
              <button onClick={closeTaskEditor} type="button">Cancelar</button>
              <button disabled={readOnly || savingTaskId === selectedTask.id} type="submit">
                Salvar tarefa
              </button>
            </footer>
          </form>
        )}
      </FormModal>
    </main>
  );
}
