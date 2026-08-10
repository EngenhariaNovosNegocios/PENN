"use client";

import { useEffect, useMemo, useState } from "react";
import FormModal from "@/components/FormModal";
import { supabase } from "@/lib/supabaseClient";

const emptyPackage = {
  name: "",
  provisionalCode: "",
  supplier: "",
  dueDate: "",
};

const emptyItem = {
  description: "",
  quantity: "1",
  unitType: "UN",
  unitPrice: "",
  overhead: "0",
  currency: "BRL",
  exchangeRate: "1",
  ncm: "",
  partNumber: "",
  sapCode: "",
  applyIpi: false,
  applyPis: false,
  applyCofins: false,
  applyIcms: false,
  applyImportTax: false,
};

const packageStatus = {
  draft: "Em elaboração",
  waiting_supplier: "Aguardando fornecedor",
  received: "Recebida",
  analysis: "Em análise",
  approved: "Aprovada",
  rejected: "Reprovada",
};

function CompositionIcon({ name }) {
  const paths = {
    layers: <><path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
  };

  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ProductCompositions({ product }) {
  const [packages, setPackages] = useState([]);
  const [items, setItems] = useState([]);
  const [ncmTaxes, setNcmTaxes] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [packageOpen, setPackageOpen] = useState(false);
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [editingItemId, setEditingItemId] = useState(null);
  const [deletingPackage, setDeletingPackage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCompositions() {
    if (!product?.id) return;

    setLoading(true);
    setMessage("");
    const [packagesResult, taxesResult] = await Promise.all([
      supabase
        .from("quotation_packages")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false }),
      supabase.from("ncm_taxes").select("*").order("ncm"),
    ]);

    if (packagesResult.error) {
      setPackages([]);
      setItems([]);
      setMessage("Atualize o SQL do projeto para habilitar composições vinculadas ao produto.");
      setLoading(false);
      return;
    }

    const nextPackages = packagesResult.data ?? [];
    const packageIds = nextPackages.map((item) => item.id);
    let nextItems = [];

    if (packageIds.length) {
      const itemsResult = await supabase
        .from("quotation_package_items")
        .select("*")
        .in("package_id", packageIds)
        .order("created_at");

      if (itemsResult.error) setMessage(itemsResult.error.message);
      else nextItems = itemsResult.data ?? [];
    }

    setPackages(nextPackages);
    setItems(nextItems);
    setNcmTaxes(taxesResult.data ?? []);
    setSelectedPackageId((current) => (
      nextPackages.some((item) => item.id === current)
        ? current
        : nextPackages[0]?.id ?? null
    ));
    setLoading(false);
  }

  useEffect(() => {
    loadCompositions();
  }, [product?.id]);

  const selectedPackage = packages.find((item) => item.id === selectedPackageId);
  const selectedItems = items.filter((item) => item.package_id === selectedPackageId);

  function calculateItem(item) {
    const exchangeRate = item.currency === "USD" ? Number(item.exchange_rate || 0) : 1;
    const exw = Number(item.unit_price || 0) * Number(item.quantity || 0) * exchangeRate;
    const fob = exw * (1 + Number(item.overhead_rate || 0) / 100);
    const tax = ncmTaxes.find((row) => row.ncm === item.ncm);
    const rate =
      (item.apply_ipi ? Number(tax?.ipi_rate || 0) : 0)
      + (item.apply_pis ? Number(tax?.pis_rate || 0) : 0)
      + (item.apply_cofins ? Number(tax?.cofins_rate || 0) : 0)
      + (item.apply_icms ? Number(tax?.icms_rate || 0) : 0)
      + (item.apply_import_tax ? Number(tax?.import_tax_rate || 0) : 0);

    return { exw, fob, net: fob * (1 + rate / 100) };
  }

  function packageTotals(pkg) {
    return items
      .filter((item) => item.package_id === pkg.id)
      .reduce((total, item) => {
        const value = calculateItem(item);
        return {
          exw: total.exw + value.exw,
          fob: total.fob + value.fob,
          net: total.net + value.net,
        };
      }, { exw: 0, fob: 0, net: 0 });
  }

  const consolidated = useMemo(() => packages
    .filter((item) => item.include_in_total)
    .reduce((total, item) => {
      const value = packageTotals(item);
      return {
        exw: total.exw + value.exw,
        fob: total.fob + value.fob,
        net: total.net + value.net,
      };
    }, { exw: 0, fob: 0, net: 0 }), [packages, items, ncmTaxes]);

  async function createPackage(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase
      .from("quotation_packages")
      .insert({
        product_id: product.id,
        project_id: null,
        name: packageForm.name.trim(),
        provisional_code: packageForm.provisionalCode.trim() || null,
        supplier: packageForm.supplier.trim() || null,
        currency: "BRL",
        due_date: packageForm.dueDate || null,
        include_in_total: false,
      })
      .select("*")
      .single();

    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setPackages((current) => [data, ...current]);
    setSelectedPackageId(data.id);
    setPackageForm(emptyPackage);
    setPackageOpen(false);
  }

  function editItem(item) {
    setEditingItemId(item.id);
    setItemForm({
      description: item.description || "",
      quantity: String(item.quantity ?? 1),
      unitType: item.unit_type || "UN",
      unitPrice: String(item.unit_price ?? ""),
      overhead: String(item.overhead_rate ?? 0),
      currency: item.currency || "BRL",
      exchangeRate: String(item.exchange_rate ?? 1),
      ncm: item.ncm || "",
      partNumber: item.item_code || "",
      sapCode: item.sap_code || "",
      applyIpi: Boolean(item.apply_ipi),
      applyPis: Boolean(item.apply_pis),
      applyCofins: Boolean(item.apply_cofins),
      applyIcms: Boolean(item.apply_icms),
      applyImportTax: Boolean(item.apply_import_tax),
    });
    setItemOpen(true);
  }

  function closeItemModal() {
    setItemOpen(false);
    setEditingItemId(null);
    setItemForm(emptyItem);
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!selectedPackageId) return;

    setSaving(true);
    setMessage("");
    const payload = {
      package_id: selectedPackageId,
      item_code: itemForm.partNumber.trim() || null,
      sap_code: itemForm.sapCode.trim() || null,
      description: itemForm.description.trim(),
      quantity: Number(itemForm.quantity),
      unit_type: itemForm.unitType,
      unit_price: Number(itemForm.unitPrice),
      mkp: 1,
      overhead_rate: Number(itemForm.overhead || 0),
      currency: itemForm.currency,
      exchange_rate: itemForm.currency === "USD" ? Number(itemForm.exchangeRate) : 1,
      ncm: itemForm.ncm.trim() || null,
      apply_ipi: itemForm.applyIpi,
      apply_pis: itemForm.applyPis,
      apply_cofins: itemForm.applyCofins,
      apply_icms: itemForm.applyIcms,
      apply_import_tax: itemForm.applyImportTax,
    };

    const query = editingItemId
      ? supabase.from("quotation_package_items").update(payload).eq("id", editingItemId)
      : supabase.from("quotation_package_items").insert(payload);
    const { data, error } = await query.select("*").single();

    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setItems((current) => editingItemId
      ? current.map((item) => item.id === data.id ? data : item)
      : [...current, data]);
    closeItemModal();
  }

  async function updatePackage(pkg, changes) {
    const { data, error } = await supabase
      .from("quotation_packages")
      .update(changes)
      .eq("id", pkg.id)
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setPackages((current) => current.map((item) => item.id === data.id ? data : item));
  }

  async function clonePackage(pkg) {
    setSaving(true);
    const { data: clone, error } = await supabase
      .from("quotation_packages")
      .insert({
        product_id: product.id,
        project_id: null,
        name: `${pkg.name} (cópia)`,
        provisional_code: pkg.provisional_code,
        supplier: pkg.supplier,
        currency: pkg.currency || "BRL",
        due_date: pkg.due_date,
        status: "draft",
        include_in_total: false,
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    const sourceItems = items.filter((item) => item.package_id === pkg.id);
    let clonedItems = [];
    if (sourceItems.length) {
      const rows = sourceItems.map(({ id: itemId, created_at: itemCreatedAt, ...item }) => ({ ...item, package_id: clone.id }));
      const result = await supabase.from("quotation_package_items").insert(rows).select("*");
      if (result.error) setMessage(result.error.message);
      else clonedItems = result.data ?? [];
    }

    setPackages((current) => [clone, ...current]);
    setItems((current) => [...current, ...clonedItems]);
    setSelectedPackageId(clone.id);
    setSaving(false);
  }

  async function deletePackage() {
    if (!deletingPackage) return;

    setSaving(true);
    const { error } = await supabase
      .from("quotation_packages")
      .delete()
      .eq("id", deletingPackage.id);

    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    const nextPackage = packages.find((item) => item.id !== deletingPackage.id);
    setPackages((current) => current.filter((item) => item.id !== deletingPackage.id));
    setItems((current) => current.filter((item) => item.package_id !== deletingPackage.id));
    setSelectedPackageId((current) => current === deletingPackage.id ? nextPackage?.id ?? null : current);
    setDeletingPackage(null);
  }

  async function deleteItem(item) {
    const { error } = await supabase.from("quotation_package_items").delete().eq("id", item.id);
    if (error) setMessage(error.message);
    else setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
  }

  if (loading) {
    return <div className="composition-loading">Carregando composições deste produto...</div>;
  }

  return (
    <section className="product-compositions">
      <header className="composition-heading">
        <div>
          <span className="panel-kicker">Custos vinculados</span>
          <h3>Composições de {product.code}</h3>
          <p>Cada pacote pertence exclusivamente a este produto.</p>
        </div>
        <button onClick={() => setPackageOpen(true)} type="button"><CompositionIcon name="plus"/>Nova composição</button>
      </header>

      {message && <div className="composition-message" role="status">{message}</div>}

      <div className="composition-totals">
        <div><span>EXW consolidado</span><strong>{formatMoney(consolidated.exw)}</strong></div>
        <div><span>FOB consolidado</span><strong>{formatMoney(consolidated.fob)}</strong></div>
        <div className="net"><span>NET com impostos</span><strong>{formatMoney(consolidated.net)}</strong></div>
      </div>

      <div className="composition-workspace">
        <aside className="composition-package-list">
          {packages.map((pkg) => {
            const totals = packageTotals(pkg);
            const packageItems = items.filter((item) => item.package_id === pkg.id);
            return (
              <article className={selectedPackageId === pkg.id ? "active" : ""} key={pkg.id}>
                <button className="composition-package-select" onClick={() => setSelectedPackageId(pkg.id)} type="button">
                  <span className="composition-package-icon"><CompositionIcon name="layers"/></span>
                  <span><strong>{pkg.name}</strong><small>{packageItems.length} componentes · {packageStatus[pkg.status] || pkg.status}</small></span>
                  <b>{formatMoney(totals.net)}</b>
                </button>
                <label className="composition-package-check"><input checked={Boolean(pkg.include_in_total)} onChange={(event) => updatePackage(pkg, { include_in_total: event.target.checked })} type="checkbox"/>Somar ao total</label>
              </article>
            );
          })}
          {!packages.length && <div className="composition-empty"><CompositionIcon name="layers"/><strong>Nenhuma composição cadastrada</strong><span>Crie o primeiro pacote de custos deste produto.</span></div>}
        </aside>

        {selectedPackage ? (
          <section className="composition-detail">
            <header>
              <div><span>{selectedPackage.provisional_code || product.code}</span><h4>{selectedPackage.name}</h4><small>{selectedPackage.supplier || "Fornecedor não definido"}</small></div>
              <div className="composition-detail-actions">
                <select aria-label="Status da composição" value={selectedPackage.status} onChange={(event) => updatePackage(selectedPackage, { status: event.target.value })}>{Object.entries(packageStatus).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <button disabled={saving} onClick={() => clonePackage(selectedPackage)} title="Duplicar composição" type="button"><CompositionIcon name="copy"/>Duplicar</button>
                <button className="danger" onClick={() => setDeletingPackage(selectedPackage)} title="Excluir composição" type="button"><CompositionIcon name="trash"/></button>
              </div>
            </header>

            <div className="composition-detail-summary">
              {Object.entries(packageTotals(selectedPackage)).map(([label, value]) => <div key={label}><span>{label.toUpperCase()}</span><strong>{formatMoney(value)}</strong></div>)}
              <button onClick={() => { setEditingItemId(null); setItemForm(emptyItem); setItemOpen(true); }} type="button"><CompositionIcon name="plus"/>Adicionar componente</button>
            </div>

            <div className="composition-items">
              <header><span>Componente</span><span>Origem</span><span>EXW</span><span>FOB</span><span>NET</span><span>Ações</span></header>
              {selectedItems.map((item) => {
                const values = calculateItem(item);
                return <div key={item.id}><span><strong>{item.description}</strong><small>{item.quantity} {item.unit_type}{item.ncm ? ` · NCM ${item.ncm}` : ""}</small></span><span><strong>{item.currency}</strong><small>{item.item_code || item.sap_code || "Sem código"}</small></span><span>{formatMoney(values.exw)}</span><span>{formatMoney(values.fob)}</span><strong>{formatMoney(values.net)}</strong><span className="composition-item-actions"><button onClick={() => editItem(item)} type="button">Editar</button><button onClick={() => deleteItem(item)} type="button">Excluir</button></span></div>;
              })}
              {!selectedItems.length && <div className="composition-items-empty">Adicione componentes para calcular EXW, FOB e NET.</div>}
            </div>
          </section>
        ) : (
          <div className="composition-detail-empty"><CompositionIcon name="layers"/><strong>Selecione uma composição</strong><span>Os custos e componentes aparecerão aqui.</span></div>
        )}
      </div>

      <FormModal description={`A composição ficará vinculada exclusivamente ao produto ${product.code}.`} eyebrow="Nova composição" onClose={() => setPackageOpen(false)} open={packageOpen} title="Criar composição de produto">
        <form className="modal-form" onSubmit={createPackage}>
          <label className="wide">Nome da composição<input autoFocus required value={packageForm.name} onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })} placeholder="Ex.: Kit de instalação"/></label>
          <label>Código provisório<input value={packageForm.provisionalCode} onChange={(event) => setPackageForm({ ...packageForm, provisionalCode: event.target.value })} placeholder={product.code}/></label>
          <label>Fornecedor<input value={packageForm.supplier} onChange={(event) => setPackageForm({ ...packageForm, supplier: event.target.value })} placeholder="Opcional"/></label>
          <label>Prazo da cotação<input type="date" value={packageForm.dueDate} onChange={(event) => setPackageForm({ ...packageForm, dueDate: event.target.value })}/></label>
          <footer className="modal-form-actions"><button onClick={() => setPackageOpen(false)} type="button">Cancelar</button><button disabled={saving} type="submit">{saving ? "Criando..." : "Criar composição"}</button></footer>
        </form>
      </FormModal>

      <FormModal description={`O componente será incluído em ${selectedPackage?.name || "esta composição"} e nos cálculos deste produto.`} eyebrow={editingItemId ? "Editar componente" : "Novo componente"} onClose={closeItemModal} open={itemOpen} size="large" title={editingItemId ? "Editar componente" : "Adicionar componente"}>
        <form className="modal-form composition-item-form" onSubmit={saveItem}>
          <label className="wide">Componente ou serviço<input autoFocus required value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })}/></label>
          <label>Quantidade<input min="0.01" required step="0.01" type="number" value={itemForm.quantity} onChange={(event) => setItemForm({ ...itemForm, quantity: event.target.value })}/></label>
          <label>Unidade<select value={itemForm.unitType} onChange={(event) => setItemForm({ ...itemForm, unitType: event.target.value })}>{["UN", "PC", "KIT", "CX", "KG", "M", "L", "H"].map((unit) => <option key={unit}>{unit}</option>)}</select></label>
          <label>Valor unitário<input min="0" required step="0.01" type="number" value={itemForm.unitPrice} onChange={(event) => setItemForm({ ...itemForm, unitPrice: event.target.value })}/></label>
          <label>Moeda<select value={itemForm.currency} onChange={(event) => setItemForm({ ...itemForm, currency: event.target.value, exchangeRate: event.target.value === "BRL" ? "1" : "" })}><option value="BRL">BRL</option><option value="USD">USD</option></select></label>
          {itemForm.currency === "USD" && <label>Cotação USD<input min="0.01" required step="0.0001" type="number" value={itemForm.exchangeRate} onChange={(event) => setItemForm({ ...itemForm, exchangeRate: event.target.value })}/></label>}
          <label>Overhead (%)<input min="0" step="0.01" type="number" value={itemForm.overhead} onChange={(event) => setItemForm({ ...itemForm, overhead: event.target.value })}/></label>
          <label>NCM<input list={`composition-ncm-${product.id}`} value={itemForm.ncm} onChange={(event) => setItemForm({ ...itemForm, ncm: event.target.value })}/><datalist id={`composition-ncm-${product.id}`}>{ncmTaxes.map((tax) => <option key={tax.id} value={tax.ncm}>{tax.description}</option>)}</datalist></label>
          <label>P/N do fornecedor<input value={itemForm.partNumber} onChange={(event) => setItemForm({ ...itemForm, partNumber: event.target.value })}/></label>
          <label>Código SAP<input value={itemForm.sapCode} onChange={(event) => setItemForm({ ...itemForm, sapCode: event.target.value })}/></label>
          {itemForm.ncm && <fieldset className="composition-tax-options wide"><legend>Impostos aplicáveis</legend>{[["applyIpi", "IPI", "ipi_rate"], ["applyPis", "PIS", "pis_rate"], ["applyCofins", "COFINS", "cofins_rate"], ["applyIcms", "ICMS", "icms_rate"], ["applyImportTax", "Importação", "import_tax_rate"]].map(([key, label, rate]) => <label key={key}><input checked={itemForm[key]} onChange={(event) => setItemForm({ ...itemForm, [key]: event.target.checked })} type="checkbox"/>{label}<small>{Number(ncmTaxes.find((tax) => tax.ncm === itemForm.ncm)?.[rate] || 0)}%</small></label>)}</fieldset>}
          <footer className="modal-form-actions"><button onClick={closeItemModal} type="button">Cancelar</button><button disabled={saving} type="submit">{saving ? "Salvando..." : editingItemId ? "Salvar alterações" : "Adicionar componente"}</button></footer>
        </form>
      </FormModal>

      <FormModal description="Os componentes desta composição também serão removidos. Esta ação não afeta outros produtos." eyebrow="Excluir composição" onClose={() => setDeletingPackage(null)} open={Boolean(deletingPackage)} title={`Excluir ${deletingPackage?.name || "composição"}?`}>
        <div className="composition-delete-confirm"><p>Confirme a exclusão permanente desta composição vinculada a <strong>{product.code}</strong>.</p><footer className="modal-form-actions"><button onClick={() => setDeletingPackage(null)} type="button">Cancelar</button><button className="danger" disabled={saving} onClick={deletePackage} type="button">{saving ? "Excluindo..." : "Excluir composição"}</button></footer></div>
      </FormModal>
    </section>
  );
}
