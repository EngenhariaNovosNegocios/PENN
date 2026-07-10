"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const statusOptions = {
  ativo: {
    label: "Ativo",
    description: "Produto em uso ou comercializacao",
  },
  manutencao: {
    label: "Manutencao",
    description: "Produto com problema aberto para acompanhamento",
  },
  avaliacao: {
    label: "Em avaliacao",
    description: "Produto em analise tecnica ou comercial",
  },
  pausado: {
    label: "Pausado",
    description: "Produto temporariamente suspenso",
  },
};

const initialProducts = [
  {
    id: 1,
    name: "Linha Hidraulica Especial",
    code: "PENN-001",
    category: "Produto tecnico",
    ncm: "8412.21.10",
    owner: "Engenharia",
    status: "ativo",
    characteristics: "Conjunto sob demanda com componentes dimensionados por aplicacao.",
    structure: "Modulo base; conjunto de fixacao; documentacao tecnica; embalagem.",
  },
  {
    id: 2,
    name: "Painel de Controle Customizado",
    code: "PENN-002",
    category: "Sistema montado",
    ncm: "8537.10.90",
    owner: "Novos Negocios",
    status: "manutencao",
    characteristics: "Produto com configuracao eletrica variavel conforme requisito do cliente.",
    structure: "Gabinete; interface; chicote; protecoes; checklist de testes.",
  },
];

const emptyForm = {
  name: "",
  code: "",
  category: "",
  ncm: "",
  owner: "",
  status: "ativo",
  characteristics: "",
};

const emptyStructureForm = {
  materialCode: "",
  description: "",
  quantity: "",
};

const emptyIssueForm = {
  productCode: "",
  description: "",
};

const productColumns =
  "id, name, code, category, ncm, owner, status, characteristics, structure, created_at";

const structureColumns =
  "id, product_id, material_code, description, quantity, created_at";

const issueColumns =
  "id, product_id, product_code, description, created_at";

const ncmTaxColumns =
  "id, ncm, description, ipi_rate, pis_rate, cofins_rate, icms_rate, import_tax_rate, updated_at";

const tabs = [
  { id: "overview", label: "Resumo" },
  { id: "edit", label: "Editar" },
  { id: "structure", label: "Estrutura" },
  { id: "issues", label: "Problemas" },
  { id: "fiscal", label: "Fiscal" },
];

function normalizeNcm(value) {
  return value?.replace(/\D/g, "") ?? "";
}

function formatRate(value) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}%`;
}

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [structureItems, setStructureItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [ncmTaxes, setNcmTaxes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [structureForm, setStructureForm] = useState(emptyStructureForm);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState("catalog");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isAddingStructure, setIsAddingStructure] = useState(false);
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("products")
        .select(productColumns)
        .order("created_at", { ascending: false });

      if (error) {
        setProducts(initialProducts);
        setSelectedId(initialProducts[0].id);
        setErrorMessage(
          "Nao foi possivel carregar o Supabase. Verifique se a tabela products e as policies foram criadas."
        );
        setIsLoading(false);
        return;
      }

      const loadedProducts = data ?? [];
      const [details] = await Promise.all([
        loadProductDetails(loadedProducts.map((product) => product.id)),
        loadNcmTaxes(),
      ]);
      const productsWithIssueStatus = loadedProducts.map((product) =>
        details.issues.some((issue) => issue.product_id === product.id)
          ? { ...product, status: "manutencao" }
          : product
      );

      setProducts(productsWithIssueStatus);
      setSelectedId(productsWithIssueStatus[0]?.id ?? null);
      setIsLoading(false);
    }

    loadProducts();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? products[0],
    [products, selectedId]
  );

  useEffect(() => {
    if (!selectedProduct) {
      setEditForm(emptyForm);
      return;
    }

    setEditForm({
      name: selectedProduct.name ?? "",
      code: selectedProduct.code ?? "",
      category: selectedProduct.category ?? "",
      ncm: selectedProduct.ncm ?? "",
      owner: selectedProduct.owner ?? "",
      status: selectedProduct.status ?? "ativo",
      characteristics: selectedProduct.characteristics ?? "",
    });
  }, [selectedProduct]);

  async function loadProductDetails(productIds) {
    if (productIds.length === 0) {
      setStructureItems([]);
      setIssues([]);
      return { issues: [], structureItems: [] };
    }

    const [structureResult, issuesResult] = await Promise.all([
      supabase
        .from("product_structure_items")
        .select(structureColumns)
        .in("product_id", productIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_issues")
        .select(issueColumns)
        .in("product_id", productIds)
        .order("created_at", { ascending: false }),
    ]);

    const nextStructureItems = structureResult.error
      ? []
      : structureResult.data ?? [];
    const nextIssues = issuesResult.error ? [] : issuesResult.data ?? [];

    setStructureItems(nextStructureItems);
    setIssues(nextIssues);
    return { issues: nextIssues, structureItems: nextStructureItems };
  }

  async function loadNcmTaxes() {
    const { data, error } = await supabase
      .from("ncm_taxes")
      .select(ncmTaxColumns)
      .order("ncm", { ascending: true });

    if (!error) {
      setNcmTaxes(data ?? []);
    }
  }

  const selectedStructureItems = useMemo(
    () =>
      structureItems.filter(
        (structureItem) => structureItem.product_id === selectedProduct?.id
      ),
    [structureItems, selectedProduct]
  );

  const selectedIssues = useMemo(
    () => issues.filter((issue) => issue.product_id === selectedProduct?.id),
    [issues, selectedProduct]
  );

  const selectedNcmTax = useMemo(() => {
    const selectedNcm = normalizeNcm(selectedProduct?.ncm);

    if (!selectedNcm) {
      return null;
    }

    return (
      ncmTaxes.find((tax) => normalizeNcm(tax.ncm) === selectedNcm) ?? null
    );
  }, [ncmTaxes, selectedProduct]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesStatus =
        statusFilter === "todos" || product.status === statusFilter;
      const searchable = [
        product.name,
        product.code,
        product.category,
        product.owner,
        product.ncm,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [products, searchTerm, statusFilter]);

  const statusTotals = useMemo(
    () =>
      products.reduce((totals, product) => {
        totals[product.status] = (totals[product.status] ?? 0) + 1;
        return totals;
      }, {}),
    [products]
  );

  const openIssueTotal = issues.length;

  function countIssues(productId) {
    return issues.filter((issue) => issue.product_id === productId).length;
  }

  function showSuccess(message) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2600);
  }

  function openTab(tabId) {
    setActiveTab(tabId);

    if (tabId === "issues" && selectedProduct && !issueForm.productCode) {
      setIssueForm((current) => ({
        ...current,
        productCode: selectedProduct.code,
      }));
    }
  }

  function updateFormField(setter) {
    return function handleUpdateField(event) {
      const { name, value } = event.target;
      setter((current) => ({ ...current, [name]: value }));
    };
  }

  const updateField = updateFormField(setForm);
  const updateEditField = updateFormField(setEditForm);
  const updateStructureField = updateFormField(setStructureForm);
  const updateIssueField = updateFormField(setIssueForm);

  function updateProductStatus(productId, status) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, status } : product
      )
    );
  }

  async function saveProductStatus(productId, status) {
    updateProductStatus(productId, status);

    const { error } = await supabase
      .from("products")
      .update({ status })
      .eq("id", productId);

    if (error) {
      setErrorMessage(`Nao foi possivel atualizar o status: ${error.message}`);
    }
  }

  async function addProduct(event) {
    event.preventDefault();

    const nextProduct = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      category: form.category.trim(),
      ncm: form.ncm.trim(),
      owner: form.owner.trim(),
      characteristics: form.characteristics.trim(),
    };

    if (!nextProduct.name || !nextProduct.code) {
      setErrorMessage("Informe pelo menos o nome e o codigo do produto.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .insert(nextProduct)
      .select(productColumns)
      .single();

    if (error) {
      setErrorMessage(
        `Nao foi possivel cadastrar no Supabase: ${error.message}`
      );
      setIsSubmitting(false);
      return;
    }

    setProducts((current) => [data, ...current]);
    setSelectedId(data.id);
    setActiveTab("overview");
    setViewMode("catalog");
    setForm(emptyForm);
    setIsSubmitting(false);
    showSuccess("Produto cadastrado.");
  }

  async function updateSelectedProduct(event) {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    const updatedProduct = {
      name: editForm.name.trim(),
      code: editForm.code.trim(),
      category: editForm.category.trim(),
      ncm: editForm.ncm.trim(),
      owner: editForm.owner.trim(),
      characteristics: editForm.characteristics.trim(),
    };

    if (!updatedProduct.name || !updatedProduct.code) {
      setErrorMessage("Informe pelo menos o nome e o codigo do produto.");
      return;
    }

    setIsSavingEdit(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .update(updatedProduct)
      .eq("id", selectedProduct.id)
      .select(productColumns)
      .single();

    if (error) {
      setErrorMessage(`Nao foi possivel salvar o produto: ${error.message}`);
      setIsSavingEdit(false);
      return;
    }

    const finalProduct =
      selectedIssues.length > 0 ? { ...data, status: "manutencao" } : data;

    setProducts((current) =>
      current.map((product) =>
        product.id === selectedProduct.id ? finalProduct : product
      )
    );

    if (selectedProduct.code !== finalProduct.code) {
      await supabase
        .from("product_issues")
        .update({ product_code: finalProduct.code })
        .eq("product_id", finalProduct.id);
      setIssues((current) =>
        current.map((issue) =>
          issue.product_id === finalProduct.id
            ? { ...issue, product_code: finalProduct.code }
            : issue
        )
      );
    }

    setIsSavingEdit(false);
    showSuccess("Produto atualizado.");
  }

  async function deleteSelectedProduct() {
    if (!selectedProduct) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir o produto ${selectedProduct.code}? Essa acao tambem remove estrutura e problemas vinculados.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingProduct(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", selectedProduct.id);

    if (error) {
      setErrorMessage(`Nao foi possivel excluir o produto: ${error.message}`);
      setIsDeletingProduct(false);
      return;
    }

    const remainingProducts = products.filter(
      (product) => product.id !== selectedProduct.id
    );

    setProducts(remainingProducts);
    setStructureItems((current) =>
      current.filter((item) => item.product_id !== selectedProduct.id)
    );
    setIssues((current) =>
      current.filter((issue) => issue.product_id !== selectedProduct.id)
    );
    setSelectedId(remainingProducts[0]?.id ?? null);
    setActiveTab("overview");
    setIsDeletingProduct(false);
    showSuccess("Produto excluido.");
  }

  async function addStructureItem(event) {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    const nextStructureItem = {
      product_id: selectedProduct.id,
      material_code: structureForm.materialCode.trim(),
      description: structureForm.description.trim(),
      quantity: Number(structureForm.quantity),
    };

    if (
      !nextStructureItem.material_code ||
      !nextStructureItem.description ||
      !Number.isFinite(nextStructureItem.quantity) ||
      nextStructureItem.quantity <= 0
    ) {
      setErrorMessage("Informe codigo, descricao e quantidade valida.");
      return;
    }

    setIsAddingStructure(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("product_structure_items")
      .insert(nextStructureItem)
      .select(structureColumns)
      .single();

    if (error) {
      setErrorMessage(
        `Nao foi possivel adicionar o item da estrutura: ${error.message}`
      );
      setIsAddingStructure(false);
      return;
    }

    setStructureItems((current) => [data, ...current]);
    setStructureForm(emptyStructureForm);
    setIsAddingStructure(false);
    showSuccess("Item adicionado a estrutura.");
  }

  async function deleteStructureItem(itemId) {
    setErrorMessage("");

    const { error } = await supabase
      .from("product_structure_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      setErrorMessage(`Nao foi possivel excluir o item: ${error.message}`);
      return;
    }

    setStructureItems((current) =>
      current.filter((structureItem) => structureItem.id !== itemId)
    );
    showSuccess("Item removido da estrutura.");
  }

  async function addIssue(event) {
    event.preventDefault();

    const productCode = issueForm.productCode.trim();
    const description = issueForm.description.trim();
    const issueProduct = products.find(
      (product) => product.code.toLowerCase() === productCode.toLowerCase()
    );

    if (!issueProduct || !description) {
      setErrorMessage(
        "Informe um codigo de produto cadastrado e a descricao do problema."
      );
      return;
    }

    setIsAddingIssue(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("product_issues")
      .insert({
        product_id: issueProduct.id,
        product_code: issueProduct.code,
        description,
      })
      .select(issueColumns)
      .single();

    if (error) {
      setErrorMessage(`Nao foi possivel registrar o problema: ${error.message}`);
      setIsAddingIssue(false);
      return;
    }

    setIssues((current) => [data, ...current]);
    setSelectedId(issueProduct.id);
    setActiveTab("issues");
    setIssueForm({ productCode: issueProduct.code, description: "" });
    await saveProductStatus(issueProduct.id, "manutencao");
    setIsAddingIssue(false);
    showSuccess("Problema registrado.");
  }

  async function resolveIssue(issue) {
    setErrorMessage("");

    const { error } = await supabase
      .from("product_issues")
      .delete()
      .eq("id", issue.id);

    if (error) {
      setErrorMessage(`Nao foi possivel resolver o problema: ${error.message}`);
      return;
    }

    const remainingIssues = issues.filter(
      (currentIssue) =>
        currentIssue.product_id === issue.product_id && currentIssue.id !== issue.id
    );

    setIssues((current) =>
      current.filter((currentIssue) => currentIssue.id !== issue.id)
    );

    if (remainingIssues.length === 0) {
      await saveProductStatus(issue.product_id, "ativo");
    }

    showSuccess("Problema resolvido.");
  }

  return (
    <main className="workspace">
      <header className="page-header">
        <div>
          <p className="eyebrow">Portal Engenharia de Novos Negocios</p>
          <h1>Gerenciamento de produtos</h1>
          <p>
            Cadastre, acompanhe e mantenha os dados tecnicos, fiscais e
            operacionais de cada produto.
          </p>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="Áreas de produtos">
        <button
          className={viewMode === "catalog" ? "active" : ""}
          onClick={() => setViewMode("catalog")}
          type="button"
        >
          <span className="workspace-tab-icon">▦</span>
          <span>
            <strong>Catálogo</strong>
            <small>Consultar e gerenciar produtos</small>
          </span>
        </button>
        <button
          className={viewMode === "create" ? "active" : ""}
          onClick={() => setViewMode("create")}
          type="button"
        >
          <span className="workspace-tab-icon">＋</span>
          <span>
            <strong>Adicionar produto</strong>
            <small>Criar um novo cadastro</small>
          </span>
        </button>
      </nav>

      {(errorMessage || successMessage) && (
        <section className="message-stack" aria-live="polite">
          {errorMessage && <p className="feedback-message">{errorMessage}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}
        </section>
      )}

      {viewMode === "catalog" && (
        <>
      <section className="summary-grid" aria-label="Resumo operacional">
        {Object.entries(statusOptions).map(([status, option]) => (
          <button
            className={`summary-item ${
              statusFilter === status ? "selected" : ""
            }`}
            key={status}
            onClick={() =>
              setStatusFilter(statusFilter === status ? "todos" : status)
            }
            type="button"
          >
            <span className={`status-dot ${status}`} />
            <strong>{statusTotals[status] ?? 0}</strong>
            <span>{option.label}</span>
          </button>
        ))}
        <div className="summary-item issue-summary">
          <span className="status-dot issue" />
          <strong>{openIssueTotal}</strong>
          <span>Problemas abertos</span>
        </div>
      </section>

      <section className="product-layout">
        <aside className="panel product-list" aria-label="Lista de produtos">
          <div className="panel-heading">
            <h2>Produtos</h2>
            <span>
              {isLoading
                ? "Carregando"
                : `${filteredProducts.length} de ${products.length}`}
            </span>
          </div>

          <div className="list-controls">
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome, codigo ou NCM..."
              type="search"
              value={searchTerm}
            />
            <select
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="todos">Todos os status</option>
              {Object.entries(statusOptions).map(([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="product-list-items">
            {filteredProducts.map((product) => {
              const productIssueCount = countIssues(product.id);

              return (
                <button
                  className={`product-row ${
                    product.id === selectedProduct?.id ? "selected" : ""
                  }`}
                  key={product.id}
                  onClick={() => setSelectedId(product.id)}
                  type="button"
                >
                  <span>
                    <strong>{product.name}</strong>
                    <small>
                      {product.code} - {product.category || "Sem categoria"}
                    </small>
                    {product.ncm && <small>NCM {product.ncm}</small>}
                  </span>
                  <span className="row-badges">
                    {productIssueCount > 0 && (
                      <span className="issue-count">{productIssueCount}</span>
                    )}
                    <span className={`status-badge ${product.status}`}>
                      {statusOptions[product.status]?.label ?? product.status}
                    </span>
                  </span>
                </button>
              );
            })}

            {!isLoading && filteredProducts.length === 0 && (
              <p className="empty-state">Nenhum produto encontrado.</p>
            )}
          </div>
        </aside>

        <section className="panel product-detail" aria-label="Detalhes do produto">
          {!selectedProduct && (
            <p className="empty-state">Cadastre ou selecione um produto.</p>
          )}

          {selectedProduct && (
            <>
              <div className="detail-top">
                <div>
                  <span className="muted-label">{selectedProduct.code}</span>
                  <h2>{selectedProduct.name}</h2>
                </div>
                <div className="detail-actions">
                  <span className={`status-badge ${selectedProduct.status}`}>
                    {statusOptions[selectedProduct.status]?.label ??
                      selectedProduct.status}
                  </span>
                  <button
                    className="delete-product-button"
                    disabled={isDeletingProduct}
                    onClick={deleteSelectedProduct}
                    type="button"
                  >
                    {isDeletingProduct ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </div>

              <div className="detail-tabs" role="tablist" aria-label="Dados do produto">
                {tabs.map((tab) => (
                  <button
                    className={activeTab === tab.id ? "active" : ""}
                    aria-selected={activeTab === tab.id}
                    key={tab.id}
                    onClick={() => openTab(tab.id)}
                    type="button"
                  >
                    <span className="tab-marker" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <section className="tab-panel" aria-label="Resumo do produto">
                  <dl className="detail-grid">
                    <div>
                      <dt>Categoria</dt>
                      <dd>{selectedProduct.category || "Nao informado"}</dd>
                    </div>
                    <div>
                      <dt>NCM</dt>
                      <dd>{selectedProduct.ncm || "Nao informado"}</dd>
                    </div>
                    <div>
                      <dt>Responsavel</dt>
                      <dd>{selectedProduct.owner || "Nao informado"}</dd>
                    </div>
                    <div>
                      <dt>Estrutura</dt>
                      <dd>{selectedStructureItems.length} itens</dd>
                    </div>
                    <div>
                      <dt>Problemas</dt>
                      <dd>{selectedIssues.length} abertos</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        {statusOptions[selectedProduct.status]?.description ??
                          "Status informado no cadastro."}
                      </dd>
                    </div>
                  </dl>

                  <div className="text-block">
                    <h3>Caracteristicas</h3>
                    <p>
                      {selectedProduct.characteristics ||
                        "Sem caracteristicas cadastradas."}
                    </p>
                  </div>
                </section>
              )}

              {activeTab === "edit" && (
                <section className="tab-panel" aria-label="Edicao do produto">
                  <form
                    className="product-form edit-product-form"
                    onSubmit={updateSelectedProduct}
                  >
                    <label>
                      Nome do produto
                      <input
                        name="name"
                        onChange={updateEditField}
                        required
                        value={editForm.name}
                      />
                    </label>

                    <label>
                      Codigo
                      <input
                        name="code"
                        onChange={updateEditField}
                        required
                        value={editForm.code}
                      />
                    </label>

                    <label>
                      Categoria
                      <input
                        name="category"
                        onChange={updateEditField}
                        value={editForm.category}
                      />
                    </label>

                    <label>
                      NCM
                      <input
                        inputMode="numeric"
                        name="ncm"
                        onChange={updateEditField}
                        value={editForm.ncm}
                      />
                    </label>

                    <label>
                      Responsavel
                      <input
                        name="owner"
                        onChange={updateEditField}
                        value={editForm.owner}
                      />
                    </label>

                    <label className="wide-field">
                      Caracteristicas
                      <textarea
                        name="characteristics"
                        onChange={updateEditField}
                        rows="4"
                        value={editForm.characteristics}
                      />
                    </label>

                    <div className="form-actions">
                      <button disabled={isSavingEdit} type="submit">
                        {isSavingEdit ? "Salvando..." : "Salvar alteracoes"}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {activeTab === "structure" && (
                <section className="tab-panel" aria-label="Estrutura do produto">
                  <form className="compact-form" onSubmit={addStructureItem}>
                    <label>
                      Codigo materia prima
                      <input
                        name="materialCode"
                        onChange={updateStructureField}
                        placeholder="Ex.: MP-0001"
                        required
                        value={structureForm.materialCode}
                      />
                    </label>
                    <label>
                      Descricao do item
                      <input
                        name="description"
                        onChange={updateStructureField}
                        placeholder="Ex.: Chapa inox 2mm"
                        required
                        value={structureForm.description}
                      />
                    </label>
                    <label>
                      Quantidade
                      <input
                        min="0.01"
                        name="quantity"
                        onChange={updateStructureField}
                        placeholder="Ex.: 2"
                        required
                        step="0.01"
                        type="number"
                        value={structureForm.quantity}
                      />
                    </label>
                    <button disabled={isAddingStructure} type="submit">
                      {isAddingStructure ? "Adicionando..." : "Adicionar"}
                    </button>
                  </form>

                  <div className="data-list">
                    {selectedStructureItems.map((item) => (
                      <div className="data-row" key={item.id}>
                        <span>
                          <strong>{item.material_code}</strong>
                          <small>{item.description}</small>
                        </span>
                        <span className="quantity-pill">{item.quantity}</span>
                        <button
                          className="ghost-danger-button"
                          onClick={() => deleteStructureItem(item.id)}
                          type="button"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}

                    {selectedStructureItems.length === 0 && (
                      <p className="empty-state">Nenhum item na estrutura.</p>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "issues" && (
                <section className="tab-panel" aria-label="Problemas do produto">
                  <form className="compact-form issue-form" onSubmit={addIssue}>
                    <label>
                      Codigo do produto
                      <input
                        name="productCode"
                        onChange={updateIssueField}
                        placeholder={selectedProduct.code}
                        required
                        value={issueForm.productCode}
                      />
                    </label>
                    <label>
                      Problema
                      <input
                        name="description"
                        onChange={updateIssueField}
                        placeholder="Descreva o problema encontrado"
                        required
                        value={issueForm.description}
                      />
                    </label>
                    <button disabled={isAddingIssue} type="submit">
                      {isAddingIssue ? "Registrando..." : "Registrar"}
                    </button>
                  </form>

                  <div className="data-list">
                    {selectedIssues.map((issue) => (
                      <div className="data-row issue-row" key={issue.id}>
                        <span>
                          <strong>{issue.product_code}</strong>
                          <small>{issue.description}</small>
                        </span>
                        <button onClick={() => resolveIssue(issue)} type="button">
                          Resolver
                        </button>
                      </div>
                    ))}

                    {selectedIssues.length === 0 && (
                      <p className="empty-state">
                        Nenhum problema aberto para este produto.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "fiscal" && (
                <section className="tab-panel" aria-label="Dados fiscais">
                  <dl className="detail-grid fiscal-summary">
                    <div>
                      <dt>NCM</dt>
                      <dd>{selectedProduct.ncm || "Nao informado"}</dd>
                    </div>
                    <div>
                      <dt>Base fiscal</dt>
                      <dd>{selectedNcmTax ? "Cadastrada" : "Pendente"}</dd>
                    </div>
                    <div>
                      <dt>Atualizacao</dt>
                      <dd>
                        {selectedNcmTax?.updated_at
                          ? new Date(selectedNcmTax.updated_at).toLocaleDateString(
                              "pt-BR"
                            )
                          : "Nao informado"}
                      </dd>
                    </div>
                  </dl>

                  <div className="text-block">
                    <h3>Impostos por NCM</h3>
                    {selectedNcmTax ? (
                      <>
                        <p>{selectedNcmTax.description}</p>
                        <dl className="tax-grid">
                          <div>
                            <dt>IPI</dt>
                            <dd>{formatRate(selectedNcmTax.ipi_rate)}</dd>
                          </div>
                          <div>
                            <dt>PIS</dt>
                            <dd>{formatRate(selectedNcmTax.pis_rate)}</dd>
                          </div>
                          <div>
                            <dt>COFINS</dt>
                            <dd>{formatRate(selectedNcmTax.cofins_rate)}</dd>
                          </div>
                          <div>
                            <dt>ICMS</dt>
                            <dd>{formatRate(selectedNcmTax.icms_rate)}</dd>
                          </div>
                          <div>
                            <dt>II</dt>
                            <dd>{formatRate(selectedNcmTax.import_tax_rate)}</dd>
                          </div>
                        </dl>
                      </>
                    ) : (
                      <p>
                        Nenhuma regra de imposto cadastrada para este NCM no
                        Supabase.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </section>
        </>
      )}

      {viewMode === "create" && (
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <span className="form-step">Novo cadastro</span>
            <h2>Informações do produto</h2>
          </div>
          <span>Campos com * são obrigatórios</span>
        </div>

        <form className="product-form" onSubmit={addProduct}>
          <label>
            Nome do produto
            <input
              name="name"
              onChange={updateField}
              placeholder="Ex.: Conjunto mecanico especial"
              required
              value={form.name}
            />
          </label>

          <label>
            Codigo
            <input
              name="code"
              onChange={updateField}
              placeholder="Ex.: PENN-003"
              required
              value={form.code}
            />
          </label>

          <label>
            Categoria
            <input
              name="category"
              onChange={updateField}
              placeholder="Ex.: Produto tecnico"
              value={form.category}
            />
          </label>

          <label>
            NCM
            <input
              inputMode="numeric"
              name="ncm"
              onChange={updateField}
              placeholder="Ex.: 8537.10.90"
              value={form.ncm}
            />
          </label>

          <label>
            Responsavel
            <input
              name="owner"
              onChange={updateField}
              placeholder="Ex.: Engenharia"
              value={form.owner}
            />
          </label>

          <label>
            Status
            <select name="status" onChange={updateField} value={form.status}>
              {Object.entries(statusOptions).map(([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="wide-field">
            Caracteristicas
            <textarea
              name="characteristics"
              onChange={updateField}
              placeholder="Descreva aplicacao, variacoes, requisitos tecnicos ou observacoes comerciais."
              rows="4"
              value={form.characteristics}
            />
          </label>

          <div className="form-actions">
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Cadastrando..." : "Cadastrar produto"}
            </button>
          </div>
        </form>
      </section>
      )}
    </main>
  );
}
