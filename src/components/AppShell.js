"use client";

import { useState } from "react";
import OverviewDashboard from "@/components/OverviewDashboard";
import NewProductsDashboard from "@/components/NewProductsDashboard";
import IssuesDashboard from "@/components/IssuesDashboard";
import StrategicIntelligenceDashboard from "@/components/StrategicIntelligenceDashboard";

const Icon = ({ name }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    box: <><path d="m21 8-9 5-9-5"/><path d="M3 8l9-5 9 5v8l-9 5-9-5Z"/><path d="M12 13v8"/></>,
    spark: <><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z"/><path d="M19 16v6M16 19h6"/></>,
    brain: <><path d="M9.5 4.5A3 3 0 0 0 4 6a3 3 0 0 0 .7 1.9A4 4 0 0 0 5 15.8 3.5 3.5 0 0 0 11 18V6.5a2 2 0 0 0-1.5-2Z"/><path d="M14.5 4.5A3 3 0 0 1 20 6a3 3 0 0 1-.7 1.9 4 4 0 0 1-.3 7.9A3.5 3.5 0 0 1 13 18V6.5a2 2 0 0 1 1.5-2Z"/><path d="M8 10h3M13 13h3M8 16h3"/></>,
    alert: <><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/></>,
    chart: <><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.7 1.4c-.8 1.1-2.8 1.5-2.8 3.1"/><path d="M12 18h.01"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg aria-hidden="true" className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
};

const navigation = [
  { id: "overview", label: "Visão geral", icon: "grid" },
  { id: "products", label: "Produtos", icon: "box" },
  { id: "new-products", label: "Novos produtos", icon: "spark" },
  { id: "intelligence", label: "Inteligência NPI", icon: "brain" },
  { id: "issues", label: "Pendências", icon: "alert" },
  { label: "Indicadores", icon: "chart", disabled: true },
  { label: "Relatórios", icon: "file", disabled: true },
];

export default function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("overview");
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`app-sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="brand"><span className="brand-mark">P</span><span className="brand-copy"><strong>PENN</strong><small>Engenharia & Negócios</small></span><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><Icon name="close" /></button></div>
        <nav className="primary-nav" aria-label="Navegação principal"><span className="nav-section-label">Workspace</span>{navigation.map((item) => <button className={`nav-item ${activePage === item.id ? "active" : ""}`} disabled={item.disabled} key={item.label} onClick={() => { if (item.id) setActivePage(item.id); setMenuOpen(false); }} title={collapsed ? item.label : undefined}><Icon name={item.icon}/><span>{item.label}</span>{item.disabled && <small>Em breve</small>}</button>)}</nav>
        <div className="sidebar-footer"><button className="nav-item" disabled><Icon name="settings"/><span>Configurações</span></button><button className="nav-item" disabled><Icon name="help"/><span>Ajuda</span></button><div className="user-card"><span className="avatar">EN</span><span><strong>Equipe PENN</strong><small>Engenharia</small></span><span className="online-dot"/></div></div>
      </aside>
      {menuOpen && <button className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"/>}
      <section className="app-stage">
        <header className="topbar"><button className="menu-trigger desktop" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}><Icon name="menu"/></button><button className="menu-trigger mobile" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu"/></button><div className="breadcrumb"><span>Portal PENN</span><b>/</b><strong>{{ overview: "Visão geral", products: "Produtos", "new-products": "Novos produtos", intelligence: "Inteligência NPI", issues: "Pendências", indicators: "Indicadores", reports: "Relatórios" }[activePage]}</strong></div><div className="topbar-actions"><span className="environment"><i/> Ambiente interno</span><button className="notification" aria-label="Notificações">●</button></div></header>
        <div className="main-content">
          <section className="app-page" hidden={activePage !== "overview"}><OverviewDashboard onOpenProducts={() => setActivePage("products")} onOpenIssues={() => setActivePage("issues")} /></section>
          <section className="app-page" hidden={activePage !== "products"}>{children}</section>
          <section className="app-page" hidden={activePage !== "new-products"}><NewProductsDashboard onOpenProducts={() => setActivePage("products")} /></section>
          <section className="app-page" hidden={activePage !== "intelligence"}><StrategicIntelligenceDashboard onOpenProduct={(productId) => { setActivePage("products"); window.setTimeout(() => window.dispatchEvent(new CustomEvent("penn:open-product", { detail: { productId } })), 0); }} /></section>
          <section className="app-page" hidden={activePage !== "issues"}><IssuesDashboard onOpenProduct={(productId) => { setActivePage("products"); window.setTimeout(() => window.dispatchEvent(new CustomEvent("penn:open-product", { detail: { productId } })), 0); }} /></section>
        </div>
      </section>
    </div>
  );
}
