"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const statusMeta = {
  ativo: { label: "Ativos", color: "#2c9a66" },
  manutencao: { label: "Manutenção", color: "#db8c27" },
  avaliacao: { label: "Em avaliação", color: "#3977cc" },
  pausado: { label: "Pausados", color: "#7b8794" },
};

function MetricIcon({ type }) {
  const paths = {
    products: <><path d="m21 8-9 5-9-5"/><path d="M3 8l9-5 9 5v8l-9 5-9-5Z"/><path d="M12 13v8"/></>,
    issues: <><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/></>,
    docs: <><path d="M6 2h9l4 4v16H6Z"/><path d="M14 2v5h5M9 12h7M9 16h7"/></>,
    structure: <><path d="M12 3v6M6 21v-5h12v5M6 16v-3h12v3"/><circle cx="12" cy="10" r="2"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
  };
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[type]}</svg>;
}

export default function OverviewDashboard({ onOpenProducts, onOpenIssues }) {
  const [data, setData] = useState({ products: [], issues: [], attachments: [], structure: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      const [productsResult, issuesResult, attachmentsResult, structureResult] = await Promise.all([
        supabase.from("products").select("id, name, code, status, ncm, owner, characteristics, created_at").order("created_at", { ascending: false }),
        supabase.from("product_issues").select("id, product_id, product_code, description, created_at").is("resolved_at", null).order("created_at", { ascending: false }),
        supabase.from("product_attachments").select("id, product_id, kind, file_type"),
        supabase.from("product_structure_items").select("id, product_id"),
      ]);
      setData({
        products: productsResult.data ?? [],
        issues: issuesResult.data ?? [],
        attachments: attachmentsResult.data ?? [],
        structure: structureResult.data ?? [],
      });
      setLoading(false);
    }
    loadOverview();
  }, []);

  const metrics = useMemo(() => {
    const statuses = Object.keys(statusMeta).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    data.products.forEach((product) => { statuses[product.status] = (statuses[product.status] ?? 0) + 1; });
    const documents = data.attachments.filter((item) => item.kind === "document").length;
    const photos = data.attachments.filter((item) => item.kind === "photo").length;
    const complete = data.products.filter((product) => product.ncm && product.owner && product.characteristics).length;
    return {
      statuses, documents, photos,
      completeness: data.products.length ? Math.round((complete / data.products.length) * 100) : 0,
      affected: new Set(data.issues.map((issue) => issue.product_id)).size,
    };
  }, [data]);

  const total = data.products.length || 1;
  const healthyRate = Math.round(((metrics.statuses.ativo ?? 0) / total) * 100);

  return (
    <main className="overview-page">
      <section className="overview-hero">
        <div><span className="overview-kicker">Painel operacional</span><h1>Visão geral</h1><p>Uma leitura rápida da saúde do portfólio, qualidade dos cadastros e pendências da engenharia.</p></div>
        <div className="health-orbit" style={{ "--health": `${healthyRate * 3.6}deg` }}><div><strong>{healthyRate}%</strong><span>portfólio ativo</span></div></div>
      </section>

      <section className="overview-metrics" aria-label="Métricas principais">
        <article className="metric-card blue"><span className="metric-icon"><MetricIcon type="products" /></span><div><small>Produtos cadastrados</small><strong>{loading ? "—" : data.products.length}</strong><span>{metrics.statuses.ativo ?? 0} em operação</span></div></article>
        <article className="metric-card red actionable"><span className="metric-icon"><MetricIcon type="issues" /></span><div><small>Problemas abertos</small><strong>{loading ? "—" : data.issues.length}</strong><span>{metrics.affected} produtos impactados</span></div><button onClick={onOpenIssues} aria-label="Abrir todos os problemas"><MetricIcon type="arrow" /></button></article>
        <article className="metric-card violet"><span className="metric-icon"><MetricIcon type="docs" /></span><div><small>Base documental</small><strong>{loading ? "—" : metrics.documents}</strong><span>{metrics.photos} fotos armazenadas</span></div></article>
        <article className="metric-card green"><span className="metric-icon"><MetricIcon type="structure" /></span><div><small>Itens de estrutura</small><strong>{loading ? "—" : data.structure.length}</strong><span>componentes mapeados</span></div></article>
      </section>

      <section className="overview-grid">
        <article className="dashboard-panel portfolio-panel">
          <header><div><span className="panel-kicker">Distribuição</span><h2>Saúde do portfólio</h2></div><button onClick={onOpenProducts}>Ver produtos <MetricIcon type="arrow" /></button></header>
          <div className="status-visual">
            <div className="status-donut" style={{ background: `conic-gradient(#2c9a66 0 ${((metrics.statuses.ativo ?? 0)/total)*100}%, #db8c27 0 ${(((metrics.statuses.ativo ?? 0)+(metrics.statuses.manutencao ?? 0))/total)*100}%, #3977cc 0 ${(((metrics.statuses.ativo ?? 0)+(metrics.statuses.manutencao ?? 0)+(metrics.statuses.avaliacao ?? 0))/total)*100}%, #7b8794 0)` }}><div><strong>{data.products.length}</strong><span>produtos</span></div></div>
            <div className="status-legend">{Object.entries(statusMeta).map(([key, meta]) => <div key={key}><i style={{ background: meta.color }} /><span>{meta.label}</span><strong>{metrics.statuses[key] ?? 0}</strong><small>{Math.round(((metrics.statuses[key] ?? 0)/total)*100)}%</small></div>)}</div>
          </div>
        </article>

        <article className="dashboard-panel quality-panel">
          <header><div><span className="panel-kicker">Qualidade de dados</span><h2>Cobertura cadastral</h2></div></header>
          <div className="quality-score"><strong>{metrics.completeness}%</strong><span>dos produtos possuem NCM, responsável e características</span></div>
          <div className="progress-track"><span style={{ width: `${metrics.completeness}%` }} /></div>
          <div className="quality-breakdown"><div><span>Documentos</span><strong>{metrics.documents}</strong></div><div><span>Fotos</span><strong>{metrics.photos}</strong></div><div><span>Estruturas</span><strong>{new Set(data.structure.map((item) => item.product_id)).size}</strong></div></div>
        </article>

        <article className="dashboard-panel issues-panel">
          <header><div><span className="panel-kicker">Atenção necessária</span><h2>Problemas recentes</h2></div><span className="live-badge"><i /> Ao vivo</span></header>
          <div className="overview-issue-list">{data.issues.slice(0, 5).map((issue) => <div key={issue.id}><span className="issue-severity">!</span><span><strong>{issue.product_code}</strong><small>{issue.description}</small></span><time>{new Date(issue.created_at).toLocaleDateString("pt-BR")}</time></div>)}{!loading && data.issues.length === 0 && <div className="overview-empty">Nenhuma pendência aberta. Excelente trabalho!</div>}</div>
        </article>

        <article className="dashboard-panel recent-panel">
          <header><div><span className="panel-kicker">Últimos cadastros</span><h2>Produtos recentes</h2></div></header>
          <div className="recent-products">{data.products.slice(0, 5).map((product) => <div key={product.id}><span>{product.code?.slice(-2) || "#"}</span><div><strong>{product.code}</strong><small>{product.name}</small></div><i className={`status-dot ${product.status}`} /></div>)}</div>
        </article>
      </section>
    </main>
  );
}
