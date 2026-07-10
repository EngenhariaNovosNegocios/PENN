"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  emptyForm,
  emptyIssueForm,
  emptyStructureForm,
  initialProducts,
  issueColumns,
  ncmTaxColumns,
  productColumns,
  statusOptions,
  structureColumns,
} from "./constants";
import { normalizeNcm } from "./utils";
import ProductCreateForm from "./ProductCreateForm";
import ProductDetail from "./ProductDetail";
import ProductList from "./ProductList";
import ProductSummary from "./ProductSummary";

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
      sap_material_code: selectedProduct.sap_material_code ?? "",
      sap_plant: selectedProduct.sap_plant ?? "",
      sap_unit: selectedProduct.sap_unit ?? "",
      sap_material_group: selectedProduct.sap_material_group ?? "",
      sync_source: selectedProduct.sync_source ?? "manual",
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
        product.sap_material_code,
        product.sap_plant,
        product.sap_material_group,
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
      sap_material_code: form.sap_material_code.trim(),
      sap_plant: form.sap_plant.trim(),
      sap_unit: form.sap_unit.trim(),
      sap_material_group: form.sap_material_group.trim(),
      sync_source: form.sync_source,
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
      sap_material_code: editForm.sap_material_code.trim(),
      sap_plant: editForm.sap_plant.trim(),
      sap_unit: editForm.sap_unit.trim(),
      sap_material_group: editForm.sap_material_group.trim(),
      sync_source: editForm.sync_source,
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
          {successMessage && (
            <p className="success-message">{successMessage}</p>
          )}
        </section>
      )}

      {viewMode === "catalog" && (
        <>
          <ProductSummary
            statusOptions={statusOptions}
            statusTotals={statusTotals}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            openIssueTotal={openIssueTotal}
          />

          <section className="product-layout">
            <ProductList
              products={products}
              filteredProducts={filteredProducts}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              statusOptions={statusOptions}
              selectedProductId={selectedProduct?.id}
              onSelectProduct={setSelectedId}
              countIssues={countIssues}
            />

            <ProductDetail
              selectedProduct={selectedProduct}
              statusOptions={statusOptions}
              isDeletingProduct={isDeletingProduct}
              onDeleteProduct={deleteSelectedProduct}
              activeTab={activeTab}
              onOpenTab={openTab}
              selectedStructureItems={selectedStructureItems}
              selectedIssues={selectedIssues}
              selectedNcmTax={selectedNcmTax}
              editForm={editForm}
              onUpdateEditField={updateEditField}
              onUpdateSelectedProduct={updateSelectedProduct}
              isSavingEdit={isSavingEdit}
              structureForm={structureForm}
              onUpdateStructureField={updateStructureField}
              onAddStructureItem={addStructureItem}
              isAddingStructure={isAddingStructure}
              onDeleteStructureItem={deleteStructureItem}
              issueForm={issueForm}
              onUpdateIssueField={updateIssueField}
              onAddIssue={addIssue}
              isAddingIssue={isAddingIssue}
              onResolveIssue={resolveIssue}
            />
          </section>
        </>
      )}

      {viewMode === "create" && (
        <ProductCreateForm
          form={form}
          statusOptions={statusOptions}
          onUpdateField={updateField}
          onSubmit={addProduct}
          isSubmitting={isSubmitting}
        />
      )}
    </main>
  );
}
