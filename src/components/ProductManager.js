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
    description: "Produto em ajuste, revisao ou atualizacao",
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
  owner: "",
  status: "ativo",
  characteristics: "",
  structure: "",
};

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, code, category, owner, status, characteristics, structure, created_at"
        )
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
      setProducts(loadedProducts);
      setSelectedId(loadedProducts[0]?.id ?? null);
      setIsLoading(false);
    }

    loadProducts();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? products[0],
    [products, selectedId]
  );

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

  async function addProduct(event) {
    event.preventDefault();

    const nextProduct = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      category: form.category.trim(),
      owner: form.owner.trim(),
      characteristics: form.characteristics.trim(),
      structure: form.structure.trim(),
    };

    if (!nextProduct.name || !nextProduct.code) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .insert(nextProduct)
      .select(
        "id, name, code, category, owner, status, characteristics, structure, created_at"
      )
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
    setForm(emptyForm);
    setIsSubmitting(false);
  }

  return (
    <main className="workspace">
      <header className="page-header">
        <div>
          <p className="eyebrow">Portal Engenharia de Novos Negocios</p>
          <h1>Gerenciamento de produtos</h1>
          <p>
            Cadastre os produtos trabalhados pelo setor, acompanhe o status e
            consulte as principais caracteristicas e estruturas de cada item.
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

              <dl className="detail-grid">
                <div>
                  <dt>Categoria</dt>
                  <dd>{selectedProduct.category || "Nao informado"}</dd>
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
                <p>{selectedProduct.characteristics || "Sem caracteristicas cadastradas."}</p>
              </div>

              <div className="text-block">
                <h3>Estrutura</h3>
                <p>{selectedProduct.structure || "Sem estrutura cadastrada."}</p>
              </div>
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

          <label className="wide-field">
            Estrutura do produto
            <textarea
              name="structure"
              onChange={updateField}
              placeholder="Liste componentes, sub conjuntos, documentos, testes ou entregaveis."
              rows="4"
              value={form.structure}
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
