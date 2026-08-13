"use client";

import { cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import OverviewDashboard from "@/components/OverviewDashboard";
import NewProductsDashboard from "@/components/NewProductsDashboard";
import IssuesDashboard from "@/components/IssuesDashboard";
import StrategicIntelligenceDashboard from "@/components/StrategicIntelligenceDashboard";
import UserProfileDashboard from "@/components/UserProfileDashboard";
import ManagerActivityDashboard from "@/components/ManagerActivityDashboard";
import AccessManagementDashboard from "@/components/AccessManagementDashboard";
import ConnectedUserOverlay from "@/components/ConnectedUserOverlay";
import ImprovementSuggestionModal from "@/components/ImprovementSuggestionModal";
import { isAssignedTo } from "@/lib/assignee";
import {
  canAccessPortalPage,
  canCreateDemand,
  canEditOperations,
} from "@/lib/accessControl";
import { getCurrentStageTasks } from "@/lib/developmentWorkflow";
import { supabase } from "@/lib/supabaseClient";
import packageMetadata from "../../package.json";

const pageTitles = {
  overview: "Visão geral",
  products: "Produtos",
  "new-products": "Novos produtos",
  intelligence: "Inteligência NPI",
  issues: "Pendências",
  manager: "Gerência",
  access: "Acessos",
  indicators: "Indicadores",
  reports: "Relatórios",
  profile: "Minhas tarefas",
};

function getInitials(nameOrEmail) {
  const value = nameOrEmail || "Usuário";
  const parts = value.split(/[.\s@_-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "");
}

async function getPortalIdentity(user) {
  const email = user?.email?.toLowerCase() ?? "";

  if (!email) {
    return { email: "", name: "Equipe PENN", role: "colaborador" };
  }

  const { data } = await supabase
    .from("authorized_users")
    .select("full_name,email,role")
    .eq("email", email)
    .maybeSingle();

  return {
    email,
    name:
      data?.full_name ||
      user.user_metadata?.full_name ||
      email.split("@")[0] ||
      "Usuário",
    role: data?.role || "colaborador",
  };
}

const Icon = ({ name }) => {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    box: (
      <>
        <path d="m21 8-9 5-9-5" />
        <path d="M3 8l9-5 9 5v8l-9 5-9-5Z" />
        <path d="M12 13v8" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z" />
        <path d="M19 16v6M16 19h6" />
      </>
    ),
    brain: (
      <>
        <path d="M9.5 4.5A3 3 0 0 0 4 6a3 3 0 0 0 .7 1.9A4 4 0 0 0 5 15.8 3.5 3.5 0 0 0 11 18V6.5a2 2 0 0 0-1.5-2Z" />
        <path d="M14.5 4.5A3 3 0 0 1 20 6a3 3 0 0 1-.7 1.9 4 4 0 0 1-.3 7.9A3.5 3.5 0 0 1 13 18V6.5a2 2 0 0 1 1.5-2Z" />
        <path d="M8 10h3M13 13h3M8 16h3" />
      </>
    ),
    alert: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h6" />
      </>
    ),
    improve: (
      <>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.5 14.5A7 7 0 1 1 17 13c-1.2 1-2 2.1-2 3H9c0-.7-.4-1.1-.5-1.5Z" />
        <path d="M12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4" />
      </>
    ),
    tasks: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" />
      </>
    ),
    manager: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
        <path d="M18 6h4v4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
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
};

const navigation = [
  { id: "overview", label: "Visão geral", icon: "grid" },
  { id: "products", label: "Produtos", icon: "box" },
  { id: "new-products", label: "Novos produtos", icon: "spark" },
  { id: "issues", label: "Pendências", icon: "alert" },
  { id: "manager", label: "Gerência", icon: "manager" },
  { id: "access", label: "Acessos", icon: "users" },
  { id: "intelligence", label: "Inteligência NPI", icon: "brain", disabled: true },
  { id: "indicators", label: "Indicadores", icon: "chart", disabled: true },
  { id: "reports", label: "Relatórios", icon: "file", disabled: true },
];

const auxiliaryPages = new Set(["profile"]);

function canAccessPage(role, pageId) {
  if (auxiliaryPages.has(pageId)) {
    return canAccessPortalPage(role, pageId);
  }

  const page = navigation.find((item) => item.id === pageId);
  return Boolean(page) && !page.disabled && canAccessPortalPage(role, pageId);
}

export default function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("overview");
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [assignedIssueCount, setAssignedIssueCount] = useState(0);
  const [personalTaskCount, setPersonalTaskCount] = useState(0);
  const [profileName, setProfileName] = useState("Equipe PENN");
  const [userEmail, setUserEmail] = useState("");
  const [accessRole, setAccessRole] = useState("colaborador");
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedOnlineUser, setSelectedOnlineUser] = useState(null);
  const [improvementOpen, setImprovementOpen] = useState(false);

  const visibleNavigation = useMemo(
    () =>
      navigation.filter((item) => canAccessPortalPage(accessRole, item.id)),
    [accessRole]
  );

  const readOnly = !canEditOperations(accessRole);
  const demandCreationAllowed = canCreateDemand(accessRole);
  const productWorkspace = isValidElement(children)
    ? cloneElement(children, { accessRole, readOnly })
    : children;

  useEffect(() => {
    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const identity = await getPortalIdentity(user);
      const today = new Date().toISOString().slice(0, 10);
      const [tasksResult, issuesResult, personalTasksResult] = await Promise.all([
        supabase
          .from("product_development_tasks")
          .select(
            "id,project_id,stage_key,sort_order,status,title,due_date,assignee_name,assignee_email,product_development_projects(archived_at)"
          ),
        supabase
          .from("product_issues")
          .select("id,assignee_name,assignee_email")
          .is("resolved_at", null),
        user?.id
          ? supabase
              .from("personal_tasks")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .is("completed_at", null)
          : Promise.resolve({ count: 0 }),
      ]);

      const currentStageTasks = getCurrentStageTasks(
        (tasksResult.data ?? []).filter(
          (task) => !task.product_development_projects?.archived_at
        )
      );

      setProfileName(identity.name);
      setUserEmail(identity.email);
      setAccessRole(identity.role);
      setRoleLoaded(true);
      setAssignedIssueCount(
        (issuesResult.data ?? []).filter((issue) =>
          isAssignedTo(issue, identity)
        ).length
      );
      setPersonalTaskCount(personalTasksResult.count ?? 0);
      setOverdueTasks(
        currentStageTasks.filter(
          (task) =>
            task.due_date &&
            task.due_date < today &&
            isAssignedTo(task, identity)
        )
      );
    }

    loadNotifications();
    window.addEventListener("penn:tasks-changed", loadNotifications);
    window.addEventListener("penn:issues-changed", loadNotifications);
    window.addEventListener("penn:personal-tasks-changed", loadNotifications);
    return () => {
      window.removeEventListener("penn:tasks-changed", loadNotifications);
      window.removeEventListener("penn:issues-changed", loadNotifications);
      window.removeEventListener("penn:personal-tasks-changed", loadNotifications);
    };
  }, []);

  const profileAlertCount =
    overdueTasks.length + assignedIssueCount + personalTaskCount;

  useEffect(() => {
    if (roleLoaded && !canAccessPage(accessRole, activePage)) {
      setActivePage("overview");
    }
  }, [accessRole, activePage, roleLoaded]);

  useEffect(() => {
    let channel;

    async function trackPresence() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const identity = await getPortalIdentity(user);

      channel = supabase.channel("penn-online-users", {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state)
          .flat()
          .map((presence) => ({
            id: presence.user_id,
            email: presence.email,
            fullName: presence.full_name,
            onlineAt: presence.online_at,
          }))
          .filter((presence) => presence.id && presence.id !== user.id);
        const uniqueUsers = Array.from(
          new Map(users.map((presence) => [presence.id, presence])).values()
        );
        setOnlineUsers(uniqueUsers);
        setSelectedOnlineUser((current) =>
          current
            ? uniqueUsers.find((presence) => presence.id === current.id) ?? null
            : null
        );
      });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            email: identity.email,
            full_name: identity.name,
            online_at: new Date().toISOString(),
          });
        }
      });
    }

    trackPresence();

    return () => {
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  function openPage(pageId) {
    if (pageId && canAccessPage(accessRole, pageId)) {
      setActivePage(pageId);
    }
    setMenuOpen(false);
  }

  function openProduct(productId) {
    openPage("products");

    if (!productId) {
      return;
    }

    window.setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("penn:open-product", {
            detail: { productId },
          })
        ),
      0
    );
  }

  function openDevelopmentTask(task) {
    if (!task?.projectId || !canAccessPage(accessRole, "new-products")) {
      return;
    }

    openPage("new-products");
    window.setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("penn:open-development-task", {
            detail: task,
          })
        ),
      0
    );
  }

  function openAssignedIssue(issue) {
    if (!issue?.issueId) {
      return;
    }

    openPage("issues");
    window.setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("penn:open-issue", {
            detail: issue,
          })
        ),
      0
    );
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`app-sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">P</span>
          <span className="brand-copy">
            <strong>PENN</strong>
            <small>Engenharia & Negócios</small>
          </span>
          <button
            aria-label="Fechar menu"
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Navegação principal">
          {canAccessPage(accessRole, "profile") && (
            <button
              className={`nav-item personal-tasks-nav ${
                activePage === "profile" ? "active" : ""
              }`}
              aria-current={activePage === "profile" ? "page" : undefined}
              onClick={() => openPage("profile")}
              title={collapsed ? "Minhas tarefas" : undefined}
              type="button"
            >
              <Icon name="tasks" />
              <span>Minhas tarefas</span>
              {profileAlertCount > 0 && <small>{profileAlertCount}</small>}
            </button>
          )}

          <span className="nav-section-label">Workspace</span>
          {visibleNavigation.map((item) => (
            <button
              className={`nav-item ${item.id === "intelligence" ? "inactive-section-start" : ""} ${activePage === item.id ? "active" : ""}`}
              aria-current={activePage === item.id ? "page" : undefined}
              disabled={item.disabled}
              key={item.label}
              onClick={() => openPage(item.id)}
              title={
                collapsed || item.disabled
                  ? `${item.label}${item.disabled ? " - Em breve" : ""}`
                  : undefined
              }
              type="button"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.disabled && <small>Em breve</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item improvement-nav-item"
            onClick={() => setImprovementOpen(true)}
            title={collapsed ? "Melhorias" : undefined}
            type="button"
          >
            <Icon name="improve" />
            <span>Melhorias</span>
          </button>
          <small className="app-version">PENN v{packageMetadata.version}</small>
          {canAccessPage(accessRole, "profile") ? (
            <button
              className="user-card"
              onClick={() => openPage("profile")}
              type="button"
            >
              <span className="avatar">{getInitials(profileName).toUpperCase()}</span>
              <span>
                <strong>{profileName}</strong>
                <small>{userEmail || "Meu perfil e pendencias"}</small>
              </span>
              <span className="online-dot" />
            </button>
          ) : (
            <div className="user-card user-card-static">
              <span className="avatar">{getInitials(profileName).toUpperCase()}</span>
              <span>
                <strong>{profileName}</strong>
                <small>{userEmail || "Acesso de consulta"}</small>
              </span>
              <span className="online-dot" />
            </div>
          )}
        </div>
      </aside>

      {menuOpen && (
        <button
          aria-label="Fechar menu"
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <section className="app-stage">
        <header className="topbar">
          <button
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="menu-trigger desktop"
            onClick={() => setCollapsed(!collapsed)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <button
            aria-label="Abrir menu"
            className="menu-trigger mobile"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>Portal PENN</span>
            <b>/</b>
            <strong>{pageTitles[activePage] ?? pageTitles.overview}</strong>
          </div>
          <div className="topbar-actions">
            <span className="environment">
              <i /> Ambiente interno
            </span>
            {onlineUsers.length > 0 && (
              <div className="presence-stack" aria-label="Pessoas conectadas">
                {onlineUsers.slice(0, 6).map((user) => (
                  <button
                    aria-label={`Abrir perfil de ${user.fullName || user.email}`}
                    className="presence-avatar"
                    data-name={user.fullName || user.email}
                    key={user.id}
                    onClick={() => setSelectedOnlineUser(user)}
                    title={user.fullName || user.email}
                    type="button"
                  >
                    {getInitials(user.fullName || user.email).toUpperCase()}
                  </button>
                ))}
                {onlineUsers.length > 6 && (
                  <span
                    className="presence-avatar more"
                    data-name={`${onlineUsers.length - 6} pessoas a mais`}
                    title={`${onlineUsers.length - 6} pessoas a mais`}
                  >
                    +{onlineUsers.length - 6}
                  </span>
                )}
              </div>
            )}
            <button className="logout-button" onClick={signOut} type="button">
              Sair
            </button>
          </div>
        </header>

        <div className="main-content">
          <section className="app-page" hidden={activePage !== "overview"}>
            <OverviewDashboard
              onOpenIssues={() => openPage("issues")}
              onOpenProducts={() => openPage("products")}
            />
          </section>
          <section className="app-page" hidden={activePage !== "products"}>
            {productWorkspace}
          </section>
          {canAccessPage(accessRole, "new-products") && (
            <section className="app-page" hidden={activePage !== "new-products"}>
              <NewProductsDashboard
                canCreateDemand={demandCreationAllowed}
                readOnly={readOnly}
              />
            </section>
          )}
          <section className="app-page" hidden={activePage !== "intelligence"}>
            <StrategicIntelligenceDashboard onOpenProduct={openProduct} />
          </section>
          <section className="app-page" hidden={activePage !== "issues"}>
            <IssuesDashboard
              canCreateDemand={demandCreationAllowed}
              onOpenProduct={openProduct}
              readOnly={readOnly}
            />
          </section>
          {canAccessPage(accessRole, "manager") && (
            <section className="app-page" hidden={activePage !== "manager"}>
              <ManagerActivityDashboard
                onOpenDevelopmentTask={openDevelopmentTask}
                onOpenIssues={() => openPage("issues")}
              />
            </section>
          )}
          {canAccessPage(accessRole, "access") && (
            <section className="app-page" hidden={activePage !== "access"}>
              <AccessManagementDashboard />
            </section>
          )}
          {canAccessPage(accessRole, "profile") && (
            <section className="app-page" hidden={activePage !== "profile"}>
              <UserProfileDashboard
                canCreateDemand={!readOnly}
                onOpenDevelopmentTask={openDevelopmentTask}
                onOpenIssue={openAssignedIssue}
                readOnly={readOnly}
              />
            </section>
          )}
        </div>
      </section>
      <ImprovementSuggestionModal
        appVersion={packageMetadata.version}
        onClose={() => setImprovementOpen(false)}
        open={improvementOpen}
        pageContext={pageTitles[activePage] ?? pageTitles.overview}
      />
      <ConnectedUserOverlay
        onClose={() => setSelectedOnlineUser(null)}
        onOpenIssue={openAssignedIssue}
        user={selectedOnlineUser}
      />
    </div>
  );
}
