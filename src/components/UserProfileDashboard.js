"use client";

import { useEffect, useMemo, useState } from "react";
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

function formatDueDate(dueDate) {
  return dueDate
    ? new Date(`${dueDate}T12:00:00`).toLocaleDateString("pt-BR")
    : "Sem prazo";
}

export default function UserProfileDashboard() {
  const [user, setUser] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [tab, setTab] = useState("issues");
  const [form, setForm] = useState(emptyPersonal);
  const [message, setMessage] = useState("");

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
      setMessage(`Não foi possível atualizar seu perfil: ${loadError.message}`);
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

  async function createPersonal(event) {
    event.preventDefault();

    if (!user?.id) {
      setMessage("Entre com um usuário para criar pendências privadas.");
      return;
    }

    const { data, error } = await supabase
      .from("personal_tasks")
      .insert({
        ...form,
        user_id: user.id,
        due_date: form.due_date || null,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setPersonal((current) => [data, ...current]);
    setForm(emptyPersonal);
    setMessage("Pendência privada criada.");
  }

  async function togglePersonal(item) {
    const completedAt = item.completed_at ? null : new Date().toISOString();
    const { data, error } = await supabase
      .from("personal_tasks")
      .update({ completed_at: completedAt })
      .eq("id", item.id)
      .select("*")
      .single();

    if (!error) {
      setPersonal((current) =>
        current.map((row) => (row.id === item.id ? data : row))
      );
    }
  }

  const openPersonalIssues = personal.filter((item) => !item.completed_at);

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <span className="profile-avatar">
          {user?.name?.slice(0, 2).toUpperCase() || "EN"}
        </span>
        <div>
          <small>Meu perfil</small>
          <h1>{user?.name || "Equipe PENN"}</h1>
          <p>{user?.email || "Sessão interna sem e-mail associado"}</p>
        </div>
      </section>

      <nav className="profile-tabs">
        <button
          className={tab === "npi" ? "active" : ""}
          onClick={() => setTab("npi")}
        >
          Novos produtos <b>{npiTasks.length}</b>
        </button>
        <button
          className={tab === "issues" ? "active" : ""}
          onClick={() => setTab("issues")}
        >
          Pendências <b>{issues.length + openPersonalIssues.length}</b>
        </button>
      </nav>

      {message && <p className="flow-message">{message}</p>}

      {tab === "npi" ? (
        <section className="profile-work">
          <header>
            <h2>Próxima etapa dos meus projetos</h2>
            <span>Somente tarefas pendentes da fase atual de cada desenvolvimento</span>
          </header>
          {npiTasks.map((task) => (
            <article className={urgency(task.due_date)} key={task.id}>
              <div>
                <small>
                  {task.product_development_projects?.products?.code} ·{" "}
                  {WORKFLOW_STAGE_NAMES[task.stage_key] || task.stage_key}
                </small>
                <strong>{task.title}</strong>
                <span>{task.assignee_name || task.owner_area}</span>
              </div>
              <time>{formatDueDate(task.due_date)}</time>
            </article>
          ))}
          {!npiTasks.length && (
            <div className="issues-empty">
              <strong>Nenhuma tarefa da fase atual atribuída</strong>
            </div>
          )}
        </section>
      ) : (
        <div className="profile-issues-grid">
          <section className="profile-work">
            <header>
              <div>
                <h2>Pendências atribuídas a mim</h2>
                <span>Registradas na central de Pendências</span>
              </div>
              <strong className="profile-assignment-count">
                {issues.length} abertas
              </strong>
            </header>
            {issues.map((issue) => (
              <article
                className={urgency(issue.due_date, issue.priority)}
                key={issue.id}
              >
                <div>
                  <small>
                    {issue.product_code} · {issue.priority}
                  </small>
                  <strong>{issue.description}</strong>
                  <span>Responsável: {issue.assignee_name || user?.name}</span>
                </div>
                <time>{formatDueDate(issue.due_date)}</time>
              </article>
            ))}
            {!issues.length && (
              <div className="issues-empty">
                <strong>Nenhuma pendência atribuída ao seu perfil</strong>
                <span>Novas pendências vinculadas ao seu e-mail aparecerão aqui.</span>
              </div>
            )}
          </section>

          <section className="personal-tasks">
            <header>
              <h2>Minhas pendências privadas</h2>
              <span>Não alteram produtos, projetos ou indicadores</span>
            </header>
            <form onSubmit={createPersonal}>
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Título da pendência"
              />
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Descrição opcional"
              />
              <input
                type="date"
                value={form.due_date}
                onChange={(event) =>
                  setForm({ ...form, due_date: event.target.value })
                }
              />
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm({ ...form, priority: event.target.value })
                }
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
              <button>Criar pendência privada</button>
            </form>
            <div>
              {personal.map((item) => (
                <article
                  className={`${urgency(item.due_date, item.priority)} ${
                    item.completed_at ? "completed" : ""
                  }`}
                  key={item.id}
                >
                  <button onClick={() => togglePersonal(item)}>
                    {item.completed_at ? "✓" : "○"}
                  </button>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.priority} · {formatDueDate(item.due_date)}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
