"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentStageKey,
  getStageState,
  WORKFLOW_STAGES as workflowStages,
} from "@/lib/developmentWorkflow";

const emptyProject = { productName: "", requester: "", owner: "", targetLaunchDate: "", targetPrice: "", expectedDemand: "", potentialClients: "", marketPotential: "", technicalSpecs: "", developmentReason: "" };
const emptyPackage = { name: "", supplier: "", currency: "BRL", dueDate: "" };
const emptyPackageItem = { partNumber: "", sapCode: "", description: "", quantity: "", unitType: "", unitPrice: "", overhead: "", currency:"", exchangeRate:"", ncm:"", applyIpi:false, applyPis:false, applyCofins:false, applyIcms:false, applyImportTax:false };

function productCodeLabel(product) {
  return product?.code || "Código a definir";
}

function FlowIcon({ name }) {
  const paths = { spark: <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z"/>, arrow: <path d="m9 18 6-6-6-6"/>, check: <path d="m5 12 4 4L19 6"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, chevron: <path d="m6 9 6 6 6-6"/>, lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>, back: <path d="m15 18-6-6 6-6"/> };
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

function LegacyQuotationWorkspace({project,packages,items,selectedPackageId,setSelectedPackageId,showForm,setShowForm,packageForm,setPackageForm,itemForm,setItemForm,createPackage,saveItem,updateStatus,editingItemId,startEditItem,cancelEditItem,deleteItem,deletePackage}) {
  const projectPackages=packages.filter((pkg)=>pkg.project_id===project.id);const selected=packages.find((pkg)=>pkg.id===selectedPackageId);const selectedItems=items.filter((item)=>item.package_id===selectedPackageId);const total=(pkgItems)=>pkgItems.reduce((sum,item)=>sum+Number(item.unit_price)*Number(item.quantity)*Number(item.mkp)*(1+Number(item.overhead_rate)/100),0);
  return <section className="quotation-workspace"><header><div><span className="panel-kicker">Composições complexas</span><h2>Pacotes de cotação</h2><p>Organize chicotes, kits e conjuntos sem misturar todos os componentes.</p></div><button onClick={()=>setShowForm(!showForm)}>+ Novo pacote</button></header>{showForm&&<form className="quotation-package-form" onSubmit={createPackage}><input required value={packageForm.name} onChange={(e)=>setPackageForm({...packageForm,name:e.target.value})} placeholder="Nome do conjunto"/><input value={packageForm.provisionalCode} onChange={(e)=>setPackageForm({...packageForm,provisionalCode:e.target.value})} placeholder="Código provisório"/><input value={packageForm.supplier} onChange={(e)=>setPackageForm({...packageForm,supplier:e.target.value})} placeholder="Fornecedor"/><select value={packageForm.currency} onChange={(e)=>setPackageForm({...packageForm,currency:e.target.value})}><option>BRL</option><option>USD</option></select><input type="date" value={packageForm.dueDate} onChange={(e)=>setPackageForm({...packageForm,dueDate:e.target.value})}/><button>Criar</button></form>}<div className="quotation-layout"><aside>{projectPackages.map((pkg)=>{const packageItems=items.filter((item)=>item.package_id===pkg.id);return <div className={`quotation-package-card ${selectedPackageId===pkg.id?"active":""}`} key={pkg.id}><button className="quotation-package-select" onClick={()=>{setSelectedPackageId(pkg.id);cancelEditItem()}}><span><strong>{pkg.name}</strong><small>{packageItems.length} componentes · {pkg.status}</small></span><b>{total(packageItems).toLocaleString(pkg.currency==="USD"?"en-US":"pt-BR",{style:"currency",currency:pkg.currency})}</b></button><button className="quotation-package-delete" aria-label={`Excluir pacote ${pkg.name}`} title="Excluir pacote" onClick={()=>deletePackage(pkg)}>×</button></div>})}</aside>{selected&&<div className="quotation-detail"><header><div><strong>{selected.name}</strong><small>{selected.supplier||"Fornecedor não definido"}</small></div><select value={selected.status} onChange={(e)=>updateStatus(selected,e.target.value)}><option value="draft">Em elaboração</option><option value="waiting_supplier">Aguardando fornecedor</option><option value="received">Recebida</option><option value="analysis">Em análise</option><option value="approved">Aprovada</option><option value="rejected">Reprovada</option></select></header><form className={`quotation-item-form ${editingItemId?"editing":""}`} onSubmit={saveItem}><input value={itemForm.code} onChange={(e)=>setItemForm({...itemForm,code:e.target.value})} placeholder="Código"/><input required value={itemForm.description} onChange={(e)=>setItemForm({...itemForm,description:e.target.value})} placeholder="Componente ou serviço"/><input aria-label="Quantidade" min=".01" step=".01" type="number" value={itemForm.quantity} onChange={(e)=>setItemForm({...itemForm,quantity:e.target.value})} placeholder="Qtd."/><select aria-label="Unidade" value={itemForm.unitType} onChange={(e)=>setItemForm({...itemForm,unitType:e.target.value})}>{["UN","PC","KIT","CX","KG","M","L","H"].map(u=><option key={u}>{u}</option>)}</select><input min="0" required step=".01" type="number" value={itemForm.unitPrice} onChange={(e)=>setItemForm({...itemForm,unitPrice:e.target.value})} placeholder="Valor unit."/><input min=".01" step=".01" type="number" value={itemForm.mkp} onChange={(e)=>setItemForm({...itemForm,mkp:e.target.value})} placeholder="MKP"/><input min="0" step=".01" type="number" value={itemForm.overhead} onChange={(e)=>setItemForm({...itemForm,overhead:e.target.value})} placeholder="Overhead %"/><div className="quotation-form-actions"><button>{editingItemId?"Salvar":"Adicionar"}</button>{editingItemId&&<button type="button" className="cancel" onClick={cancelEditItem}>Cancelar</button>}</div></form><div className="quotation-items">{selectedItems.map((item)=><div key={item.id}><span><strong>{item.description}</strong><small>{item.item_code||"Sem código"} · {item.quantity} {item.unit_type} · MKP {item.mkp} · Overhead {item.overhead_rate}%</small></span><b>{total([item]).toLocaleString(selected.currency==="USD"?"en-US":"pt-BR",{style:"currency",currency:selected.currency})}</b><div className="quotation-item-actions"><button onClick={()=>startEditItem(item)}>Editar</button><button className="delete" onClick={()=>deleteItem(item)}>Excluir</button></div></div>)}</div></div>}</div></section>;
}

function QuotationWorkspace({project,packages,items,selectedPackageId,setSelectedPackageId,showForm,setShowForm,packageForm,setPackageForm,itemForm,setItemForm,createPackage,saveItem,updateStatus,editingItemId,startEditItem,cancelEditItem,deleteItem,deletePackage,clonePackage,togglePackageTotal,readOnly=false}) {
  const [ncmTaxes,setNcmTaxes]=useState([]);
  const [itemFormOpen,setItemFormOpen]=useState(false);
  useEffect(()=>{supabase.from("ncm_taxes").select("*").order("ncm").then(({data})=>setNcmTaxes(data??[]));},[]);
  const projectPackages=packages.filter(pkg=>pkg.project_id===project.id);
  const selected=projectPackages.find(pkg=>pkg.id===selectedPackageId);
  const selectedItems=items.filter(item=>item.package_id===selectedPackageId);
  const amounts=(item)=>{const exw=Number(item.unit_price||0)*Number(item.quantity||0)*(item.currency==="USD"?Number(item.exchange_rate||0):1);const fob=exw*(1+Number(item.overhead_rate||0)/100);const tax=ncmTaxes.find(row=>row.ncm===item.ncm);const rate=(item.apply_ipi?Number(tax?.ipi_rate||0):0)+(item.apply_pis?Number(tax?.pis_rate||0):0)+(item.apply_cofins?Number(tax?.cofins_rate||0):0)+(item.apply_icms?Number(tax?.icms_rate||0):0)+(item.apply_import_tax?Number(tax?.import_tax_rate||0):0);return{exw,fob,net:fob*(1+rate/100)}};
  const total=(pkgItems)=>pkgItems.reduce((sum,item)=>sum+amounts(item).net,0);
  const selectedForTotal=projectPackages.filter(pkg=>pkg.include_in_total);
  const grandTotals=selectedForTotal.reduce((totals,pkg)=>{items.filter(item=>item.package_id===pkg.id).forEach(item=>{const value=amounts(item);totals.exw+=value.exw;totals.fob+=value.fob;totals.net+=value.net;});return totals;},{exw:0,fob:0,net:0});
  const format=(value,currency)=>Number(value).toLocaleString(currency==="USD"?"en-US":"pt-BR",{style:"currency",currency});
  return <section className={`quotation-workspace ${readOnly ? "is-read-only" : ""}`}>
    <header><div><span className="panel-kicker">Composições complexas</span><h2>Pacotes de cotação</h2><p>Organize conjuntos, compare propostas e escolha quais entram no total consolidado.</p></div><button onClick={()=>setShowForm(!showForm)}>+ Novo pacote</button></header>
    <FormModal description={`O pacote será adicionado ao projeto ${productCodeLabel(project.product)} e poderá receber componentes e impostos.`} eyebrow="Nova composição" onClose={()=>setShowForm(false)} open={showForm} title="Criar pacote de cotação">
      <form className="modal-form" onSubmit={createPackage}>
        <label className="wide">Nome do pacote<input autoFocus required value={packageForm.name} onChange={e=>setPackageForm({...packageForm,name:e.target.value})} placeholder="Ex.: Kit de instalação"/></label>
        <label>Fornecedor<input value={packageForm.supplier} onChange={e=>setPackageForm({...packageForm,supplier:e.target.value})} placeholder="Opcional"/></label>
        <label>Prazo da cotação<input type="date" value={packageForm.dueDate} onChange={e=>setPackageForm({...packageForm,dueDate:e.target.value})}/></label>
        <footer className="modal-form-actions"><button onClick={()=>setShowForm(false)} type="button">Cancelar</button><button type="submit">Criar pacote</button></footer>
      </form>
    </FormModal>
    <div className="quotation-total-bar"><div><span>Total selecionado</span><small>{selectedForTotal.length} de {projectPackages.length} pacotes incluídos</small></div><div>{selectedForTotal.length?<><span>EXW <strong>{format(grandTotals.exw,"BRL")}</strong></span><span>FOB <strong>{format(grandTotals.fob,"BRL")}</strong></span><span>NET <strong>{format(grandTotals.net,"BRL")}</strong></span></>:<strong>Selecione os pacotes que devem somar</strong>}</div></div>
    <div className="quotation-layout"><aside>{projectPackages.map(pkg=>{const packageItems=items.filter(item=>item.package_id===pkg.id);return <div className={`quotation-package-card ${selectedPackageId===pkg.id?"active":""}`} key={pkg.id}><button className="quotation-package-select" onClick={()=>{setSelectedPackageId(pkg.id);setItemFormOpen(false);cancelEditItem()}}><span><strong>{pkg.name}</strong><small>{packageItems.length} componentes · {pkg.status}</small></span><b>{format(total(packageItems),"BRL")}</b></button><label className="quotation-total-check"><input type="checkbox" checked={Boolean(pkg.include_in_total)} onChange={e=>togglePackageTotal(pkg,e.target.checked)}/> Somar</label><div className="quotation-package-actions"><button title="Clonar pacote" onClick={()=>clonePackage(pkg)}>Clonar</button><button className="delete" title="Excluir pacote" onClick={()=>deletePackage(pkg)}>Excluir</button></div></div>})}</aside>
      {selected?<div className="quotation-detail"><header><div><strong>{selected.name}</strong><small>{selected.supplier||"Fornecedor não definido"}</small></div><div className="quotation-detail-actions"><select value={selected.status} onChange={e=>updateStatus(selected,e.target.value)}><option value="draft">Em elaboração</option><option value="waiting_supplier">Aguardando fornecedor</option><option value="received">Recebida</option><option value="analysis">Em análise</option><option value="approved">Aprovada</option><option value="rejected">Reprovada</option></select><button onClick={()=>{cancelEditItem();setItemFormOpen(true)}} type="button">+ Adicionar componente</button></div></header>
        <FormModal description={`O componente será incluído no pacote ${selected.name}, com custos, moeda e impostos aplicáveis.`} eyebrow={editingItemId?"Editar composição":"Novo componente"} onClose={()=>{setItemFormOpen(false);cancelEditItem()}} open={itemFormOpen} size="large" title={editingItemId?"Editar componente":"Adicionar componente"}>
          <form className="modal-form quotation-item-modal-form" onSubmit={async event=>{const saved=await saveItem(event);if(saved)setItemFormOpen(false)}}>
            <label className="wide">Componente ou serviço<input autoFocus required value={itemForm.description} onChange={e=>setItemForm({...itemForm,description:e.target.value})}/></label>
            <label>Quantidade<input required min=".01" step=".01" type="number" value={itemForm.quantity} onChange={e=>setItemForm({...itemForm,quantity:e.target.value})}/></label>
            <label>Unidade<select required value={itemForm.unitType} onChange={e=>setItemForm({...itemForm,unitType:e.target.value})}><option value="" disabled>Selecione</option>{["UN","PC","KIT","CX","KG","M","L","H"].map(u=><option key={u}>{u}</option>)}</select></label>
            <label>Valor unitário<input min="0" required step=".01" type="number" value={itemForm.unitPrice} onChange={e=>setItemForm({...itemForm,unitPrice:e.target.value})}/></label>
            <label>Moeda<select required value={itemForm.currency} onChange={e=>setItemForm({...itemForm,currency:e.target.value,exchangeRate:e.target.value==="BRL"?"1":""})}><option value="" disabled>Selecione</option><option value="BRL">BRL</option><option value="USD">USD</option></select></label>
            {itemForm.currency==="USD"&&<label>Cotação USD<input min="0.01" required step=".0001" type="number" value={itemForm.exchangeRate} onChange={e=>setItemForm({...itemForm,exchangeRate:e.target.value})}/></label>}
            <label>Overhead (%)<input min="0" step=".01" type="number" value={itemForm.overhead} onChange={e=>setItemForm({...itemForm,overhead:e.target.value})}/></label>
            <label>NCM<input list="quotation-ncm" value={itemForm.ncm} onChange={e=>setItemForm({...itemForm,ncm:e.target.value})} placeholder="Opcional"/><datalist id="quotation-ncm">{ncmTaxes.map(tax=><option key={tax.id} value={tax.ncm}>{tax.description}</option>)}</datalist></label>
            <label>P/N<input value={itemForm.partNumber} onChange={e=>setItemForm({...itemForm,partNumber:e.target.value})} placeholder="Opcional"/></label>
            <label>Código SAP<input value={itemForm.sapCode} onChange={e=>setItemForm({...itemForm,sapCode:e.target.value})} placeholder="Opcional"/></label>
            {itemForm.ncm&&<fieldset className="quotation-tax-options wide"><legend>Impostos aplicáveis</legend>{[["applyIpi","IPI","ipi_rate"],["applyPis","PIS","pis_rate"],["applyCofins","COFINS","cofins_rate"],["applyIcms","ICMS","icms_rate"],["applyImportTax","Importação","import_tax_rate"]].map(([key,label,rate])=><label key={key}><input type="checkbox" checked={itemForm[key]} onChange={e=>setItemForm({...itemForm,[key]:e.target.checked})}/>{label} {Number(ncmTaxes.find(t=>t.ncm===itemForm.ncm)?.[rate]||0)}%</label>)}</fieldset>}
            <footer className="modal-form-actions"><button onClick={()=>{setItemFormOpen(false);cancelEditItem()}} type="button">Cancelar</button><button type="submit">{editingItemId?"Salvar alterações":"Adicionar componente"}</button></footer>
          </form>
        </FormModal>
        <div className="quotation-items">{selectedItems.map(item=>{const value=amounts(item);return <div key={item.id}><span><strong>{item.description}</strong><small>{item.quantity} {item.unit_type} · {item.currency}{item.ncm?` · NCM ${item.ncm}`:""}{item.item_code?` · P/N ${item.item_code}`:""}{item.sap_code?` · SAP ${item.sap_code}`:""}</small></span><span className="quotation-values"><small>EXW {format(value.exw,"BRL")}</small><small>FOB {format(value.fob,"BRL")}</small><b>NET {format(value.net,"BRL")}</b></span><div className="quotation-item-actions"><button onClick={()=>{startEditItem(item);setItemFormOpen(true)}}>Editar</button><button className="delete" onClick={()=>deleteItem(item)}>Excluir</button></div></div>})}</div>
      </div>:<div className="quotation-package-empty"><strong>Selecione um pacote</strong><span>Os componentes da cotação aparecerão aqui.</span></div>}
    </div>
  </section>;
}

export default function NewProductsDashboard({
  canCreateDemand = true,
  readOnly = false,
}) {
  const [products, setProducts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [launchHistory, setLaunchHistory] = useState([]);
  const [quotationPackages, setQuotationPackages] = useState([]);
  const [quotationItems, setQuotationItems] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [expandedStage, setExpandedStage] = useState("discovery");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProject);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [taskNavigationRequest, setTaskNavigationRequest] = useState(0);
  const [taskNotes, setTaskNotes] = useState({});
  const [editingTaskNoteId, setEditingTaskNoteId] = useState(null);
  const [savingTaskNoteId, setSavingTaskNoteId] = useState(null);
  const [taskNoteError, setTaskNoteError] = useState("");
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [packageItemForm, setPackageItemForm] = useState(emptyPackageItem);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingQuotationItemId, setEditingQuotationItemId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [projectHistory, setProjectHistory] = useState([]);
  const [editingProject, setEditingProject] = useState(false);
  const [projectEdit, setProjectEdit] = useState({});
  const [workspaceView, setWorkspaceView] = useState("portfolio");
  const [userProfiles,setUserProfiles]=useState([]);
  const [productCodeOpen, setProductCodeOpen] = useState(false);
  const [productCodeDraft, setProductCodeDraft] = useState("");
  const [savingProductCode, setSavingProductCode] = useState(false);
  const [assignmentTask, setAssignmentTask] = useState(null);
  const [assignmentDraft, setAssignmentDraft] = useState({ assigneeEmail: "", dueDate: "" });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");

  async function loadWorkflow() {
    const [productsResult, projectsResult, tasksResult, attachmentsResult, historyResult, packagesResult, quotationItemsResult, projectHistoryResult, profilesResult] = await Promise.all([
      supabase.from("products").select("id, code, name, category, owner").order("code"),
      supabase.from("product_development_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("product_development_tasks").select("*").order("sort_order"),
      supabase.from("product_development_task_attachments").select("*").order("created_at"),
      supabase.from("product_launch_date_history").select("*").order("changed_at", { ascending: false }),
      supabase.from("quotation_packages").select("*").order("created_at", { ascending: false }),
      supabase.from("quotation_package_items").select("*").order("created_at"),
      supabase.from("product_development_project_history").select("*").order("changed_at",{ascending:false}),
      supabase.from("user_profiles").select("id,full_name,email,area").order("full_name"),
    ]);
    if (projectsResult.error || tasksResult.error) { setMessage(`Execute o SQL do fluxo de desenvolvimento: ${projectsResult.error?.message ?? tasksResult.error?.message}`); }
    setProducts(productsResult.data ?? []); setProjects(projectsResult.data ?? []); setTasks(tasksResult.data ?? []);
    setTaskAttachments(attachmentsResult.data ?? []); setLaunchHistory(historyResult.data ?? []);
    setQuotationPackages(packagesResult.data ?? []); setQuotationItems(quotationItemsResult.data ?? []);
    setProjectHistory(projectHistoryResult.data??[]);
    setUserProfiles(profilesResult.data??[]);
  }

  useEffect(() => { loadWorkflow(); }, []);

  useEffect(() => {
    function openDevelopmentTask(event) {
      const { projectId, stageKey, taskId } = event.detail ?? {};

      if (!projectId) {
        return;
      }

      setWorkspaceView("portfolio");
      setShowArchived(false);
      setSelectedProjectId(Number(projectId));
      setExpandedStage(stageKey || "discovery");
      setExpandedTaskId(null);
      setHighlightedTaskId(taskId ?? null);
      setTaskNavigationRequest((current) => current + 1);
      setEditingProject(false);
      setMessage("");
    }

    window.addEventListener("penn:open-development-task", openDevelopmentTask);
    return () =>
      window.removeEventListener(
        "penn:open-development-task",
        openDevelopmentTask
      );
  }, []);

  const projectData = useMemo(() => projects.map((project) => {
    const product = products.find((item) => item.id === project.product_id);
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const completed = projectTasks.filter((task) => task.status === "completed" || task.status === "not_applicable").length;
    const blocked = projectTasks.filter((task) => task.status === "blocked").length;
    return { ...project, product, projectTasks, completed, blocked, progress: projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0 };
  }), [projects, products, tasks]);

  const selectedProject = projectData.find((project) => project.id === selectedProjectId);
  const selectedCurrentStageKey = selectedProject
    ? getCurrentStageKey(selectedProject.projectTasks)
    : null;
  const selectedProjectTaskCount = selectedProject?.projectTasks.length ?? 0;
  const activeProjects = projectData.filter((project) => !project.archived_at);
  const archivedProjects = projectData.filter((project) => project.archived_at);
  const visibleProjects = showArchived ? archivedProjects : activeProjects;
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const activeTasks = tasks.filter((task) => activeProjectIds.has(task.project_id));
  const taskTotal = activeTasks.length || 1;
  const completedTasks = activeTasks.filter((task) => task.status === "completed").length;
  const progressingTasks = activeTasks.filter((task) => task.status === "in_progress").length;
  const blockedTasks = activeTasks.filter((task) => task.status === "blocked").length;
  const completedSlice = completedTasks / taskTotal * 100;
  const progressingSlice = (completedTasks + progressingTasks) / taskTotal * 100;
  const blockedSlice = (completedTasks + progressingTasks + blockedTasks) / taskTotal * 100;
  const selectedAssignmentProfile = userProfiles.find(
    (profile) =>
      profile.email?.trim().toLowerCase() ===
      assignmentDraft.assigneeEmail.trim().toLowerCase()
  );

  useEffect(() => {
    if (selectedCurrentStageKey) {
      setExpandedStage(selectedCurrentStageKey);
    }
  }, [selectedProjectId, selectedCurrentStageKey]);

  useEffect(() => {
    if (!highlightedTaskId || !selectedProjectId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById(
        `development-task-${highlightedTaskId}`
      );

      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    expandedStage,
    highlightedTaskId,
    selectedProjectId,
    selectedProjectTaskCount,
    taskNavigationRequest,
  ]);

  async function createProject(event) {
    event.preventDefault();
    if (!canCreateDemand) {
      setMessage("Seu perfil não permite iniciar novas demandas.");
      return;
    }
    const productName = form.productName.trim();

    if (!productName) {
      setMessage("Informe o nome provisório do produto.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: productName,
        code: null,
        category: "Em desenvolvimento",
        product_icon: "box",
        owner: form.owner.trim(),
        status: "avaliacao",
        characteristics: form.technicalSpecs.trim(),
      })
      .select("id, code, name, category, owner")
      .single();

    if (productError) {
      const migrationHint = productError.message?.toLowerCase().includes("code")
        ? " Execute novamente o SQL atualizado para permitir produtos ainda sem código."
        : "";
      setMessage(`Não foi possível iniciar o cadastro do produto: ${productError.message}.${migrationHint}`);
      setSaving(false);
      return;
    }

    const { data: project, error } = await supabase
      .from("product_development_projects")
      .insert({
        product_id: product.id,
        requester: form.requester.trim(),
        owner: form.owner.trim(),
        target_launch_date: form.targetLaunchDate || null,
        target_price: form.targetPrice ? Number(form.targetPrice) : null,
        expected_demand: form.expectedDemand.trim(),
        potential_clients: form.potentialClients.trim(),
        market_potential: form.marketPotential.trim(),
        technical_specs: form.technicalSpecs.trim(),
        development_reason: form.developmentReason.trim(),
      })
      .select("*")
      .single();

    if (error) {
      await supabase.from("products").delete().eq("id", product.id);
      setMessage(`Não foi possível criar o fluxo: ${error.message}`);
      setSaving(false);
      return;
    }

    let order = 0;
    const templateTasks = workflowStages.flatMap((stage) =>
      stage.tasks.map((title) => ({
        project_id: project.id,
        stage_key: stage.key,
        title,
        owner_area: stage.area,
        sort_order: order++,
      }))
    );
    const { data: createdTasks, error: taskError } = await supabase
      .from("product_development_tasks")
      .insert(templateTasks)
      .select("*");

    if (taskError) {
      await supabase.from("product_development_projects").delete().eq("id", project.id);
      await supabase.from("products").delete().eq("id", product.id);
      setMessage(`Não foi possível montar as etapas do desenvolvimento: ${taskError.message}`);
      setSaving(false);
      return;
    }

    setProducts((current) => [product, ...current]);
    setProjects((current) => [project, ...current]);
    setTasks((current) => [...current, ...(createdTasks ?? [])]);
    setForm(emptyProject);
    setShowForm(false);
    setSelectedProjectId(project.id);
    setMessage("Desenvolvimento criado. O código será definido na etapa 7.");
    setSaving(false);
  }

  async function updateTask(task, status) {
    if (readOnly) return;
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    const { error } = await supabase.from("product_development_tasks").update({ status, completed_at: completedAt }).eq("id", task.id);
    if (error) { setMessage(`Não foi possível atualizar: ${error.message}`); return; }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status, completed_at: completedAt } : item));
    window.dispatchEvent(new CustomEvent("penn:tasks-changed"));
  }

  async function assignProductCode(event) {
    event.preventDefault();
    if (readOnly) return;
    const code = productCodeDraft.trim().toUpperCase();

    if (!selectedProject?.product || !code) {
      return;
    }

    if (products.some((product) =>
      product.id !== selectedProject.product.id &&
      product.code?.toLowerCase() === code.toLowerCase()
    )) {
      setMessage("Este código já está vinculado a outro produto.");
      return;
    }

    setSavingProductCode(true);
    const oldCode = selectedProject.product.code || null;
    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update({ code })
      .eq("id", selectedProject.product.id)
      .select("id, code, name, category, owner")
      .single();

    if (error) {
      setMessage(`Não foi possível atribuir o código: ${error.message}`);
      setSavingProductCode(false);
      return;
    }

    setProducts((current) => current.map((product) =>
      product.id === updatedProduct.id ? { ...product, ...updatedProduct } : product
    ));
    await supabase
      .from("product_issues")
      .update({ product_code: code })
      .eq("product_id", updatedProduct.id);

    const codeTask = selectedProject.projectTasks.find((task) =>
      task.stage_key === "industrialization" &&
      task.title === "Definir sequência de código interno"
    );
    let taskWarning = "";

    if (codeTask && codeTask.status !== "completed") {
      const completedAt = new Date().toISOString();
      const { error: taskError } = await supabase
        .from("product_development_tasks")
        .update({ status: "completed", completed_at: completedAt })
        .eq("id", codeTask.id);

      if (taskError) {
        taskWarning = " O código foi salvo, mas a tarefa deverá ser concluída manualmente.";
      } else {
        setTasks((current) => current.map((task) =>
          task.id === codeTask.id
            ? { ...task, status: "completed", completed_at: completedAt }
            : task
        ));
      }
    }

    const { data: history } = await supabase
      .from("product_development_project_history")
      .insert({
        project_id: selectedProject.id,
        field_name: "product_code",
        old_value: oldCode,
        new_value: code,
      })
      .select("*")
      .single();

    if (history) {
      setProjectHistory((current) => [history, ...current]);
    }

    setProductCodeOpen(false);
    setProductCodeDraft("");
    setSavingProductCode(false);
    setMessage(`Código ${code} atribuído ao produto.${taskWarning}`);
    window.dispatchEvent(new CustomEvent("penn:tasks-changed"));
  }

  function openTaskAssignment(task) {
    if (readOnly) return;
    setAssignmentError("");
    setAssignmentTask(task);
    setAssignmentDraft({
      assigneeEmail: task.assignee_email || "",
      dueDate: task.due_date || "",
    });
  }

  function closeTaskAssignment() {
    if (savingAssignment) return;
    setAssignmentTask(null);
    setAssignmentDraft({ assigneeEmail: "", dueDate: "" });
    setAssignmentError("");
  }

  async function assignTask(event) {
    event.preventDefault();
    if (readOnly || !assignmentTask || savingAssignment) return;

    const normalizedEmail = assignmentDraft.assigneeEmail.trim().toLowerCase();
    const profile = userProfiles.find(
      (item) => item.email?.trim().toLowerCase() === normalizedEmail
    );

    if (!profile) {
      setAssignmentError("Selecione uma pessoa com conta ativa na aplicação.");
      return;
    }

    setSavingAssignment(true);
    const { data, error } = await supabase
      .from("product_development_tasks")
      .update({
        assignee_name: profile.full_name || profile.email,
        assignee_email: profile.email.trim().toLowerCase(),
        due_date: assignmentDraft.dueDate || null,
      })
      .eq("id", assignmentTask.id)
      .select("*")
      .single();
    setSavingAssignment(false);

    if (error) {
      setAssignmentError(`Não foi possível atribuir a tarefa: ${error.message}`);
      return;
    }

    setTasks((current) => current.map((item) => (item.id === data.id ? data : item)));
    setAssignmentTask(null);
    setAssignmentDraft({ assigneeEmail: "", dueDate: "" });
    setMessage(`Tarefa atribuída a ${data.assignee_name}.`);
    window.dispatchEvent(new CustomEvent("penn:tasks-changed", { detail: { task: data } }));
  }

  async function saveTaskNote(task) {
    if (readOnly) return;
    const notes = (taskNotes[task.id] ?? task.notes ?? "").trim();
    setSavingTaskNoteId(task.id);
    setTaskNoteError("");

    const { data, error } = await supabase
      .from("product_development_tasks")
      .update({ notes: notes || null })
      .eq("id", task.id)
      .select("*")
      .single();

    setSavingTaskNoteId(null);
    if (error) {
      setTaskNoteError(`Não foi possível salvar a observação: ${error.message}`);
      return;
    }

    setTasks((current) =>
      current.map((item) => (item.id === task.id ? data : item))
    );
    setTaskNotes((current) => {
      const next = { ...current };
      delete next[task.id];
      return next;
    });
    setEditingTaskNoteId(null);
    setMessage("Observação salva.");
    window.dispatchEvent(
      new CustomEvent("penn:tasks-changed", { detail: { task: data } })
    );
  }

  function openTaskDetails(task) {
    setExpandedTaskId(task.id);
    setEditingTaskNoteId(null);
    setTaskNoteError("");
  }

  function toggleTaskDetails(task) {
    const isClosing = expandedTaskId === task.id;
    setExpandedTaskId(isClosing ? null : task.id);
    setEditingTaskNoteId(null);
    setTaskNoteError("");
  }

  function editTaskNote(task) {
    setTaskNotes((current) => ({
      ...current,
      [task.id]: task.notes ?? "",
    }));
    setEditingTaskNoteId(task.id);
    setTaskNoteError("");
  }

  function cancelTaskNoteEdit(task) {
    setTaskNotes((current) => {
      const next = { ...current };
      delete next[task.id];
      return next;
    });
    setEditingTaskNoteId(null);
    setTaskNoteError("");
  }

  async function uploadTaskAttachment(task, file) {
    if (readOnly) return;
    if (!file) return; const path=`development/${task.project_id}/${task.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
    const { error: uploadError }=await supabase.storage.from("product-files").upload(path,file,{contentType:file.type}); if(uploadError){setMessage(uploadError.message);return;}
    const { data:urlData }=supabase.storage.from("product-files").getPublicUrl(path); const {data,error}=await supabase.from("product_development_task_attachments").insert({task_id:task.id,name:file.name,storage_path:path,public_url:urlData.publicUrl}).select("*").single(); if(!error)setTaskAttachments((current)=>[...current,data]);
  }

  async function changeLaunchDate(value) {
    if (readOnly) return;
    const oldDate=selectedProject.target_launch_date; if(value===oldDate)return; const reason=window.prompt("Motivo da alteração da data prevista:"); if(!reason?.trim())return;
    const {error}=await supabase.from("product_development_projects").update({target_launch_date:value||null,updated_at:new Date().toISOString()}).eq("id",selectedProject.id); if(error){setMessage(error.message);return;}
    const {data}=await supabase.from("product_launch_date_history").insert({project_id:selectedProject.id,old_date:oldDate||null,new_date:value||null,reason:reason.trim()}).select("*").single(); setProjects((current)=>current.map((p)=>p.id===selectedProject.id?{...p,target_launch_date:value||null}:p)); if(data)setLaunchHistory((current)=>[data,...current]);
  }

  async function createQuotationPackage(event) {
    event.preventDefault(); if(readOnly)return; const {data,error}=await supabase.from("quotation_packages").insert({product_id:selectedProject.product_id,project_id:selectedProject.id,name:packageForm.name.trim(),supplier:packageForm.supplier.trim()||null,currency:"BRL",due_date:packageForm.dueDate||null,include_in_total:false}).select("*").single();
    if(error){setMessage(error.message);return;} setQuotationPackages((current)=>[data,...current]);setSelectedPackageId(data.id);setPackageForm(emptyPackage);setShowPackageForm(false);
  }

  async function saveQuotationItem(event) {
    event.preventDefault(); if(readOnly)return; const payload={package_id:selectedPackageId,item_code:packageItemForm.partNumber.trim()||null,sap_code:packageItemForm.sapCode.trim()||null,description:packageItemForm.description.trim(),quantity:Number(packageItemForm.quantity),unit_type:packageItemForm.unitType,unit_price:Number(packageItemForm.unitPrice),mkp:1,overhead_rate:packageItemForm.overhead===""?0:Number(packageItemForm.overhead),currency:packageItemForm.currency,exchange_rate:packageItemForm.currency==="USD"?Number(packageItemForm.exchangeRate):1,ncm:packageItemForm.ncm.trim()||null,apply_ipi:packageItemForm.applyIpi,apply_pis:packageItemForm.applyPis,apply_cofins:packageItemForm.applyCofins,apply_icms:packageItemForm.applyIcms,apply_import_tax:packageItemForm.applyImportTax};
    const query=editingQuotationItemId?supabase.from("quotation_package_items").update(payload).eq("id",editingQuotationItemId):supabase.from("quotation_package_items").insert(payload);const{data,error}=await query.select("*").single();
    if(error){setMessage(error.message);return false;}setQuotationItems((current)=>editingQuotationItemId?current.map((item)=>item.id===data.id?data:item):[...current,data]);setPackageItemForm(emptyPackageItem);setEditingQuotationItemId(null);setMessage(editingQuotationItemId?"Componente atualizado.":"Componente adicionado.");return true;
  }

  function startEditQuotationItem(item){setEditingQuotationItemId(item.id);setPackageItemForm({partNumber:item.item_code||"",sapCode:item.sap_code||"",description:item.description,quantity:String(item.quantity),unitType:item.unit_type,unitPrice:String(item.unit_price),overhead:item.overhead_rate?String(item.overhead_rate):"",currency:item.currency||"BRL",exchangeRate:item.currency==="USD"?String(item.exchange_rate||""):"1",ncm:item.ncm||"",applyIpi:Boolean(item.apply_ipi),applyPis:Boolean(item.apply_pis),applyCofins:Boolean(item.apply_cofins),applyIcms:Boolean(item.apply_icms),applyImportTax:Boolean(item.apply_import_tax)});}
  function cancelEditQuotationItem(){setEditingQuotationItemId(null);setPackageItemForm(emptyPackageItem);}
  async function deleteQuotationItem(item){if(readOnly)return;if(!window.confirm(`Excluir o componente "${item.description}" desta composição?`))return;const{error}=await supabase.from("quotation_package_items").delete().eq("id",item.id);if(error){setMessage(error.message);return;}setQuotationItems((current)=>current.filter((currentItem)=>currentItem.id!==item.id));if(editingQuotationItemId===item.id)cancelEditQuotationItem();setMessage("Componente excluído.");}

  async function updatePackageStatus(pkg,status){if(readOnly)return;const{data,error}=await supabase.from("quotation_packages").update({status}).eq("id",pkg.id).select("*").single();if(!error)setQuotationPackages((current)=>current.map((item)=>item.id===pkg.id?data:item));}

  async function deleteQuotationPackage(pkg){const packageItems=quotationItems.filter((item)=>item.package_id===pkg.id);const confirmation=packageItems.length?`O pacote "${pkg.name}" possui ${packageItems.length} componente(s). Excluir o pacote e todos eles?`:`Excluir o pacote "${pkg.name}"?`;if(!window.confirm(confirmation))return;const{error}=await supabase.from("quotation_packages").delete().eq("id",pkg.id);if(error){setMessage(error.message);return;}setQuotationPackages((current)=>current.filter((item)=>item.id!==pkg.id));setQuotationItems((current)=>current.filter((item)=>item.package_id!==pkg.id));if(selectedPackageId===pkg.id){setSelectedPackageId(null);cancelEditQuotationItem();}setMessage("Pacote de cotação excluído.");}

  async function toggleQuotationPackageTotal(pkg,include){const{data,error}=await supabase.from("quotation_packages").update({include_in_total:include}).eq("id",pkg.id).select("*").single();if(error){setMessage(error.message);return;}setQuotationPackages(current=>current.map(item=>item.id===pkg.id?data:item));}

  async function cloneQuotationPackage(pkg){const sourceItems=quotationItems.filter(item=>item.package_id===pkg.id);const{data:clone,error}=await supabase.from("quotation_packages").insert({product_id:pkg.product_id,project_id:pkg.project_id,name:`${pkg.name} (cópia)`,supplier:pkg.supplier,currency:pkg.currency,due_date:pkg.due_date,status:"draft",include_in_total:false}).select("*").single();if(error){setMessage(error.message);return;}let clonedItems=[];if(sourceItems.length){const{data,error:itemError}=await supabase.from("quotation_package_items").insert(sourceItems.map(({id,created_at,...item})=>({...item,package_id:clone.id}))).select("*");if(itemError){setMessage(`Pacote clonado, mas os componentes falharam: ${itemError.message}`);}else clonedItems=data??[];}setQuotationPackages(current=>[clone,...current]);setQuotationItems(current=>[...current,...clonedItems]);setSelectedPackageId(clone.id);cancelEditQuotationItem();setMessage("Pacote clonado. Revise os dados antes de aprovar.");}

  function beginProjectEdit(){setProjectEdit({requester:selectedProject.requester||"",owner:selectedProject.owner||"",target_launch_date:selectedProject.target_launch_date||"",target_price:selectedProject.target_price??"",expected_demand:selectedProject.expected_demand||"",potential_clients:selectedProject.potential_clients||"",market_potential:selectedProject.market_potential||"",technical_specs:selectedProject.technical_specs||"",development_reason:selectedProject.development_reason||""});setEditingProject(true);}
  async function saveProjectEdit(event){event.preventDefault();const fields=Object.keys(projectEdit);const payload={...projectEdit,target_launch_date:projectEdit.target_launch_date||null,target_price:projectEdit.target_price===""?null:Number(projectEdit.target_price),updated_at:new Date().toISOString()};const changes=fields.filter(field=>String(selectedProject[field]??"")!==String(payload[field]??""));if(!changes.length){setEditingProject(false);return;}const{data,error}=await supabase.from("product_development_projects").update(payload).eq("id",selectedProject.id).select("*").single();if(error){setMessage(error.message);return;}const historyRows=changes.map(field=>({project_id:selectedProject.id,field_name:field,old_value:String(selectedProject[field]??""),new_value:String(payload[field]??"")}));const{data:history}=await supabase.from("product_development_project_history").insert(historyRows).select("*");setProjects(current=>current.map(project=>project.id===data.id?data:project));setProjectHistory(current=>[...(history??[]),...current]);setEditingProject(false);setMessage(`${changes.length} campo(s) atualizado(s) com histórico.`);}

  async function archiveProject() {
    const archivedAt = new Date().toISOString();
    const { error } = await supabase.from("product_development_projects").update({ archived_at: archivedAt, updated_at: archivedAt }).eq("id", selectedProject.id);
    if (error) { setMessage(`Não foi possível arquivar: ${error.message}`); return; }
    setProjects((current)=>current.map((project)=>project.id===selectedProject.id?{...project,archived_at:archivedAt,updated_at:archivedAt}:project));
    setSelectedProjectId(null); setShowArchived(true); setMessage("Projeto arquivado com segurança.");
  }

  async function restoreProject(project) {
    const { error } = await supabase.from("product_development_projects").update({ archived_at:null, updated_at:new Date().toISOString() }).eq("id",project.id);
    if (error) { setMessage(`Não foi possível restaurar: ${error.message}`); return; }
    setProjects((current)=>current.map((item)=>item.id===project.id?{...item,archived_at:null}:item)); setMessage("Projeto restaurado ao portfólio ativo.");
  }

  async function deleteProject() {
    const confirmationToken = deleteCandidate?.product?.code || deleteCandidate?.product?.name;
    if (!deleteCandidate || deleteConfirmation.trim() !== confirmationToken) return;
    const projectTaskIds = new Set(tasks.filter((task)=>task.project_id===deleteCandidate.id).map((task)=>task.id));
    const storedFiles = taskAttachments.filter((attachment)=>projectTaskIds.has(attachment.task_id)).map((attachment)=>attachment.storage_path);
    if (storedFiles.length) await supabase.storage.from("product-files").remove(storedFiles);
    const { error } = await supabase.from("product_development_projects").delete().eq("id",deleteCandidate.id);
    if (error) { setMessage(`Não foi possível excluir: ${error.message}`); return; }
    if (!deleteCandidate.product?.code && deleteCandidate.product_id) {
      await supabase.from("products").delete().eq("id", deleteCandidate.product_id);
      setProducts((current) => current.filter((product) => product.id !== deleteCandidate.product_id));
    }
    setProjects((current)=>current.filter((project)=>project.id!==deleteCandidate.id));
    setTasks((current)=>current.filter((task)=>task.project_id!==deleteCandidate.id));
    setDeleteCandidate(null); setDeleteConfirmation(""); setMessage("Projeto excluído definitivamente.");
  }

  function openQuotationWorkspace() {
    if (!selectedProjectId && activeProjects.length) setSelectedProjectId(activeProjects[0].id);
    setWorkspaceView("quotations");
  }

  function openProjectQuotation(projectId) {
    setSelectedProjectId(projectId);
    setHighlightedTaskId(null);
    setSelectedPackageId(null);
    cancelEditQuotationItem();
    setWorkspaceView("quotations");
  }

  function openProject(projectId) {
    setHighlightedTaskId(null);
    setProductCodeOpen(false);
    setProductCodeDraft("");
    setSelectedProjectId(projectId);
  }

  if (workspaceView === "quotations") return (
    <main className={`flow-page quotation-dedicated-page ${readOnly ? "is-read-only" : ""}`}>
      <button className="flow-back" onClick={() => { setWorkspaceView("portfolio"); setSelectedProjectId(null); }}><FlowIcon name="back"/> Voltar aos novos produtos</button>
      <section className="quotation-page-hero"><div><span className="panel-kicker">Central de custos</span><h1>Pacotes de cotação</h1><p>Monte composições, compare custos EXW, FOB e NET e consolide somente os pacotes selecionados.</p></div><label>Projeto em desenvolvimento<select value={selectedProjectId || ""} onChange={(event) => { setSelectedProjectId(Number(event.target.value)); setSelectedPackageId(null); cancelEditQuotationItem(); }}><option value="" disabled>Selecione um projeto</option>{activeProjects.map((project) => <option key={project.id} value={project.id}>{productCodeLabel(project.product)} · {project.product?.name}</option>)}</select></label></section>
      {selectedProject ? <QuotationWorkspace project={selectedProject} packages={quotationPackages} items={quotationItems} selectedPackageId={selectedPackageId} setSelectedPackageId={setSelectedPackageId} showForm={showPackageForm} setShowForm={setShowPackageForm} packageForm={packageForm} setPackageForm={setPackageForm} itemForm={packageItemForm} setItemForm={setPackageItemForm} createPackage={createQuotationPackage} saveItem={saveQuotationItem} updateStatus={updatePackageStatus} editingItemId={editingQuotationItemId} startEditItem={startEditQuotationItem} cancelEditItem={cancelEditQuotationItem} deleteItem={deleteQuotationItem} deletePackage={deleteQuotationPackage} clonePackage={cloneQuotationPackage} togglePackageTotal={toggleQuotationPackageTotal} readOnly={readOnly} /> : <section className="quotation-page-empty"><strong>Nenhum projeto disponível</strong><span>Inicie um novo desenvolvimento para criar seus pacotes de cotação.</span></section>}
    </main>
  );

  if (selectedProject) return (
    <main className={`flow-page ${readOnly ? "is-read-only" : ""}`}><button className="flow-back" onClick={() => openProject(null)}><FlowIcon name="back"/> Voltar aos projetos</button>
      <section className="flow-detail-hero"><div><span>{productCodeLabel(selectedProject.product)}</span><h1>{selectedProject.product?.name}</h1><p>{selectedProject.development_reason || "Fluxo estruturado de desenvolvimento e lançamento."}</p>{!readOnly && <div className="flow-detail-actions"><button onClick={beginProjectEdit}>Editar dados do projeto</button><button className="archive-project-button" onClick={archiveProject}>Arquivar projeto</button></div>}</div><div className="flow-detail-score"><strong>{selectedProject.progress}%</strong><span>concluído</span></div></section>
      <section className="flow-project-info"><div><span>Solicitante</span><strong>{selectedProject.requester || "Não definido"}</strong></div><div><span>Responsável</span><strong>{selectedProject.owner || "Não definido"}</strong></div><div className="launch-date-editor"><span>Lançamento previsto</span><input disabled={readOnly} type="date" value={selectedProject.target_launch_date || ""} onChange={(event)=>changeLaunchDate(event.target.value)} /><small>{launchHistory.filter((item)=>item.project_id===selectedProject.id).length} alterações registradas</small></div><div><span>Preço objetivo</span><strong>{selectedProject.target_price ? Number(selectedProject.target_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não definido"}</strong></div></section>
      {editingProject&&<section className="project-edit-panel"><header><div><span className="panel-kicker">Edição auditável</span><h2>Dados iniciais do desenvolvimento</h2></div><button onClick={()=>setEditingProject(false)}>Fechar</button></header><form onSubmit={saveProjectEdit}><label>Solicitante<input value={projectEdit.requester} onChange={e=>setProjectEdit({...projectEdit,requester:e.target.value})}/></label><label>Responsável<input value={projectEdit.owner} onChange={e=>setProjectEdit({...projectEdit,owner:e.target.value})}/></label><label>Lançamento previsto<input type="date" value={projectEdit.target_launch_date} onChange={e=>setProjectEdit({...projectEdit,target_launch_date:e.target.value})}/></label><label>Preço objetivo<input type="number" step=".01" value={projectEdit.target_price} onChange={e=>setProjectEdit({...projectEdit,target_price:e.target.value})}/></label>{[["expected_demand","Demanda esperada"],["potential_clients","Clientes potenciais"],["market_potential","Mercado potencial"],["technical_specs","Especificações técnicas"],["development_reason","Motivo e diferencial"]].map(([field,label])=><label className="wide" key={field}>{label}<textarea rows="2" value={projectEdit[field]} onChange={e=>setProjectEdit({...projectEdit,[field]:e.target.value})}/></label>)}<footer><small>{projectHistory.filter(item=>item.project_id===selectedProject.id).length} alterações registradas</small><button>Salvar alterações</button></footer></form></section>}
      {launchHistory.some((item)=>item.project_id===selectedProject.id)&&<details className="launch-history"><summary>Histórico da previsão de lançamento</summary>{launchHistory.filter((item)=>item.project_id===selectedProject.id).map((item)=><div key={item.id}><strong>{item.old_date||"Sem data"} → {item.new_date||"Sem data"}</strong><span>{item.reason}</span><small>{new Date(item.changed_at).toLocaleString("pt-BR")}</small></div>)}</details>}
      <section className="flow-stage-list">
        {workflowStages.map((stage) => {
          const stageTasks = selectedProject.projectTasks.filter(
            (task) => task.stage_key === stage.key
          );
          const done = stageTasks.filter((task) =>
            ["completed", "not_applicable"].includes(task.status)
          ).length;
          const stageState = getStageState(
            selectedProject.projectTasks,
            stage.key
          );
          const future = stageState === "locked";
          const open = expandedStage === stage.key;
          const stageHint =
            stageState === "current"
              ? "Etapa atual"
              : stageState === "completed"
                ? "Etapa concluída"
                : "Etapa futura · alterações permitidas";

          return (
            <article
              className={`flow-stage ${future ? "future" : stageState} ${open ? "open" : ""}`}
              key={stage.key}
            >
              <button
                aria-expanded={open}
                className="flow-stage-header"
                onClick={() => setExpandedStage(open ? "" : stage.key)}
                title={future ? "Abra para consultar ou ajustar as tarefas desta etapa futura" : undefined}
                type="button"
              >
                <span className={`flow-stage-number ${stage.color}`}>
                  {stage.number}
                </span>
                <div>
                  <strong>{stage.title}</strong>
                  <small>
                    {stage.area} · {stageHint}
                  </small>
                </div>
                <div className="flow-stage-progress">
                  <span>{done}/{stageTasks.length}</span>
                  <i>
                    <b
                      style={{
                        width: `${stageTasks.length ? (done / stageTasks.length) * 100 : 0}%`,
                      }}
                    />
                  </i>
                </div>
                <FlowIcon name="chevron" />
              </button>

              {open && stage.key === "industrialization" && (
                <div className={`stage-product-code ${selectedProject.product?.code ? "assigned" : "pending"}`}>
                  <div>
                    <span>Código definitivo do produto</span>
                    <strong>{productCodeLabel(selectedProject.product)}</strong>
                    <small>
                      {selectedProject.product?.code
                        ? "O produto já está disponível na aplicação com este código."
                        : "Defina o código nesta etapa para publicar o item no catálogo de produtos."}
                    </small>
                  </div>
                  {!readOnly && <button
                    onClick={() => {
                      setProductCodeDraft(selectedProject.product?.code || "");
                      setProductCodeOpen(true);
                    }}
                    type="button"
                  >
                    {selectedProject.product?.code ? "Revisar código" : "Definir código"}
                  </button>}
                </div>
              )}

              {open && (
                <div className="flow-task-list">
                  {stageTasks.map((task) => (
                    <div
                      className={`flow-task-wrap ${task.status} ${
                        task.id === highlightedTaskId ? "targeted" : ""
                      }`}
                      id={`development-task-${task.id}`}
                      key={task.id}
                      tabIndex={task.id === highlightedTaskId ? -1 : undefined}
                    >
                      <div className="flow-task">
                        <button
                          aria-label={`${task.status === "completed" ? "Reabrir" : "Concluir"} ${task.title}`}
                          className="flow-task-check"
                          disabled={readOnly}
                          onClick={() =>
                            updateTask(
                              task,
                              task.status === "completed" ? "pending" : "completed"
                            )
                          }
                          type="button"
                        >
                          {task.status === "completed" && <FlowIcon name="check" />}
                        </button>
                        <span>
                          {task.title}
                          <small className="task-assignee">
                            {task.owner_area || "Área não informada"}
                          </small>
                        </span>
                        <div className="task-row-context">
                          {task.notes && (
                            <button
                              aria-label={`Abrir observação de ${task.title}`}
                              className="task-note-preview"
                              onClick={() => openTaskDetails(task)}
                              title={task.notes}
                              type="button"
                            >
                              <span>Observação</span>
                              <strong>{task.notes}</strong>
                            </button>
                          )}
                          {!readOnly ? (
                            <button
                              className="task-assign-trigger"
                              onClick={() => openTaskAssignment(task)}
                              title={task.assignee_name ? `Responsável: ${task.assignee_name}` : "Atribuir responsável"}
                              type="button"
                            >
                              <span>{task.assignee_name || "Atribuir"}</span>
                            </button>
                          ) : (
                            <span className="task-assignee-readonly">
                              {task.assignee_name || "Sem responsável"}
                            </span>
                          )}
                        </div>
                        <button
                          aria-controls={`task-details-${task.id}`}
                          aria-expanded={expandedTaskId === task.id}
                          className="task-detail-trigger"
                          onClick={() => toggleTaskDetails(task)}
                          type="button"
                        >
                          Observações e anexos
                        </button>
                        <select
                          aria-label={`Status de ${task.title}`}
                          disabled={readOnly}
                          onChange={(event) =>
                            updateTask(task, event.target.value)
                          }
                          value={task.status}
                        >
                          <option value="pending">Pendente</option>
                          <option value="in_progress">Em andamento</option>
                          <option value="blocked">Bloqueado</option>
                          <option value="completed">Concluído</option>
                          <option value="not_applicable">Não aplicável</option>
                        </select>
                      </div>

                      {expandedTaskId === task.id && (
                        <div className="task-evidence" id={`task-details-${task.id}`}>
                          <section className="task-note-section">
                            {editingTaskNoteId === task.id ? (
                              <>
                                <label className="task-note-editor">
                                  Editar observação
                                  <textarea
                                    autoFocus
                                    onChange={(event) =>
                                      setTaskNotes((current) => ({
                                        ...current,
                                        [task.id]: event.target.value,
                                      }))
                                    }
                                    rows="4"
                                    value={taskNotes[task.id] ?? ""}
                                  />
                                </label>
                                {taskNoteError && (
                                  <p className="task-note-error" role="alert">
                                    {taskNoteError}
                                  </p>
                                )}
                                <div className="task-note-actions">
                                  <button
                                    className="secondary"
                                    disabled={savingTaskNoteId === task.id}
                                    onClick={() => cancelTaskNoteEdit(task)}
                                    type="button"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    disabled={savingTaskNoteId === task.id}
                                    onClick={() => saveTaskNote(task)}
                                    type="button"
                                  >
                                    {savingTaskNoteId === task.id
                                      ? "Salvando..."
                                      : "Salvar observação"}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <header>
                                  <div>
                                    <span>Observação registrada</span>
                                    <small>Descrição desta atividade</small>
                                  </div>
                                  {!readOnly && (
                                    <button
                                      onClick={() => editTaskNote(task)}
                                      type="button"
                                    >
                                      Editar observação
                                    </button>
                                  )}
                                </header>
                                <p className={!task.notes ? "empty" : ""}>
                                  {task.notes || "Nenhuma observação registrada."}
                                </p>
                              </>
                            )}
                          </section>

                          <section className="task-attachment-section">
                            <header>
                              <div>
                                <span>Anexos</span>
                                <small>Evidências e documentos da atividade</small>
                              </div>
                              {!readOnly && (
                                <label className="task-attachment-upload">
                                  Adicionar arquivo
                                  <input
                                    onChange={(event) =>
                                      uploadTaskAttachment(
                                        task,
                                        event.target.files?.[0]
                                      )
                                    }
                                    type="file"
                                  />
                                </label>
                              )}
                            </header>
                            <div className="task-evidence-files">
                              {taskAttachments.filter(
                                (item) => item.task_id === task.id
                              ).length ? (
                                taskAttachments
                                  .filter((item) => item.task_id === task.id)
                                  .map((item) => (
                                    <a
                                      href={item.public_url}
                                      key={item.id}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      {item.name}
                                    </a>
                                  ))
                              ) : (
                                <span>Nenhum anexo enviado.</span>
                              )}
                            </div>
                          </section>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
      <FormModal
        description="Selecione uma pessoa com conta na aplicação. A atividade aparecerá imediatamente no perfil escolhido e nos painéis de acompanhamento."
        eyebrow="Responsável pela atividade"
        onClose={closeTaskAssignment}
        open={Boolean(assignmentTask)}
        title="Atribuir tarefa"
      >
        <form className="modal-form task-assignment-form" onSubmit={assignTask}>
          <div className="task-assignment-context wide">
            <span>Atividade</span>
            <strong>{assignmentTask?.title}</strong>
            <small>
              {selectedProject?.product?.name || "Novo produto"} · {assignmentTask?.owner_area || "Área não informada"}
            </small>
          </div>
          <label className="wide">
            Pessoa responsável
            <select
              autoFocus
              required
              value={assignmentDraft.assigneeEmail}
              onChange={(event) => {
                setAssignmentError("");
                setAssignmentDraft({ ...assignmentDraft, assigneeEmail: event.target.value });
              }}
            >
              <option value="">Selecione uma pessoa</option>
              {userProfiles
                .filter((profile) => profile.email)
                .map((profile) => (
                  <option key={profile.id} value={profile.email}>
                    {profile.full_name || profile.email}{profile.area ? ` · ${profile.area}` : ""}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Prazo da atividade
            <input
              type="date"
              value={assignmentDraft.dueDate}
              onChange={(event) => setAssignmentDraft({ ...assignmentDraft, dueDate: event.target.value })}
            />
          </label>
          <div className={`task-assignment-person ${selectedAssignmentProfile ? "selected" : ""}`}>
            <span>{(selectedAssignmentProfile?.full_name || "?").slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{selectedAssignmentProfile?.full_name || "Aguardando seleção"}</strong>
              <small>{selectedAssignmentProfile?.email || "Escolha uma conta cadastrada"}</small>
            </div>
          </div>
          {assignmentError && <p className="task-assignment-error wide">{assignmentError}</p>}
          <footer className="modal-form-actions">
            <button disabled={savingAssignment} onClick={closeTaskAssignment} type="button">Cancelar</button>
            <button disabled={savingAssignment || !selectedAssignmentProfile} type="submit">
              {savingAssignment ? "Atribuindo..." : "Confirmar responsável"}
            </button>
          </footer>
        </form>
      </FormModal>
      <FormModal
        description="Informe o código definitivo reservado para este produto. O sistema validará duplicidades antes de publicar o item no catálogo."
        eyebrow="Etapa 7 · Codificação"
        onClose={() => {
          setProductCodeOpen(false);
          setProductCodeDraft("");
        }}
        open={productCodeOpen}
        title="Atribuir código ao produto"
      >
        <form className="modal-form" onSubmit={assignProductCode}>
          <label className="wide">
            Código definitivo
            <input
              autoFocus
              onChange={(event) => setProductCodeDraft(event.target.value)}
              placeholder="Ex.: 550.100.000.5000"
              required
              value={productCodeDraft}
            />
          </label>
          <div className="code-assignment-product wide">
            <span>Produto</span>
            <strong>{selectedProject.product?.name}</strong>
          </div>
          <footer className="modal-form-actions">
            <button onClick={() => setProductCodeOpen(false)} type="button">Cancelar</button>
            <button disabled={savingProductCode} type="submit">
              {savingProductCode ? "Salvando..." : "Atribuir código"}
            </button>
          </footer>
        </form>
      </FormModal>
    </main>
  );

  return (
    <main className={`flow-page ${readOnly ? "is-read-only" : ""}`}><section className={`flow-hero ${showArchived?"archived-hero":""}`}><div><span><FlowIcon name="spark"/> {showArchived?"Arquivo de projetos":"Processo PENN"}</span><h1>{showArchived?"Projetos arquivados":"Desenvolvimento de novos produtos"}</h1><p>{showArchived?"Consulte projetos retirados do portfólio ativo, restaure-os ou faça uma exclusão definitiva e confirmada.":"Da oportunidade ao pós-lançamento: um fluxo único, rastreável e orientado a decisões."}</p><div>{!showArchived&&canCreateDemand&&<button onClick={() => setShowForm(true)}>Iniciar novo desenvolvimento</button>}<button className="secondary" onClick={()=>setShowArchived(!showArchived)}>{showArchived?"Voltar aos projetos ativos":`Projetos arquivados (${archivedProjects.length})`} <FlowIcon name="arrow"/></button></div></div>{showArchived?<div className="flow-archive-count"><strong>{archivedProjects.length}</strong><span>projetos preservados</span></div>:<div className="flow-portfolio-chart"><div className="flow-task-pie" style={{background:`conic-gradient(#55d6a0 0 ${completedSlice}%,#56a8e8 ${completedSlice}% ${progressingSlice}%,#e26a5d ${progressingSlice}% ${blockedSlice}%,rgba(255,255,255,.18) ${blockedSlice}% 100%)`}}><span><strong>{activeTasks.length}</strong><small>tarefas</small></span></div><div><strong>Ritmo do portfólio</strong><span><i className="done"/>{completedTasks} concluídas</span><span><i className="doing"/>{progressingTasks} em andamento</span><span><i className="blocked"/>{blockedTasks} bloqueadas</span></div></div>}</section>
      {!showArchived&&<section className="flow-summary"><article><span>Projetos ativos</span><strong>{activeProjects.length}</strong></article><article><span>Em andamento</span><strong>{progressingTasks}</strong></article><article><span>Tarefas concluídas</span><strong>{completedTasks}</strong></article><article className="blocked"><span>Bloqueios</span><strong>{blockedTasks}</strong></article></section>}
      {message && <p className="flow-message">{message}</p>}
      <FormModal description="O projeto será criado sem código e começará pela etapa de levantamento. O código definitivo será atribuído somente na etapa 7." eyebrow="Novo fluxo" onClose={() => setShowForm(false)} open={showForm} size="large" title="Iniciar desenvolvimento">
        <form className="modal-form flow-create-modal" onSubmit={createProject}>
          <label className="wide">Nome provisório do produto<input autoFocus required value={form.productName} onChange={(e) => setForm({...form,productName:e.target.value})} placeholder="Ex.: Leitor RFID para controle de acesso"/></label>
          <label>Solicitante<input required value={form.requester} onChange={(e)=>setForm({...form,requester:e.target.value})}/></label>
          <label>Responsável<input required value={form.owner} onChange={(e)=>setForm({...form,owner:e.target.value})}/></label>
          <label>Lançamento previsto<input type="date" value={form.targetLaunchDate} onChange={(e)=>setForm({...form,targetLaunchDate:e.target.value})}/></label>
          <label>Preço objetivo<input min="0" step="0.01" type="number" value={form.targetPrice} onChange={(e)=>setForm({...form,targetPrice:e.target.value})}/></label>
          <label>Demanda esperada<input value={form.expectedDemand} onChange={(e)=>setForm({...form,expectedDemand:e.target.value})}/></label>
          <label className="wide">Clientes potenciais<textarea rows="2" value={form.potentialClients} onChange={(e)=>setForm({...form,potentialClients:e.target.value})}/></label>
          <label className="wide">Mercado potencial<textarea rows="2" value={form.marketPotential} onChange={(e)=>setForm({...form,marketPotential:e.target.value})}/></label>
          <label className="wide">Especificações técnicas<textarea rows="3" value={form.technicalSpecs} onChange={(e)=>setForm({...form,technicalSpecs:e.target.value})}/></label>
          <label className="wide">Por que desenvolver este produto? Qual o diferencial?<textarea required rows="3" value={form.developmentReason} onChange={(e)=>setForm({...form,developmentReason:e.target.value})}/></label>
          <footer className="modal-form-actions"><button onClick={() => setShowForm(false)} type="button">Cancelar</button><button disabled={saving} type="submit">{saving ? "Criando fluxo..." : "Criar projeto e checklist"}</button></footer>
        </form>
      </FormModal>
      <section className={`flow-projects ${showArchived?"archived-projects":""}`}><header><div><span className="panel-kicker">{showArchived?"Histórico preservado":"Portfólio em desenvolvimento"}</span><h2>{showArchived?"Arquivo de projetos":"Projetos e evolução"}</h2></div><span>{visibleProjects.length} projetos</span></header><div>{visibleProjects.map((project)=>showArchived?<article className="archived-project-card" key={project.id}><span className="flow-project-code">{project.product?.code?.slice(-2)||"NP"}</span><div><strong>{project.product?.name}</strong><small>{productCodeLabel(project.product)} · Arquivado em {new Date(project.archived_at).toLocaleDateString("pt-BR")}</small></div><span className="archive-card-progress">{project.progress}% concluído</span><div className="archive-card-actions"><button onClick={()=>restoreProject(project)}>Restaurar</button><button className="delete" onClick={()=>{setDeleteCandidate(project);setDeleteConfirmation("")}}>Excluir</button></div></article>:<article className="flow-project-row" key={project.id}><button className="flow-project-card" onClick={()=>openProject(project.id)}><span className="flow-project-code">{project.product?.code?.slice(-2)||"NP"}</span><div><strong>{project.product?.name}</strong><small>{productCodeLabel(project.product)} · {project.owner||"Sem responsável"}</small></div><span className="flow-project-meter"><i><b style={{width:`${project.progress}%`}}/></i><strong>{project.progress}%</strong></span>{project.blocked>0&&<span className="flow-blocked">{project.blocked} bloqueios</span>}<FlowIcon name="arrow"/></button></article>)}{visibleProjects.length===0&&<div className="flow-empty"><FlowIcon name="spark"/><strong>{showArchived?"Nenhum projeto arquivado":"Nenhum desenvolvimento iniciado"}</strong><span>{showArchived?"Os projetos arquivados aparecerão aqui sem poluir o portfólio ativo.":"Crie o primeiro fluxo para transformar a lista antiga em um processo vivo."}</span></div>}</div></section>
      {deleteCandidate&&<div className="archive-confirm-backdrop"><section className="archive-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-project-title"><span>Exclusão definitiva</span><h2 id="delete-project-title">Excluir {deleteCandidate.product?.name}?</h2><p>Essa ação removerá o projeto, suas etapas, cotações, anexos e histórico relacionado. Ela não poderá ser desfeita.</p><label>Digite <strong>{deleteCandidate.product?.code || deleteCandidate.product?.name}</strong> para confirmar<input autoFocus value={deleteConfirmation} onChange={(event)=>setDeleteConfirmation(event.target.value)} placeholder={deleteCandidate.product?.code || deleteCandidate.product?.name}/></label><div><button onClick={()=>{setDeleteCandidate(null);setDeleteConfirmation("")}}>Cancelar</button><button className="danger" disabled={deleteConfirmation.trim()!==(deleteCandidate.product?.code || deleteCandidate.product?.name)} onClick={deleteProject}>Excluir definitivamente</button></div></section></div>}
    </main>
  );
}
