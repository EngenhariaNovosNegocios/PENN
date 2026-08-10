"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import { isAssignedTo, normalizeIdentityValue } from "@/lib/assignee";
import { supabase } from "@/lib/supabaseClient";

const roleLabels = {
  colaborador: "Colaborador",
  gerente: "Gerente",
  admin: "Administrador",
};

const priorityLabels = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

function PersonIcon({ name }) {
  const paths = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    alert: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
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

function getInitials(value) {
  const parts = (value || "Usuário").split(/[.\s@_-]+/).filter(Boolean);
  return `${parts[0]?.[0] || "U"}${parts[1]?.[0] || ""}`.toUpperCase();
}

function formatDate(value) {
  return value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR")
    : "Sem prazo";
}

function isOverdue(value) {
  return Boolean(value && new Date(`${value}T23:59:59`) < new Date());
}

export default function ConnectedUserOverlay({
  user,
  onClose,
  onOpenIssue,
}) {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setIssues([]);
      setErrorMessage("");
      return undefined;
    }

    let active = true;
    setTab("profile");
    setLoading(true);
    setErrorMessage("");

    async function loadPerson() {
      const email = normalizeIdentityValue(user.email);
      const [profileResult, accessResult, issuesResult] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("id,full_name,email,area,phone,role,last_login_at")
          .eq("id", user.id)
          .maybeSingle(),
        email
          ? supabase
              .from("authorized_users")
              .select("full_name,email,area,role")
              .eq("email", email)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("product_issues")
          .select(
            "id,product_id,product_code,description,priority,due_date,assignee_name,assignee_email,created_at"
          )
          .is("resolved_at", null)
          .order("due_date", { ascending: true, nullsFirst: false }),
      ]);

      if (!active) {
        return;
      }

      const mergedProfile = {
        id: user.id,
        full_name:
          profileResult.data?.full_name ||
          accessResult.data?.full_name ||
          user.fullName ||
          email.split("@")[0] ||
          "Usuário PENN",
        email:
          profileResult.data?.email ||
          accessResult.data?.email ||
          email,
        area: profileResult.data?.area || accessResult.data?.area || "Não informada",
        phone: profileResult.data?.phone || "Não informado",
        role:
          profileResult.data?.role ||
          accessResult.data?.role ||
          "colaborador",
        last_login_at: profileResult.data?.last_login_at,
      };
      const identity = {
        id: user.id,
        email: mergedProfile.email,
        name: mergedProfile.full_name,
        names: [
          mergedProfile.full_name,
          profileResult.data?.full_name,
          accessResult.data?.full_name,
          user.fullName,
        ],
      };

      setProfile(mergedProfile);
      setIssues(
        (issuesResult.data ?? []).filter((issue) =>
          isAssignedTo(issue, identity)
        )
      );

      const loadError =
        profileResult.error || accessResult.error || issuesResult.error;
      if (loadError) {
        setErrorMessage(
          "Algumas informações desta pessoa não puderam ser carregadas."
        );
      }
      setLoading(false);
    }

    loadPerson();

    return () => {
      active = false;
    };
  }, [user]);

  const overdueCount = useMemo(
    () => issues.filter((issue) => isOverdue(issue.due_date)).length,
    [issues]
  );
  const displayName = profile?.full_name || user?.fullName || user?.email;

  return (
    <FormModal
      description="Perfil interno e pendências de produto atribuídas a esta pessoa."
      eyebrow="Pessoa conectada agora"
      onClose={onClose}
      open={Boolean(user)}
      size="large"
      title={displayName || "Perfil da pessoa"}
    >
      <section className="connected-user-overlay">
        <header className="connected-user-summary">
          <span className="connected-user-avatar">{getInitials(displayName)}</span>
          <div>
            <span className="connected-user-online"><i /> Online agora</span>
            <strong>{displayName || "Usuário PENN"}</strong>
            <small>{profile?.email || user?.email || "E-mail não informado"}</small>
          </div>
          <div className="connected-user-counters">
            <span><strong>{issues.length}</strong> pendências</span>
            <span className={overdueCount ? "overdue" : ""}><strong>{overdueCount}</strong> vencidas</span>
          </div>
        </header>

        <nav aria-label="Informações da pessoa" className="connected-user-tabs">
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")} type="button"><PersonIcon name="user"/>Perfil</button>
          <button className={tab === "issues" ? "active" : ""} onClick={() => setTab("issues")} type="button"><PersonIcon name="alert"/>Pendências <b>{issues.length}</b></button>
        </nav>

        {errorMessage && <p className="connected-user-message">{errorMessage}</p>}

        {loading ? (
          <div className="connected-user-loading"><span/><span/><span/></div>
        ) : tab === "profile" ? (
          <section className="connected-user-profile-grid">
            <article><span>Nome</span><strong>{displayName || "Não informado"}</strong></article>
            <article><span>Área</span><strong>{profile?.area || "Não informada"}</strong></article>
            <article><span>Perfil de acesso</span><strong>{roleLabels[profile?.role] || "Colaborador"}</strong></article>
            <article><span>Telefone</span><strong>{profile?.phone || "Não informado"}</strong></article>
            <article className="wide"><span>Conectado desde</span><strong>{user?.onlineAt ? new Date(user.onlineAt).toLocaleString("pt-BR") : "Agora"}</strong></article>
          </section>
        ) : (
          <section className="connected-user-issues">
            {issues.map((issue) => (
              <button
                className={isOverdue(issue.due_date) ? "overdue" : ""}
                key={issue.id}
                onClick={() => {
                  onClose?.();
                  onOpenIssue?.({ issueId: issue.id, productId: issue.product_id });
                }}
                type="button"
              >
                <span className={`connected-user-priority ${issue.priority || "media"}`}>{priorityLabels[issue.priority] || "Média"}</span>
                <span><strong>{issue.description}</strong><small>{issue.product_code} · {formatDate(issue.due_date)}</small></span>
                <span className="connected-user-arrow"><PersonIcon name="arrow"/></span>
              </button>
            ))}
            {!issues.length && (
              <div className="connected-user-empty"><span><PersonIcon name="check"/></span><strong>Nenhuma pendência aberta</strong><p>Esta pessoa não possui pendências de produto atribuídas no momento.</p></div>
            )}
          </section>
        )}
      </section>
    </FormModal>
  );
}
