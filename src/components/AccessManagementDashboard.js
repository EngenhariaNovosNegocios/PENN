"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const emptyUser = {
  fullName: "",
  email: "",
  area: "",
  role: "colaborador",
};

const roleLabels = {
  colaborador: "Colaborador",
  gerente: "Gerente",
  admin: "Admin",
};

function AccessIcon({ name }) {
  const paths = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
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

export default function AccessManagementDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const normalizedEmail = user?.email?.toLowerCase() ?? "";
    const [currentResult, usersResult] = await Promise.all([
      normalizedEmail
        ? supabase
            .from("authorized_users")
            .select("*")
            .eq("email", normalizedEmail)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("authorized_users")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setCurrentUser(currentResult.data);
    setUsers(usersResult.data ?? []);

    if (usersResult.error) {
      setMessage(
        `Nao foi possivel carregar os acessos: ${usersResult.error.message}`
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const canManage = useMemo(
    () => ["gerente", "admin"].includes(currentUser?.role),
    [currentUser]
  );

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function createUser(event) {
    event.preventDefault();

    if (!canManage) {
      setMessage("Seu perfil nao tem permissao para cadastrar acessos.");
      return;
    }

    const payload = {
      full_name: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      area: form.area.trim(),
      role: form.role,
      active: true,
    };

    if (!payload.full_name || !payload.email) {
      setMessage("Informe nome e e-mail.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("authorized_users")
      .upsert(payload, { onConflict: "email" })
      .select("*")
      .single();

    if (error) {
      setMessage(`Nao foi possivel cadastrar o acesso: ${error.message}`);
      setSaving(false);
      return;
    }

    setUsers((current) => [
      data,
      ...current.filter((user) => user.email !== data.email),
    ]);
    setForm(emptyUser);
    setSaving(false);
    setMessage("Pessoa cadastrada. Ela ja pode criar o primeiro acesso.");
  }

  async function updateUser(user, changes) {
    if (!canManage) {
      setMessage("Seu perfil nao tem permissao para alterar acessos.");
      return;
    }

    if (
      user.email === currentUser?.email &&
      Object.prototype.hasOwnProperty.call(changes, "active") &&
      changes.active === false
    ) {
      setMessage("Voce nao pode bloquear o proprio acesso.");
      return;
    }

    const { data, error } = await supabase
      .from("authorized_users")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) {
      setMessage(`Nao foi possivel atualizar: ${error.message}`);
      return;
    }

    setUsers((current) =>
      current.map((item) => (item.id === data.id ? data : item))
    );
  }

  return (
    <main className="access-page">
      <section className="access-hero">
        <span className="access-hero-icon">
          <AccessIcon name="lock" />
        </span>
        <div>
          <span>Controle de acesso</span>
          <h1>Pessoas cadastradas no sistema</h1>
          <p>
            Cadastre os e-mails autorizados. Somente pessoas cadastradas aqui
            conseguem criar o primeiro acesso e entrar no Portal PENN.
          </p>
        </div>
      </section>

      {message && <p className="access-message">{message}</p>}

      <section className="access-layout">
        <article className="access-panel">
          <header>
            <div>
              <span>Cadastro</span>
              <h2>Nova pessoa</h2>
            </div>
            <AccessIcon name="plus" />
          </header>

          {!canManage && !loading && (
            <p className="access-warning">
              Apenas perfis gerente ou admin podem cadastrar novas pessoas.
            </p>
          )}

          <form className="access-form" onSubmit={createUser}>
            <label>
              Nome completo
              <input
                disabled={!canManage}
                name="fullName"
                onChange={updateField}
                placeholder="Nome da pessoa"
                required
                value={form.fullName}
              />
            </label>
            <label>
              E-mail
              <input
                disabled={!canManage}
                name="email"
                onChange={updateField}
                placeholder="nome@empresa.com"
                required
                type="email"
                value={form.email}
              />
            </label>
            <label>
              Area
              <input
                disabled={!canManage}
                name="area"
                onChange={updateField}
                placeholder="Ex.: Engenharia"
                value={form.area}
              />
            </label>
            <label>
              Perfil
              <select
                disabled={!canManage}
                name="role"
                onChange={updateField}
                value={form.role}
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={!canManage || saving} type="submit">
              {saving ? "Cadastrando..." : "Cadastrar pessoa"}
            </button>
          </form>
        </article>

        <article className="access-panel access-list-panel">
          <header>
            <div>
              <span>Base autorizada</span>
              <h2>Usuarios</h2>
            </div>
            <strong>{users.length}</strong>
          </header>

          <div className="access-user-list">
            {users.map((user) => (
              <div className={!user.active ? "inactive" : ""} key={user.id}>
                <span className="access-avatar">
                  {(user.full_name || user.email).slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{user.full_name || "Sem nome"}</strong>
                  <small>{user.email}</small>
                  <small>{user.area || "Sem area"}</small>
                </div>
                <select
                  disabled={!canManage}
                  onChange={(event) =>
                    updateUser(user, { role: event.target.value })
                  }
                  value={user.role}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!canManage || user.email === currentUser?.email}
                  onClick={() => updateUser(user, { active: !user.active })}
                  type="button"
                >
                  {user.active ? "Bloquear" : "Ativar"}
                </button>
              </div>
            ))}

            {!loading && users.length === 0 && (
              <p className="access-empty">Nenhuma pessoa cadastrada.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
