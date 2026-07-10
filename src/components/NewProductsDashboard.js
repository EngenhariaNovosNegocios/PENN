"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function LaunchIcon({ name }) {
  const paths = {
    spark: <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

export default function NewProductsDashboard({ onOpenProducts }) {
  const [raw, setRaw] = useState({ products: [], issues: [], attachments: [], structures: [] });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLaunches() {
      const [products, issues, attachments, structures] = await Promise.all([
        supabase.from("products").select("id, code, name, category, owner, status, ncm, characteristics, created_at").order("created_at", { ascending: false }),
        supabase.from("product_issues").select("id, product_id").is("resolved_at", null),
        supabase.from("product_attachments").select("id, product_id, kind"),
        supabase.from("product_structure_items").select("id, product_id"),
      ]);
      setRaw({ products: products.data ?? [], issues: issues.data ?? [], attachments: attachments.data ?? [], structures: structures.data ?? [] });
      setLoading(false);
    }
    loadLaunches();
  }, []);

  const launches = useMemo(() => raw.products.map((product) => {
    const hasBase = Boolean(product.ncm && product.owner && product.characteristics);
    const hasStructure = raw.structures.some((item) => item.product_id === product.id);
    const hasDocument = raw.attachments.some((item) => item.product_id === product.id && item.kind === "document");
    const hasPhoto = raw.attachments.some((item) => item.product_id === product.id && item.kind === "photo");
    const issues = raw.issues.filter((item) => item.product_id === product.id).length;
    const score = [hasBase, hasStructure, hasDocument, hasPhoto].filter(Boolean).length * 25;
    const stage = score === 100 && issues === 0 ? "ready" : issues > 0 ? "attention" : score >= 50 ? "validation" : "preparation";
    return { ...product, hasBase, hasStructure, hasDocument, hasPhoto, issues, score, stage };
  }), [raw]);

  const visible = launches.filter((item) => filter === "all" || item.stage === filter);
  const ready = launches.filter((item) => item.stage === "ready").length;
  const attention = launches.filter((item) => item.stage === "attention").length;
  const average = launches.length ? Math.round(launches.reduce((sum, item) => sum + item.score, 0) / launches.length) : 0;

  const stageMeta = {
    preparation: ["Em preparação", "gray"], validation: ["Em validação", "blue"], attention: ["Com pendências", "red"], ready: ["Pronto para lançar", "green"],
  };

  return (
    <main className="launch-page">
      <section className="launch-hero">
        <div className="launch-hero-copy"><span><LaunchIcon name="spark" /> Central de lançamentos</span><h1>Novos produtos</h1><p>Acompanhe a evolução de cada produto até que cadastro, estrutura, documentos e imagens estejam prontos para o lançamento.</p><button onClick={onOpenProducts}>Gerenciar produtos <LaunchIcon name="arrow" /></button></div>
        <div className="launch-radar"><div className="radar-ring r1"/><div className="radar-ring r2"/><div className="radar-ring r3"/><span className="radar-core"><strong>{ready}</strong><small>prontos</small></span><i className="radar-dot d1"/><i className="radar-dot d2"/><i className="radar-dot d3"/></div>
      </section>

      <section className="launch-summary">
        <article><span>Portfólio em evolução</span><strong>{loading ? "—" : launches.length}</strong><small>produtos acompanhados</small></article>
        <article><span>Prontidão média</span><strong>{loading ? "—" : `${average}%`}</strong><div className="mini-progress"><i style={{ width: `${average}%` }}/></div></article>
        <article className="success"><span>Prontos para lançar</span><strong>{loading ? "—" : ready}</strong><small>sem pendências</small></article>
        <article className="warning"><span>Precisam de atenção</span><strong>{loading ? "—" : attention}</strong><small>com problemas abertos</small></article>
      </section>

      <section className="launch-workspace">
        <header className="launch-toolbar"><div><span className="panel-kicker">Pipeline de prontidão</span><h2>Jornada dos produtos</h2></div><div className="launch-filters">{[["all","Todos"],["preparation","Preparação"],["validation","Validação"],["attention","Pendências"],["ready","Prontos"]].map(([id,label]) => <button className={filter === id ? "active" : ""} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div></header>

        <div className="launch-list">
          {visible.map((product) => (
            <article className="launch-card" key={product.id}>
              <div className="launch-card-top"><span className="launch-monogram">{product.code?.slice(-2) || "NP"}</span><div><strong>{product.name}</strong><small>{product.code} · {product.category || "Sem categoria"}</small></div><span className={`launch-stage ${stageMeta[product.stage][1]}`}>{stageMeta[product.stage][0]}</span></div>
              <div className="launch-progress"><div><span>Prontidão</span><strong>{product.score}%</strong></div><div><i style={{ width: `${product.score}%` }}/></div></div>
              <div className="launch-checklist">
                {[["Cadastro",product.hasBase],["Estrutura",product.hasStructure],["Documentos",product.hasDocument],["Fotos",product.hasPhoto]].map(([label,done]) => <span className={done ? "done" : ""} key={label}><i>{done ? <LaunchIcon name="check" /> : <LaunchIcon name="clock" />}</i>{label}</span>)}
              </div>
              <footer><span>{product.owner || "Responsável não definido"}</span>{product.issues > 0 ? <strong className="launch-issues">{product.issues} {product.issues === 1 ? "problema aberto" : "problemas abertos"}</strong> : <strong className="launch-clear">Sem impedimentos</strong>}</footer>
            </article>
          ))}
          {!loading && visible.length === 0 && <div className="launch-empty"><LaunchIcon name="spark"/><strong>Nenhum produto nesta etapa</strong><span>Altere o filtro ou cadastre um novo produto.</span></div>}
        </div>
      </section>
    </main>
  );
}
