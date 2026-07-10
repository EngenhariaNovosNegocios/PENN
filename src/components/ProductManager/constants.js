export const statusOptions = {
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

export const initialProducts = [
  {
    id: 1,
    name: "Linha Hidraulica Especial",
    code: "PENN-001",
    category: "Produto tecnico",
    ncm: "8412.21.10",
    sap_material_code: "PENN-001",
    sap_plant: "1000",
    sap_unit: "UN",
    sap_material_group: "HID",
    sync_source: "manual",
    last_sync_at: null,
    owner: "Engenharia",
    status: "ativo",
    characteristics:
      "Conjunto sob demanda com componentes dimensionados por aplicacao.",
    structure: "Modulo base; conjunto de fixacao; documentacao tecnica; embalagem.",
  },
  {
    id: 2,
    name: "Painel de Controle Customizado",
    code: "PENN-002",
    category: "Sistema montado",
    ncm: "8537.10.90",
    sap_material_code: "PENN-002",
    sap_plant: "1000",
    sap_unit: "UN",
    sap_material_group: "ELE",
    sync_source: "manual",
    last_sync_at: null,
    owner: "Novos Negocios",
    status: "manutencao",
    characteristics:
      "Produto com configuracao eletrica variavel conforme requisito do cliente.",
    structure: "Gabinete; interface; chicote; protecoes; checklist de testes.",
  },
];

export const emptyForm = {
  name: "",
  code: "",
  category: "",
  ncm: "",
  sap_material_code: "",
  sap_plant: "",
  sap_unit: "",
  sap_material_group: "",
  sync_source: "manual",
  owner: "",
  status: "ativo",
  characteristics: "",
};

export const emptyStructureForm = {
  materialCode: "",
  description: "",
  quantity: "",
};

export const emptyIssueForm = {
  productCode: "",
  description: "",
};

export const productColumns =
  "id, name, code, category, ncm, sap_material_code, sap_plant, sap_unit, sap_material_group, sync_source, last_sync_at, owner, status, characteristics, structure, created_at";

export const structureColumns =
  "id, product_id, material_code, description, quantity, created_at";

export const issueColumns =
  "id, product_id, product_code, description, created_at";

export const ncmTaxColumns =
  "id, ncm, description, ipi_rate, pis_rate, cofins_rate, icms_rate, import_tax_rate, updated_at";

export const tabs = [
  { id: "overview", label: "Resumo" },
  { id: "edit", label: "Editar" },
  { id: "sap", label: "SAP" },
  { id: "structure", label: "Estrutura" },
  { id: "issues", label: "Problemas" },
  { id: "fiscal", label: "Fiscal" },
];
