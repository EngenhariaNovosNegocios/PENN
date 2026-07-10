"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const workflowStages = [
  { key: "discovery", number: "01", title: "Levantamento e oportunidade", area: "Produto & Comercial", color: "blue", tasks: ["Definir solicitante e responsável", "Registrar preço de venda objetivo", "Estimar demanda e clientes potenciais", "Dimensionar mercado potencial", "Consolidar especificações técnicas", "Registrar proposta de valor e diferenciais"] },
  { key: "viability", number: "02", title: "Viabilidade e aprovações", area: "Comercial & Diretoria", color: "violet", tasks: ["Validar hipótese comercial com MVP", "Executar validação de interesse do mercado", "Realizar análise de procurement", "Avaliar necessidade de certificação", "Validar NCM aplicável", "Analisar benefícios fiscais potenciais", "Calcular margem de contribuição e payback", "Obter aprovação Comercial", "Obter aprovação da Diretoria"] },
  { key: "samples", number: "03", title: "Amostras e suprimentos", area: "Compras & Engenharia", color: "amber", tasks: ["Definir e adquirir amostras", "Cadastrar matéria-prima necessária", "Validar fornecedor e condições de compra", "Emitir solicitação interna de compra", "Confirmar chegada e entrada fiscal dos materiais"] },
  { key: "technical", number: "04", title: "Viabilidade técnica", area: "Engenharia", color: "cyan", tasks: ["Planejar desenvolvimento de hardware e firmware", "Realizar análise cosmética e de embalagem", "Executar testes de bancada", "Executar teste de campo ou cliente final", "Comparar capacidade com o datasheet", "Consolidar melhorias e personalizações", "Decidir sobre necessidade de novas amostras"] },
  { key: "certification", number: "05", title: "Certificações", area: "Qualidade & Engenharia", color: "red", tasks: ["Definir certificações aplicáveis", "Preparar documentação técnica", "Disparar processo de certificação", "Acompanhar ensaios e pendências"] },
  { key: "design", number: "06", title: "Design e apresentação", area: "Produto & Marketing", color: "pink", tasks: ["Desenvolver identidade e aplicação da marca", "Definir embalagem e proteção do produto", "Desenvolver etiquetas e informações obrigatórias", "Validar apresentação final ao cliente"] },
  { key: "industrialization", number: "07", title: "Codificação e industrialização", area: "Engenharia de Produtos", color: "indigo", tasks: ["Definir sequência de código interno", "Reservar código e solicitar estrutura", "Vincular matérias-primas, insumos e embalagem", "Realizar análise e liberar avanço", "Registrar condições e preços de compra", "Incluir item na tabela de preços", "Registrar previsão de chegada", "Validar preço final com a Diretoria", "Liberar movimentações e planejamento interno"] },
  { key: "documentation", number: "08", title: "Documentação do produto", area: "NPI & Engenharia", color: "green", tasks: ["Preencher subsídios de NPI", "Aprovar início da análise documental", "Registrar previsão do NPI", "Validar e aprovar encerramento do NPI", "Preparar inspeção de recebimento", "Preparar especificação de compra", "Publicar datasheet", "Publicar manual do usuário quando aplicável"] },
  { key: "launch", number: "09", title: "Lançamento e divulgação", area: "Marketing & Vendas", color: "orange", tasks: ["Preparar plano de lançamento", "Notificar internamente o novo produto", "Publicar produto no site", "Divulgar nas redes sociais", "Vincular produto à previsão do vendedor responsável"] },
  { key: "monitoring", number: "10", title: "Monitoramento pós-lançamento", area: "Produto & Operações", color: "teal", tasks: ["Monitorar primeiras ordens e entregas", "Comparar resultado com demanda esperada", "Acompanhar margem e retorno", "Registrar feedback de clientes", "Manter backlog de documentação e melhorias"] },
];

const emptyProject = { productCode: "", requester: "", owner: "", targetLaunchDate: "", targetPrice: "", expectedDemand: "", potentialClients: "", marketPotential: "", technicalSpecs: "", developmentReason: "" };
const emptyPackage = { name: "", provisionalCode: "", supplier: "", currency: "BRL", dueDate: "" };
const emptyPackageItem = { code: "", description: "", quantity: "1", unitType: "UN", unitPrice: "", mkp: "1", overhead: "0" };

function FlowIcon({ name }) {
  const paths = { spark: <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z"/>, arrow: <path d="m9 18 6-6-6-6"/>, check: <path d="m5 12 4 4L19 6"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, chevron: <path d="m6 9 6 6 6-6"/>, back: <path d="m15 18-6-6 6-6"/> };
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

function QuotationWorkspace({project,packages,items,selectedPackageId,setSelectedPackageId,showForm,setShowForm,packageForm,setPackageForm,itemForm,setItemForm,createPackage,addItem,updateStatus}) {
  const projectPackages=packages.filter((pkg)=>pkg.project_id===project.id);const selected=packages.find((pkg)=>pkg.id===selectedPackageId);const selectedItems=items.filter((item)=>item.package_id===selectedPackageId);const total=(pkgItems)=>pkgItems.reduce((sum,item)=>sum+Number(item.unit_price)*Number(item.quantity)*Number(item.mkp)*(1+Number(item.overhead_rate)/100),0);
  return <section className="quotation-workspace"><header><div><span className="panel-kicker">Composições complexas</span><h2>Pacotes de cotação</h2><p>Organize chicotes, kits e conjuntos sem misturar todos os componentes.</p></div><button onClick={()=>setShowForm(!showForm)}>+ Novo pacote</button></header>{showForm&&<form className="quotation-package-form" onSubmit={createPackage}><input required value={packageForm.name} onChange={(e)=>setPackageForm({...packageForm,name:e.target.value})} placeholder="Nome do conjunto"/><input value={packageForm.provisionalCode} onChange={(e)=>setPackageForm({...packageForm,provisionalCode:e.target.value})} placeholder="Código provisório"/><input value={packageForm.supplier} onChange={(e)=>setPackageForm({...packageForm,supplier:e.target.value})} placeholder="Fornecedor"/><select value={packageForm.currency} onChange={(e)=>setPackageForm({...packageForm,currency:e.target.value})}><option>BRL</option><option>USD</option></select><input type="date" value={packageForm.dueDate} onChange={(e)=>setPackageForm({...packageForm,dueDate:e.target.value})}/><button>Criar</button></form>}<div className="quotation-layout"><aside>{projectPackages.map((pkg)=>{const packageItems=items.filter((item)=>item.package_id===pkg.id);return <button className={selectedPackageId===pkg.id?"active":""} key={pkg.id} onClick={()=>setSelectedPackageId(pkg.id)}><span><strong>{pkg.name}</strong><small>{packageItems.length} componentes · {pkg.status}</small></span><b>{total(packageItems).toLocaleString(pkg.currency==="USD"?"en-US":"pt-BR",{style:"currency",currency:pkg.currency})}</b></button>})}</aside>{selected&&<div className="quotation-detail"><header><div><strong>{selected.name}</strong><small>{selected.supplier||"Fornecedor não definido"}</small></div><select value={selected.status} onChange={(e)=>updateStatus(selected,e.target.value)}><option value="draft">Em elaboração</option><option value="waiting_supplier">Aguardando fornecedor</option><option value="received">Recebida</option><option value="analysis">Em análise</option><option value="approved">Aprovada</option><option value="rejected">Reprovada</option></select></header><form className="quotation-item-form" onSubmit={addItem}><input value={itemForm.code} onChange={(e)=>setItemForm({...itemForm,code:e.target.value})} placeholder="Código"/><input required value={itemForm.description} onChange={(e)=>setItemForm({...itemForm,description:e.target.value})} placeholder="Componente ou serviço"/><input min=".01" step=".01" type="number" value={itemForm.quantity} onChange={(e)=>setItemForm({...itemForm,quantity:e.target.value})}/><select value={itemForm.unitType} onChange={(e)=>setItemForm({...itemForm,unitType:e.target.value})}>{["UN","PC","KIT","CX","KG","M","L","H"].map(u=><option key={u}>{u}</option>)}</select><input min="0" required step=".01" type="number" value={itemForm.unitPrice} onChange={(e)=>setItemForm({...itemForm,unitPrice:e.target.value})} placeholder="Valor unit."/><input min=".01" step=".01" type="number" value={itemForm.mkp} onChange={(e)=>setItemForm({...itemForm,mkp:e.target.value})} placeholder="MKP"/><input min="0" step=".01" type="number" value={itemForm.overhead} onChange={(e)=>setItemForm({...itemForm,overhead:e.target.value})} placeholder="Overhead %"/><button>Adicionar</button></form><div className="quotation-items">{selectedItems.map((item)=><div key={item.id}><span><strong>{item.description}</strong><small>{item.item_code||"Sem código"} · {item.quantity} {item.unit_type}</small></span><b>{total([item]).toLocaleString(selected.currency==="USD"?"en-US":"pt-BR",{style:"currency",currency:selected.currency})}</b></div>)}</div></div>}</div></section>;
}

export default function NewProductsDashboard({ onOpenProducts }) {
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
  const [taskNotes, setTaskNotes] = useState({});
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [packageItemForm, setPackageItemForm] = useState(emptyPackageItem);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [showPackageForm, setShowPackageForm] = useState(false);

  async function loadWorkflow() {
    const [productsResult, projectsResult, tasksResult, attachmentsResult, historyResult, packagesResult, quotationItemsResult] = await Promise.all([
      supabase.from("products").select("id, code, name, category, owner").order("code"),
      supabase.from("product_development_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("product_development_tasks").select("*").order("sort_order"),
      supabase.from("product_development_task_attachments").select("*").order("created_at"),
      supabase.from("product_launch_date_history").select("*").order("changed_at", { ascending: false }),
      supabase.from("quotation_packages").select("*").order("created_at", { ascending: false }),
      supabase.from("quotation_package_items").select("*").order("created_at"),
    ]);
    if (projectsResult.error || tasksResult.error) { setMessage(`Execute o SQL do fluxo de desenvolvimento: ${projectsResult.error?.message ?? tasksResult.error?.message}`); }
    setProducts(productsResult.data ?? []); setProjects(projectsResult.data ?? []); setTasks(tasksResult.data ?? []);
    setTaskAttachments(attachmentsResult.data ?? []); setLaunchHistory(historyResult.data ?? []);
    setQuotationPackages(packagesResult.data ?? []); setQuotationItems(quotationItemsResult.data ?? []);
  }

  useEffect(() => { loadWorkflow(); }, []);

  const projectData = useMemo(() => projects.map((project) => {
    const product = products.find((item) => item.id === project.product_id);
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const completed = projectTasks.filter((task) => task.status === "completed" || task.status === "not_applicable").length;
    const blocked = projectTasks.filter((task) => task.status === "blocked").length;
    return { ...project, product, projectTasks, completed, blocked, progress: projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0 };
  }), [projects, products, tasks]);

  const selectedProject = projectData.find((project) => project.id === selectedProjectId);
  const average = projectData.length ? Math.round(projectData.reduce((sum, project) => sum + project.progress, 0) / projectData.length) : 0;

  async function createProject(event) {
    event.preventDefault(); const product = products.find((item) => item.code.toLowerCase() === form.productCode.trim().toLowerCase());
    if (!product) { setMessage("Selecione um código de produto válido."); return; }
    if (projects.some((project) => project.product_id === product.id)) { setMessage("Este produto já possui um fluxo de desenvolvimento."); return; }
    setSaving(true); setMessage("");
    const { data, error } = await supabase.from("product_development_projects").insert({ product_id: product.id, requester: form.requester.trim(), owner: form.owner.trim(), target_launch_date: form.targetLaunchDate || null, target_price: form.targetPrice ? Number(form.targetPrice) : null, expected_demand: form.expectedDemand.trim(), potential_clients: form.potentialClients.trim(), market_potential: form.marketPotential.trim(), technical_specs: form.technicalSpecs.trim(), development_reason: form.developmentReason.trim() }).select("*").single();
    if (error) { setMessage(`Não foi possível criar o fluxo: ${error.message}`); setSaving(false); return; }
    let order = 0; const templateTasks = workflowStages.flatMap((stage) => stage.tasks.map((title) => ({ project_id: data.id, stage_key: stage.key, title, owner_area: stage.area, sort_order: order++ })));
    const { data: createdTasks, error: taskError } = await supabase.from("product_development_tasks").insert(templateTasks).select("*");
    if (taskError) { setMessage(`Fluxo criado, mas as tarefas falharam: ${taskError.message}`); } else { setProjects((current) => [data, ...current]); setTasks((current) => [...current, ...(createdTasks ?? [])]); setForm(emptyProject); setShowForm(false); setSelectedProjectId(data.id); setMessage("Fluxo criado com sucesso."); }
    setSaving(false);
  }

  async function updateTask(task, status) {
    const completedAt = status === "completed" ? new Date().toISOString() : null;
    const { error } = await supabase.from("product_development_tasks").update({ status, completed_at: completedAt }).eq("id", task.id);
    if (error) { setMessage(`Não foi possível atualizar: ${error.message}`); return; }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status, completed_at: completedAt } : item));
  }

  async function saveTaskNote(task) {
    const notes = taskNotes[task.id] ?? task.notes ?? "";
    const { error } = await supabase.from("product_development_tasks").update({ notes }).eq("id", task.id);
    if (!error) { setTasks((current)=>current.map((item)=>item.id===task.id?{...item,notes}:item)); setMessage("Observação salva."); }
  }

  async function uploadTaskAttachment(task, file) {
    if (!file) return; const path=`development/${task.project_id}/${task.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
    const { error: uploadError }=await supabase.storage.from("product-files").upload(path,file,{contentType:file.type}); if(uploadError){setMessage(uploadError.message);return;}
    const { data:urlData }=supabase.storage.from("product-files").getPublicUrl(path); const {data,error}=await supabase.from("product_development_task_attachments").insert({task_id:task.id,name:file.name,storage_path:path,public_url:urlData.publicUrl}).select("*").single(); if(!error)setTaskAttachments((current)=>[...current,data]);
  }

  async function changeLaunchDate(value) {
    const oldDate=selectedProject.target_launch_date; if(value===oldDate)return; const reason=window.prompt("Motivo da alteração da data prevista:"); if(!reason?.trim())return;
    const {error}=await supabase.from("product_development_projects").update({target_launch_date:value||null,updated_at:new Date().toISOString()}).eq("id",selectedProject.id); if(error){setMessage(error.message);return;}
    const {data}=await supabase.from("product_launch_date_history").insert({project_id:selectedProject.id,old_date:oldDate||null,new_date:value||null,reason:reason.trim()}).select("*").single(); setProjects((current)=>current.map((p)=>p.id===selectedProject.id?{...p,target_launch_date:value||null}:p)); if(data)setLaunchHistory((current)=>[data,...current]);
  }

  async function createQuotationPackage(event) {
    event.preventDefault(); const {data,error}=await supabase.from("quotation_packages").insert({project_id:selectedProject.id,name:packageForm.name.trim(),provisional_code:packageForm.provisionalCode.trim()||null,supplier:packageForm.supplier.trim()||null,currency:packageForm.currency,due_date:packageForm.dueDate||null}).select("*").single();
    if(error){setMessage(error.message);return;} setQuotationPackages((current)=>[data,...current]);setSelectedPackageId(data.id);setPackageForm(emptyPackage);setShowPackageForm(false);
  }

  async function addQuotationItem(event) {
    event.preventDefault(); const {data,error}=await supabase.from("quotation_package_items").insert({package_id:selectedPackageId,item_code:packageItemForm.code.trim()||null,description:packageItemForm.description.trim(),quantity:Number(packageItemForm.quantity),unit_type:packageItemForm.unitType,unit_price:Number(packageItemForm.unitPrice),mkp:Number(packageItemForm.mkp),overhead_rate:Number(packageItemForm.overhead)}).select("*").single();
    if(error){setMessage(error.message);return;}setQuotationItems((current)=>[...current,data]);setPackageItemForm(emptyPackageItem);
  }

  async function updatePackageStatus(pkg,status){const{data,error}=await supabase.from("quotation_packages").update({status}).eq("id",pkg.id).select("*").single();if(!error)setQuotationPackages((current)=>current.map((item)=>item.id===pkg.id?data:item));}

  if (selectedProject) return (
    <main className="flow-page"><button className="flow-back" onClick={() => setSelectedProjectId(null)}><FlowIcon name="back"/> Voltar aos projetos</button>
      <section className="flow-detail-hero"><div><span>{selectedProject.product?.code}</span><h1>{selectedProject.product?.name}</h1><p>{selectedProject.development_reason || "Fluxo estruturado de desenvolvimento e lançamento."}</p></div><div className="flow-detail-score"><strong>{selectedProject.progress}%</strong><span>concluído</span></div></section>
      <section className="flow-project-info"><div><span>Solicitante</span><strong>{selectedProject.requester || "Não definido"}</strong></div><div><span>Responsável</span><strong>{selectedProject.owner || "Não definido"}</strong></div><div className="launch-date-editor"><span>Lançamento previsto</span><input type="date" value={selectedProject.target_launch_date || ""} onChange={(event)=>changeLaunchDate(event.target.value)} /><small>{launchHistory.filter((item)=>item.project_id===selectedProject.id).length} alterações registradas</small></div><div><span>Preço objetivo</span><strong>{selectedProject.target_price ? Number(selectedProject.target_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não definido"}</strong></div></section>
      {launchHistory.some((item)=>item.project_id===selectedProject.id)&&<details className="launch-history"><summary>Histórico da previsão de lançamento</summary>{launchHistory.filter((item)=>item.project_id===selectedProject.id).map((item)=><div key={item.id}><strong>{item.old_date||"Sem data"} → {item.new_date||"Sem data"}</strong><span>{item.reason}</span><small>{new Date(item.changed_at).toLocaleString("pt-BR")}</small></div>)}</details>}
      <QuotationWorkspace project={selectedProject} packages={quotationPackages} items={quotationItems} selectedPackageId={selectedPackageId} setSelectedPackageId={setSelectedPackageId} showForm={showPackageForm} setShowForm={setShowPackageForm} packageForm={packageForm} setPackageForm={setPackageForm} itemForm={packageItemForm} setItemForm={setPackageItemForm} createPackage={createQuotationPackage} addItem={addQuotationItem} updateStatus={updatePackageStatus} />
      <section className="flow-stage-list">{workflowStages.map((stage) => { const stageTasks=selectedProject.projectTasks.filter((task)=>task.stage_key===stage.key);const done=stageTasks.filter((task)=>["completed","not_applicable"].includes(task.status)).length;const open=expandedStage===stage.key;return <article className={`flow-stage ${open?"open":""}`} key={stage.key}><button className="flow-stage-header" onClick={()=>setExpandedStage(open?"":stage.key)}><span className={`flow-stage-number ${stage.color}`}>{stage.number}</span><div><strong>{stage.title}</strong><small>{stage.area}</small></div><div className="flow-stage-progress"><span>{done}/{stageTasks.length}</span><i><b style={{width:`${stageTasks.length?done/stageTasks.length*100:0}%`}}/></i></div><FlowIcon name="chevron"/></button>{open&&<div className="flow-task-list">{stageTasks.map((task)=><div className={`flow-task-wrap ${task.status}`} key={task.id}><div className="flow-task"><button className="flow-task-check" onClick={()=>updateTask(task,task.status==="completed"?"pending":"completed")}>{task.status==="completed"&&<FlowIcon name="check"/>}</button><span>{task.title}</span><button className="task-detail-trigger" onClick={()=>setExpandedTaskId(expandedTaskId===task.id?null:task.id)}>Observações e anexos</button><select aria-label={`Status de ${task.title}`} value={task.status} onChange={(event)=>updateTask(task,event.target.value)}><option value="pending">Pendente</option><option value="in_progress">Em andamento</option><option value="blocked">Bloqueado</option><option value="completed">Concluído</option><option value="not_applicable">Não aplicável</option></select></div>{expandedTaskId===task.id&&<div className="task-evidence"><label>Observações<textarea rows="3" value={taskNotes[task.id]??task.notes??""} onChange={(event)=>setTaskNotes((current)=>({...current,[task.id]:event.target.value}))}/></label><button onClick={()=>saveTaskNote(task)}>Salvar observação</button><label>Anexar evidência<input type="file" onChange={(event)=>uploadTaskAttachment(task,event.target.files?.[0])}/></label><div>{taskAttachments.filter((item)=>item.task_id===task.id).map((item)=><a href={item.public_url} key={item.id} rel="noreferrer" target="_blank">{item.name}</a>)}</div></div>}</div>)}</div>}</article>;})}</section>
    </main>
  );

  return (
    <main className="flow-page"><section className="flow-hero"><div><span><FlowIcon name="spark"/> Processo PENN</span><h1>Desenvolvimento de novos produtos</h1><p>Da oportunidade ao pós-lançamento: um fluxo único, rastreável e orientado a decisões.</p><div><button onClick={() => setShowForm(true)}>Iniciar novo desenvolvimento</button><button className="secondary" onClick={onOpenProducts}>Abrir catálogo <FlowIcon name="arrow"/></button></div></div><div className="flow-orbit"><strong>{average}%</strong><span>avanço médio</span></div></section>
      <section className="flow-summary"><article><span>Projetos ativos</span><strong>{projectData.length}</strong></article><article><span>Avanço médio</span><strong>{average}%</strong></article><article><span>Tarefas concluídas</span><strong>{tasks.filter((task) => task.status === "completed").length}</strong></article><article className="blocked"><span>Bloqueios</span><strong>{tasks.filter((task) => task.status === "blocked").length}</strong></article></section>
      {message && <p className="flow-message">{message}</p>}
      {showForm && <section className="flow-create"><header><div><span className="panel-kicker">Novo fluxo</span><h2>Dados estratégicos do projeto</h2></div><button onClick={() => setShowForm(false)}>Fechar</button></header><form onSubmit={createProject}><label>Código do produto<input list="flow-products" required value={form.productCode} onChange={(e) => setForm({...form,productCode:e.target.value})}/><datalist id="flow-products">{products.map((p)=><option key={p.id} value={p.code}>{p.name}</option>)}</datalist></label><label>Solicitante<input required value={form.requester} onChange={(e)=>setForm({...form,requester:e.target.value})}/></label><label>Responsável<input required value={form.owner} onChange={(e)=>setForm({...form,owner:e.target.value})}/></label><label>Lançamento previsto<input type="date" value={form.targetLaunchDate} onChange={(e)=>setForm({...form,targetLaunchDate:e.target.value})}/></label><label>Preço objetivo<input min="0" step="0.01" type="number" value={form.targetPrice} onChange={(e)=>setForm({...form,targetPrice:e.target.value})}/></label><label>Demanda esperada<input value={form.expectedDemand} onChange={(e)=>setForm({...form,expectedDemand:e.target.value})}/></label><label className="wide">Clientes potenciais<textarea rows="2" value={form.potentialClients} onChange={(e)=>setForm({...form,potentialClients:e.target.value})}/></label><label className="wide">Mercado potencial<textarea rows="2" value={form.marketPotential} onChange={(e)=>setForm({...form,marketPotential:e.target.value})}/></label><label className="wide">Especificações técnicas<textarea rows="3" value={form.technicalSpecs} onChange={(e)=>setForm({...form,technicalSpecs:e.target.value})}/></label><label className="wide">Por que desenvolver este produto? Qual o diferencial?<textarea required rows="3" value={form.developmentReason} onChange={(e)=>setForm({...form,developmentReason:e.target.value})}/></label><div className="flow-form-action"><button disabled={saving}>{saving ? "Criando fluxo..." : "Criar projeto e checklist"}</button></div></form></section>}
      <section className="flow-projects"><header><div><span className="panel-kicker">Portfólio em desenvolvimento</span><h2>Projetos e evolução</h2></div><span>{projectData.length} projetos</span></header><div>{projectData.map((project)=><button className="flow-project-card" key={project.id} onClick={()=>setSelectedProjectId(project.id)}><span className="flow-project-code">{project.product?.code?.slice(-2)||"NP"}</span><div><strong>{project.product?.name}</strong><small>{project.product?.code} · {project.owner||"Sem responsável"}</small></div><span className="flow-project-meter"><i><b style={{width:`${project.progress}%`}}/></i><strong>{project.progress}%</strong></span>{project.blocked>0&&<span className="flow-blocked">{project.blocked} bloqueios</span>}<FlowIcon name="arrow"/></button>)}{projectData.length===0&&<div className="flow-empty"><FlowIcon name="spark"/><strong>Nenhum desenvolvimento iniciado</strong><span>Crie o primeiro fluxo para transformar a lista antiga em um processo vivo.</span></div>}</div></section>
    </main>
  );
}
