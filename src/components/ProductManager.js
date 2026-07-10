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

const productColumns =
  "id, name, code, category, ncm, owner, status, characteristics, structure, created_at";

const structureColumns =
  "id, product_id, material_code, description, quantity, created_at";

const issueColumns =
  "id, product_id, product_code, description, priority, due_date, resolution_note, resolved_at, created_at";

const attachmentColumns =
  "id, product_id, name, file_type, kind, storage_path, public_url, created_at";

const budgetColumns =
  "id, product_id, item_code, item_name, amount, currency, overhead_rate, quantity, unit_type, mkp, approved, structure_item_id, provisional_code, final_code, created_at";

const emptyBudgetItem = { itemCode: "", itemName: "", amount: "", currency: "BRL", overheadRate: "0", quantity: "1", unitType: "UN", mkp: "1" };
const emptyRawMaterial = { code: "", name: "", unitType: "UN" };

const documentTypes = [
  "Inspeção de recebimento",
  "Especificação de compra",
  "Datasheet",
  "Manual do usuário",
  "NPI",
];

const ncmTaxColumns =
  "id, ncm, description, ipi_rate, pis_rate, cofins_rate, icms_rate, import_tax_rate, updated_at";

const tabs = [
  { id: "overview", label: "Resumo", icon: "overview" },
  { id: "edit", label: "Editar", icon: "edit" },
  { id: "structure", label: "Estrutura", icon: "structure" },
  { id: "issues", label: "Pendências", icon: "issues" },
  { id: "fiscal", label: "Fiscal", icon: "fiscal" },
  { id: "budget", label: "Orçamento", icon: "budget" },
  { id: "documents", label: "Documentos", icon: "documents" },
  { id: "photos", label: "Fotos", icon: "photos" },
];

function ActionIcon({ name }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    edit: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z"/><path d="m14 7 3 3"/></>,
    structure: <><path d="M12 3v6M6 21v-5h12v5M6 16v-3h12v3"/><circle cx="12" cy="10" r="2"/></>,
    issues: <><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.7 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/></>,
    fiscal: <><path d="M6 2h9l4 4v16H6Z"/><path d="M14 2v5h5M9 12h7M9 16h7"/></>,
    budget: <><circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.8-.7-2-1-3.3-1-1.8 0-3.2.8-3.2 2s1.1 1.8 3.2 2.2 3.3 1 3.3 2.4-1.4 2.4-3.4 2.4c-1.4 0-2.8-.4-3.7-1.2M12.5 5v14"/></>,
    documents: <><path d="M7 2h8l4 4v16H7Z"/><path d="M14 2v5h5M10 12h6M10 16h6"/></>,
    photos: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 20"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  };
  return <svg className="action-icon" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{paths[name]}</svg>;
}

function normalizeNcm(value) {
  return value?.replace(/\D/g, "") ?? "";
}

function formatRate(value) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}%`;
}

function formatMoney(value, currency) {
  return Number(value ?? 0).toLocaleString(currency === "USD" ? "en-US" : "pt-BR", {
    style: "currency", currency,
  });
}

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [structureItems, setStructureItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [ncmTaxes, setNcmTaxes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [structureForm, setStructureForm] = useState(emptyStructureForm);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState("catalog");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isAddingStructure, setIsAddingStructure] = useState(false);
  const [resolvingIssueId, setResolvingIssueId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [documentType, setDocumentType] = useState(documentTypes[0]);
  const [documentFile, setDocumentFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [budgetItem, setBudgetItem] = useState(emptyBudgetItem);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [rawMaterialForm, setRawMaterialForm] = useState(emptyRawMaterial);
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
        loadRawMaterials(),
        loadProductCategories(),
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
    function openExternalProduct(event) {
      setSelectedId(event.detail.productId);
      setViewMode("detail");
      setActiveTab("issues");
    }
    window.addEventListener("penn:open-product", openExternalProduct);
    return () => window.removeEventListener("penn:open-product", openExternalProduct);
  }, []);

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
      setAttachments([]);
      setBudgetItems([]);
      return { issues: [], structureItems: [], attachments: [], budgetItems: [] };
    }

    const [structureResult, issuesResult, attachmentsResult, budgetResult] = await Promise.all([
      supabase
        .from("product_structure_items")
        .select(structureColumns)
        .in("product_id", productIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_issues")
        .select(issueColumns)
        .in("product_id", productIds)
        .is("resolved_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_attachments")
        .select(attachmentColumns)
        .in("product_id", productIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_budget_items")
        .select(budgetColumns)
        .in("product_id", productIds)
        .order("created_at", { ascending: false }),
    ]);

    const nextStructureItems = structureResult.error
      ? []
      : structureResult.data ?? [];
    const nextIssues = issuesResult.error ? [] : issuesResult.data ?? [];
    const nextAttachments = attachmentsResult.error ? [] : attachmentsResult.data ?? [];
    const nextBudgetItems = budgetResult.error ? [] : budgetResult.data ?? [];

    setStructureItems(nextStructureItems);
    setIssues(nextIssues);
    setAttachments(nextAttachments);
    setBudgetItems(nextBudgetItems);
    return { issues: nextIssues, structureItems: nextStructureItems, attachments: nextAttachments, budgetItems: nextBudgetItems };
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

  async function loadRawMaterials() {
    const { data } = await supabase.from("raw_materials").select("id, code, name, unit_type, is_provisional, created_at").order("code");
    setRawMaterials(data ?? []);
  }

  async function loadProductCategories() {
    const { data } = await supabase.from("product_categories").select("id, name").order("name");
    setProductCategories(data ?? []);
  }

  async function selectCategory(value, setter) {
    if (value !== "__new__") { setter((current) => ({ ...current, category: value })); return; }
    const name = window.prompt("Nome da nova categoria:")?.trim();
    if (!name) return;
    const { data, error } = await supabase.from("product_categories").insert({ name }).select("id, name").single();
    if (error) { setErrorMessage(`Nao foi possível criar a categoria: ${error.message}`); return; }
    setProductCategories((current) => [...current, data].sort((a,b) => a.name.localeCompare(b.name))); setter((current) => ({ ...current, category: data.name }));
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

  const selectedDocuments = useMemo(
    () => attachments.filter((item) => item.product_id === selectedProduct?.id && item.kind === "document"),
    [attachments, selectedProduct]
  );

  const selectedPhotos = useMemo(
    () => attachments.filter((item) => item.product_id === selectedProduct?.id && item.kind === "photo"),
    [attachments, selectedProduct]
  );

  const selectedBudgetItems = useMemo(
    () => budgetItems.filter((item) => item.product_id === selectedProduct?.id),
    [budgetItems, selectedProduct]
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

    return products.filter((product) =>
      !query || product.code?.toLowerCase().includes(query)
    );
  }, [products, searchTerm]);

  function showSuccess(message) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2600);
  }

  function openTab(tabId) {
    setActiveTab(tabId);
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
      `Excluir o produto ${selectedProduct.code}? Essa acao tambem remove estrutura e pendências vinculadas.`
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

    const productFilePaths = attachments
      .filter((item) => item.product_id === selectedProduct.id)
      .map((item) => item.storage_path);
    if (productFilePaths.length > 0) {
      await supabase.storage.from("product-files").remove(productFilePaths);
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
    setAttachments((current) =>
      current.filter((item) => item.product_id !== selectedProduct.id)
    );
    setBudgetItems((current) =>
      current.filter((item) => item.product_id !== selectedProduct.id)
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

  async function resolveIssue(issue) {
    const resolutionNote = resolutionNotes[issue.id]?.trim();
    if (!resolutionNote) {
      setErrorMessage("Escreva uma justificativa para resolver o problema.");
      return;
    }

    setResolvingIssueId(issue.id);
    setErrorMessage("");

    const { error } = await supabase
      .from("product_issues")
      .update({ resolution_note: resolutionNote, resolved_at: new Date().toISOString() })
      .eq("id", issue.id);

    if (error) {
      setErrorMessage(`Nao foi possivel resolver o problema: ${error.message}`);
      setResolvingIssueId(null);
      return;
    }

    const remainingIssues = issues.filter(
      (currentIssue) =>
        currentIssue.product_id === issue.product_id && currentIssue.id !== issue.id
    );

    setIssues((current) =>
      current.filter((currentIssue) => currentIssue.id !== issue.id)
    );
    setResolutionNotes((current) => {
      const next = { ...current };
      delete next[issue.id];
      return next;
    });

    if (remainingIssues.length === 0) {
      await saveProductStatus(issue.product_id, "ativo");
    }

    setResolvingIssueId(null);
    showSuccess("Problema resolvido.");
  }

  async function addBudgetItem(event) {
    event.preventDefault();
    if (!selectedProduct || !budgetItem.itemName.trim() || Number(budgetItem.amount) < 0 || Number(budgetItem.quantity) <= 0 || Number(budgetItem.mkp) <= 0) return;
    setIsSavingBudget(true); setErrorMessage("");
    const { data, error } = await supabase.from("product_budget_items").insert({
      product_id: selectedProduct.id,
      item_code: budgetItem.itemCode.trim() || null,
      item_name: budgetItem.itemName.trim(),
      amount: Number(budgetItem.amount),
      currency: budgetItem.currency,
      overhead_rate: Number(budgetItem.overheadRate || 0),
      quantity: Number(budgetItem.quantity || 1),
      unit_type: budgetItem.unitType,
      mkp: Number(budgetItem.mkp || 1),
    }).select(budgetColumns).single();
    if (error) { setErrorMessage(`Nao foi possivel adicionar o item: ${error.message}`); setIsSavingBudget(false); return; }
    setBudgetItems((current) => [data, ...current]); setBudgetItem(emptyBudgetItem); setIsSavingBudget(false); showSuccess("Item adicionado ao orçamento.");
  }

  async function deleteBudgetItem(id) {
    const { error } = await supabase.from("product_budget_items").delete().eq("id", id);
    if (error) { setErrorMessage(`Nao foi possivel excluir o item: ${error.message}`); return; }
    setBudgetItems((current) => current.filter((item) => item.id !== id)); showSuccess("Item removido do orçamento.");
  }

  async function addRawMaterial(event) {
    event.preventDefault();
    const { data, error } = await supabase.from("raw_materials").insert({ code: rawMaterialForm.code.trim().toUpperCase(), name: rawMaterialForm.name.trim(), unit_type: rawMaterialForm.unitType, is_provisional: false }).select("id, code, name, unit_type, is_provisional, created_at").single();
    if (error) { setErrorMessage(`Nao foi possivel cadastrar a matéria-prima: ${error.message}`); return; }
    setRawMaterials((current) => [...current, data].sort((a,b) => a.code.localeCompare(b.code))); setRawMaterialForm(emptyRawMaterial); showSuccess("Matéria-prima cadastrada.");
  }

  async function approveBudgetItem(item) {
    const { data, error } = await supabase.from("product_budget_items").update({ approved: !item.approved }).eq("id", item.id).select(budgetColumns).single();
    if (error) { setErrorMessage(`Nao foi possível atualizar a aprovação: ${error.message}`); return; }
    setBudgetItems((current) => current.map((currentItem) => currentItem.id === item.id ? data : currentItem));
  }

  async function includeProvisionalStructure(item) {
    const provisionalCode = `PROV-${selectedProduct.code}-${item.id}`;
    const { data: structureItem, error } = await supabase.from("product_structure_items").insert({ product_id: selectedProduct.id, material_code: provisionalCode, description: item.item_name, quantity: item.quantity }).select(structureColumns).single();
    if (error) { setErrorMessage(`Nao foi possível incluir na estrutura: ${error.message}`); return; }
    const { data: updated } = await supabase.from("product_budget_items").update({ structure_item_id: structureItem.id, provisional_code: provisionalCode }).eq("id", item.id).select(budgetColumns).single();
    setStructureItems((current) => [structureItem, ...current]); setBudgetItems((current) => current.map((currentItem) => currentItem.id === item.id ? updated : currentItem)); showSuccess("Item incluído na estrutura com código provisório.");
  }

  async function promoteProvisionalCode(item) {
    const finalCode = window.prompt("Informe o código definitivo da matéria-prima:", item.item_code || "");
    if (!finalCode?.trim()) return;
    const normalizedCode = finalCode.trim().toUpperCase();
    const { error } = await supabase.from("product_structure_items").update({ material_code: normalizedCode }).eq("id", item.structure_item_id);
    if (error) { setErrorMessage(`Nao foi possível efetivar o código: ${error.message}`); return; }
    await supabase.from("raw_materials").upsert({ code: normalizedCode, name: item.item_name, unit_type: item.unit_type, is_provisional: false }, { onConflict: "code" });
    const { data: updated } = await supabase.from("product_budget_items").update({ final_code: normalizedCode }).eq("id", item.id).select(budgetColumns).single();
    setStructureItems((current) => current.map((structureItem) => structureItem.id === item.structure_item_id ? { ...structureItem, material_code: normalizedCode } : structureItem)); setBudgetItems((current) => current.map((currentItem) => currentItem.id === item.id ? updated : currentItem)); await loadRawMaterials(); showSuccess("Código definitivo aplicado à estrutura.");
  }

  async function uploadAttachment(event, kind) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = kind === "photo" ? photoFile : documentFile;

    if (!selectedProduct || !file) {
      setErrorMessage("Selecione um arquivo antes de enviar.");
      return;
    }

    if (kind === "photo" && !file.type.startsWith("image/")) {
      setErrorMessage("A galeria aceita apenas arquivos de imagem.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${selectedProduct.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: storageError } = await supabase.storage
      .from("product-files")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (storageError) {
      setErrorMessage(`Nao foi possivel enviar o arquivo: ${storageError.message}`);
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-files").getPublicUrl(storagePath);
    const { data, error } = await supabase
      .from("product_attachments")
      .insert({
        product_id: selectedProduct.id,
        name: file.name,
        file_type: kind === "photo" ? "Foto do produto" : documentType,
        kind,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
      })
      .select(attachmentColumns)
      .single();

    if (error) {
      await supabase.storage.from("product-files").remove([storagePath]);
      setErrorMessage(`Nao foi possivel registrar o arquivo: ${error.message}`);
      setIsUploading(false);
      return;
    }

    setAttachments((current) => [data, ...current]);
    kind === "photo" ? setPhotoFile(null) : setDocumentFile(null);
    formElement.reset();
    setIsUploading(false);
    showSuccess(kind === "photo" ? "Foto adicionada." : "Documento anexado.");
  }

  async function deleteAttachment(attachment) {
    if (!window.confirm(`Excluir ${attachment.name}?`)) return;
    setErrorMessage("");
    const { error } = await supabase.from("product_attachments").delete().eq("id", attachment.id);
    if (error) {
      setErrorMessage(`Nao foi possivel excluir o arquivo: ${error.message}`);
      return;
    }
    await supabase.storage.from("product-files").remove([attachment.storage_path]);
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    showSuccess("Arquivo excluido.");
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

      <nav className={`workspace-tabs ${viewMode === "detail" ? "has-context" : ""}`} aria-label="Áreas de produtos">
        <button
          className={viewMode === "catalog" ? "active" : ""}
          onClick={() => setViewMode("catalog")}
          type="button"
        >
          <span className="workspace-tab-icon">▦</span>
          <span>
            <strong>Códigos</strong>
            <small>Índice de produtos cadastrados</small>
          </span>
        </button>
        <button className={viewMode === "materials" ? "active" : ""} onClick={() => setViewMode("materials")} type="button"><span className="workspace-tab-icon">MP</span><span><strong>Matérias-primas</strong><small>Cadastro mestre de códigos</small></span></button>
        {selectedProduct && viewMode === "detail" && (
          <button
            className={viewMode === "detail" ? "active contextual-tab" : "contextual-tab"}
            onClick={() => setViewMode("detail")}
            type="button"
          >
            <span className="workspace-tab-icon">#</span>
            <span>
              <strong>{selectedProduct.code}</strong>
              <small>Detalhes do produto</small>
            </span>
          </button>
        )}
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

      {(viewMode === "catalog" || viewMode === "detail") && (
        <>
      <section className={`product-layout ${viewMode === "detail" ? "detail-only" : "codes-only"}`}>
        {viewMode === "catalog" && (
        <aside className="panel product-list" aria-label="Lista de produtos">
          <div className="panel-heading">
            <div>
              <span className="form-step">Índice</span>
              <h2>Códigos de produtos</h2>
            </div>
            <span>
              {isLoading
                ? "Carregando"
                : `${filteredProducts.length} de ${products.length}`}
            </span>
            <span className="issue-overview">
              <strong>{issues.length}</strong> pendências abertas
            </span>
          </div>

          <div className="list-controls">
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar código..."
              type="search"
              value={searchTerm}
            />
          </div>

          <div className="product-list-items">
            {filteredProducts.map((product) => (
                <button
                  className="code-row"
                  key={product.id}
                  onClick={() => {
                    setSelectedId(product.id);
                    setActiveTab("overview");
                    setViewMode("detail");
                  }}
                  type="button"
                >
                  <span className="code-identity">
                    <strong>{product.code}</strong>
                    <small>{product.name}</small>
                  </span>
                  <span className="code-row-meta">
                    {issues.filter((issue) => issue.product_id === product.id).length > 0 && (
                      <span className="issue-count" title="Pendências abertas">
                        {issues.filter((issue) => issue.product_id === product.id).length}
                      </span>
                    )}
                    <span aria-hidden="true">→</span>
                  </span>
                </button>
              ))}

            {!isLoading && filteredProducts.length === 0 && (
              <p className="empty-state">Nenhum produto encontrado.</p>
            )}
          </div>
        </aside>
        )}

        {viewMode === "detail" && (
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
                    <ActionIcon name={tab.icon} />
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
                      <dt>Pendências</dt>
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
                      <select value={editForm.category} onChange={(event) => selectCategory(event.target.value, setEditForm)}><option value="">Selecione</option>{productCategories.map((category)=><option key={category.id} value={category.name}>{category.name}</option>)}<option value="__new__">+ Adicionar categoria</option></select>
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
                        list="raw-material-codes"
                        name="materialCode"
                        onChange={updateStructureField}
                        placeholder="Ex.: MP-0001"
                        required
                        value={structureForm.materialCode}
                      />
                      <datalist id="raw-material-codes">{rawMaterials.map((material) => <option key={material.id} value={material.code}>{material.name}</option>)}</datalist>
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
                      <ActionIcon name="plus" />
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
                          <ActionIcon name="trash" />
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
                <section className="tab-panel" aria-label="Pendências do produto">
                  <div className="data-list">
                    {selectedIssues.map((issue) => {
                      const resolutionNote = resolutionNotes[issue.id] ?? "";
                      const canResolve = resolutionNote.trim().length >= 10;
                      return (
                      <article className="issue-card" key={issue.id}>
                        <header>
                          <span className="issue-alert"><ActionIcon name="issues" /></span>
                          <span>
                          <strong>{issue.product_code}</strong>
                          <small>{issue.description}</small>
                          </span>
                        </header>
                        <div className="resolution-box">
                          <label htmlFor={`resolution-${issue.id}`}>Justificativa da resolução</label>
                          <textarea
                            id={`resolution-${issue.id}`}
                            onChange={(event) => setResolutionNotes((current) => ({ ...current, [issue.id]: event.target.value }))}
                            placeholder="Descreva o que foi feito para resolver este problema..."
                            rows="3"
                            value={resolutionNote}
                          />
                          <div>
                            <small>{canResolve ? "Justificativa pronta para registro" : "Informe pelo menos 10 caracteres"}</small>
                            <button disabled={!canResolve || resolvingIssueId === issue.id} onClick={() => resolveIssue(issue)} type="button">
                              {resolvingIssueId === issue.id ? "Resolvendo..." : "Marcar como resolvido"}
                            </button>
                          </div>
                        </div>
                      </article>
                    )})}

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

              {activeTab === "budget" && (
                <section className="tab-panel budget-panel" aria-label="Orçamento do produto">
                  <div className="budget-summary">
                    {["BRL", "USD"].map((currency) => {
                      const total = selectedBudgetItems.filter((item) => item.currency === currency).reduce((sum, item) => sum + Number(item.amount) * Number(item.quantity) * Number(item.mkp) * (1 + Number(item.overhead_rate) / 100), 0);
                      return <article key={currency}><span className="budget-currency-icon"><ActionIcon name="budget" /></span><div><small>Total em {currency}</small><strong>{formatMoney(total, currency)}</strong><span>{selectedBudgetItems.filter((item) => item.currency === currency).length} itens</span></div></article>;
                    })}
                  </div>
                  <form className="budget-form" onSubmit={addBudgetItem}>
                    <div className="budget-form-heading"><span className="budget-currency-icon"><ActionIcon name="budget" /></span><div><strong>Novo item</strong><small>Valor unitário × quantidade × MKP + overhead</small></div></div>
                    <label>Código opcional<input value={budgetItem.itemCode} onChange={(e) => setBudgetItem({...budgetItem,itemCode:e.target.value})} placeholder="Ex.: MP-001" /></label>
                    <label>Nome do produto ou item<input required value={budgetItem.itemName} onChange={(e) => setBudgetItem({...budgetItem,itemName:e.target.value})} placeholder="Ex.: Fonte de alimentação" /></label>
                    <label>Valor base<input min="0" required step="0.01" type="number" value={budgetItem.amount} onChange={(e) => setBudgetItem({...budgetItem,amount:e.target.value})} placeholder="0,00" /></label>
                    <label>Moeda<select value={budgetItem.currency} onChange={(e) => setBudgetItem({...budgetItem,currency:e.target.value})}><option value="BRL">BRL — Real</option><option value="USD">USD — Dólar</option></select></label>
                    <label>Quantidade<input min="0.01" required step="0.01" type="number" value={budgetItem.quantity} onChange={(e) => setBudgetItem({...budgetItem,quantity:e.target.value})} /></label>
                    <label>Unidade<select value={budgetItem.unitType} onChange={(e) => setBudgetItem({...budgetItem,unitType:e.target.value})}><option value="UN">UN — Unidade</option><option value="PC">PC — Peça</option><option value="KIT">KIT</option><option value="CX">CX — Caixa</option><option value="KG">KG — Quilograma</option><option value="M">M — Metro</option><option value="L">L — Litro</option><option value="H">H — Hora</option></select></label>
                    <label>MKP (multiplicador)<input min="0.01" required step="0.01" type="number" value={budgetItem.mkp} onChange={(e) => setBudgetItem({...budgetItem,mkp:e.target.value})} /></label>
                    <label>Overhead (%)<input min="0" required step="0.01" type="number" value={budgetItem.overheadRate} onChange={(e) => setBudgetItem({...budgetItem,overheadRate:e.target.value})} placeholder="0" /></label>
                    <div className="budget-preview"><small>Valor total do item</small><strong>{formatMoney(Number(budgetItem.amount || 0) * Number(budgetItem.quantity || 0) * Number(budgetItem.mkp || 0) * (1 + Number(budgetItem.overheadRate || 0) / 100), budgetItem.currency)}</strong><span>{budgetItem.quantity || 0} {budgetItem.unitType} × MKP {budgetItem.mkp || 0} × overhead {budgetItem.overheadRate || 0}%</span></div>
                    <div className="budget-form-action"><button disabled={isSavingBudget} type="submit">{isSavingBudget ? "Adicionando..." : "Adicionar ao orçamento"}</button></div>
                  </form>
                  <div className="budget-table"><header><span>Item</span><span>Qtd./Un.</span><span>Valor unit.</span><span>MKP</span><span>Overhead</span><span>Total</span><span>Ações</span></header>{selectedBudgetItems.map((item) => <div key={item.id}><span><strong>{item.item_name}</strong><small>{item.final_code || item.provisional_code || item.item_code || "Sem código"}</small></span><span>{Number(item.quantity).toLocaleString("pt-BR")} {item.unit_type}</span><span>{formatMoney(item.amount,item.currency)}</span><span>{Number(item.mkp).toLocaleString("pt-BR")}×</span><span>{Number(item.overhead_rate).toLocaleString("pt-BR")}%</span><strong>{formatMoney(Number(item.amount)*Number(item.quantity)*Number(item.mkp)*(1+Number(item.overhead_rate)/100),item.currency)}</strong><span className="budget-row-actions"><button className={item.approved?"approved":""} onClick={()=>approveBudgetItem(item)} type="button">{item.approved?"Aprovado":"Aprovar"}</button>{item.approved&&!item.structure_item_id&&<button onClick={()=>includeProvisionalStructure(item)} type="button">Incluir provisório</button>}{item.structure_item_id&&!item.final_code&&<button onClick={()=>promoteProvisionalCode(item)} type="button">Efetivar código</button>}<button aria-label={`Excluir ${item.item_name}`} onClick={()=>deleteBudgetItem(item.id)} type="button"><ActionIcon name="trash" /></button></span></div>)}{selectedBudgetItems.length===0&&<p className="empty-state">Nenhum item no orçamento deste produto.</p>}</div>
                </section>
              )}

              {activeTab === "documents" && (
                <section className="tab-panel" aria-label="Documentos do produto">
                  <form className="attachment-form" onSubmit={(event) => uploadAttachment(event, "document")}>
                    <label>Tipo de documento
                      <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                        {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </label>
                    <label>Arquivo
                      <input required type="file" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} />
                    </label>
                    <button disabled={isUploading} type="submit"><ActionIcon name="plus" />{isUploading ? "Enviando..." : "Anexar arquivo"}</button>
                  </form>
                  <div className="attachment-list">
                    {selectedDocuments.map((item) => (
                      <article className="attachment-row" key={item.id}>
                        <span className="file-symbol"><ActionIcon name="documents" /></span>
                        <span><strong>{item.name}</strong><small>{item.file_type}</small></span>
                        <a href={item.public_url} rel="noreferrer" target="_blank"><ActionIcon name="download" />Abrir</a>
                        <button className="attachment-delete" onClick={() => deleteAttachment(item)} type="button"><ActionIcon name="trash" />Excluir</button>
                      </article>
                    ))}
                    {selectedDocuments.length === 0 && <p className="empty-state">Nenhum documento anexado.</p>}
                  </div>
                </section>
              )}

              {activeTab === "photos" && (
                <section className="tab-panel" aria-label="Fotos do produto">
                  <form className="attachment-form photo-upload" onSubmit={(event) => uploadAttachment(event, "photo")}>
                    <label>Foto do produto
                      <input accept="image/*" required type="file" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
                    </label>
                    <button disabled={isUploading} type="submit"><ActionIcon name="plus" />{isUploading ? "Enviando..." : "Adicionar foto"}</button>
                  </form>
                  <div className="photo-grid">
                    {selectedPhotos.map((item) => (
                      <article className="photo-card" key={item.id}>
                        <a href={item.public_url} rel="noreferrer" target="_blank"><img alt={item.name} src={item.public_url} /></a>
                        <div><span title={item.name}>{item.name}</span><button aria-label={`Excluir ${item.name}`} onClick={() => deleteAttachment(item)} type="button"><ActionIcon name="trash" /></button></div>
                      </article>
                    ))}
                    {selectedPhotos.length === 0 && <p className="empty-state">Nenhuma foto adicionada.</p>}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
        )}
      </section>
        </>
      )}

      {viewMode === "materials" && (
        <section className="materials-manager panel"><div className="panel-heading"><div><span className="form-step">Cadastro mestre</span><h2>Códigos de matéria-prima</h2></div><span>{rawMaterials.length} códigos</span></div><form className="materials-form" onSubmit={addRawMaterial}><label>Código<input required value={rawMaterialForm.code} onChange={(e)=>setRawMaterialForm({...rawMaterialForm,code:e.target.value})} placeholder="Ex.: MP-0001" /></label><label>Descrição<input required value={rawMaterialForm.name} onChange={(e)=>setRawMaterialForm({...rawMaterialForm,name:e.target.value})} placeholder="Ex.: Chapa inox 2mm" /></label><label>Unidade<select value={rawMaterialForm.unitType} onChange={(e)=>setRawMaterialForm({...rawMaterialForm,unitType:e.target.value})}>{["UN","PC","KIT","CX","KG","M","L","H"].map((unit)=><option key={unit}>{unit}</option>)}</select></label><button>Cadastrar matéria-prima</button></form><div className="materials-grid">{rawMaterials.map((material)=><article key={material.id}><span className="material-code">{material.code}</span><div><strong>{material.name}</strong><small>{material.unit_type} · {material.is_provisional ? "Provisório" : "Código oficial"}</small></div></article>)}</div></section>
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
            <select value={form.category} onChange={(event) => selectCategory(event.target.value, setForm)}><option value="">Selecione</option>{productCategories.map((category)=><option key={category.id} value={category.name}>{category.name}</option>)}<option value="__new__">+ Adicionar categoria</option></select>
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
