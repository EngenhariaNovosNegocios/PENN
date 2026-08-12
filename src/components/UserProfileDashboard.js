"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import { isAssignedTo, normalizeIdentityValue } from "@/lib/assignee";
import {
  getCurrentStageTasks,
  WORKFLOW_STAGE_NAMES,
} from "@/lib/developmentWorkflow";
import { supabase } from "@/lib/supabaseClient";

const emptyPersonal = {
  title: "",
  description: "",
  due_date: "",
  priority: "media",
};

const sourceMeta = {
  npi: { label: "Novo produto", shortLabel: "NPI" },
  issue: { label: "Pendência", shortLabel: "Pendência" },
  personal: { label: "Pessoal", shortLabel: "Pessoal" },
};

const priorityWeight = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

function TaskIcon({ name }) {
  const paths = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z" />
        <path d="M19 16v6M16 19h6" />
      </>
    ),
    alert: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
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

function urgency(dueDate, priority) {
  if (priority === "critica") {
    return "danger";
  }

  if (!dueDate) {
    return "neutral";
  }

  const days = Math.ceil(
    (new Date(`${dueDate}T23:59:59`) - new Date()) / 86400000
  );

  if (days < 0) {
    return "danger";
  }

  return days <= 7 ? "warning" : "neutral";
}

function isOverdue(dueDate) {
  return Boolean(
    dueDate && new Date(`${dueDate}T23:59:59`) < new Date()
  );
}

function formatDueDate(dueDate) {
  return dueDate
    ? new Date(`${dueDate}T12:00:00`).toLocaleDateString("pt-BR")
    : "Sem prazo";
}

function dueWeight(dueDate) {
  return dueDate
    ? new Date(`${dueDate}T12:00:00`).getTime()
    : Number.MAX_SAFE_INTEGER;
}

export default function UserProfileDashboard({
  onOpenIssue,
  onOpenDevelopmentTask,
}) {
  const [user, setUser] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [tab, setTab] = useState("overview");
  const [listFilter, setListFilter] = useState("all");
  const [form, setForm] = useState(emptyPersonal);
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.id) {
      setUser(null);
      setAllTasks([]);
      setIssues([]);
      setPersonal([]);
      return;
    }

    const normalizedEmail = normalizeIdentityValue(authUser.email);
    const [authorizedResult, profileResult, tasksResult, issuesResult, personalResult] =
      await Promise.all([
        normalizedEmail
          ? supabase
              .from("authorized_users")
              .select("full_name,email")
              .eq("email", normalizedEmail)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("user_profiles")
          .select("full_name,email")
          .eq("id", authUser.id)
          .maybeSingle(),
        supabase
          .from("product_development_tasks")
          .select(
            "*, product_development_projects(product_id, archived_at, products(code,name))"
          )
          .order("sort_order"),
        supabase
          .from("product_issues")
          .select(
            "id,product_id,product_code,description,priority,due_date,assignee_name,assignee_email,created_at"
          )
          .is("resolved_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("personal_tasks")
          .select("*")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false }),
      ]);

    const profile = profileResult.data;
    const authorizedUser = authorizedResult.data;
    const metadataName = authUser.user_metadata?.full_name;
    const fallbackName = normalizedEmail.split("@")[0] || "Equipe PENN";
    const identity = {
      id: authUser.id,
      email: normalizedEmail,
      name:
        profile?.full_name ||
        authorizedUser?.full_name ||
        metadataName ||
        fallbackName,
      names: [profile?.full_name, authorizedUser?.full_name, metadataName],
    };

    setUser(identity);
    setAllTasks(tasksResult.data ?? []);
    setIssues(
      (issuesResult.data ?? []).filter((issue) => isAssignedTo(issue, identity))
    );
    setPersonal(personalResult.data ?? []);

    const loadError =
      tasksResult.error || issuesResult.error || personalResult.error;
    if (loadError) {
      setMessage(`Não foi possível atualizar suas tarefas: ${loadError.message}`);
    }
  }

  useEffect(() => {
    const refresh = () => load();

    load();
    window.addEventListener("penn:tasks-changed", refresh);
    window.addEventListener("penn:issues-changed", refresh);

    return () => {
      window.removeEventListener("penn:tasks-changed", refresh);
      window.removeEventListener("penn:issues-changed", refresh);
    };
  }, []);

  const npiTasks = useMemo(() => {
    if (!user?.id) {
      return [];
    }

    const activeTasks = allTasks.filter(
      (task) => !task.product_development_projects?.archived_at
    );

    return getCurrentStageTasks(activeTasks).filter((task) =>
      isAssignedTo(task, user)
    );
  }, [allTasks, user]);

  const activities = useMemo(() => {
    const rows = [
      ...npiTasks.map((task) => ({
        id: `npi-${task.id}`,
        recordId: task.id,
        source: "npi",
        title: task.title,
        description: task.product_development_projects?.products?.name,
        context: `${task.product_development_projects?.products?.code || "Código a definir"} · ${
          WORKFLOW_STAGE_NAMES[task.stage_key] || task.stage_key
        }`,
        dueDate: task.due_date,
        priority: task.status === "blocked" ? "critica" : "media",
        completed: false,
        task,
      })),
      ...issues.map((issue) => ({
        id: `issue-${issue.id}`,
        recordId: issue.id,
        source: "issue",
        title: issue.description,
        context: `${issue.product_code} · ${issue.assignee_name || user?.name || "Responsável"}`,
        dueDate: issue.due_date,
        priority: issue.priority,
        completed: false,
        issue,
      })),
      ...personal.map((item) => ({
        id: `personal-${item.id}`,
        recordId: item.id,
        source: "personal",
        title: item.title,
        description: item.description,
        context: item.completed_at ? "Atividade concluída" : "Atividade pessoal",
        dueDate: item.due_date,
        priority: item.priority,
        completed: Boolean(item.completed_at),
        personal: item,
      })),
    ];

    return rows.sort(
      (first, second) =>
        Number(first.completed) - Number(second.completed) ||
        Number(!isOverdue(first.dueDate)) - Number(!isOverdue(second.dueDate)) ||
        dueWeight(first.dueDate) - dueWeight(second.dueDate) ||
        (priorityWeight[first.priority] ?? 2) -
          (priorityWeight[second.priority] ?? 2)
    );
  }, [issues, npiTasks, personal, user]);

  const openPersonal = personal.filter((item) => !item.completed_at);
  const openActivities = activities.filter((item) => !item.completed);
  const overdueCount = openActivities.filter((item) =>
    isOverdue(item.dueDate)
  ).length;
  const completedPersonal = personal.length - openPersonal.length;
  const visibleActivities = activities.filter(
    (item) => listFilter === "all" || item.source === listFilter
  );

  async function createPersonal(event) {
    event.preventDefault();

    if (!user?.id) {
      setMessage("Entre com um usuário para criar uma atividade pessoal.");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("personal_tasks")
      .insert({
        ...form,
        title: form.title.trim(),
        description: form.description.trim() || null,
        user_id: user.id,
        due_date: form.due_date || null,
      })
      .select("*")
      .single();
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPersonal((current) => [data, ...current]);
    setForm(emptyPersonal);
    setCreateOpen(false);
    setMessage("Atividade criada com sucesso.");
    window.dispatchEvent(new CustomEvent("penn:personal-tasks-changed"));
  }

  async function togglePersonal(item) {
    const completedAt = item.completed_at ? null : new Date().toISOString();
    const { data, error } = await supabase
      .from("personal_tasks")
      .update({ completed_at: completedAt })
      .eq("id", item.id)
      .select("*")
      .single();

    if (error) {
      setMessage(`Não foi possível atualizar a atividade: ${error.message}`);
      return;
    }

    setPersonal((current) =>
      current.map((row) => (row.id === item.id ? data : row))
    );
    window.dispatchEvent(new CustomEvent("penn:personal-tasks-changed"));
  }

  function openActivity(activity) {
    if (activity.source === "issue") {
      onOpenIssue?.({
        issueId: activity.issue.id,
        productId: activity.issue.product_id,
      });
      return;
    }

    if (activity.source === "npi") {
      onOpenDevelopmentTask?.({
        projectId: activity.task.project_id,
        stageKey: activity.task.stage_key,
        taskId: activity.task.id,
      });
    }
  }

  function ActivityRow({ activity, compact = false }) {
    const actionable = activity.source !== "personal";
    const content = (
      <>
        <span className={`profile-task-source ${activity.source}`}>
          {sourceMeta[activity.source].shortLabel}
        </span>
        <span className="profile-task-copy">
          <strong>{activity.title}</strong>
          <small>{activity.context}</small>
          {!compact && activity.description && <p>{activity.description}</p>}
        </span>
        <span
          className={`profile-task-due ${
            isOverdue(activity.dueDate) && !activity.completed ? "overdue" : ""
          }`}
        >
          {formatDueDate(activity.dueDate)}
        </span>
        {activity.source === "personal" ? (
          <button
            aria-label={
              activity.completed
                ? `Reabrir atividade ${activity.title}`
                : `Concluir atividade ${activity.title}`
            }
            className={`profile-task-check ${activity.completed ? "completed" : ""}`}
            onClick={() => togglePersonal(activity.personal)}
            title={activity.completed ? "Reabrir atividade" : "Marcar como concluída"}
            type="button"
          >
            <TaskIcon name="check" />
          </button>
        ) : (
          <span className="profile-task-arrow">
            <TaskIcon name="arrow" />
          </span>
        )}
      </>
    );

    return (
      <article
        className={`profile-task-row ${activity.source} ${
          activity.completed ? "completed" : ""
        } ${urgency(activity.dueDate, activity.priority)}`}
        key={activity.id}
      >
        {actionable ? (
          <button
            aria-label={`Abrir ${sourceMeta[activity.source].label.toLowerCase()} ${activity.title}`}
            className="profile-task-open"
            onClick={() => openActivity(activity)}
            type="button"
          >
            {content}
          </button>
        ) : (
          <div className="profile-task-open">{content}</div>
        )}
      </article>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <span className="profile-avatar">
          {user?.name?.slice(0, 2).toUpperCase() || "EN"}
        </span>
        <div>
          <small>Meu espaço de trabalho</small>
          <h1>{user?.name || "Equipe PENN"}</h1>
          <p>{user?.email || "Sessão interna sem e-mail associado"}</p>
        </div>
        <div className="profile-hero-focus">
          <strong>{openActivities.length}</strong>
          <span>itens para acompanhar</span>
        </div>
      </section>

      <nav aria-label="Seções das minhas tarefas" className="profile-tabs">
        <button
          aria-current={tab === "overview" ? "page" : undefined}
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
          type="button"
        >
          <TaskIcon name="overview" />
          Visão geral
        </button>
        <button
          aria-current={tab === "list" ? "page" : undefined}
          className={tab === "list" ? "active" : ""}
          onClick={() => setTab("list")}
          type="button"
        >
          <TaskIcon name="list" />
          Lista de tarefas <b>{openActivities.length}</b>
        </button>
      </nav>

      {message && <p className="flow-message">{message}</p>}

      {tab === "overview" ? (
        <section className="profile-overview">
          <div className="profile-summary profile-overview-summary">
            <article className="npi">
              <span className="profile-summary-icon">
                <TaskIcon name="spark" />
              </span>
              <div>
                <span>Próximas etapas NPI</span>
                <strong>{npiTasks.length}</strong>
                <small>somente da fase atual</small>
              </div>
            </article>
            <article className="issues">
              <span className="profile-summary-icon">
                <TaskIcon name="alert" />
              </span>
              <div>
                <span>Pendências atribuídas</span>
                <strong>{issues.length}</strong>
                <small>ligadas a produtos</small>
              </div>
            </article>
            <article className="personal">
              <span className="profile-summary-icon">
                <TaskIcon name="list" />
              </span>
              <div>
                <span>Atividades pessoais</span>
                <strong>{openPersonal.length}</strong>
                <small>{completedPersonal} concluídas</small>
              </div>
            </article>
            <article className={overdueCount ? "overdue" : "on-time"}>
              <span className="profile-summary-icon">
                <TaskIcon name={overdueCount ? "clock" : "check"} />
              </span>
              <div>
                <span>Itens vencidos</span>
                <strong>{overdueCount}</strong>
                <small>{overdueCount ? "precisam de atenção" : "tudo em dia"}</small>
              </div>
            </article>
          </div>

          <div className="profile-overview-grid">
            <section className="profile-priority-panel">
              <header>
                <div>
                  <span className="panel-kicker">Minha prioridade</span>
                  <h2>O que vem agora</h2>
                </div>
                <button onClick={() => setTab("list")} type="button">
                  Ver lista completa <TaskIcon name="arrow" />
                </button>
              </header>
              <div className="profile-task-stack">
                {openActivities.slice(0, 6).map((activity) => (
                  <ActivityRow activity={activity} compact key={activity.id} />
                ))}
                {!openActivities.length && (
                  <div className="profile-clear-state">
                    <span>
                      <TaskIcon name="check" />
                    </span>
                    <strong>Nenhuma atividade pendente</strong>
                    <p>Seu painel está em dia. Novas atribuições aparecerão aqui.</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="profile-focus-panel">
              <span className="panel-kicker">Meu fluxo</span>
              <h2>Organize o próximo passo</h2>
              <p>
                A visão reúne tarefas da etapa atual dos projetos, pendências de
                produtos e seus próprios lembretes.
              </p>
              <div className="profile-focus-breakdown">
                <button
                  onClick={() => {
                    setListFilter("npi");
                    setTab("list");
                  }}
                  type="button"
                >
                  <span>NPI</span>
                  <strong>{npiTasks.length}</strong>
                </button>
                <button
                  onClick={() => {
                    setListFilter("issue");
                    setTab("list");
                  }}
                  type="button"
                >
                  <span>Pendências</span>
                  <strong>{issues.length}</strong>
                </button>
                <button
                  onClick={() => {
                    setListFilter("personal");
                    setTab("list");
                  }}
                  type="button"
                >
                  <span>Pessoais</span>
                  <strong>{openPersonal.length}</strong>
                </button>
              </div>
              <button
                className="profile-focus-add"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                <TaskIcon name="plus" />
                Adicionar nova tarefa
              </button>
            </aside>
          </div>
        </section>
      ) : (
        <section className="profile-task-list-panel">
          <header>
            <div>
              <span className="panel-kicker">Agenda unificada</span>
              <h2>Lista de tarefas</h2>
              <p>Abra uma atribuição para continuar exatamente no ponto certo.</p>
            </div>
            <span>{visibleActivities.length} itens</span>
          </header>

          <nav aria-label="Filtrar lista de tarefas" className="profile-task-filters">
            {[
              ["all", "Todas", activities.length],
              ["npi", "Novos produtos", npiTasks.length],
              ["issue", "Pendências", issues.length],
              ["personal", "Pessoais", personal.length],
            ].map(([value, label, count]) => (
              <button
                className={listFilter === value ? "active" : ""}
                key={value}
                onClick={() => setListFilter(value)}
                type="button"
              >
                {label} <b>{count}</b>
              </button>
            ))}
          </nav>

          <div className="profile-task-stack profile-task-stack-full">
            {visibleActivities.map((activity) => (
              <ActivityRow activity={activity} key={activity.id} />
            ))}
            {!visibleActivities.length && (
              <div className="profile-clear-state compact">
                <span>
                  <TaskIcon name="check" />
                </span>
                <strong>Nenhuma tarefa neste filtro</strong>
              </div>
            )}
          </div>

          <footer className="profile-list-footer">
            <button onClick={() => setCreateOpen(true)} type="button">
              <TaskIcon name="plus" />
              Adicionar nova tarefa
            </button>
            <span>Crie uma atividade pessoal para não perder nenhum acompanhamento.</span>
          </footer>
        </section>
      )}

      <FormModal
        description="Esta tarefa será pessoal e aparecerá na sua visão geral e na lista de tarefas."
        eyebrow="Nova atividade"
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        title="Adicionar nova tarefa"
      >
        <form className="modal-form personal-task-modal-form" onSubmit={createPersonal}>
          <label className="wide">
            O que precisa ser feito?
            <input
              autoFocus
              maxLength="160"
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Ex.: Revisar retorno do fornecedor"
              required
              value={form.title}
            />
          </label>
          <label className="wide">
            Detalhes
            <textarea
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="Inclua informações que ajudem a concluir a tarefa."
              rows="4"
              value={form.description}
            />
          </label>
          <label>
            Prazo
            <input
              onChange={(event) =>
                setForm({ ...form, due_date: event.target.value })
              }
              type="date"
              value={form.due_date}
            />
          </label>
          <label>
            Prioridade
            <select
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value })
              }
              value={form.priority}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </label>
          <footer className="modal-form-actions">
            <button onClick={() => setCreateOpen(false)} type="button">
              Cancelar
            </button>
            <button disabled={saving} type="submit">
              {saving ? "Adicionando..." : "Adicionar tarefa"}
            </button>
          </footer>
        </form>
      </FormModal>
    </main>
  );
}
