"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import IssueAttachmentsModal, { uploadIssueFile } from "@/components/IssueAttachmentsModal";
import IssueResolutionModal from "@/components/IssueResolutionModal";
import { supabase } from "@/lib/supabaseClient";

const emptyForm = { productCode: "", description: "", priority: "media", dueDate: "", assigneeEmail: "" };
const priorityMeta = {
  baixa: { label: "Baixa", className: "low" },
  media: { label: "Média", className: "medium" },
  alta: { label: "Alta", className: "high" },
  critica: { label: "Crítica", className: "critical" },
};

function IssueIcon({ name }) {
  const paths = {
    alert: <><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    box: <><path d="m21 8-9 5-9-5"/><path d="M3 8l9-5 9 5v8l-9 5-9-5Z"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    attachment: <path d="m20.5 11.5-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9"/>,
  };
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

export default function IssuesDashboard({
  canCreateDemand = true,
  onOpenProduct,
  readOnly = false,
}) {
  const [products, setProducts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [resolvedIssues, setResolvedIssues] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [issueFile, setIssueFile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingError, setLoadingError] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("todos");
  const [assigneeFilter, setAssigneeFilter] = useState("todos");
  const [boardView, setBoardView] = useState("active");
  const [highlightedIssueId, setHighlightedIssueId] = useState(null);
  const [issueNavigationRequest, setIssueNavigationRequest] = useState(0);
  const [resolutionIssue, setResolutionIssue] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [attachmentIssue, setAttachmentIssue] = useState(null);

  async function loadData() {
    const [productsResult, issuesResult, resolvedResult, profilesResult] = await Promise.all([
      supabase.from("products").select("id, code, name, status").order("code"),
      supabase.from("product_issues").select("id, product_id, product_code, description, priority, due_date, assignee_name, assignee_email, created_by, created_at").is("resolved_at", null).order("created_at", { ascending: false }),
      supabase.from("product_issues").select("id, product_id, product_code, description, priority, due_date, assignee_name, assignee_email, created_by, created_at, resolved_at, resolution_note").not("resolved_at", "is", null).order("resolved_at", { ascending: false }),
      supabase.from("user_profiles").select("id,full_name,email").order("full_name"),
    ]);
    if (productsResult.error || issuesResult.error) {
      setLoadingError(
        `Não foi possível carregar as pendências: ${
          issuesResult.error?.message ?? productsResult.error?.message
        }`
      );
      return;
    }
    setLoadingError("");
    setProducts(productsResult.data ?? []);
    setIssues(issuesResult.data ?? []);
    setResolvedIssues(resolvedResult.data ?? []);
    setProfiles(profilesResult.data ?? []);
  }

  useEffect(() => {
    const refresh = () => loadData();
    loadData();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id ?? null));
    window.addEventListener("penn:issues-changed", refresh);
    return () => window.removeEventListener("penn:issues-changed", refresh);
  }, []);

  useEffect(() => {
    function openIssue(event) {
      const issueId = Number(event.detail?.issueId);

      if (!issueId) {
        return;
      }

      setBoardView(event.detail?.view === "history" ? "history" : "active");
      setPriorityFilter("todos");
      setAssigneeFilter("todos");
      setHighlightedIssueId(issueId);
      setIssueNavigationRequest((current) => current + 1);
    }

    window.addEventListener("penn:open-issue", openIssue);
    return () => window.removeEventListener("penn:open-issue", openIssue);
  }, []);

  useEffect(() => {
    if (!highlightedIssueId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById(
        `${boardView === "history" ? "resolved-issue" : "product-issue"}-${highlightedIssueId}`
      );

      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    boardView,
    highlightedIssueId,
    issueNavigationRequest,
    issues.length,
    resolvedIssues.length,
    assigneeFilter,
    priorityFilter,
  ]);

  useEffect(() => {
    if (message !== "Problema registrado com sucesso.") {
      return undefined;
    }

    const timer = window.setTimeout(() => setMessage(""), 10000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function resolveIssue(note) {
    if (readOnly) {
      setMessage("Seu perfil permite consultar e registrar demandas, mas não resolvê-las.");
      return;
    }
    const issue = resolutionIssue;
    if (!issue || !note?.trim() || note.trim().length < 10) return;
    setResolving(true);
    const resolvedAt = new Date().toISOString();
    const { data, error } = await supabase.from("product_issues").update({ resolution_note: note.trim(), resolved_at: resolvedAt }).eq("id", issue.id).select("id, product_id, product_code, description, priority, due_date, assignee_name, assignee_email, created_by, created_at, resolved_at, resolution_note").single();
    if (error) { setMessage(`Não foi possível resolver: ${error.message}`); setResolving(false); return; }
    setIssues((current) => current.filter((item) => item.id !== issue.id));
    setResolvedIssues((current) => [data, ...current]);
    window.dispatchEvent(new CustomEvent("penn:issues-changed"));
    setResolutionIssue(null);
    setResolving(false);
    setMessage("Pendência resolvida e movida para o histórico.");
  }

  async function registerIssue(event) {
    event.preventDefault();
    if (!canCreateDemand) {
      setMessage("Seu perfil não permite registrar novas demandas.");
      return;
    }
    const product = products.find((item) => item.code.toLowerCase() === form.productCode.trim().toLowerCase());
    if (!product) { setMessage("Informe um código de produto válido."); return; }
    setSubmitting(true); setMessage("");
    const assignee = profiles.find(
      (profile) => profile.email?.toLowerCase() === form.assigneeEmail.toLowerCase()
    );
    if (!assignee) { setMessage("Selecione um responsável válido."); setSubmitting(false); return; }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) { setMessage("Sua sessão expirou. Entre novamente para registrar a pendência."); setSubmitting(false); return; }
    const { data, error } = await supabase.from("product_issues").insert({ product_id: product.id, product_code: product.code, description: form.description.trim(), priority: form.priority, due_date: form.dueDate, assignee_name: assignee.full_name, assignee_email: assignee.email.trim().toLowerCase(), created_by: userData.user.id }).select("*").single();
    if (error) { setMessage(`Não foi possível registrar: ${error.message}`); setSubmitting(false); return; }
    setIssues((current) => [data, ...current]);
    let attachmentError = "";
    if (issueFile) {
      try {
        await uploadIssueFile(data.id, issueFile);
      } catch (fileError) {
        attachmentError = fileError.message;
      }
    }
    setForm(emptyForm); setIssueFile(null); setSubmitting(false); setRegisterOpen(false);
    setMessage(attachmentError ? `Pendência registrada, mas o anexo falhou: ${attachmentError}` : "Problema registrado com sucesso.");
    window.dispatchEvent(new CustomEvent("penn:issues-changed"));
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesPriority = priorityFilter === "todos" || issue.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "todos"
      || issue.assignee_email?.trim().toLowerCase() === assigneeFilter;

    return matchesPriority && matchesAssignee;
  });
  const groups = useMemo(() => products.map((product) => ({ product, issues: filteredIssues.filter((issue) => issue.product_id === product.id) })).filter((group) => group.issues.length > 0), [products, filteredIssues]);
  const overdue = issues.filter((issue) => issue.due_date && new Date(`${issue.due_date}T23:59:59`) < new Date()).length;
  const critical = issues.filter((issue) => issue.priority === "critica").length;

  return (
    <main className="issues-page">
      <section className="issues-hero"><div><span><IssueIcon name="alert"/> Central de ocorrências</span><h1>Pendências de produtos</h1><p>Registre, priorize e acompanhe impedimentos de todo o portfólio em um único lugar.</p></div><div className="issues-hero-stats"><div><strong>{issues.length}</strong><span>abertas</span></div><div><strong>{overdue}</strong><span>atrasadas</span></div><div><strong>{critical}</strong><span>críticas</span></div></div></section>

      <section className="issues-create-bar">
        <div><span className="panel-kicker">Registro rápido</span><strong>Encontrou um impedimento em um produto?</strong></div>
        {canCreateDemand && <button onClick={() => setRegisterOpen(true)} type="button"><IssueIcon name="plus"/>Registrar nova pendência</button>}
      </section>
      {message && <p className={message.includes("sucesso") || message.includes("histórico") ? "issue-form-message success" : "issue-form-message"}>{message}</p>}

      <FormModal
        description="A ocorrência ficará vinculada ao produto e aparecerá automaticamente no perfil da pessoa responsável."
        eyebrow="Nova ocorrência"
        onClose={() => { setRegisterOpen(false); setIssueFile(null); }}
        open={registerOpen}
        title="Registrar pendência"
      >
        <form className="modal-form issue-modal-form" onSubmit={registerIssue}>
          <label>Código do produto<input autoFocus list="product-codes" required value={form.productCode} onChange={(event) => setForm({ ...form, productCode: event.target.value })} placeholder="Ex.: PENN-001"/><datalist id="product-codes">{products.map((product) => <option key={product.id} value={product.code}>{product.name}</option>)}</datalist></label>
          <label>Responsável<select required value={form.assigneeEmail} onChange={event=>setForm({...form,assigneeEmail:event.target.value})}><option value="">Selecione pelo nome</option>{profiles.map(profile=><option key={profile.id} value={profile.email}>{profile.full_name}</option>)}</select></label>
          <label className="wide">Descrição da pendência<textarea minLength="10" required rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva claramente a pendência encontrada (mínimo de 10 caracteres)..."/></label>
          <label>Prazo para resolução<input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })}/></label>
          <label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(priorityMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>
          <label className="wide issue-file-field">Anexo inicial (opcional)<input accept=".csv,.doc,.docx,.jpeg,.jpg,.pdf,.png,.txt,.webp,.xls,.xlsx,.zip,image/*" onChange={(event) => setIssueFile(event.target.files?.[0] ?? null)} type="file"/><small>Imagens, PDF, Office, CSV, TXT ou ZIP · até 15 MB</small></label>
          <footer className="modal-form-actions"><button onClick={() => { setRegisterOpen(false); setIssueFile(null); }} type="button">Cancelar</button><button disabled={submitting} type="submit"><IssueIcon name="plus"/>{submitting ? "Registrando..." : "Registrar pendência"}</button></footer>
        </form>
      </FormModal>

      <IssueResolutionModal
        issue={resolutionIssue}
        loading={resolving}
        onClose={() => setResolutionIssue(null)}
        onSubmit={resolveIssue}
      />

      <IssueAttachmentsModal
        canDelete={!readOnly}
        canUpload={!readOnly || attachmentIssue?.created_by === currentUserId}
        issue={attachmentIssue}
        onClose={() => setAttachmentIssue(null)}
      />

      <section className="issues-board">
        {loadingError && <div className="issues-load-error"><span>{loadingError}</span><button onClick={loadData}>Tentar novamente</button></div>}
        <nav className="issues-section-tabs"><button className={boardView==="active"?"active":""} onClick={()=>setBoardView("active")}>Pendências abertas <b>{issues.length}</b></button><button className={boardView==="history"?"active":""} onClick={()=>setBoardView("history")}>Histórico resolvido <b>{resolvedIssues.length}</b></button></nav>
        {boardView==="active"&&<><header><div><span className="panel-kicker">Visão por produto</span><h2>Pendências abertas</h2></div><div className="issues-board-actions"><label className="issues-assignee-filter"><span>Responsável</span><select aria-label="Filtrar pendências por responsável" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}><option value="todos">Todas as pessoas</option>{profiles.filter((profile) => profile.email).map((profile) => <option key={profile.id} value={profile.email.trim().toLowerCase()}>{profile.full_name || profile.email}</option>)}</select></label><div className="priority-filters"><button className={priorityFilter === "todos" ? "active" : ""} onClick={() => setPriorityFilter("todos")}>Todos</button>{Object.entries(priorityMeta).map(([value, meta]) => <button className={priorityFilter === value ? "active" : ""} key={value} onClick={() => setPriorityFilter(value)}>{meta.label}</button>)}</div></div></header>
        <div className="issue-groups">
          {groups.map(({ product, issues: productIssues }) => (
            <article className="issue-product-group" key={product.id}>
              <header className="clickable" onClick={() => onOpenProduct(product.id)}>
                <span className="issue-product-symbol"><IssueIcon name="box"/></span>
                <div><strong>{product.code}</strong><h3>{product.name}</h3></div>
                <span>{productIssues.length} {productIssues.length === 1 ? "pendência" : "pendências"}</span>
              </header>
              <div>
                {productIssues.map((issue, index) => {
                  const isOverdue = issue.due_date && new Date(`${issue.due_date}T23:59:59`) < new Date();
                  const isTargeted = Number(issue.id) === highlightedIssueId;
                  return (
                    <div className={`global-issue-row ${isTargeted ? "targeted" : ""}`} id={`product-issue-${issue.id}`} key={issue.id} tabIndex={isTargeted ? -1 : undefined}>
                      <span className="issue-order">{String(index + 1).padStart(2,"0")}</span>
                      <div>
                        <strong>{issue.description}</strong>
                        <span><i className={`priority-dot ${priorityMeta[issue.priority]?.className || "medium"}`}/>{priorityMeta[issue.priority]?.label || "Média"}{issue.assignee_name ? ` · ${issue.assignee_name}` : ""}</span>
                      </div>
                      <span className={isOverdue ? "issue-deadline overdue" : "issue-deadline"}><IssueIcon name="calendar"/>{issue.due_date ? new Date(`${issue.due_date}T12:00:00`).toLocaleDateString("pt-BR") : "Sem prazo"}</span>
                      <button className="issue-files-button" onClick={() => setAttachmentIssue(issue)} type="button"><IssueIcon name="attachment"/>Anexos</button>
                      {!readOnly && <button className="resolve-issue-button" onClick={() => setResolutionIssue(issue)}>Resolver</button>}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
          {groups.length === 0 && <div className="issues-empty"><IssueIcon name="alert"/><strong>Nenhuma pendência encontrada</strong><span>Não há ocorrências abertas com este filtro.</span></div>}
        </div></>}
        {boardView === "history" && (
          <section className="resolved-issues-history">
            <header><div><span className="panel-kicker">Memória do produto</span><h2>Pendências resolvidas</h2></div><span>{resolvedIssues.length} registros</span></header>
            <div>
              {resolvedIssues.map((issue) => {
                const product = products.find((item) => item.id === issue.product_id);
                const isTargeted = Number(issue.id) === highlightedIssueId;
                return (
                  <article className={`${isTargeted ? "targeted " : ""}clickable has-actions`} id={`resolved-issue-${issue.id}`} key={issue.id}>
                    <button aria-label={`Abrir produto ${product?.code || issue.product_code}`} className="resolved-issue-link" onClick={() => onOpenProduct?.(issue.product_id)} title="Abrir o produto e consultar seu histórico" type="button">
                      <span className="resolved-check">✓</span>
                      <span className="resolved-issue-copy"><strong>{issue.description}</strong><small>{product?.code || issue.product_code} · {product?.name || "Produto"}</small><p>{issue.resolution_note}</p></span>
                      <time>{new Date(issue.resolved_at).toLocaleString("pt-BR")}</time>
                      <IssueIcon name="arrow"/>
                    </button>
                    <button className="issue-files-button resolved" onClick={() => setAttachmentIssue(issue)} type="button"><IssueIcon name="attachment"/>Anexos</button>
                  </article>
                );
              })}
              {resolvedIssues.length === 0 && <div className="issues-empty"><strong>Nenhuma pendência resolvida</strong><span>As resoluções aparecerão aqui automaticamente.</span></div>}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
