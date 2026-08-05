"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const taskStatusLabels = {
  pending: "Pendente",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
  completed: "Concluido",
  not_applicable: "Nao aplicavel",
};

const priorityLabels = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
  critica: "Critica",
};

function ManagerIcon({ name }) {
  const paths = {
    chart: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </>
    ),
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
    check: <path d="m5 12 4 4L19 6" />,
    box: (
      <>
        <path d="m21 8-9 5-9-5" />
        <path d="M3 8l9-5 9 5v8l-9 5-9-5Z" />
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

function formatDate(value) {
  if (!value) {
    return "Sem prazo";
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function isOverdue(value) {
  return Boolean(value) && new Date(`${value}T23:59:59`) < new Date();
}

export default function ManagerActivityDashboard({ onOpenIssues, onOpenProducts }) {
  const [data, setData] = useState({
    products: [],
    issues: [],
    resolvedIssues: [],
    projects: [],
    tasks: [],
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadActivities() {
    setLoading(true);
    setMessage("");

    const [
      productsResult,
      issuesResult,
      resolvedIssuesResult,
      projectsResult,
      tasksResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, code, name, status, owner, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("product_issues")
        .select(
          "id, product_id, product_code, description, priority, due_date, assignee_name, created_at"
        )
        .is("resolved_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_issues")
        .select(
          "id, product_id, product_code, description, priority, resolved_at, resolution_note"
        )
        .not("resolved_at", "is", null)
        .order("resolved_at", { ascending: false })
        .limit(8),
      supabase
        .from("product_development_projects")
        .select(
          "id, product_id, owner, requester, target_launch_date, archived_at, products(code, name)"
        )
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_development_tasks")
        .select(
          "id, project_id, title, status, due_date, assignee_name, owner_area, product_development_projects(products(code, name))"
        )
        .not("status", "in", "(completed,not_applicable)")
        .order("due_date", { ascending: true }),
    ]);

    const firstError =
      productsResult.error ??
      issuesResult.error ??
      projectsResult.error ??
      tasksResult.error;

    if (firstError) {
      setMessage(`Nao foi possivel carregar o painel: ${firstError.message}`);
    }

    setData({
      products: productsResult.data ?? [],
      issues: issuesResult.data ?? [],
      resolvedIssues: resolvedIssuesResult.data ?? [],
      projects: projectsResult.data ?? [],
      tasks: tasksResult.data ?? [],
    });
    setLoading(false);
  }

  useEffect(() => {
    loadActivities();

    window.addEventListener("penn:issues-changed", loadActivities);
    window.addEventListener("penn:tasks-changed", loadActivities);

    return () => {
      window.removeEventListener("penn:issues-changed", loadActivities);
      window.removeEventListener("penn:tasks-changed", loadActivities);
    };
  }, []);

  const metrics = useMemo(() => {
    const overdueTasks = data.tasks.filter((task) => isOverdue(task.due_date));
    const overdueIssues = data.issues.filter((issue) => isOverdue(issue.due_date));
    const criticalIssues = data.issues.filter(
      (issue) => issue.priority === "critica"
    );
    const activeProducts = data.products.filter(
      (product) => product.status === "ativo"
    );

    return {
      openTasks: data.tasks.length,
      overdueTasks: overdueTasks.length,
      openIssues: data.issues.length,
      overdueIssues: overdueIssues.length,
      criticalIssues: criticalIssues.length,
      activeProjects: data.projects.length,
      activeProducts: activeProducts.length,
      resolvedRecently: data.resolvedIssues.length,
    };
  }, [data]);

  const upcomingTasks = data.tasks.slice(0, 8);
  const urgentIssues = [...data.issues].sort((a, b) => {
    const aScore =
      (a.priority === "critica" ? 3 : a.priority === "alta" ? 2 : 1) +
      (isOverdue(a.due_date) ? 3 : 0);
    const bScore =
      (b.priority === "critica" ? 3 : b.priority === "alta" ? 2 : 1) +
      (isOverdue(b.due_date) ? 3 : 0);
    return bScore - aScore;
  });

  return (
    <main className="manager-page">
      <section className="manager-hero">
        <div>
          <span>Painel do gerente</span>
          <h1>Atividades em andamento</h1>
          <p>
            Uma visao consolidada das pendencias, tarefas de desenvolvimento e
            projetos ativos do portal PENN.
          </p>
        </div>
        <button onClick={loadActivities} type="button">
          Atualizar
        </button>
      </section>

      {message && <p className="manager-message">{message}</p>}

      <section className="manager-kpis" aria-label="Indicadores gerenciais">
        <article>
          <span className="manager-kpi-icon blue">
            <ManagerIcon name="clock" />
          </span>
          <div>
            <small>Tarefas abertas</small>
            <strong>{loading ? "..." : metrics.openTasks}</strong>
            <span>{metrics.overdueTasks} vencidas</span>
          </div>
        </article>
        <article>
          <span className="manager-kpi-icon red">
            <ManagerIcon name="alert" />
          </span>
          <div>
            <small>Pendencias abertas</small>
            <strong>{loading ? "..." : metrics.openIssues}</strong>
            <span>{metrics.criticalIssues} criticas</span>
          </div>
        </article>
        <article>
          <span className="manager-kpi-icon violet">
            <ManagerIcon name="chart" />
          </span>
          <div>
            <small>Projetos ativos</small>
            <strong>{loading ? "..." : metrics.activeProjects}</strong>
            <span>{metrics.activeProducts} produtos ativos</span>
          </div>
        </article>
        <article>
          <span className="manager-kpi-icon green">
            <ManagerIcon name="check" />
          </span>
          <div>
            <small>Resolvidas recentes</small>
            <strong>{loading ? "..." : metrics.resolvedRecently}</strong>
            <span>historico mais recente</span>
          </div>
        </article>
      </section>

      <section className="manager-grid">
        <article className="manager-panel">
          <header>
            <div>
              <span>Prioridade</span>
              <h2>Pendencias que precisam de atencao</h2>
            </div>
            <button onClick={onOpenIssues} type="button">
              Abrir pendencias <ManagerIcon name="arrow" />
            </button>
          </header>

          <div className="manager-list">
            {urgentIssues.slice(0, 8).map((issue) => (
              <button
                className={isOverdue(issue.due_date) ? "overdue" : ""}
                key={issue.id}
                onClick={onOpenIssues}
                type="button"
              >
                <span className={`manager-priority ${issue.priority || "media"}`}>
                  {priorityLabels[issue.priority] ?? "Media"}
                </span>
                <div>
                  <strong>{issue.product_code}</strong>
                  <small>{issue.description}</small>
                </div>
                <time>{formatDate(issue.due_date)}</time>
              </button>
            ))}

            {!loading && urgentIssues.length === 0 && (
              <p className="manager-empty">Nenhuma pendencia aberta.</p>
            )}
          </div>
        </article>

        <article className="manager-panel">
          <header>
            <div>
              <span>Execucao</span>
              <h2>Tarefas de NPI em andamento</h2>
            </div>
          </header>

          <div className="manager-list task-list">
            {upcomingTasks.map((task) => (
              <div
                className={isOverdue(task.due_date) ? "overdue" : ""}
                key={task.id}
              >
                <span className={`task-status ${task.status}`}>
                  {taskStatusLabels[task.status] ?? task.status}
                </span>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.product_development_projects?.products?.code ??
                      "Produto"}{" "}
                    - {task.assignee_name || task.owner_area || "Sem responsavel"}
                  </small>
                </div>
                <time>{formatDate(task.due_date)}</time>
              </div>
            ))}

            {!loading && upcomingTasks.length === 0 && (
              <p className="manager-empty">Nenhuma tarefa aberta.</p>
            )}
          </div>
        </article>

        <article className="manager-panel">
          <header>
            <div>
              <span>Portfolio</span>
              <h2>Projetos ativos</h2>
            </div>
            <button onClick={onOpenProducts} type="button">
              Ver produtos <ManagerIcon name="arrow" />
            </button>
          </header>

          <div className="manager-projects">
            {data.projects.slice(0, 6).map((project) => (
              <button
                key={project.id}
                onClick={onOpenProducts}
                type="button"
              >
                <span className="project-symbol">
                  <ManagerIcon name="box" />
                </span>
                <div>
                  <strong>{project.products?.code ?? "Produto"}</strong>
                  <small>{project.products?.name ?? "Sem nome"}</small>
                </div>
                <time>{formatDate(project.target_launch_date)}</time>
              </button>
            ))}

            {!loading && data.projects.length === 0 && (
              <p className="manager-empty">Nenhum projeto ativo.</p>
            )}
          </div>
        </article>

        <article className="manager-panel">
          <header>
            <div>
              <span>Historico</span>
              <h2>Resolvidas recentemente</h2>
            </div>
          </header>

          <div className="manager-resolved">
            {data.resolvedIssues.map((issue) => (
              <div key={issue.id}>
                <span className="resolved-icon">
                  <ManagerIcon name="check" />
                </span>
                <div>
                  <strong>{issue.product_code}</strong>
                  <small>{issue.description}</small>
                  {issue.resolution_note && <p>{issue.resolution_note}</p>}
                </div>
                <time>
                  {issue.resolved_at
                    ? new Date(issue.resolved_at).toLocaleDateString("pt-BR")
                    : "-"}
                </time>
              </div>
            ))}

            {!loading && data.resolvedIssues.length === 0 && (
              <p className="manager-empty">Nenhuma resolucao recente.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
