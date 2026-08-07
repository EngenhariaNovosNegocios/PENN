export const WORKFLOW_STAGES = [
  {
    key: "discovery",
    number: "01",
    title: "Levantamento e oportunidade",
    shortTitle: "Levantamento e oportunidade",
    area: "Produto & Comercial",
    color: "blue",
    tasks: [
      "Definir solicitante e responsável",
      "Registrar preço de venda objetivo",
      "Estimar demanda e clientes potenciais",
      "Dimensionar mercado potencial",
      "Consolidar especificações técnicas",
      "Registrar proposta de valor e diferenciais",
    ],
  },
  {
    key: "viability",
    number: "02",
    title: "Viabilidade e aprovações",
    shortTitle: "Viabilidade e aprovações",
    area: "Comercial & Diretoria",
    color: "violet",
    tasks: [
      "Validar hipótese comercial com MVP",
      "Executar validação de interesse do mercado",
      "Realizar análise de procurement",
      "Avaliar necessidade de certificação",
      "Validar NCM aplicável",
      "Analisar benefícios fiscais potenciais",
      "Calcular margem de contribuição e payback",
      "Obter aprovação Comercial",
      "Obter aprovação da Diretoria",
    ],
  },
  {
    key: "samples",
    number: "03",
    title: "Amostras e suprimentos",
    shortTitle: "Amostras e suprimentos",
    area: "Compras & Engenharia",
    color: "amber",
    tasks: [
      "Definir e adquirir amostras",
      "Cadastrar matéria-prima necessária",
      "Validar fornecedor e condições de compra",
      "Emitir solicitação interna de compra",
      "Confirmar chegada e entrada fiscal dos materiais",
    ],
  },
  {
    key: "technical",
    number: "04",
    title: "Viabilidade técnica",
    shortTitle: "Viabilidade técnica",
    area: "Engenharia",
    color: "cyan",
    tasks: [
      "Planejar desenvolvimento de hardware e firmware",
      "Realizar análise cosmética e de embalagem",
      "Executar testes de bancada",
      "Executar teste de campo ou cliente final",
      "Comparar capacidade com o datasheet",
      "Consolidar melhorias e personalizações",
      "Decidir sobre necessidade de novas amostras",
    ],
  },
  {
    key: "certification",
    number: "05",
    title: "Certificações",
    shortTitle: "Certificações",
    area: "Qualidade & Engenharia",
    color: "red",
    tasks: [
      "Definir certificações aplicáveis",
      "Preparar documentação técnica",
      "Disparar processo de certificação",
      "Acompanhar ensaios e pendências",
    ],
  },
  {
    key: "design",
    number: "06",
    title: "Design e apresentação",
    shortTitle: "Design e apresentação",
    area: "Produto & Marketing",
    color: "pink",
    tasks: [
      "Desenvolver identidade e aplicação da marca",
      "Definir embalagem e proteção do produto",
      "Desenvolver etiquetas e informações obrigatórias",
      "Validar apresentação final ao cliente",
    ],
  },
  {
    key: "industrialization",
    number: "07",
    title: "Codificação e industrialização",
    shortTitle: "Codificação e industrialização",
    area: "Engenharia de Produtos",
    color: "indigo",
    tasks: [
      "Definir sequência de código interno",
      "Reservar código e solicitar estrutura",
      "Vincular matérias-primas, insumos e embalagem",
      "Realizar análise e liberar avanço",
      "Registrar condições e preços de compra",
      "Incluir item na tabela de preços",
      "Registrar previsão de chegada",
      "Validar preço final com a Diretoria",
      "Liberar movimentações e planejamento interno",
    ],
  },
  {
    key: "documentation",
    number: "08",
    title: "Documentação do produto",
    shortTitle: "Documentação",
    area: "NPI & Engenharia",
    color: "green",
    tasks: [
      "Preencher subsídios de NPI",
      "Aprovar início da análise documental",
      "Registrar previsão do NPI",
      "Validar e aprovar encerramento do NPI",
      "Preparar inspeção de recebimento",
      "Preparar especificação de compra",
      "Publicar datasheet",
      "Publicar manual do usuário quando aplicável",
    ],
  },
  {
    key: "launch",
    number: "09",
    title: "Lançamento e divulgação",
    shortTitle: "Lançamento",
    area: "Marketing & Vendas",
    color: "orange",
    tasks: [
      "Preparar plano de lançamento",
      "Notificar internamente o novo produto",
      "Publicar produto no site",
      "Divulgar nas redes sociais",
      "Vincular produto à previsão do vendedor responsável",
    ],
  },
  {
    key: "monitoring",
    number: "10",
    title: "Monitoramento pós-lançamento",
    shortTitle: "Pós-lançamento",
    area: "Produto & Operações",
    color: "teal",
    tasks: [
      "Monitorar primeiras ordens e entregas",
      "Comparar resultado com demanda esperada",
      "Acompanhar margem e retorno",
      "Registrar feedback de clientes",
      "Manter backlog de documentação e melhorias",
    ],
  },
];

export const WORKFLOW_STAGE_NAMES = Object.fromEntries(
  WORKFLOW_STAGES.map((stage) => [stage.key, stage.shortTitle])
);

const completedStatuses = new Set(["completed", "not_applicable"]);

export function isDevelopmentTaskComplete(task) {
  return completedStatuses.has(task?.status);
}

export function getCurrentStageKey(tasks) {
  for (const stage of WORKFLOW_STAGES) {
    const stageTasks = tasks.filter((task) => task.stage_key === stage.key);

    if (
      stageTasks.length > 0 &&
      stageTasks.some((task) => !isDevelopmentTaskComplete(task))
    ) {
      return stage.key;
    }
  }

  return null;
}

export function getStageState(tasks, stageKey) {
  const currentStageKey = getCurrentStageKey(tasks);
  const stageIndex = WORKFLOW_STAGES.findIndex((stage) => stage.key === stageKey);

  if (stageIndex < 0) {
    return "locked";
  }

  if (!currentStageKey) {
    return "completed";
  }

  const currentIndex = WORKFLOW_STAGES.findIndex(
    (stage) => stage.key === currentStageKey
  );

  if (stageIndex < currentIndex) {
    return "completed";
  }

  return stageIndex === currentIndex ? "current" : "locked";
}

function compareTasks(a, b) {
  const aDueDate = a.due_date
    ? new Date(`${a.due_date}T12:00:00`).getTime()
    : Infinity;
  const bDueDate = b.due_date
    ? new Date(`${b.due_date}T12:00:00`).getTime()
    : Infinity;

  return (
    aDueDate - bDueDate ||
    Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
  );
}

export function getCurrentStageTasks(tasks, { includeCompleted = false } = {}) {
  const tasksByProject = new Map();

  for (const task of tasks) {
    if (task.project_id == null) {
      continue;
    }

    if (!tasksByProject.has(task.project_id)) {
      tasksByProject.set(task.project_id, []);
    }

    tasksByProject.get(task.project_id).push(task);
  }

  const currentTasks = [];

  for (const projectTasks of tasksByProject.values()) {
    const currentStageKey = getCurrentStageKey(projectTasks);

    if (!currentStageKey) {
      continue;
    }

    currentTasks.push(
      ...projectTasks.filter(
        (task) =>
          task.stage_key === currentStageKey &&
          (includeCompleted || !isDevelopmentTaskComplete(task))
      )
    );
  }

  return currentTasks.sort(compareTasks);
}
