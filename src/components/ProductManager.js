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

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [structureItems, setStructureItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [ncmTaxes, setNcmTaxes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [structureForm, setStructureForm] = useState(emptyStructureForm);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingStructure, setIsAddingStructure] = useState(false);
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      const details = await loadProductDetails(
        loadedProducts.map((product) => product.id)
      );
      await loadNcmTaxes();
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

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? products[0],
    [products, selectedId]
  );

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
    const selectedNcm = selectedProduct?.ncm?.replace(/\D/g, "");

    if (!selectedNcm) {
      return null;
    }

    return (
      ncmTaxes.find((tax) => tax.ncm.replace(/\D/g, "") === selectedNcm) ?? null
    );
  }, [ncmTaxes, selectedProduct]);

  const statusTotals = useMemo(
    () =>
      products.reduce((totals, product) => {
        totals[product.status] = (totals[product.status] ?? 0) + 1;
        return totals;
      }, {}),
    [products]
  );

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateStructureField(event) {
    const { name, value } = event.target;
    setStructureForm((current) => ({ ...current, [name]: value }));
  }

  function updateIssueField(event) {
    const { name, value } = event.target;
    setIssueForm((current) => ({ ...current, [name]: value }));
  }

  function updateProductStatus(productId, status) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, status } : product
      )
    );
  }

  async function saveProductStatus(productId, status) {
    updateProductStatus(productId, status);
    await supabase.from("products").update({ status }).eq("id", productId);
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
    setActiveTab("details");
    setForm(emptyForm);
    setIsSubmitting(false);
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
    setIssueForm(emptyIssueForm);
    await saveProductStatus(issueProduct.id, "manutencao");
    setIsAddingIssue(false);
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
  }

  return (
    <main className="workspace">
      <header className="page-header">
        <div>
          <p className="eyebrow">Portal Engenharia de Novos Negocios</p>
          <h1>Gerenciamento de produtos</h1>
          <p>
            Cadastre os produtos trabalhados pelo setor, acompanhe o status e
            consulte as principais caracteristicas, estruturas e pendencias de
            cada item.
          </p>
        </div>
      </header>

      <section className="summary-grid" aria-label="Resumo por status">
        {Object.entries(statusOptions).map(([status, option]) => (
          <div className="summary-item" key={status}>
            <span className={`status-dot ${status}`} />
            <strong>{statusTotals[status] ?? 0}</strong>
            <span>{option.label}</span>
          </div>
        ))}
      </section>

      <section className="product-layout">
        <aside className="panel product-list" aria-label="Lista de produtos">
          <div className="panel-heading">
            <h2>Produtos</h2>
            <span>{isLoading ? "Carregando" : `${products.length} cadastrados`}</span>
          </div>

          {errorMessage && <p className="feedback-message">{errorMessage}</p>}

          <div className="product-list-items">
            {products.map((product) => (
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
                </span>
                <span className={`status-badge ${product.status}`}>
                  {statusOptions[product.status]?.label ?? product.status}
                </span>
              </button>
            ))}

            {!isLoading && products.length === 0 && (
              <p className="empty-state">Nenhum produto cadastrado ainda.</p>
            )}
          </div>
        </aside>

        <section className="panel product-detail" aria-label="Detalhes do produto">
          {selectedProduct && (
            <>
              <div className="detail-top">
                <div>
                  <span className="muted-label">{selectedProduct.code}</span>
                  <h2>{selectedProduct.name}</h2>
                </div>
                <span className={`status-badge ${selectedProduct.status}`}>
                  {statusOptions[selectedProduct.status]?.label ??
                    selectedProduct.status}
                </span>
              </div>

              <div className="detail-tabs" role="tablist" aria-label="Dados do produto">
                <button
                  className={activeTab === "details" ? "active" : ""}
                  onClick={() => setActiveTab("details")}
                  type="button"
                >
                  Detalhes
                </button>
                <button
                  className={activeTab === "structure" ? "active" : ""}
                  onClick={() => setActiveTab("structure")}
                  type="button"
                >
                  Estrutura
                </button>
                <button
                  className={activeTab === "issues" ? "active" : ""}
                  onClick={() => setActiveTab("issues")}
                  type="button"
                >
                  Problemas
                </button>
              </div>

              {activeTab === "details" && (
                <>
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

                  <div className="text-block">
                    <h3>Impostos por NCM</h3>
                    {selectedNcmTax ? (
                      <>
                        <p>{selectedNcmTax.description}</p>
                        <dl className="tax-grid">
                          <div>
                            <dt>IPI</dt>
                            <dd>{selectedNcmTax.ipi_rate ?? 0}%</dd>
                          </div>
                          <div>
                            <dt>PIS</dt>
                            <dd>{selectedNcmTax.pis_rate ?? 0}%</dd>
                          </div>
                          <div>
                            <dt>COFINS</dt>
                            <dd>{selectedNcmTax.cofins_rate ?? 0}%</dd>
                          </div>
                          <div>
                            <dt>ICMS</dt>
                            <dd>{selectedNcmTax.icms_rate ?? 0}%</dd>
                          </div>
                          <div>
                            <dt>II</dt>
                            <dd>{selectedNcmTax.import_tax_rate ?? 0}%</dd>
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
                </>
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
                        <span>{item.quantity}</span>
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
                        placeholder="Ex.: PENN-001"
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
            </>
          )}
        </section>
      </section>

      <section className="panel form-panel">
        <div className="panel-heading">
          <h2>Novo produto</h2>
          <span>Entrada rapida</span>
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
    </main>
  );
}
