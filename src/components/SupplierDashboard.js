"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import { supabase } from "@/lib/supabaseClient";

const emptySupplier = {
  name: "",
  tax_id: "",
  contact_name: "",
  email: "",
  whatsapp: "",
  phone: "",
  website: "",
  country: "Brasil",
  city: "",
  rating: "",
  status: "active",
  notes: "",
};

const emptyContact = { name: "", role: "", email: "", phone: "", whatsapp: "" };
const supplierFields = {
  name: "Nome",
  tax_id: "CNPJ (opcional)",
  contact_name: "Contato principal",
  email: "E-mail principal",
  whatsapp: "WhatsApp",
  phone: "Telefone",
  website: "Website",
  country: "País",
  city: "Cidade",
};

const statusLabels = {
  active: "Ativo",
  qualification: "Em qualificação",
  blocked: "Bloqueado",
  inactive: "Inativo",
};

function SupplierIcon({ name }) {
  const paths = {
    edit: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z"/><path d="m14 7 3 3"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    materials: <><path d="m21 8-9 5-9-5"/><path d="M3 8l9-5 9 5v8l-9 5-9-5Z"/><path d="M12 13v8"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
    file: <><path d="M7 2h8l4 4v16H7Z"/><path d="M14 2v5h5M10 12h6M10 16h6"/></>,
    money: <><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.7-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1.1 1.8 3 2.2 3 1 3 2.4-1.3 2.4-3.2 2.4c-1.3 0-2.6-.4-3.4-1.2M12.5 5v14"/></>,
    location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
  };

  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

function SupplierFormFields({ form, setForm, advanced = false }) {
  return (
    <>
      {Object.entries(supplierFields).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            required={key === "name"}
            value={form[key] ?? ""}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          />
        </label>
      ))}
      <label>
        Status
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {advanced && (
        <>
          <label>
            Avaliação (0 a 5)
            <input type="number" min="0" max="5" step="0.1" value={form.rating ?? ""} onChange={(event) => setForm({ ...form, rating: event.target.value })}/>
          </label>
          <label className="wide">
            Descrição e observações
            <textarea rows="4" value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })}/>
          </label>
        </>
      )}
    </>
  );
}

function formatMoney(value, currency = "BRL") {
  if (value === null || value === undefined || value === "") {
    return "Preço não informado";
  }

  return Number(value).toLocaleString(currency === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency,
  });
}

export default function SupplierDashboard() {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [structures, setStructures] = useState([]);
  const [materialLinks, setMaterialLinks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [materialAttachments, setMaterialAttachments] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [supplierTab, setSupplierTab] = useState("data");
  const [createForm, setCreateForm] = useState(emptySupplier);
  const [editForm, setEditForm] = useState(emptySupplier);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [editingContact, setEditingContact] = useState(null);
  const [linkMaterial, setLinkMaterial] = useState("");
  const [commercialLink, setCommercialLink] = useState(null);
  const [commercialDraft, setCommercialDraft] = useState({});
  const [message, setMessage] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteVerification, setDeleteVerification] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [materialLinkOpen, setMaterialLinkOpen] = useState(false);

  async function load() {
    const [supplierResult, materialResult, structureResult, linkResult, contactResult, attachmentResult, quotationResult] = await Promise.all([
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("raw_materials").select("id,code,name").order("code"),
      supabase.from("product_structure_items").select("id,product_id,material_code,description,quantity"),
      supabase.from("supplier_materials").select("*"),
      supabase.from("supplier_contacts").select("*").order("created_at"),
      supabase.from("supplier_material_attachments").select("*").order("created_at"),
      supabase.from("supplier_material_quotations").select("*").order("quoted_at", { ascending: false }).limit(30),
    ]);

    const loadError = supplierResult.error || materialResult.error || linkResult.error;
    if (loadError) {
      setMessage(`Não foi possível carregar o SRM: ${loadError.message}`);
    }

    setSuppliers(supplierResult.data ?? []);
    setMaterials(materialResult.data ?? []);
    setStructures(structureResult.data ?? []);
    setMaterialLinks(linkResult.data ?? []);
    setContacts(contactResult.data ?? []);
    setMaterialAttachments(attachmentResult.data ?? []);
    setQuotations(quotationResult.data ?? []);
  }

  useEffect(() => { load(); }, []);

  const selected = suppliers.find((supplier) => supplier.id === selectedId);
  const selectedLinks = useMemo(() => materialLinks.filter((link) => link.supplier_id === selectedId), [materialLinks, selectedId]);
  const selectedContacts = useMemo(() => contacts.filter((contact) => contact.supplier_id === selectedId), [contacts, selectedId]);

  function selectSupplier(id) {
    const supplier = suppliers.find((item) => item.id === id);
    setSelectedId(id);
    setEditForm(supplier ? { ...emptySupplier, ...supplier } : emptySupplier);
    setSupplierTab("data");
    setShowContacts(false);
    setCommercialLink(null);
    setMessage("");
  }

  function payload(form) {
    return {
      name: form.name.trim(),
      tax_id: form.tax_id || null,
      contact_name: form.contact_name || null,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
      phone: form.phone || null,
      website: form.website || null,
      country: form.country || null,
      city: form.city || null,
      rating: form.rating === "" || form.rating === null ? null : Number(form.rating),
      status: form.status,
      notes: form.notes || null,
    };
  }

  async function createSupplier(event) {
    event.preventDefault();
    const { data, error } = await supabase.from("suppliers").insert(payload(createForm)).select("*").single();
    if (error) { setMessage(error.message); return; }
    setSuppliers((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateForm(emptySupplier);
    setCreateOpen(false);
    setSelectedId(data.id);
    setEditForm({ ...emptySupplier, ...data });
    setMessage("Fornecedor cadastrado com sucesso.");
  }

  async function updateSupplier(event) {
    event.preventDefault();
    const { data, error } = await supabase
      .from("suppliers")
      .update({ ...payload(editForm), updated_at: new Date().toISOString() })
      .eq("id", selectedId)
      .select("*")
      .single();
    if (error) { setMessage(error.message); return; }
    setSuppliers((current) => current.map((supplier) => supplier.id === data.id ? data : supplier).sort((a, b) => a.name.localeCompare(b.name)));
    setEditForm({ ...emptySupplier, ...data });
    setEditOpen(false);
    setMessage("Dados do fornecedor atualizados.");
  }

  function openContact(contact = null) {
    setEditingContact(contact);
    setContactForm(contact ? { ...emptyContact, ...contact } : emptyContact);
    setContactOpen(true);
  }

  async function saveContact(event) {
    event.preventDefault();
    const values = {
      name: contactForm.name.trim(),
      role: contactForm.role || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      whatsapp: contactForm.whatsapp || null,
    };
    const query = editingContact
      ? supabase.from("supplier_contacts").update(values).eq("id", editingContact.id)
      : supabase.from("supplier_contacts").insert({ ...values, supplier_id: selectedId });
    const { data, error } = await query.select("*").single();
    if (error) { setMessage(error.message); return; }
    setContacts((current) => editingContact
      ? current.map((contact) => contact.id === data.id ? data : contact)
      : [...current, data]
    );
    setContactOpen(false);
    setEditingContact(null);
    setContactForm(emptyContact);
    setMessage(editingContact ? "Contato atualizado." : "Contato adicional cadastrado.");
  }

  async function removeContact(id) {
    if (!window.confirm("Excluir este contato adicional?")) { return; }
    const { error } = await supabase.from("supplier_contacts").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    setContacts((current) => current.filter((contact) => contact.id !== id));
  }

  async function addMaterial(event) {
    event.preventDefault();
    const material = materials.find((item) => item.code.toLowerCase() === linkMaterial.trim().toLowerCase() || String(item.id) === linkMaterial);
    if (!material) { setMessage("Matéria-prima não encontrada. Digite um código cadastrado."); return; }
    const row = { supplier_id: selectedId, raw_material_id: material.id, currency: "BRL" };
    const { data, error } = await supabase.from("supplier_materials").upsert(row).select("*").single();
    if (error) { setMessage(error.message); return; }
    setMaterialLinks((current) => [...current.filter((item) => !(item.supplier_id === selectedId && item.raw_material_id === row.raw_material_id)), data]);
    setLinkMaterial("");
    setMaterialLinkOpen(false);
    setMessage("Matéria-prima vinculada ao fornecedor.");
  }

  function openCommercialConditions(link) {
    setCommercialLink(link);
    setCommercialDraft({
      supplier_part_number: link.supplier_part_number ?? "",
      last_price: link.last_price ?? "",
      currency: link.currency ?? "BRL",
      minimum_order: link.minimum_order ?? "",
    });
  }

  async function saveMaterial(event) {
    event.preventDefault();
    if (!commercialLink) { return; }
    const values = {
      supplier_part_number: commercialDraft.supplier_part_number || null,
      last_price: commercialDraft.last_price === "" ? null : Number(commercialDraft.last_price),
      currency: commercialDraft.currency || "BRL",
      minimum_order: commercialDraft.minimum_order === "" ? null : Number(commercialDraft.minimum_order),
    };
    const { data, error } = await supabase
      .from("supplier_materials")
      .update(values)
      .eq("supplier_id", selectedId)
      .eq("raw_material_id", commercialLink.raw_material_id)
      .select("*")
      .single();
    if (error) { setMessage(error.message); return; }
    if (values.last_price !== null) {
      const { data: quote, error: quoteError } = await supabase.from("supplier_material_quotations").insert({
        supplier_id: selectedId,
        raw_material_id: commercialLink.raw_material_id,
        supplier_part_number: values.supplier_part_number,
        unit_price: values.last_price,
        currency: values.currency,
        minimum_order: values.minimum_order,
      }).select("*").single();
      if (quoteError) { setMessage(`Condições salvas, mas a cotação não foi registrada: ${quoteError.message}`); return; }
      setQuotations((current) => [quote, ...current].slice(0, 30));
    }
    setMaterialLinks((current) => current.map((link) => link.supplier_id === selectedId && link.raw_material_id === data.raw_material_id ? data : link));
    setCommercialLink(null);
    setMessage(values.last_price === null ? "Condições atualizadas." : "Condições salvas e cotação registrada.");
  }

  async function removeMaterial(rawMaterialId) {
    if (!window.confirm("Remover esta matéria-prima do fornecedor?")) { return; }
    const files = materialAttachments.filter((item) => item.supplier_id === selectedId && item.raw_material_id === rawMaterialId);
    const { error } = await supabase.from("supplier_materials").delete().eq("supplier_id", selectedId).eq("raw_material_id", rawMaterialId);
    if (error) { setMessage(error.message); return; }
    if (files.length) { await supabase.storage.from("product-files").remove(files.map((file) => file.storage_path)); }
    setMaterialLinks((current) => current.filter((link) => !(link.supplier_id === selectedId && link.raw_material_id === rawMaterialId)));
    setMaterialAttachments((current) => current.filter((item) => !(item.supplier_id === selectedId && item.raw_material_id === rawMaterialId)));
    setCommercialLink(null);
  }

  async function uploadMaterialAttachment(link, file) {
    if (!file) { return; }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `supplier-materials/${selectedId}/${link.raw_material_id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("product-files").upload(storagePath, file);
    if (uploadError) { setMessage(uploadError.message); return; }
    const { data: urlData } = supabase.storage.from("product-files").getPublicUrl(storagePath);
    const { data, error } = await supabase.from("supplier_material_attachments").insert({
      supplier_id: selectedId,
      raw_material_id: link.raw_material_id,
      name: file.name,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
    }).select("*").single();
    if (error) { await supabase.storage.from("product-files").remove([storagePath]); setMessage(error.message); return; }
    setMaterialAttachments((current) => [...current, data]);
    setMessage("Anexo adicionado à matéria-prima.");
  }

  async function removeMaterialAttachment(item) {
    if (!window.confirm(`Excluir ${item.name}?`)) { return; }
    const { error } = await supabase.from("supplier_material_attachments").delete().eq("id", item.id);
    if (error) { setMessage(error.message); return; }
    await supabase.storage.from("product-files").remove([item.storage_path]);
    setMaterialAttachments((current) => current.filter((attachment) => attachment.id !== item.id));
  }

  async function deleteSupplier(event) {
    event.preventDefault();
    if (!selected || deleteVerification.trim() !== selected.name) { return; }
    const files = materialAttachments.filter((item) => item.supplier_id === selected.id);
    const { error } = await supabase.from("suppliers").delete().eq("id", selected.id);
    if (error) { setMessage(error.message); return; }
    if (files.length) { await supabase.storage.from("product-files").remove(files.map((file) => file.storage_path)); }
    setSuppliers((current) => current.filter((supplier) => supplier.id !== selected.id));
    setMaterialLinks((current) => current.filter((link) => link.supplier_id !== selected.id));
    setContacts((current) => current.filter((contact) => contact.supplier_id !== selected.id));
    setMaterialAttachments((current) => current.filter((item) => item.supplier_id !== selected.id));
    setSelectedId(null);
    setDeleteOpen(false);
    setDeleteVerification("");
    setMessage("Fornecedor excluído com sucesso.");
  }

  const selectedMaterial = commercialLink ? materials.find((material) => material.id === commercialLink.raw_material_id) : null;
  const selectedMaterialAttachments = commercialLink ? materialAttachments.filter((item) => item.supplier_id === selectedId && item.raw_material_id === commercialLink.raw_material_id) : [];
  const averageRating = suppliers.filter((supplier) => Number(supplier.rating) > 0).reduce((sum, supplier) => sum + Number(supplier.rating), 0) / Math.max(1, suppliers.filter((supplier) => Number(supplier.rating) > 0).length);

  return (
    <main className="supplier-page">
      <section className="supplier-hero">
        <div><span>Supplier Relationship Management</span><h1>Fornecedores</h1><p>Gerencie sua rede, contatos e matérias-primas fornecidas em um único espaço.</p></div>
        <div className="supplier-hero-metrics"><span><strong>{suppliers.length}</strong><small>fornecedores</small></span><span><strong>{materialLinks.length}</strong><small>itens fornecidos</small></span><span><strong>{averageRating ? averageRating.toFixed(1) : "—"}</strong><small>avaliação média</small></span></div>
      </section>

      <nav className="supplier-main-tabs">
        <button className="active" type="button">Rede de fornecedores <b>{suppliers.length}</b></button>
        <button className="supplier-new-trigger" onClick={() => setCreateOpen(true)} type="button"><SupplierIcon name="plus"/>Novo fornecedor</button>
      </nav>

      {message && <p className="supplier-message">{message}</p>}

      {quotations.length > 0 && (
        <section className="latest-quotations">
          <header><div><span>Radar de compras</span><h2>Últimas cotações</h2></div><small>Atualizado ao salvar condições comerciais</small></header>
          <div>{quotations.slice(0, 5).map((quote) => { const material = materials.find((item) => item.id === quote.raw_material_id); const supplier = suppliers.find((item) => item.id === quote.supplier_id); return <article key={quote.id}><time>{new Date(quote.quoted_at).toLocaleDateString("pt-BR")}</time><a href={`/materias-primas/${quote.raw_material_id}`}>{material?.code || "Matéria-prima"}</a><span>{supplier?.name || "Fornecedor"}</span><strong>{formatMoney(quote.unit_price, quote.currency)}</strong></article>; })}</div>
        </section>
      )}

      <section className="supplier-layout enhanced">
        <aside>
          <span className="supplier-list-kicker">Sua rede</span>
          <h2>Fornecedores cadastrados</h2>
          <div className="supplier-list-search"><input aria-label="Buscar fornecedor" onChange={(event) => setSupplierSearch(event.target.value)} placeholder="Buscar por nome..." type="search" value={supplierSearch}/></div>
          {suppliers.filter((supplier) => `${supplier.name} ${supplier.city || ""} ${supplier.country || ""}`.toLowerCase().includes(supplierSearch.trim().toLowerCase())).map((supplier) => (
            <button className={selectedId === supplier.id ? "active" : ""} onClick={() => selectSupplier(supplier.id)} key={supplier.id} type="button">
              <span className={`supplier-list-avatar ${supplier.status}`}>{supplier.name.slice(0, 2).toUpperCase()}</span>
              <span><strong>{supplier.name}</strong><small>{supplier.city || supplier.country || "Local não informado"}</small></span>
              <i className={`supplier-presence-status ${supplier.status}`}/>
            </button>
          ))}
        </aside>

        <section className="supplier-detail">
          {selected ? (
            <>
              <header className="supplier-detail-heading">
                <div><span>Fornecedor selecionado</span><h2>{selected.name}</h2><small>{[selected.city, selected.country].filter(Boolean).join(" · ") || "Localização não informada"}</small></div>
                <span className={`supplier-status ${selected.status}`}>{statusLabels[selected.status] || selected.status}</span>
              </header>

              <section className="supplier-action-grid">
                <button onClick={() => { setEditForm({ ...emptySupplier, ...selected }); setEditOpen(true); }} type="button"><span><SupplierIcon name="edit"/></span><div><strong>Editar cadastro</strong><small>Dados, status e avaliação</small></div><SupplierIcon name="arrow"/></button>
                <button onClick={() => { setSupplierTab("data"); setShowContacts(true); }} type="button"><span><SupplierIcon name="users"/></span><div><strong>Contatos</strong><small>{selectedContacts.length} contatos adicionais</small></div><SupplierIcon name="arrow"/></button>
                <button onClick={() => setSupplierTab("materials")} type="button"><span><SupplierIcon name="materials"/></span><div><strong>Matérias-primas</strong><small>{selectedLinks.length} itens fornecidos</small></div><SupplierIcon name="arrow"/></button>
              </section>

              <nav className="supplier-detail-tabs">
                <button className={supplierTab === "data" ? "active" : ""} onClick={() => setSupplierTab("data")} type="button">Dados e contatos</button>
                <button className={supplierTab === "materials" ? "active" : ""} onClick={() => setSupplierTab("materials")} type="button">Matérias-primas <b>{selectedLinks.length}</b></button>
              </nav>

              {supplierTab === "data" && (
                <div className="supplier-data-tab">
                  <div className="supplier-contact-grid">
                    <div><small>Contato principal</small><strong>{selected.contact_name || "Não informado"}</strong></div>
                    <div><small>E-mail</small><strong>{selected.email || "Não informado"}</strong></div>
                    <div><small>WhatsApp</small><strong>{selected.whatsapp || "Não informado"}</strong></div>
                    <div><small>Telefone</small><strong>{selected.phone || "Não informado"}</strong></div>
                    <div><small>Localização</small><strong>{[selected.city, selected.country].filter(Boolean).join(" · ") || "Não informada"}</strong></div>
                    <div><small>Avaliação</small><strong>{selected.rating ? `${selected.rating}/5` : "Sem avaliação"}</strong></div>
                  </div>
                  <div className="supplier-description"><small>Descrição</small><p>{selected.notes || "Nenhuma descrição informada."}</p></div>

                  <button className="supplier-secondary-trigger" onClick={() => setShowContacts((value) => !value)} type="button">
                    <SupplierIcon name="users"/>{showContacts ? "Ocultar contatos adicionais" : `Ver contatos adicionais (${selectedContacts.length})`}
                  </button>

                  {showContacts && (
                    <section className="supplier-contacts">
                      <header><div><span>Equipe de contato</span><h3>Contatos adicionais</h3></div><button onClick={() => openContact()} type="button"><SupplierIcon name="plus"/>Adicionar contato</button></header>
                      <div className="supplier-contact-list">
                        {selectedContacts.map((contact) => (
                          <article key={contact.id}>
                            <span className="supplier-contact-avatar">{contact.name.slice(0, 2).toUpperCase()}</span>
                            <div><strong>{contact.name}</strong><small>{contact.role || "Função não informada"} · {contact.email || contact.phone || "Sem canal informado"}</small></div>
                            <span className="supplier-contact-row-actions"><button onClick={() => openContact(contact)} type="button">Editar</button><button onClick={() => removeContact(contact.id)} type="button">Excluir</button></span>
                          </article>
                        ))}
                        {!selectedContacts.length && <p>Nenhum contato adicional cadastrado.</p>}
                      </div>
                    </section>
                  )}

                  <button className="supplier-danger-zone-trigger" onClick={() => { setDeleteVerification(""); setDeleteOpen(true); }} type="button"><SupplierIcon name="trash"/>Excluir fornecedor</button>
                </div>
              )}

              {supplierTab === "materials" && (
                <section className="supplier-materials-tab">
                  <header><div><span>Portfólio do fornecedor</span><h3>Matérias-primas fornecidas</h3></div><button className="supplier-material-add" onClick={() => setMaterialLinkOpen(true)} type="button"><SupplierIcon name="plus"/>Vincular matéria-prima</button></header>
                  <div className="supplier-material-list compact">
                    {selectedLinks.map((link) => { const material = materials.find((item) => item.id === link.raw_material_id); const uses = structures.filter((structure) => structure.material_code === material?.code); return (
                      <article key={link.raw_material_id}>
                        <span className="supplier-material-symbol"><SupplierIcon name="materials"/></span>
                        <div><strong>{material?.name || "Matéria-prima"}</strong><small>{material?.code || "Sem código"} · usada em {uses.length} estruturas</small></div>
                        <span className="supplier-material-price"><small>Último preço</small><strong>{formatMoney(link.last_price, link.currency)}</strong></span>
                        <button className="material-commercial-trigger" onClick={() => openCommercialConditions(link)} type="button">Condições comerciais <SupplierIcon name="arrow"/></button>
                      </article>
                    ); })}
                    {!selectedLinks.length && <div className="supplier-empty"><strong>Nenhuma matéria-prima vinculada</strong><span>Use o botão acima para montar o portfólio deste fornecedor.</span></div>}
                  </div>
                </section>
              )}
            </>
          ) : <div className="supplier-empty"><strong>Selecione um fornecedor</strong><span>Os dados, contatos e matérias-primas serão exibidos aqui.</span></div>}
        </section>
      </section>

      <FormModal description="Registre os dados principais. Contatos e matérias-primas poderão ser vinculados em seguida." eyebrow="Cadastro SRM" onClose={() => setCreateOpen(false)} open={createOpen} size="large" title="Novo fornecedor">
        <form className="modal-form supplier-modal-form" onSubmit={createSupplier}><SupplierFormFields form={createForm} setForm={setCreateForm}/><footer className="modal-form-actions"><button onClick={() => setCreateOpen(false)} type="button">Cancelar</button><button type="submit">Cadastrar fornecedor</button></footer></form>
      </FormModal>

      <FormModal description="Atualize os dados corporativos, o status de homologação e a avaliação deste fornecedor." eyebrow="Gestão do fornecedor" onClose={() => setEditOpen(false)} open={editOpen} size="large" title={`Editar ${selected?.name || "fornecedor"}`}>
        <form className="modal-form supplier-modal-form" onSubmit={updateSupplier}><SupplierFormFields advanced form={editForm} setForm={setEditForm}/><footer className="modal-form-actions"><button onClick={() => setEditOpen(false)} type="button">Cancelar</button><button type="submit">Salvar alterações</button></footer></form>
      </FormModal>

      <FormModal description={editingContact ? "Atualize os dados de contato da pessoa selecionada." : `O contato será vinculado a ${selected?.name || "este fornecedor"}.`} eyebrow="Equipe do fornecedor" onClose={() => setContactOpen(false)} open={contactOpen} title={editingContact ? "Editar contato" : "Adicionar contato"}>
        <form className="modal-form" onSubmit={saveContact}><label>Nome<input autoFocus required value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}/></label><label>Cargo ou área<input value={contactForm.role} onChange={(event) => setContactForm({ ...contactForm, role: event.target.value })}/></label><label className="wide">E-mail<input type="email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}/></label><label>Telefone<input value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })}/></label><label>WhatsApp<input value={contactForm.whatsapp} onChange={(event) => setContactForm({ ...contactForm, whatsapp: event.target.value })}/></label><footer className="modal-form-actions"><button onClick={() => setContactOpen(false)} type="button">Cancelar</button><button type="submit">Salvar contato</button></footer></form>
      </FormModal>

      <FormModal description={`Selecione uma matéria-prima cadastrada para vinculá-la a ${selected?.name || "este fornecedor"}.`} eyebrow="Portfólio do fornecedor" onClose={() => setMaterialLinkOpen(false)} open={materialLinkOpen} title="Vincular matéria-prima">
        <form className="modal-form" onSubmit={addMaterial}><label className="wide">Código da matéria-prima<input autoFocus list="supplier-material-options" value={linkMaterial} onChange={(event) => setLinkMaterial(event.target.value)} placeholder="Digite o código da matéria-prima" required/><datalist id="supplier-material-options">{materials.filter((material) => !selectedLinks.some((link) => link.raw_material_id === material.id)).map((material) => <option key={material.id} value={material.code}>{material.name}</option>)}</datalist></label><footer className="modal-form-actions"><button onClick={() => setMaterialLinkOpen(false)} type="button">Cancelar</button><button type="submit">Vincular matéria-prima</button></footer></form>
      </FormModal>

      <FormModal description={`${selectedMaterial?.code || "Item"} · ${selectedMaterial?.name || "Matéria-prima"}`} eyebrow="Condições comerciais" onClose={() => setCommercialLink(null)} open={Boolean(commercialLink)} size="large" title="Negociação com o fornecedor">
        {commercialLink && <form className="supplier-commercial-modal" onSubmit={saveMaterial}>
          <section className="supplier-commercial-summary"><span><SupplierIcon name="money"/></span><div><strong>{formatMoney(commercialDraft.last_price, commercialDraft.currency)}</strong><small>Preço atual informado</small></div><div><strong>{structures.filter((structure) => structure.material_code === selectedMaterial?.code).length}</strong><small>estruturas utilizam este item</small></div></section>
          <div className="supplier-commercial-fields"><label>P/N do fornecedor<input value={commercialDraft.supplier_part_number || ""} onChange={(event) => setCommercialDraft({ ...commercialDraft, supplier_part_number: event.target.value })}/></label><label>Último preço<input type="number" min="0" step="0.01" value={commercialDraft.last_price ?? ""} onChange={(event) => setCommercialDraft({ ...commercialDraft, last_price: event.target.value })}/></label><label>Moeda<select value={commercialDraft.currency || "BRL"} onChange={(event) => setCommercialDraft({ ...commercialDraft, currency: event.target.value })}><option>BRL</option><option>USD</option></select></label><label>Pedido mínimo<input type="number" min="0" step="0.01" value={commercialDraft.minimum_order ?? ""} onChange={(event) => setCommercialDraft({ ...commercialDraft, minimum_order: event.target.value })}/></label></div>
          <section className="supplier-material-attachments"><label><SupplierIcon name="file"/>Adicionar anexo<input type="file" onChange={(event) => { uploadMaterialAttachment(commercialLink, event.target.files?.[0]); event.target.value = ""; }}/></label><div>{selectedMaterialAttachments.map((item) => <span key={item.id}><a href={item.public_url} target="_blank" rel="noreferrer">{item.name}</a><button aria-label={`Excluir ${item.name}`} onClick={() => removeMaterialAttachment(item)} type="button">×</button></span>)}{!selectedMaterialAttachments.length && <small>Nenhum anexo comercial</small>}</div></section>
          <footer className="supplier-commercial-actions"><button className="danger" onClick={() => removeMaterial(commercialLink.raw_material_id)} type="button">Remover vínculo</button><span/><button onClick={() => setCommercialLink(null)} type="button">Cancelar</button><button type="submit">Salvar condições</button></footer>
        </form>}
      </FormModal>

      <FormModal description="Esta ação remove contatos, vínculos e anexos relacionados. Ela não pode ser desfeita." eyebrow="Zona de segurança" onClose={() => setDeleteOpen(false)} open={deleteOpen} title="Excluir fornecedor">
        <form className="supplier-delete-confirm" onSubmit={deleteSupplier}><p>Para confirmar, digite exatamente <strong>{selected?.name}</strong>.</p><input autoFocus value={deleteVerification} onChange={(event) => setDeleteVerification(event.target.value)} placeholder="Nome completo do fornecedor"/><footer className="modal-form-actions"><button onClick={() => setDeleteOpen(false)} type="button">Cancelar</button><button className="danger" disabled={deleteVerification.trim() !== selected?.name} type="submit">Excluir definitivamente</button></footer></form>
      </FormModal>
    </main>
  );
}
